import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import initSqlJs, { Database } from 'sql.js';
import type { Track, Analysis, CuePoint, Playlist, PlaylistTrack, HealthIssue } from '@cleancue/shared';

export class CleanCueDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private sqlInstance: any = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.db) return; // Already initialized

    try {
      // Check database permissions first
      await this.checkPermissions();

      // Initialize sql.js
      const SQL = await initSqlJs();
      this.sqlInstance = SQL;

      // Load existing database or create new one
      if (existsSync(this.dbPath)) {
        const fileBuffer = readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } else {
        this.db = new SQL.Database();
      }

      this.setupTables();
      this.saveDatabase();
      console.log(`SQLite database initialized at: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private saveDatabase(): void {
    if (!this.db) throw new Error('Database not initialized');
    const data = this.db.export();
    writeFileSync(this.dbPath, data);
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  private validateTrackData(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): string[] {
    const errors: string[] = [];

    // Check required string fields
    if (!track.path || typeof track.path !== 'string' || track.path.trim() === '') {
      errors.push('path is required and must be non-empty');
    }

    if (!track.hash || typeof track.hash !== 'string' || track.hash.trim() === '') {
      errors.push('hash is required and must be non-empty');
    }

    if (!track.filename || typeof track.filename !== 'string' || track.filename.trim() === '') {
      errors.push('filename is required and must be non-empty');
    }

    if (!track.extension || typeof track.extension !== 'string' || track.extension.trim() === '') {
      errors.push('extension is required and must be non-empty');
    }

    // Check required numeric fields
    if (track.sizeBytes === undefined || track.sizeBytes === null || typeof track.sizeBytes !== 'number' || track.sizeBytes < 0) {
      errors.push('sizeBytes is required and must be a non-negative number');
    }

    // Check required date field
    if (!track.fileModifiedAt || !(track.fileModifiedAt instanceof Date) || isNaN(track.fileModifiedAt.getTime())) {
      errors.push('fileModifiedAt is required and must be a valid Date');
    }

    return errors;
  }

  private setupTables() {
    this.ensureInitialized();

    // Create tracks table with ALL Track interface fields
    this.db!.run(`
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
      )
    `);

    // Create enterprise job management table
    this.db!.run(`
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
      )
    `);

    // Create cue_points table
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS cue_points (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        type TEXT NOT NULL,
        position_ms INTEGER NOT NULL,
        label TEXT,
        confidence REAL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (track_id) REFERENCES tracks (id)
      )
    `);

    // Create stem_separations table
    this.db!.run(`
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
      )
    `);

    // Create indexes
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_cue_points_track_id ON cue_points(track_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_stem_separations_track_id ON stem_separations(track_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_stem_separations_status ON stem_separations(status)`);

    // Job management indexes for performance
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_jobs_parent ON jobs(parent_job_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_jobs_queue_order ON jobs(status, priority, created_at)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_jobs_timeout ON jobs(status, timeout_at)`);

    this.saveDatabase();
  }

  async insertTrack(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track> {
    console.log(`[DATABASE] Starting insertTrack for: ${track.path}`);
    this.ensureInitialized();
    console.log(`[DATABASE] Database initialized check passed`);

    // Validate required fields before insertion
    const validationErrors = this.validateTrackData(track);
    if (validationErrors.length > 0) {
      const errorMsg = `[DATABASE] ❌ Track validation failed: ${validationErrors.join(', ')}`;
      console.error(errorMsg);
      console.error(`[DATABASE] ❌ Invalid track data:`, {
        path: track.path,
        filename: track.filename,
        hash: track.hash?.substring(0, 8),
        sizeBytes: track.sizeBytes,
        fileModifiedAt: track.fileModifiedAt
      });
      throw new Error(`Track validation failed: ${validationErrors.join(', ')}`);
    }

    const id = randomUUID();
    const now = Date.now();
    console.log(`[DATABASE] Generated ID: ${id}, timestamp: ${now}`);

    try {
      console.log(`[DATABASE] Preparing SQL insert statement...`);
      console.log(`[DATABASE] Track data - filename: ${track.filename}, size: ${track.sizeBytes}, hash: ${track.hash.substring(0, 8)}...`);

      // Ensure all values are defined or use null for SQL NULL
      const safeValues = [
        id,
        track.path,
        track.hash,
        track.filename,
        track.extension,
        track.sizeBytes,
        track.fileModifiedAt ? track.fileModifiedAt.getTime() : Date.now(),
        track.title || null,
        track.artist || null,
        track.album || null,
        track.albumArtist || null,
        track.genre || null,
        track.year || null,
        track.trackNumber || null,
        track.discNumber || null,
        track.composer || null,
        track.comment || null,
        track.durationMs || null,
        track.bitrate || null,
        track.sampleRate || null,
        track.channels || null,
        track.bpm || null,
        track.key || null,
        track.energy || null,
        track.danceability || null,
        track.valence || null,
        now,
        now
      ];

      console.log(`[DATABASE] Safe values array length: ${safeValues.length}`);
      console.log(`[DATABASE] Values:`, safeValues.map((v, i) => `${i}: ${v === null ? 'NULL' : typeof v}`));

      this.db!.run(`
        INSERT INTO tracks (
          id, path, hash, filename, extension, size_bytes, file_modified_at,
          title, artist, album, album_artist, genre, year, track_number, disc_number,
          composer, comment, duration_ms, bitrate, sample_rate, channels,
          bpm, key, energy, danceability, valence,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, safeValues);
      console.log(`[DATABASE] SQL insert completed successfully`);

      console.log(`[DATABASE] Saving database to disk...`);
      this.saveDatabase();
      console.log(`[DATABASE] Database saved successfully`);

      console.log(`[DATABASE] Track inserted successfully: ${track.path}`);
      return {
        ...track,
        id,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };
    } catch (error) {
      console.error(`[DATABASE] ❌ CRITICAL: Failed to insert track into database`);
      console.error(`[DATABASE] ❌ Track Path: ${track.path}`);
      console.error(`[DATABASE] ❌ Track Data:`, {
        filename: track.filename,
        extension: track.extension,
        hash: track.hash?.substring(0, 12),
        sizeBytes: track.sizeBytes,
        hasFileModifiedAt: !!track.fileModifiedAt
      });
      console.error(`[DATABASE] ❌ SQL Error Details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name || typeof error
      });

      // Check for common SQL constraint violations
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('UNIQUE constraint failed')) {
        console.error(`[DATABASE] ❌ DUPLICATE PATH: Track with this path already exists`);
        throw new Error(`Duplicate track path: ${track.path}`);
      } else if (errorMsg.includes('NOT NULL constraint failed')) {
        console.error(`[DATABASE] ❌ MISSING REQUIRED FIELD: Check that all required fields are present`);
        throw new Error(`Missing required field for track: ${track.path}`);
      } else if (errorMsg.includes('no such table')) {
        console.error(`[DATABASE] ❌ DATABASE NOT INITIALIZED: Tables missing`);
        throw new Error(`Database not properly initialized`);
      }

      throw new Error(`Database insertion failed for ${track.path}: ${errorMsg}`);
    }
  }

  updateTrack(id: string, updates: Partial<Track>): void {
    this.ensureInitialized();

    const updateFields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt') return; // Skip these fields

      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateFields.push(`${columnName} = ?`);

      if (value instanceof Date) {
        values.push(value.getTime());
      } else {
        values.push(value);
      }
    });

    if (updateFields.length > 0) {
      updateFields.push('updated_at = ?');
      values.push(Date.now());
      values.push(id);

      this.db!.run(`UPDATE tracks SET ${updateFields.join(', ')} WHERE id = ?`, values);
      this.saveDatabase();
    }
  }

  getTrack(id: string): Track | null {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM tracks WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      return this.rowToTrack(row);
    }

    stmt.free();
    return null;
  }

  getTrackByPath(path: string): Track | null {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM tracks WHERE path = ?');
    stmt.bind([path]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      return this.rowToTrack(row);
    }

    stmt.free();
    return null;
  }

  getTrackByHash(hash: string): Track[] {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM tracks WHERE hash = ?');
    stmt.bind([hash]);

    const tracks: Track[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tracks.push(this.rowToTrack(row));
    }

    stmt.free();
    return tracks;
  }

  getAllTracks(): Track[] {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM tracks ORDER BY created_at DESC');

    const tracks: Track[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tracks.push(this.rowToTrack(row));
    }

    stmt.free();
    return tracks;
  }

  deleteTrack(id: string): boolean {
    this.ensureInitialized();

    console.log(`[DATABASE] Cascading delete for track: ${id}`);

    // Delete all related records first (cascading delete)
    this.db!.run('DELETE FROM stem_separations WHERE track_id = ?', [id]);
    console.log(`[DATABASE] Deleted stem_separations for track: ${id}`);

    this.db!.run('DELETE FROM cue_points WHERE track_id = ?', [id]);
    console.log(`[DATABASE] Deleted cue_points for track: ${id}`);

    this.db!.run('DELETE FROM analyses WHERE track_id = ?', [id]);
    console.log(`[DATABASE] Deleted analyses for track: ${id}`);

    // Finally delete the track itself
    this.db!.run('DELETE FROM tracks WHERE id = ?', [id]);
    console.log(`[DATABASE] Deleted track: ${id}`);

    this.saveDatabase();
    return true;
  }

  // EMERGENCY NUCLEAR OPTION - DELETE EVERYTHING
  clearAllTracks(): void {
    this.ensureInitialized();
    console.log(`[DATABASE] 💥 CLEARING ALL TRACKS AND RELATED DATA`);

    // Delete everything in order
    this.db!.run('DELETE FROM stem_separations');
    this.db!.run('DELETE FROM cue_points');
    this.db!.run('DELETE FROM analyses');
    this.db!.run('DELETE FROM tracks');

    console.log(`[DATABASE] ✅ All tracks and related data cleared`);
    this.saveDatabase();
  }

  private rowToTrack(row: any): Track {
    return {
      id: row.id,
      path: row.path,
      hash: row.hash,
      filename: row.filename,
      extension: row.extension,
      sizeBytes: row.size_bytes,
      fileModifiedAt: new Date(row.file_modified_at),
      title: row.title,
      artist: row.artist,
      album: row.album,
      albumArtist: row.album_artist,
      genre: row.genre,
      year: row.year,
      trackNumber: row.track_number,
      discNumber: row.disc_number,
      composer: row.composer,
      comment: row.comment,
      durationMs: row.duration_ms,
      bitrate: row.bitrate,
      sampleRate: row.sample_rate,
      channels: row.channels,
      bpm: row.bpm,
      key: row.key,
      energy: row.energy,
      danceability: row.danceability,
      valence: row.valence,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async insertAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt'>): Promise<Analysis> {
    this.ensureInitialized();

    const id = randomUUID();
    const now = Date.now();

    this.db!.run(`
      INSERT INTO analyses (id, track_id, analyzer_name, analyzer_version, parameters, results, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      analysis.trackId,
      analysis.analyzerName,
      analysis.analyzerVersion,
      JSON.stringify(analysis.parameters),
      JSON.stringify(analysis.results),
      analysis.status,
      now
    ]);

    this.saveDatabase();

    return {
      ...analysis,
      id,
      createdAt: new Date(now)
    };
  }

  updateAnalysis(id: string, updates: Partial<Analysis>): void {
    this.ensureInitialized();

    const updateFields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'createdAt') return;

      const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      updateFields.push(`${columnName} = ?`);

      if (key === 'parameters' || key === 'results') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    });

    if (updateFields.length > 0) {
      values.push(id);
      this.db!.run(`UPDATE analyses SET ${updateFields.join(', ')} WHERE id = ?`, values);
      this.saveDatabase();
    }
  }

  getAnalysesByTrack(trackId: string): Analysis[] {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM analyses WHERE track_id = ? ORDER BY created_at DESC');
    stmt.bind([trackId]);

    const analyses: Analysis[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      analyses.push(this.rowToAnalysis(row));
    }

    stmt.free();
    return analyses;
  }

  /**
   * PERFORMANCE: Batch get analyses for multiple tracks (eliminates N+1 query problem)
   */
  getAnalysesByTrackIds(trackIds: string[]): Analysis[] {
    this.ensureInitialized();
    if (trackIds.length === 0) return [];

    // Use parameterized IN clause for batch query
    const placeholders = trackIds.map(() => '?').join(',');
    const stmt = this.db!.prepare(`
      SELECT * FROM analyses
      WHERE track_id IN (${placeholders})
      ORDER BY track_id, created_at DESC
    `);

    stmt.bind(trackIds);

    const analyses: Analysis[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      analyses.push(this.rowToAnalysis(row));
    }

    stmt.free();
    return analyses;
  }

  /**
   * PERFORMANCE: Batch get tracks by IDs
   */
  getTracksByIds(trackIds: string[]): Track[] {
    this.ensureInitialized();
    if (trackIds.length === 0) return [];

    const placeholders = trackIds.map(() => '?').join(',');
    const stmt = this.db!.prepare(`
      SELECT * FROM tracks
      WHERE id IN (${placeholders})
      ORDER BY created_at DESC
    `);

    stmt.bind(trackIds);

    const tracks: Track[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      tracks.push(this.rowToTrack(row));
    }

    stmt.free();
    return tracks;
  }

  async insertCue(cue: Omit<CuePoint, 'id' | 'createdAt'>): Promise<CuePoint> {
    this.ensureInitialized();

    const id = randomUUID();
    const now = Date.now();

    this.db!.run(`
      INSERT INTO cue_points (id, track_id, type, position_ms, label, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, cue.trackId, cue.type, cue.positionMs, cue.label, cue.confidence, now]);

    this.saveDatabase();

    return {
      ...cue,
      id,
      createdAt: new Date(now)
    };
  }

  getCuesByTrack(trackId: string): CuePoint[] {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM cue_points WHERE track_id = ? ORDER BY position_ms');
    stmt.bind([trackId]);

    const cues: CuePoint[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      cues.push(this.rowToCuePoint(row));
    }

    stmt.free();
    return cues;
  }

  private rowToAnalysis(row: any): Analysis {
    return {
      id: row.id,
      trackId: row.track_id,
      analyzerName: row.analyzer_name,
      analyzerVersion: row.analyzer_version,
      parameters: JSON.parse(row.parameters || '{}'),
      results: JSON.parse(row.results || '{}'),
      status: row.status,
      createdAt: new Date(row.created_at)
    };
  }

  private rowToCuePoint(row: any): CuePoint {
    return {
      id: row.id,
      trackId: row.track_id,
      type: row.type,
      positionMs: row.position_ms,
      label: row.label,
      confidence: row.confidence,
      createdAt: new Date(row.created_at)
    };
  }

  getHealthIssues(): HealthIssue[] {
    const issues: HealthIssue[] = [];

    // Check for tracks without analysis
    const tracks = this.getAllTracks();
    for (const track of tracks) {
      const analyses = this.getAnalysesByTrack(track.id);
      if (analyses.length === 0) {
        issues.push({
          trackId: track.id,
          path: track.path,
          type: 'no_analysis',
          severity: 'info',
          message: 'Track has not been analyzed'
        });
      }
    }

    return issues;
  }

  // STEM Separation methods
  async insertStemSeparation(separation: {
    trackId: string
    modelName: string
    modelVersion: string
    settings: any
    status: 'pending' | 'processing' | 'completed' | 'error'
  }) {
    this.ensureInitialized();

    const id = randomUUID();
    const now = Date.now();

    this.db!.run(`
      INSERT INTO stem_separations (
        id, track_id, model_name, model_version, settings, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      separation.trackId,
      separation.modelName,
      separation.modelVersion,
      JSON.stringify(separation.settings),
      separation.status,
      now
    ]);

    this.saveDatabase();
    return id;
  }

  updateStemSeparation(id: string, updates: {
    status?: 'pending' | 'processing' | 'completed' | 'error'
    progress?: number
    vocalsPath?: string
    drumsPath?: string
    bassPath?: string
    otherPath?: string
    processingTimeMs?: number
    errorMessage?: string
  }) {
    this.ensureInitialized();

    const updateFields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${columnName} = ?`);
        values.push(value);
      }
    });

    if (updates.status === 'completed') {
      updateFields.push('completed_at = ?');
      values.push(Date.now());
    }

    if (updateFields.length > 0) {
      values.push(id);
      this.db!.run(`UPDATE stem_separations SET ${updateFields.join(', ')} WHERE id = ?`, values);
      this.saveDatabase();
    }
  }

  getStemSeparationByTrackId(trackId: string) {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM stem_separations WHERE track_id = ? ORDER BY created_at DESC LIMIT 1');
    stmt.bind([trackId]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        id: row.id,
        trackId: row.track_id,
        modelName: row.model_name,
        modelVersion: row.model_version,
        settings: JSON.parse(row.settings || '{}'),
        status: row.status,
        progress: row.progress,
        vocalsPath: row.vocals_path,
        drumsPath: row.drums_path,
        bassPath: row.bass_path,
        otherPath: row.other_path,
        processingTimeMs: row.processing_time_ms,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null
      };
    }

    stmt.free();
    return null;
  }

  getAllStemSeparations() {
    this.ensureInitialized();

    const stmt = this.db!.prepare('SELECT * FROM stem_separations ORDER BY created_at DESC');

    const separations: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      separations.push({
        id: row.id,
        trackId: row.track_id,
        modelName: row.model_name,
        modelVersion: row.model_version,
        settings: JSON.parse(row.settings || '{}'),
        status: row.status,
        progress: row.progress,
        vocalsPath: row.vocals_path,
        drumsPath: row.drums_path,
        bassPath: row.bass_path,
        otherPath: row.other_path,
        processingTimeMs: row.processing_time_ms,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : null
      });
    }

    stmt.free();
    return separations;
  }

  deleteStemSeparation(id: string): boolean {
    this.ensureInitialized();

    this.db!.run('DELETE FROM stem_separations WHERE id = ?', [id]);
    this.saveDatabase();
    return true; // sql.js doesn't provide changes count easily
  }

  /**
   * Clean up orphaned records that reference non-existent tracks
   * Should be called on application startup
   */
  cleanupOrphanedRecords(): void {
    this.ensureInitialized();

    console.log('[DATABASE] Starting orphaned records cleanup...');

    // Clean up orphaned stem_separations
    const orphanedStems = this.db!.exec(`
      DELETE FROM stem_separations
      WHERE track_id NOT IN (SELECT id FROM tracks)
    `);
    console.log(`[DATABASE] Cleaned up orphaned stem_separations`);

    // Clean up orphaned cue_points
    const orphanedCues = this.db!.exec(`
      DELETE FROM cue_points
      WHERE track_id NOT IN (SELECT id FROM tracks)
    `);
    console.log(`[DATABASE] Cleaned up orphaned cue_points`);

    // Clean up orphaned analyses
    const orphanedAnalyses = this.db!.exec(`
      DELETE FROM analyses
      WHERE track_id NOT IN (SELECT id FROM tracks)
    `);
    console.log(`[DATABASE] Cleaned up orphaned analyses`);

    this.saveDatabase();
    console.log('[DATABASE] Orphaned records cleanup completed');
  }

  cleanupStaleAnalysisJobs(): void {
    this.ensureInitialized();

    console.log('[DATABASE] ===== STARTING STALE ANALYSIS JOBS CLEANUP =====');

    // First, let's see what jobs exist
    const allJobsResult = this.db!.exec(`
      SELECT status, COUNT(*) as count
      FROM analyses
      GROUP BY status
    `);

    if (allJobsResult.length > 0) {
      console.log('[DATABASE] Current analysis job status counts:');
      for (const row of allJobsResult[0].values) {
        console.log(`[DATABASE] - ${row[0]}: ${row[1]} jobs`);
      }
    } else {
      console.log('[DATABASE] No analysis jobs found in database');
    }

    // Reset any running jobs to pending state since no jobs can be running when the app starts up
    const beforeUpdate = this.db!.exec(`
      SELECT COUNT(*) as count FROM analyses WHERE status = 'running'
    `);
    const runningJobsBefore = beforeUpdate[0]?.values[0]?.[0] || 0;

    console.log(`[DATABASE] Found ${runningJobsBefore} running jobs to reset`);

    if (runningJobsBefore > 0) {
      this.db!.exec(`
        UPDATE analyses
        SET status = 'pending', updated_at = datetime('now', 'localtime')
        WHERE status = 'running'
      `);

      // Verify the update worked
      const afterUpdate = this.db!.exec(`
        SELECT COUNT(*) as count FROM analyses WHERE status = 'running'
      `);
      const runningJobsAfter = afterUpdate[0]?.values[0]?.[0] || 0;

      console.log(`[DATABASE] ✅ Reset ${runningJobsBefore} stale running jobs to pending`);
      console.log(`[DATABASE] Running jobs remaining: ${runningJobsAfter}`);
    } else {
      console.log('[DATABASE] No running jobs found to reset');
    }

    // Clean up duplicate pending analysis jobs for the same track
    const pendingDuplicates = this.db!.exec(`
      SELECT COUNT(*) as count FROM analyses WHERE status = 'pending'
    `);
    const pendingJobsBefore = pendingDuplicates[0]?.values[0]?.[0] || 0;

    if (pendingJobsBefore > 0) {
      console.log(`[DATABASE] Found ${pendingJobsBefore} pending jobs, checking for duplicates...`);

      // Remove duplicate pending jobs, keeping only the newest one per track
      this.db!.exec(`
        DELETE FROM analyses
        WHERE id NOT IN (
          SELECT MAX(id)
          FROM analyses
          WHERE status = 'pending'
          GROUP BY track_id
        ) AND status = 'pending'
      `);

      const pendingAfter = this.db!.exec(`
        SELECT COUNT(*) as count FROM analyses WHERE status = 'pending'
      `);
      const pendingJobsAfter = pendingAfter[0]?.values[0]?.[0] || 0;
      const duplicatesRemoved = pendingJobsBefore - pendingJobsAfter;

      if (duplicatesRemoved > 0) {
        console.log(`[DATABASE] ✅ Removed ${duplicatesRemoved} duplicate pending jobs`);
        console.log(`[DATABASE] Pending jobs remaining: ${pendingJobsAfter}`);
      } else {
        console.log('[DATABASE] No duplicate pending jobs found');
      }
    }

    this.saveDatabase();
    console.log('[DATABASE] ===== STALE ANALYSIS JOBS CLEANUP COMPLETED =====');
  }

  private async checkPermissions(): Promise<void> {
    const { promises: fs } = require('fs');
    const os = require('os');
    const path = require('path');

    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // Check if database file exists and is writable
      if (existsSync(this.dbPath)) {
        const stats = await fs.stat(this.dbPath);
        const currentUser = os.userInfo();

        if (stats.uid !== currentUser.uid) {
          console.error(`❌ DATABASE PERMISSION ERROR: File owned by different user!`);
          console.error(`   Fix with: sudo chown ${currentUser.username}:staff "${this.dbPath}"`);
          throw new Error('Database permission error - file owned by different user');
        }

        // Test write access
        await fs.access(this.dbPath, fs.constants.W_OK);
      }
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(`Database permission error: Cannot write to ${this.dbPath}`);
      }
      throw error;
    }
  }

  // SHUTDOWN SUPPORT - Get analyses by status
  getAnalysesByStatus(statuses: string[]): Analysis[] {
    this.ensureInitialized();

    const placeholders = statuses.map(() => '?').join(',');
    const sql = `
      SELECT a.*, t.title, t.artist
      FROM analyses a
      JOIN tracks t ON a.track_id = t.id
      WHERE a.status IN (${placeholders})
      ORDER BY a.created_at DESC
    `;

    try {
      const result = this.db!.exec({ sql, bind: statuses });

      if (result.length === 0) {
        return [];
      }

      return result[0].values.map((row: any[]) => ({
        id: row[0],
        trackId: row[1],
        status: row[2],
        progress: row[3],
        analysisData: row[4] ? JSON.parse(row[4]) : null,
        error: row[5],
        createdAt: new Date(row[6]),
        updatedAt: new Date(row[7]),
        track: {
          title: row[8] || 'Unknown',
          artist: row[9] || 'Unknown'
        }
      }));
    } catch (error) {
      console.error('[DATABASE] Error getting analyses by status:', error);
      return [];
    }
  }

  // SHUTDOWN SUPPORT - Abort all active analyses
  abortAllActiveAnalyses(): void {
    this.ensureInitialized();

    const sql = `
      UPDATE analyses
      SET status = 'cancelled',
          error = 'Aborted during application shutdown',
          updated_at = datetime('now', 'localtime')
      WHERE status IN ('running', 'pending')
    `;

    try {
      const result = this.db!.exec(sql);
      const affectedRows = this.db!.exec("SELECT changes() as count")[0]?.values[0]?.[0] || 0;

      console.log(`[DATABASE] ✅ Cancelled ${affectedRows} active analysis jobs`);
      this.saveDatabase();
    } catch (error) {
      console.error('[DATABASE] ❌ Error aborting active analyses:', error);
      throw error;
    }
  }

  // ============================================================================
  // JOB MANAGEMENT DATABASE METHODS
  // ============================================================================

  insertJob(job: {
    id: string;
    type: string;
    status: string;
    priority: number;
    payload: string;
    progress: number;
    attempts: number;
    maxAttempts: number;
    parentJobId?: string;
    userInitiated: boolean;
    timeoutSeconds: number;
    createdAt: number;
  }): void {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      INSERT INTO jobs (
        id, type, status, priority, payload, progress, attempts, max_attempts,
        parent_job_id, user_initiated, timeout_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      job.id, job.type, job.status, job.priority, job.payload,
      job.progress, job.attempts, job.maxAttempts, job.parentJobId,
      job.userInitiated ? 1 : 0, job.timeoutSeconds, job.createdAt
    ]);

    this.saveDatabase();
  }

  updateJobStatus(jobId: string, status: string = '', updates: {
    queuedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    timeoutAt?: Date;
    progress?: number;
    attempts?: number;
    result?: string;
    error?: string;
  } = {}): void {
    this.ensureInitialized();

    const setClause: string[] = [];
    const values: any[] = [];

    if (status) {
      setClause.push('status = ?');
      values.push(status);
    }

    if (updates.queuedAt !== undefined) {
      setClause.push('queued_at = ?');
      const queuedAt = updates.queuedAt instanceof Date ? updates.queuedAt : new Date(updates.queuedAt);
      if (isNaN(queuedAt.getTime())) {
        console.warn('Invalid queuedAt value:', updates.queuedAt);
        values.push(null);
      } else {
        values.push(queuedAt.toISOString());
      }
    }
    if (updates.startedAt !== undefined) {
      setClause.push('started_at = ?');
      const startedAt = updates.startedAt instanceof Date ? updates.startedAt : new Date(updates.startedAt);
      if (isNaN(startedAt.getTime())) {
        console.warn('Invalid startedAt value:', updates.startedAt);
        values.push(null);
      } else {
        values.push(startedAt.toISOString());
      }
    }
    if (updates.completedAt !== undefined) {
      setClause.push('completed_at = ?');
      const completedAt = updates.completedAt instanceof Date ? updates.completedAt : new Date(updates.completedAt);
      if (isNaN(completedAt.getTime())) {
        console.warn('Invalid completedAt value:', updates.completedAt);
        values.push(null);
      } else {
        values.push(completedAt.toISOString());
      }
    }
    if (updates.timeoutAt !== undefined) {
      setClause.push('timeout_at = ?');
      const timeoutAt = updates.timeoutAt instanceof Date ? updates.timeoutAt : new Date(updates.timeoutAt);
      if (isNaN(timeoutAt.getTime())) {
        console.warn('Invalid timeoutAt value:', updates.timeoutAt);
        values.push(null);
      } else {
        values.push(timeoutAt.toISOString());
      }
    }
    if (updates.progress !== undefined) {
      setClause.push('progress = ?');
      values.push(updates.progress.toString());
    }
    if (updates.attempts !== undefined) {
      setClause.push('attempts = ?');
      values.push(updates.attempts.toString());
    }
    if (updates.result !== undefined) {
      setClause.push('result = ?');
      values.push(updates.result);
    }
    if (updates.error !== undefined) {
      setClause.push('error = ?');
      values.push(updates.error);
    }

    if (setClause.length === 0) {
      return; // Nothing to update
    }

    values.push(jobId);

    const stmt = this.db!.prepare(`
      UPDATE jobs SET ${setClause.join(', ')} WHERE id = ?
    `);

    stmt.run(values);
    this.saveDatabase();
  }

  getJob(jobId: string): any {
    this.ensureInitialized();

    const results = this.db!.exec('SELECT * FROM jobs WHERE id = ?', [jobId]);

    if (results.length === 0 || results[0].values.length === 0) {
      return null;
    }

    const columns = results[0].columns;
    const values = results[0].values[0];

    const obj: any = {};
    columns.forEach((col, index) => {
      obj[col] = values[index];
    });

    return obj;
  }

  getJobsByStatus(status: string): any[] {
    this.ensureInitialized();
    const result = this.execQuery(`
      SELECT * FROM jobs WHERE status = ?
      ORDER BY priority ASC, created_at ASC
    `, [status]);
    return Array.isArray(result) ? result : [];
  }

  getJobsByParent(parentJobId: string): any[] {
    this.ensureInitialized();

    const sql = `
      SELECT * FROM jobs WHERE parent_job_id = $parentJobId
      ORDER BY created_at ASC
    `;
    return this.execQuery(sql, { $parentJobId: parentJobId });
  }

  getNextQueuedJob(): any {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      SELECT * FROM jobs
      WHERE status = 'queued'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `);
    return stmt.get();
  }

  getJobStats(): { [status: string]: number } {
    this.ensureInitialized();

    const queryResults = this.db!.exec(`
      SELECT status, COUNT(*) as count FROM jobs
      GROUP BY status
    `);

    const results = [];
    if (queryResults.length > 0) {
      const columns = queryResults[0].columns;
      const values = queryResults[0].values;

      for (const row of values) {
        const obj: any = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        results.push(obj);
      }
    }

    const stats: { [status: string]: number } = {};
    for (const row of results) {
      stats[row.status] = row.count;
    }
    return stats;
  }

  // Job management methods for testing
  createJob(
    jobId: string,
    type: string,
    priority: number,
    payload: any,
    userInitiated: boolean = true,
    timeoutSeconds: number = 300,
    parentJobId?: string
  ): string {
    this.ensureInitialized();

    // First, verify the table exists and check its schema
    try {
      const tables = this.db!.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs';");
      if (tables.length === 0 || tables[0].values.length === 0) {
        console.error('Jobs table does not exist! Recreating...');
        this.createJobsTableManually();
      }
    } catch (e) {
      console.error('Error checking table existence:', e);
    }

    // Use named parameters to avoid parameter binding issues
    const stmt = this.db!.prepare(`
      INSERT INTO jobs (id, type, status, priority, payload, user_initiated, timeout_seconds, created_at, parent_job_id)
      VALUES ($id, $type, 'created', $priority, $payload, $user_initiated, $timeout_seconds, $created_at, $parent_job_id)
    `);

    try {
      stmt.run({
        $id: jobId,
        $type: type,
        $priority: priority,
        $payload: JSON.stringify(payload),
        $user_initiated: userInitiated ? 1 : 0,
        $timeout_seconds: timeoutSeconds,
        $created_at: Date.now(),
        $parent_job_id: parentJobId || null
      });
    } catch (error) {
      // Don't log UNIQUE constraint errors as they're expected in some cases
      if (error instanceof Error && !error.message.includes('UNIQUE constraint failed')) {
        console.error('Error inserting job:', error);
        console.error('Parameters:', { jobId, type, priority, payload, userInitiated, timeoutSeconds });
      }
      throw error;
    }

    this.saveDatabase();
    return jobId;
  }

  private createJobsTableManually(): void {
    this.db!.exec(`
      DROP TABLE IF EXISTS jobs;
      CREATE TABLE jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'created',
        priority INTEGER NOT NULL DEFAULT 5,
        payload TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        result TEXT,
        error TEXT,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        parent_job_id TEXT,
        user_initiated BOOLEAN DEFAULT 0,
        timeout_seconds INTEGER DEFAULT 300,
        created_at INTEGER NOT NULL,
        queued_at INTEGER,
        started_at INTEGER,
        completed_at INTEGER,
        timeout_at INTEGER,
        FOREIGN KEY (parent_job_id) REFERENCES jobs (id)
      );
    `);
  }

  private execQuery(sql: string, params: any[] | any = []): any[] {
    try {
      let results;

      if (Array.isArray(params) && params.length > 0) {
        // Handle positional parameters - convert to named parameters for SQL.js
        // For now, convert simple cases. We may need more sophisticated logic.
        let paramIndex = 0;
        const namedParams: any = {};
        const convertedSql = sql.replace(/\?/g, () => {
          const paramName = `$param${paramIndex}`;
          namedParams[paramName] = params[paramIndex];
          paramIndex++;
          return paramName;
        });

        const stmt = this.db!.prepare(convertedSql);
        stmt.bind(namedParams);

        const rows: any[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject();
          rows.push(row);
        }
        stmt.free();
        return rows;
      } else if (typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length > 0) {
        // Handle named parameters
        const stmt = this.db!.prepare(sql);
        stmt.bind(params);

        const rows: any[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject();
          rows.push(row);
        }
        stmt.free();
        return rows;
      } else {
        // No parameters - use exec directly
        results = this.db!.exec(sql);

        if (!results || results.length === 0) return [];

        const columns = results[0].columns;
        const values = results[0].values;

        return values.map(row => {
          const obj: any = {};
          columns.forEach((col, index) => {
            obj[col] = row[index];
          });
          return obj;
        });
      }
    } catch (error) {
      console.error('SQL execution error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      console.error('Stack:', error instanceof Error ? error.stack : '');
      return [];
    }
  }

  getAllJobs(): any[] {
    this.ensureInitialized();
    return this.execQuery(`
      SELECT * FROM jobs
      ORDER BY created_at DESC
    `);
  }

  getActiveJobs(): any[] {
    this.ensureInitialized();
    return this.execQuery(`
      SELECT * FROM jobs
      WHERE status IN ('created', 'queued', 'running')
      ORDER BY priority ASC, created_at ASC
    `);
  }

  getQueuedJobs(): any[] {
    this.ensureInitialized();
    return this.execQuery(`
      SELECT * FROM jobs
      WHERE status = 'queued'
      ORDER BY priority ASC, created_at ASC
    `);
  }

  getJobsByType(type: string): any[] {
    this.ensureInitialized();
    return this.execQuery(`
      SELECT * FROM jobs
      WHERE type = ?
      ORDER BY created_at DESC
    `, [type]);
  }

  getJobsByParentId(parentJobId: string): any[] {
    return this.getJobsByParent(parentJobId);
  }


  updateJobProgress(jobId: string, progress: number): void {
    this.ensureInitialized();
    this.updateJobStatus(jobId, '', { progress });
  }

  updateJobResult(jobId: string, result: string): void {
    this.ensureInitialized();
    this.updateJobStatus(jobId, '', { result });
  }

  updateJobError(jobId: string, error: string): void {
    this.ensureInitialized();
    this.updateJobStatus(jobId, '', { error });
  }

  incrementJobAttempts(jobId: string): void {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      UPDATE jobs SET attempts = attempts + 1 WHERE id = $jobId
    `);
    stmt.run({ $jobId: jobId });
    this.saveDatabase();
  }

  cancelJob(jobId: string): void {
    this.ensureInitialized();
    this.updateJobStatus(jobId, 'cancelled');
  }

  // Simple wrapper for just updating status
  updateJobStatusOnly(jobId: string, status: string): void {
    this.updateJobStatus(jobId, status);
  }

  getUserInitiatedJobs(): any[] {
    return this.getUserJobs(true);
  }

  getSystemJobs(): any[] {
    return this.getUserJobs(false);
  }

  getJobsSortedByPriority(): any[] {
    this.ensureInitialized();

    return this.execQuery(`
      SELECT * FROM jobs
      ORDER BY priority ASC, created_at ASC
    `, []);
  }

  getJobStatistics(): {
    total: number,
    completed: number,
    running: number,
    queued: number,
    created: number,
    failed: number,
    cancelled: number
  } {
    const stats = this.getJobStats();
    return {
      total: Object.values(stats).reduce((sum, count) => sum + count, 0),
      completed: stats.completed || 0,
      running: stats.running || 0,
      queued: stats.queued || 0,
      created: stats.created || 0,
      failed: stats.failed || 0,
      cancelled: stats.cancelled || 0
    };
  }

  getJobsInTimeRange(startDate: Date, endDate: Date): any[] {
    this.ensureInitialized();

    const sql = `
      SELECT * FROM jobs
      WHERE created_at BETWEEN $startDate AND $endDate
      ORDER BY created_at DESC
    `;
    return this.execQuery(sql, { $startDate: startDate.getTime(), $endDate: endDate.getTime() });
  }

  getUserJobs(userInitiated: boolean): any[] {
    this.ensureInitialized();

    const sql = `
      SELECT * FROM jobs WHERE user_initiated = $userInitiated
      ORDER BY created_at DESC
    `;
    return this.execQuery(sql, { $userInitiated: userInitiated ? 1 : 0 });
  }

  cleanupOldJobs(olderThanMs: number): number {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      DELETE FROM jobs
      WHERE status IN ('completed', 'failed', 'cancelled', 'timeout')
      AND completed_at < ?
    `);

    const result = stmt.run([olderThanMs]);
    this.saveDatabase();

    return result.changes;
  }

  resetRunningJobs(): number {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      UPDATE jobs
      SET status = 'queued', error = 'Interrupted by application restart'
      WHERE status = 'running'
    `);

    const result = stmt.run();
    this.saveDatabase();

    return result.changes;
  }

  cancelAllActiveJobs(reason: string): number {
    this.ensureInitialized();

    const stmt = this.db!.prepare(`
      UPDATE jobs
      SET status = 'cancelled',
          error = ?,
          completed_at = ?
      WHERE status IN ('running', 'queued')
    `);

    const result = stmt.run([reason, Date.now()]);
    this.saveDatabase();

    return result.changes;
  }

  // Temporary exec method for compatibility with JobManager - TODO: Remove when JobManager is updated
  exec(sql: string, params: any[] = []): any {
    this.ensureInitialized();

    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      // For SQL.js compatibility, use execQuery for SELECT statements
      // Convert positional params to named params if needed
      if (params.length > 0) {
        // For simple cases, try to execute directly with positional params
        try {
          const stmt = this.db.prepare(sql);
          const result = stmt.getAsObject(params);
          if (result) {
            return [{
              columns: Object.keys(result),
              values: [Object.values(result)]
            }];
          }
          return [{ columns: [], values: [] }];
        } catch (error) {
          console.warn('Failed to execute SQL with positional params:', error);
          return [{ columns: [], values: [] }];
        }
      } else {
        // No params, use execQuery
        const rows = this.execQuery(sql, {});
        return [{
          columns: rows.length > 0 ? Object.keys(rows[0]) : [],
          values: rows.map(row => Object.values(row))
        }];
      }
    } else {
      const stmt = this.db.prepare(sql);
      return stmt.run(params);
    }
  }

  close(): void {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
      console.log('SQLite database closed');
    }
  }
}
