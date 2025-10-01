import { TRACK_NAMING } from './types.js';

export interface FilenameHealthIssue {
  type: 'special_chars' | 'unicode' | 'length' | 'engine_dj_compat' | 'whitespace';
  severity: 'error' | 'warning' | 'info';
  description: string;
  problematicChars?: string[];
}

export interface FilenameHealthResult {
  score: number;              // 0-100 health score
  engineDjCompatible: boolean;
  issues: FilenameHealthIssue[];
  suggestedFilename?: string;
}

export class FilenameHealthChecker {
  /**
   * Analyze filename for DJ software compatibility issues
   */
  static analyzeFilename(filename: string, metadata?: {
    artist?: string;
    title?: string;
    bpm?: number;
    key?: string;
    remixer?: string;
  }): FilenameHealthResult {
    const issues: FilenameHealthIssue[] = [];
    let score = 100;

    // Remove extension for analysis
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const extension = filename.substring(nameWithoutExt.length);

    // Check for Windows-prohibited characters
    const windowsProblematic = TRACK_NAMING.PROBLEMATIC_CHARS.WINDOWS_PROHIBITED
      .filter(char => nameWithoutExt.includes(char));
    if (windowsProblematic.length > 0) {
      issues.push({
        type: 'special_chars',
        severity: 'error',
        description: `Contains Windows-prohibited characters: ${windowsProblematic.join(', ')}`,
        problematicChars: windowsProblematic
      });
      score -= 30;
    }

    // Check for Engine DJ problematic characters
    const engineDjProblematic = TRACK_NAMING.PROBLEMATIC_CHARS.ENGINE_DJ_ISSUES
      .filter(char => nameWithoutExt.includes(char));
    if (engineDjProblematic.length > 0) {
      issues.push({
        type: 'engine_dj_compat',
        severity: 'error',
        description: `Contains Engine DJ problematic characters: ${engineDjProblematic.join(', ')}`,
        problematicChars: engineDjProblematic
      });
      score -= 25;
    }

    // Check for Unicode issues
    const unicodeProblematic = TRACK_NAMING.PROBLEMATIC_CHARS.UNICODE_ISSUES
      .filter(char => nameWithoutExt.includes(char));
    if (unicodeProblematic.length > 0) {
      issues.push({
        type: 'unicode',
        severity: 'warning',
        description: `Contains problematic Unicode characters: ${unicodeProblematic.join(', ')}`,
        problematicChars: unicodeProblematic
      });
      score -= 15;
    }

    // Check for whitespace issues
    const whitespaceProblematic = TRACK_NAMING.PROBLEMATIC_CHARS.WHITESPACE_ISSUES
      .filter(char => nameWithoutExt.includes(char));
    if (whitespaceProblematic.length > 0) {
      issues.push({
        type: 'whitespace',
        severity: 'warning',
        description: 'Contains problematic whitespace characters (tabs, newlines)',
        problematicChars: whitespaceProblematic
      });
      score -= 10;
    }

    // Check leading/trailing spaces or dots
    if (nameWithoutExt.startsWith(' ') || nameWithoutExt.endsWith(' ') ||
        nameWithoutExt.startsWith('.') || nameWithoutExt.endsWith('.')) {
      issues.push({
        type: 'whitespace',
        severity: 'warning',
        description: 'Filename has leading/trailing spaces or dots'
      });
      score -= 10;
    }

    // Check filename length
    if (filename.length > TRACK_NAMING.MAX_FILENAME_LENGTH) {
      issues.push({
        type: 'length',
        severity: 'error',
        description: `Filename too long (${filename.length} > ${TRACK_NAMING.MAX_FILENAME_LENGTH} chars)`
      });
      score -= 20;
    } else if (filename.length > TRACK_NAMING.MAX_FILENAME_LENGTH * 0.8) {
      issues.push({
        type: 'length',
        severity: 'warning',
        description: `Filename approaching maximum length (${filename.length}/${TRACK_NAMING.MAX_FILENAME_LENGTH})`
      });
      score -= 5;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Determine Engine DJ compatibility
    const engineDjCompatible = !issues.some(issue =>
      (issue.type === 'special_chars' || issue.type === 'engine_dj_compat') &&
      issue.severity === 'error'
    );

    // Generate suggested filename if we have metadata
    const suggestedFilename = metadata ?
      this.generateCleanFilename(metadata, extension) : undefined;

    return {
      score,
      engineDjCompatible,
      issues,
      suggestedFilename
    };
  }

  /**
   * Generate a clean filename from metadata using a template
   */
  static generateCleanFilename(
    metadata: {
      artist?: string;
      title?: string;
      bpm?: number;
      key?: string;
      remixer?: string;
      album?: string;
      genre?: string;
    },
    template: string = TRACK_NAMING.TEMPLATES.FULL_DJ,
    extension: string = '.mp3'
  ): string {
    // Clean metadata fields
    const cleanArtist = this.cleanArtist(metadata.artist || 'Unknown');
    const cleanTitle = this.cleanTitle(metadata.title || 'Unknown', cleanArtist);
    const cleanRemixer = metadata.remixer ? this.cleanArtist(metadata.remixer) : '';
    const cleanAlbum = metadata.album ? this.sanitizeText(metadata.album) : '';
    const cleanGenre = metadata.genre ? this.sanitizeText(metadata.genre) : '';

    // Build filename from template
    let filename = template
      .replace('{artist}', cleanArtist)
      .replace('{title}', cleanTitle)
      .replace('{bpm}', metadata.bpm ? Math.round(metadata.bpm).toString() : '')
      .replace('{key}', metadata.key || '')
      .replace('{remixer}', cleanRemixer)
      .replace('{album}', cleanAlbum)
      .replace('{genre}', cleanGenre);

    // Final cleanup
    filename = this.finalizeFilename(filename);

    // Safety fallback
    if (filename.length < 3) {
      filename = `${cleanArtist} - ${cleanTitle}`;
    }

    return filename + extension;
  }

  /**
   * Final filename cleanup - remove artifacts, normalize spacing
   */
  private static finalizeFilename(filename: string): string {
    return filename
      .replace(/\s*\[\s*\]\s*/g, ' ')   // Empty brackets with surrounding spaces
      .replace(/\s*\(\s*\)\s*/g, ' ')   // Empty parens with surrounding spaces
      .replace(/\s*-\s*-+\s*/g, ' - ')  // Multiple dashes
      .replace(/\s+/g, ' ')             // Multiple spaces (run multiple times to catch all)
      .replace(/\s*([[(])/g, ' $1')     // Space before brackets/parens
      .replace(/\s*-\s*$/g, '')         // Trailing dash
      .replace(/^-\s*/g, '')            // Leading dash
      .replace(/\s+/g, ' ')             // Normalize whitespace again
      .trim();
  }

  /**
   * Comprehensive character normalization map
   */
  private static readonly CHAR_MAP: Record<string, string> = {
    // Accented characters
    'ü': 'u', 'ö': 'o', 'ä': 'a', 'ß': 'ss',
    'Ü': 'U', 'Ö': 'O', 'Ä': 'A',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O',
    'ú': 'u', 'ù': 'u', 'û': 'u',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U',
    'ñ': 'n', 'Ñ': 'N',
    'ç': 'c', 'Ç': 'C',
    'ø': 'o', 'Ø': 'O',
    'æ': 'ae', 'Æ': 'AE',
    'œ': 'oe', 'Œ': 'OE',
    // Unicode punctuation
    '\u2026': '...',
    '\u2013': '-',
    '\u2014': '-',
    '\u2018': "'",
    '\u2019': "'",
    '\u201C': '"',
    '\u201D': '"',
  };

  /**
   * Junk patterns to remove from artist/title
   */
  private static readonly JUNK_PATTERNS = {
    artist: [
      /\s*-?\s*(Official|VEVO|Records|Music|Channel|Audio|Video)\s*/gi,
    ],
    title: [
      /\s*-?\s*(Official\s+)?(Music\s+)?Video\s*/gi,
      /\s*-?\s*Official\s+Audio\s*/gi,
      /\s*-?\s*(Visualiser|Visualizer|Lyric\s+Video)\s*/gi,
      /\s*-?\s*(HD|HQ|4K|1080p|720p)\s*(Audio|Video)?\s*/gi,
      /\s*-?\s*Remastered\s*/gi,
      /\s*-?\s*(Extended|Club|Radio|Original|Instrumental)\s+(Mix|Edit|Version)\s*/gi,
    ],
  };

  /**
   * Sanitize text for use in filenames - AGGRESSIVE mode
   * Converts to Engine DJ safe characters only
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // Use Unicode normalization first to decompose accented characters
    let result = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Apply character normalization map for characters that don't decompose
    for (const [from, to] of Object.entries(this.CHAR_MAP)) {
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, to);
    }

    // Remove ALL problematic characters
    result = result
      .replace(/[<>:"|?*\\]/g, '')        // Windows prohibited
      .replace(/[{}[\]#%&]/g, '')         // Engine DJ issues
      .replace(/[\x00-\x1F\x7F]/g, '')    // Control characters
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim();

    return result || '';
  }

  /**
   * Clean artist name - remove streaming platform junk
   */
  static cleanArtist(artist: string): string {
    if (!artist) return '';

    let cleaned = this.sanitizeText(artist);

    for (const pattern of this.JUNK_PATTERNS.artist) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  }

  /**
   * Clean title - remove YouTube/streaming junk
   */
  static cleanTitle(title: string, artist?: string): string {
    if (!title) return '';

    let cleaned = this.sanitizeText(title);

    // Remove junk patterns
    for (const pattern of this.JUNK_PATTERNS.title) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    // Remove old BPM/Key format patterns that pollute the title
    // Patterns like: - 10A - 126, - 126 - 10A, -10A-126, etc.
    cleaned = cleaned
      .replace(/\s*-\s*[0-9]{1,2}[AB]\s*-\s*\d{2,3}\s*$/gi, '')  // Ending with - Key - BPM
      .replace(/\s*-\s*\d{2,3}\s*-\s*[0-9]{1,2}[AB]\s*$/gi, '')  // Ending with - BPM - Key
      .replace(/\s*-\s*[0-9]{1,2}[AB]\s*$/gi, '')                // Ending with - Key
      .replace(/\s*-\s*\d{2,3}\s*$/gi, '');                      // Ending with - BPM

    // Standardize featuring
    cleaned = cleaned.replace(/\s+(feat\.?|ft\.?|featuring)\s+/gi, ' feat. ');

    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove duplicate artist prefix if present
    if (artist) {
      const artistLower = artist.toLowerCase().trim();
      const cleanedLower = cleaned.toLowerCase();

      // Try various separators in order of specificity
      if (cleanedLower.startsWith(artistLower + ' - ')) {
        cleaned = cleaned.substring(artist.length + 3).trim();
      } else if (cleanedLower.startsWith(artistLower + ' ')) {
        // Only remove if followed by a space to avoid partial matches
        cleaned = cleaned.substring(artist.length + 1).trim();
      } else if (cleanedLower === artistLower) {
        // Entire title is just the artist name - likely an error
        cleaned = '';
      }
    }

    return cleaned;
  }

  /**
   * Check if a filename is safe for Engine DJ
   */
  static isEngineDjSafe(filename: string): boolean {
    const result = this.analyzeFilename(filename);
    return result.engineDjCompatible;
  }

  /**
   * Get a quick health score for a filename
   */
  static getHealthScore(filename: string): number {
    const result = this.analyzeFilename(filename);
    return result.score;
  }
}

/**
 * Parse metadata from filename patterns commonly used in DJ libraries
 */
export interface ParsedFilenameMetadata {
  artist?: string;
  title?: string;
  bpm?: number;
  key?: string;
  remixer?: string;
  mix?: string;
  confidence: number; // 0-1 confidence in the parse
  pattern?: string;   // Pattern identifier that matched
}

export class FilenameParser {
  /**
   * Common DJ filename patterns
   */
  private static patterns = [
    // Artist - Title (Remixer Remix) [BPM] (Key)
    {
      name: 'full_dj',
      regex: /^(.+?)\s*-\s*(.+?)\s*(?:\((.+?)\s+(?:Remix|Mix|Edit|Bootleg)\))?\s*(?:\[(\d+)\])?\s*(?:\(([A-G][#b]?m?)\))?/i,
      groups: { artist: 1, title: 2, remixer: 3, bpm: 4, key: 5 }
    },
    // Artist - Title [BPM] (Key)
    {
      name: 'artist_title_bpm_key',
      regex: /^(.+?)\s*-\s*(.+?)\s*\[(\d+)\]\s*\(([A-G][#b]?m?)\)/i,
      groups: { artist: 1, title: 2, bpm: 3, key: 4 }
    },
    // Artist - Title [BPM]
    {
      name: 'artist_title_bpm',
      regex: /^(.+?)\s*-\s*(.+?)\s*\[(\d+)\]/i,
      groups: { artist: 1, title: 2, bpm: 3 }
    },
    // Artist - Title (Key)
    {
      name: 'artist_title_key',
      regex: /^(.+?)\s*-\s*(.+?)\s*\(([A-G][#b]?m?)\)/i,
      groups: { artist: 1, title: 2, key: 3 }
    },
    // BPM - Artist - Title
    {
      name: 'bpm_artist_title',
      regex: /^(\d+)\s*-\s*(.+?)\s*-\s*(.+?)$/i,
      groups: { bpm: 1, artist: 2, title: 3 }
    },
    // Artist - Title (Remix info)
    {
      name: 'artist_title_remix',
      regex: /^(.+?)\s*-\s*(.+?)\s*\((.+?)\s+(?:Remix|Mix|Edit|Bootleg)\)/i,
      groups: { artist: 1, title: 2, remixer: 3 }
    },
    // Basic: Artist - Title
    {
      name: 'basic',
      regex: /^(.+?)\s*-\s*(.+?)$/i,
      groups: { artist: 1, title: 2 }
    }
  ];

  /**
   * Parse metadata from a filename
   */
  static parseFilename(filename: string): ParsedFilenameMetadata {
    // Remove file extension and clean up
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();

    // Try each pattern
    for (const pattern of this.patterns) {
      const match = nameWithoutExt.match(pattern.regex);
      if (match) {
        const result: ParsedFilenameMetadata = {
          confidence: this.calculateConfidence(pattern.name),
          pattern: pattern.name
        };

        // Extract groups based on pattern
        if (pattern.groups.artist && match[pattern.groups.artist]) {
          result.artist = this.cleanText(match[pattern.groups.artist]);
        }
        if (pattern.groups.title && match[pattern.groups.title]) {
          result.title = this.cleanText(match[pattern.groups.title]);
        }
        if (pattern.groups.bpm && match[pattern.groups.bpm]) {
          const bpm = parseInt(match[pattern.groups.bpm]);
          if (bpm >= 60 && bpm <= 200) { // Reasonable BPM range
            result.bpm = bpm;
          }
        }
        if (pattern.groups.key && match[pattern.groups.key]) {
          result.key = this.normalizeKey(match[pattern.groups.key]);
        }
        if (pattern.groups.remixer && match[pattern.groups.remixer]) {
          result.remixer = this.cleanText(match[pattern.groups.remixer]);
        }

        return result;
      }
    }

    // No pattern matched - return low confidence result
    return {
      confidence: 0,
      pattern: 'none'
    };
  }

  /**
   * Calculate confidence based on pattern complexity
   */
  private static calculateConfidence(patternName: string): number {
    const confidenceMap: Record<string, number> = {
      'full_dj': 0.95,
      'artist_title_bpm_key': 0.90,
      'artist_title_bpm': 0.85,
      'artist_title_key': 0.80,
      'bpm_artist_title': 0.85,
      'artist_title_remix': 0.75,
      'basic': 0.70
    };
    return confidenceMap[patternName] || 0.5;
  }

  /**
   * Clean extracted text
   */
  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^[_\-.\s]+|[_\-.\s]+$/g, '') // Remove leading/trailing separators
      .trim();
  }

  /**
   * Normalize key notation
   */
  private static normalizeKey(key: string): string {
    // Convert to standard notation (capitalize, preserve sharps/flats)
    return key
      .replace(/^([a-g])/i, (match) => match.toUpperCase())
      .replace(/sharp/i, '#')
      .replace(/flat/i, 'b')
      .trim();
  }

  /**
   * Detect if filename looks like a DJ set/mix
   */
  static isDjSet(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    const djSetIndicators = [
      /\bmix\b/i,
      /\bset\b/i,
      /\blive\s+set\b/i,
      /\bpodcast\b/i,
      /\bradio\s+show\b/i,
      /\b\d+\s+hour/i,
      /\bpart\s+\d+/i,
      /\bvol(?:ume)?\s+\d+/i
    ];

    return djSetIndicators.some(pattern => pattern.test(lowerFilename));
  }

  /**
   * Extract all metadata from filename
   */
  static extractMetadata(filename: string): ParsedFilenameMetadata & { isDjSet: boolean } {
    const parsed = this.parseFilename(filename);
    const isDjSet = this.isDjSet(filename);

    return {
      ...parsed,
      isDjSet
    };
  }
}