# DJ Set Detection

CleanCue includes an intelligent DJ set detection system designed to identify and flag large, unwieldy tracks from YouTube and other sources that are not suitable for normal DJ workflows.

## Overview

The DJ set detection system analyzes tracks using multiple factors to determine if they are DJ sets, mixes, podcasts, or other long-form content that should be flagged for special handling.

## Detection Algorithm

### Primary Indicators

1. **Duration Analysis**
   - Tracks 15+ minutes: +40% confidence
   - Tracks 30+ minutes: +30% additional confidence
   - Short tracks are rarely DJ sets

2. **Keyword Detection**
   - Searches title, filename, artist, album, and comments for DJ-related terms
   - Each keyword match: +15% confidence
   - Keywords include: `mix`, `set`, `dj`, `podcast`, `radio show`, `mixtape`, etc.

3. **Pattern Matching**
   - Duration patterns: `1:23:45`
   - Mix numbers: `Mix #12`, `Episode 5`
   - Date patterns: `2024.01.15`
   - Live indicators: `Live at`, `Recorded Live`

4. **Source Analysis**
   - YouTube downloads: +20% confidence
   - Streaming platform indicators
   - File path analysis for download patterns

### Confidence Scoring

- **Threshold**: 60% confidence required for flagging
- **High Confidence**: 80%+ for automatic categorization
- **Review Needed**: 60-80% flagged for manual review

## Database Fields

### Core DJ Set Fields

| Field | Type | Description |
|-------|------|-------------|
| `is_dj_set` | INTEGER | Boolean flag (0/1) indicating DJ set detection |
| `dj_set_type` | TEXT | Type classification of the content |
| `dj_set_confidence` | REAL | Detection confidence score (0.0-1.0) |
| `dj_set_reason` | TEXT | Human-readable explanation of detection |

### DJ Set Types

| Type | Description | Example Keywords |
|------|-------------|------------------|
| `mix` | General DJ mix or compilation | "mix", "compilation", "mixed by" |
| `set` | Live DJ set or performance | "set", "live set", "closing set", "warm up" |
| `podcast` | Podcast or radio show | "podcast", "radio show", "episode" |
| `radio_show` | Radio broadcast | "bbc", "radio 1", "essential mix" |
| `live_set` | Live recorded performance | "live at", "boiler room", "recorded live" |

## Example Detections

### High Confidence DJ Set
```
Title: "Essential Mix - Above & Beyond (BBC Radio 1)"
Duration: 7,200,000ms (2 hours)
Keywords: ["essential mix", "bbc", "radio 1"]
Confidence: 0.95
Type: radio_show
Reason: "Long duration: 120 minutes, Found 3 DJ set keyword(s), Downloaded from YouTube"
```

### Moderate Confidence Mix
```
Title: "Summer Vibes Playlist 2024"
Duration: 2,700,000ms (45 minutes)
Keywords: ["mix", "playlist"]
Confidence: 0.67
Type: mix
Reason: "Long duration: 45 minutes, Found 2 DJ set keyword(s)"
```

### Not a DJ Set
```
Title: "Avicii - Levels"
Duration: 321,000ms (5.5 minutes)
Keywords: []
Confidence: 0.0
Type: null
Reason: null
```

## Implementation Details

### Scanner Integration

The detection runs during metadata extraction in the `FileScanner.extractMetadata()` method:

```typescript
// Add DJ set detection
const djSetDetection = this.detectDJSet(baseMetadata, filePath);

return {
  ...baseMetadata,
  ...djSetDetection
};
```

### Health Engine Integration

The health engine includes a rule to flag detected DJ sets:

```typescript
{
  id: 'dj_set_detection',
  name: 'Unwieldy DJ Set Detection',
  category: 'DJ Workflow',
  type: 'enhancement',
  workflow: 'dj',
  priority: 6
}
```

## Usage Patterns

### Querying DJ Sets

```sql
-- Find all detected DJ sets
SELECT title, artist, duration_ms/60000 as duration_minutes,
       dj_set_type, dj_set_confidence, dj_set_reason
FROM tracks
WHERE is_dj_set = 1
ORDER BY dj_set_confidence DESC;

-- Find high-confidence DJ sets that need review
SELECT * FROM tracks
WHERE is_dj_set = 1
  AND dj_set_confidence >= 0.8
  AND needs_review = 1;

-- Find long tracks that weren't detected as DJ sets
SELECT title, artist, duration_ms/60000 as duration_minutes
FROM tracks
WHERE duration_ms > 900000  -- 15+ minutes
  AND (is_dj_set = 0 OR is_dj_set IS NULL);
```

### Filtering in UI

DJ set flagged tracks can be:
- Hidden from normal library views
- Shown in a separate "Mixes & Sets" section
- Flagged with visual indicators
- Excluded from automatic playlist generation

## Configuration

### Detection Sensitivity

The algorithm can be tuned by adjusting:
- Confidence thresholds (currently 60% minimum)
- Keyword weights (currently +15% per match)
- Duration weights (currently +40% for 15+ min)
- Pattern matching rules

### Keyword Customization

Keywords can be extended for different languages or DJ cultures:
```typescript
const djSetKeywords = [
  // English
  'mix', 'set', 'dj', 'podcast',
  // Spanish
  'mezcla', 'sesión',
  // German
  'mixsession', 'liveset'
];
```

## Future Enhancements

1. **Machine Learning**: Train ML models on confirmed DJ sets
2. **Audio Analysis**: Analyze beat matching and transitions
3. **Metadata Learning**: Learn from user corrections
4. **Genre-Specific Rules**: Different rules for different music genres
5. **Community Data**: Crowd-sourced DJ set identification

## Troubleshooting

### False Positives
- Long classical pieces or live albums might be flagged
- Adjust confidence thresholds or add exclusion keywords

### False Negatives
- Short DJ sets (under 15 minutes) might be missed
- Add custom keywords or lower duration thresholds

### Performance
- Detection runs during import and can slow down large scans
- Consider running as background job for large libraries