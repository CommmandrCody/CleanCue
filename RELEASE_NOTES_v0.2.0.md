# CleanCue v0.2.0 Release Notes

**Release Date:** September 18, 2025
**Platform Support:** macOS (Intel + Apple Silicon), Windows x64, Linux (AppImage)

## 🎉 Major New Features

### 🎛️ STEM Separation (NEW!)
Professional audio stem separation using state-of-the-art Demucs Hybrid technology:

- **Real Audio Processing:** No mock data - genuine Demucs Hybrid model integration
- **Professional Quality:** High-fidelity stem separation into vocals, drums, bass, and other instruments
- **Complete TypeScript Implementation:** Zero compilation errors, full type safety
- **Advanced Settings Interface:** Comprehensive controls matching professional DJ software
- **Database Integration:** Full persistence and tracking of separation jobs
- **Progress Tracking:** Real-time status updates and progress monitoring
- **Multiple Models Available:**
  - Hybrid Demucs (htdemucs) - High-quality transformer separation
  - Hybrid Demucs FT (htdemucs_ft) - Fine-tuned for improved quality
  - Hybrid Demucs 6-Stem (htdemucs_6s) - Extended separation including piano
  - MDX Extra (mdx_extra) - Specialized model for specific use cases
- **Export Options:** WAV, FLAC, and MP3 output formats with quality control
- **Professional UI:** Interface designed to match Mixed In Key and other pro tools

### 🔧 USB Export System
Complete file export system for DJ workflows with advanced customization:

- **5 Built-in Export Profiles:**
  - **DJ Standard**: `{artist} - {title}` format for universal compatibility
  - **Organized Folders**: Artist/Album folder structure with clean filenames
  - **Genre Organized**: Genre-based organization for music discovery
  - **Serato Optimized**: Serato DJ software compatibility
  - **Rekordbox Optimized**: Pioneer rekordbox compatibility

- **Advanced Filename Templating:**
  - Metadata injection: `{artist}`, `{title}`, `{album}`, `{genre}`, `{year}`, `{bpm}`, `{key}`
  - Track numbering with zero-padding
  - Custom separators and length limits
  - Conflict resolution (append number, overwrite, skip)

- **Character Normalization:**
  - Accent removal for international characters
  - Special character replacement
  - Space replacement options
  - Case transformation (lowercase, uppercase, titlecase)
  - Custom character filtering (strict, relaxed, custom patterns)

- **File Management Options:**
  - Copy, move, hardlink, or symlink operations
  - Backup original files before processing
  - Integrity verification
  - Timestamp preservation

### 🗑️ Delete & Remove Functionality
Comprehensive track management with safety features:

- **Two-option Delete System:**
  - Remove tracks from library only (preserve files)
  - Permanently delete tracks and files from disk

- **Safety Features:**
  - Confirmation dialog with clear explanations
  - Bulk selection support
  - Error handling with detailed feedback
  - Undo protection through confirmation prompts

### 🎨 Professional Dark Theme
Complete UI redesign optimized for DJ environments:

- **Dark Color Scheme:**
  - Reduced eye strain during extended sessions
  - Professional appearance matching DJ software
  - High contrast for better visibility
  - Consistent theming across all components

- **Enhanced Website:**
  - Updated cleancue.com with new dark theme
  - Improved navigation and readability
  - Professional branding for DJ community

## 🔨 Technical Improvements

### Build System Enhancements
- **TypeScript Dependencies:** Resolved all compilation issues
- **Cross-Platform Builds:** Complete macOS, Windows, and Linux support
- **Code Signing Infrastructure:** Mac certificates imported and configured
- **Package Management:** Updated to pnpm with improved dependency resolution

### Code Quality
- **Clean Codebase:** Removed all development artifacts and temporary files
- **Version Consistency:** All packages updated to v0.2.0
- **Type Safety:** Improved TypeScript definitions across all packages
- **Error Handling:** Enhanced error reporting in USB export and delete operations

## 📦 Distribution Packages

### macOS
- **CleanCue-0.2.0.dmg** (Intel x64 - 184MB)
- **CleanCue-0.2.0-arm64.dmg** (Apple Silicon - 184MB)
- Code signing certificates imported and ready for future signed releases

### Windows
- **CleanCue-0.2.0-x64.exe** (Windows installer - 151MB)
- NSIS installer with automatic setup

### Linux
- **CleanCue-0.2.0.AppImage** (Universal Linux - 192MB)
- Portable executable compatible with all major distributions

## 🐛 Bug Fixes

- Fixed TypeScript build dependency issues that prevented compilation
- Resolved shared package distribution problems
- Corrected module resolution for cross-package imports
- Fixed character encoding issues in filename generation
- Improved error handling in file operations

## 🔧 Developer Notes

### Architecture Changes
- **USB Export System:** New dedicated `USBExporter` class with comprehensive templating
- **Delete Operations:** Integrated file system operations with database management
- **Event System:** Enhanced event types for tracking operations
- **Type Definitions:** Expanded shared types for USB export and delete operations

### Performance Improvements
- Optimized build process with better dependency management
- Reduced bundle sizes through improved tree shaking
- Enhanced worker process management for analysis operations

## 📋 System Requirements

### Minimum Requirements
- **macOS:** 10.14 Mojave or later
- **Windows:** Windows 10 version 1903 or later
- **Linux:** Any modern distribution with AppImage support
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 500MB free space for installation

### Recommended for Best Performance
- **RAM:** 16GB for large music libraries
- **Storage:** SSD for faster scanning and analysis
- **Python:** 3.8+ for audio analysis features

## 🚀 Getting Started

### Installation
1. Download the appropriate package for your platform
2. **macOS:** Mount the DMG and drag CleanCue to Applications
3. **Windows:** Run the installer and follow the setup wizard
4. **Linux:** Make the AppImage executable and run directly

### First Use
1. Launch CleanCue
2. Use "Scan Library" to import your music collection
3. Analyze tracks for BPM and key detection
4. Export to USB drives using the new export profiles
5. Manage your library with the new delete/remove features

## 🤝 Contributing

CleanCue is open source! Visit our [GitHub repository](https://github.com/CommmandrCody/CleanCue) to:
- Report bugs and request features
- Contribute code improvements
- Help with documentation
- Join our community of DJ developers

## 🙏 Acknowledgments

Special thanks to the DJ community for feedback and feature requests that shaped this release. CleanCue continues to be built by DJs, for DJs.

## 📞 Support

- **GitHub Issues:** [Report bugs and request features](https://github.com/CommmandrCody/CleanCue/issues)
- **Website:** [cleancue.com](https://cleancue.com)
- **Documentation:** Available in the app and on our website

---

**Full Changelog:** [v0.1.0...v0.2.0](https://github.com/CommmandrCody/CleanCue/compare/v0.1.0...v0.2.0)

**Download CleanCue v0.2.0:** [GitHub Releases](https://github.com/CommmandrCody/CleanCue/releases/tag/v0.2.0)