#!/usr/bin/env python3
"""
Export Mode Audio Normalization using ffmpeg
Creates normalized copies while preserving originals
"""
import sys
import json
import subprocess
import os
import shutil
from pathlib import Path

def normalize_export(file_path, loudness_data, output_dir="/Users/wagner/Music/CleanCue Normalized"):
    """Create normalized copy of audio file"""
    try:
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Generate output filename
        input_file = Path(file_path)
        output_file = Path(output_dir) / f"{input_file.stem} (Norm){input_file.suffix}"

        print(f"🔄 Creating normalized copy:")
        print(f"   📁 Input:  {input_file.name}")
        print(f"   📁 Output: {output_file.name}")

        # Get normalization parameters
        target_lufs = -14.0
        target_tp = -1.5
        target_lra = 11.0

        # Build ffmpeg command for normalization
        cmd = [
            'ffmpeg',
            '-i', str(file_path),
            '-af', f'loudnorm=I={target_lufs}:TP={target_tp}:LRA={target_lra}',
            '-y',  # Overwrite output file
            str(output_file)
        ]

        print(f"🎛️ Normalizing to -14 LUFS...")

        # Run ffmpeg normalization
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        if result.returncode != 0:
            return {
                'success': False,
                'error': f'ffmpeg normalization failed: {result.stderr}',
                'method': 'export_mode'
            }

        # Verify output file was created
        if not output_file.exists():
            return {
                'success': False,
                'error': 'Normalized file was not created',
                'method': 'export_mode'
            }

        # Add metadata to normalized file using mutagen
        try:
            from mutagen import File
            from mutagen.id3 import TXXX

            audio_file = File(str(output_file))
            if audio_file is not None:
                # Initialize tags if needed
                if not hasattr(audio_file, 'tags') or audio_file.tags is None:
                    audio_file.add_tags()

                # Add CleanCue metadata
                metadata_tags = {
                    'CLEANCUE_NORMALIZED': 'TRUE',
                    'CLEANCUE_TARGET_LUFS': str(target_lufs),
                    'CLEANCUE_ORIGINAL_LUFS': str(loudness_data.get('lufs', 'unknown')),
                    'CLEANCUE_ORIGINAL_PEAK': str(loudness_data.get('true_peak', 'unknown')),
                    'CLEANCUE_METHOD': 'export_mode'
                }

                for key, value in metadata_tags.items():
                    try:
                        if hasattr(audio_file.tags, 'add') and 'ID3' in str(type(audio_file.tags)):
                            # ID3 tags (MP3)
                            audio_file.tags.add(TXXX(encoding=3, desc=key, text=[value]))
                        else:
                            # Generic tags
                            audio_file.tags[key] = value
                    except Exception:
                        # Fallback
                        audio_file.tags[key] = value

                audio_file.save()

        except Exception as meta_error:
            print(f"⚠️ Warning: Could not add metadata to normalized file: {meta_error}")

        # Get file sizes
        input_size = input_file.stat().st_size
        output_size = output_file.stat().st_size

        print(f"✅ Normalization complete!")
        print(f"   📊 Target: -14 LUFS")
        print(f"   💾 Size: {input_size:,} → {output_size:,} bytes")
        print(f"   📂 Saved: {output_file}")

        return {
            'success': True,
            'input_file': str(file_path),
            'output_file': str(output_file),
            'target_lufs': target_lufs,
            'original_lufs': loudness_data.get('lufs'),
            'file_size_change': output_size - input_size,
            'method': 'export_mode'
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'method': 'export_mode'
        }

def normalize_with_limiter(file_path, loudness_data, output_dir="/Users/wagner/Music/CleanCue Normalized"):
    """Create normalized copy with additional limiting for hot tracks"""
    try:
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Generate output filename
        input_file = Path(file_path)
        output_file = Path(output_dir) / f"{input_file.stem} (Norm+Limit){input_file.suffix}"

        print(f"🔄 Creating normalized copy with limiter:")
        print(f"   📁 Input:  {input_file.name}")
        print(f"   📁 Output: {output_file.name}")

        # Two-pass approach: normalize then limit
        temp_file = Path(output_dir) / f"temp_{input_file.stem}{input_file.suffix}"

        # Pass 1: Loudness normalization
        cmd1 = [
            'ffmpeg',
            '-i', str(file_path),
            '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
            '-y',
            str(temp_file)
        ]

        # Pass 2: Additional limiting
        cmd2 = [
            'ffmpeg',
            '-i', str(temp_file),
            '-af', 'alimiter=limit=-1dB',
            '-y',
            str(output_file)
        ]

        print(f"🎛️ Pass 1: Loudness normalization...")
        result1 = subprocess.run(cmd1, capture_output=True, text=True)

        if result1.returncode != 0:
            return {
                'success': False,
                'error': f'Pass 1 failed: {result1.stderr}',
                'method': 'export_with_limiter'
            }

        print(f"🎛️ Pass 2: Peak limiting...")
        result2 = subprocess.run(cmd2, capture_output=True, text=True)

        if result2.returncode != 0:
            # Clean up temp file
            if temp_file.exists():
                temp_file.unlink()
            return {
                'success': False,
                'error': f'Pass 2 failed: {result2.stderr}',
                'method': 'export_with_limiter'
            }

        # Clean up temp file
        if temp_file.exists():
            temp_file.unlink()

        print(f"✅ Normalized with limiter complete!")

        return {
            'success': True,
            'input_file': str(file_path),
            'output_file': str(output_file),
            'method': 'export_with_limiter'
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'method': 'export_with_limiter'
        }

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 normalize_export.py <audio_file> <loudness_json> [output_dir] [--with-limiter]")
        sys.exit(1)

    file_path = sys.argv[1]
    loudness_json = sys.argv[2]
    output_dir = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else "/Users/wagner/Music/CleanCue Normalized"
    use_limiter = '--with-limiter' in sys.argv

    try:
        # Parse loudness data
        if os.path.isfile(loudness_json):
            with open(loudness_json, 'r') as f:
                loudness_data = json.load(f)
        else:
            loudness_data = json.loads(loudness_json)

        if use_limiter:
            result = normalize_with_limiter(file_path, loudness_data, output_dir)
        else:
            result = normalize_export(file_path, loudness_data, output_dir)

        print(json.dumps(result, indent=2))

    except Exception as e:
        result = {
            'success': False,
            'error': f'Failed to process: {e}',
            'method': 'export_mode'
        }
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()