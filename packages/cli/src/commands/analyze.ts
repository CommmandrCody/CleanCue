import { CleanCueEngine } from '@cleancue/simple-engine';
import { Command } from '../types.js';

export class AnalyzeCommand implements Command {
  name = 'analyze';
  description = 'Analyze tracks using professional algorithms';
  usage = 'analyze [type] (types: all, tempo, key, energy)';

  async execute(args: string[], engine?: CleanCueEngine): Promise<void> {
    if (!engine) {
      throw new Error('Engine not initialized');
    }
    const analysisType = args[0] || 'all';
    const validTypes = ['all', 'bpm', 'tempo', 'key', 'energy'];

    if (!validTypes.includes(analysisType)) {
      throw new Error(`Invalid analysis type '${analysisType}'\nValid types: ${validTypes.join(', ')}`);
    }

    console.log(`🔬 Starting ${analysisType} analysis...`);

    // Get all tracks for analysis
    const tracks = await engine.getAllTracks();

    if (tracks.length === 0) {
      console.log('📭 No tracks found. Run "cleancue scan <path>" to add music files.');
      return;
    }

    console.log(`Found ${tracks.length} tracks to analyze...`);

    let analyzed = 0;
    for (const track of tracks) {
      try {
        let needsAnalysis = false;

        // Determine what needs analysis based on type
        if (analysisType === 'all') {
          needsAnalysis = !track.bpm || !track.key || track.energy === undefined;
        } else if (analysisType === 'bpm' || analysisType === 'tempo') {
          needsAnalysis = !track.bpm;
        } else if (analysisType === 'key') {
          needsAnalysis = !track.key;
        } else if (analysisType === 'energy') {
          needsAnalysis = track.energy === undefined;
        }

        if (needsAnalysis) {
          console.log(`Analyzing: ${track.title || track.filename}`);

          // Perform appropriate analysis
          if (analysisType === 'all') {
            await engine.analyzeAll(track.id);
          } else if (analysisType === 'bpm' || analysisType === 'tempo') {
            await engine.analyzeBPM(track.id);
          } else if (analysisType === 'key') {
            await engine.analyzeKey(track.id);
          } else if (analysisType === 'energy') {
            await engine.analyzeEnergy(track.id);
          }

          analyzed++;
        }
      } catch (error) {
        console.log(`❌ Failed to analyze ${track.filename}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(`✅ Analysis complete! Analyzed ${analyzed} tracks.`);
  }
}