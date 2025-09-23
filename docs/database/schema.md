# Database Schema

This document provides the complete CleanCue database schema including table definitions, relationships, and indexes.

## Database Technology

- **Engine**: SQLite with sql.js library
- **Location**: Configurable in settings (typically in user data directory)
- **Implementation**: `/packages/engine/src/database.ts`

## Tables

### `tracks` Table

The primary table storing all audio file metadata, analysis results, and DJ set detection information.

```sql
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  filename TEXT NOT NULL,
  extension TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_modified_at INTEGER NOT NULL,
  title TEXT,
  artist TEXT,
  album TEXT,
  album_artist TEXT,
  genre TEXT,
  year INTEGER,
  track_number INTEGER,
  disc_number INTEGER,
  composer TEXT,
  comment TEXT,
  duration_ms INTEGER,
  bitrate INTEGER,
  sample_rate INTEGER,
  channels INTEGER,
  bpm INTEGER,
  key TEXT,
  energy REAL,
  danceability REAL,
  valence REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Primary Key**: `id` (UUID)
**Unique Constraints**: `path` (file system path)

### `analyses` Table

Stores detailed analysis results from various audio processing algorithms.

```sql
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  analyzer_name TEXT NOT NULL,
  analyzer_version TEXT NOT NULL,
  parameters TEXT NOT NULL,
  results TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tracks (id)
);
```

**Primary Key**: `id` (UUID)
**Foreign Keys**: `track_id` → `tracks.id`

### `cue_points` Table

Stores DJ cue points and markers for tracks.

```sql
CREATE TABLE IF NOT EXISTS cue_points (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  type TEXT NOT NULL,
  position_ms INTEGER NOT NULL,
  label TEXT,
  confidence REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tracks (id)
);
```

**Primary Key**: `id` (UUID)
**Foreign Keys**: `track_id` → `tracks.id`

### `stem_separations` Table

Tracks AI-powered stem separation jobs and results.

```sql
CREATE TABLE IF NOT EXISTS stem_separations (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  settings TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL DEFAULT 0,
  vocals_path TEXT,
  drums_path TEXT,
  bass_path TEXT,
  other_path TEXT,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (track_id) REFERENCES tracks (id)
);
```

**Primary Key**: `id` (UUID)
**Foreign Keys**: `track_id` → `tracks.id`

### `jobs` Table

Manages background job processing for DJ operations like scanning, analysis, and exports.

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,                    -- UUID v4
  type TEXT NOT NULL,                     -- Job type: scan, file_stage, batch_analyze, analyze, batch_export, export
  status TEXT NOT NULL DEFAULT 'created', -- created, queued, running, completed, failed, cancelled, timeout
  priority INTEGER NOT NULL DEFAULT 5,   -- 1=highest (user exports), 10=lowest (cleanup)
  payload TEXT NOT NULL,                  -- JSON job data
  progress INTEGER DEFAULT 0,            -- 0-100 completion percentage
  result TEXT,                           -- JSON result data
  error TEXT,                            -- Error message if failed
  attempts INTEGER DEFAULT 0,            -- Current retry count
  max_attempts INTEGER DEFAULT 3,        -- Maximum retry attempts
  parent_job_id TEXT,                    -- Parent job for batch operations
  user_initiated BOOLEAN DEFAULT 0,      -- True if user-initiated, false if system
  timeout_seconds INTEGER DEFAULT 300,   -- Job timeout in seconds
  created_at INTEGER NOT NULL,           -- Creation timestamp
  queued_at INTEGER,                     -- When added to queue
  started_at INTEGER,                    -- Execution start time
  completed_at INTEGER,                  -- Completion time
  timeout_at INTEGER,                    -- Timeout deadline
  FOREIGN KEY (parent_job_id) REFERENCES jobs (id)
);
```

**Primary Key**: `id` (UUID)
**Foreign Keys**: `parent_job_id` → `jobs.id` (self-referencing for batch jobs)

## Indexes

Performance optimizations for common query patterns:

```sql
CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash);
CREATE INDEX IF NOT EXISTS idx_analyses_track_id ON analyses(track_id);
CREATE INDEX IF NOT EXISTS idx_cue_points_track_id ON cue_points(track_id);
CREATE INDEX IF NOT EXISTS idx_stem_separations_track_id ON stem_separations(track_id);
CREATE INDEX IF NOT EXISTS idx_stem_separations_status ON stem_separations(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_parent_job_id ON jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_order ON jobs(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_timeout ON jobs(status, timeout_at);
```

## Relationships

```
tracks (1) ←→ (M) analyses
tracks (1) ←→ (M) cue_points
tracks (1) ←→ (M) stem_separations
jobs (1) ←→ (M) jobs (parent-child)
```

- One track can have multiple analyses
- One track can have multiple cue points
- One track can have multiple stem separations
- One job can have multiple child jobs (batch operations)

## Data Types

- **TEXT**: String values (UTF-8)
- **INTEGER**: Signed integers, timestamps stored as Unix epoch milliseconds
- **REAL**: Floating point numbers
- **Boolean Storage**: SQLite doesn't have native boolean - stored as INTEGER (0/1)

## Key Design Decisions

1. **UUID Primary Keys**: All tables use UUID strings for primary keys to avoid conflicts
2. **File-based Duplicate Detection**: Uses SHA-256 hashes instead of separate duplicates table
3. **JSON Storage**: Analysis parameters and results stored as JSON text for flexibility
4. **Timestamp Storage**: All timestamps stored as Unix epoch milliseconds (INTEGER)
5. **Nullable Metadata**: Most metadata fields are optional to handle incomplete data gracefully
6. **Performance Indexing**: Strategic indexes on foreign keys and frequently queried fields

## Schema Versioning

Currently no formal migration system exists. Schema is created/updated via `setupTables()` method on database initialization.

⚠️ **Note**: When schema changes are made, existing databases may need manual migration or recreation.