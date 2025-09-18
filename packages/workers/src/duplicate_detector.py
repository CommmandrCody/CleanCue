#!/usr/bin/env python3
"""
Duplicate detection worker for CleanCue
Advanced duplicate detection using multiple strategies for DJ libraries
"""

import argparse
import json
import sys
import os
import hashlib
import re
import traceback
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

try:
    import Levenshtein
except ImportError:
    # Fallback to simple similarity if Levenshtein not available
    Levenshtein = None

class DuplicateDetector:
    def __init__(self):
        self.similarity_threshold = 0.85
        self.duration_tolerance_ms = 5000  # 5 seconds
        self.size_tolerance_ratio = 0.1    # 10%

    def find_duplicates(self, tracks: List[Dict[str, Any]], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Find duplicates using multiple detection strategies."""

        try:
            print("PROGRESS:10")

            # Parse parameters
            similarity_threshold = parameters.get('similarity_threshold', self.similarity_threshold)
            duration_tolerance = parameters.get('duration_tolerance_ms', self.duration_tolerance_ms)
            size_tolerance = parameters.get('size_tolerance_ratio', self.size_tolerance_ratio)

            print("PROGRESS:20")

            # Strategy 1: Exact hash matches (identical files)
            hash_duplicates = self.find_hash_duplicates(tracks)

            print("PROGRESS:40")

            # Strategy 2: Metadata similarity matches
            metadata_duplicates = self.find_metadata_duplicates(
                tracks, similarity_threshold, duration_tolerance
            )

            print("PROGRESS:60")

            # Strategy 3: File size and duration matches
            technical_duplicates = self.find_technical_duplicates(
                tracks, duration_tolerance, size_tolerance
            )

            print("PROGRESS:80")

            # Strategy 4: Audio fingerprint matches (if enabled)
            fingerprint_duplicates = self.find_fingerprint_duplicates(tracks, parameters)

            print("PROGRESS:90")

            # Combine and rank all duplicate matches
            all_duplicates = self.combine_duplicate_results(
                hash_duplicates, metadata_duplicates, technical_duplicates, fingerprint_duplicates
            )

            print("PROGRESS:100")

            return {
                'total_tracks': len(tracks),
                'duplicate_groups': len(all_duplicates),
                'total_duplicates': sum(len(group['tracks']) for group in all_duplicates),
                'duplicates': all_duplicates,
                'detection_strategies': {
                    'hash_matches': len(hash_duplicates),
                    'metadata_matches': len(metadata_duplicates),
                    'technical_matches': len(technical_duplicates),
                    'fingerprint_matches': len(fingerprint_duplicates)
                },
                'parameters_used': {
                    'similarity_threshold': similarity_threshold,
                    'duration_tolerance_ms': duration_tolerance,
                    'size_tolerance_ratio': size_tolerance
                },
                'analyzer': 'duplicate_detector',
                'analyzer_version': '1.0.0'
            }

        except Exception as e:
            raise RuntimeError(f"Duplicate detection failed: {str(e)}")

    def find_hash_duplicates(self, tracks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find exact duplicates using file hash."""
        hash_groups = {}

        for track in tracks:
            file_hash = track.get('hash') or track.get('file_hash')
            if file_hash:
                if file_hash not in hash_groups:
                    hash_groups[file_hash] = []
                hash_groups[file_hash].append(track)

        # Return groups with more than one track
        duplicates = []
        for file_hash, tracks_group in hash_groups.items():
            if len(tracks_group) > 1:
                duplicates.append({
                    'match_type': 'identical',
                    'confidence': 1.0,
                    'match_reason': 'Identical file hash',
                    'tracks': tracks_group,
                    'hash': file_hash
                })

        return duplicates

    def find_metadata_duplicates(self, tracks: List[Dict[str, Any]],
                                threshold: float, duration_tolerance: int) -> List[Dict[str, Any]]:
        """Find duplicates using metadata similarity."""
        duplicates = []

        for i, track1 in enumerate(tracks):
            for j, track2 in enumerate(tracks[i + 1:], i + 1):
                similarity = self.calculate_metadata_similarity(track1, track2)

                if similarity >= threshold:
                    # Additional checks for duration
                    duration_match = self.durations_match(
                        track1.get('duration_ms'), track2.get('duration_ms'), duration_tolerance
                    )

                    if duration_match or similarity > 0.95:
                        confidence = similarity
                        if duration_match:
                            confidence = min(1.0, confidence + 0.1)

                        duplicates.append({
                            'match_type': 'likely' if confidence > 0.9 else 'possible',
                            'confidence': confidence,
                            'match_reason': f'Metadata similarity: {similarity:.2f}',
                            'tracks': [track1, track2],
                            'similarity_details': self.get_similarity_details(track1, track2)
                        })

        return duplicates

    def find_technical_duplicates(self, tracks: List[Dict[str, Any]],
                                 duration_tolerance: int, size_tolerance: float) -> List[Dict[str, Any]]:
        """Find duplicates using technical properties (duration, file size, bitrate)."""
        duplicates = []

        for i, track1 in enumerate(tracks):
            for j, track2 in enumerate(tracks[i + 1:], i + 1):
                # Skip if already found as exact duplicates
                if track1.get('hash') == track2.get('hash'):
                    continue

                matches = []
                confidence = 0

                # Duration match
                if self.durations_match(track1.get('duration_ms'), track2.get('duration_ms'), duration_tolerance):
                    matches.append('duration')
                    confidence += 0.4

                # File size match
                if self.file_sizes_match(track1.get('size_bytes'), track2.get('size_bytes'), size_tolerance):
                    matches.append('file_size')
                    confidence += 0.3

                # Bitrate match
                if self.bitrates_match(track1.get('bitrate'), track2.get('bitrate')):
                    matches.append('bitrate')
                    confidence += 0.2

                # Sample rate match
                if track1.get('sample_rate') == track2.get('sample_rate') and track1.get('sample_rate'):
                    matches.append('sample_rate')
                    confidence += 0.1

                # Only consider as duplicate if multiple technical properties match
                if len(matches) >= 2 and confidence > 0.5:
                    duplicates.append({
                        'match_type': 'possible',
                        'confidence': min(0.9, confidence),  # Technical matches max out at 90%
                        'match_reason': f'Technical similarity: {", ".join(matches)}',
                        'tracks': [track1, track2],
                        'technical_matches': matches
                    })

        return duplicates

    def find_fingerprint_duplicates(self, tracks: List[Dict[str, Any]],
                                   parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find duplicates using audio fingerprinting (placeholder for future implementation)."""
        # This would integrate with audio fingerprinting libraries like chromaprint
        # For now, return empty list
        return []

    def calculate_metadata_similarity(self, track1: Dict[str, Any], track2: Dict[str, Any]) -> float:
        """Calculate similarity between two tracks based on metadata."""
        scores = []

        # Title similarity (most important)
        title1 = self.normalize_text(track1.get('title', ''))
        title2 = self.normalize_text(track2.get('title', ''))
        if title1 and title2:
            title_sim = self.text_similarity(title1, title2)
            scores.append(('title', title_sim, 0.4))

        # Artist similarity
        artist1 = self.normalize_text(track1.get('artist', ''))
        artist2 = self.normalize_text(track2.get('artist', ''))
        if artist1 and artist2:
            artist_sim = self.text_similarity(artist1, artist2)
            scores.append(('artist', artist_sim, 0.3))

        # Album similarity (less important for singles)
        album1 = self.normalize_text(track1.get('album', ''))
        album2 = self.normalize_text(track2.get('album', ''))
        if album1 and album2:
            album_sim = self.text_similarity(album1, album2)
            scores.append(('album', album_sim, 0.2))

        # Year similarity
        year1 = track1.get('year')
        year2 = track2.get('year')
        if year1 and year2:
            year_sim = 1.0 if year1 == year2 else 0.0
            scores.append(('year', year_sim, 0.1))

        # Calculate weighted average
        if not scores:
            return 0.0

        total_weight = sum(weight for _, _, weight in scores)
        weighted_sum = sum(similarity * weight for _, similarity, weight in scores)

        return weighted_sum / total_weight if total_weight > 0 else 0.0

    def get_similarity_details(self, track1: Dict[str, Any], track2: Dict[str, Any]) -> Dict[str, float]:
        """Get detailed similarity breakdown."""
        details = {}

        title1 = self.normalize_text(track1.get('title', ''))
        title2 = self.normalize_text(track2.get('title', ''))
        if title1 and title2:
            details['title_similarity'] = self.text_similarity(title1, title2)

        artist1 = self.normalize_text(track1.get('artist', ''))
        artist2 = self.normalize_text(track2.get('artist', ''))
        if artist1 and artist2:
            details['artist_similarity'] = self.text_similarity(artist1, artist2)

        return details

    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        if not text:
            return ''

        # Convert to lowercase
        normalized = text.lower()

        # Remove common DJ suffixes/prefixes
        normalized = re.sub(r'\s*\(.*?(remix|mix|edit|version|original|radio|extended|club|dub|instrumental)\).*?$', '', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r'\s*\[.*?(remix|mix|edit|version|original|radio|extended|club|dub|instrumental)\].*?$', '', normalized, flags=re.IGNORECASE)

        # Remove featuring artists for core comparison
        normalized = re.sub(r'\s*(feat\.|featuring|ft\.|with)\s+.+$', '', normalized, flags=re.IGNORECASE)

        # Remove extra whitespace and punctuation
        normalized = re.sub(r'[^\w\s]', ' ', normalized)
        normalized = re.sub(r'\s+', ' ', normalized)

        return normalized.strip()

    def text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings."""
        if not text1 or not text2:
            return 0.0

        if text1 == text2:
            return 1.0

        # Use Levenshtein distance if available
        if Levenshtein:
            ratio = Levenshtein.ratio(text1, text2)
            return ratio
        else:
            # Fallback to token-based similarity
            tokens1 = set(text1.split())
            tokens2 = set(text2.split())

            if not tokens1 and not tokens2:
                return 1.0
            if not tokens1 or not tokens2:
                return 0.0

            intersection = tokens1.intersection(tokens2)
            union = tokens1.union(tokens2)

            return len(intersection) / len(union)

    def durations_match(self, duration1: Optional[int], duration2: Optional[int], tolerance: int) -> bool:
        """Check if two durations match within tolerance."""
        if duration1 is None or duration2 is None:
            return False

        return abs(duration1 - duration2) <= tolerance

    def file_sizes_match(self, size1: Optional[int], size2: Optional[int], tolerance: float) -> bool:
        """Check if two file sizes match within tolerance ratio."""
        if size1 is None or size2 is None:
            return False

        if size1 == 0 or size2 == 0:
            return False

        ratio = abs(size1 - size2) / max(size1, size2)
        return ratio <= tolerance

    def bitrates_match(self, bitrate1: Optional[int], bitrate2: Optional[int]) -> bool:
        """Check if two bitrates match (with some tolerance for VBR)."""
        if bitrate1 is None or bitrate2 is None:
            return False

        # Allow 10% tolerance for VBR files
        tolerance = 0.1
        return abs(bitrate1 - bitrate2) / max(bitrate1, bitrate2) <= tolerance

    def combine_duplicate_results(self, *duplicate_lists) -> List[Dict[str, Any]]:
        """Combine duplicate results from different strategies."""
        # Flatten all duplicate matches
        all_matches = []
        for duplicate_list in duplicate_lists:
            all_matches.extend(duplicate_list)

        # Remove duplicates and merge overlapping groups
        unique_groups = []
        processed_tracks = set()

        for match in sorted(all_matches, key=lambda x: x['confidence'], reverse=True):
            track_ids = {track.get('id', track.get('path')) for track in match['tracks']}

            # Check if any track in this match is already processed
            if track_ids.intersection(processed_tracks):
                continue

            unique_groups.append(match)
            processed_tracks.update(track_ids)

        return unique_groups

def main():
    parser = argparse.ArgumentParser(description='Duplicate detection worker')
    parser.add_argument('--tracks-data', required=True, help='JSON array of track data')
    parser.add_argument('--parameters', required=True, help='JSON parameters')
    parser.add_argument('--job-id', required=True, help='Job ID for tracking')

    args = parser.parse_args()

    try:
        tracks = json.loads(args.tracks_data)
        parameters = json.loads(args.parameters)

        detector = DuplicateDetector()
        result = detector.find_duplicates(tracks, parameters)

        # Output result in expected format
        print(f"RESULT:{json.dumps(result)}")

    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()