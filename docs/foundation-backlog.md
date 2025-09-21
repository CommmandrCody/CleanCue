# CleanCue Foundation Backlog

## Priority: Foundation First - Export Later

The core principle: Build a rock-solid foundation for music library management before tackling complex export formats. DJs need to trust CleanCue as their **source of truth** for music data.

## 🚀 Recent Quick Wins (v0.2.3)

**High Impact, Low Effort implementations completed:**
- ✅ **Camelot Wheel Toggle** - DJs can switch between musical keys (Am, C#) and Camelot notation (8A, 12B) with one click
- ✅ **BPM Validation** - Intelligent tempo correction prevents 63 BPM house tracks and 240 BPM hip-hop errors
- ✅ **Settings Integration** - Key display mode and BPM ranges configurable in UI

*Combined effort: ~6 hours | Impact: Immediate DJ credibility and trust*

---

## 🎯 Phase 0: Advanced Cue Detection & Beatgrid Analysis (PRIORITY)

**Goal**: Become the definitive source of truth for beatgrids and cue points, superior to all DJ software.

### Beatgrid Precision
- [ ] Multi-algorithm beat detection (librosa, aubio, essentia)
- [ ] Variable tempo handling (live recordings, DJ mixes)
- [x] **Beat confidence scoring and validation** ✅ *v0.2.3 - Added intelligent BPM validation with half/double-time correction*
- [ ] Manual beatgrid adjustment tools
- [ ] Beatgrid drift correction for long tracks
- [ ] Sub-beat precision (16th notes, 32nd notes)

### Advanced Cue Point Detection
- [ ] **Intro Detection**: Silence analysis + energy buildup
- [ ] **Outro Detection**: Energy decay + fade analysis
- [ ] **Drop Detection**: Spectral change + energy spike analysis
- [ ] **Breakdown Detection**: Energy dips + frequency content changes
- [ ] **Vocal Detection**: Stem separation for vocal cues
- [ ] **Build-up Detection**: Progressive energy/frequency analysis

### Intelligent Cue Classification
- [ ] Confidence scoring for each cue type
- [ ] User validation and learning system
- [ ] Genre-specific cue detection (house vs hip-hop vs rock)
- [ ] Manual cue editing with snap-to-beat
- [ ] Cue point timing validation against beatgrid

### Beatgrid Validation & Quality
- [ ] Cross-validation with multiple algorithms
- [ ] Anomaly detection (impossible BPM changes)
- [ ] User feedback loop for beatgrid accuracy
- [ ] A/B testing against reference tracks
- [ ] Export validation (test against DJ software import)

### Advanced Analysis Features
- [ ] **Phrase Structure**: 8/16/32 bar phrase detection
- [ ] **Harmonic Mixing Points**: Key-compatible mix points
- [ ] **Energy Mapping**: Track energy curve for smooth transitions
- [ ] **Loop Region Suggestions**: Perfect loop points for DJs
- [ ] **Remix Points**: Ideal edit/remix locations

### Export Format Adaptation
- [ ] **Serato**: Convert to Serato's cue format and timing
- [ ] **rekordbox**: Pioneer's beatgrid and memory cue standards
- [ ] **Engine DJ**: Denon's cue point and grid format
- [ ] **Traktor**: Native Instruments' beat markers
- [ ] **VirtualDJ**: VDJ's BPM and cue structure
- [ ] **Cross-platform validation**: Test accuracy across all platforms

### Quality Assurance
- [ ] Beatgrid accuracy: >99.5% for 4/4 dance music
- [ ] Cue detection: >95% accuracy for intro/outro
- [ ] Tempo stability: Handle ±0.1 BPM variations
- [ ] Phase alignment: Sub-millisecond precision
- [ ] Format compatibility: Zero data loss in export/import

---

## 🎵 Phase 1: Smart Music Identification & Fingerprinting

### Music Fingerprinting Integration
- [ ] Integrate AcoustID/MusicBrainz for audio fingerprinting
- [ ] Implement fuzzy matching for artist/title extraction from filenames
- [ ] Create confidence scoring system for auto-suggestions vs manual review
- [ ] Handle common filename patterns:
  - `Artist - Title`
  - `[Label] Artist - Title (Remix)`
  - `01. Artist - Title`
  - `Artist - Title [Genre] (Year)`
- [ ] Batch identification with progress tracking
- [ ] Manual override system for incorrect matches

### Filename Intelligence
- [ ] Smart parsing engine for extracting metadata from filenames
- [ ] Support for various separators (-, _, [, ], (, ))
- [ ] Track number extraction and validation
- [ ] Year/date extraction from filenames
- [ ] Label/catalog number detection
- [ ] Remix/version detection (Original Mix, Radio Edit, etc.)

---

## 📺 Phase 2: Enhanced YouTube Downloader

### Playlist Intelligence
- [ ] Leverage yt-dlp playlist metadata for proper track ordering
- [ ] Extract track numbers from playlist position
- [ ] Handle multi-disc albums and mix compilations
- [ ] Smart artist/title extraction from video titles and descriptions
- [ ] Chapter marker detection for mix breakdowns

### Smart File Creation
- [ ] Intelligent filename generation using video metadata + audio analysis
- [ ] Quality validation (reject videos that are too quiet, distorted, etc.)
- [ ] Audio format optimization (best quality available)
- [ ] Automatic metadata tagging during download
- [ ] Batch processing with queue management

### Enhanced Metadata Extraction
- [ ] Parse video descriptions for track listings
- [ ] Extract BPM from video titles when available
- [ ] Genre detection from channel/playlist context
- [ ] Release date extraction from video upload date
- [ ] Thumbnail extraction for album art

---

## 🔍 Phase 3: Analysis Engine Improvements

### Advanced BPM Detection
- [ ] Multi-algorithm BPM detection with confidence scoring
- [ ] Handle variable tempo tracks (live recordings, DJ mixes)
- [x] **BPM range validation (reject impossible values)** ✅ *v0.2.3 - Configurable min/max BPM validation*
- [x] **Half/double tempo detection and correction** ✅ *v0.2.3 - Intelligent tempo correction with notes*
- [ ] User feedback loop for BPM accuracy improvements

### Enhanced Key Detection
- [ ] Multiple key detection algorithms (compare results)
- [ ] Confidence scoring for key accuracy
- [ ] Key change detection within tracks
- [ ] Harmonic minor vs major detection
- [ ] User validation and correction system

### Audio Analysis Features
- [ ] Genre classification using audio features + metadata
- [ ] Energy/mood analysis (danceability, valence, energy)
- [ ] Intro/outro detection for DJ mixing
- [ ] Vocal detection and stem preview
- [ ] Dynamic range analysis for mastering quality

### Analysis Validation
- [ ] Cross-reference analysis results with known databases
- [ ] Anomaly detection (flag suspicious results)
- [ ] Batch re-analysis with improved algorithms
- [ ] Analysis history and version tracking

---

## 🎨 Phase 4: Key Display & Camelot Wheel

### Visual Key System
- [ ] Color-coded key visualization (traditional color wheel)
- [x] **Camelot wheel integration with harmonic mixing** ✅ *v0.2.3 - Full Camelot notation support*
- [x] **Toggle between musical keys (Am, C#) and Camelot codes (8A, 12B)** ✅ *v0.2.3 - UI toggle in LibraryView*
- [ ] Key compatibility indicators in track listings
- [ ] Harmonic progression suggestions

### User Preferences
- [ ] Notation system preference (Standard, Camelot, Open Key)
- [ ] Color scheme customization
- [ ] Key display options in different views
- [ ] Harmonic mixing assistant tools
- [ ] Key transition recommendations

---

## 🏷️ Phase 5: Robust Tagging Foundation

### Metadata Management
- [ ] Undo/redo system for all metadata changes
- [ ] Batch operations with live preview
- [ ] Custom tag fields for DJ-specific data (cue points, notes, ratings)
- [ ] Tag validation and cleanup suggestions
- [ ] Duplicate detection and merging

### Advanced Editing Features
- [ ] Smart auto-correction for common misspellings
- [ ] Genre standardization and suggestions
- [ ] Artist name normalization (featuring, vs, &, etc.)
- [ ] Album grouping and compilation detection
- [ ] Release date validation and formatting

### Import/Export & Backup
- [ ] Tag preset import/export
- [ ] Metadata backup before batch operations
- [ ] Change history with rollback capability
- [ ] CSV export/import for bulk editing
- [ ] Integration with external tagging tools

---

## 🎛️ Phase 6: UI/UX Polish

### Library View Enhancements
- [ ] Expandable logging window (from previous todos)
- [ ] Enhanced queue monitoring for STEM separation
- [ ] Improved track visualization with stem indicators
- [ ] Advanced filtering and search capabilities
- [ ] Column customization and sorting preferences

### Workflow Improvements
- [ ] Streamlined metadata enrichment workflow
- [ ] Batch selection tools
- [ ] Drag-and-drop functionality
- [ ] Keyboard shortcuts for common operations
- [ ] Progress indicators for all long-running operations

### Performance & Responsiveness
- [ ] Virtual scrolling for large libraries
- [ ] Lazy loading of metadata and artwork
- [ ] Background processing indicators
- [ ] Memory optimization for large datasets
- [ ] Responsive design for different screen sizes

---

## 🔧 Phase 7: File Management & Safety

### Robust File Operations
- [ ] Safe file operations with rollback capability
- [ ] Preview changes before applying them
- [ ] Atomic operations (all-or-nothing updates)
- [ ] File locking to prevent corruption
- [ ] Network drive and symlink handling

### Cross-Platform Compatibility
- [ ] Filename sanitization for different filesystems
- [ ] Character encoding handling (UTF-8, Latin-1, etc.)
- [ ] Path length limitations (Windows MAX_PATH)
- [ ] Case sensitivity handling (macOS vs Linux)
- [ ] Permission management and validation

### Backup & Recovery
- [ ] Automatic backup before major operations
- [ ] Library state snapshots
- [ ] Incremental backup system
- [ ] Import/export of entire library configurations
- [ ] Disaster recovery procedures

---

## 📊 Success Metrics

### Quality Indicators
- **Fingerprinting Accuracy**: >95% correct identification for commercial releases
- **Analysis Reliability**: <1% false positives for BPM/key detection
- **Import Success Rate**: >99% successful import without errors
- **User Trust**: Zero data loss incidents, all operations reversible

### Performance Targets
- **Large Library Support**: Handle 50,000+ tracks smoothly
- **Analysis Speed**: <30 seconds per track for full analysis
- **UI Responsiveness**: <200ms for all common operations
- **Memory Efficiency**: <2GB RAM usage for typical libraries

---

## 🚀 Future Export Phase (After Foundation)

Once foundation is bulletproof:
- Serato crate file reverse engineering
- rekordbox XML with full cue point support
- Engine DJ database integration
- Traktor NML compatibility
- Cross-platform playlist conversion
- Format validation and quality assurance

---

## 📝 Implementation Notes

- Work on one phase at a time to avoid dependency issues
- Test each feature thoroughly before moving to next phase
- Maintain backward compatibility throughout development
- Document all APIs and data formats
- Regular user testing with real DJ workflows
- Performance benchmarking at each milestone

**Remember**: The goal is making CleanCue the tool DJs reach for to organize and clean their music library, not just convert it. Quality and reliability over feature count.