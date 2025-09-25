import { CleanCueEngine } from '@cleancue/simple-engine';
import { Command } from '../types.js';

export class StatsCommand implements Command {
  name = 'stats';
  description = 'Show comprehensive library statistics';
  usage = 'stats';

  async execute(args: string[], engine?: CleanCueEngine): Promise<void> {
    if (!engine) {
      throw new Error('Engine not initialized');
    }
    const tracks = await engine.getAllTracks();
    const trackCount = tracks.length;

    if (trackCount === 0) {
      console.log('📭 No tracks found. Run "cleancue scan <path>" to add music files.');
      return;
    }

    // Count analyzed tracks
    const tempoAnalyzed = tracks.filter(t => t.bpm).length;
    const keyAnalyzed = tracks.filter(t => t.key).length;
    const energyAnalyzed = tracks.filter(t => t.energy !== undefined).length;

    // Calculate file size stats
    const totalSize = tracks.reduce((sum, t) => sum + t.size, 0);
    const avgSize = trackCount > 0 ? totalSize / trackCount : 0;

    // Duration stats (convert seconds to milliseconds for display consistency)
    const durations = tracks.filter(t => t.duration).map(t => t.duration! * 1000);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0;

    console.log('📊 Library Statistics:');
    console.log(`   Total tracks: ${trackCount.toLocaleString()}`);
    console.log(`   Total size: ${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`   Average file size: ${(avgSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Total duration: ${Math.round(totalDuration / (1000 * 60)).toLocaleString()} minutes`);
    console.log(`   Average duration: ${Math.round(avgDuration / 1000)} seconds`);
    console.log('');
    console.log('🔬 Analysis Progress:');
    console.log(`   BPM/Tempo analyzed: ${tempoAnalyzed}/${trackCount} (${Math.round(tempoAnalyzed/trackCount*100)}%)`);
    console.log(`   Key analyzed: ${keyAnalyzed}/${trackCount} (${Math.round(keyAnalyzed/trackCount*100)}%)`);
    console.log(`   Energy analyzed: ${energyAnalyzed}/${trackCount} (${Math.round(energyAnalyzed/trackCount*100)}%)`);
  }
}