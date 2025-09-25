import { promises as fs } from 'fs';
import { CleanCueEngine } from '@cleancue/simple-engine';
import { Command } from '../types.js';

export class ScanCommand implements Command {
  name = 'scan';
  description = 'Scan directories for music files';
  usage = 'scan <path1> [path2] [path3] ...';

  async execute(args: string[], engine?: CleanCueEngine): Promise<void> {
    if (!engine) {
      throw new Error('Engine not initialized');
    }

    if (args.length === 0) {
      throw new Error('Please provide path(s) to scan\nUsage: cleancue scan <path1> [path2] [path3] ...\nExample: cleancue scan ~/Music/DJ\\ Collection');
    }

    // Validate paths exist
    for (const scanPath of args) {
      const stat = await fs.stat(scanPath);
      if (!stat.isDirectory()) {
        throw new Error(`${scanPath} is not a directory`);
      }
    }

    const result = await engine.scanLibrary(args);

    console.log('\n📊 Scan Summary:');
    console.log(`   Total tracks scanned: ${result.tracksScanned}`);
    console.log(`   New tracks added: ${result.tracksAdded}`);
    console.log(`   Tracks updated: ${result.tracksUpdated}`);
    console.log(`   Errors: ${result.errors.length}`);
  }
}