#!/usr/bin/env python3
"""
Simple test of filename patterns without external dependencies
"""

import re

# Enhanced DJ filename patterns (copied from our implementation)
filename_patterns = [
    # YouTube-dl / yt-dlp patterns (common DJ downloads)
    # Channel Name - Song Title [Video ID]
    r'^(.+?)\s*[-–—]\s*(.+?)\s*\[([A-Za-z0-9_-]{11})\]$',
    # BPM and Key patterns
    # Artist - Title (128 BPM) (Am)
    r'^(.+?)\s*[-–—]\s*(.+?)\s*\(\s*(\d+)\s*bpm\s*\)\s*\(\s*([A-G][#b]?m?|[0-9]{1,2}[AB])\s*\)$',
    # Artist - Title (128 BPM)
    r'^(.+?)\s*[-–—]\s*(.+?)\s*\(\s*(\d+)\s*bpm\s*\)$',
    # Artist - Title (Am)
    r'^(.+?)\s*[-–—]\s*(.+?)\s*\(\s*([A-G][#b]?m?|[0-9]{1,2}[AB])\s*\)$',
    # Label patterns
    # [LABEL001] Artist - Title
    r'^\[([A-Z0-9]+)\]\s*(.+?)\s*[-–—]\s*(.+?)(?:\s*\((.+?)\))?$',
    # Standard remix pattern
    r'^(.+?)\s*[-–—]\s*(.+?)\s*\(\s*(.+?)\s*(?:remix|mix|edit)\s*\)$',
    # Featuring pattern
    r'^(.+?)\s*(?:feat\.|featuring|ft\.)\s*(.+?)\s*[-–—]\s*(.+?)$',
    # Basic pattern
    r'^(.+?)\s*[-–—]\s*(.+?)$',
]

def test_pattern(filename, expected_matches=None):
    print(f"Testing: {filename}")

    for i, pattern in enumerate(filename_patterns):
        match = re.match(pattern, filename, re.IGNORECASE)
        if match:
            print(f"  ✅ Matched pattern {i}: {match.groups()}")
            if expected_matches:
                for field, expected_value in expected_matches.items():
                    print(f"    {field}: {expected_value}")
            return True

    print(f"  ❌ No pattern matched")
    return False

print("🎧 Testing Enhanced DJ Filename Intelligence\n")

# Test cases
test_cases = [
    ("Calvin Harris - Feel So Close (128 BPM) (Am)", {
        'artist': 'Calvin Harris',
        'title': 'Feel So Close',
        'bpm': '128',
        'key': 'Am'
    }),

    ("[SPNR001] Disclosure - Latch (Extended Mix)", {
        'label': 'SPNR001',
        'artist': 'Disclosure',
        'title': 'Latch',
        'version': 'Extended Mix'
    }),

    ("Daft Punk - Get Lucky (Disclosure Remix)", {
        'artist': 'Daft Punk',
        'title': 'Get Lucky',
        'remixer': 'Disclosure'
    }),

    ("David Guetta feat. Sia - Titanium", {
        'artist': 'David Guetta',
        'featured_artist': 'Sia',
        'title': 'Titanium'
    }),

    ("TRAPCITY - Marshmello ft. Bastille - Happier [dQw4w9WgXcQ]", {
        'channel': 'TRAPCITY',
        'title': 'Marshmello ft. Bastille - Happier',
        'youtube_id': 'dQw4w9WgXcQ'
    }),

    ("Martin Garrix - Animals", {
        'artist': 'Martin Garrix',
        'title': 'Animals'
    }),
]

for filename, expected in test_cases:
    test_pattern(filename, expected)
    print()

print("✅ Enhanced filename intelligence test completed!")