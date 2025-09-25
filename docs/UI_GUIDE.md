# CleanCue Desktop UI Guide

**Professional DJ Library Management Interface**

CleanCue Desktop v0.2.4 provides a modern, intuitive interface for managing your music library with advanced DJ-focused features. Built with React, Electron, and designed for professional workflow efficiency.

## Quick Start

```bash
# Install and run CleanCue Desktop
pnpm install
pnpm run build
pnpm run dev
```

The desktop app will launch with a modern dark interface optimized for DJ workflows.

## Main Interface Overview

### Library View
The central hub for your music collection with advanced filtering and analysis tools.

**Key Features:**
- **Smart Track Display** - Title, artist, BPM, key, energy in clean columns
- **Real-time Search** - Instant filtering by title, artist, or genre
- **Camelot Key Display** - Professional harmonic mixing notation (8A, 9B, etc.)
- **BPM Color Coding** - Visual tempo ranges for quick identification
- **Energy Visualization** - Track energy levels for perfect set planning
- **Multi-select** - Bulk operations on multiple tracks

**View Modes:**
- **Compact List** - Maximum tracks visible (default)
- **Grid View** - Album artwork and visual browsing

### Sidebar Navigation

**Main Sections:**
- **📚 Library** - Complete track collection
- **⚡ Analysis Progress** - Real-time job monitoring
- **🔍 Duplicate Detection** - Find and manage duplicate tracks
- **📺 YouTube Downloader** - Download and import from YouTube
- **🎤 STEM Separation** - AI-powered vocal/instrumental separation
- **🎛️ Metadata Enrichment** - Enhance track information
- **📊 Health Dashboard** - Library statistics and health
- **⚙️ Settings** - Application preferences

## Core Features

### 1. Library Scanning & Management

**Scanning New Music:**
1. Click **"Scan Library"** button
2. Select music directories to scan
3. Choose scan options:
   - Include subdirectories ✓
   - Update existing tracks ✓
   - Skip duplicates ✓
4. Monitor real-time progress
5. Review scan results

**Supported Formats:**
- **MP3** - All bitrates (128-320 kbps)
- **FLAC** - Lossless compression
- **WAV** - Uncompressed audio
- **M4A/AAC** - Apple formats
- **AIFF** - Apple/Pro Tools standard

### 2. Audio Analysis

**BPM (Tempo) Detection:**
- Accurate tempo analysis using advanced algorithms
- Handles variable tempo tracks
- Results displayed in BPM column with color coding:
  - 🟢 80-100 BPM (Hip-Hop, Downtempo)
  - 🟡 100-120 BPM (House, Disco)
  - 🟠 120-140 BPM (Techno, Trance)
  - 🔴 140+ BPM (Drum & Bass, Hardcore)

**Musical Key Detection:**
- Camelot Wheel notation (1A-12B)
- Traditional notation support (C major, Am, etc.)
- Harmonic mixing compatibility indicators:
  - 🟢 **Perfect Match** - Same key or relative major/minor
  - 🟡 **Good Mix** - Compatible harmonic transitions
  - 🟠 **Stretch** - Requires pitch adjustment
  - 🔴 **Clash** - Avoid mixing these keys

**Energy Level Analysis:**
- 0-100 energy scale
- Based on RMS, peak levels, and frequency distribution
- Perfect for building sets with proper energy flow


### 3. Smart DJ Features

**Harmonic Mixing Assistant:**
```
Example: Track in 8A (Am)
✅ Perfect matches: 8B (C major), 7A (Em), 9A (F#m)
⚠️  Compatible: 7B (G major), 9B (D major)
❌ Avoid: 1A-6A, 10A-12A
```

**BPM Compatibility:**
- Automatic tempo matching suggestions
- Pitch bend requirements calculated
- Optimal mixing points identified

**Energy Flow Planning:**
- Track energy levels help build perfect set progression
- Visual energy curves show intensity changes
- Automatic set ordering by energy progression

### 4. YouTube Integration

**Download from YouTube:**
1. Open **YouTube Downloader** from sidebar
2. Enter YouTube URL or search terms
3. Select audio quality:
   - **High Quality** (320 kbps equivalent)
   - **Standard** (192 kbps equivalent)
   - **Lossless** (FLAC when possible)
4. Choose download location
5. Import directly to library

**Features:**
- Automatic metadata extraction from video titles
- Playlist batch downloading
- Progress monitoring with speed/ETA
- Smart filename generation
- Direct library integration

### 5. STEM Separation (AI Audio Separation)

**Separate Any Track Into:**
- **🎤 Vocals** - Lead and backing vocals isolated
- **🥁 Drums** - Full drum kit separated
- **🎸 Bass** - Bass frequencies isolated
- **🎵 Other** - Remaining instruments (keys, synths, etc.)

**AI Models Available:**
- **HTDemucs** (Recommended) - Best overall quality
- **HTDemucs Fine-tuned** - Enhanced for specific genres
- **MDX Extra** - Fast processing option

**Usage:**
1. Select tracks for separation
2. Choose AI model and quality settings
3. Configure output format (WAV/FLAC/MP3)
4. Monitor separation progress
5. Access separated stems instantly

**Professional Applications:**
- Create acapellas for mashups
- Extract drum loops for sampling
- Remove vocals for karaoke versions
- Isolate instruments for remixing

### 6. Duplicate Detection

**Smart Duplicate Finding:**
- **Audio Fingerprinting** - Detects same recordings with different metadata
- **Metadata Analysis** - Finds identical title/artist combinations
- **File Hash Comparison** - Identifies exact file duplicates

**Resolution Options:**
- Side-by-side comparison view
- Keep highest quality version
- Merge metadata from multiple sources
- Bulk duplicate removal with safety checks

### 7. Metadata Enrichment

**Automatic Enhancement:**
- **Missing Metadata Lookup** - Find album, year, genre info
- **Filename Intelligence** - Extract metadata from filenames
- **Album Artwork** - Download high-quality cover art
- **Genre Classification** - AI-powered genre detection

**Manual Editing:**
- Inline editing of track metadata
- Batch editing for multiple tracks
- Custom field support
- Metadata validation and consistency checks

### 8. Export & Playlists

**Universal Export Formats:**
- **USB Export** - Custom naming for DJ controllers
- **M3U Playlists** - Universal compatibility
- **Serato Crates** - Native Serato DJ format
- **Engine DJ** - Denon/InMusic collections
- **Rekordbox** - Pioneer DJ XML format
- **Traktor** - Native Instruments NML format

**USB Export Features:**
- Custom filename templates: `{artist} - {title} [{bpm}] ({key})`
- Character normalization for USB compatibility
- Folder organization options
- Metadata preservation in filenames

## Advanced Workflows

### Professional DJ Set Preparation

**1. Library Organization:**
```
1. Scan new music → Library View
2. Analyze all tracks → Analysis Progress
3. Check for duplicates → Duplicate Detection
4. Enhance metadata → Metadata Enrichment
```

**2. Set Building:**
```
1. Filter by genre/energy → Library Search
2. Check harmonic compatibility → Key Column
3. Verify BPM transitions → BPM Column
4. Create playlist → Export to DJ Software
```

**3. Track Preparation:**
```
1. Find vocal version → Search Library
2. Create acapella → STEM Separation
3. Download instrumental → YouTube Integration
4. Export for performance → USB Export
```

### Remix Production Workflow

**1. Source Material:**
```
1. Find target track → Library Search
2. Separate stems → STEM Separation
3. Extract vocals/drums → AI Processing
4. Export stems → WAV/FLAC Output
```

**2. Additional Elements:**
```
1. Search for samples → YouTube Downloader
2. Download source material → High Quality Audio
3. Separate components → STEM Separation
4. Import to DAW → File Management
```

## Keyboard Shortcuts

**Global:**
- `Cmd/Ctrl + F` - Focus search bar
- `Cmd/Ctrl + A` - Select all tracks
- `Cmd/Ctrl + D` - Deselect all
- `Space` - Play/pause selected track
- `Esc` - Cancel current operation

**Library View:**
- `↑/↓` - Navigate tracks
- `Shift + Click` - Multi-select range
- `Cmd/Ctrl + Click` - Multi-select individual
- `Enter` - Play selected track
- `Delete` - Remove from library (with confirmation)

**Analysis:**
- `Cmd/Ctrl + R` - Start analysis for selected tracks
- `Cmd/Ctrl + S` - Stop current analysis
- `Cmd/Ctrl + P` - View analysis progress

## Settings & Preferences

**Audio Settings:**
- Default output device selection
- Audio buffer size (latency vs. stability)
- Sample rate preferences
- Bit depth settings

**Analysis Settings:**
- Analysis quality (Speed vs. Accuracy)
- Concurrent analysis jobs
- Auto-analyze on import
- Analysis result caching

**Library Settings:**
- Default music directories
- File format preferences
- Metadata extraction options
- Duplicate detection sensitivity

**Export Settings:**
- Default export formats
- USB naming conventions
- Playlist organization
- File handling options

## Performance Optimization

**For Large Libraries (10,000+ tracks):**
- Enable "Virtualized Scrolling" in settings
- Increase memory allocation for analysis
- Use SSD storage for library database
- Limit concurrent analysis jobs based on CPU cores

**Memory Usage:**
- Base application: ~200MB
- Per 1,000 tracks loaded: ~50MB
- During analysis: +100MB per job
- STEM separation: +500MB per track

**Recommended System Requirements:**
- **Minimum:** 8GB RAM, quad-core CPU, 500GB storage
- **Recommended:** 16GB RAM, 8-core CPU, 1TB SSD
- **Professional:** 32GB RAM, 16-core CPU, 2TB NVMe SSD

## Audio Player Integration

**Built-in Player Features:**
- **Waveform Display** - Visual track analysis
- **Cue Points** - Set and recall precise positions
- **Looping** - Create seamless loops for mixing practice
- **Pitch Control** - Key adjustment without affecting tempo
- **EQ Controls** - Basic frequency adjustment
- **Gain Staging** - Professional level management

**Preview Mode:**
- Instant track preview with spacebar
- Auto-skip to most interesting part of track
- Crossfade between track previews
- Volume normalization for consistent levels

## Integration with DJ Software

**Serato DJ:**
```
1. Export → Serato Crates format
2. Save to Serato music folder
3. Crates appear automatically in Serato
4. All metadata, cues, and BPM preserved
```

**Rekordbox:**
```
1. Export → Rekordbox XML format
2. Import XML into Rekordbox database
3. All track analysis imported
4. Playlists converted to folders
```

**Engine DJ:**
```
1. Export → Engine DJ format
2. Save to Engine music directory
3. Database automatically updated
4. Cue points and loops preserved
```

## Troubleshooting

**Common Issues:**

**"No tracks found after scan"**
```
Solution:
1. Check folder permissions
2. Verify audio files in selected directories
3. Enable "Include subdirectories" option
4. Check supported format list
```

**"Analysis keeps failing"**
```
Solution:
1. Reduce concurrent analysis jobs
2. Check available disk space (temp files)
3. Restart application to clear memory
4. Update audio codecs if needed
```

**"YouTube downloads not working"**
```
Solution:
1. Check internet connection
2. Verify yt-dlp is installed and updated
3. Try different quality settings
4. Check download directory permissions
```

**"STEM separation crashed"**
```
Solution:
1. Ensure sufficient RAM (8GB+ recommended)
2. Close other applications during separation
3. Try lower quality settings first
4. Check temporary disk space
```

## Data & Privacy

**Local Data Storage:**
- All music libraries stored locally
- No cloud syncing (privacy-first approach)
- Database files in `~/.cleancue/`
- Full user control over data

**Network Usage:**
- YouTube downloads only (user-initiated)
- Metadata lookups (optional, can be disabled)
- No telemetry or tracking
- No automatic updates without permission

**File Safety:**
- Original files never modified during analysis
- All operations work on database metadata
- Automatic backup creation before bulk operations
- Recovery tools for database corruption

---

## Getting Help

**In-App Help:**
- Hover tooltips on all major features
- Progress indicators with detailed status
- Error messages with suggested solutions
- Built-in keyboard shortcut reference

**Documentation:**
- [CLI Reference](./CLI_REFERENCE.md) - Command-line interface
- [Main README](../README.md) - Project overview and installation
- [Development Guide](../CLAUDE.md) - Setup and contribution

**Community:**
- GitHub Issues: https://github.com/cleancue/cleancue/issues
- Feature requests welcome
- Bug reports with detailed reproduction steps

---

**CleanCue Desktop v0.2.4** - Professional DJ library management, simplified and powerful.