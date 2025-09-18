# CleanCue CLI User Guide

The CleanCue CLI provides a command-line interface for managing and analyzing your music library. It offers powerful features for scanning, analysis, and library management without the need for a graphical interface.

## Installation

The CLI is available as part of the CleanCue workspace. After building the project:

```bash
cd /path/to/cleancue/packages/cli
npm run build
```

You can then run the CLI using:
```bash
./bin/cleancue <command>
```

## Quick Start

1. **Scan your music library:**
   ```bash
   cleancue scan ~/Music/DJ\ Collection
   ```

2. **Analyze tracks for BPM and key:**
   ```bash
   cleancue analyze all
   ```

3. **View library statistics:**
   ```bash
   cleancue stats
   ```

4. **List tracks in your library:**
   ```bash
   cleancue list 20
   ```

## Commands Reference

### `scan <path> [path2] [path3] ...`

Scans one or more directories for music files and adds them to your library.

**Usage:**
```bash
cleancue scan ~/Music/DJ\ Collection
cleancue scan ~/Music/House ~/Music/Techno ~/Music/Ambient
```

**Features:**
- Real-time progress reporting
- Metadata extraction (artist, title, album, etc.)
- Duplicate detection
- Error reporting for problematic files

**Supported Formats:**
- MP3, FLAC, WAV, M4A, OGG, and more

### `analyze [type]`

Analyzes tracks in your library for various audio characteristics.

**Types:**
- `all` - Runs all analysis types (default)
- `tempo` or `bpm` - BPM/tempo detection
- `key` - Musical key detection
- `energy` - Energy level analysis

**Usage:**
```bash
cleancue analyze all
cleancue analyze tempo
cleancue analyze key
cleancue analyze energy
```

**Features:**
- Uses librosa for accurate BPM detection
- Camelot wheel notation for key detection
- Progress reporting during analysis
- Batch processing for efficiency

### `list [limit]`

Lists tracks in your library with their metadata and analysis results.

**Usage:**
```bash
cleancue list           # Shows 20 tracks (default)
cleancue list 50        # Shows 50 tracks
```

**Output includes:**
- Track number
- Artist and title
- File path
- BPM (if analyzed)
- Musical key (if analyzed)
- Duration and file size

### `stats`

Shows comprehensive statistics about your music library.

**Usage:**
```bash
cleancue stats
```

**Information displayed:**
- Total track count
- Total library size (GB)
- Average file size
- Total and average duration
- Analysis progress (BPM, key, energy)
- Completion percentages

### `doctor`

Runs a health check to verify the CLI and engine are working correctly.

**Usage:**
```bash
cleancue doctor
```

**Checks:**
- Node.js availability
- TypeScript compilation
- CLI functionality
- Engine connectivity
- Database connection

### `info`

Displays information about CleanCue and its features.

**Usage:**
```bash
cleancue info
```

### `help`

Shows help information and command usage.

**Usage:**
```bash
cleancue help
cleancue --help
cleancue -h
```

## Advanced Usage

### Scanning Multiple Libraries

You can scan multiple directories in a single command:

```bash
cleancue scan ~/Music/House ~/Music/Techno ~/Music/Breakbeat
```

### Progressive Analysis

For large libraries, you can run analysis in stages:

```bash
# First scan the library
cleancue scan ~/Music/DJ\ Collection

# Analyze BPM first (fastest)
cleancue analyze tempo

# Then analyze keys
cleancue analyze key

# Finally analyze energy levels
cleancue analyze energy
```

### Monitoring Progress

All long-running operations show real-time progress:

```
🔍 Starting scan of 1 path(s)...
📂 Scanning: 45% (1,250/2,780) - track.mp3
✅ Scan complete: 150 added, 45 updated, 2 errors
```

### Error Handling

The CLI provides detailed error reporting:

```
❌ Errors encountered:
   /path/to/corrupted.mp3: Invalid MP3 header
   /path/to/locked.flac: Permission denied
   ... and 3 more errors
```

## Output Formats

### List Command Output

```
🎵 Showing 5 tracks:

  1. Artist Name - Track Title
     /path/to/file.mp3 • 128 BPM • Am • 245s • 8.2MB
  2. Another Artist - Another Track
     /path/to/file2.flac • 140 BPM • F# • 198s • 24.1MB
```

### Stats Command Output

```
📊 Library Statistics:
   Total tracks: 2,847
   Total size: 45.32 GB
   Average file size: 16.85 MB
   Total duration: 7,240 minutes
   Average duration: 153 seconds

🔬 Analysis Progress:
   BPM/Tempo analyzed: 2,847/2,847 (100%)
   Key analyzed: 2,401/2,847 (84%)
   Energy analyzed: 1,823/2,847 (64%)
```

## Tips and Best Practices

### Performance Optimization

1. **Scan incrementally:** For very large collections, scan subfolder by subfolder
2. **Run analysis overnight:** BPM and key analysis can be time-consuming
3. **Use SSD storage:** Database performance benefits significantly from SSD storage

### Library Organization

1. **Consistent folder structure:** Organize by genre or artist for easier management
2. **Clean metadata:** Ensure your files have proper ID3 tags before scanning
3. **Regular health checks:** Run `cleancue doctor` periodically

### Troubleshooting

1. **Permission errors:** Ensure the CLI has read access to your music folders
2. **Database issues:** The SQLite database is stored in your user directory
3. **Analysis problems:** Some files may have unusual characteristics that prevent analysis

## Integration with Desktop App

The CLI and desktop application share the same database, so:

- Tracks scanned via CLI appear in the desktop app
- Analysis performed in either interface is available in both
- Library management can be done from either interface

## Version Information

CleanCue CLI v0.2.0 - Professional DJ Library Management

Features:
• Fast library scanning with metadata extraction
• BPM detection using librosa
• Musical key detection with Camelot wheel notation
• Volume analysis and clipping detection
• Energy analysis for DJ cue point generation
• Export to M3U and other DJ software formats

For support and documentation, visit: https://github.com/CommmandrCody/CleanCue