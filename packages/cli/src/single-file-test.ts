#!/usr/bin/env node

/**
 * Single File Testing Example
 *
 * This demonstrates how the modular CLI design makes it incredibly easy
 * to test individual audio files with specific commands.
 */

import { CLIInterface } from './cli-interface.js';
import { ScanCommand } from './commands/scan.js';
import { AnalyzeCommand } from './commands/analyze.js';
import { StatsCommand } from './commands/stats.js';
import path from 'path';

class SingleFileTestRunner {
  private cliInterface: CLIInterface;

  constructor() {
    this.cliInterface = new CLIInterface();
  }

  /**
   * Test scanning a single directory containing one FLAC file
   */
  async testSingleFlacFile(filePath: string) {
    console.log(`\n🧪 Testing single FLAC file: ${path.basename(filePath)}`);
    console.log('=' .repeat(60));

    const directory = path.dirname(filePath);

    try {
      // 1. Scan the directory containing the file
      console.log(`\n📁 Step 1: Scanning directory ${directory}`);
      const scanResult = await this.cliInterface.scan([directory]);

      if (scanResult.success) {
        console.log('✅ Scan successful');
        console.log(scanResult.message);
      } else {
        console.error('❌ Scan failed:', scanResult.error);
        return;
      }

      // 2. Analyze the file for tempo
      console.log('\n🎵 Step 2: Analyzing tempo');
      const tempoResult = await this.cliInterface.analyze('tempo');

      if (tempoResult.success) {
        console.log('✅ Tempo analysis successful');
        console.log(tempoResult.message);
      } else {
        console.error('❌ Tempo analysis failed:', tempoResult.error);
      }

      // 3. Analyze the file for key
      console.log('\n🎹 Step 3: Analyzing musical key');
      const keyResult = await this.cliInterface.analyze('key');

      if (keyResult.success) {
        console.log('✅ Key analysis successful');
        console.log(keyResult.message);
      } else {
        console.error('❌ Key analysis failed:', keyResult.error);
      }

      // 4. Get library statistics
      console.log('\n📊 Step 4: Getting library statistics');
      const statsResult = await this.cliInterface.getStats();

      if (statsResult.success) {
        console.log('✅ Statistics retrieved');
        console.log(statsResult.message);
      } else {
        console.error('❌ Statistics failed:', statsResult.error);
      }

      console.log('\n🎉 Single file test completed successfully!');

    } catch (error) {
      console.error('\n💥 Test failed with error:', error);
    }
  }

  /**
   * Test individual command modules directly (bypass full CLI)
   */
  async testIndividualModules(directoryPath: string) {
    console.log(`\n🔧 Testing individual modules on directory: ${directoryPath}`);
    console.log('=' .repeat(60));

    // Create mock engine for isolated testing
    const mockEngine = {
      scanLibrary: async (paths: string[]) => ({
        tracksScanned: 1,
        tracksAdded: 1,
        tracksUpdated: 0,
        errors: []
      }),
      analyzeLibrary: async (analyzers: string[]) => {
        console.log(`Mock analysis: ${analyzers.join(', ')}`);
      },
      getAllTracks: () => [{
        id: '1',
        path: `${directoryPath}/test.flac`,
        filename: 'test.flac',
        artist: 'Test Artist',
        title: 'Test Track',
        sizeBytes: 50 * 1024 * 1024, // 50MB
        durationMs: 240000, // 4 minutes
        bpm: 128,
        key: 'C',
        energy: 0.8
      }]
    } as any;

    try {
      // Test individual commands in isolation
      console.log('\n📂 Testing ScanCommand module');
      const scanCommand = new ScanCommand();
      await scanCommand.execute([directoryPath], mockEngine);

      console.log('\n🎵 Testing AnalyzeCommand module');
      const analyzeCommand = new AnalyzeCommand();
      await analyzeCommand.execute(['tempo'], mockEngine);

      console.log('\n📊 Testing StatsCommand module');
      const statsCommand = new StatsCommand();
      await statsCommand.execute([], mockEngine);

      console.log('\n✅ All module tests completed successfully!');

    } catch (error) {
      console.error('\n❌ Module test failed:', error);
    }
  }

  /**
   * Demonstrate batch testing multiple files
   */
  async testBatchFiles(directories: string[]) {
    console.log(`\n📦 Batch testing ${directories.length} directories`);
    console.log('=' .repeat(60));

    for (const [index, dir] of directories.entries()) {
      console.log(`\n[${index + 1}/${directories.length}] Processing: ${dir}`);

      try {
        const result = await this.cliInterface.scan([dir]);
        if (result.success) {
          console.log(`  ✅ Success: ${dir}`);
        } else {
          console.log(`  ❌ Failed: ${dir} - ${result.error}`);
        }
      } catch (error) {
        console.log(`  💥 Error: ${dir} - ${error}`);
      }
    }

    console.log('\n🏁 Batch testing completed');
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SingleFileTestRunner();

  const command = process.argv[2];
  const argument = process.argv[3];

  switch (command) {
    case 'single':
      if (!argument) {
        console.log('Usage: node single-file-test.js single <path-to-flac-file>');
        process.exit(1);
      }
      runner.testSingleFlacFile(argument);
      break;

    case 'module':
      if (!argument) {
        console.log('Usage: node single-file-test.js module <directory-path>');
        process.exit(1);
      }
      runner.testIndividualModules(argument);
      break;

    case 'batch':
      const dirs = process.argv.slice(3);
      if (dirs.length === 0) {
        console.log('Usage: node single-file-test.js batch <dir1> <dir2> ...');
        process.exit(1);
      }
      runner.testBatchFiles(dirs);
      break;

    default:
      console.log(`
🧪 CleanCue CLI Single File Testing Tool

This demonstrates how the modular design makes individual file testing easy.

Usage:
  single <flac-file>     Test a single FLAC file end-to-end
  module <directory>     Test individual command modules
  batch <dir1> <dir2>    Test multiple directories in batch

Examples:
  node single-file-test.js single /music/test.flac
  node single-file-test.js module /music/electronic
  node single-file-test.js batch /music/house /music/techno
      `);
  }
}

export { SingleFileTestRunner };