#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Professional audio analysis using Essentia.js
async function analyzeWithEssentia(filePath) {
  try {
    // Import essentia.js dynamically
    const { Essentia, EssentiaWASM } = await import('essentia.js');

    // Initialize Essentia
    const essentia = new Essentia(EssentiaWASM);

    console.log('🎵 Loading audio file with Essentia...');

    // Load audio file
    const audioBuffer = fs.readFileSync(filePath);
    const audioData = await essentia.arrayFromAudioFile(audioBuffer);

    const sampleRate = audioData.sampleRate;
    const audio = audioData.channelData[0]; // Use mono channel

    console.log(`📊 Audio loaded: ${audio.length} samples at ${sampleRate}Hz`);

    // BPM Analysis
    console.log('🔍 Analyzing BPM...');
    const bpmResult = essentia.RhythmExtractor2013(audio, sampleRate, true);
    const bpm = Math.round(bpmResult.bpm);

    // Key Analysis
    console.log('🎼 Analyzing musical key...');
    const keyResult = essentia.KeyExtractor(audio, sampleRate, true);
    const key = keyResult.key;
    const scale = keyResult.scale;
    const strength = keyResult.strength;

    // Convert to full key notation
    const fullKey = `${key} ${scale}`;

    // Camelot wheel mapping
    const camelotMap = {
      'C major': '8B', 'G major': '9B', 'D major': '10B', 'A major': '11B',
      'E major': '12B', 'B major': '1B', 'F# major': '2B', 'C# major': '3B',
      'Ab major': '4B', 'Eb major': '5B', 'Bb major': '6B', 'F major': '7B',
      'A minor': '8A', 'E minor': '9A', 'B minor': '10A', 'F# minor': '11A',
      'C# minor': '12A', 'Ab minor': '1A', 'Eb minor': '2A', 'Bb minor': '3A',
      'F minor': '4A', 'C minor': '5A', 'G minor': '6A', 'D minor': '7A'
    };

    const camelotKey = camelotMap[fullKey] || '1A';

    // Energy Analysis
    console.log('⚡ Analyzing energy...');

    // Use spectral features for energy calculation
    const spectralCentroid = essentia.SpectralCentroidTime(audio);
    const spectralRolloff = essentia.SpectralRolloffTime(audio);
    const rms = essentia.RMS(audio);

    // Calculate energy based on multiple features (1-10 scale)
    const centroidNorm = Math.min(spectralCentroid.spectralCentroid / 4000, 1);
    const rolloffNorm = Math.min(spectralRolloff.spectralRolloff / 8000, 1);
    const rmsNorm = Math.min(rms.rms * 10, 1);

    const energyRaw = (centroidNorm + rolloffNorm + rmsNorm) / 3;
    const energy = Math.max(1, Math.min(10, Math.round(energyRaw * 9 + 1)));

    const result = {
      bpm: bpm,
      key: fullKey,
      camelot_key: camelotKey,
      energy: energy,
      confidence: strength,
      analysis_engine: 'essentia.js'
    };

    console.log(`🎵 Essentia analysis complete: BPM=${bpm}, Key=${fullKey} (${camelotKey}), Energy=${energy}`);
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error('❌ Essentia analysis failed:', error.message);

    // Return error result
    const errorResult = {
      error: `Essentia analysis failed: ${error.message}`,
      bpm: 120,
      key: 'Unknown',
      camelot_key: '1A',
      energy: 5,
      analysis_engine: 'essentia.js (failed)'
    };

    console.log(JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
}

// Command line usage
if (require.main === module) {
  if (process.argv.length < 3) {
    console.error('Usage: node essentia_analysis.js <audio_file>');
    process.exit(1);
  }

  const filePath = process.argv[2];

  analyzeWithEssentia(filePath)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { analyzeWithEssentia };