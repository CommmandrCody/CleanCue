#!/usr/bin/env python3
"""
Test script for enhanced filename intelligence
Tests real DJ filename patterns
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'packages/workers/src'))

from metadata_worker import AdvancedMetadataExtractor

def test_filename_patterns():
    """Test various DJ filename patterns"""
    extractor = AdvancedMetadataExtractor()

    # Test cases: (filename, expected_fields)
    test_cases = [
        # YouTube-dl patterns
        ("Defected Records - Disclosure feat. Sam Smith - Omen (128 BPM) [dQw4w9WgXcQ]", {
            'artist': 'Disclosure',
            'featured_artist': 'Sam Smith',
            'title': 'Omen',
            'bpm': 128,
            'youtube_id': 'dQw4w9WgXcQ'
        }),

        # BPM and Key patterns
        ("Calvin Harris - Feel So Close (128 BPM) (Am)", {
            'artist': 'Calvin Harris',
            'title': 'Feel So Close',
            'bpm': 128,
            'key': 'Am'
        }),

        # Label patterns
        ("[SPNR001] Disclosure - Latch (Extended Mix)", {
            'label': 'SPNR001',
            'artist': 'Disclosure',
            'title': 'Latch',
            'version': 'Extended Mix'
        }),

        # Genre patterns
        ("[House] Martin Garrix - Animals", {
            'genre': 'House',
            'artist': 'Martin Garrix',
            'title': 'Animals'
        }),

        # Remix patterns
        ("Daft Punk - Get Lucky (Disclosure Remix)", {
            'artist': 'Daft Punk',
            'title': 'Get Lucky',
            'remixer': 'Disclosure'
        }),

        # Multiple remixers
        ("Avicii - Levels (Skrillex & Diplo Remix)", {
            'artist': 'Avicii',
            'title': 'Levels',
            'remixer': 'Skrillex & Diplo'
        }),

        # DJ version patterns
        ("Tiësto - Traffic (Radio Edit)", {
            'artist': 'Tiësto',
            'title': 'Traffic',
            'version': 'Radio Edit'
        }),

        # Year patterns
        ("Deadmau5 - Strobe (2024)", {
            'artist': 'Deadmau5',
            'title': 'Strobe',
            'year': 2024
        }),

        # Featuring patterns
        ("David Guetta feat. Sia - Titanium", {
            'artist': 'David Guetta',
            'featured_artist': 'Sia',
            'title': 'Titanium'
        }),

        # Track number patterns
        ("01. Swedish House Mafia - Don't You Worry Child", {
            'track_number': 1,
            'artist': 'Swedish House Mafia',
            'title': "Don't You Worry Child"
        }),
    ]

    print("🎧 Testing Enhanced DJ Filename Intelligence\n")

    for i, (filename, expected) in enumerate(test_cases, 1):
        print(f"Test {i}: {filename}")

        result = extractor.parse_filename(filename)

        # Check if all expected fields are present and correct
        success = True
        for key, expected_value in expected.items():
            actual_value = result.get(key)
            if actual_value != expected_value:
                print(f"  ❌ {key}: expected '{expected_value}', got '{actual_value}'")
                success = False

        if success:
            print(f"  ✅ Pattern matched successfully (confidence: {result.get('confidence', 0):.2f})")
        else:
            print(f"  📋 Full result: {result}")

        print()

    print("🎯 Testing YouTube-dl patterns specifically...")

    youtube_tests = [
        "TRAPCITY - Marshmello ft. Bastille - Happier [dQw4w9WgXcQ]",
        "Martin Garrix - Animals (Official Video)",
        "Skrillex - Bangarang (Spinnin' Records)",
        "deadmau5 - Strobe (Official Music Video)",
    ]

    for filename in youtube_tests:
        print(f"YouTube: {filename}")
        result = extractor.parse_filename(filename)
        print(f"  Artist: {result.get('artist')}")
        print(f"  Title: {result.get('title')}")
        print(f"  Confidence: {result.get('confidence', 0):.2f}")
        if result.get('youtube_id'):
            print(f"  YouTube ID: {result.get('youtube_id')}")
        print()

if __name__ == '__main__':
    test_filename_patterns()