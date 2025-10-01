# CleanCue Extended Analysis Pipeline

## Overview
CleanCue's professional DJ analysis pipeline processes tracks through 5 specialized jobs to ensure comprehensive library preparation.

## 5-Job Analysis Pipeline

### 1. Audio Analysis (Current)
**Purpose**: Core musical analysis for DJ mixing
**Tools**: Aubio suite (aubiopitch, aubiotrack, aubioonset)
**Output**:
- BPM detection with confidence scoring
- Key detection (Musical key + Camelot notation)
- Energy level (1-10 scale based on onset density)
- Rhythm analysis and beat grid preparation

### 2. Metadata Enrichment (NEW)
**Purpose**: Professional metadata lookup and genre detection
**Tools**: MusicBrainz API, MusicMatch fallback
**Output**:
- Proper artist/title/album normalization
- Genre classification from authoritative sources
- Release year and label information
- ISRC and catalog number matching
- Album artwork retrieval

**Implementation Notes**:
- Use acoustic fingerprinting for difficult files
- Fallback to filename parsing when no match found
- Store confidence levels for manual review

### 3. Filename Analysis & Health Check (NEW)
**Purpose**: Detect filename issues and suggest clean naming
**Output**:
- Engine DJ compatibility assessment
- Special character detection (problematic for USB/DJ software)
- Filename pattern recognition
- Suggested clean filename based on metadata
- Unicode normalization requirements
- Length and path validation

**Naming Convention Standard**:
```
{Artist} - {Title} [{BPM}] ({Key}) [CLEAN]
Example: "Deadmau5 - Ghosts N Stuff [127] (Fm) [CLEAN].mp3"
```

### 4. Audio Normalization Analysis (NEW)
**Purpose**: LUFS measurement and level optimization
**Tools**: FFmpeg with loudnorm filter, Custom LUFS measurement
**Output**:
- Integrated LUFS measurement
- Peak level detection
- Dynamic range calculation
- Suggested normalization target (-14 LUFS for streaming, -16 LUFS for DJ)
- Clipping detection and repair suggestions

### 5. Library Export/Import Workflow (NEW)
**Purpose**: Clean library reorganization with normalized files
**Process**:
1. Export analyzed tracks to organized folder structure
2. Apply filename normalization during copy
3. Generate clean metadata
4. Optionally apply audio normalization
5. Create import manifest for re-adding to library

**Folder Structure**:
```
/CleanCue Export/
  ├── Electronic/
  │   ├── House/
  │   │   └── Artist - Title [BPM] (Key) [CLEAN].mp3
  │   └── Techno/
  └── metadata.json (import manifest)
```

## Job Queue Management

### Job Dependencies
- Jobs 1-4 can run in parallel
- Job 5 (Export) requires completion of jobs 1-4
- Each job maintains independent progress tracking
- Failed jobs can be retried without affecting others

### Progress Tracking
```typescript
interface AnalysisJob {
  id: string
  trackId: string
  type: 'audio' | 'metadata' | 'filename' | 'normalization' | 'export'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  results?: JobSpecificResults
  dependencies?: string[] // Job IDs this job depends on
}
```

## Implementation Strategy

### Phase 1: Architecture Setup
- Extend existing AnalysisJob interface
- Create job orchestrator for dependencies
- Add UI controls for job type selection

### Phase 2: Metadata Enrichment
- Integrate MusicBrainz API client
- Implement acoustic fingerprinting
- Add confidence scoring system

### Phase 3: Filename Health & Normalization
- Build filename analysis engine
- Create naming convention validator
- Implement suggestion system

### Phase 4: Audio Normalization
- Integrate LUFS measurement tools
- Add normalization preview
- Create batch processing workflow

### Phase 5: Export/Import System
- Build clean export workflow
- Create folder organization system
- Implement re-import mechanism

## Benefits for DJs

1. **Complete Metadata**: Accurate genre, artist, and title information
2. **DJ Software Compatibility**: Filenames that work across all platforms
3. **Consistent Audio Levels**: Properly normalized tracks for seamless mixing
4. **Clean Library**: Organized, professional file structure
5. **Quality Assurance**: Health checks prevent issues during performances

This pipeline transforms CleanCue from a basic analysis tool into a comprehensive DJ library preparation system.