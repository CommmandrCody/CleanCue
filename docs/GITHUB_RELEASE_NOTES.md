# 🎧 CleanCue v0.1.0 - DJ Library Freedom

**Open-source DJ library management toolkit for the modern DJ**

Finally, a way to break free from DJ software vendor lock-in! CleanCue lets you analyze your music once and export it to **any** major DJ platform.

## ✨ What's Included

### 🔍 **Smart Library Analysis**
- **BPM Detection**: Accurate tempo analysis using advanced audio processing
- **Musical Key Detection**: Camelot wheel notation for seamless harmonic mixing
- **Energy & Volume Analysis**: Dynamic range and clipping detection for quality control
- **Intelligent Metadata Parsing**: DJ-optimized filename and tag extraction

### 🎛️ **Universal Export System**
Export your analyzed library to **all major DJ software**:
- **M3U Playlists**: Universal format with metadata
- **Serato DJ**: Native crate format with BPM/key preservation
- **Engine DJ**: XML format with cue points and metadata
- **Rekordbox**: Pioneer XML with tempo and key data
- **Traktor Pro**: NML format with full metadata support

### 🔍 **Duplicate Detection**
- Multi-strategy analysis (audio fingerprinting, metadata, file hash)
- Confidence scoring for accurate identification
- Side-by-side comparison tools
- Smart keep/remove recommendations

### 🏥 **Library Health Monitoring**
- Missing file detection
- Quality assessment (bitrate, corruption detection)
- Metadata issue identification
- Batch repair tools

### 🎨 **Professional Interface**
- Dark theme optimized for club environments
- Real-time progress tracking
- Cross-platform desktop applications
- Keyboard shortcuts for power users

## 📱 **Platform Support**

### **macOS**
- **Intel Macs**: [CleanCue-0.1.0.dmg](../../apps/desktop/release/CleanCue-0.1.0.dmg) (183MB)
- **Apple Silicon**: [CleanCue-0.1.0-arm64.dmg](../../apps/desktop/release/CleanCue-0.1.0-arm64.dmg) (183MB)

### **Windows**
- **64-bit**: [CleanCue-0.1.0-x64.exe](../../apps/desktop/release/CleanCue-0.1.0-x64.exe) (151MB)
- **32-bit**: [CleanCue-0.1.0-ia32.exe](../../apps/desktop/release/CleanCue-0.1.0-ia32.exe) (146MB)
- **Universal**: [CleanCue-0.1.0.exe](../../apps/desktop/release/CleanCue-0.1.0.exe) (297MB)

## 🚀 **Quick Start**

1. **Download** the version for your platform above
2. **Install** and launch CleanCue
3. **Click "Scan Library"** and select your music folder
4. **Let CleanCue analyze** your tracks (BPM, key, energy)
5. **Export** to your preferred DJ software format

## 🎯 **Perfect For**

- **Festival DJs**: Export to multiple formats for backup and collaboration
- **Mobile DJs**: Quickly organize large collections and create USB-ready libraries
- **Radio DJs**: Analyze energy levels and keys for seamless transitions
- **Club DJs**: Maintain clean, organized libraries across all your software
- **Any DJ**: Switching between platforms without losing your work

## 💰 **Completely Free**

- ✅ No subscriptions
- ✅ No feature limitations
- ✅ No vendor lock-in
- ✅ Open source (MIT License)
- ✅ Built for DJs who have limited time and money

## 🛠️ **Technical Details**

- **Audio Analysis**: librosa-powered Python workers
- **File Formats**: MP3, WAV, FLAC, M4A, AIFF support
- **Export Formats**: M3U, Serato, Engine DJ, Rekordbox, Traktor
- **Architecture**: Modern React UI with Electron desktop wrapper
- **System Requirements**: 4GB RAM, 500MB storage + music library cache

## 🤝 **Community & Support**

- **Documentation**: [GitHub Wiki](https://github.com/CommandrCody/cleancue/wiki)
- **Bug Reports**: [GitHub Issues](https://github.com/CommandrCody/cleancue/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/CommandrCody/cleancue/discussions)
- **DJ Community**: Built by [CmndrCody](https://cmdrcody.com) for the DJ community

## ⚠️ **Known Issues**

- CLI package has TypeScript compilation errors (desktop/web versions work perfectly)
- Electron may need manual installation on some systems (workaround included)

## 🔄 **What's Next**

- Enhanced key detection accuracy
- Additional DJ software export formats
- Performance optimizations
- Community-requested features

---

**🎵 Ready to free your music library?**

Download CleanCue now and join the DJs who refuse to be locked into one software ecosystem!

**Built by DJs, for DJs** 🎧

---

*Special thanks to the librosa team, Electron project, React/Vite, and the entire DJ community for making this possible.*