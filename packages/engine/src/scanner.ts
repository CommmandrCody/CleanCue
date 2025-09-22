import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Handle music-metadata import - it might not be available during build
let parseFile: any = null;

async function getParseFile() {
  if (parseFile === null) {
    try {
      // Try different import methods for Electron compatibility
      let musicMetadata;
      try {
        // First try ES module import
        musicMetadata = await import('music-metadata');
      } catch (esError) {
        try {
          // Fallback to CommonJS require
          musicMetadata = require('music-metadata');
        } catch (cjsError) {
          console.warn('music-metadata not available via import or require:', esError.message, cjsError.message);
          parseFile = false;
          return null;
        }
      }

      parseFile = musicMetadata.parseFile;
      console.log('Successfully loaded music-metadata parseFile function');
    } catch (error) {
      console.warn('music-metadata not available, metadata extraction will be limited:', error.message);
      parseFile = false; // Mark as failed
    }
  }
  return parseFile === false ? null : parseFile;
}

export interface ScannedFile {
  path: string;
  hash: string;
  sizeBytes: number;
  modifiedAt: Date;
}

export interface AudioMetadata {
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
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;

  // DJ set detection fields
  isDjSet?: boolean;
  djSetType?: 'mix' | 'set' | 'podcast' | 'radio_show' | 'live_set';
  djSetConfidence?: number;
  djSetReason?: string;
  needsReview?: boolean;
}

export interface ScanConfig {
  extensions: string[];
  respectGitignore: boolean;
  followSymlinks: boolean;
  maxFileSize: number;
  hashAlgorithm: string;
  includeSubdirectories: boolean;
}

export class FileScanner {
  private config: ScanConfig;
  private readonly supportedExtensions = [
    '.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.wma', '.aiff', '.ape'
  ];

  constructor(config: Partial<ScanConfig> = {}) {
    this.config = {
      extensions: this.supportedExtensions,
      respectGitignore: false,
      followSymlinks: false,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      hashAlgorithm: 'sha256',
      includeSubdirectories: true,
      ...config
    };
  }

  async scanPaths(paths: string[]): Promise<ScannedFile[]> {
    const allFiles: ScannedFile[] = [];
    
    for (const scanPath of paths) {
      const files = await this.scanPath(scanPath);
      allFiles.push(...files);
    }
    
    return allFiles;
  }

  private async scanPath(scanPath: string): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];

    console.log(`Scanning path: ${scanPath}`);

    try {
      const stat = await fs.stat(scanPath);

      if (stat.isFile()) {
        console.log(`Path is file: ${scanPath}`);
        if (this.isAudioFile(scanPath)) {
          console.log(`Processing audio file: ${scanPath}`);
          const file = await this.processFile(scanPath, stat);
          if (file) files.push(file);
        } else {
          console.log(`File is not audio format: ${scanPath}`);
        }
      } else if (stat.isDirectory()) {
        console.log(`Path is directory, scanning recursively: ${scanPath}`);
        const dirFiles = await this.scanDirectory(scanPath);
        console.log(`Found ${dirFiles.length} files in directory: ${scanPath}`);
        files.push(...dirFiles);
      }
    } catch (error) {
      console.error(`Failed to scan ${scanPath}:`, error);
      throw error; // Re-throw to surface the actual error
    }
    
    return files;
  }

  private async scanDirectory(dirPath: string): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        let fullPath: string;
        try {
          // Handle Unicode filenames properly by normalizing them
          const normalizedName = Buffer.from(entry.name, 'utf8').toString('utf8');
          fullPath = path.join(dirPath, normalizedName);
        } catch (unicodeError) {
          console.warn(`Skipping file with invalid Unicode characters: ${entry.name}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          // Check if we should include subdirectories
          if (!this.config.includeSubdirectories) {
            continue;
          }

          // Skip hidden directories and common ignore patterns
          if (entry.name.startsWith('.') ||
              entry.name === 'node_modules' ||
              entry.name === '__pycache__') {
            continue;
          }

          files.push(...await this.scanDirectory(fullPath));
        } else if (entry.isFile() || (entry.isSymbolicLink() && this.config.followSymlinks)) {
          if (this.isAudioFile(fullPath)) {
            try {
              const stat = await fs.stat(fullPath);
              const file = await this.processFile(fullPath, stat);
              if (file) files.push(file);
            } catch (error) {
              console.warn(`Failed to process ${fullPath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }
    
    return files;
  }

  private async processFile(filePath: string, stat: any): Promise<ScannedFile | null> {
    // Check file size
    if (stat.size > this.config.maxFileSize) {
      console.warn(`Skipping large file: ${filePath} (${stat.size} bytes)`);
      return null;
    }
    
    try {
      const hash = await this.calculateFileHash(filePath);
      
      return {
        path: filePath,
        hash,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime
      };
    } catch (error) {
      console.warn(`Failed to hash file ${filePath}:`, error);
      return null;
    }
  }

  private isAudioFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.extensions.includes(ext);
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(this.config.hashAlgorithm);
      const stream = createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async extractMetadata(filePath: string): Promise<AudioMetadata> {
    const parseFileFn = await getParseFile();
    if (!parseFileFn) {
      console.warn('music-metadata not available, returning empty metadata');
      return this.extractMetadataFromFilename(filePath);
    }

    try {
      // Add timeout to prevent hanging on problematic files
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Metadata extraction timeout')), 10000); // 10 second timeout
      });

      const metadata = await Promise.race([
        parseFileFn(filePath),
        timeoutPromise
      ]);

      // Extract title and artist from filename if not available in metadata
      const filenameMetadata = this.extractMetadataFromFilename(filePath);

      const baseMetadata = {
        title: metadata.common.title || filenameMetadata.title,
        artist: metadata.common.artist || filenameMetadata.artist,
        album: metadata.common.album,
        albumArtist: metadata.common.albumartist,
        genre: metadata.common.genre?.[0],
        year: metadata.common.year,
        trackNumber: metadata.common.track?.no || undefined,
        discNumber: metadata.common.disk?.no || undefined,
        composer: metadata.common.composer?.[0],
        comment: typeof metadata.common.comment?.[0] === 'string'
          ? metadata.common.comment[0]
          : metadata.common.comment?.[0]?.text || undefined,
        durationMs: metadata.format.duration ? Math.round(metadata.format.duration * 1000) : undefined,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        channels: metadata.format.numberOfChannels
      };

      // Add DJ set detection
      const djSetDetection = this.detectDJSet(baseMetadata, filePath);

      return {
        ...baseMetadata,
        ...djSetDetection
      };
    } catch (error) {
      console.warn(`Failed to extract metadata from ${filePath}:`, error);
      const fallbackMetadata = this.extractMetadataFromFilename(filePath);
      const djSetDetection = this.detectDJSet(fallbackMetadata, filePath);
      return {
        ...fallbackMetadata,
        ...djSetDetection
      };
    }
  }

  private extractMetadataFromFilename(filePath: string): AudioMetadata {
    const filename = path.basename(filePath, path.extname(filePath));

    // Common patterns for DJ tracks:
    // "Artist - Title"
    // "Artist - Title (Remix)"
    // "01. Artist - Title"
    // "Artist_-_Title"
    // "Title"

    let title = filename;
    let artist: string | undefined;

    // Remove track numbers at the beginning
    title = title.replace(/^\d+[\.\-\s]+/, '');

    // Check for Artist - Title pattern
    const dashSplit = title.split(' - ');
    if (dashSplit.length >= 2) {
      artist = dashSplit[0].trim();
      title = dashSplit.slice(1).join(' - ').trim();
    } else {
      // Check for Artist_-_Title pattern (common in download filenames)
      const underscoreDashSplit = title.split('_-_');
      if (underscoreDashSplit.length >= 2) {
        artist = underscoreDashSplit[0].trim().replace(/_/g, ' ');
        title = underscoreDashSplit.slice(1).join('_-_').trim().replace(/_/g, ' ');
      } else {
        // Check for other separators
        const separators = [' by ', ' BY ', ' feat. ', ' ft. ', ' featuring '];
        for (const sep of separators) {
          const sepIndex = title.indexOf(sep);
          if (sepIndex > 0) {
            artist = title.substring(sepIndex + sep.length).trim();
            title = title.substring(0, sepIndex).trim();
            break;
          }
        }
      }
    }

    // Clean up common artifacts
    title = title.replace(/[\[\(].*?[\]\)]/g, '').trim(); // Remove bracketed content like (Original Mix)
    title = title.replace(/\s+/g, ' '); // Normalize whitespace

    if (artist) {
      artist = artist.replace(/[\[\(].*?[\]\)]/g, '').trim();
      artist = artist.replace(/\s+/g, ' ');
    }

    return {
      title: title || filename,
      artist: artist
    };
  }

  private detectDJSet(metadata: AudioMetadata, filePath: string): Partial<AudioMetadata> {
    // DJ set detection keywords and patterns
    const djSetKeywords = [
      'mix', 'set', 'dj', 'podcast', 'radio show', 'live set', 'mixtape',
      'compilation', 'essential mix', 'guest mix', 'warm up', 'closing set',
      'live from', 'recorded at', 'session', 'mix series', 'radio 1',
      'bbc', 'boiler room', 'fabriclive', 'mixed by', 'presents',
      'continuous mix', 'non stop', 'megamix', 'mixed set'
    ];

    const djSetPatterns = [
      /\b\d{1,2}[:\-]\d{2}[:\-]\d{2}\b/,  // Duration patterns like 1:23:45
      /\bmix\s*#?\d+/i,                     // Mix numbers like "Mix #12"
      /\bep\.\s*\d+/i,                      // Episode numbers
      /\b\d{4}[.\-_]\d{1,2}[.\-_]\d{1,2}\b/, // Date patterns
      /\blive\s+at\s+/i,                    // Live venue indicators
      /\brecorded\s+live/i,                 // Live recordings
      /\bwarm\s*up\s*set/i,                 // Warm up sets
      /\bclosing\s*set/i,                   // Closing sets
      /\b\d+\s*hour/i,                      // Duration mentions
      /\bpart\s*[1-9]/i,                    // Multi-part mixes
      /\bvolume\s*[1-9]/i                   // Volume series
    ];

    let confidence = 0;
    let djSetType: 'mix' | 'set' | 'podcast' | 'radio_show' | 'live_set' = 'mix';
    const reasons: string[] = [];

    // Check duration (major indicator)
    if (metadata.durationMs && metadata.durationMs > 15 * 60 * 1000) { // 15+ minutes
      confidence += 0.4;
      reasons.push(`Long duration: ${Math.round(metadata.durationMs / 60000)} minutes`);

      if (metadata.durationMs > 30 * 60 * 1000) { // 30+ minutes
        confidence += 0.3;
        reasons.push('Very long duration (30+ min)');
      }
    }

    // Analyze title and filename for DJ set indicators
    const filename = path.basename(filePath);
    const searchText = [
      metadata.title,
      filename,
      metadata.artist,
      metadata.album,
      metadata.comment
    ].filter(Boolean).join(' ').toLowerCase();

    // Check for DJ set keywords
    let keywordMatches = 0;
    for (const keyword of djSetKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        keywordMatches++;
        confidence += 0.15;

        // Classify DJ set type based on keywords
        if (['podcast', 'radio show', 'bbc', 'radio 1'].some(k => searchText.includes(k))) {
          djSetType = 'podcast';
        } else if (['live', 'boiler room', 'recorded at', 'live from'].some(k => searchText.includes(k))) {
          djSetType = 'live_set';
        } else if (['essential mix', 'guest mix', 'radio show'].some(k => searchText.includes(k))) {
          djSetType = 'radio_show';
        } else if (['set', 'closing set', 'warm up'].some(k => searchText.includes(k))) {
          djSetType = 'set';
        }
      }
    }

    if (keywordMatches > 0) {
      reasons.push(`Found ${keywordMatches} DJ set keyword(s)`);
    }

    // Check for patterns
    let patternMatches = 0;
    for (const pattern of djSetPatterns) {
      if (pattern.test(searchText)) {
        patternMatches++;
        confidence += 0.1;
      }
    }

    if (patternMatches > 0) {
      reasons.push(`Matched ${patternMatches} DJ set pattern(s)`);
    }

    // Check for YouTube/streaming source indicators
    const isFromYoutube = filePath.toLowerCase().includes('youtube') ||
                         filePath.toLowerCase().includes('yt-dlp') ||
                         searchText.includes('youtube');

    if (isFromYoutube) {
      confidence += 0.2;
      reasons.push('Downloaded from YouTube');
    }

    // Check for multiple artists (compilations/mixes often have many)
    if (metadata.artist && (metadata.artist.includes(',') || metadata.artist?.includes('&') ||
        metadata.artist?.includes('vs') || metadata.artist?.includes('feat'))) {
      confidence += 0.1;
      reasons.push('Multiple artists detected');
    }

    // Filename analysis for mix indicators
    if (filename.toLowerCase().includes('[') && filename.toLowerCase().includes(']')) {
      confidence += 0.1;
      reasons.push('Bracketed metadata in filename');
    }

    // Return DJ set detection results if confidence is high enough
    if (confidence >= 0.6) {
      return {
        isDjSet: true,
        djSetType,
        djSetConfidence: confidence,
        djSetReason: reasons.join(', '),
        needsReview: confidence < 0.8 // Flag for manual review if not highly confident
      }
    }

    return {};
  }

  getSupportedExtensions(): string[] {
    return [...this.supportedExtensions];
  }

  getConfig(): ScanConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ScanConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
