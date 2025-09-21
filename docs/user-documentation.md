# CleanCue v0.2.3 - Complete User Documentation

## 🎧 Professional DJ Library Management

**Built by DJs, for DJs. Complete transparency, zero vendor lock-in.**

---

## 📚 Documentation Overview

CleanCue provides **two equally powerful interfaces** with comprehensive documentation for both:

### 🖥️ Desktop UI - Beautiful & Transparent
**Perfect for**: Interactive library management, metadata editing, real-time monitoring

**[📖 Complete UI Guide →](ui-guide.md)**
- Visual library management with drag & drop
- Real-time analysis progress with expandable logging
- Professional STEM separation with queue management
- Intuitive metadata editing with auto-save
- Color-coded analysis status and confidence indicators

### ⌨️ Command Line - Scriptable & Powerful
**Perfect for**: Automation, batch processing, integration with other tools

**[📖 Complete CLI Reference →](cli-reference.md)**
- Full scriptability for professional workflows
- Real-time progress reporting for all operations
- Comprehensive error handling and diagnostics
- Integration with existing automation systems
- Perfect for headless servers and batch operations

---

## 🚀 Quick Start Guide

### 1. Installation & Setup

**Download CleanCue v0.2.3:**
- **macOS**: [Intel DMG](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3.dmg) | [Apple Silicon DMG](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3-arm64.dmg)
- **Windows**: [Installer](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3-x64.exe) | [Portable](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3-x64-Portable.exe)
- **Linux**: [AppImage](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/cleancue-0.2.3-x86_64.AppImage)

### 2. First Launch

**Using the Desktop UI:**
1. Launch CleanCue Desktop
2. Click "Add Music Folder" or drag & drop your music directory
3. Watch real-time scanning progress in the status bar
4. Start analysis from the Analysis tab
5. Use the expandable logging panel to see exactly what's happening

**Using the CLI:**
```bash
# Open terminal and run:
cleancue scan ~/Music/DJ\ Collection    # Scan your music
cleancue analyze all                    # Analyze everything
cleancue stats                          # View results
```

### 3. Understanding the Results

**Analysis Status Colors:**
- 🟢 **Green**: Analysis complete with high confidence
- 🟡 **Yellow**: Analysis complete with medium confidence
- 🔴 **Red**: Analysis failed or very low confidence
- ⚪ **Gray**: Not yet analyzed

**Key Information:**
- **BPM**: Tempo detection with confidence scoring
- **Key**: Musical key with optional Camelot notation
- **Energy**: Analysis for DJ cue point generation
- **Stems**: Professional 4-stem separation (drums, bass, other, vocals)

---

## 🎯 Core Features & Capabilities

### Professional Audio Analysis

**Multi-Algorithm BPM Detection**
- librosa-based beat tracking for studio accuracy
- Variable tempo handling for live recordings
- Confidence scoring to identify uncertain results
- Sub-beat precision for perfect loop creation

**Musical Key Detection**
- Harmonic analysis with Camelot wheel support
- Toggle between standard (Am, C#) and Camelot (8A, 12B) notation
- Key compatibility indicators for harmonic mixing
- Confidence scoring for each detection

**STEM Separation**
- Professional htdemucs model for studio-quality results
- 4-stem output: drums, bass, other, vocals
- Queue management with priority controls
- Preview separated stems before export

### Library Management

**Smart Organization**
- Automatic duplicate detection and handling
- Nested directory support with recursive scanning
- Real-time metadata editing with auto-save
- Advanced search and filtering across all fields

**Professional Workflows**
- Batch operations for multiple tracks
- Progress tracking for large library operations
- Error isolation (one bad file doesn't stop everything)
- Comprehensive logging for troubleshooting

**Cross-Platform Compatibility**
- Works with existing DJ software libraries
- Import/export support for major formats
- Consistent results across macOS, Windows, Linux
- No vendor lock-in - your data stays accessible

---

## 🔍 Complete Transparency

### Real-Time Operations Monitoring

**Expandable Logging System** (UI):
```
[14:23:15] 🔍 Starting library scan: ~/Music/DJ Collection
[14:23:16] 📂 Processing: Daft Punk - One More Time.mp3
[14:23:16] 🎵 Extracted metadata: BPM=123, Key=F#
[14:23:16] ✅ Added to library: [ID: abc123]
[14:23:17] 🔬 Starting BPM analysis...
[14:23:19] 🎯 BPM detection complete: 123.45 (confidence: 0.94)
```

**Command Line Progress** (CLI):
```bash
🔍 Starting scan of 3 path(s)...
📂 Scanning: 45% (127/283) - track_name.mp3
🔬 Analyzing: 67% - "Deadmau5 - Strobe"
✅ Analysis complete: 1,645/1,847 tracks analyzed
```

### No Black Boxes

**See Exactly What's Happening:**
- File-by-file scanning progress with names
- Algorithm details and confidence scores
- Error messages with specific file paths and solutions
- Technical details for power users who want to understand

**This transparency sets CleanCue apart** from proprietary DJ software that hides their processes behind closed algorithms.

---

## 🛠️ Professional Use Cases

### Festival & Club DJs

**Multi-Platform Preparation:**
- Analyze once, export to Serato, Traktor, Engine DJ, rekordbox
- Perfect beatgrids that work across all software
- STEM separation for advanced mixing techniques
- Automation scripts for consistent library maintenance

### Mobile DJs

**Efficient Workflow:**
- Quick analysis of new tracks for last-minute gigs
- Smart playlists based on BPM range and key compatibility
- Batch processing for large wedding/event libraries
- Export to multiple backup formats for redundancy

### Producers & Remixers

**Studio Integration:**
- High-quality STEM separation for remixing source material
- Precise BPM detection for perfect loops and edits
- Key analysis for harmonic layering and mashups
- Batch processing of sample libraries

### DJ Schools & Educators

**Teaching Tool:**
- Show students exactly how BPM and key detection works
- Demonstrate professional library organization
- No subscription costs for educational use
- Complete transparency helps students learn

---

## 📖 Detailed Documentation

### 🖥️ Desktop UI Guide
**[Complete UI Documentation →](ui-guide.md)**

**Covers:**
- Interface overview and navigation
- Real-time progress monitoring
- Expandable logging system
- STEM separation workflow
- Metadata editing and organization
- Customization and settings
- Troubleshooting and optimization

### ⌨️ CLI Reference
**[Complete CLI Documentation →](cli-reference.md)**

**Covers:**
- All command syntax and options
- Automation and scripting examples
- Integration with other tools
- Batch processing workflows
- Error handling and debugging
- Performance optimization
- Professional use cases

### 🔧 Technical Resources

**[Foundation Backlog](foundation-backlog.md)** - Development roadmap and priorities
**[Git Workflow](git-workflow.md)** - Contribution guidelines and processes
**[Dependency Stability](dependency-stability-plan.md)** - Technical architecture notes

---

## 🎵 Why CleanCue?

### Built by Someone Who Gets It

CleanCue is built by a **product manager, developer, musician, producer, and DJ** who understands:
- The 3am panic when software crashes during festival prep
- Why beatgrid accuracy matters more than flashy UI features
- The pain of re-analyzing 10,000 tracks for a new platform
- How vendor lock-in kills creativity and wastes time

### Technical Excellence Meets Real-World Needs

**Foundation-First Approach:**
- >99.5% BPM accuracy target for 4/4 dance music
- Professional algorithms (librosa, htdemucs) not toy implementations
- Multi-algorithm cross-validation for superior results
- Built to be the **source of truth** for your music library

**Open Philosophy:**
- Complete source code transparency
- No vendor lock-in or subscription fees
- Community-driven development with public roadmap
- Your music data belongs to you, always

### Professional Results, Accessible to Everyone

- **Free to use** - no subscriptions, no feature limits
- **Works offline** - your music stays on your devices
- **Cross-platform** - macOS, Windows, Linux support
- **Open source** - inspect, modify, improve

---

## 🚀 Getting Help & Contributing

### Support & Community

**GitHub Issues**: [Report bugs and request features](https://github.com/CommmandrCody/CleanCue/issues)
**Discussions**: Share workflows and get help from the community
**Documentation**: Complete guides for both UI and CLI usage

### Contributing

CleanCue is open source and welcomes contributions:

1. **Check the [Foundation Backlog](foundation-backlog.md)** for current priorities
2. **Review [GitHub Issues](https://github.com/CommmandrCody/CleanCue/issues)** for available tasks
3. **Follow the [Git Workflow](git-workflow.md)** for structured development
4. **Phase 0 items** (beatgrid and cue detection) are highest priority

### Roadmap

**Phase 0** (HIGH PRIORITY): Advanced cue detection and beatgrid analysis
**Phase 1** (MEDIUM): Music fingerprinting and filename intelligence
**Phase 2** (LOW): Enhanced YouTube downloader features

---

## 📊 System Requirements

**Minimum:**
- **RAM**: 4GB (8GB recommended for large libraries)
- **Storage**: 500MB + space for music library cache
- **OS**: macOS 10.14+ / Windows 10+ / Modern Linux distribution

**Recommended for Professional Use:**
- **RAM**: 16GB for large libraries (10,000+ tracks)
- **Storage**: SSD for best performance during analysis
- **CPU**: Multi-core processor for faster batch operations

---

## 🎧 Start Your Journey

1. **[Download CleanCue v0.2.3](https://github.com/CommmandrCody/CleanCue/releases/tag/v0.2.3)**
2. **Choose your interface**: Desktop UI for interaction, CLI for automation
3. **Read the appropriate guide**: [UI Guide](ui-guide.md) or [CLI Reference](cli-reference.md)
4. **Scan your music library** and watch CleanCue work its magic
5. **Experience the transparency** - see exactly what's happening to your music

**Welcome to DJ library freedom.** 🎉

---

*CleanCue v0.2.3 - Foundation Collaboration Baseline*
*Built with ❤️ by the DJ community, for the DJ community*