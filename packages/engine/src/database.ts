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

    // Create analyses table
    this.db!.run(`
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
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_analyses_track_id ON analyses(track_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_cue_points_track_id ON cue_points(track_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_stem_separations_track_id ON stem_separations(track_id)`);
    this.db!.run(`CREATE INDEX IF NOT EXISTS idx_stem_separations_status ON stem_separations(status)`);

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  close(): void {
    if (this.db) {
      this.saveDatabase();
      this.db.close();
      this.db = null;
      console.log('SQLite database closed');
    }
  }
}
