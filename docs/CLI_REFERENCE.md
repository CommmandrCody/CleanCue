# CleanCue CLI Reference

**The iron-clad command-line interface for professional DJ library management**

CleanCue CLI v0.2.4 provides a robust, modular command-line interface for scanning, analyzing, and managing DJ music libraries. Built for automation, scripting, and large-scale operations.

## Quick Start

```bash
# Install CleanCue
pnpm install

# Build the CLI
pnpm --filter @cleancue/cli run build

# Basic usage
./packages/cli/bin/cleancue help
./packages/cli/bin/cleancue scan ~/Music/DJ-Library
./packages/cli/bin/cleancue stats
```

## Core Philosophy

- **Iron-clad reliability** - 36 comprehensive tests ensure bulletproof operation
- **Modular design** - Easy to test individual files and components
- **Shell automation** - Perfect for scripting and batch operations
- **Standalone operation** - Works independently from the UI
- **JSON storage** - Simple, transparent data persistence

## Available Commands

### `help` - Get Help
```bash
cleancue help
```
Shows usage information and available commands.

### `scan <paths...>` - Scan Music Libraries
```bash
# Scan single directory
cleancue scan ~/Music/DJ-Library

# Scan multiple directories
cleancue scan ~/Music/House ~/Music/Techno ~/Music/Breaks

# Scan with verbose output
cleancue scan ~/Music --verbose
```

**What it does:**
- Recursively scans directories for audio files (MP3, FLAC, WAV, M4A, etc.)
- Extracts basic metadata (title, artist, album, BPM, key)
- Stores track information in JSON database
- Reports scan results (files found, added, updated, errors)

**Output:**
```
🔍 Starting library scan...
📁 Scanning: /Users/dj/Music/House
   Found 250 audio files
   Added 247 new tracks
   Updated 3 existing tracks
   Errors: 0

✅ Scan complete! Total time: 12.3s
```

### `analyze [type]` - Analyze Audio Features
```bash
# Analyze all unanalyzed tracks
cleancue analyze all

# Analyze specific features
cleancue analyze bpm     # BPM/tempo detection
cleancue analyze key     # Musical key detection
cleancue analyze energy  # Energy level analysis
```

**Analysis Types:**
- **`all`** - Complete analysis (BPM + Key + Energy)
- **`bmp/tempo`** - BPM and tempo detection
- **`key`** - Musical key in Camelot notation
- **`energy`** - Energy level (0-100 scale)

**Output:**
```
🔬 Starting bpm analysis...
📊 Found 127 tracks needing BPM analysis
🎵 [1/127] Analyzing: Artist - Track Name... ✅ 128.0 BPM
🎵 [2/127] Analyzing: Another - Song Title... ✅ 132.5 BPM
...
✅ Analysis complete! Analyzed 127 tracks in 45.2s
```

### `stats` - Library Statistics
```bash
cleancue stats
```

**Displays:**
- Total tracks and library size
- Analysis progress (BPM, Key, Energy completion %)
- Average file size and duration
- Comprehensive health metrics

**Output:**
```
📊 Library Statistics:
   Total tracks: 2,847
   Total size: 15.2 GB
   Average file size: 5.6 MB
   Total duration: 198 hours 23 minutes
   Average duration: 251 seconds

🔬 Analysis Progress:
   BPM/Tempo analyzed: 2,847/2,847 (100%)
   Key analyzed: 2,652/2,847 (93%)
   Energy analyzed: 2,401/2,847 (84%)
```

### `list` - List Library Contents
```bash
# List all tracks
cleancue list

# List with analysis info
cleancue list --analysis

# List specific format
cleancue list --format=json
cleancue list --format=csv
```

### `doctor` - System Health Check
```bash
cleancue doctor
```

**Checks:**
- Node.js and TypeScript availability
- CLI functionality
- Engine connectivity
- Database accessibility
- Library indexing status

**Output:**
```
🏥 Running health check...
✓ Node.js: Available
✓ TypeScript: Compiled successfully
✓ CLI: Functional
✓ Engine: Loaded
✓ Database: Connected
✓ Library: 2,847 tracks indexed
All systems operational!
```

## Advanced Usage

### Automation & Scripting

**Batch Processing Script:**
```bash
#!/bin/bash
# CleanCue automation example

# Scan new music directories
cleancue scan ~/Downloads/New-Music ~/Music/Incoming

# Analyze everything
cleancue analyze all

# Generate statistics report
cleancue stats > library-report-$(date +%Y%m%d).txt

echo "✅ Library processing complete!"
```

**Cron Job Example:**
```bash
# Daily library scan and analysis
0 2 * * * cd /home/dj/cleancue && ./packages/cli/bin/cleancue scan ~/Music && ./packages/cli/bin/cleancue analyze all
```

### Integration Examples

**CI/CD Pipeline:**
```yaml
# .github/workflows/library-check.yml
name: Library Health Check
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Run CLI tests
        run: pnpm --filter @cleancue/cli run test
      - name: Health check
        run: ./packages/cli/bin/cleancue doctor
```

**Library Validation Script:**
```bash
#!/bin/bash
# Validate library integrity

echo "🔍 Checking library health..."
cleancue doctor

echo "📊 Current statistics:"
cleancue stats

echo "🔬 Finding unanalyzed tracks..."
UNANALYZED=$(cleancue list --analysis | grep "No BPM" | wc -l)
if [ $UNANALYZED -gt 0 ]; then
    echo "⚠️  Found $UNANALYZED tracks needing analysis"
    cleancue analyze all
else
    echo "✅ All tracks analyzed!"
fi
```

## File Formats Supported

**Audio Files:**
- MP3 (all bitrates)
- FLAC (lossless)
- WAV (uncompressed)
- M4A/AAC (Apple)
- AIFF (Apple)
- OGG Vorbis
- WMA (Windows)

**Metadata Standards:**
- ID3v2.3/ID3v2.4 tags
- Vorbis comments
- iTunes/QuickTime atoms
- BWF (Broadcast Wave Format)

## Error Handling

The CLI provides detailed error reporting and graceful failure handling:

```bash
# File access errors
❌ Error: Permission denied accessing '/protected/folder'
💡 Solution: Check folder permissions or run with appropriate privileges

# Analysis failures
❌ Error: Unable to analyze BPM for 'corrupted-file.mp3'
💡 Solution: File may be corrupted or in unsupported format

# Engine connectivity
❌ Error: Engine not initialized
💡 Solution: Ensure all dependencies are installed and built
```

## Performance Optimization

**For Large Libraries (10,000+ tracks):**
```bash
# Use batch processing
cleancue scan ~/Music/Part1 && cleancue analyze all
cleancue scan ~/Music/Part2 && cleancue analyze all

# Monitor system resources
htop  # Watch CPU/memory during analysis

# Consider parallel processing
cleancue analyze bpm &
cleancue analyze key &
wait
```

**Memory Usage:**
- Scanning: ~50MB per 10,000 tracks
- Analysis: ~100MB per concurrent job
- Storage: ~1KB JSON per track

## Testing & Development

**Run the test suite:**
```bash
# All tests (36 comprehensive tests)
pnpm --filter @cleancue/cli run test

# Watch mode for development
pnpm --filter @cleancue/cli run test:watch

# Coverage report
pnpm --filter @cleancue/cli run test:coverage
```

**Test Categories:**
- **Command execution** - All CLI commands work correctly
- **Library scanning** - File discovery and metadata extraction
- **Analysis integration** - Audio processing functionality
- **Error handling** - Graceful failure and recovery
- **Data persistence** - JSON storage reliability

## Configuration

The CLI uses simple JSON configuration stored in your home directory:

**Location:** `~/.cleancue/config.json`

```json
{
  "libraryPath": "~/Music",
  "analysisQuality": "high",
  "maxConcurrentJobs": 4,
  "logLevel": "info"
}
```

## Exit Codes

The CLI follows standard Unix conventions:

- `0` - Success
- `1` - General error
- `2` - Invalid usage/arguments
- `3` - File/directory not found
- `4` - Permission denied
- `5` - Analysis failure

## Getting Help

**Built-in Help:**
```bash
cleancue help
cleancue help scan  # Command-specific help
```

**Documentation:**
- [Main README](../README.md) - Project overview
- [UI Guide](./UI_GUIDE.md) - Desktop application
- [Development](../CLAUDE.md) - Development setup

**Issues & Support:**
- GitHub Issues: https://github.com/cleancue/cleancue/issues
- CLI Test Suite: 36 passing tests ensure reliability

---

**CleanCue CLI v0.2.4** - Built for professional DJs who demand reliability and performance.