#!/usr/bin/env python3
"""
Tag writing worker for CleanCue
Writes BPM, key, and energy data to audio file metadata tags
"""

import argparse
import json
import sys
import os
import traceback
from typing import Dict, Any, Optional
from pathlib import Path

try:
    import mutagen
    from mutagen.id3 import ID3, ID3NoHeaderError, TBPM, TKEY, COMM
    from mutagen.mp3 import MP3
    from mutagen.flac import FLAC
    from mutagen.mp4 import MP4
    from mutagen.oggvorbis import OggVorbis
    from mutagen.wave import WAVE
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install mutagen")
    sys.exit(1)

class AudioTagWriter:
    def __init__(self):
        self.supported_formats = ['.mp3', '.flac', '.m4a', '.mp4', '.ogg', '.wav']

    def write_tags(self, audio_path: str, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Write BPM, key, and energy tags to audio file."""

        try:
            print("PROGRESS:10")

            file_path = Path(audio_path)
            if not file_path.exists():
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            file_extension = file_path.suffix.lower()
            if file_extension not in self.supported_formats:
                raise ValueError(f"Unsupported file format: {file_extension}")

            print("PROGRESS:30")

            # Load the audio file
            audio_file = mutagen.File(audio_path)
            if audio_file is None:
                raise ValueError(f"Could not load audio file: {audio_path}")

            print("PROGRESS:50")

            # Write tags based on file format
            if isinstance(audio_file, MP3):
                result = self.write_id3_tags(audio_file, tag_data, audio_path)
            elif isinstance(audio_file, FLAC):
                result = self.write_vorbis_tags(audio_file, tag_data)
            elif isinstance(audio_file, MP4):
                result = self.write_mp4_tags(audio_file, tag_data)
            elif isinstance(audio_file, OggVorbis):
                result = self.write_vorbis_tags(audio_file, tag_data)
            else:
                raise ValueError(f"Tag writing not supported for this file type: {type(audio_file)}")

            print("PROGRESS:80")

            # Save the file
            audio_file.save()

            print("PROGRESS:100")

            return {
                'success': True,
                'file_path': str(file_path),
                'file_format': file_extension,
                'tags_written': result.get('tags_written', []),
                'tags_updated': result.get('tags_updated', []),
                'analyzer': 'tag_writer',
                'analyzer_version': '1.0.0'
            }

        except Exception as e:
            raise RuntimeError(f"Tag writing failed: {str(e)}")

    def write_id3_tags(self, audio_file: MP3, tag_data: Dict[str, Any], audio_path: str) -> Dict[str, Any]:
        """Write tags to MP3 file using ID3."""

        # Ensure ID3 tags exist
        try:
            audio_file.tags
        except AttributeError:
            audio_file.add_tags()

        tags_written = []
        tags_updated = []

        # Write BPM
        if 'bpm' in tag_data and tag_data['bpm'] is not None:
            bpm_value = str(int(tag_data['bpm']))
            if 'TBPM' in audio_file.tags:
                tags_updated.append('TBPM')
            else:
                tags_written.append('TBPM')
            audio_file.tags['TBPM'] = TBPM(encoding=3, text=bpm_value)

        # Write Key
        if 'key' in tag_data and tag_data['key'] is not None:
            key_value = str(tag_data['key'])
            if 'TKEY' in audio_file.tags:
                tags_updated.append('TKEY')
            else:
                tags_written.append('TKEY')
            audio_file.tags['TKEY'] = TKEY(encoding=3, text=key_value)

        # Write Energy as a comment (ID3 doesn't have a standard energy field)
        if 'energy' in tag_data and tag_data['energy'] is not None:
            energy_value = str(int(tag_data['energy']))
            # Use COMM frame for energy
            energy_comment = f"Energy: {energy_value}"

            # Check if energy comment already exists
            existing_energy = False
            if 'COMM::eng' in audio_file.tags:
                existing_text = str(audio_file.tags['COMM::eng'].text[0])
                if 'Energy:' in existing_text:
                    existing_energy = True
                    tags_updated.append('COMM:Energy')
                else:
                    tags_written.append('COMM:Energy')
            else:
                tags_written.append('COMM:Energy')

            audio_file.tags['COMM::eng'] = COMM(
                encoding=3,
                lang='eng',
                desc='CleanCue Energy',
                text=energy_comment
            )

        return {
            'tags_written': tags_written,
            'tags_updated': tags_updated
        }

    def write_vorbis_tags(self, audio_file, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Write tags to FLAC/OGG file using Vorbis comments."""

        tags_written = []
        tags_updated = []

        # Write BPM
        if 'bpm' in tag_data and tag_data['bpm'] is not None:
            bpm_value = str(int(tag_data['bpm']))
            if 'BPM' in audio_file:
                tags_updated.append('BPM')
            else:
                tags_written.append('BPM')
            audio_file['BPM'] = bpm_value

        # Write Key
        if 'key' in tag_data and tag_data['key'] is not None:
            key_value = str(tag_data['key'])
            if 'KEY' in audio_file:
                tags_updated.append('KEY')
            else:
                tags_written.append('KEY')
            audio_file['KEY'] = key_value

        # Write Energy (custom field)
        if 'energy' in tag_data and tag_data['energy'] is not None:
            energy_value = str(int(tag_data['energy']))
            if 'ENERGY' in audio_file:
                tags_updated.append('ENERGY')
            else:
                tags_written.append('ENERGY')
            audio_file['ENERGY'] = energy_value

        return {
            'tags_written': tags_written,
            'tags_updated': tags_updated
        }

    def write_mp4_tags(self, audio_file: MP4, tag_data: Dict[str, Any]) -> Dict[str, Any]:
        """Write tags to MP4/M4A file."""

        tags_written = []
        tags_updated = []

        # Write BPM (MP4 uses a specific atom for BPM)
        if 'bpm' in tag_data and tag_data['bpm'] is not None:
            bpm_value = int(tag_data['bpm'])
            if 'tmpo' in audio_file:
                tags_updated.append('tmpo')
            else:
                tags_written.append('tmpo')
            audio_file['tmpo'] = [bpm_value]

        # Write Key (use a custom field since MP4 doesn't have standard key field)
        if 'key' in tag_data and tag_data['key'] is not None:
            key_value = str(tag_data['key'])
            if '----:com.apple.iTunes:KEY' in audio_file:
                tags_updated.append('KEY')
            else:
                tags_written.append('KEY')
            audio_file['----:com.apple.iTunes:KEY'] = [key_value.encode('utf-8')]

        # Write Energy (custom field)
        if 'energy' in tag_data and tag_data['energy'] is not None:
            energy_value = str(int(tag_data['energy']))
            if '----:com.apple.iTunes:ENERGY' in audio_file:
                tags_updated.append('ENERGY')
            else:
                tags_written.append('ENERGY')
            audio_file['----:com.apple.iTunes:ENERGY'] = [energy_value.encode('utf-8')]

        return {
            'tags_written': tags_written,
            'tags_updated': tags_updated
        }

def main():
    parser = argparse.ArgumentParser(description='Audio tag writing worker')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--tag-data', required=True, help='JSON tag data to write')
    parser.add_argument('--job-id', required=True, help='Job ID for tracking')

    args = parser.parse_args()

    try:
        tag_data = json.loads(args.tag_data)
        writer = AudioTagWriter()
        result = writer.write_tags(args.audio_path, tag_data)

        # Output result in expected format
        print(f"RESULT:{json.dumps(result)}")

    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()