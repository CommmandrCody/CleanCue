import { CleanCueEngine } from '@cleancue/simple-engine';
import { Command } from '../types.js';

export class ListCommand implements Command {
  name = 'list';
  description = 'List tracks in library with metadata';
  usage = 'list [limit] (default: 20)';

  async execute(args: string[], engine?: CleanCueEngine): Promise<void> {
    if (!engine) {
      throw new Error('Engine not initialized');
    }
    const limit = args[0] ? parseInt(args[0]) : 20;
    const allTracks = await engine.getAllTracks();
    const tracks = allTracks.slice(0, limit);

    if (tracks.length === 0) {
      console.log('📭 No tracks found. Run "cleancue scan <path>" to add music files.');
      return;
    }

    console.log(`🎵 Showing ${tracks.length} tracks:`);
    console.log('');

    tracks.forEach((track, index) => {
      const bpm = track.bpm ? ` • ${Math.round(track.bpm)} BPM` : '';
      const key = track.key ? ` • ${track.key}` : '';
      const duration = track.duration ? ` • ${Math.round(track.duration)}s` : '';
      const size = ` • ${(track.size/(1024*1024)).toFixed(1)}MB`;

      console.log(`${(index + 1).toString().padStart(3)}. ${track.artist || 'Unknown'} - ${track.title || track.filename}`);
      console.log(`     ${track.path}${bpm}${key}${duration}${size}`);
    });

    if (allTracks.length > limit) {
      console.log(`\n... and ${(allTracks.length - limit).toLocaleString()} more tracks`);
      console.log(`Use "cleancue list ${allTracks.length}" to see all tracks`);
    }
  }
}