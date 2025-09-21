# CleanCue Desktop UI Guide v0.2.3

## Professional DJ Library Management Made Simple

CleanCue's desktop interface combines **intuitive workflow** with **complete transparency** - beautiful enough for daily use, powerful enough for professional DJs.

---

## Getting Started

### First Launch

1. **Welcome Screen**: Choose to scan existing music or import from DJ software
2. **Library Setup**: Point CleanCue to your music directories
3. **Initial Scan**: Watch real-time progress as your library is indexed
4. **Analysis Options**: Choose which analysis to run (BPM, key, energy)

### Main Interface Overview

```
┌─ Header Bar ─────────────────────────────────────────────┐
│ 🎧 CleanCue    Library (1,847)    🔍 Search    ⚙️ Settings │
├─ Navigation ─────────────────────────────────────────────┤
│ 📚 Library  📊 Analysis  📥 Import  📤 Export  🎛️ Tools    │
├─ Main Content ──────────────────────────────────────────┤
│                                                          │
│    [Track listing with sortable columns]                │
│    [Real-time analysis progress]                        │
│    [Metadata editing panels]                            │
│                                                          │
├─ Status Bar ────────────────────────────────────────────┤
│ ✅ Ready  |  Analysis: 89% complete  |  🔄 Background jobs │
└──────────────────────────────────────────────────────────┘
```

---

## Core Features

### Library Management

**Smart Scanning**
- Drag & drop folders to scan instantly
- Real-time progress with file-by-file updates
- Automatic duplicate detection and handling
- Support for nested directory structures

**Track Display**
- Sortable columns: Artist, Title, BPM, Key, Duration, File Size
- Color-coded analysis status (complete, in-progress, needs analysis)
- Quick preview with built-in audio player
- Metadata editing with auto-save

**Search & Filtering**
- Real-time search across all metadata fields
- Filter by analysis status, file type, BPM range
- Save common filter combinations
- Advanced search with multiple criteria

### Analysis Engine

**BPM Detection**
- Professional librosa-based algorithm
- Real-time progress indicator with track names
- Confidence scoring (displayed as color intensity)
- Handle variable tempo and complex rhythms

**Key Detection**
- Musical key analysis with Camelot wheel support
- Toggle between standard notation (Am, C#) and Camelot codes (8A, 12B)
- Harmonic mixing compatibility indicators
- Color-coded key wheel visualization

**STEM Separation**
- Professional htdemucs model for studio-quality separation
- 4-stem output: drums, bass, other, vocals
- Queue management with priority controls
- Preview separated stems before export

### Real-time Transparency

**Live Progress Monitoring**
```
🔬 Analysis Queue (3 remaining)
├─ Currently Processing: "Daft Punk - One More Time.mp3"
│  └─ BPM Analysis: ████████░░ 87%
├─ Next: "Deadmau5 - Strobe.mp3"
└─ Queued: "Skrillex - Bangarang.mp3"

Background Tasks:
├─ Library scan: ✅ Complete (1,847 tracks processed)
├─ BPM analysis: 🔄 Running (234/1,847 remaining)
└─ STEM separation: ⏸️ Paused (5 jobs queued)
```

**Detailed Logging** (Expandable Panel)
```
[14:23:15] 🔍 Starting library scan: ~/Music/DJ Collection
[14:23:16] 📂 Processing: /Users/dj/Music/Track001.mp3
[14:23:16] ✅ Added: Daft Punk - One More Time [123 BPM, F#]
[14:23:17] 📂 Processing: /Users/dj/Music/Track002.mp3
[14:23:18] ⚠️  Warning: No BPM metadata found, queuing for analysis
[14:23:19] ✅ Added: Deadmau5 - Strobe [128 BPM, Gb]
```

---

## Advanced Workflows

### Professional DJ Prep

**New Track Processing**
1. **Drag & Drop**: New tracks into CleanCue
2. **Auto-Analysis**: BPM and key detection starts immediately
3. **Quality Check**: Review analysis confidence scores
4. **Manual Adjustment**: Fine-tune beatgrids if needed
5. **STEM Preview**: Generate stems for advanced mixing
6. **Export Ready**: Export to your DJ software of choice

**Library Maintenance**
1. **Health Check**: Dashboard shows analysis completion percentage
2. **Missing Data**: Filter for tracks needing analysis
3. **Batch Processing**: Select multiple tracks for bulk operations
4. **Duplicate Management**: Find and merge duplicate entries
5. **Metadata Cleanup**: Standardize artist names and genres

### Producer Workflows

**Stem Management**
- **High-Quality Separation**: htdemucs model for production use
- **Batch Processing**: Queue multiple tracks for overnight processing
- **Preview System**: Listen to separated stems before export
- **Organization**: Automatic folder structure creation
- **Format Options**: WAV, FLAC output for maximum quality

**Analysis for Remixing**
- **Detailed BPM**: Sub-beat precision for perfect loops
- **Key Relationships**: Harmonic analysis for mashups
- **Energy Mapping**: Identify perfect edit points
- **Cue Point Detection**: Automatic intro/outro marking

### Mobile DJ Organization

**Gig Preparation**
- **Smart Playlists**: Auto-generate by BPM range, key compatibility
- **Energy Flow**: Visualize track energy for smooth sets
- **Export Formats**: Support for all major DJ software
- **Backup Systems**: Multiple export options for redundancy

**Library Sync**
- **Multi-Platform**: Same analysis works across all DJ software
- **Version Control**: Track changes and maintain consistency
- **Cloud Backup**: Export analysis data for backup/sharing

---

## Interface Components

### Header Bar

**Library Counter**: Shows total tracks with real-time updates
**Search Bar**: Instant search across all metadata fields
**Settings Access**: Quick access to preferences and configuration

### Navigation Tabs

**📚 Library**: Main track browser and management
**📊 Analysis**: Batch analysis tools and progress monitoring
**📥 Import**: Import from other DJ software and file formats
**📤 Export**: Export to various DJ software formats
**🎛️ Tools**: Utilities, preferences, and advanced features

### Track Listing

**Sortable Columns**:
- **Artist/Title**: Primary track identification
- **BPM**: Tempo with confidence indicators
- **Key**: Musical key with Camelot notation option
- **Duration**: Track length in minutes:seconds
- **Size**: File size for storage planning
- **Status**: Analysis completion status

**Row Actions**:
- **Double-click**: Preview track with built-in player
- **Right-click**: Context menu with analysis options
- **Select multiple**: Bulk operations on selected tracks

### Status Indicators

**Color Coding**:
- 🟢 **Green**: Analysis complete with high confidence
- 🟡 **Yellow**: Analysis complete with medium confidence
- 🔴 **Red**: Analysis failed or very low confidence
- ⚪ **Gray**: Not yet analyzed

**Progress Indicators**:
- **Spinning**: Currently being analyzed
- **Queue number**: Position in analysis queue
- **Percentage**: Real-time analysis progress

### Side Panels

**Metadata Editor**:
- Edit track information inline
- Auto-save changes
- Bulk editing for multiple tracks
- Undo/redo support

**Analysis Details**:
- Confidence scores for each analysis type
- Manual override options
- Re-analysis triggers
- Technical details for power users

---

## Customization & Settings

### Display Preferences

**Column Visibility**: Show/hide columns based on your workflow
**Color Themes**: Light, dark, and DJ-optimized themes
**Font Sizes**: Accessibility options for different screen sizes
**Key Notation**: Toggle between standard (Am) and Camelot (8A)

### Analysis Settings

**BPM Detection**:
- Confidence threshold settings
- Handle complex rhythms (triplets, polyrhythms)
- Tempo range restrictions (e.g., 120-140 for house music)

**Key Detection**:
- Algorithm selection (harmonic vs. melodic focus)
- Confidence scoring preferences
- Major/minor detection sensitivity

**STEM Separation**:
- Model selection (quality vs. speed trade-offs)
- Output format preferences (WAV, FLAC)
- Automatic cleanup options

### Integration Settings

**File Management**:
- Automatic file organization rules
- Backup preferences
- Network drive handling

**Export Options**:
- Default export formats
- Filename conventions
- Metadata mapping rules

---

## Troubleshooting & Tips

### Performance Optimization

**Large Libraries (10,000+ tracks)**:
- Enable virtual scrolling for smooth browsing
- Use background analysis during off-hours
- Implement smart caching for instant startup

**System Resources**:
- Monitor CPU usage during analysis
- Adjust analysis thread count based on hardware
- Use SSD storage for best performance

### Common Issues

**Analysis Stuck**: Use the expandable logging panel to see exactly what's happening
**Missing Tracks**: Check the detailed scan log for errors and paths
**Export Problems**: Verify target software compatibility in settings

### Power User Tips

**Keyboard Shortcuts**:
- `Cmd/Ctrl + F`: Focus search bar
- `Space`: Preview selected track
- `Cmd/Ctrl + A`: Select all visible tracks
- `Delete`: Remove selected tracks from library

**Advanced Filtering**:
- Use multiple criteria for complex searches
- Save filter combinations for repeated use
- Combine with sorting for powerful organization

**Batch Operations**:
- Select tracks with Shift+click for ranges
- Use Cmd/Ctrl+click for individual selection
- Right-click for bulk operations menu

---

## Integration with CLI

**Seamless Workflow**:
- Start batch operations in CLI, monitor progress in UI
- Use CLI for automation, UI for interactive work
- Real-time sync between interfaces
- Consistent results across both tools

**Best Practices**:
- CLI for large batch operations (overnight analysis)
- UI for track-by-track review and editing
- Combine both for professional workflows

---

## Expandable Logging System

### Real-time Transparency

The expandable logging window gives you **complete visibility** into CleanCue's operations:

**Scanning Operations**:
```
[14:23:15] 🔍 Starting directory scan: ~/Music/DJ Collection
[14:23:15] 📁 Found directory: ~/Music/DJ Collection/House
[14:23:15] 📁 Found directory: ~/Music/DJ Collection/Techno
[14:23:16] 📂 Processing: Track001.mp3 (1/1,847)
[14:23:16] 🎵 Extracted metadata: Artist="Daft Punk", Title="One More Time"
[14:23:16] ✅ Added to library: [ID: abc123] Daft Punk - One More Time
[14:23:17] 📂 Processing: Track002.mp3 (2/1,847)
```

**Analysis Operations**:
```
[14:25:30] 🔬 Starting BPM analysis: Track ID abc123
[14:25:30] 🎵 Loading audio: /Users/dj/Music/Track001.mp3
[14:25:31] 📊 Running beat tracking algorithm (librosa)
[14:25:33] 🎯 Detected BPM: 123.45 (confidence: 0.94)
[14:25:33] ✅ Analysis complete: BPM=123, confidence=high
[14:25:34] 💾 Saved analysis results to database
```

**STEM Separation**:
```
[14:30:00] 🎛️ Starting STEM separation: Track ID abc123
[14:30:00] 🔧 Using model: htdemucs (4-stem, high quality)
[14:30:01] 📁 Created output directory: ~/stems/abc123/
[14:30:01] 🎵 Loading audio for separation...
[14:30:15] 🎛️ Separating: drums stem (25% complete)
[14:30:30] 🎛️ Separating: bass stem (50% complete)
[14:30:45] 🎛️ Separating: other stem (75% complete)
[14:31:00] 🎛️ Separating: vocals stem (100% complete)
[14:31:01] ✅ STEM separation complete: 4 files created
[14:31:01] 📁 Stems saved to: ~/stems/abc123/Track001_[stem].wav
```

**Error Handling**:
```
[14:35:12] ❌ Error processing: /path/to/corrupt.mp3
[14:35:12] 🔍 Error details: Unable to decode audio file
[14:35:12] 💡 Suggestion: Check file integrity or format support
[14:35:12] ⏭️ Continuing with next file...
```

### Log Management

**Filtering Options**:
- Show only errors and warnings
- Filter by operation type (scan, analysis, export)
- Search log entries by keyword
- Time-based filtering (last hour, today, etc.)

**Export & Sharing**:
- Save logs to file for troubleshooting
- Copy specific entries for support requests
- Clear logs while preserving current session

---

## Why UI Transparency Matters

**Professional Confidence**: See exactly what CleanCue is doing to your valuable music library
**Debugging Power**: Understand and fix issues when they occur
**Learning Tool**: Understand how professional audio analysis works
**Trust Building**: No black boxes - every operation is visible and explainable

Unlike other DJ software that hides their processes, CleanCue shows you everything. This transparency builds trust and gives you the knowledge to optimize your workflow.

---

## Next Steps

1. **Explore the interface** with your own music library
2. **Try different analysis settings** to find what works for your style
3. **Use the logging window** to understand how the algorithms work
4. **Experiment with STEM separation** for advanced mixing techniques
5. **Combine UI and CLI** for the ultimate power user workflow

**Remember**: CleanCue's UI is designed for both **ease of use** and **complete transparency**. Whether you're a bedroom DJ or a festival headliner, you have the tools and information you need to manage your music library professionally.

---

*CleanCue Desktop v0.2.3 - Beautiful interface, complete transparency, zero vendor lock-in.*