# CleanCue Desktop User Guide

The CleanCue Desktop application provides a professional graphical interface for managing, analyzing, and preparing your music library for DJ performances. This comprehensive guide covers all features of the modern UI interface.

## Installation & First Launch

### System Requirements
- macOS 10.14+ (Mojave or later)
- Windows 10/11 (future releases)
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space for application
- Additional space for music library database

### First Launch Setup
1. **Download** the latest CleanCue installer from [releases](https://github.com/CommanderCody/CleanCue/releases)
2. **Install** by dragging to Applications folder (macOS) or running installer (Windows)
3. **Launch** CleanCue - the splash screen displays the beautiful gradient logo
4. **Initial Setup** - The app will create your library database automatically

## Quick Start Guide

### The 5-Step DJ Workflow

CleanCue is built around a professional DJ workflow: **Discover → Normalize → Analyze → Review → Export**

1. **Discover**: Import your music library
2. **Normalize**: Optimize audio levels for consistent playback
3. **Analyze**: Extract BPM, key, and energy data
4. **Review**: Examine results and make adjustments
5. **Export**: Prepare tracks for your DJ software

Let's walk through each step:

#### Step 1: Discover Your Music

**Scanning Your Library:**
1. Click the **"Scan Library"** button in the top toolbar
2. Select your music folder(s) using the folder picker
3. The scan dialog shows real-time progress:
   - Files scanned count
   - Current file being processed
   - Progress bar and percentage
   - Error count (if any)

**Drag & Drop Import:**
- Simply drag music files or folders directly into the CleanCue window
- The app will automatically start scanning dropped items

**Supported Formats:**
- **Lossless**: FLAC, WAV, AIFF
- **Compressed**: MP3, M4A, OGG
- **Professional**: 24-bit audio files

#### Step 2: Normalize Audio (New!)

**Accessing Normalization:**
1. Go to **Settings** → **DJ Workflow** tab
2. Enable **"Enable audio normalization"**
3. Choose your preset:
   - **DJ (-12 LUFS)**: Optimized for club playback
   - **Streaming (-14 LUFS)**: Perfect for Spotify/Apple Music
   - **Broadcast (-23 LUFS)**: EBU R128 standard
   - **Custom**: Set your own LUFS/peak targets

**Normalization Features:**
- **Automatic backup creation** - Keeps your originals safe
- **Multiple output formats** - WAV, FLAC, AIFF
- **Custom file suffixes** - "_normalized" by default
- **Auto-normalize on import** - Process new tracks automatically

#### Step 3: Analyze Your Tracks

**Starting Analysis:**
1. Select tracks in your library (or select all with Cmd/Ctrl+A)
2. Click **"Analyze"** in the top toolbar
3. Choose analysis types:
   - **BPM/Tempo**: Beat detection using librosa
   - **Key**: Musical key with Camelot wheel notation
   - **Energy**: Danceability and intensity analysis

**Analysis Progress:**
- Real-time progress bars for each analysis type
- Background processing - continue using the app
- Automatic tag writing to audio files (if enabled)
- Error reporting for problematic files

#### Step 4: Review Your Library

**Library View Features:**
- **Wide column layout** optimized for readability
- **Sortable columns** for all metadata fields
- **Search and filter** capabilities
- **Batch selection** for multiple operations

**Column Information:**
- **Track**: Artist - Title with album art (if enabled)
- **BPM**: Detected tempo in beats per minute
- **Key**: Musical key in Camelot notation (e.g., 8A, 5B)
- **Energy**: Danceability score (0-100 scale)
- **Duration**: Track length in minutes:seconds
- **File Info**: Format, bitrate, file size

#### Step 5: Export for DJ Software

**Export Options:**
- **M3U Playlists**: Standard playlist format
- **Rekordbox XML**: For Pioneer DJ software
- **Serato Crates**: For Serato DJ software
- **Traktor NML**: For Native Instruments Traktor

## Interface Overview

### Header Bar
- **CleanCue Logo**: Two-tone branding (Clean in white, Cue in darker tone)
- **Scan Library**: Import new music files
- **Analyze**: Process selected tracks
- **Settings**: Configure application preferences
- **Health Dashboard**: System status overview

### Main Library View
- **Track List**: Your music collection with metadata
- **Column Headers**: Click to sort by any field
- **Selection**: Click rows to select, use Shift/Cmd for multiple
- **Play Button**: Preview tracks (upcoming feature)

### Settings Panel

The Settings panel is organized into five main sections:

#### DJ Workflow Tab
Your primary configuration for the professional workflow:

**Audio Normalization Section:**
- **Enable normalization checkbox**: Turn on/off audio processing
- **Preset selector**: Choose from DJ, Streaming, Broadcast, or Custom
- **Custom controls**: Set specific LUFS and peak targets
- **Auto-normalize**: Process tracks automatically on import
- **Backup options**: Create safety copies of original files
- **File naming**: Customize normalized file suffixes
- **Output format**: Choose WAV, FLAC, or AIFF

#### Library Tab
Configure how CleanCue manages your music collection:

- **Auto-scan**: Automatically detect library changes
- **Scan on startup**: Check for new files when launching
- **Watch folders**: Monitor directories for file changes
- **File extensions**: Specify supported audio formats

#### Database Tab
Manage your library database:

- **Database path**: Location of your library database
- **Auto-backup**: Automatic database backups
- **Backup frequency**: Daily, weekly, or monthly backups

#### Analysis Tab
Control how tracks are analyzed:

- **Auto-analyze**: Process tracks immediately after scanning
- **Write tags**: Save analysis results to audio file metadata
- **BPM range**: Set minimum and maximum tempo detection
- **Analysis on import**: Immediate processing of new tracks

#### Interface Tab
Customize the user experience:

- **Theme**: Dark, light, or auto (system) theme
- **Album artwork**: Show/hide cover art in library view
- **Compact view**: Adjust library display density

## Advanced Features

### Health Dashboard
Access via the Settings → Database section:

**System Checks:**
- **Database integrity**: Verify library consistency
- **File availability**: Check for missing or moved files
- **Analysis completeness**: Track processing status
- **Storage usage**: Monitor disk space usage

**Health Indicators:**
- **Green**: All systems operational
- **Yellow**: Minor issues detected
- **Red**: Critical problems requiring attention

### Duplicate Detection
CleanCue automatically identifies potential duplicate tracks:

- **Filename matching**: Identical or similar filenames
- **Metadata analysis**: Same artist/title combinations
- **Audio fingerprinting**: Detect re-encoded duplicates
- **Smart suggestions**: Recommended actions for duplicates

### Metadata Enrichment
Enhance your library with additional information:

- **Online lookup**: Fetch missing metadata from online databases
- **Genre classification**: Automatic genre tagging
- **Release date detection**: Find original release information
- **Album artwork**: Download high-quality cover art

### YouTube Integration
Download and process tracks from YouTube:

- **URL input**: Paste YouTube video or playlist URLs
- **Quality selection**: Choose audio quality and format
- **Metadata extraction**: Automatic title/artist detection
- **Batch processing**: Handle playlists efficiently

## Professional DJ Workflow Tips

### Optimal Analysis Workflow
1. **Scan your entire library first** - Get all tracks imported
2. **Run BPM analysis** - This is the fastest analysis type
3. **Process key detection** - Takes longer but essential for mixing
4. **Add energy analysis** - Helps with track selection and cue points
5. **Enable tag writing** - Preserve analysis in your files

### Library Organization Best Practices
1. **Consistent folder structure**: Organize by genre, artist, or label
2. **Clean metadata**: Ensure proper ID3 tags before importing
3. **Regular health checks**: Monitor library integrity
4. **Backup strategy**: Use both database and file backups

### Performance Optimization
1. **SSD storage**: Store your library database on SSD for best performance
2. **Batch operations**: Select multiple tracks for analysis to improve efficiency
3. **Background processing**: Continue working while analysis runs
4. **Regular maintenance**: Clean up duplicates and missing files

### Normalization Strategies
1. **Choose the right preset**: DJ for clubs, Streaming for online distribution
2. **Test settings**: Try different presets with sample tracks
3. **Monitor levels**: Check that normalized tracks sound consistent
4. **Backup originals**: Always keep your source files safe

## Keyboard Shortcuts

### Library Navigation
- **Cmd/Ctrl + A**: Select all tracks
- **Space**: Play/pause current track (coming soon)
- **↑/↓**: Navigate track list
- **Cmd/Ctrl + F**: Search library

### Application Control
- **Cmd/Ctrl + ,**: Open Settings
- **Cmd/Ctrl + Shift + S**: Scan Library
- **Cmd/Ctrl + R**: Refresh library view
- **Cmd/Ctrl + Q**: Quit application

## Troubleshooting

### Common Issues

**Tracks not appearing after scan:**
1. Check file permissions - ensure CleanCue can read your music folder
2. Verify supported formats - see the supported formats list above
3. Check the Health Dashboard for scan errors

**Analysis failing or taking too long:**
1. Ensure sufficient disk space for temporary files
2. Check that Python workers are functioning (Health Dashboard)
3. Some files may have unusual characteristics that prevent analysis

**Audio normalization not working:**
1. Verify FFmpeg is installed and accessible
2. Check that original files aren't corrupted
3. Ensure sufficient disk space for normalized files

**Database issues:**
1. Check database path in Settings → Database
2. Verify disk space and permissions
3. Try creating a new database if corruption is suspected

### Getting Help

**Built-in Resources:**
- **Health Dashboard**: First place to check for system issues
- **Settings tooltips**: Hover over options for explanations
- **Error messages**: Detailed information about problems

**Online Support:**
- **GitHub Issues**: https://github.com/CommanderCody/CleanCue/issues
- **Documentation**: Latest guides and tutorials
- **Community**: Connect with other CleanCue users

## Version Information

**CleanCue Desktop v0.2.0** - Professional DJ Library Management

### Latest Features:
- **🎛️ Professional DJ Workflow**: Discover → Normalize → Analyze → Review → Export
- **🔊 Audio Normalization**: Professional LUFS-based normalization with presets
- **🎵 Enhanced Analysis**: Improved BPM, key, and energy detection
- **📊 Health Dashboard**: Comprehensive system monitoring
- **🏷️ File Tag Writing**: Save analysis results to audio file metadata
- **🎨 Modern UI**: Clean, professional interface with workflow focus
- **📱 Responsive Design**: Optimized layouts for different screen sizes

### Technical Specifications:
- **Audio Analysis**: librosa-based tempo and key detection
- **Normalization**: FFmpeg-powered professional audio processing
- **Database**: SQLite with automatic backup and health monitoring
- **Formats**: Support for all major audio formats
- **Cross-platform**: Native macOS application, Windows coming soon

---

*For technical documentation and developer resources, see the [CLI Guide](CLI_GUIDE.md) and [Development Documentation](DEVELOPMENT.md).*

*CleanCue is built with ❤️ for DJs by DJs. Visit [cmndrcody.com](https://cmndrcody.com) for more information.*