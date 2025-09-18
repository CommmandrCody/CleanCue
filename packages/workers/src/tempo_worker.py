#!/usr/bin/env python3
"""
Tempo analysis worker for CleanCue
Uses librosa for BPM detection
"""

import argparse
import json
import sys
import traceback
from typing import Dict, Any

try:
    import librosa
    import numpy as np
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install librosa numpy")
    sys.exit(1)

def analyze_tempo(audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze tempo/BPM of an audio file using librosa."""
    
    # Default parameters
    hop_length = parameters.get('hop_length', 512)
    start_bpm = parameters.get('start_bpm', 120)
    std_bpm = parameters.get('std_bpm', 4.0)
    
    try:
        print("PROGRESS:10")
        
        # Load audio file
        y, sr = librosa.load(audio_path, sr=None)
        print("PROGRESS:30")
        
        # Compute onset strength
        onset_envelope = librosa.onset.onset_strength(
            y=y, sr=sr, hop_length=hop_length
        )
        print("PROGRESS:60")
        
        # Estimate tempo
        tempo, beats = librosa.beat.beat_track(
            onset_envelope=onset_envelope,
            sr=sr,
            hop_length=hop_length,
            start_bpm=start_bpm
        )
        print("PROGRESS:80")
        
        # Calculate beat positions in seconds
        beat_times = librosa.times_like(onset_envelope, sr=sr, hop_length=hop_length)[beats]
        
        # Calculate tempo confidence (simplified)
        onset_strength_mean = np.mean(onset_envelope)
        onset_strength_std = np.std(onset_envelope)
        confidence = min(1.0, onset_strength_mean / (onset_strength_std + 1e-6))
        
        print("PROGRESS:100")
        
        return {
            'tempo': float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo),
            'confidence': float(confidence),
            'beats_count': len(beats),
            'first_beat_time': float(beat_times[0]) if len(beat_times) > 0 else 0.0,
            'beat_times': [float(t) for t in beat_times[:50]],  # First 50 beats
            'duration': float(len(y) / sr),
            'analyzer': 'librosa',
            'analyzer_version': librosa.__version__
        }
        
    except Exception as e:
        raise RuntimeError(f"Tempo analysis failed: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Tempo analysis worker')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--parameters', required=True, help='JSON parameters')
    parser.add_argument('--job-id', required=True, help='Job ID for tracking')
    
    args = parser.parse_args()
    
    try:
        parameters = json.loads(args.parameters)
        result = analyze_tempo(args.audio_path, parameters)
        
        # Output result in expected format
        print(f"RESULT:{json.dumps(result)}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
