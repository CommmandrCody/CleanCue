#!/bin/bash

# GitHub Issues Creation Script for CleanCue Foundation Backlog
# Requires: gh CLI tool (brew install gh)

set -e

echo "🚀 Creating GitHub Issues from CleanCue Foundation Backlog..."

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Please authenticate with GitHub: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI ready. Creating labels first..."

# Create labels
echo "🏷️ Creating GitHub labels..."

gh label create "phase-0" --description "Phase 0: Advanced Cue Detection" --color "ff0000" || echo "Label phase-0 might already exist"
gh label create "phase-1" --description "Phase 1: Music Identification" --color "ff8800" || echo "Label phase-1 might already exist"
gh label create "phase-2" --description "Phase 2: YouTube Enhancement" --color "ffaa00" || echo "Label phase-2 might already exist"
gh label create "ui" --description "User Interface" --color "0088ff" || echo "Label ui might already exist"
gh label create "priority-high" --description "High Priority" --color "ff0000" || echo "Label priority-high might already exist"
gh label create "priority-medium" --description "Medium Priority" --color "ffaa00" || echo "Label priority-medium might already exist"
gh label create "priority-low" --description "Low Priority" --color "00ff00" || echo "Label priority-low might already exist"

echo "✅ Labels created. Creating issues..."

# Phase 0: Advanced Cue Detection & Beatgrid Analysis (PRIORITY)
echo "📍 Creating Phase 0 issues..."

gh issue create \
  --title "🎯 Phase 0: Implement Multi-Algorithm Beat Detection" \
  --body "## Goal
Implement multiple beat detection algorithms (librosa, aubio, essentia) with cross-validation for superior accuracy.

## Acceptance Criteria
- [ ] Integrate librosa beat detection
- [ ] Integrate aubio beat detection
- [ ] Integrate essentia beat detection
- [ ] Cross-validate results across algorithms
- [ ] Confidence scoring system
- [ ] Handle variable tempo tracks
- [ ] >99.5% accuracy for 4/4 dance music

## Phase
**Phase 0: Advanced Cue Detection & Beatgrid Analysis**

## Priority
🔥 **HIGH** - Foundation for all export capabilities

## Technical Notes
- Use existing Python worker infrastructure
- Extend tempo_worker.py with multi-algorithm support
- Add confidence scoring and validation logic

## Related
Part of foundation-first approach before export formats." \
  --label "phase-0,enhancement,priority-high" \
  --milestone "Phase 0 Complete"

gh issue create \
  --title "🎯 Phase 0: Advanced Cue Point Detection System" \
  --body "## Goal
Implement intelligent cue point detection for intro, outro, drops, breakdowns, and vocal sections.

## Acceptance Criteria
- [ ] Intro detection (silence analysis + energy buildup)
- [ ] Outro detection (energy decay + fade analysis)
- [ ] Drop detection (spectral change + energy spike)
- [ ] Breakdown detection (energy dips + frequency changes)
- [ ] Vocal detection using STEM separation
- [ ] Build-up detection (progressive energy analysis)
- [ ] >95% accuracy for intro/outro detection

## Phase
**Phase 0: Advanced Cue Detection & Beatgrid Analysis**

## Priority
🔥 **HIGH** - Critical for DJ workflow

## Technical Notes
- Leverage existing STEM separation for vocal cues
- Use spectral analysis for energy/frequency detection
- Implement confidence scoring for each cue type

## Related
Depends on STEM separation infrastructure already built." \
  --label "phase-0,enhancement,priority-high"

gh issue create \
  --title "🎯 Phase 0: Export Format Adaptation System" \
  --body "## Goal
Create adapters to convert CleanCue's superior beatgrids and cues to each DJ software's format.

## Acceptance Criteria
- [ ] Serato cue format conversion
- [ ] rekordbox beatgrid and memory cue standards
- [ ] Engine DJ cue point and grid format
- [ ] Traktor beat markers format
- [ ] VirtualDJ BPM and cue structure
- [ ] Cross-platform validation testing
- [ ] Zero data loss in export/import cycles

## Phase
**Phase 0: Advanced Cue Detection & Beatgrid Analysis**

## Priority
🔥 **HIGH** - Enables competitive advantage

## Technical Notes
- Research each platform's cue format specifications
- Create format-specific export modules
- Implement validation testing against actual DJ software

## Related
Builds on multi-algorithm detection and cue point systems." \
  --label "phase-0,enhancement,priority-high"

# Phase 1: Smart Music Identification
echo "📍 Creating Phase 1 issues..."

gh issue create \
  --title "🎵 Phase 1: Integrate AcoustID/MusicBrainz Fingerprinting" \
  --body "## Goal
Implement audio fingerprinting to automatically identify tracks and populate metadata.

## Acceptance Criteria
- [ ] AcoustID integration for audio fingerprinting
- [ ] MusicBrainz database lookup for metadata
- [ ] Confidence scoring for identification accuracy
- [ ] Manual override system for incorrect matches
- [ ] Batch identification with progress tracking
- [ ] >95% accuracy for commercial releases

## Phase
**Phase 1: Smart Music Identification & Fingerprinting**

## Priority
🟡 **MEDIUM** - Foundation enhancement

## Technical Notes
- Use AcoustID Python library
- Implement rate limiting for API calls
- Cache results to avoid re-identification

## Related
Foundation for intelligent metadata management." \
  --label "phase-1,enhancement,priority-medium"

gh issue create \
  --title "🎵 Phase 1: Intelligent Filename Parsing" \
  --body "## Goal
Smart parsing engine to extract metadata from various filename patterns.

## Acceptance Criteria
- [ ] Support common patterns: 'Artist - Title', '[Label] Artist - Title (Remix)'
- [ ] Track number extraction and validation
- [ ] Year/date extraction from filenames
- [ ] Label/catalog number detection
- [ ] Remix/version detection (Original Mix, Radio Edit, etc.)
- [ ] Fuzzy matching for artist/title extraction

## Phase
**Phase 1: Smart Music Identification & Fingerprinting**

## Priority
🟡 **MEDIUM** - Quality of life improvement

## Technical Notes
- Use regex patterns for common formats
- Implement fuzzy string matching
- Support various separators and brackets

## Related
Complements fingerprinting for comprehensive identification." \
  --label "phase-1,enhancement,priority-medium"

# Phase 2: Enhanced YouTube Downloader
echo "📍 Creating Phase 2 issues..."

gh issue create \
  --title "📺 Phase 2: YouTube Playlist Intelligence" \
  --body "## Goal
Leverage yt-dlp playlist metadata for proper track ordering and enhanced metadata extraction.

## Acceptance Criteria
- [ ] Extract track numbers from playlist position
- [ ] Handle multi-disc albums and mix compilations
- [ ] Smart artist/title extraction from video titles/descriptions
- [ ] Chapter marker detection for mix breakdowns
- [ ] Playlist-context genre detection

## Phase
**Phase 2: Enhanced YouTube Downloader**

## Priority
🟢 **LOW** - Feature enhancement

## Technical Notes
- Extend existing youtube-downloader.py
- Use yt-dlp's playlist metadata APIs
- Implement intelligent parsing for video descriptions

## Related
Builds on existing YouTube downloader infrastructure." \
  --label "phase-2,enhancement,priority-low"

# UI/UX Improvements
echo "📍 Creating UI/UX issues..."

gh issue create \
  --title "🎛️ UI: Enhanced Queue Monitoring for STEM Separation" \
  --body "## Goal
Improve real-time monitoring of STEM separation queue with detailed progress and status indicators.

## Acceptance Criteria
- [ ] Real-time queue status updates
- [ ] Individual job progress indicators
- [ ] Estimated time remaining
- [ ] Cancel/retry functionality
- [ ] Error state handling and retry options
- [ ] Queue prioritization controls

## Phase
**Phase 6: UI/UX Polish**

## Priority
🟡 **MEDIUM** - User experience critical

## Technical Notes
- Enhance existing StemQueueDialog component
- Improve WebSocket communication for real-time updates
- Add job management controls

## Related
From current todo list - builds on existing STEM infrastructure." \
  --label "ui,enhancement,priority-medium"

gh issue create \
  --title "🎛️ UI: Expandable Logging Window" \
  --body "## Goal
Add expandable logging window for power users to monitor system operations and troubleshoot issues.

## Acceptance Criteria
- [ ] Collapsible/expandable log panel
- [ ] Real-time log streaming
- [ ] Log level filtering (error, warn, info, debug)
- [ ] Search and filter capabilities
- [ ] Export logs functionality
- [ ] Clear logs option

## Phase
**Phase 6: UI/UX Polish**

## Priority
🟢 **LOW** - Power user feature

## Technical Notes
- Add new logging component to main UI
- Stream logs from Electron main process
- Implement log filtering and search

## Related
From current todo list - enhances debugging capabilities." \
  --label "ui,enhancement,priority-low"

echo "✅ GitHub Issues created successfully!"
echo ""
echo "🎯 Next Steps:"
echo "1. Create GitHub Project board"
echo "2. Set up milestones for each phase"
echo "3. Organize issues into project columns"
echo "4. Begin development on Phase 0 priorities"