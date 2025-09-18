#!/usr/bin/env python3
"""
Energy analysis worker for CleanCue
Calculates RMS energy, spectral features, and dynamic characteristics
"""

import argparse
import json
import sys
import traceback
from typing import Dict, Any, List

try:
    import librosa
    import numpy as np
    from scipy import signal
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install librosa numpy scipy")
    sys.exit(1)

def analyze_energy(audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze energy, volume, clipping, and spectral characteristics of an audio file."""

    # Default parameters
    hop_length = parameters.get('hop_length', 512)
    frame_length = parameters.get('frame_length', 2048)
    window_size = parameters.get('window_size', 4096)  # For spectral analysis
    clipping_threshold = parameters.get('clipping_threshold', 0.99)  # Threshold for clipping detection

    try:
        print("PROGRESS:10")

        # Load audio file (preserve original dynamic range)
        y, sr = librosa.load(audio_path, sr=None, mono=False)

        # Handle stereo vs mono
        if y.ndim > 1:
            y_mono = librosa.to_mono(y)
            y_stereo = y
            is_stereo = True
        else:
            y_mono = y
            y_stereo = None
            is_stereo = False

        duration = len(y_mono) / sr
        print("PROGRESS:15")

        # === VOLUME ANALYSIS ===
        # Peak amplitude analysis
        peak_amplitude = float(np.max(np.abs(y_mono)))
        peak_db = float(20 * np.log10(peak_amplitude + 1e-10))

        # RMS level analysis
        rms_level = float(np.sqrt(np.mean(y_mono**2)))
        rms_db = float(20 * np.log10(rms_level + 1e-10))

        # LUFS (Loudness Units relative to Full Scale) approximation
        # This is a simplified version - proper LUFS requires K-weighting
        lufs_approx = rms_db - 23.0  # Rough approximation

        print("PROGRESS:25")

        # === CLIPPING DETECTION ===
        # Detect samples that exceed the clipping threshold
        clipped_samples = np.abs(y_mono) >= clipping_threshold
        clipping_percentage = float(np.sum(clipped_samples) / len(y_mono) * 100)

        # Find clipping events (consecutive clipped samples)
        clipping_events = []
        if np.any(clipped_samples):
            # Find start and end of clipping regions
            clipping_diff = np.diff(np.concatenate(([False], clipped_samples, [False])).astype(int))
            clipping_starts = np.where(clipping_diff == 1)[0]
            clipping_ends = np.where(clipping_diff == -1)[0]

            for start, end in zip(clipping_starts, clipping_ends):
                start_time = float(start / sr)
                end_time = float(end / sr)
                duration_ms = float((end - start) / sr * 1000)

                # Only report significant clipping events (>1ms)
                if duration_ms > 1.0:
                    clipping_events.append({
                        'start_time': start_time,
                        'end_time': end_time,
                        'duration_ms': duration_ms
                    })

        print("PROGRESS:35")
        
        # Calculate RMS energy over time (use mono for consistency)
        rms = librosa.feature.rms(
            y=y_mono,
            frame_length=frame_length,
            hop_length=hop_length
        )[0]
        
        # Convert to time-based energy curve
        times = librosa.frames_to_time(
            np.arange(len(rms)), 
            sr=sr, 
            hop_length=hop_length
        )
        
        print("PROGRESS:40")
        
        # Calculate spectral centroid (brightness/timbre)
        spectral_centroids = librosa.feature.spectral_centroid(
            y=y_mono, sr=sr, hop_length=hop_length
        )[0]

        # Calculate zero crossing rate (percussiveness)
        zcr = librosa.feature.zero_crossing_rate(
            y_mono, frame_length=frame_length, hop_length=hop_length
        )[0]
        
        print("PROGRESS:60")
        
        # Calculate spectral rolloff (frequency content distribution)
        spectral_rolloff = librosa.feature.spectral_rolloff(
            y=y_mono, sr=sr, hop_length=hop_length
        )[0]

        # Calculate MFCCs for timbral analysis
        mfccs = librosa.feature.mfcc(
            y=y_mono, sr=sr, n_mfcc=13, hop_length=hop_length
        )
        
        print("PROGRESS:80")
        
        # Energy statistics
        energy_stats = {
            'mean': float(np.mean(rms)),
            'std': float(np.std(rms)),
            'min': float(np.min(rms)),
            'max': float(np.max(rms)),
            'median': float(np.median(rms)),
            'dynamic_range_db': float(20 * np.log10(np.max(rms) / (np.min(rms) + 1e-10)))
        }
        
        # Detect energy peaks (potential drops/breakdowns)
        peaks, _ = signal.find_peaks(
            rms, 
            height=np.mean(rms) + 0.5 * np.std(rms),
            distance=int(sr * 4 / hop_length)  # Minimum 4 seconds between peaks
        )
        
        energy_peaks = [
            {
                'time': float(times[peak]),
                'energy': float(rms[peak])
            }
            for peak in peaks
        ]
        
        # Detect energy drops (potential breakdowns)
        valleys, _ = signal.find_peaks(
            -rms,
            height=-(np.mean(rms) - 0.5 * np.std(rms)),
            distance=int(sr * 8 / hop_length)  # Minimum 8 seconds between valleys
        )
        
        energy_valleys = [
            {
                'time': float(times[valley]),
                'energy': float(rms[valley])
            }
            for valley in valleys
        ]
        
        # Calculate overall energy characteristics
        spectral_stats = {
            'brightness_mean': float(np.mean(spectral_centroids)),
            'brightness_std': float(np.std(spectral_centroids)),
            'percussiveness_mean': float(np.mean(zcr)),
            'percussiveness_std': float(np.std(zcr)),
            'rolloff_mean': float(np.mean(spectral_rolloff)),
            'rolloff_std': float(np.std(spectral_rolloff))
        }
        
        # MFCC statistics for timbral characteristics
        mfcc_stats = {}
        for i in range(mfccs.shape[0]):
            mfcc_stats[f'mfcc_{i+1}_mean'] = float(np.mean(mfccs[i]))
            mfcc_stats[f'mfcc_{i+1}_std'] = float(np.std(mfccs[i]))
        
        # Segment the track into energy zones for cue detection
        segment_duration = 10.0  # 10-second segments
        num_segments = int(duration / segment_duration)
        
        energy_segments = []
        for i in range(num_segments):
            start_idx = int(i * segment_duration * sr / hop_length)
            end_idx = int((i + 1) * segment_duration * sr / hop_length)
            
            if end_idx <= len(rms):
                segment_energy = np.mean(rms[start_idx:end_idx])
                energy_segments.append({
                    'start_time': float(i * segment_duration),
                    'end_time': float((i + 1) * segment_duration),
                    'energy': float(segment_energy)
                })
        
        print("PROGRESS:100")
        
        return {
            'duration': duration,
            'is_stereo': is_stereo,

            # Volume analysis
            'volume': {
                'peak_amplitude': peak_amplitude,
                'peak_db': peak_db,
                'rms_level': rms_level,
                'rms_db': rms_db,
                'lufs_approx': lufs_approx,
                'dynamic_range_db': energy_stats['dynamic_range_db']
            },

            # Clipping analysis
            'clipping': {
                'percentage': clipping_percentage,
                'has_clipping': clipping_percentage > 0.0,
                'severity': 'high' if clipping_percentage > 1.0 else 'medium' if clipping_percentage > 0.1 else 'low' if clipping_percentage > 0.0 else 'none',
                'events': clipping_events[:20],  # Limit to 20 events
                'event_count': len(clipping_events)
            },

            # Energy analysis
            'energy_stats': energy_stats,
            'spectral_stats': spectral_stats,
            'mfcc_stats': mfcc_stats,
            'energy_peaks': energy_peaks[:10],  # Top 10 peaks
            'energy_valleys': energy_valleys[:5],  # Top 5 valleys
            'energy_segments': energy_segments,
            'energy_curve': {
                'times': [float(t) for t in times[::10]],  # Downsample for storage
                'values': [float(v) for v in rms[::10]]
            },

            # Metadata
            'sample_rate': sr,
            'analyzer': 'librosa_energy_volume_clipping',
            'analyzer_version': librosa.__version__
        }
        
    except Exception as e:
        raise RuntimeError(f"Energy analysis failed: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Energy analysis worker')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--parameters', required=True, help='JSON parameters')
    parser.add_argument('--job-id', required=True, help='Job ID for tracking')
    
    args = parser.parse_args()
    
    try:
        parameters = json.loads(args.parameters)
        result = analyze_energy(args.audio_path, parameters)
        
        # Output result in expected format
        print(f"RESULT:{json.dumps(result)}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
