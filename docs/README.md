# CleanCue Documentation

## 🎧 Professional DJ Library Management

**Built by DJs, for DJs. Simplified, powerful, and reliable.**

---

## 📚 Documentation Index

### 🚀 Getting Started
- **[Main README](../README.md)** - Complete feature overview and installation
- **[CLAUDE.md](../CLAUDE.md)** - Development guide and commands

### 🖥️ Desktop Application
- **[Complete UI Guide](./UI_GUIDE.md)** - Comprehensive desktop interface documentation
- **Modern Electron-React UI** with professional DJ workflow features
- **Audio Player Integration** with waveform display, cue points, and preview
- **YouTube Downloader** with high-quality audio extraction and library integration
- **STEM Separation** with AI-powered vocal/instrumental isolation
- **Smart DJ Features** with harmonic mixing and BPM compatibility analysis

### ⌨️ Command Line Interface
- **[Complete CLI Reference](./CLI_REFERENCE.md)** - Full command documentation and examples
- **Iron-clad modular CLI** for shell automation and large-scale operations
- **Comprehensive test coverage** (36 passing tests)
- **Standalone operation** decoupled from UI for maximum flexibility
- **Professional automation** with scripting examples and integration guides

### 🔧 Architecture
- **Simplified Engine** - JSON-based storage replacing complex database system
- **Modular Design** - CLI and UI components can operate independently
- **YouTube Integration** - Direct yt-dlp integration without complex workers
- **DJ Features** - BPM, Key, Energy, and Cue Points in lightweight system

### 📊 Technical Details
- **TypeScript ES Modules** throughout
- **Electron Desktop App** with React UI
- **pnpm Workspaces** monorepo structure
- **Comprehensive Testing** with Jest and Vitest
- **Automated CI/CD** pipeline with health checks

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build everything
pnpm run build

# Run desktop app in development
pnpm run dev

# Run CLI tests
pnpm --filter @cleancue/cli run test

# Full CI pipeline
pnpm run ci
```

## Core Philosophy

CleanCue v0.2.4 represents a return to simplicity:
- **Removed 1.1GB workers package** in favor of lightweight solutions
- **JSON storage** instead of complex database systems
- **Direct tool integration** (yt-dlp) instead of abstraction layers
- **Modular testing** enabling easy validation of individual components
- **Preserved full DJ functionality** while drastically reducing complexity

The result is a system that's easier to understand, test, and maintain while delivering all the professional DJ features you need.