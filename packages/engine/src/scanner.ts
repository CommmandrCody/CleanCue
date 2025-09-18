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
    
    try {
      const stat = await fs.stat(scanPath);
      
      if (stat.isFile()) {
        if (this.isAudioFile(scanPath)) {
          const file = await this.processFile(scanPath, stat);
          if (file) files.push(file);
        }
      } else if (stat.isDirectory()) {
        files.push(...await this.scanDirectory(scanPath));
      }
    } catch (error) {
      console.warn(`Failed to scan ${scanPath}:`, error);
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
      return {};
    }

    try {
      const metadata = await parseFileFn(filePath);
      
      return {
        title: metadata.common.title,
        artist: metadata.common.artist,
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
      return {};
    }
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
