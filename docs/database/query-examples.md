# Query Examples

This document provides common SQL query patterns for working with the CleanCue database.

⚠️ **Backup Reminder**: Always backup your database before running any UPDATE or DELETE queries.

## Track Queries

### Basic Track Information

```sql
-- Get all tracks with basic metadata
SELECT id, title, artist, album, duration_ms/60000 as duration_minutes
FROM tracks
ORDER BY created_at DESC;

-- Find tracks by artist
SELECT title, album, year, duration_ms/60000 as duration_minutes
FROM tracks
WHERE artist LIKE '%Avicii%'
ORDER BY year, track_number;

-- Search tracks by title or artist
SELECT title, artist, album
FROM tracks
WHERE title LIKE '%levels%'
   OR artist LIKE '%avicii%'
ORDER BY artist, title;
```

### File Management

```sql
-- Find duplicate files by hash
SELECT hash, COUNT(*) as count, GROUP_CONCAT(path) as paths
FROM tracks
GROUP BY hash
HAVING count > 1;

-- Find large files (over 100MB)
SELECT title, artist, size_bytes/1024/1024 as size_mb, path
FROM tracks
WHERE size_bytes > 104857600
ORDER BY size_bytes DESC;

-- Find tracks with missing files (would require file system check)
SELECT title, artist, path
FROM tracks
WHERE path NOT LIKE '/Users/%'; -- Adjust for your system
```

### Audio Analysis

```sql
-- High energy tracks for DJing
SELECT title, artist, bpm, energy, danceability
FROM tracks
WHERE energy > 0.8
  AND danceability > 0.7
  AND bpm BETWEEN 120 AND 140
ORDER BY energy DESC;

-- Find tracks without BPM analysis
SELECT title, artist, duration_ms/60000 as duration_minutes
FROM tracks
WHERE bpm IS NULL
  AND duration_ms > 60000 -- Only tracks longer than 1 minute
ORDER BY artist, title;

-- Key compatibility for harmonic mixing
SELECT title, artist, key, bpm
FROM tracks
WHERE key IN ('C major', 'G major', 'D major') -- Related keys
  AND bpm BETWEEN 125 AND 135
ORDER BY key, bpm;
```

## DJ Set Detection

### Finding DJ Sets

```sql
-- All detected DJ sets
SELECT title, artist, duration_ms/60000 as duration_minutes,
       dj_set_type, dj_set_confidence, dj_set_reason
FROM tracks
WHERE is_dj_set = 1
ORDER BY dj_set_confidence DESC;

-- High-confidence DJ sets that need review
SELECT title, artist, duration_ms/60000 as duration_minutes,
       dj_set_type, dj_set_confidence
FROM tracks
WHERE is_dj_set = 1
  AND dj_set_confidence >= 0.8
  AND needs_review = 1;

-- Long tracks that might be missed DJ sets
SELECT title, artist, duration_ms/60000 as duration_minutes
FROM tracks
WHERE duration_ms > 900000  -- 15+ minutes
  AND (is_dj_set = 0 OR is_dj_set IS NULL)
ORDER BY duration_ms DESC;

-- DJ sets by type
SELECT dj_set_type,
       COUNT(*) as count,
       AVG(duration_ms/60000) as avg_duration_minutes
FROM tracks
WHERE is_dj_set = 1
GROUP BY dj_set_type
ORDER BY count DESC;
```

### DJ Set Management

```sql
-- Exclude DJ sets from regular library views
SELECT title, artist, album, duration_ms/60000 as duration_minutes
FROM tracks
WHERE (is_dj_set = 0 OR is_dj_set IS NULL)
  AND duration_ms < 600000  -- Less than 10 minutes
ORDER BY artist, album, track_number;

-- Find potential false positives (short "DJ sets")
SELECT title, artist, duration_ms/60000 as duration_minutes,
       dj_set_confidence, dj_set_reason
FROM tracks
WHERE is_dj_set = 1
  AND duration_ms < 600000  -- Less than 10 minutes
ORDER BY duration_ms ASC;
```

## Metadata Quality

### Metadata Analysis

```sql
-- Tracks with poor metadata quality
SELECT title, artist, filename, metadata_quality, needs_review
FROM tracks
WHERE metadata_quality IN ('poor', 'missing')
   OR needs_review = 1
ORDER BY metadata_quality, title;

-- Tracks with missing essential metadata
SELECT filename, title, artist, album, bpm, key
FROM tracks
WHERE title IS NULL OR artist IS NULL OR bpm IS NULL
ORDER BY filename;

-- Missing essential metadata
SELECT title, artist, album, year, genre
FROM tracks
WHERE (title IS NULL OR title = '')
   OR (artist IS NULL OR artist = '')
ORDER BY created_at DESC;
```

## Analysis and Processing

### Analysis Status

```sql
-- Tracks without any analysis
SELECT t.title, t.artist, t.created_at
FROM tracks t
LEFT JOIN analyses a ON t.id = a.track_id
WHERE a.id IS NULL
ORDER BY t.created_at DESC;

-- Failed analyses
SELECT t.title, t.artist, a.analyzer_name, a.status
FROM tracks t
JOIN analyses a ON t.id = a.track_id
WHERE a.status = 'failed'
ORDER BY a.created_at DESC;

-- Analysis summary by type
SELECT analyzer_name,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM analyses
GROUP BY analyzer_name;
```

### Stem Separation Status

```sql
-- Active stem separations
SELECT t.title, t.artist, s.model_name, s.status, s.progress
FROM tracks t
JOIN stem_separations s ON t.id = s.track_id
WHERE s.status IN ('pending', 'processing')
ORDER BY s.created_at;

-- Completed stem separations
SELECT t.title, t.artist, s.model_name,
       s.processing_time_ms/1000 as processing_seconds,
       CASE
         WHEN s.vocals_path IS NOT NULL THEN 'Yes'
         ELSE 'No'
       END as has_stems
FROM tracks t
JOIN stem_separations s ON t.id = s.track_id
WHERE s.status = 'completed'
ORDER BY s.completed_at DESC;

-- Stem separation errors
SELECT t.title, t.artist, s.model_name, s.error_message
FROM tracks t
JOIN stem_separations s ON t.id = s.track_id
WHERE s.status = 'error'
ORDER BY s.created_at DESC;
```

## Performance and Maintenance

### Database Statistics

```sql
-- Track count by file type
SELECT extension, COUNT(*) as count
FROM tracks
GROUP BY extension
ORDER BY count DESC;

-- Library size by format
SELECT extension,
       COUNT(*) as track_count,
       SUM(size_bytes)/1024/1024/1024 as total_gb
FROM tracks
GROUP BY extension
ORDER BY total_gb DESC;

-- Recent import activity
SELECT DATE(created_at/1000, 'unixepoch') as date,
       COUNT(*) as tracks_added
FROM tracks
WHERE created_at > (strftime('%s', 'now', '-30 days') * 1000)
GROUP BY date
ORDER BY date DESC;
```

### Cleanup Queries

```sql
-- Find orphaned analyses (no matching track)
SELECT a.*
FROM analyses a
LEFT JOIN tracks t ON a.track_id = t.id
WHERE t.id IS NULL;

-- Find orphaned stem separations
SELECT s.*
FROM stem_separations s
LEFT JOIN tracks t ON s.track_id = t.id
WHERE t.id IS NULL;

-- Find orphaned cue points
SELECT c.*
FROM cue_points c
LEFT JOIN tracks t ON c.track_id = t.id
WHERE t.id IS NULL;
```

## Advanced Queries

### Harmonic Mixing

```sql
-- Find compatible tracks for harmonic mixing
-- Based on the Circle of Fifths
WITH compatible_keys AS (
  SELECT 'C major' as key, 'G major, F major, A minor, D minor' as compatible
  UNION SELECT 'G major', 'D major, C major, E minor, B minor'
  UNION SELECT 'D major', 'A major, G major, B minor, F# minor'
  -- Add more key relationships as needed
)
SELECT t1.title as current_track, t1.artist as current_artist, t1.key as current_key,
       t2.title as next_track, t2.artist as next_artist, t2.key as next_key,
       ABS(t1.bpm - t2.bpm) as bpm_diff
FROM tracks t1
JOIN tracks t2 ON t1.id != t2.id
JOIN compatible_keys ck ON t1.key = ck.key
WHERE t2.key IN (
  SELECT TRIM(value)
  FROM (
    SELECT key, compatible,
           SUBSTR(compatible, 1, INSTR(compatible || ',', ',') - 1) as value
    FROM compatible_keys
    WHERE key = t1.key
  )
)
AND ABS(t1.bpm - t2.bpm) <= 5  -- Similar BPM
ORDER BY bpm_diff;
```

### Playlist Building

```sql
-- Build energy progression playlist
SELECT title, artist, bpm, energy, danceability,
       ROW_NUMBER() OVER (ORDER BY energy) as playlist_order
FROM tracks
WHERE energy IS NOT NULL
  AND bpm BETWEEN 120 AND 135
  AND (is_dj_set = 0 OR is_dj_set IS NULL)
ORDER BY energy;

-- Find tracks for specific mood/energy
SELECT title, artist, key, bpm, energy, valence
FROM tracks
WHERE energy BETWEEN 0.6 AND 0.8  -- Medium-high energy
  AND valence > 0.5                -- Positive mood
  AND danceability > 0.7           -- Danceable
  AND duration_ms BETWEEN 180000 AND 360000  -- 3-6 minutes
ORDER BY energy DESC;
```

## Backup and Export

### Data Export

```sql
-- Export track metadata for backup
SELECT path, hash, title, artist, album, year, bpm, key,
       duration_ms, created_at, updated_at
FROM tracks
ORDER BY path;

-- Export analysis results
SELECT t.path, a.analyzer_name, a.analyzer_version,
       a.results, a.status, a.created_at
FROM tracks t
JOIN analyses a ON t.id = a.track_id
WHERE a.status = 'completed'
ORDER BY t.path, a.analyzer_name;
```

Remember to always test queries on a backup copy of your database before running them on production data!