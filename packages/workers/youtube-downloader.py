#!/usr/bin/env python3
"""
YouTube Downloader using yt-dlp
Provides functionality to download audio from YouTube videos and playlists
"""

import json
import sys
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any
import re
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YouTubeDownloader:
    def __init__(self, output_dir: str = None):
        """Initialize YouTube downloader with output directory"""
        self.output_dir = output_dir or os.path.join(os.path.expanduser("~"), "Downloads", "CleanCue")
        self.ytdlp_path = None  # Store the working yt-dlp path
        self.ensure_output_dir()
        self.check_ytdlp_installed()

    def ensure_output_dir(self):
        """Create output directory if it doesn't exist"""
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)

    def check_ytdlp_installed(self) -> bool:
        """Check if yt-dlp is installed"""
        # Common paths where yt-dlp might be installed
        possible_paths = [
            'yt-dlp',  # Try PATH first
            '/usr/local/bin/yt-dlp',  # Homebrew on macOS
            '/opt/homebrew/bin/yt-dlp',  # Homebrew on M1 Macs
            '/usr/bin/yt-dlp',  # System install on Linux
        ]

        for ytdlp_path in possible_paths:
            try:
                result = subprocess.run([ytdlp_path, '--version'],
                                      capture_output=True, text=True, check=True)
                logger.info(f"yt-dlp found at {ytdlp_path}, version: {result.stdout.strip()}")
                self.ytdlp_path = ytdlp_path  # Store the working path
                return True
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        logger.error("yt-dlp is not installed or not available in any expected location")
        return False

    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Get information about a YouTube video without downloading"""
        try:
            cmd = [
                self.ytdlp_path or 'yt-dlp',
                '--dump-json',
                '--no-download',
                url
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            # yt-dlp returns one JSON object per line for playlists
            info_list = []
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    info_list.append(json.loads(line))

            if len(info_list) == 1:
                return info_list[0]
            else:
                # Return playlist info
                return {
                    'playlist': True,
                    'entries': info_list,
                    'title': info_list[0].get('playlist_title', 'Unknown Playlist'),
                    'uploader': info_list[0].get('uploader', 'Unknown'),
                    'entry_count': len(info_list)
                }

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to get video info: {e.stderr}")
            raise Exception(f"Failed to get video info: {e.stderr}")

    def download_audio(self, url: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Download audio from YouTube URL"""
        if options is None:
            options = {}

        # Default options
        quality = options.get('quality', 'best')
        format_type = options.get('format', 'mp3')
        output_template = options.get('output_template', '%(uploader)s - %(title)s.%(ext)s')

        # Sanitize output template
        output_path = os.path.join(self.output_dir, output_template)

        cmd = [
            'yt-dlp',
            '--extract-audio',
            '--audio-format', format_type,
            '--audio-quality', str(quality),
            '--output', output_path,
            '--no-playlist' if not options.get('download_playlist', False) else '--yes-playlist',
            '--ignore-errors',
            '--no-warnings' if not options.get('verbose', False) else '--verbose',
            url
        ]

        # Add additional options
        if options.get('embed_metadata', True):
            cmd.extend(['--embed-metadata', '--add-metadata'])

        if options.get('embed_thumbnail', False):
            cmd.append('--embed-thumbnail')

        try:
            # Run download
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            # Parse output to find downloaded files
            downloaded_files = self._parse_download_output(result.stdout)

            return {
                'success': True,
                'downloaded_files': downloaded_files,
                'output_dir': self.output_dir,
                'stdout': result.stdout,
                'stderr': result.stderr
            }

        except subprocess.CalledProcessError as e:
            logger.error(f"Download failed: {e.stderr}")
            return {
                'success': False,
                'error': e.stderr,
                'stdout': e.stdout if hasattr(e, 'stdout') else '',
                'stderr': e.stderr if hasattr(e, 'stderr') else str(e)
            }

    def _parse_download_output(self, output: str) -> List[str]:
        """Parse yt-dlp output to find downloaded files"""
        downloaded_files = []

        # Look for lines indicating successful downloads
        for line in output.split('\n'):
            if '[download] Destination:' in line:
                # Extract file path from download line
                match = re.search(r'\[download\] Destination: (.+)', line)
                if match:
                    downloaded_files.append(match.group(1))
            elif '[ffmpeg] Destination:' in line:
                # Extract final file path after conversion
                match = re.search(r'\[ffmpeg\] Destination: (.+)', line)
                if match:
                    downloaded_files.append(match.group(1))

        return downloaded_files

    def search_youtube(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search YouTube and return video information"""
        try:
            cmd = [
                self.ytdlp_path or 'yt-dlp',
                '--dump-json',
                '--no-download',
                '--flat-playlist',
                f'ytsearch{max_results}:{query}'
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            search_results = []
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    info = json.loads(line)
                    search_results.append({
                        'id': info.get('id'),
                        'title': info.get('title'),
                        'uploader': info.get('uploader'),
                        'duration': info.get('duration'),
                        'view_count': info.get('view_count'),
                        'url': f"https://www.youtube.com/watch?v={info.get('id')}"
                    })

            return search_results

        except subprocess.CalledProcessError as e:
            logger.error(f"Search failed: {e.stderr}")
            raise Exception(f"Search failed: {e.stderr}")

def main():
    """CLI interface for YouTube downloader"""
    if len(sys.argv) < 2:
        print("Usage: python youtube-downloader.py <command> [args...]")
        print("Commands:")
        print("  info <url>              - Get video information")
        print("  download <url> [opts]   - Download audio")
        print("  search <query>          - Search YouTube")
        sys.exit(1)

    command = sys.argv[1]
    downloader = YouTubeDownloader()

    try:
        if command == "info":
            if len(sys.argv) < 3:
                print("Usage: python youtube-downloader.py info <url>")
                sys.exit(1)

            url = sys.argv[2]
            info = downloader.get_video_info(url)
            print(json.dumps(info, indent=2))

        elif command == "download":
            if len(sys.argv) < 3:
                print("Usage: python youtube-downloader.py download <url> [options_json]")
                sys.exit(1)

            url = sys.argv[2]
            options = {}

            if len(sys.argv) >= 4:
                options = json.loads(sys.argv[3])

            result = downloader.download_audio(url, options)
            print(json.dumps(result, indent=2))

        elif command == "search":
            if len(sys.argv) < 3:
                print("Usage: python youtube-downloader.py search <query>")
                sys.exit(1)

            query = sys.argv[2]
            max_results = int(sys.argv[3]) if len(sys.argv) >= 4 else 10

            results = downloader.search_youtube(query, max_results)
            print(json.dumps(results, indent=2))

        else:
            print(f"Unknown command: {command}")
            sys.exit(1)

    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()