import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import type { Track, Analysis, CuePoint, Playlist, PlaylistTrack, HealthIssue } from '@cleancue/shared';

export class CleanCueDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.setupTables();
    console.log(`SQLite database initialized at: ${dbPath}`);
  }

  private setupTables() {
    // Create tracks table
    this.db.exec(`
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
        genre TEXT,
        year INTEGER,
        duration_ms INTEGER,
        bitrate INTEGER,
        sample_rate INTEGER,
        channels INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create analyses table
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);
      CREATE INDEX IF NOT EXISTS idx_tracks_hash ON tracks(hash);
      CREATE INDEX IF NOT EXISTS idx_analyses_track_id ON analyses(track_id);
      CREATE INDEX IF NOT EXISTS idx_cue_points_track_id ON cue_points(track_id);
      CREATE INDEX IF NOT EXISTS idx_stem_separations_track_id ON stem_separations(track_id);
      CREATE INDEX IF NOT EXISTS idx_stem_separations_status ON stem_separations(status);
    `);
  }

  async insertTrack(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track> {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO tracks (
        id, path, hash, filename, extension, size_bytes, file_modified_at,
        title, artist, album, genre, year, duration_ms, bitrate, sample_rate, channels,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, track.path, track.hash, track.filename, track.extension, track.sizeBytes,
      track.fileModifiedAt.getTime(), track.title, track.artist, track.album,
      track.genre, track.year, track.durationMs, track.bitrate, track.sampleRate,
      track.channels, now, now
    );

    return {
      ...track,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
  }

  updateTrack(id: string, updates: Partial<Track>): void {
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

      const stmt = this.db.prepare(`UPDATE tracks SET ${updateFields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  }

  getTrack(id: string): Track | null {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToTrack(row) : null;
  }

  getTrackByPath(path: string): Track | null {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE path = ?');
    const row = stmt.get(path) as any;
    return row ? this.rowToTrack(row) : null;
  }

  getTrackByHash(hash: string): Track[] {
    const stmt = this.db.prepare('SELECT * FROM tracks WHERE hash = ?');
    const rows = stmt.all(hash) as any[];
    return rows.map(row => this.rowToTrack(row));
  }

  getAllTracks(): Track[] {
    const stmt = this.db.prepare('SELECT * FROM tracks ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToTrack(row));
  }

  deleteTrack(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tracks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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
      genre: row.genre,
      year: row.year,
      durationMs: row.duration_ms,
      bitrate: row.bitrate,
      sampleRate: row.sample_rate,
      channels: row.channels,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async insertAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt'>): Promise<Analysis> {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO analyses (id, track_id, analyzer_name, analyzer_version, parameters, results, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      analysis.trackId,
      analysis.analyzerName,
      analysis.analyzerVersion,
      JSON.stringify(analysis.parameters),
      JSON.stringify(analysis.results),
      analysis.status,
      now
    );

    return {
      ...analysis,
      id,
      createdAt: new Date(now)
    };
  }

  updateAnalysis(id: string, updates: Partial<Analysis>): void {
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
      const stmt = this.db.prepare(`UPDATE analyses SET ${updateFields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  }

  getAnalysesByTrack(trackId: string): Analysis[] {
    const stmt = this.db.prepare('SELECT * FROM analyses WHERE track_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(trackId) as any[];
    return rows.map(row => this.rowToAnalysis(row));
  }

  async insertCue(cue: Omit<CuePoint, 'id' | 'createdAt'>): Promise<CuePoint> {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO cue_points (id, track_id, type, position_ms, label, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, cue.trackId, cue.type, cue.positionMs, cue.label, cue.confidence, now);

    return {
      ...cue,
      id,
      createdAt: new Date(now)
    };
  }

  getCuesByTrack(trackId: string): CuePoint[] {
    const stmt = this.db.prepare('SELECT * FROM cue_points WHERE track_id = ? ORDER BY position_ms');
    const rows = stmt.all(trackId) as any[];
    return rows.map(row => this.rowToCuePoint(row));
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
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO stem_separations (
        id, track_id, model_name, model_version, settings, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      separation.trackId,
      separation.modelName,
      separation.modelVersion,
      JSON.stringify(separation.settings),
      separation.status,
      now
    );

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
      const stmt = this.db.prepare(`UPDATE stem_separations SET ${updateFields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  }

  getStemSeparationByTrackId(trackId: string) {
    const stmt = this.db.prepare('SELECT * FROM stem_separations WHERE track_id = ? ORDER BY created_at DESC LIMIT 1');
    const row = stmt.get(trackId) as any;

    if (!row) return null;

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

  getAllStemSeparations() {
    const stmt = this.db.prepare('SELECT * FROM stem_separations ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
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
    }));
  }

  deleteStemSeparation(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM stem_separations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
    console.log('SQLite database closed');
  }
}
