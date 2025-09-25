#!/usr/bin/env python3
"""
Audio Loudness Analysis using ffmpeg loudnorm filter
Follows EBU R128 standard for professional DJ workflow
"""
import sys
import json
import subprocess
import os

def analyze_loudness(file_path):
    """Analyze audio loudness using ffmpeg loudnorm filter"""
    try:
        # ffmpeg command for loudness analysis
        cmd = [
            'ffmpeg',
            '-i', file_path,
            '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
            '-f', 'null',
            '-'
        ]

        print(f"🔊 Analyzing loudness for: {os.path.basename(file_path)}")

        # Run ffmpeg and capture output
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        if result.returncode != 0:
            return {
                'error': f'ffmpeg failed: {result.stderr}',
                'lufs': -23.0,  # EBU R128 silence threshold
                'true_peak': -6.0,
                'lra': 0.0,
                'clipping': False
            }

        # Parse JSON output from stderr (ffmpeg outputs loudnorm JSON to stderr)
        stderr_lines = result.stderr.strip().split('\n')
        json_start = -1

        # Find the JSON block in stderr
        for i, line in enumerate(stderr_lines):
            if line.strip().startswith('{'):
                json_start = i
                break

        if json_start == -1:
            return {
                'error': 'No JSON output found in ffmpeg stderr',
                'lufs': -23.0,
                'true_peak': -6.0,
                'lra': 0.0,
                'clipping': False
            }

        # Extract JSON (might span multiple lines)
        json_lines = stderr_lines[json_start:]
        json_end = -1

        for i, line in enumerate(json_lines):
            if line.strip().endswith('}'):
                json_end = i + 1
                break

        if json_end == -1:
            json_end = len(json_lines)

        json_text = ''.join(json_lines[:json_end])

        try:
            loudness_data = json.loads(json_text)
        except json.JSONDecodeError as e:
            return {
                'error': f'Failed to parse JSON: {e}',
                'lufs': -23.0,
                'true_peak': -6.0,
                'lra': 0.0,
                'clipping': False
            }

        # Extract values
        input_lufs = float(loudness_data.get('input_i', -23.0))
        input_tp = float(loudness_data.get('input_tp', -6.0))
        input_lra = float(loudness_data.get('input_lra', 0.0))

        # Detect clipping (true peak >= 0 dBFS)
        clipping = input_tp >= 0.0

        # Calculate gain needed to reach -14 LUFS (DJ standard)
        target_lufs = -14.0
        gain_needed = target_lufs - input_lufs

        result = {
            'lufs': round(input_lufs, 1),
            'true_peak': round(input_tp, 1),
            'lra': round(input_lra, 1),
            'clipping': clipping,
            'gain_needed': round(gain_needed, 1),
            'target_lufs': target_lufs,
            'analysis_engine': 'ffmpeg_loudnorm'
        }

        print(f"📊 LUFS: {result['lufs']} | Peak: {result['true_peak']} dBFS | LRA: {result['lra']} | Clipping: {clipping}")
        print(f"🎛️ Gain needed for -14 LUFS: {gain_needed:+.1f} dB")

        return result

    except Exception as e:
        return {
            'error': str(e),
            'lufs': -23.0,
            'true_peak': -6.0,
            'lra': 0.0,
            'clipping': False,
            'gain_needed': 0.0,
            'target_lufs': -14.0,
            'analysis_engine': 'ffmpeg_loudnorm (failed)'
        }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 loudness_analysis.py <audio_file>")
        sys.exit(1)

    result = analyze_loudness(sys.argv[1])
    print(json.dumps(result, indent=2))