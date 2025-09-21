# CleanCue CLI Reference v0.2.3

## Power User's Complete Guide

CleanCue's command-line interface gives you **full transparency and scriptability** - everything the UI can do, and more. Perfect for automation, batch processing, and understanding exactly what's happening under the hood.

---

## Quick Start

```bash
# Install CleanCue, then access CLI
cleancue --help              # Show all commands
cleancue doctor              # Verify system health
cleancue scan ~/Music        # Scan your music library
cleancue analyze all         # Analyze everything
cleancue stats               # View detailed statistics
```

---

## Core Philosophy

**Zero Obfuscation**: Every operation shows you exactly what's happening
**Complete Control**: Scriptable automation for professional workflows
**Real-time Feedback**: Progress indicators with detailed status information
**Error Transparency**: Clear error messages with actionable guidance

---

## Commands Reference

### `cleancue scan <path> [path2] [path3] ...`

Scan directories for music files with real-time progress reporting.

```bash
# Basic scanning
cleancue scan ~/Music/DJ\ Collection

# Multiple directories
cleancue scan ~/Music ~/Downloads/tracks /Volumes/External/Music

# What you'll see:
🔍 Starting scan of 3 path(s)...
📂 Scanning: 45% (127/283) - track_name.mp3
✅ Scan complete: 15 added, 3 updated, 0 errors
```

**Advanced Usage:**
- Handles nested directories automatically
- Skips duplicate files (by path and metadata)
- Reports detailed progress for large libraries
- Shows errors with specific file paths

**Supported Formats:** MP3, FLAC, WAV, M4A, AAC, OGG

---

### `cleancue analyze [type]`

Analyze tracks using professional-grade algorithms.

```bash
# Analyze everything
cleancue analyze all

# Specific analysis types
cleancue analyze tempo        # BPM detection only
cleancue analyze key          # Musical key detection
cleancue analyze energy       # Energy analysis for cue points

# Real-time output:
🔬 Starting tempo analysis for track abc123...
🔬 Analyzing: 67%
✅ tempo analysis complete for track abc123
```

**Analysis Types:**
- **tempo/bpm**: librosa-based BPM detection with confidence scoring
- **key**: Musical key detection with Camelot wheel notation
- **energy**: Volume analysis and energy mapping for DJ cue points
- **all**: Complete analysis suite

**Technical Details:**
- Uses librosa for beat tracking and tempo estimation
- Key detection with harmonic analysis
- Energy analysis identifies intro/outro sections
- Results stored with confidence scores

---

### `cleancue stats`

Comprehensive library analytics - see exactly what you have.

```bash
cleancue stats

# Detailed output:
📊 Library Statistics:
   Total tracks: 1,847
   Total size: 12.34 GB
   Average file size: 6.8 MB
   Total duration: 5,234 minutes
   Average duration: 169 seconds

🔬 Analysis Progress:
   BPM/Tempo analyzed: 1,645/1,847 (89%)
   Key analyzed: 1,203/1,847 (65%)
   Energy analyzed: 1,847/1,847 (100%)
```

**Use Cases:**
- Track analysis progress for large libraries
- Storage planning and organization
- Quality control (identify unusually large/small files)
- Progress reporting for team workflows

---

### `cleancue list [limit]`

Browse your library with detailed metadata display.

```bash
# Show recent tracks (default: 20)
cleancue list

# Show more tracks
cleancue list 100

# Sample output:
🎵 Showing 20 tracks:

  1. Daft Punk - One More Time
     /Users/dj/Music/Daft Punk/One More Time.mp3 • 123 BPM • F# • 320s • 7.2MB

  2. Deadmau5 - Strobe
     /Users/dj/Music/deadmau5/Strobe.mp3 • 128 BPM • Gb • 645s • 15.1MB
```

**Information Displayed:**
- Artist and title (or filename if metadata missing)
- Full file path for scripting integration
- BPM (if analyzed)
- Musical key (if analyzed)
- Duration in seconds
- File size in MB

---

### `cleancue doctor`

System health check - verify everything is working.

```bash
cleancue doctor

# Output:
🏥 Running health check...
✓ Node.js: Available
✓ TypeScript: Compiled successfully
✓ CLI: Functional
✓ Engine: Loaded
✓ Database: Connected
All systems operational!
```

**Troubleshooting Tool:**
- Verifies all dependencies are available
- Tests database connectivity
- Confirms Python worker availability
- Validates audio processing capabilities

---

### `cleancue info`

Application information and feature overview.

```bash
cleancue info

# Shows:
CleanCue - Professional DJ Library Management
Version: 0.2.3
A modern tool for managing and analyzing music libraries

Features:
• Fast library scanning with metadata extraction
• BPM detection using librosa
• Musical key detection with Camelot wheel notation
• Volume analysis and clipping detection
• Energy analysis for DJ cue point generation
• Export to M3U and other DJ software formats
```

---

## Automation & Scripting

### Batch Processing Workflow

```bash
#!/bin/bash
# Professional DJ library maintenance script

echo "🎧 Starting CleanCue batch processing..."

# Scan new music directories
cleancue scan ~/Music/New\ Tracks ~/Downloads/DJ\ Music

# Analyze everything that needs analysis
cleancue analyze all

# Generate statistics report
echo "📊 Current Library Status:"
cleancue stats

# List recently added tracks
echo "🆕 Recently Added:"
cleancue list 10

echo "✅ Batch processing complete!"
```

### Integration Examples

```bash
# Check if analysis is complete before export
ANALYZED=$(cleancue stats | grep "BPM/Tempo analyzed" | cut -d'(' -f2 | cut -d'%' -f1)
if [ "$ANALYZED" -eq 100 ]; then
    echo "Library fully analyzed - ready for export"
else
    echo "Analysis incomplete: ${ANALYZED}% - running full analysis"
    cleancue analyze all
fi

# Find tracks without BPM analysis
cleancue list 1000 | grep "• •" | head -20  # Tracks missing BPM data
```

### Cron Job for Automatic Processing

```bash
# Add to crontab for daily library maintenance
# 0 2 * * * /usr/local/bin/cleancue scan ~/Music && /usr/local/bin/cleancue analyze all

# Weekly comprehensive analysis
# 0 3 * * 0 /usr/local/bin/cleancue analyze all
```

---

## Advanced Features

### Progress Monitoring

All long-running operations show detailed progress:
- **Scanning**: File count, current file being processed
- **Analysis**: Percentage complete, current track
- **Error Handling**: Specific error messages with file paths

### Real-time Events

The CLI engine emits detailed events:
- `scan:started` - Begin library scanning
- `scan:progress` - File-by-file scanning progress
- `scan:completed` - Summary with counts and errors
- `analysis:started` - Begin track analysis
- `analysis:progress` - Analysis progress percentage
- `analysis:completed` - Analysis results

### Error Handling

Comprehensive error reporting:
```bash
❌ Scan complete: 15 added, 3 updated, 2 errors
❌ Errors encountered:
   /path/to/corrupt.mp3: Unable to read metadata
   /path/to/invalid.wav: Unsupported audio format
```

---

## Performance & Optimization

### Large Library Handling

CleanCue is optimized for professional libraries:
- **Memory efficient**: Processes files individually, not in bulk
- **Interruption safe**: Can resume scanning/analysis after interruption
- **Progress tracking**: Always know where you are in large operations
- **Error isolation**: One bad file doesn't stop the entire process

### Batch Operations

```bash
# Process multiple directories efficiently
find ~/Music -name "*.mp3" -print0 | xargs -0 dirname | sort -u | while read dir; do
    cleancue scan "$dir"
done
```

---

## Integration with UI

The CLI and desktop UI share the same engine and database:
- **Seamless switching**: Use CLI for automation, UI for interaction
- **Shared progress**: Operations started in CLI visible in UI
- **Consistent results**: Identical analysis results across interfaces
- **Real-time sync**: Changes in CLI immediately reflected in UI

---

## Troubleshooting

### Common Issues

**"Command not found"**
```bash
# Ensure CleanCue is properly installed
which cleancue
# Should show: /usr/local/bin/cleancue or similar
```

**"Database connection failed"**
```bash
# Run health check
cleancue doctor
# Check database permissions and storage space
```

**"Analysis failed"**
```bash
# Verify Python dependencies
cleancue doctor
# Check individual file with detailed error
cleancue analyze tempo --verbose
```

### Debug Mode

```bash
# Enable verbose logging (when available)
DEBUG=cleancue:* cleancue scan ~/Music
```

---

## Why CLI Matters for DJs

**Professional Workflows**: Automate repetitive tasks, batch process new music
**Transparency**: See exactly what algorithms are doing to your tracks
**Integration**: Build CleanCue into larger automation systems
**Reliability**: Script complex operations that run unattended
**Control**: Fine-grained control over analysis parameters

Unlike proprietary DJ software, CleanCue gives you **complete visibility and control** over your music library management.

---

## Next Steps

1. **Try the examples** above with your music library
2. **Build automation scripts** for your specific workflow
3. **Combine with UI** for the best of both worlds
4. **Share scripts** with the CleanCue community

**Remember**: The CLI and UI are equally powerful - use whatever fits your workflow best. Power users often use CLI for automation and UI for interactive work.

---

*CleanCue CLI v0.2.3 - Built by DJs, for DJs. Complete transparency, zero vendor lock-in.*