/**
 * Lightweight Metadata Reader - No Engine Dependencies
 *
 * Fast metadata extraction for audio files using node-id3 and other lightweight libraries.
 * Optimized for shell operations and batch processing.
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  track?: number;
  duration?: number; // seconds
  bitrate?: number;
  sampleRate?: number;
  format?: string;
}

export interface MetadataResult {
  path: string;
  metadata: AudioMetadata;
  error?: string;
}

export class MetadataReader {
  /**
   * Read metadata from a single audio file
   */
  static async readFile(filePath: string): Promise<MetadataResult> {
    const result: MetadataResult = {
      path: filePath,
      metadata: {}
    };

    try {
      const ext = path.extname(filePath).toLowerCase();

      switch (ext) {
        case '.mp3':
          result.metadata = await this.readMp3(filePath);
          break;
        case '.flac':
          result.metadata = await this.readFlac(filePath);
          break;
        case '.wav':
          result.metadata = await this.readWav(filePath);
          break;
        case '.m4a':
        case '.aac':
          result.metadata = await this.readM4a(filePath);
          break;
        case '.ogg':
          result.metadata = await this.readOgg(filePath);
          break;
        default:
          result.metadata = await this.readGeneric(filePath);
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * Read metadata from multiple files in batch
   */
  static async readBatch(filePaths: string[], options: {
    maxConcurrent?: number;
    onProgress?: (completed: number, total: number, current: string) => void;
  } = {}): Promise<MetadataResult[]> {
    const { maxConcurrent = 5, onProgress } = options;
    const results: MetadataResult[] = [];
    const total = filePaths.length;
    let completed = 0;

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < filePaths.length; i += maxConcurrent) {
      const batch = filePaths.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(filePath => {
        return this.readFile(filePath).then(result => {
          completed++;
          if (onProgress) {
            onProgress(completed, total, filePath);
          }
          return result;
        });
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private static async readMp3(filePath: string): Promise<AudioMetadata> {
    // For now, return basic file info - we can add node-id3 later if needed
    return this.readGeneric(filePath);
  }

  private static async readFlac(filePath: string): Promise<AudioMetadata> {
    // For now, return basic file info - we can add flac parser later if needed
    return this.readGeneric(filePath);
  }

  private static async readWav(filePath: string): Promise<AudioMetadata> {
    return this.readGeneric(filePath);
  }

  private static async readM4a(filePath: string): Promise<AudioMetadata> {
    return this.readGeneric(filePath);
  }

  private static async readOgg(filePath: string): Promise<AudioMetadata> {
    return this.readGeneric(filePath);
  }

  private static async readGeneric(filePath: string): Promise<AudioMetadata> {
    const stat = await fs.stat(filePath);
    const filename = path.basename(filePath, path.extname(filePath));

    // Extract basic info from filename if available
    const metadata: AudioMetadata = {
      format: path.extname(filePath).substring(1).toUpperCase()
    };

    // Try to parse artist - title from filename
    const match = filename.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (match) {
      metadata.artist = match[1].trim();
      metadata.title = match[2].trim();
    } else {
      metadata.title = filename;
    }

    return metadata;
  }

  /**
   * Quick file format detection
   */
  static getFormatInfo(filePath: string): { format: string; isLossless: boolean; isSupported: boolean } {
    const ext = path.extname(filePath).toLowerCase();

    const formatMap: Record<string, { format: string; isLossless: boolean; isSupported: boolean }> = {
      '.mp3': { format: 'MP3', isLossless: false, isSupported: true },
      '.flac': { format: 'FLAC', isLossless: true, isSupported: true },
      '.wav': { format: 'WAV', isLossless: true, isSupported: true },
      '.aiff': { format: 'AIFF', isLossless: true, isSupported: true },
      '.m4a': { format: 'M4A', isLossless: false, isSupported: true },
      '.aac': { format: 'AAC', isLossless: false, isSupported: true },
      '.ogg': { format: 'OGG', isLossless: false, isSupported: true },
      '.wma': { format: 'WMA', isLossless: false, isSupported: true },
      '.ape': { format: 'APE', isLossless: true, isSupported: true }
    };

    return formatMap[ext] || { format: 'UNKNOWN', isLossless: false, isSupported: false };
  }

  /**
   * Group files by format
   */
  static groupByFormat(filePaths: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    for (const filePath of filePaths) {
      const { format } = this.getFormatInfo(filePath);
      if (!groups[format]) {
        groups[format] = [];
      }
      groups[format].push(filePath);
    }

    return groups;
  }

  /**
   * Get lossless vs lossy breakdown
   */
  static getLosslessBreakdown(filePaths: string[]): { lossless: string[]; lossy: string[]; unknown: string[] } {
    const breakdown = { lossless: [] as string[], lossy: [] as string[], unknown: [] as string[] };

    for (const filePath of filePaths) {
      const { isLossless, isSupported } = this.getFormatInfo(filePath);
      if (!isSupported) {
        breakdown.unknown.push(filePath);
      } else if (isLossless) {
        breakdown.lossless.push(filePath);
      } else {
        breakdown.lossy.push(filePath);
      }
    }

    return breakdown;
  }
}