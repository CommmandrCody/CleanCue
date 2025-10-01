// Core entity types
export interface Track {
  id: string;
  path: string;
  hash: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  fileModifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Audio metadata
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  composer?: string;
  comment?: string;
  
  // Technical properties
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  
  // Analysis results (cached)
  bpm?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  valence?: number;

  // Extended analysis results
  metadataEnrichment?: {
    source: 'musicbrainz' | 'musicmatch' | 'filename' | 'fingerprint';
    confidence: number;
    enrichedAt: Date;
    originalMetadata: Record<string, any>;
  };

  filenameHealth?: {
    score: number;              // 0-100 health score
    engineDjCompatible: boolean;
    issues: string[];           // List of issues found
    suggestedFilename?: string; // Clean filename suggestion
    analyzedAt: Date;
  };

  audioNormalization?: {
    lufsIntegrated: number;     // Current LUFS level
    lufsTarget: number;         // Target LUFS level
    gainAdjustment: number;     // Gain needed to reach target
    hasClipping: boolean;
    dynamicRange: number;
    recommendNormalization: boolean;
    analyzedAt: Date;
  };

  // Filename intelligence (from enhanced metadata worker)
  filenameConfidence?: number;  // 0-1 confidence in filename parsing
  filenamePattern?: string;     // Detected pattern identifier
  suggestedTitle?: string;      // Title extracted from filename
  suggestedArtist?: string;     // Artist extracted from filename
  suggestedRemixer?: string;    // Remixer from filename
  metadataQuality?: 'excellent' | 'good' | 'poor' | 'missing';
  needsReview?: boolean;        // Flag for manual review needed

  // DJ set detection (for huge unwieldy tracks)
  isDjSet?: boolean;           // Detected as a DJ set/mix
  djSetType?: 'mix' | 'set' | 'podcast' | 'radio_show' | 'live_set'; // Type of DJ content
  djSetConfidence?: number;    // 0-1 confidence in DJ set detection
  djSetReason?: string;        // Why it was flagged as a DJ set

  // Stem separation metadata
  stemType?: 'vocals' | 'drums' | 'bass' | 'other' | 'piano' | 'guitar'; // Type of separated stem
  originalTrackId?: string;    // ID of the original track this stem was derived from
  stemSeparationId?: string;   // ID of the stem separation job that created this
  isStem?: boolean;           // Flag to identify this as a separated stem track
}

// Legacy Analysis interface - deprecated, use Job system instead
export interface Analysis {
  id: string;
  trackId: string;
  analyzerName: string;
  analyzerVersion: string;
  parameters: Record<string, any>;
  results: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
}

// ============================================================================
// BACKGROUND JOB MANAGEMENT SYSTEM
// ============================================================================

export type JobType =
  | 'scan'           // Scan filesystem for audio files
  | 'file_stage'     // Import single file metadata to database
  | 'batch_analyze'  // Create analysis jobs for multiple tracks
  | 'analyze'        // Analyze single track (key, bpm, structure)
  | 'metadata_enrich'// Enrich metadata via MusicBrainz/MusicMatch
  | 'filename_analyze' // Analyze filename health and suggest improvements
  | 'audio_normalize'// Analyze audio levels and normalization requirements
  | 'library_export'// Export clean, organized library
  | 'batch_export'   // Create export jobs for multiple tracks
  | 'export'         // Export tracks to format/destination
  | 'cleanup'        // System maintenance jobs

export type JobStatus =
  | 'created'        // Job created but not queued
  | 'queued'         // Added to processing queue
  | 'running'        // Currently being processed
  | 'completed'      // Successfully finished
  | 'failed'         // Failed with error
  | 'cancelled'      // User or system cancelled
  | 'timeout'        // Exceeded timeout limit

export interface BaseJob {
  id: string;                    // UUID v4
  type: JobType;
  status: JobStatus;
  priority: number;              // 1=highest, 10=lowest
  payload: Record<string, any>;  // Job-specific data
  progress: number;              // 0-100
  result?: Record<string, any>;  // Job output
  error?: string;               // Error message
  attempts: number;             // Current retry count
  maxAttempts: number;          // Maximum retries
  parentJobId?: string;         // For batch operations
  userInitiated: boolean;       // User vs system job
  timeoutSeconds: number;       // Job timeout
  createdAt: Date;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
}

// Specific job payload types
export interface ScanJobPayload {
  paths: string[];              // Directories to scan
  extensions: string[];         // File extensions to include
  recursive: boolean;           // Scan subdirectories
}

export interface FileStageJobPayload {
  filePath: string;            // Full path to audio file
  hash: string;                // File content hash
  metadata?: Record<string, any>; // Pre-extracted metadata
}

export interface BatchAnalyzeJobPayload {
  trackIds: string[];          // Tracks to analyze
  analysisTypes: ('key' | 'bpm' | 'structure' | 'energy')[];
  forceReanalysis?: boolean;   // Re-analyze if already done
}

export interface AnalyzeJobPayload {
  trackId: string;             // Track to analyze
  trackPath: string;           // File path for analysis
  analysisType: 'key' | 'bpm' | 'structure' | 'energy';
  parameters?: Record<string, any>; // Analysis parameters
}

export interface BatchExportJobPayload {
  trackIds: string[];          // Tracks to export
  format: 'rekordbox' | 'serato' | 'traktor' | 'usb';
  destination: string;         // Export destination
  options?: Record<string, any>; // Format-specific options
}

export interface ExportJobPayload {
  tracks: string[];            // Track IDs to export
  format: string;              // Export format
  destination: string;         // Export path
  options?: Record<string, any>; // Export options
}

// Extended Analysis Job Payloads
export interface MetadataEnrichJobPayload {
  trackId: string;             // Track to enrich
  trackPath: string;           // File path for fingerprinting
  useFingerprinting?: boolean; // Use acoustic fingerprinting if metadata fails
  fallbackToFilename?: boolean; // Parse filename if no online match
}

export interface FilenameAnalyzeJobPayload {
  trackId: string;             // Track to analyze
  currentFilename: string;     // Current filename
  metadata?: {                 // Metadata for suggesting clean name
    artist?: string;
    title?: string;
    bpm?: number;
    key?: string;
  };
}

export interface AudioNormalizeJobPayload {
  trackId: string;             // Track to analyze
  trackPath: string;           // File path for analysis
  targetLufs?: number;         // Target LUFS level (-14 for streaming, -16 for DJ)
  analyzeOnly?: boolean;       // Only analyze, don't suggest modifications
}

export interface LibraryExportJobPayload {
  trackIds: string[];          // Tracks to export in clean format
  exportPath: string;          // Base export directory
  namingTemplate: string;      // Filename template (e.g., "{artist} - {title} [{bpm}] ({key})")
  folderStructure: 'flat' | 'genre' | 'artist' | 'genre-artist';
  applyNormalization?: boolean; // Apply audio normalization during export
  includeMetadata?: boolean;   // Embed metadata in exported files
}

// Job result types
export interface ScanJobResult {
  filesFound: number;
  filesStaged: number;
  duplicatesSkipped: number;
  errors: string[];
  childJobIds: string[];       // Created FileStageJob IDs
}

export interface FileStageJobResult {
  trackId: string;             // Created track ID
  metadata: Record<string, any>; // Extracted metadata
  analysisJobId?: string;      // Created analysis job
}

export interface AnalyzeJobResult {
  trackId: string;
  analysisType: string;
  results: Record<string, any>; // Analysis results
  processingTimeMs: number;
}

export interface ExportJobResult {
  tracksExported: number;
  outputPath: string;
  fileSize: number;
  errors: string[];
}

// Extended Analysis Job Results
export interface MetadataEnrichJobResult {
  trackId: string;
  originalMetadata: Record<string, any>;
  enrichedMetadata: {
    artist?: string;
    title?: string;
    album?: string;
    genre?: string;
    year?: number;
    label?: string;
    isrc?: string;
    catalogNumber?: string;
    artworkUrl?: string;
  };
  source: 'musicbrainz' | 'musicmatch' | 'filename' | 'fingerprint';
  confidence: number;           // 0-1 confidence in the match
  fingerprintUsed?: boolean;
  processingTimeMs: number;
}

export interface FilenameAnalyzeJobResult {
  trackId: string;
  currentFilename: string;
  healthScore: number;          // 0-100 health score
  issues: {
    type: 'special_chars' | 'unicode' | 'length' | 'engine_dj_compat' | 'whitespace';
    severity: 'error' | 'warning' | 'info';
    description: string;
    problematicChars?: string[];
  }[];
  suggestedFilename: string;    // Clean filename suggestion
  namingPattern?: string;       // Detected pattern (if any)
  engineDjCompatible: boolean;
  processingTimeMs: number;
}

export interface AudioNormalizeJobResult {
  trackId: string;
  lufsIntegrated: number;       // Integrated LUFS measurement
  lfusMomentary: number;        // Momentary LUFS peak
  lufsShortTerm: number;        // Short-term LUFS
  truePeak: number;             // True peak level in dBFS
  dynamicRange: number;         // LU dynamic range
  targetLufs: number;           // Target LUFS for normalization
  gainAdjustment: number;       // Gain adjustment needed (dB)
  hasClipping: boolean;         // Detected clipping
  recommendNormalization: boolean;
  processingTimeMs: number;
}

export interface LibraryExportJobResult {
  trackIds: string[];
  exportPath: string;
  exportedFiles: {
    trackId: string;
    originalPath: string;
    exportedPath: string;
    cleanFilename: string;
    normalizedAudio: boolean;
    metadataUpdated: boolean;
  }[];
  summary: {
    totalTracks: number;
    successfulExports: number;
    normalizedTracks: number;
    renamedFiles: number;
    totalSizeMb: number;
  };
  manifest: string;             // Path to import manifest file
  errors: string[];
  processingTimeMs: number;
}

export interface CuePoint {
  id: string;
  trackId: string;
  type: 'intro' | 'outro' | 'drop' | 'break' | 'buildup' | 'custom';
  positionMs: number;
  label?: string;
  confidence: number;
  createdAt: Date;
}

// ============================================================================
// TRACK NAMING SPECIFICATION
// ============================================================================

export const TRACK_NAMING = {
  // Default template for clean filenames
  DEFAULT_TEMPLATE: '{artist} - {title} [{bpm}] ({key}) [CLEAN]',

  // Alternative templates
  TEMPLATES: {
    BASIC: '{artist} - {title}',
    WITH_BPM: '{artist} - {title} [{bpm}]',
    WITH_KEY: '{artist} - {title} ({key})',
    FULL_DJ: '{artist} - {title} [{bpm}] ({key})',
    CLEAN_DJ: '{artist} - {title} [{bpm}] ({key}) [CLEAN]',
    REMIXER: '{artist} - {title} ({remixer} Remix) [{bpm}] ({key})',
  },

  // Characters that cause issues in DJ software
  PROBLEMATIC_CHARS: {
    WINDOWS_PROHIBITED: ['<', '>', ':', '"', '|', '?', '*', '\\'],
    ENGINE_DJ_ISSUES: ['{', '}', '#', '%', '&'],  // Note: [] brackets are SAFE and standard DJ notation
    UNICODE_ISSUES: ['…', '–', '—', '\u2018', '\u2019', '\u201C', '\u201D'],
    WHITESPACE_ISSUES: ['\t', '\n', '\r'],
  },

  // Maximum safe filename length (accounting for full path)
  MAX_FILENAME_LENGTH: 200,
  MAX_PATH_LENGTH: 255,

  // Folder organization patterns
  FOLDER_STRUCTURES: {
    FLAT: 'flat',                    // All files in root
    GENRE: 'genre',                  // /Electronic/House/
    ARTIST: 'artist',                // /Artist Name/
    GENRE_ARTIST: 'genre-artist',    // /Electronic/House/Artist Name/
    YEAR_GENRE: 'year-genre',        // /2023/Electronic/House/
    LABEL: 'label',                  // /Label Name/
  },

  // Audio normalization targets
  LUFS_TARGETS: {
    STREAMING: -14,      // Spotify, Apple Music standard
    DJ_PERFORMANCE: -16, // Optimal for DJ mixing
    BROADCAST: -23,      // Broadcast standard
    MASTERING: -11,      // Loud mastering
  },

  // File extensions we support
  SUPPORTED_EXTENSIONS: ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg'],

} as const;

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  createdAt: Date;
}

export interface HealthIssue {
  trackId: string;
  path: string;
  type: 'missing_file' | 'analysis_failed' | 'no_analysis' | 'duplicate' | 'corrupted';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// Analysis types - using new job system JobStatus above

// USB Export types
export interface USBExportProfile {
  name: string;
  description: string;
  filenameTemplate: {
    pattern: string;
    separator: string;
    includeTrackNumber: boolean;
    zeroPadTrackNumber: number;
    maxLength: number;
    conflictResolution: 'append_number' | 'overwrite' | 'skip';
  };
  characterNormalization: {
    removeAccents: boolean;
    replaceSpaces: boolean;
    spaceReplacement: string;
    allowedCharacters: 'strict' | 'relaxed' | 'custom';
    customAllowedPattern?: string;
    caseTransform: 'none' | 'lowercase' | 'uppercase' | 'titlecase';
    removeSpecialChars: boolean;
    customReplacements: { [key: string]: string };
  };
  preserveStructure: boolean;
  createArtistFolders: boolean;
  createGenreFolders: boolean;
  flattenFolders: boolean;
  includeMetadataFiles: boolean;
  createPlaylist: boolean;
  playlistFormat: 'm3u' | 'pls';
}

export interface USBExportOptions {
  profile: USBExportProfile;
  outputPath: string;
  fileAction: 'copy' | 'move' | 'hardlink' | 'symlink';
  backupOriginal: boolean;
  backupLocation?: string;
  overwriteExisting: boolean;
  verifyIntegrity: boolean;
  preserveTimestamps: boolean;
}

export interface USBExportResult {
  success: boolean;
  totalFiles: number;
  copiedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  outputPath: string;
  totalSize: number;
  errors: Array<{ file: string; error: string }>;
  warnings: Array<{ file: string; warning: string }>;
  duplicatesHandled: number;
  backupsCreated: number;
}

export interface AnalysisJob {
  id: string;
  trackId: string;
  audioPath: string;
  analyzer: string;
  parameters: Record<string, any>;
}

export interface AnalysisResult {
  jobId: string;
  trackId: string;
  analyzer: string;
  results: Record<string, any>;
  status: JobStatus;
  error?: string;
  completedAt: Date;
}

// Scanning types
export interface ScanResult {
  tracksScanned: number;
  tracksAdded: number;
  tracksUpdated: number;
  errors: Array<{
    path: string;
    error: string;
  }>;
}

export interface HealthReport {
  totalTracks: number;
  issues: HealthIssue[];
}

// Export types
export interface ExportFormat {
  name: 'm3u' | 'serato' | 'engine' | 'rekordbox';
  extension: string;
  supportsMetadata?: boolean;
  supportsCues?: boolean;
}

export interface ExportOptions {
  outputPath: string;
  playlistIds?: string[];
  relativePaths?: boolean;
  includeCues?: boolean;
  includeMetadata?: boolean;
}

// Event types
export interface CleanCueEventMap {
  'scan:started': { paths: string[] };
  'scan:progress': { current: number; total: number; currentFile: string };
  'scan:completed': ScanResult;
  'analysis:started': { jobId: string; trackId: string; analyzer: string };
  'analysis:progress': { jobId: string; progress: number };
  'analysis:completed': AnalysisResult;
  'analysis:failed': AnalysisResult;
  'export:started': { format: string; trackCount: number };
  'export:progress': { current: number; total: number };
  'export:completed': { outputPath: string };
  'job:started': { jobId: string; trackId: string; analyzer: string };
  'job:progress': { jobId: string; progress: number };
  'job:completed': AnalysisResult;
  'job:failed': AnalysisResult;
  'job:assigned': { jobId: string; workerId: number };
  'tracks:delete:started': { trackIds: string[]; deleteFiles: boolean };
  'tracks:file:deleted': { trackId: string; path: string };
  'tracks:removed:from:library': { trackId: string };
  'tracks:delete:completed': { removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> };
  'stem:separation:started': { trackId: string; settings: any };
  'stem:separation:progress': { separationId: string; progress: number };
  'stem:separation:completed': { separationId: string };
  'stem:separation:cancelled': { separationId: string };
  'stem:separation:deleted': { separationId: string };
  'duplicates:scan:started': {};
  'duplicates:scan:completed': { duplicateGroups: any[] };
  'duplicates:scan:failed': { error: string };
  'health:scan:started': {};
  'health:scan:completed': { issues: HealthIssue[] };
  'health:scan:failed': { error: string };
}

export type CleanCueEvent = {
  [K in keyof CleanCueEventMap]: {
    type: K;
    data: CleanCueEventMap[K];
  };
}[keyof CleanCueEventMap];

// Configuration types
export interface Config {
  database: {
    path: string;
  };
  scanning: {
    extensions: string[];
    respectGitignore: boolean;
    followSymlinks: boolean;
    maxFileSize: number;
    hashAlgorithm: string;
  };
  workers: {
    maxWorkers: number;
    maxConcurrentJobs: number;
    jobTimeout: number;
    retryAttempts: number;
    workersPath?: string;
    pythonPath?: string;
    watchdogInterval: number;
    maxJobAge: number;
  };
  analyzers: {
    [key: string]: {
      enabled: boolean;
      parameters: Record<string, any>;
    };
  };
  stems: {
    outputPath: string;
    tempPath?: string;
    enabled: boolean;
  };
  export: {
    defaultFormat: string;
    relativePaths: boolean;
    includeCues: boolean;
  };
  ui: {
    theme: 'light' | 'dark';
    language: string;
    autoScan: boolean;
    notifications: boolean;
  };
}
