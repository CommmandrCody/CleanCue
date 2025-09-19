import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Handle music-metadata import - it might not be available during build
let parseFile: any = null;

async function getParseFile() {
  if (parseFile === null) {
    try {
      const musicMetadata = await import('music-metadata');
      parseFile = musicMetadata.parseFile;
    } catch (error) {
      console.warn('music-metadata not available, metadata extraction will be limited');
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
        const fullPath = path.join(dirPath, entry.name);
        
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

      return {
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
    } catch (error) {
      console.warn(`Failed to extract metadata from ${filePath}:`, error);
      return this.extractMetadataFromFilename(filePath);
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
