import { promises as fs } from 'fs';
import path from 'path';
import type { Track } from '@cleancue/shared';

// Enhanced metadata extraction with filename parsing and normalization
export interface EnhancedMetadata {
  // Core metadata
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  composer?: string;
  comment?: string;

  // Technical data
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;

  // Enhanced DJ-specific metadata
  originalArtist?: string;  // For remixes
  remixer?: string;
  version?: string;  // e.g., "Extended Mix", "Radio Edit"
  label?: string;  // Record label
  catalogNumber?: string;
  mixKey?: string;  // Musical key
  bpm?: number;

  // Filename analysis
  filenamePattern?: string;  // Detected pattern
  filenameConfidence?: number;  // 0-1 confidence in parsing
  suggestedTitle?: string;  // Title extracted from filename
  suggestedArtist?: string;  // Artist extracted from filename
  suggestedRemixer?: string;  // Remixer from filename

  // Quality indicators
  metadataQuality?: 'excellent' | 'good' | 'poor' | 'missing';
  missingFields?: string[];
  hasInconsistencies?: boolean;
  needsCleanup?: boolean;
}

export interface DuplicateMatch {
  track1: string;  // Track ID
  track2: string;  // Track ID
  matchType: 'identical' | 'likely' | 'possible';
  matchReasons: string[];
  confidence: number;  // 0-1
}

export class MetadataExtractor {
  private commonPatterns = [
    // Artist - Title patterns
    /^(.+?)\s*[-–—]\s*(.+?)(?:\s*\[(.+?)\])?(?:\s*\((.+?)\))?$/,
    /^(.+?)\s*_\s*(.+?)(?:_(.+?))?$/,

    // DJ/Club style patterns
    /^(\d+)\.?\s*(.+?)\s*[-–—]\s*(.+?)(?:\s*\((.+?)\))?$/,
    /^(.+?)\s*\(\s*(.+?)\s*(?:remix|mix|edit|version)\s*\)(.*)$/i,
    /^(.+?)\s*(?:feat\.|featuring|ft\.)\s*(.+?)\s*[-–—]\s*(.+?)$/i,

    // Remix patterns
    /^(.+?)\s*[-–—]\s*(.+?)\s*\(\s*(.+?)\s*(?:remix|mix|edit|bootleg|mashup)\s*\)$/i,
    /^(.+?)\s*[-–—]\s*(.+?)\s*\[\s*(.+?)\s*(?:remix|mix|edit)\s*\]$/i,

    // Label/catalog patterns
    /^(?:\[(.+?)\])?\s*(.+?)\s*[-–—]\s*(.+?)(?:\s*\[(.+?)\])?$/,

    // Track number patterns
    /^(?:(\d+)[-.\s]+)?(.+?)\s*[-–—]\s*(.+?)$/,
  ];

  private genreMap = new Map([
    // Electronic music genres
    ['house', 'House'],
    ['tech house', 'Tech House'],
    ['techno', 'Techno'],
    ['trance', 'Trance'],
    ['progressive', 'Progressive'],
    ['drum and bass', 'Drum & Bass'],
    ['dubstep', 'Dubstep'],
    ['electro', 'Electro'],
    ['deep house', 'Deep House'],
    ['future house', 'Future House'],

    // Hip-hop/R&B
    ['hip hop', 'Hip-Hop'],
    ['rap', 'Hip-Hop'],
    ['r&b', 'R&B'],
    ['rnb', 'R&B'],

    // Latin
    ['reggaeton', 'Reggaeton'],
    ['latin', 'Latin'],
    ['salsa', 'Salsa'],
    ['bachata', 'Bachata'],

    // Pop/Rock
    ['pop', 'Pop'],
    ['rock', 'Rock'],
    ['indie', 'Indie'],
    ['alternative', 'Alternative'],
  ]);

  private versionKeywords = [
    'original mix', 'radio edit', 'extended mix', 'club mix', 'dub mix',
    'instrumental', 'acapella', 'vocal mix', 'bonus track', 'edit',
    'remix', 'bootleg', 'mashup', 'rework', 'refix', 'vip'
  ];

  async extractEnhancedMetadata(filePath: string, basicMetadata: any = {}): Promise<EnhancedMetadata> {
    const filename = path.basename(filePath, path.extname(filePath));

    // Start with basic metadata
    const enhanced: EnhancedMetadata = {
      title: basicMetadata.title,
      artist: basicMetadata.artist,
      album: basicMetadata.album,
      albumArtist: basicMetadata.albumArtist,
      genre: this.normalizeGenre(basicMetadata.genre),
      year: basicMetadata.year,
      trackNumber: basicMetadata.trackNumber,
      discNumber: basicMetadata.discNumber,
      composer: basicMetadata.composer,
      comment: basicMetadata.comment,
      durationMs: basicMetadata.durationMs,
      bitrate: basicMetadata.bitrate,
      sampleRate: basicMetadata.sampleRate,
      channels: basicMetadata.channels,
    };

    // Parse filename for additional metadata
    const filenameData = this.parseFilename(filename);
    enhanced.filenamePattern = filenameData.pattern;
    enhanced.filenameConfidence = filenameData.confidence;
    enhanced.suggestedTitle = filenameData.title;
    enhanced.suggestedArtist = filenameData.artist;
    enhanced.suggestedRemixer = filenameData.remixer;

    // Enhance with filename data if metadata is missing
    if (!enhanced.title && filenameData.title) {
      enhanced.title = filenameData.title;
    }
    if (!enhanced.artist && filenameData.artist) {
      enhanced.artist = filenameData.artist;
    }

    // Extract remix information
    this.extractRemixInfo(enhanced);

    // Analyze metadata quality
    this.analyzeMetadataQuality(enhanced);

    // Clean up and normalize
    this.cleanupMetadata(enhanced);

    return enhanced;
  }

  private parseFilename(filename: string): {
    pattern?: string;
    confidence: number;
    artist?: string;
    title?: string;
    remixer?: string;
    version?: string;
    trackNumber?: string;
  } {
    // Remove common file naming artifacts
    let cleaned = filename
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .replace(/[_]+/g, ' ')  // Underscores to spaces
      .replace(/\[.*?\]/g, ' ')  // Remove bracketed info temporarily
      .replace(/\s+/g, ' ')
      .trim();

    // Try each pattern
    for (let i = 0; i < this.commonPatterns.length; i++) {
      const pattern = this.commonPatterns[i];
      const match = cleaned.match(pattern);

      if (match) {
        const confidence = this.calculatePatternConfidence(match, i);

        return {
          pattern: `pattern_${i}`,
          confidence,
          artist: this.cleanString(match[1]),
          title: this.cleanString(match[2]),
          remixer: this.cleanString(match[3]),
          version: this.cleanString(match[4]),
          trackNumber: match[0]?.match(/^(\d+)/) ? match[0].match(/^(\d+)/)![1] : undefined
        };
      }
    }

    // Fallback: simple split on common separators
    const simpleSplit = cleaned.split(/\s*[-–—]\s*/);
    if (simpleSplit.length >= 2) {
      return {
        pattern: 'simple_split',
        confidence: 0.3,
        artist: this.cleanString(simpleSplit[0]),
        title: this.cleanString(simpleSplit.slice(1).join(' - '))
      };
    }

    return { confidence: 0 };
  }

  private calculatePatternConfidence(match: RegExpMatchArray, patternIndex: number): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for more specific patterns
    if (patternIndex <= 2) confidence += 0.2;

    // Check for DJ-specific indicators
    const text = match[0].toLowerCase();
    if (text.includes('remix') || text.includes('mix') || text.includes('edit')) {
      confidence += 0.1;
    }

    // Check for proper artist/title length
    if (match[1] && match[1].length > 2 && match[1].length < 50) confidence += 0.05;
    if (match[2] && match[2].length > 2 && match[2].length < 100) confidence += 0.05;

    // Penalty for very short or very long parts
    if (match[1] && (match[1].length < 2 || match[1].length > 100)) confidence -= 0.2;
    if (match[2] && (match[2].length < 2 || match[2].length > 150)) confidence -= 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  private extractRemixInfo(metadata: EnhancedMetadata): void {
    const titleLower = (metadata.title || '').toLowerCase();
    const commentLower = (metadata.comment || '').toLowerCase();

    // Check for remix patterns in title
    const remixMatch = metadata.title?.match(/\((.+?)\s*(?:remix|mix|edit|version)\)/i) ||
                      metadata.title?.match(/\[(.+?)\s*(?:remix|mix|edit)\]/i);

    if (remixMatch) {
      metadata.remixer = this.cleanString(remixMatch[1]);
      metadata.originalArtist = metadata.artist;
    }

    // Extract version information
    for (const keyword of this.versionKeywords) {
      if (titleLower.includes(keyword) || commentLower.includes(keyword)) {
        if (!metadata.version) {
          metadata.version = this.capitalizeWords(keyword);
        }
        break;
      }
    }

    // Handle "feat." patterns
    const featMatch = metadata.title?.match(/(.+?)\s*(?:feat\.|featuring|ft\.)\s*(.+?)(?:\s*[-–(]|$)/i);
    if (featMatch) {
      metadata.title = this.cleanString(featMatch[1]);
      // Add featured artist to comment if not already there
      if (!metadata.comment?.includes(featMatch[2])) {
        metadata.comment = metadata.comment
          ? `${metadata.comment} (feat. ${featMatch[2]})`
          : `feat. ${featMatch[2]}`;
      }
    }
  }

  private analyzeMetadataQuality(metadata: EnhancedMetadata): void {
    const missingFields: string[] = [];

    // Check for essential fields
    if (!metadata.title) missingFields.push('title');
    if (!metadata.artist) missingFields.push('artist');
    if (!metadata.album) missingFields.push('album');
    if (!metadata.year) missingFields.push('year');
    if (!metadata.genre) missingFields.push('genre');

    metadata.missingFields = missingFields;

    // Determine quality level
    if (missingFields.length === 0) {
      metadata.metadataQuality = 'excellent';
    } else if (missingFields.length <= 2) {
      metadata.metadataQuality = 'good';
    } else if (missingFields.length <= 4) {
      metadata.metadataQuality = 'poor';
    } else {
      metadata.metadataQuality = 'missing';
    }

    // Check for inconsistencies
    metadata.hasInconsistencies = this.detectInconsistencies(metadata);

    // Determine if cleanup is needed
    metadata.needsCleanup = this.needsCleanup(metadata);
  }

  private detectInconsistencies(metadata: EnhancedMetadata): boolean {
    // Check for obvious inconsistencies
    if (metadata.title && metadata.suggestedTitle &&
        this.similarityScore(metadata.title, metadata.suggestedTitle) < 0.5) {
      return true;
    }

    if (metadata.artist && metadata.suggestedArtist &&
        this.similarityScore(metadata.artist, metadata.suggestedArtist) < 0.5) {
      return true;
    }

    // Check for year inconsistencies
    if (metadata.year && (metadata.year < 1900 || metadata.year > new Date().getFullYear() + 2)) {
      return true;
    }

    return false;
  }

  private needsCleanup(metadata: EnhancedMetadata): boolean {
    // Check for common issues that need cleanup
    const fields = [metadata.title, metadata.artist, metadata.album];

    for (const field of fields) {
      if (!field) continue;

      // Multiple spaces, weird characters, etc.
      if (field.includes('  ') ||
          field.includes('_') ||
          field.match(/[^\w\s\-\.\(\)\[\]&']/)) {
        return true;
      }
    }

    return false;
  }

  private cleanupMetadata(metadata: EnhancedMetadata): void {
    // Clean up string fields
    const stringFields: (keyof EnhancedMetadata)[] = [
      'title', 'artist', 'album', 'albumArtist', 'genre', 'composer',
      'comment', 'remixer', 'version', 'label', 'catalogNumber'
    ];

    for (const field of stringFields) {
      if (metadata[field] && typeof metadata[field] === 'string') {
        (metadata as any)[field] = this.cleanString(metadata[field] as string);
      }
    }
  }

  private cleanString(str: string): string {
    if (!str) return str;

    return str
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .replace(/[_]+/g, ' ')  // Underscores to spaces
      .replace(/\s*[-–—]\s*/g, ' - ')  // Normalize dashes
      .replace(/\s*\.\s*/g, '. ')  // Normalize periods
      .trim();
  }

  private normalizeGenre(genre?: string): string | undefined {
    if (!genre) return undefined;

    const normalized = this.genreMap.get(genre.toLowerCase());
    return normalized || this.capitalizeWords(genre);
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w+/g, word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  private similarityScore(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Simple Levenshtein-based similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Duplicate detection methods
  findDuplicates(tracks: Track[]): DuplicateMatch[] {
    const duplicates: DuplicateMatch[] = [];

    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        const match = this.compareTracks(tracks[i], tracks[j]);
        if (match.confidence > 0.5) {
          duplicates.push(match);
        }
      }
    }

    return duplicates.sort((a, b) => b.confidence - a.confidence);
  }

  private compareTracks(track1: Track, track2: Track): DuplicateMatch {
    const reasons: string[] = [];
    let confidence = 0;

    // Exact hash match (identical files)
    if (track1.hash === track2.hash) {
      return {
        track1: track1.id,
        track2: track2.id,
        matchType: 'identical',
        matchReasons: ['Identical file hash'],
        confidence: 1.0
      };
    }

    // Duration comparison (within 5 seconds)
    if (track1.durationMs && track2.durationMs) {
      const durationDiff = Math.abs(track1.durationMs - track2.durationMs);
      if (durationDiff < 5000) {
        confidence += 0.3;
        reasons.push('Similar duration');
      }
    }

    // Title comparison
    if (track1.title && track2.title) {
      const titleSim = this.similarityScore(track1.title, track2.title);
      if (titleSim > 0.8) {
        confidence += 0.4;
        reasons.push('Very similar title');
      } else if (titleSim > 0.6) {
        confidence += 0.2;
        reasons.push('Similar title');
      }
    }

    // Artist comparison
    if (track1.artist && track2.artist) {
      const artistSim = this.similarityScore(track1.artist, track2.artist);
      if (artistSim > 0.8) {
        confidence += 0.3;
        reasons.push('Very similar artist');
      } else if (artistSim > 0.6) {
        confidence += 0.15;
        reasons.push('Similar artist');
      }
    }

    // File size comparison (within 10%)
    const sizeDiff = Math.abs(track1.sizeBytes - track2.sizeBytes) / Math.max(track1.sizeBytes, track2.sizeBytes);
    if (sizeDiff < 0.1) {
      confidence += 0.2;
      reasons.push('Similar file size');
    }

    // Determine match type
    let matchType: 'identical' | 'likely' | 'possible';
    if (confidence > 0.8) {
      matchType = 'likely';
    } else if (confidence > 0.5) {
      matchType = 'possible';
    } else {
      matchType = 'possible';
    }

    return {
      track1: track1.id,
      track2: track2.id,
      matchType,
      matchReasons: reasons,
      confidence: Math.min(0.99, confidence) // Never quite 1.0 unless identical
    };
  }
}

export class MetadataHealthChecker {
  private extractor = new MetadataExtractor();

  async checkLibraryHealth(tracks: Track[]): Promise<{
    totalTracks: number;
    metadataQuality: {
      excellent: number;
      good: number;
      poor: number;
      missing: number;
    };
    duplicates: DuplicateMatch[];
    issuesFound: {
      missingTitles: number;
      missingArtists: number;
      missingAlbums: number;
      missingGenres: number;
      inconsistencies: number;
      needsCleanup: number;
    };
    recommendations: string[];
  }> {
    const quality = { excellent: 0, good: 0, poor: 0, missing: 0 };
    const issues = {
      missingTitles: 0,
      missingArtists: 0,
      missingAlbums: 0,
      missingGenres: 0,
      inconsistencies: 0,
      needsCleanup: 0
    };

    // Analyze each track's metadata
    for (const track of tracks) {
      const enhanced = await this.extractor.extractEnhancedMetadata(track.path, track);

      // Count quality levels
      quality[enhanced.metadataQuality || 'missing']++;

      // Count specific issues
      if (!track.title) issues.missingTitles++;
      if (!track.artist) issues.missingArtists++;
      if (!track.album) issues.missingAlbums++;
      if (!track.genre) issues.missingGenres++;
      if (enhanced.hasInconsistencies) issues.inconsistencies++;
      if (enhanced.needsCleanup) issues.needsCleanup++;
    }

    // Find duplicates
    const duplicates = this.extractor.findDuplicates(tracks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(tracks.length, issues, duplicates);

    return {
      totalTracks: tracks.length,
      metadataQuality: quality,
      duplicates,
      issuesFound: issues,
      recommendations
    };
  }

  private generateRecommendations(totalTracks: number, issues: any, duplicates: DuplicateMatch[]): string[] {
    const recommendations: string[] = [];

    if (issues.missingTitles > 0) {
      recommendations.push(`Fix ${issues.missingTitles} tracks with missing titles using filename parsing`);
    }

    if (issues.missingArtists > 0) {
      recommendations.push(`Add artist information to ${issues.missingArtists} tracks`);
    }

    if (issues.missingGenres > totalTracks * 0.5) {
      recommendations.push('Consider bulk genre tagging for better organization');
    }

    if (duplicates.length > 0) {
      recommendations.push(`Review ${duplicates.length} potential duplicate tracks`);
    }

    if (issues.needsCleanup > totalTracks * 0.3) {
      recommendations.push('Run metadata cleanup to normalize formatting');
    }

    if (issues.inconsistencies > 0) {
      recommendations.push(`Resolve ${issues.inconsistencies} metadata inconsistencies`);
    }

    return recommendations;
  }
}