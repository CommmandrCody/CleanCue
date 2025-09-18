// Core domain types shared across all packages

export interface Track {
  id: string;
  path: string;
  hash: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  
  // Audio metadata from ffprobe
  durationMs?: number;
  sampleRate?: number;
  bitRate?: number;
  codec?: string;
  
  // ID3/Vorbis tags
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  
  // Timestamps
  fileModifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Analysis {
  id: string;
  trackId: string;
  analyzerName: string;
  analyzerVersion: string;
  parameters: Record<string, any>;
  results: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface CuePoint {
  id: string;
  trackId: string;
  type: 'intro' | 'drop' | 'breakdown' | 'outro' | 'custom';
  positionMs: number;
  label?: string;
  color?: string;
  createdAt: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface PlaylistTrack {
  playlistId: string;
  trackId: string;
  position: number;
}

// Analysis job types
export interface AnalysisJob {
  id: string;
  trackId: string;
  audioPath: string;
  analyzer: string;
  parameters: Record<string, any>;
}

export interface AnalysisResult {
  jobId: string;
  status: Analysis['status'];
  results?: Record<string, any>;
  error?: string;
}

// Scan results
export interface ScanResult {
  tracksScanned: number;
  tracksAdded: number;
  tracksUpdated: number;
  errors: ScanError[];
}

export interface ScanError {
  path: string;
  error: string;
}

// Health check results
export interface HealthReport {
  totalTracks: number;
  issues: HealthIssue[];
}

export interface HealthIssue {
  trackId: string;
  path: string;
  type: 'missing_file' | 'corrupt_audio' | 'too_short' | 'no_metadata' | 'duplicate';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// Export types
export interface ExportFormat {
  name: string;
  extension: string;
  supportsMetadata: boolean;
  supportsCues: boolean;
}

export interface ExportOptions {
  outputPath: string;
  includeSubdirectories: boolean;
  relativePaths: boolean;
  includeCues: boolean;
  playlistIds?: string[];
}

// Configuration types
export interface Config {
  database: {
    path: string;
  };
  workers: {
    maxConcurrent: number;
    timeout: number;
    python: {
      executable: string;
      venv?: string;
    };
  };
  analyzers: {
    [name: string]: {
      enabled: boolean;
      primary?: boolean;
      parameters: Record<string, any>;
    };
  };
  export: {
    defaultFormat: string;
    outputDir: string;
  };
  scanning: {
    supportedExtensions: string[];
    followSymlinks: boolean;
    respectGitignore: boolean;
  };
}

// Event types
export type CleanCueEvent = 
  | { type: 'scan:started'; data: { paths: string[] } }
  | { type: 'scan:progress'; data: { current: number; total: number; currentFile: string } }
  | { type: 'scan:completed'; data: ScanResult }
  | { type: 'analysis:started'; data: { trackId: string; analyzer: string } }
  | { type: 'analysis:progress'; data: { jobId: string; progress: number } }
  | { type: 'analysis:completed'; data: { jobId: string; result: AnalysisResult } }
  | { type: 'export:started'; data: { format: string; trackCount: number } }
  | { type: 'export:completed'; data: { outputPath: string } };

// Job status for worker pool
export interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}