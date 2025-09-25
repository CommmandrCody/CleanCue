/**
 * Find Command - Fast File Finding with Filters
 */

import { Command } from '../types.js';
import { FileScanner, AudioFile } from '../core/file-scanner.js';
import { MetadataReader } from '../core/metadata-reader.js';
import path from 'path';

export class FindCommand implements Command {
  name = 'find';
  description = 'Find audio files with filters (shell-optimized)';
  usage = 'find <path> [--format FORMAT] [--name PATTERN] [--size SIZE] [--large] [--small]';

  async execute(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new Error('Please provide path to search\nUsage: cleancue find <path> [options]\nExample: cleancue find ~/Music --format flac --large');
    }

    const options = this.parseOptions(args);
    const searchPath = args.find(arg => !arg.startsWith('--'));

    if (!searchPath) {
      throw new Error('Please provide a search path');
    }

    console.log(`🔍 Searching for audio files in: ${searchPath}`);
    if (options.format) console.log(`   Format filter: ${options.format.toUpperCase()}`);
    if (options.namePattern) console.log(`   Name pattern: ${options.namePattern}`);
    if (options.sizeFilter) console.log(`   Size filter: ${options.sizeFilter}`);

    const scanner = new FileScanner({
      extensions: options.format ? [`.${options.format.toLowerCase()}`] : undefined
    });

    const result = await scanner.scan([searchPath]);
    let filteredFiles = result.files;

    // Apply filters
    if (options.namePattern) {
      const regex = new RegExp(options.namePattern, 'i');
      filteredFiles = filteredFiles.filter(file => regex.test(file.filename));
    }

    if (options.sizeFilter) {
      filteredFiles = this.applySizeFilter(filteredFiles, options.sizeFilter);
    }

    if (options.large) {
      filteredFiles = filteredFiles.filter(file => file.size > 50 * 1024 * 1024); // > 50MB
    }

    if (options.small) {
      filteredFiles = filteredFiles.filter(file => file.size < 5 * 1024 * 1024); // < 5MB
    }

    // Sort by size (largest first)
    filteredFiles.sort((a, b) => b.size - a.size);

    console.log(`\n✅ Found ${filteredFiles.length.toLocaleString()} matching files`);

    if (filteredFiles.length === 0) {
      return;
    }

    // Show results
    const showLimit = Math.min(filteredFiles.length, 20);
    console.log(`\n🎵 Results (showing first ${showLimit}):`);

    for (let i = 0; i < showLimit; i++) {
      const file = filteredFiles[i];
      const sizeStr = FileScanner.formatSize(file.size);
      const pathStr = path.relative(searchPath, file.path);
      console.log(`   ${(i + 1).toString().padStart(2)}. ${file.filename} (${sizeStr})`);
      console.log(`       ${pathStr}`);
    }

    if (filteredFiles.length > showLimit) {
      console.log(`\n... and ${filteredFiles.length - showLimit} more files`);
    }

    // Show summary stats
    const totalSize = filteredFiles.reduce((sum, file) => sum + file.size, 0);
    const avgSize = totalSize / filteredFiles.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total size: ${FileScanner.formatSize(totalSize)}`);
    console.log(`   Average size: ${FileScanner.formatSize(avgSize)}`);

    // Show largest and smallest
    if (filteredFiles.length > 1) {
      const largest = filteredFiles[0];
      const smallest = filteredFiles[filteredFiles.length - 1];
      console.log(`   Largest: ${largest.filename} (${FileScanner.formatSize(largest.size)})`);
      console.log(`   Smallest: ${smallest.filename} (${FileScanner.formatSize(smallest.size)})`);
    }
  }

  private parseOptions(args: string[]): {
    format?: string;
    namePattern?: string;
    sizeFilter?: string;
    large: boolean;
    small: boolean;
  } {
    const options = {
      format: undefined as string | undefined,
      namePattern: undefined as string | undefined,
      sizeFilter: undefined as string | undefined,
      large: false,
      small: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--format' && i + 1 < args.length) {
        options.format = args[i + 1];
        i++;
      } else if (arg === '--name' && i + 1 < args.length) {
        options.namePattern = args[i + 1];
        i++;
      } else if (arg === '--size' && i + 1 < args.length) {
        options.sizeFilter = args[i + 1];
        i++;
      } else if (arg === '--large') {
        options.large = true;
      } else if (arg === '--small') {
        options.small = true;
      }
    }

    return options;
  }

  private applySizeFilter(files: AudioFile[], sizeFilter: string): AudioFile[] {
    const match = sizeFilter.match(/^([><=]+)(\d+(?:\.\d+)?)(MB|KB|GB)?$/i);
    if (!match) {
      console.warn(`Invalid size filter: ${sizeFilter}`);
      return files;
    }

    const operator = match[1];
    const value = parseFloat(match[2]);
    const unit = (match[3] || 'MB').toUpperCase();

    let bytes = value;
    switch (unit) {
      case 'KB':
        bytes = value * 1024;
        break;
      case 'MB':
        bytes = value * 1024 * 1024;
        break;
      case 'GB':
        bytes = value * 1024 * 1024 * 1024;
        break;
    }

    switch (operator) {
      case '>':
        return files.filter(file => file.size > bytes);
      case '<':
        return files.filter(file => file.size < bytes);
      case '>=':
        return files.filter(file => file.size >= bytes);
      case '<=':
        return files.filter(file => file.size <= bytes);
      case '=':
      case '==':
        const tolerance = bytes * 0.1; // 10% tolerance
        return files.filter(file => Math.abs(file.size - bytes) <= tolerance);
      default:
        console.warn(`Unknown operator: ${operator}`);
        return files;
    }
  }
}