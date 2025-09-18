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
}

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

export interface CuePoint {
  id: string;
  trackId: string;
  type: 'intro' | 'outro' | 'drop' | 'break' | 'buildup' | 'custom';
  positionMs: number;
  label?: string;
  confidence: number;
  createdAt: Date;
}

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

// Analysis types
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

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
    jobTimeout: number;
    retryAttempts: number;
  };
  analyzers: {
    [key: string]: {
      enabled: boolean;
      parameters: Record<string, any>;
    };
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
