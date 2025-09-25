/**
 * Count Command - Fast Track Counting for Shell Operations
 */

import { Command } from '../types.js';
import { FileScanner } from '../core/file-scanner.js';

export class CountCommand implements Command {
  name = 'count';
  description = 'Count audio files in directories (ultra-fast)';
  usage = 'count <path1> [path2] ... [--format FORMAT]';

  async execute(args: string[]): Promise<void> {
    if (args.length === 0) {
      throw new Error('Please provide path(s) to count\nUsage: cleancue count <path1> [path2] ...\nExample: cleancue count ~/Music');
    }

    // Parse options
    const formatFilter = this.parseFormatOption(args);
    const paths = args.filter(arg => !arg.startsWith('--'));

    console.log(`🔢 Counting audio files in ${paths.length} path(s)...`);

    const extensions = formatFilter ? [`.${formatFilter.toLowerCase()}`] : undefined;
    const startTime = Date.now();

    try {
      const count = await FileScanner.quickCount(paths, extensions);
      const duration = Date.now() - startTime;

      const formatText = formatFilter ? ` (${formatFilter.toUpperCase()} only)` : '';
      console.log(`✅ Found ${count.toLocaleString()} audio files${formatText} in ${FileScanner.formatDuration(duration)}`);

      // Show per-path breakdown if multiple paths
      if (paths.length > 1) {
        console.log('\n📁 Per-directory breakdown:');
        for (const path of paths) {
          const pathCount = await FileScanner.quickCount([path], extensions);
          console.log(`   ${path}: ${pathCount.toLocaleString()} files`);
        }
      }

    } catch (error) {
      throw new Error(`Count failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private parseFormatOption(args: string[]): string | undefined {
    const formatIndex = args.indexOf('--format');
    if (formatIndex !== -1 && formatIndex + 1 < args.length) {
      return args[formatIndex + 1];
    }
    return undefined;
  }
}