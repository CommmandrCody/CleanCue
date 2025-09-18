#!/usr/bin/env python3
"""
Advanced metadata extraction worker for CleanCue
Handles metadata extraction with multiple fallback strategies and filename parsing
"""

import argparse
import json
import sys
import os
import re
import traceback
from typing import Dict, Any, Optional, List
from pathlib import Path

try:
    import mutagen
    from mutagen.id3 import ID3NoHeaderError
    from mutagen.mp3 import MP3
    from mutagen.flac import FLAC
    from mutagen.mp4 import MP4
    from mutagen.oggvorbis import OggVorbis
    from mutagen.wave import WAVE
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install mutagen")
    sys.exit(1)

class AdvancedMetadataExtractor:
    def __init__(self):
        # Common DJ filename patterns
        self.filename_patterns = [
            # Artist - Title patterns
            r'^(.+?)\s*[-–—]\s*(.+?)(?:\s*\[(.+?)\])?(?:\s*\((.+?)\))?$',
            r'^(.+?)\s*_\s*(.+?)(?:_(.+?))?$',

            # Track number patterns
            r'^(\d+)\.?\s*(.+?)\s*[-–—]\s*(.+?)(?:\s*\((.+?)\))?$',

            # Remix patterns
            r'^(.+?)\s*[-–—]\s*(.+?)\s*\(\s*(.+?)\s*(?:remix|mix|edit|bootleg|mashup)\s*\)$',
            r'^(.+?)\s*[-–—]\s*(.+?)\s*\[\s*(.+?)\s*(?:remix|mix|edit)\s*\]$',

            # Label/catalog patterns
            r'^(?:\[(.+?)\])?\s*(.+?)\s*[-–—]\s*(.+?)(?:\s*\[(.+?)\])?$',

            # Featuring patterns
            r'^(.+?)\s*(?:feat\.|featuring|ft\.)\s*(.+?)\s*[-–—]\s*(.+?)$',
        ]

        # Genre normalization map
        self.genre_map = {
            'house': 'House',
            'tech house': 'Tech House',
            'techno': 'Techno',
            'trance': 'Trance',
            'progressive': 'Progressive',
            'drum and bass': 'Drum & Bass',
            'drum & bass': 'Drum & Bass',
            'dnb': 'Drum & Bass',
            'dubstep': 'Dubstep',
            'electro': 'Electro',
            'deep house': 'Deep House',
            'future house': 'Future House',
            'hip hop': 'Hip-Hop',
            'rap': 'Hip-Hop',
            'r&b': 'R&B',
            'rnb': 'R&B',
            'reggaeton': 'Reggaeton',
            'latin': 'Latin',
            'pop': 'Pop',
            'rock': 'Rock',
            'indie': 'Indie',
            'alternative': 'Alternative',
        }

        # Common version keywords
        self.version_keywords = [
            'original mix', 'radio edit', 'extended mix', 'club mix', 'dub mix',
            'instrumental', 'acapella', 'vocal mix', 'bonus track', 'edit',
            'remix', 'bootleg', 'mashup', 'rework', 'refix', 'vip'
        ]

    def extract_metadata(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Extract comprehensive metadata from audio file with filename parsing fallback."""

        try:
            print("PROGRESS:10")

            # Basic file info
            file_path = Path(audio_path)
            if not file_path.exists():
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            filename_without_ext = file_path.stem
            file_extension = file_path.suffix.lower()

            print("PROGRESS:20")

            # Extract metadata using mutagen
            tag_metadata = self.extract_tag_metadata(audio_path)

            print("PROGRESS:40")

            # Parse filename for additional metadata
            filename_metadata = self.parse_filename(filename_without_ext)

            print("PROGRESS:60")

            # Combine and enhance metadata
            combined_metadata = self.combine_metadata(tag_metadata, filename_metadata)

            print("PROGRESS:80")

            # Analyze metadata quality and issues
            quality_analysis = self.analyze_metadata_quality(combined_metadata, filename_metadata)

            print("PROGRESS:100")

            return {
                # Core metadata
                'title': combined_metadata.get('title'),
                'artist': combined_metadata.get('artist'),
                'album': combined_metadata.get('album'),
                'albumArtist': combined_metadata.get('albumartist'),
                'genre': combined_metadata.get('genre'),
                'year': combined_metadata.get('year'),
                'track_number': combined_metadata.get('tracknumber'),
                'disc_number': combined_metadata.get('discnumber'),
                'composer': combined_metadata.get('composer'),
                'comment': combined_metadata.get('comment'),

                # Technical metadata
                'duration_ms': combined_metadata.get('duration_ms'),
                'bitrate': combined_metadata.get('bitrate'),
                'sample_rate': combined_metadata.get('sample_rate'),
                'channels': combined_metadata.get('channels'),
                'file_format': combined_metadata.get('file_format'),

                # DJ-specific metadata
                'original_artist': combined_metadata.get('original_artist'),
                'remixer': combined_metadata.get('remixer'),
                'version': combined_metadata.get('version'),
                'label': combined_metadata.get('label'),
                'catalog_number': combined_metadata.get('catalog_number'),
                'mix_key': combined_metadata.get('key'),
                'bpm': combined_metadata.get('bpm'),

                # Filename analysis
                'filename_pattern': filename_metadata.get('pattern'),
                'filename_confidence': filename_metadata.get('confidence', 0),
                'suggested_title': filename_metadata.get('title'),
                'suggested_artist': filename_metadata.get('artist'),
                'suggested_remixer': filename_metadata.get('remixer'),

                # Quality analysis
                'metadata_quality': quality_analysis.get('quality'),
                'missing_fields': quality_analysis.get('missing_fields', []),
                'has_inconsistencies': quality_analysis.get('has_inconsistencies', False),
                'needs_cleanup': quality_analysis.get('needs_cleanup', False),
                'quality_score': quality_analysis.get('score', 0),

                # Source info
                'extraction_method': 'advanced_mutagen_filename',
                'filename': filename_without_ext,
                'file_extension': file_extension,
                'analyzer': 'metadata_worker',
                'analyzer_version': '1.0.0'
            }

        except Exception as e:
            raise RuntimeError(f"Metadata extraction failed: {str(e)}")

    def extract_tag_metadata(self, audio_path: str) -> Dict[str, Any]:
        """Extract metadata from audio file tags using mutagen."""

        try:
            # Load file with mutagen
            audio_file = mutagen.File(audio_path)

            if audio_file is None:
                return {}

            metadata = {}

            # Handle different file formats
            if isinstance(audio_file, MP3):
                metadata.update(self.extract_id3_metadata(audio_file))
            elif isinstance(audio_file, FLAC):
                metadata.update(self.extract_vorbis_metadata(audio_file))
            elif isinstance(audio_file, MP4):
                metadata.update(self.extract_mp4_metadata(audio_file))
            elif isinstance(audio_file, OggVorbis):
                metadata.update(self.extract_vorbis_metadata(audio_file))
            elif isinstance(audio_file, WAVE):
                metadata.update(self.extract_wave_metadata(audio_file))

            # Extract technical info
            if hasattr(audio_file, 'info'):
                info = audio_file.info
                metadata['duration_ms'] = int(info.length * 1000) if hasattr(info, 'length') else None
                metadata['bitrate'] = getattr(info, 'bitrate', None)
                metadata['sample_rate'] = getattr(info, 'sample_rate', None)
                metadata['channels'] = getattr(info, 'channels', None)

            metadata['file_format'] = audio_file.mime[0] if audio_file.mime else None

            return metadata

        except Exception as e:
            print(f"Warning: Could not extract tag metadata: {e}", file=sys.stderr)
            return {}

    def extract_id3_metadata(self, audio_file: MP3) -> Dict[str, Any]:
        """Extract metadata from ID3 tags."""
        metadata = {}

        tag_map = {
            'TIT2': 'title',      # Title
            'TPE1': 'artist',     # Artist
            'TALB': 'album',      # Album
            'TPE2': 'albumartist', # Album artist
            'TCON': 'genre',      # Genre
            'TDRC': 'year',       # Year
            'TRCK': 'tracknumber', # Track number
            'TPOS': 'discnumber',  # Disc number
            'TCOM': 'composer',   # Composer
            'COMM': 'comment',    # Comment
            'TPUB': 'label',      # Publisher/Label
            'TBPM': 'bpm',        # BPM
            'TKEY': 'key',        # Key
        }

        for tag_id, field_name in tag_map.items():
            if tag_id in audio_file:
                value = audio_file[tag_id].text[0] if audio_file[tag_id].text else None
                if value:
                    if field_name in ['year', 'tracknumber', 'discnumber', 'bpm']:
                        try:
                            metadata[field_name] = int(str(value).split('/')[0])
                        except (ValueError, IndexError):
                            pass
                    else:
                        metadata[field_name] = str(value).strip()

        return metadata

    def extract_vorbis_metadata(self, audio_file) -> Dict[str, Any]:
        """Extract metadata from Vorbis comments (FLAC, OGG)."""
        metadata = {}

        tag_map = {
            'TITLE': 'title',
            'ARTIST': 'artist',
            'ALBUM': 'album',
            'ALBUMARTIST': 'albumartist',
            'GENRE': 'genre',
            'DATE': 'year',
            'TRACKNUMBER': 'tracknumber',
            'DISCNUMBER': 'discnumber',
            'COMPOSER': 'composer',
            'COMMENT': 'comment',
            'LABEL': 'label',
            'BPM': 'bpm',
            'KEY': 'key',
        }

        for tag_name, field_name in tag_map.items():
            if tag_name in audio_file:
                value = audio_file[tag_name][0] if audio_file[tag_name] else None
                if value:
                    if field_name in ['year', 'tracknumber', 'discnumber', 'bpm']:
                        try:
                            metadata[field_name] = int(str(value).split('/')[0])
                        except (ValueError, IndexError):
                            pass
                    else:
                        metadata[field_name] = str(value).strip()

        return metadata

    def extract_mp4_metadata(self, audio_file: MP4) -> Dict[str, Any]:
        """Extract metadata from MP4/M4A tags."""
        metadata = {}

        tag_map = {
            '\xa9nam': 'title',
            '\xa9ART': 'artist',
            '\xa9alb': 'album',
            'aART': 'albumartist',
            '\xa9gen': 'genre',
            '\xa9day': 'year',
            'trkn': 'tracknumber',
            'disk': 'discnumber',
            '\xa9wrt': 'composer',
            '\xa9cmt': 'comment',
        }

        for tag_name, field_name in tag_map.items():
            if tag_name in audio_file:
                value = audio_file[tag_name][0] if audio_file[tag_name] else None
                if value:
                    if field_name == 'tracknumber' and isinstance(value, tuple):
                        metadata[field_name] = value[0]
                    elif field_name == 'discnumber' and isinstance(value, tuple):
                        metadata[field_name] = value[0]
                    elif field_name == 'year':
                        try:
                            metadata[field_name] = int(str(value)[:4])
                        except (ValueError, IndexError):
                            pass
                    else:
                        metadata[field_name] = str(value).strip()

        return metadata

    def extract_wave_metadata(self, audio_file: WAVE) -> Dict[str, Any]:
        """Extract metadata from WAVE files (limited)."""
        # WAVE files typically have limited metadata support
        return {}

    def parse_filename(self, filename: str) -> Dict[str, Any]:
        """Parse filename for artist, title, remix info using regex patterns."""

        # Clean filename
        cleaned = self.clean_filename(filename)

        # Try each pattern
        for i, pattern in enumerate(self.filename_patterns):
            match = re.match(pattern, cleaned, re.IGNORECASE)

            if match:
                groups = match.groups()
                confidence = self.calculate_pattern_confidence(match, i)

                result = {
                    'pattern': f'pattern_{i}',
                    'confidence': confidence,
                }

                # Extract based on pattern type
                if i == 0:  # Basic Artist - Title
                    result.update({
                        'artist': self.clean_string(groups[0]),
                        'title': self.clean_string(groups[1]),
                        'remixer': self.clean_string(groups[2]) if groups[2] else None,
                        'version': self.clean_string(groups[3]) if groups[3] else None,
                    })
                elif i == 2:  # Track number pattern
                    result.update({
                        'track_number': int(groups[0]) if groups[0] else None,
                        'artist': self.clean_string(groups[1]),
                        'title': self.clean_string(groups[2]),
                        'version': self.clean_string(groups[3]) if groups[3] else None,
                    })
                elif i in [3, 4]:  # Remix patterns
                    result.update({
                        'artist': self.clean_string(groups[0]),
                        'title': self.clean_string(groups[1]),
                        'remixer': self.clean_string(groups[2]),
                    })
                elif i == 6:  # Featuring pattern
                    result.update({
                        'artist': self.clean_string(groups[0]),
                        'featured_artist': self.clean_string(groups[1]),
                        'title': self.clean_string(groups[2]),
                    })
                else:  # Generic pattern
                    result.update({
                        'artist': self.clean_string(groups[0]) if groups[0] else None,
                        'title': self.clean_string(groups[1]) if groups[1] else None,
                    })

                return result

        # Fallback: simple split
        parts = cleaned.split(' - ')
        if len(parts) >= 2:
            return {
                'pattern': 'simple_split',
                'confidence': 0.3,
                'artist': self.clean_string(parts[0]),
                'title': self.clean_string(' - '.join(parts[1:])),
            }

        return {'pattern': 'no_match', 'confidence': 0}

    def clean_filename(self, filename: str) -> str:
        """Clean filename for better parsing."""
        # Remove common artifacts
        cleaned = filename
        cleaned = re.sub(r'\s+', ' ', cleaned)  # Multiple spaces to single
        cleaned = re.sub(r'[_]+', ' ', cleaned)  # Underscores to spaces
        cleaned = cleaned.strip()

        return cleaned

    def clean_string(self, text: str) -> str:
        """Clean and normalize text strings."""
        if not text:
            return text

        return text.strip().replace('_', ' ').replace('  ', ' ')

    def calculate_pattern_confidence(self, match, pattern_index: int) -> float:
        """Calculate confidence score for filename pattern match."""
        confidence = 0.7  # Base confidence

        # Higher confidence for more specific patterns
        if pattern_index <= 2:
            confidence += 0.2

        # Check for DJ-specific indicators
        text = match.group(0).lower()
        if any(keyword in text for keyword in ['remix', 'mix', 'edit', 'bootleg', 'mashup']):
            confidence += 0.1

        # Check part lengths
        groups = match.groups()
        if groups[0] and 2 < len(groups[0]) < 50:
            confidence += 0.05
        if len(groups) > 1 and groups[1] and 2 < len(groups[1]) < 100:
            confidence += 0.05

        return min(1.0, max(0.0, confidence))

    def combine_metadata(self, tag_metadata: Dict[str, Any], filename_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Combine tag metadata with filename-parsed metadata intelligently."""

        combined = tag_metadata.copy()

        # Use filename data as fallback for missing tag data
        if not combined.get('title') and filename_metadata.get('title'):
            combined['title'] = filename_metadata['title']

        if not combined.get('artist') and filename_metadata.get('artist'):
            combined['artist'] = filename_metadata['artist']

        # Add remix information from filename if not in tags
        if filename_metadata.get('remixer') and not combined.get('remixer'):
            combined['remixer'] = filename_metadata['remixer']
            combined['original_artist'] = combined.get('artist')

        # Extract version information
        title = combined.get('title', '')
        for keyword in self.version_keywords:
            if keyword.lower() in title.lower():
                combined['version'] = keyword.title()
                break

        # Normalize genre
        if combined.get('genre'):
            normalized_genre = self.genre_map.get(combined['genre'].lower())
            if normalized_genre:
                combined['genre'] = normalized_genre

        return combined

    def analyze_metadata_quality(self, metadata: Dict[str, Any], filename_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze metadata quality and identify issues."""

        essential_fields = ['title', 'artist']
        important_fields = ['album', 'genre', 'year']

        missing_fields = []
        for field in essential_fields + important_fields:
            if not metadata.get(field):
                missing_fields.append(field)

        # Calculate quality score
        total_fields = len(essential_fields) + len(important_fields)
        present_fields = total_fields - len(missing_fields)
        score = present_fields / total_fields

        # Determine quality level
        if len(missing_fields) == 0:
            quality = 'excellent'
        elif len(missing_fields) <= 2:
            quality = 'good'
        elif len(missing_fields) <= 4:
            quality = 'poor'
        else:
            quality = 'missing'

        # Check for inconsistencies
        has_inconsistencies = False
        if (metadata.get('title') and filename_metadata.get('title') and
            self.similarity_score(metadata['title'], filename_metadata['title']) < 0.5):
            has_inconsistencies = True

        # Check if cleanup is needed
        needs_cleanup = False
        for field in ['title', 'artist', 'album']:
            if metadata.get(field):
                text = metadata[field]
                if '  ' in text or '_' in text or re.search(r'[^\w\s\-\.\(\)\[\]&\']', text):
                    needs_cleanup = True
                    break

        return {
            'quality': quality,
            'score': score,
            'missing_fields': missing_fields,
            'has_inconsistencies': has_inconsistencies,
            'needs_cleanup': needs_cleanup,
        }

    def similarity_score(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings."""
        if not str1 or not str2:
            return 0.0

        s1 = str1.lower().strip()
        s2 = str2.lower().strip()

        if s1 == s2:
            return 1.0

        # Simple token-based similarity
        tokens1 = set(s1.split())
        tokens2 = set(s2.split())

        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)

        return len(intersection) / len(union) if union else 0.0

def main():
    parser = argparse.ArgumentParser(description='Advanced metadata extraction worker')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--parameters', required=True, help='JSON parameters')
    parser.add_argument('--job-id', required=True, help='Job ID for tracking')

    args = parser.parse_args()

    try:
        parameters = json.loads(args.parameters)
        extractor = AdvancedMetadataExtractor()
        result = extractor.extract_metadata(args.audio_path, parameters)

        # Output result in expected format
        print(f"RESULT:{json.dumps(result)}")

    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()