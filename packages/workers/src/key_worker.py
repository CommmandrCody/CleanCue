#!/usr/bin/env python3
"""
Key detection worker for CleanCue
Uses librosa with chromagram analysis for key detection
"""

import argparse
import json
import sys
import traceback
from typing import Dict, Any

try:
    import librosa
    import numpy as np
    from scipy.stats import mode
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install librosa numpy scipy")
    sys.exit(1)

# Chromatic scale mapping
CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Camelot wheel mapping (for DJ mixing)
CAMELOT_WHEEL = {
    'C major': '8B', 'A minor': '8A',
    'G major': '9B', 'E minor': '9A', 
    'D major': '10B', 'B minor': '10A',
    'A major': '11B', 'F# minor': '11A',
    'E major': '12B', 'C# minor': '12A',
    'B major': '1B', 'G# minor': '1A',
    'F# major': '2B', 'D# minor': '2A',
    'C# major': '3B', 'A# minor': '3A',
    'G# major': '4B', 'F minor': '4A',
    'D# major': '5B', 'C minor': '5A',
    'A# major': '6B', 'G minor': '6A',
    'F major': '7B', 'D minor': '7A'
}

def analyze_key(audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze musical key of an audio file using chromagram analysis."""
    
    # Default parameters
    hop_length = parameters.get('hop_length', 512)
    n_chroma = parameters.get('n_chroma', 12)
    
    try:
        print("PROGRESS:10")
        
        # Load audio file
        y, sr = librosa.load(audio_path, sr=None)
        print("PROGRESS:30")
        
        # Compute chromagram
        chroma = librosa.feature.chroma_cqt(
            y=y, sr=sr, hop_length=hop_length, n_chroma=n_chroma
        )
        print("PROGRESS:60")
        
        # Average chromagram over time
        chroma_mean = np.mean(chroma, axis=1)
        
        # Major and minor key profiles (Krumhansl-Schmuckler)
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        # Normalize profiles
        major_profile = major_profile / np.sum(major_profile)
        minor_profile = minor_profile / np.sum(minor_profile)
        
        print("PROGRESS:80")
        
        # Calculate correlations for all 24 keys
        correlations = []
        keys = []
        
        for i in range(12):
            # Major key
            shifted_chroma = np.roll(chroma_mean, i)
            major_corr = np.corrcoef(shifted_chroma, major_profile)[0, 1]
            correlations.append(major_corr if not np.isnan(major_corr) else 0.0)
            keys.append(f"{CHROMATIC_SCALE[i]} major")
            
            # Minor key  
            minor_corr = np.corrcoef(shifted_chroma, minor_profile)[0, 1]
            correlations.append(minor_corr if not np.isnan(minor_corr) else 0.0)
            keys.append(f"{CHROMATIC_SCALE[i]} minor")
        
        # Find best match
        best_match_idx = np.argmax(correlations)
        detected_key = keys[best_match_idx]
        confidence = float(correlations[best_match_idx])
        
        # Get Camelot wheel notation
        camelot = CAMELOT_WHEEL.get(detected_key, 'Unknown')
        
        # Calculate key strength (how much the detected key stands out)
        correlations_sorted = sorted(correlations, reverse=True)
        key_strength = correlations_sorted[0] - correlations_sorted[1] if len(correlations_sorted) > 1 else 0.0
        
        print("PROGRESS:100")
        
        return {
            'key': detected_key,
            'camelot': camelot,
            'confidence': confidence,
            'key_strength': float(key_strength),
            'chroma_vector': [float(x) for x in chroma_mean],
            'all_correlations': {
                keys[i]: float(correlations[i]) 
                for i in range(len(keys))
            },
            'duration': float(len(y) / sr),
            'analyzer': 'librosa_chromagram',
            'analyzer_version': librosa.__version__
        }
        
    except Exception as e:
        raise RuntimeError(f"Key analysis failed: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Key analysis worker')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--parameters', required=True, help='JSON parameters')
    parser.add_argument('--job-id', required=True, help='Job ID for tracking')
    
    args = parser.parse_args()
    
    try:
        parameters = json.loads(args.parameters)
        result = analyze_key(args.audio_path, parameters)
        
        # Output result in expected format
        print(f"RESULT:{json.dumps(result)}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
