/**
 * Standalone Scan Command - No Engine Dependencies
 *
 * Fast, lightweight scanning optimized for shell operations and large track sweeps.
 */

import { promises as fs } from 'fs';
import { Command } from '../types.js';
import { FileScanner, AudioFile } from '../core/file-scanner.js';
import { MetadataReader } from '../core/metadata-reader.js';

export class StandaloneScanCommand implements Command {
  name = 'scan';
  description = 'Scan directories for music files (standalone, fast)';
  usage = 'scan <path1> [path2] [path3] ... [--format FORMAT] [--meta] [--hash]';

  async execute(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new Error('Please provide path(s) to scan\nUsage: cleancue scan <path1> [path2] [path3] ...\nExample: cleancue scan ~/Music/DJ\\ Collection');
    }

    // Parse options from args
    const options = this.parseOptions(args);
    const paths = args.filter(arg => !arg.startsWith('--'));

    // Validate paths exist
    for (const scanPath of paths) {
      const stat = await fs.stat(scanPath);
      if (!stat.isDirectory() && !stat.isFile()) {
        throw new Error(`${scanPath} is not a directory or file`);
      }
    }

    console.log(`🔍 Scanning ${paths.length} path(s)...`);

    const scanner = new FileScanner({
      includeHash: options.hash,
      extensions: options.format ? [`.${options.format.toLowerCase()}`] : undefined
    });

    // Set up progress reporting
    let progressCount = 0;
    scanner.setProgressCallback((current, file) => {
      progressCount = current;
      if (current % 100 === 0 || current <= 10) {
        const filename = file.split('/').pop() || file;
        process.stdout.write(`\r📂 Found ${current} files... ${filename}`);
      }
    });

    const startTime = Date.now();
    const result = await scanner.scan(paths);
    const scanDuration = Date.now() - startTime;

    // Clear progress line
    if (progressCount > 0) {
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
    }

    console.log(`✅ Scan complete: ${result.totalFiles} files found in ${FileScanner.formatDuration(scanDuration)}`);

    if (result.errors.length > 0) {
      console.log(`❌ ${result.errors.length} errors encountered:`);
      result.errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    // Show summary
    this.showSummary(result);

    // Show format breakdown
    this.showFormatBreakdown(result.files);

    // Read metadata if requested
    if (options.meta && result.files.length > 0) {
      await this.showMetadataSample(result.files.slice(0, 10));
    }
  }

  private parseOptions(args: string[]): { format?: string; meta: boolean; hash: boolean } {
    const options = { meta: false, hash: false, format: undefined as string | undefined };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--meta') {
        options.meta = true;
      } else if (arg === '--hash') {
        options.hash = true;
      } else if (arg === '--format' && i + 1 < args.length) {
        options.format = args[i + 1];
        i++; // Skip the next arg since it's the format value
      }
    }

    return options;
  }

  private showSummary(result: { files: AudioFile[]; totalSize: number; duration: number }): void {
    console.log('\n📊 Scan Summary:');
    console.log(`   Total files: ${result.files.length.toLocaleString()}`);
    console.log(`   Total size: ${FileScanner.formatSize(result.totalSize)}`);
    if (result.files.length > 0) {
      const avgSize = result.totalSize / result.files.length;
      console.log(`   Average size: ${FileScanner.formatSize(avgSize)}`);
    }
    console.log(`   Scan time: ${FileScanner.formatDuration(result.duration)}`);
  }

  private showFormatBreakdown(files: AudioFile[]): void {
    const formats: Record<string, { count: number; size: number }> = {};

    for (const file of files) {
      const format = file.ext.substring(1).toUpperCase();
      if (!formats[format]) {
        formats[format] = { count: 0, size: 0 };
      }
      formats[format].count++;
      formats[format].size += file.size;
    }

    if (Object.keys(formats).length > 1) {
      console.log('\n🎵 Format Breakdown:');
      for (const [format, stats] of Object.entries(formats)) {
        const percentage = ((stats.count / files.length) * 100).toFixed(1);
        console.log(`   ${format}: ${stats.count.toLocaleString()} files (${percentage}%) - ${FileScanner.formatSize(stats.size)}`);
      }

      // Show lossless vs lossy
      const breakdown = MetadataReader.getLosslessBreakdown(files.map(f => f.path));
      console.log('\n💽 Quality Breakdown:');
      console.log(`   Lossless: ${breakdown.lossless.length.toLocaleString()} files`);
      console.log(`   Lossy: ${breakdown.lossy.length.toLocaleString()} files`);
      if (breakdown.unknown.length > 0) {
        console.log(`   Unknown: ${breakdown.unknown.length.toLocaleString()} files`);
      }
    }
  }

  private async showMetadataSample(files: AudioFile[]): Promise<void> {
    console.log('\n🏷️  Metadata Sample (first 10 files):');

    const results = await MetadataReader.readBatch(
      files.map(f => f.path),
      { maxConcurrent: 3 }
    );

    for (const [index, result] of results.entries()) {
      const file = files[index];
      if (result.error) {
        console.log(`   ${index + 1}. ${file.filename} - Error: ${result.error}`);
      } else {
        const meta = result.metadata;
        const artist = meta.artist || 'Unknown Artist';
        const title = meta.title || file.filename;
        console.log(`   ${index + 1}. ${artist} - ${title} (${meta.format || 'Unknown'})`);
      }
    }
  }
}