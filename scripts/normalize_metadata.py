#!/usr/bin/env python3
"""
Metadata-Only Audio Normalization using ReplayGain tags
Non-destructive approach - writes tags without modifying audio data
"""
import sys
import json
import os
from mutagen import File
from mutagen.id3 import ID3NoHeaderError, TIT2, TXXX

def normalize_metadata_only(file_path, loudness_data):
    """Apply ReplayGain tags for non-destructive normalization"""
    try:
        print(f"📝 Writing ReplayGain tags to: {os.path.basename(file_path)}")

        # Load audio file with mutagen
        audio_file = File(file_path)
        if audio_file is None:
            return {
                'success': False,
                'error': f'Unsupported file format: {file_path}'
            }

        # Calculate ReplayGain values
        track_gain = loudness_data.get('gain_needed', 0.0)
        track_peak = loudness_data.get('true_peak', -6.0)
        lufs = loudness_data.get('lufs', -23.0)
        clipping = loudness_data.get('clipping', False)

        # Convert true peak to linear scale (0.0 to 1.0)
        peak_linear = 10 ** (track_peak / 20.0)

        # Tags to write (compatible with most formats)
        tags_to_write = {
            'REPLAYGAIN_TRACK_GAIN': f'{track_gain:+.2f} dB',
            'REPLAYGAIN_TRACK_PEAK': f'{peak_linear:.6f}',
            'CLEANCUE_LUFS': f'{lufs:.1f}',
            'CLEANCUE_CLIPPING': str(clipping).lower(),
            'CLEANCUE_TARGET_LUFS': '-14.0',
            'CLEANCUE_NORMALIZED': 'metadata_only'
        }

        # Handle different file formats
        if hasattr(audio_file, 'tags') and audio_file.tags is not None:
            # For formats that support standard tags
            for key, value in tags_to_write.items():
                if hasattr(audio_file.tags, '__setitem__'):
                    # Generic tag interface
                    audio_file.tags[key] = value
                elif hasattr(audio_file.tags, 'add'):
                    # ID3 interface (MP3)
                    try:
                        audio_file.tags.add(TXXX(encoding=3, desc=key, text=[value]))
                    except Exception:
                        # Fallback for other ID3 tags
                        audio_file.tags[key] = value
                else:
                    # Direct assignment
                    setattr(audio_file.tags, key, value)
        else:
            # Initialize tags if none exist
            audio_file.add_tags()
            for key, value in tags_to_write.items():
                audio_file.tags[key] = value

        # Save tags to file
        audio_file.save()

        print(f"✅ ReplayGain tags written successfully")
        print(f"   🎛️ Track Gain: {track_gain:+.2f} dB")
        print(f"   📊 LUFS: {lufs:.1f} → -14.0 (target)")
        print(f"   ⚡ Peak: {track_peak:.1f} dBFS")
        print(f"   ⚠️ Clipping: {'Yes' if clipping else 'No'}")

        return {
            'success': True,
            'tags_written': tags_to_write,
            'file_modified': False,  # Audio data unchanged
            'method': 'metadata_only'
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'method': 'metadata_only'
        }

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 normalize_metadata.py <audio_file> <loudness_json>")
        sys.exit(1)

    file_path = sys.argv[1]
    loudness_json = sys.argv[2]

    try:
        # Parse loudness data
        if os.path.isfile(loudness_json):
            with open(loudness_json, 'r') as f:
                loudness_data = json.load(f)
        else:
            loudness_data = json.loads(loudness_json)

        result = normalize_metadata_only(file_path, loudness_data)
        print(json.dumps(result, indent=2))

    except Exception as e:
        result = {
            'success': False,
            'error': f'Failed to process: {e}',
            'method': 'metadata_only'
        }
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()