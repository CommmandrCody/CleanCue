# 🎧 CleanCue

**DJ Library Manager**

CleanCue helps DJs organize, analyze, and export their music collections across all major DJ software platforms. Built for DJs who have limited time and money but need professional library management tools.

## ✨ Features

### 🔍 **Library Scanning & Analysis**
- **Fast Multi-Format Support**: MP3, WAV, FLAC, M4A, AIFF
- **Intelligent BPM Detection**: Accurate tempo analysis using librosa
- **Musical Key Detection**: Camelot wheel notation for harmonic mixing
- **Energy & Volume Analysis**: Dynamic range and clipping detection
- **Smart Metadata Parsing**: DJ-optimized filename and tag extraction

### 🎛️ **Universal Export System**
- **USB Export**: Copy tracks to USB/external drives with custom filename templates and character normalization
- **M3U (Universal)**: Standard playlist format with metadata
- **Serato DJ**: Native crate format with BPM/key preservation
- **Engine DJ**: XML format with cue points and metadata
- **Rekordbox**: Pioneer XML with tempo and key data
- **Traktor Pro**: NML format with full metadata support

### 💾 **USB Export (NEW in v0.2.0)**
- **Custom Filename Templates**: Use metadata in filenames like `{artist} - {title} [{bpm}] ({key})`
- **Character Normalization**: Remove accents, special characters, and ensure filesystem compatibility
- **Export Profiles**: Pre-configured templates for different DJ setups (Standard, Serato, Rekordbox, etc.)
- **Folder Organization**: Organize by artist, genre, or custom folder structures
- **File Operations**: Copy, move, hard link, or symbolic link options
- **Backup Protection**: Optional backup of original files before processing
- **Conflict Resolution**: Intelligent handling of duplicate filenames

### 🎤 **STEM Separation (NEW)**
- **AI-Powered Audio Separation**: Extract vocals, drums, bass, and other instruments
- **Multiple Models**: Support for different separation algorithms and quality levels
- **Batch Processing**: Queue multiple tracks for separation
- **Real-time Progress**: Monitor separation progress with live updates
- **DJ-Ready Output**: Separated stems ready for mixing and remixing

### 📺 **YouTube Audio Downloader (NEW)**
- **High-Quality Audio**: Download audio from YouTube videos in multiple formats
- **Batch Downloads**: Queue multiple videos for download
- **Smart Metadata**: Automatic title, artist, and metadata extraction
- **Library Integration**: Downloaded tracks automatically added to your library
- **Download Management**: Monitor progress and manage download queue

### 🔎 **Duplicate Detection**
- **Multi-Strategy Analysis**: Audio fingerprinting, metadata, and file hash comparison
- **Confidence Scoring**: Accurate duplicate identification
- **Side-by-Side Comparison**: Visual metadata and file info comparison
- **Smart Recommendations**: AI-powered keep vs. remove suggestions

### 🏥 **Library Health Monitoring**
- **Missing File Detection**: Identify broken library links
- **Quality Assessment**: Low bitrate and corruption detection
- **Metadata Issues**: Missing BPM, key, genre identification
- **Batch Repair Tools**: Fix multiple issues simultaneously

### 🎨 **Professional UI**
- **Dark Theme**: DJ-optimized interface for club environments
- **Responsive Design**: Works on desktop, laptop, and tablet
- **Real-time Progress**: Live updates during scanning and analysis
- **Keyboard Shortcuts**: Power user efficiency

## 🚀 Quick Start

### Desktop App (Recommended)
1. Download the latest release for your platform:
   - **macOS**: `CleanCue-0.2.3.dmg` (Intel) or `CleanCue-0.2.3-arm64.dmg` (Apple Silicon)
   - **Windows**: `CleanCue-0.2.3-x64.exe` (64-bit) or `CleanCue-0.2.3-ia32.exe` (32-bit)
2. Install and launch CleanCue
3. Click "Scan Library" and select your music folder
4. Let CleanCue analyze your tracks (BPM, key, energy)
5. Export to your preferred DJ software format

### Web Version
CleanCue also runs in your browser at `http://localhost:3000` when running the development server.

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/cleancue/cleancue.git
cd cleancue

# Install dependencies
pnpm install

# Set up Python environment for audio analysis
cd packages/workers
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# Start development servers
cd ../../
pnpm dev:ui          # Start web UI (http://localhost:3000)
pnpm dev:desktop     # Start desktop app with hot reload
```

## 📋 System Requirements

### Desktop App
- **macOS**: 10.14+ (Intel/Apple Silicon)
- **Windows**: 7/10/11 (32-bit/64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for app + space for music library cache

### Audio Analysis
- **Python**: 3.8+ (included in desktop builds)
- **librosa**: For BPM and key detection
- **numpy**: For numerical processing

## 🎯 Use Cases

### Festival Prep
Export your library to multiple DJ software formats for backup and collaboration with other DJs.

### Mobile DJ Setup
Quickly scan and organize large music collections, detect duplicates, and create USB-ready libraries with custom filename templates and normalized characters for maximum compatibility.

### Radio Show Preparation
Analyze energy levels and harmonic keys for seamless transitions and professional mixes.

### Club Residency
Maintain clean, organized libraries with consistent metadata across all your DJ software.

### Collection Migration
Move your library between DJ software platforms without losing metadata or cue points.

## 🤝 Contributing

CleanCue is open source and welcomes contributions! Whether you're fixing bugs, adding features, or improving documentation, your help makes CleanCue better for the entire DJ community.

### Areas where we need help:
- **Audio Analysis**: Improving BPM and key detection accuracy
- **Format Support**: Adding new DJ software export formats
- **Performance**: Optimizing large library handling
- **Testing**: Real-world DJ workflow testing
- **Documentation**: User guides and API documentation

## 📄 License

CleanCue is released under the MIT License. See [LICENSE](LICENSE) for details.

## ❤️ Built for DJs, by DJs

CleanCue is a not-for-profit project created by CmndrCody to save time and money for DJs who have little of both. We believe every DJ deserves professional library management tools, regardless of budget.

### 🙏 Special Thanks
- **librosa** team for audio analysis capabilities
- **Electron** for cross-platform desktop support
- **React** and **Vite** for the modern UI framework
- **The DJ community** for feedback and feature requests

---

**🔥 Ready to clean up your music library?**

[Download CleanCue](https://github.com/CommmandrCody/cleancue/releases) | [Documentation](https://github.com/CommmandrCody/cleancue/wiki) | [Report Issues](https://github.com/CommmandrCody/cleancue/issues)

---

**Built by [CmndrCody](https://cmdrcody.com)** | 🎵 [SoundCloud](https://soundcloud.com/cmdrcody) | 🐦 [Twitter](https://twitter.com/CmndrCody)
