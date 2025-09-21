# CleanCue Documentation

## 🎧 Professional DJ Library Management

**Built by DJs, for DJs. Complete transparency, zero vendor lock-in.**

---

## 📚 Documentation Index

### 🚀 Getting Started
- **[User Documentation](user-documentation.md)** - Complete overview of both CLI and UI
- **[Quick Start Guide](#quick-start)** - Get up and running in minutes

### 🖥️ Desktop Application
- **[UI Guide](ui-guide.md)** - Complete desktop interface documentation
- **[Expandable Logging System](ui-guide.md#expandable-logging-system)** - Real-time transparency
- **[STEM Separation Workflow](ui-guide.md#stem-separation)** - Professional audio separation

### ⌨️ Command Line Interface
- **[CLI Reference](cli-reference.md)** - Complete command documentation
- **[Automation & Scripting](cli-reference.md#automation--scripting)** - Power user workflows
- **[Integration Examples](cli-reference.md#integration-examples)** - Professional use cases

### 🔧 Development & Contributing
- **[Foundation Backlog](foundation-backlog.md)** - Development roadmap and priorities
- **[Git Workflow](git-workflow.md)** - Contribution guidelines and processes
- **[GitHub Issues](https://github.com/CommmandrCody/CleanCue/issues)** - Current tasks and features

### 📊 Technical Resources
- **[Dependency Stability Plan](dependency-stability-plan.md)** - Technical architecture notes
- **[CLAUDE.md](../CLAUDE.md)** - Development environment setup

---

## 🎯 Quick Start

### 1. Download CleanCue v0.2.3
- **macOS**: [Intel](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3.dmg) | [Apple Silicon](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3-arm64.dmg)
- **Windows**: [Installer](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3-x64.exe) | [Portable](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/CleanCue-0.2.3-x64-Portable.exe)
- **Linux**: [AppImage](https://github.com/CommmandrCody/CleanCue/releases/download/v0.2.3/cleancue-0.2.3-x86_64.AppImage)

### 2. Choose Your Interface

**🖥️ Desktop UI** (Perfect for interactive use):
1. Launch CleanCue Desktop
2. Drag & drop your music folder
3. Watch real-time scanning progress
4. Use the **expandable logging panel** to see exactly what's happening

**⌨️ Command Line** (Perfect for automation):
```bash
cleancue scan ~/Music/DJ\ Collection    # Scan your music
cleancue analyze all                    # Analyze everything
cleancue stats                          # View detailed results
```

### 3. Key Features to Try

**🔍 Complete Transparency**: Open the logging panel and watch CleanCue work
**🎛️ STEM Separation**: Professional 4-stem separation (drums, bass, other, vocals)
**🎵 Analysis**: BPM and key detection with confidence scoring
**📊 Statistics**: Comprehensive library analytics

---

## 🌟 What Makes CleanCue Different

### Complete Transparency
Unlike other DJ software that hides their algorithms, CleanCue shows you **exactly** what's happening:
- Real-time operation logging
- Confidence scores for all analysis
- File-by-file progress reporting
- Clear error messages with solutions

### Dual Interface Philosophy
- **Beautiful UI** for interactive library management
- **Powerful CLI** for automation and scripting
- **Seamless integration** between both interfaces
- **Same engine** ensures consistent results

### Professional Workflows
Built by a **product manager, developer, musician, producer, and DJ** who understands:
- Festival prep workflows and time pressure
- The pain of vendor lock-in and re-analysis
- Need for automation in professional environments
- Importance of transparency and trust

---

## 🎵 Use Cases

### 🎪 Festival & Club DJs
- **Multi-platform preparation**: Analyze once, export everywhere
- **Perfect beatgrids**: Works across Serato, Traktor, Engine DJ, rekordbox
- **STEM separation**: Advanced mixing techniques
- **Automation scripts**: Consistent library maintenance

### 🎶 Mobile DJs
- **Quick analysis**: New tracks ready for last-minute gigs
- **Smart playlists**: BPM and key-based organization
- **Multiple formats**: Export to all backup systems
- **Offline operation**: No internet required

### 🎧 Producers & Remixers
- **High-quality STEM separation**: Studio-grade htdemucs model
- **Precise BPM detection**: Perfect for loops and edits
- **Key analysis**: Harmonic layering and mashups
- **Batch processing**: Handle large sample libraries

### 🎓 DJ Schools & Educators
- **Free to use**: No subscription costs for education
- **Complete transparency**: Show students how analysis works
- **Professional workflows**: Teach industry-standard practices
- **Open source**: Inspect and understand algorithms

---

## 📖 Documentation Highlights

### [UI Guide](ui-guide.md) - 28 Pages
**Key Sections:**
- Interface overview and navigation
- **Expandable logging system** (CleanCue's killer feature)
- Real-time progress monitoring
- STEM separation workflow
- Professional DJ prep workflows

### [CLI Reference](cli-reference.md) - 24 Pages
**Key Sections:**
- Complete command syntax with examples
- Automation and scripting guides
- Integration with other tools
- Professional batch processing workflows

### [User Documentation](user-documentation.md) - 20 Pages
**Key Sections:**
- Quick start for immediate value
- Understanding analysis results
- Professional use cases
- Cross-platform compatibility

---

## 🚀 Getting Help

### Support Channels
- **[GitHub Issues](https://github.com/CommmandrCody/CleanCue/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/CommmandrCody/CleanCue/discussions)** - Community help and workflows
- **[Documentation](user-documentation.md)** - Comprehensive guides for all features

### Contributing
1. Check the **[Foundation Backlog](foundation-backlog.md)** for current priorities
2. Review **[GitHub Issues](https://github.com/CommmandrCody/CleanCue/issues)** for available tasks
3. Follow the **[Git Workflow](git-workflow.md)** for structured development
4. **Phase 0 items** (beatgrid and cue detection) are highest priority

---

## 🎯 System Requirements

**Minimum:**
- **RAM**: 4GB (8GB recommended for large libraries)
- **Storage**: 500MB + space for music library cache
- **OS**: macOS 10.14+ / Windows 10+ / Modern Linux

**Recommended for Professional Use:**
- **RAM**: 16GB for large libraries (10,000+ tracks)
- **Storage**: SSD for best performance during analysis
- **CPU**: Multi-core processor for faster batch operations

---

## 📊 Current Status - v0.2.3

### ✅ Foundation Complete
- **TypeScript Compilation**: Zero errors across all packages
- **Cross-Platform Builds**: macOS, Windows, Linux ready
- **Documentation**: Comprehensive guides for CLI and UI
- **Project Organization**: GitHub Issues, milestones, roadmap

### 🎯 Next Phase - Phase 0 (HIGH PRIORITY)
- **Multi-algorithm beat detection** (librosa, aubio, essentia)
- **Advanced cue point detection** (intro, outro, drops, breakdowns)
- **Export format adaptation** for all major DJ software

### 🎵 Current Features
- **STEM Separation**: htdemucs model with 4-stem output
- **Library Management**: SQLite-based with metadata enrichment
- **YouTube Integration**: yt-dlp powered downloading
- **Real-time UI**: React-based with WebSocket communication
- **Complete CLI**: Full scriptability with progress reporting

---

*CleanCue v0.2.3 - Foundation Collaboration Baseline*
*Built with ❤️ by the DJ community, for the DJ community*