# IPC Handler vs UI Call Audit

## IPC Handlers in main.ts:
- select-folder
- save-file
- open-external
- show-item-in-folder
- engine-scan
- engine-get-tracks
- engine-clear-library
- engine-export
- engine-delete-tracks
- stem-check-dependencies
- stem-start-separation
- stem-get-status
- stem-get-by-track
- stem-get-all
- stem-cancel
- stem-delete
- stem-get-models
- stem-get-default-settings
- stem-estimate-time
- get-analysis-jobs
- get-all-jobs
- get-active-jobs
- get-queued-jobs
- get-job-by-id
- createAnalysisJobs
- getAnalysisJobs
- cancel-job
- retry-job
- abort-all-jobs
- create-scan-job
- create-analysis-jobs
- get-library-health
- scan-library-health
- get-all-tracks
- export-tracks
- get-duplicate-groups
- scan-for-duplicates
- save-analysis-settings
- detect-dj-software
- fix-health-issue
- save-settings
- import-library-source
- youtube-check-dependencies
- youtube-get-video-info
- youtube-search-videos
- youtube-download-audio
- youtube-download-batch

## UI Calls:
- getDuplicateGroups
- scanForDuplicates
- deleteTracks
- getAllJobs
- cancelJob
- retryJob
- abortAllJobs
- selectFolder
- engineScan
- engineClearLibrary
- getAllTracks
- getAnalysisJobs
- importLibrarySource
- stemGetDefaultSettings
- engineGetTracks
- stemGetAll
- stemStartSeparation
- stemGetByTrack
- showItemInFolder
- stemDelete
- saveAnalysisSettings
- detectDJSoftware
- createAnalysisJobs
- getLibraryHealth
- scanLibraryHealth
- fixHealthIssue
- saveSettings
- exportTracks

## CRITICAL MISMATCHES FOUND:

### 1. Naming Convention Issues:
- UI: `getDuplicateGroups` → Handler: `get-duplicate-groups` ❌
- UI: `scanForDuplicates` → Handler: `scan-for-duplicates` ❌
- UI: `deleteTracks` → Handler: `engine-delete-tracks` ❌
- UI: `getAllJobs` → Handler: `get-all-jobs` ❌
- UI: `cancelJob` → Handler: `cancel-job` ❌
- UI: `retryJob` → Handler: `retry-job` ❌
- UI: `abortAllJobs` → Handler: `abort-all-jobs` ❌
- UI: `selectFolder` → Handler: `select-folder` ❌
- UI: `engineScan` → Handler: `engine-scan` ❌
- UI: `engineClearLibrary` → Handler: `engine-clear-library` ❌
- UI: `getAllTracks` → Handler: `get-all-tracks` ❌
- UI: `getAnalysisJobs` → Handler: `getAnalysisJobs` ✅
- UI: `importLibrarySource` → Handler: `import-library-source` ❌
- UI: `stemGetDefaultSettings` → Handler: `stem-get-default-settings` ❌
- UI: `engineGetTracks` → Handler: `engine-get-tracks` ❌
- UI: `stemGetAll` → Handler: `stem-get-all` ❌
- UI: `stemStartSeparation` → Handler: `stem-start-separation` ❌
- UI: `stemGetByTrack` → Handler: `stem-get-by-track` ❌
- UI: `showItemInFolder` → Handler: `show-item-in-folder` ❌
- UI: `stemDelete` → Handler: `stem-delete` ❌
- UI: `saveAnalysisSettings` → Handler: `save-analysis-settings` ❌
- UI: `detectDJSoftware` → Handler: `detect-dj-software` ❌
- UI: `createAnalysisJobs` → Handler: `createAnalysisJobs` ✅
- UI: `getLibraryHealth` → Handler: `get-library-health` ❌
- UI: `scanLibraryHealth` → Handler: `scan-library-health` ❌
- UI: `fixHealthIssue` → Handler: `fix-health-issue` ❌
- UI: `saveSettings` → Handler: `save-settings` ❌
- UI: `exportTracks` → Handler: `export-tracks` ❌

### 2. Duplicate Handlers:
- `createAnalysisJobs` AND `create-analysis-jobs` (both exist!)
- `getAnalysisJobs` AND `get-analysis-jobs` (both exist!)

### 3. Missing Handlers:
- UI calls exist but no matching handlers found

## SEVERITY: CRITICAL
Almost EVERY UI call is using the wrong method name!