/**
 * Standalone File Scanner - No Engine Dependencies
 *
 * Fast, lightweight file system scanner for audio files.
 * Optimized for shell operations and large track sweeps.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export interface AudioFile {
  path: string;
  filename: string;
  size: number;
  ext: string;
  hash?: string;
  modified: Date;
}

export interface ScanResult {
  files: AudioFile[];
  totalFiles: number;
  totalSize: number;
  errors: string[];
  duration: number;
}

export interface ScanOptions {
  extensions?: string[];
  followSymlinks?: boolean;
  maxDepth?: number;
  includeHash?: boolean;
  excludePatterns?: string[];
}

export class FileScanner {
  private static readonly DEFAULT_EXTENSIONS = [
    '.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.wma', '.aiff', '.ape'
  ];

  private static readonly DEFAULT_EXCLUDE = [
    'node_modules', '.git', '.DS_Store', 'Thumbs.db', '.AppleDouble'
  ];

  private options: Required<ScanOptions>;
  private scannedCount = 0;
  private onProgress?: (current: number, file: string) => void;

  constructor(options: ScanOptions = {}) {
    this.options = {
      extensions: options.extensions || FileScanner.DEFAULT_EXTENSIONS,
      followSymlinks: options.followSymlinks || false,
      maxDepth: options.maxDepth || 50,
      includeHash: options.includeHash || false,
      excludePatterns: options.excludePatterns || FileScanner.DEFAULT_EXCLUDE
    };
  }

  setProgressCallback(callback: (current: number, file: string) => void): void {
    this.onProgress = callback;
  }

  async scan(paths: string[]): Promise<ScanResult> {
    const startTime = Date.now();
    const result: ScanResult = {
      files: [],
      totalFiles: 0,
      totalSize: 0,
      errors: [],
      duration: 0
    };

    this.scannedCount = 0;

    for (const scanPath of paths) {
      try {
        await this.scanPath(scanPath, result, 0);
      } catch (error) {
        result.errors.push(`Error scanning ${scanPath}: ${error instanceof Error ? error.message : error}`);
      }
    }

    result.totalFiles = result.files.length;
    result.totalSize = result.files.reduce((sum, file) => sum + file.size, 0);
    result.duration = Date.now() - startTime;

    return result;
  }

  private async scanPath(dirPath: string, result: ScanResult, depth: number): Promise<void> {
    if (depth > this.options.maxDepth) {
      return;
    }

    try {
      const stat = await fs.stat(dirPath);

      if (stat.isFile()) {
        await this.processFile(dirPath, stat, result);
        return;
      }

      if (!stat.isDirectory()) {
        return;
      }

      // Check if directory should be excluded
      const dirName = path.basename(dirPath);
      if (this.options.excludePatterns.some(pattern => dirName.includes(pattern))) {
        return;
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.scanPath(fullPath, result, depth + 1);
        } else if (entry.isFile()) {
          const fileStat = await fs.stat(fullPath);
          await this.processFile(fullPath, fileStat, result);
        } else if (entry.isSymbolicLink() && this.options.followSymlinks) {
          try {
            const targetStat = await fs.stat(fullPath);
            if (targetStat.isDirectory()) {
              await this.scanPath(fullPath, result, depth + 1);
            } else if (targetStat.isFile()) {
              await this.processFile(fullPath, targetStat, result);
            }
          } catch (error) {
            result.errors.push(`Error following symlink ${fullPath}: ${error instanceof Error ? error.message : error}`);
          }
        }
      }
    } catch (error) {
      result.errors.push(`Error accessing ${dirPath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async processFile(filePath: string, stat: any, result: ScanResult): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();

    // Check if it's an audio file
    if (!this.options.extensions.includes(ext)) {
      return;
    }

    this.scannedCount++;

    if (this.onProgress) {
      this.onProgress(this.scannedCount, filePath);
    }

    try {
      const audioFile: AudioFile = {
        path: filePath,
        filename: path.basename(filePath),
        size: stat.size,
        ext: ext,
        modified: stat.mtime
      };

      // Add hash if requested
      if (this.options.includeHash) {
        audioFile.hash = await this.calculateHash(filePath);
      }

      result.files.push(audioFile);
    } catch (error) {
      result.errors.push(`Error processing ${filePath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async calculateHash(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = await fs.readFile(filePath);
    hash.update(stream);
    return hash.digest('hex');
  }

  // Utility methods for shell operations
  static async quickCount(paths: string[], extensions?: string[]): Promise<number> {
    const scanner = new FileScanner({ extensions, includeHash: false });
    const result = await scanner.scan(paths);
    return result.totalFiles;
  }

  static async quickSize(paths: string[], extensions?: string[]): Promise<number> {
    const scanner = new FileScanner({ extensions, includeHash: false });
    const result = await scanner.scan(paths);
    return result.totalSize;
  }

  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}