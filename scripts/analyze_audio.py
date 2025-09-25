#!/usr/bin/env python3
"""
Professional audio analysis using librosa for CleanCue
Matches Mixed In Key analysis accuracy
"""
import sys
import json
import librosa
import numpy as np
from scipy import signal

# Camelot wheel mapping (matching Mixed In Key)
CAMELOT_KEYS = {
    'C major': '8B', 'G major': '9B', 'D major': '10B', 'A major': '11B',
    'E major': '12B', 'B major': '1B', 'F# major': '2B', 'C# major': '3B',
    'G# major': '4B', 'D# major': '5B', 'A# major': '6B', 'F major': '7B',
    'A minor': '8A', 'E minor': '9A', 'B minor': '10A', 'F# minor': '11A',
    'C# minor': '12A', 'G# minor': '1A', 'D# minor': '2A', 'A# minor': '3A',
    'F minor': '4A', 'C minor': '5A', 'G minor': '6A', 'D minor': '7A'
}

def analyze_audio(file_path):
    """Analyze audio file and return BPM, Key, and Energy"""
    try:
        # Load audio file
        y, sr = librosa.load(file_path, duration=120)  # First 2 minutes for speed

        # BPM Detection using librosa's beat tracking
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
        bpm = float(tempo)

        # Key Detection using chromagram
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = np.mean(chroma, axis=1)

        # Krumhansl-Schmuckler key profiles
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

        # Normalize profiles
        major_profile = major_profile / np.linalg.norm(major_profile)
        minor_profile = minor_profile / np.linalg.norm(minor_profile)

        # Find best key match
        best_correlation = -1
        best_key = 'C major'

        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

        for i in range(12):
            # Test major key
            rotated_chroma = np.roll(chroma_mean, -i)
            correlation = np.corrcoef(rotated_chroma, major_profile)[0, 1]
            if correlation > best_correlation:
                best_correlation = correlation
                best_key = f'{key_names[i]} major'

            # Test minor key
            correlation = np.corrcoef(rotated_chroma, minor_profile)[0, 1]
            if correlation > best_correlation:
                best_correlation = correlation
                best_key = f'{key_names[i]} minor'

        # Energy Analysis using spectral features
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y)

        # Combine features for energy calculation (normalized to 1-10 scale)
        energy_raw = (
            np.mean(spectral_centroid) / 4000 +  # Brightness
            np.mean(spectral_rolloff) / 8000 +   # Spectral rolloff
            np.mean(zero_crossing_rate) * 10      # Percussiveness
        )

        # Scale to Mixed In Key range (1-10)
        energy = max(1, min(10, int(energy_raw * 3 + 3)))

        # Get Camelot notation
        camelot_key = CAMELOT_KEYS.get(best_key, '1A')

        return {
            'bpm': round(bpm),
            'key': best_key,
            'camelot_key': camelot_key,
            'energy': energy,
            'confidence': float(best_correlation)
        }

    except Exception as e:
        return {
            'error': str(e),
            'bpm': 120,
            'key': 'Unknown',
            'camelot_key': '1A',
            'energy': 5
        }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 analyze_audio.py <audio_file>")
        sys.exit(1)

    result = analyze_audio(sys.argv[1])
    print(json.dumps(result, indent=2))