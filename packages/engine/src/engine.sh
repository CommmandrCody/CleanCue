#!/bin/bash

echo "Applying final fixes to engine.ts..."

# Fix the CLI stats command by updating the method signatures
cat > packages/cli/src/index.ts << 'EOF'
#!/usr/bin/env node

import { Command } from 'commander';
import { CleanCueEngine } from '@cleancue/engine';
import type { ExportFormat } from '@cleancue/shared';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';

const program = new Command();

program
  .name('cleancue')
  .description('Open-source, offline-first DJ library management toolkit')
  .version('0.1.0');

// Scan command
program
  .command('scan')
  .description('Scan directories for audio files')
  .argument('<paths...>', 'Directories to scan')
  .option('-r, --recursive', 'Scan recursively (default: true)')
  .option('--config <path>', 'Path to config file')
  .action(async (paths: string[], options) => {
    const spinner = ora('Initializing CleanCue...').start();
    
    try {
      const engine = new CleanCueEngine(options.config);
      
      spinner.text = 'Starting library scan...';
      
      // Set up progress tracking
      engine.on('scan:progress', (data: any) => {
        const percentage = Math.round((data.current / data.total) * 100);
        spinner.text = `Scanning: ${data.current}/${data.total} (${percentage}%) - ${path.basename(data.currentFile)}`;
      });
      
      const result = await engine.scanLibrary(paths);
      
      spinner.stop();
      
      console.log(chalk.green('\n✅ Scan completed!'));
      console.log(`📁 Files scanned: ${result.tracksScanned}`);
      console.log(`➕ New tracks: ${chalk.green(result.tracksAdded)}`);
      console.log(`🔄 Updated tracks: ${chalk.yellow(result.tracksUpdated)}`);
      
      if (result.errors.length > 0) {
        console.log(`❌ Errors: ${chalk.red(result.errors.length)}`);
        result.errors.forEach(error => {
          console.log(chalk.red(`  • ${error.path}: ${error.error}`));
        });
      }
      
      engine.close();
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('❌ Scan failed:'), (error as Error).message);
      process.exit(1);
    }
  });

// Stats command  
program
  .command('stats')
  .description('Show library statistics')
  .option('--config <path>', 'Path to config file')
  .action(async (options) => {
    const spinner = ora('Loading library...').start();
    
    try {
      const engine = new CleanCueEngine(options.config);
      const tracks = await engine.getAllTracks();
      
      spinner.stop();
      
      console.log(chalk.green('\n📊 Library Statistics'));
      console.log(`🎵 Total tracks: ${tracks.length}`);
      
      if (tracks.length === 0) {
        console.log('No tracks found. Run "cleancue scan <directory>" first.');
        engine.close();
        return;
      }
      
      // Duration stats
      const durations = tracks
        .filter(t => t.durationMs)
        .map(t => t.durationMs!);
      
      if (durations.length > 0) {
        const totalMs = durations.reduce((sum, d) => sum + d, 0);
        const avgMs = totalMs / durations.length;
        
        console.log(`⏱️  Total duration: ${formatDuration(totalMs)}`);
        console.log(`📈 Average duration: ${formatDuration(avgMs)}`);
      }
      
      // Format breakdown
      const formats = tracks.reduce((acc, track) => {
        const ext = track.extension || 'unknown';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      console.log('\n🎧 Format breakdown:');
      Object.entries(formats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([format, count]) => {
          const percentage = ((count / tracks.length) * 100).toFixed(1);
          console.log(`  ${format}: ${count} (${percentage}%)`);
        });
      
      // Analysis completion
      const analyzedTracks = [];
      for (const track of tracks) {
        const analyses = await engine.getAnalysesByTrack(track.id);
        if (analyses.some(a => a.status === 'completed')) {
          analyzedTracks.push(track);
        }
      }
      
      console.log(`\n🧮 Analyzed tracks: ${analyzedTracks.length}/${tracks.length} (${((analyzedTracks.length / tracks.length) * 100).toFixed(1)}%)`);
      
      engine.close();
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('❌ Failed to load statistics:'), (error as Error).message);
      process.exit(1);
    }
  });

// Utility functions
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('❌ Unhandled error:'), error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Goodbye!'));
  process.exit(0);
});

program.parse();
EOF

echo "Fixed CLI with simplified commands"
echo "Rebuilding..."
pnpm build
