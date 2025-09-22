# Data Dictionary

This document provides detailed descriptions of all database fields, their meanings, data types, and usage patterns.

## `tracks` Table

The main table storing music library metadata and analysis results.

### Identification Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | TEXT | Unique track identifier (UUID) | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `path` | TEXT | Full file system path (UNIQUE) | `/Users/music/track.mp3` |
| `hash` | TEXT | SHA-256 file hash for duplicate detection | `a1b2c3d4e5f6...` |
| `filename` | TEXT | File name without path | `Artist - Title.mp3` |
| `extension` | TEXT | File extension | `.mp3`, `.flac`, `.wav` |

### File Properties

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `size_bytes` | INTEGER | File size in bytes | `8445721` |
| `file_modified_at` | INTEGER | File modification timestamp (Unix ms) | `1672531200000` |
| `created_at` | INTEGER | Record creation timestamp (Unix ms) | `1672531200000` |
| `updated_at` | INTEGER | Record last update timestamp (Unix ms) | `1672531200000` |

### Audio Metadata

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | TEXT | Song title | `"Levels"` |
| `artist` | TEXT | Primary artist | `"Avicii"` |
| `album` | TEXT | Album name | `"True"` |
| `album_artist` | TEXT | Album artist (may differ from track artist) | `"Avicii"` |
| `genre` | TEXT | Musical genre | `"Electronic"` |
| `year` | INTEGER | Release year | `2013` |
| `track_number` | INTEGER | Track number on album | `1` |
| `disc_number` | INTEGER | Disc number (for multi-disc albums) | `1` |
| `composer` | TEXT | Song composer | `"Tim Bergling"` |
| `comment` | TEXT | Metadata comment field | `"Original Mix"` |

### Technical Properties

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `duration_ms` | INTEGER | Track duration in milliseconds | `321000` (5:21) |
| `bitrate` | INTEGER | Audio bitrate in kbps | `320` |
| `sample_rate` | INTEGER | Sample rate in Hz | `44100` |
| `channels` | INTEGER | Number of audio channels | `2` (stereo) |

### Audio Analysis Results

| Field | Type | Description | Range/Example |
|-------|------|-------------|---------------|
| `bpm` | INTEGER | Beats per minute (tempo) | `128` |
| `key` | TEXT | Musical key | `"C major"`, `"Am"` |
| `energy` | REAL | Energy level (0-1) | `0.85` |
| `danceability` | REAL | Danceability score (0-1) | `0.92` |
| `valence` | REAL | Musical positivity (0-1) | `0.73` |

### Filename Intelligence

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `filename_confidence` | REAL | Confidence in filename parsing (0-1) | `0.85` |
| `filename_pattern` | TEXT | Detected filename pattern | `"artist_dash_title"` |
| `suggested_title` | TEXT | Title extracted from filename | `"Levels"` |
| `suggested_artist` | TEXT | Artist extracted from filename | `"Avicii"` |
| `suggested_remixer` | TEXT | Remixer extracted from filename | `"Original Mix"` |
| `metadata_quality` | TEXT | Overall metadata quality assessment | `"excellent"`, `"good"`, `"poor"`, `"missing"` |
| `needs_review` | INTEGER | Flag for manual review needed (0/1) | `1` (true) |

### DJ Set Detection

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `is_dj_set` | INTEGER | Detected as DJ set/mix (0/1) | `1` (true) |
| `dj_set_type` | TEXT | Type of DJ content | `"mix"`, `"set"`, `"podcast"`, `"radio_show"`, `"live_set"` |
| `dj_set_confidence` | REAL | Detection confidence (0-1) | `0.87` |
| `dj_set_reason` | TEXT | Explanation of detection | `"Long duration: 62 minutes, Found 3 DJ set keyword(s)"` |

## `analyses` Table

Stores detailed analysis results from audio processing algorithms.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | TEXT | Unique analysis ID (UUID) | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `track_id` | TEXT | Reference to tracks.id | `a1b2c3d4-...` |
| `analyzer_name` | TEXT | Name of analyzer | `"tempo_analyzer"`, `"key_detector"` |
| `analyzer_version` | TEXT | Analyzer version | `"1.0.0"` |
| `parameters` | TEXT | JSON parameters used | `'{"algorithm": "beat_tracker"}'` |
| `results` | TEXT | JSON analysis results | `'{"bpm": 128, "confidence": 0.95}'` |
| `status` | TEXT | Analysis status | `"pending"`, `"running"`, `"completed"`, `"failed"` |
| `created_at` | INTEGER | Analysis start timestamp | `1672531200000` |

## `cue_points` Table

Stores DJ cue points and markers for tracks.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | TEXT | Unique cue point ID (UUID) | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `track_id` | TEXT | Reference to tracks.id | `a1b2c3d4-...` |
| `type` | TEXT | Type of cue point | `"intro"`, `"outro"`, `"drop"`, `"break"`, `"buildup"`, `"custom"` |
| `position_ms` | INTEGER | Position in track (milliseconds) | `30000` (30 seconds) |
| `label` | TEXT | Optional cue point label | `"Drop"`, `"Main Break"` |
| `confidence` | REAL | Confidence in cue detection (0-1) | `0.92` |
| `created_at` | INTEGER | Cue creation timestamp | `1672531200000` |

## `stem_separations` Table

Tracks AI-powered stem separation jobs and results.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | TEXT | Unique separation job ID (UUID) | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `track_id` | TEXT | Reference to tracks.id | `a1b2c3d4-...` |
| `model_name` | TEXT | AI model used | `"htdemucs"`, `"spleeter"` |
| `model_version` | TEXT | Model version | `"4.0"` |
| `settings` | TEXT | JSON separation settings | `'{"quality": "high", "stems": 4}'` |
| `status` | TEXT | Job status | `"pending"`, `"processing"`, `"completed"`, `"error"` |
| `progress` | REAL | Processing progress (0-100) | `75.5` |
| `vocals_path` | TEXT | Path to vocals stem file | `/stems/track_vocals.wav` |
| `drums_path` | TEXT | Path to drums stem file | `/stems/track_drums.wav` |
| `bass_path` | TEXT | Path to bass stem file | `/stems/track_bass.wav` |
| `other_path` | TEXT | Path to other/instrumental stem | `/stems/track_other.wav` |
| `processing_time_ms` | INTEGER | Total processing time (ms) | `180000` (3 minutes) |
| `error_message` | TEXT | Error details if failed | `"Insufficient memory"` |
| `created_at` | INTEGER | Job creation timestamp | `1672531200000` |
| `completed_at` | INTEGER | Job completion timestamp | `1672531380000` |

## Data Types Reference

### SQLite Data Types
- **TEXT**: UTF-8 encoded strings
- **INTEGER**: Signed integers (64-bit)
- **REAL**: Floating point numbers (64-bit)

### Boolean Values
SQLite doesn't have native boolean type. Boolean fields use INTEGER:
- `0` = false
- `1` = true

### Timestamps
All timestamps stored as INTEGER representing Unix epoch time in milliseconds.

### JSON Fields
Some fields store JSON as TEXT:
- `analyses.parameters`
- `analyses.results`
- `stem_separations.settings`

## Field Validation Rules

### Required Fields (NOT NULL)
- `tracks`: `id`, `path`, `hash`, `filename`, `extension`, `size_bytes`, `file_modified_at`, `created_at`, `updated_at`
- `analyses`: `id`, `track_id`, `analyzer_name`, `analyzer_version`, `parameters`, `results`, `status`, `created_at`
- `cue_points`: `id`, `track_id`, `type`, `position_ms`, `created_at`
- `stem_separations`: `id`, `track_id`, `model_name`, `model_version`, `settings`, `status`, `created_at`

### Unique Constraints
- `tracks.path`: File paths must be unique
- Primary keys are automatically unique

### Foreign Key Constraints
- All `track_id` fields reference `tracks.id`