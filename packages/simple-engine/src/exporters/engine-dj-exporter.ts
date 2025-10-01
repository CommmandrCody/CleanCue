/**
 * Engine DJ Exporter
 *
 * Exports CleanCue library to Engine DJ format for use with:
 * - Denon DJ Prime series hardware (SC5000, SC6000, etc.)
 * - Engine DJ Desktop software
 * - Engine DJ mobile apps
 *
 * Database Structure:
 * /Engine Library/
 *   ├── m.db (main database - tracks, metadata, crates, playlists)
 *   ├── p.db (performance data - beatgrids, waveforms, cues)
 *   └── Music/ (audio files)
 */

import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { Track } from '../simple-store';

export interface EngineDJExportOptions {
  outputPath: string;           // USB/SD card root path
  copyFiles?: boolean;           // Copy audio files to USB (default: true)
  createPerformanceData?: boolean; // Generate p.db with basic data (default: false)
  playlistName?: string;         // Optional playlist name for selected tracks
}

export interface EngineDJExportResult {
  success: boolean;
  tracksExported: number;
  filescopied: number;
  databasePath: string;
  error?: string;
}

/**
 * Engine DJ Database Exporter
 */
export class EngineDJExporter {
  private mainDb: Database.Database | null = null;
  private performanceDb: Database.Database | null = null;

  /**
   * Export tracks to Engine DJ format
   */
  async export(tracks: Track[], options: EngineDJExportOptions): Promise<EngineDJExportResult> {
    const result: EngineDJExportResult = {
      success: false,
      tracksExported: 0,
      filescopied: 0,
      databasePath: ''
    };

    try {
      // Create Engine Library directory structure
      const engineLibPath = path.join(options.outputPath, 'Engine Library');
      const musicPath = path.join(engineLibPath, 'Music');

      await fs.mkdir(engineLibPath, { recursive: true });
      if (options.copyFiles !== false) {
        await fs.mkdir(musicPath, { recursive: true });
      }

      // Create main database
      const mainDbPath = path.join(engineLibPath, 'm.db');
      this.mainDb = new Database(mainDbPath);
      await this.createMainDatabaseSchema();

      // Create performance database (optional)
      if (options.createPerformanceData) {
        const perfDbPath = path.join(engineLibPath, 'p.db');
        this.performanceDb = new Database(perfDbPath);
        await this.createPerformanceDatabaseSchema();
      }

      // Export tracks
      for (const track of tracks) {
        try {
          await this.exportTrack(track, musicPath, options.copyFiles !== false);
          result.tracksExported++;
        } catch (error) {
          console.error(`Failed to export track ${track.id}:`, error);
        }
      }

      // Create playlist/crate if requested
      if (options.playlistName && result.tracksExported > 0) {
        await this.createPlaylist(options.playlistName, tracks);
      }

      // Close databases
      this.mainDb.close();
      if (this.performanceDb) {
        this.performanceDb.close();
      }

      result.success = true;
      result.databasePath = mainDbPath;

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error('Engine DJ export failed:', error);

      // Cleanup on failure
      if (this.mainDb) this.mainDb.close();
      if (this.performanceDb) this.performanceDb.close();

      return result;
    }
  }

  /**
   * Create main database schema (m.db)
   * Based on Engine DJ database format
   */
  private async createMainDatabaseSchema(): Promise<void> {
    if (!this.mainDb) throw new Error('Database not initialized');

    // Information table - database metadata
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS Information (
        id INTEGER PRIMARY KEY,
        uuid TEXT UNIQUE,
        schemaVersionMajor INTEGER,
        schemaVersionMinor INTEGER,
        schemaVersionPatch INTEGER,
        currentPlayedIndiciator INTEGER,
        lastRekordBoxLibraryImportReadCounter INTEGER
      );
    `);

    // Insert database info
    this.mainDb.prepare(`
      INSERT OR REPLACE INTO Information
      (id, uuid, schemaVersionMajor, schemaVersionMinor, schemaVersionPatch, currentPlayedIndiciator, lastRekordBoxLibraryImportReadCounter)
      VALUES (1, ?, 1, 15, 0, 0, 0)
    `).run(this.generateUUID());

    // Track table - core track information
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS Track (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playOrder INTEGER,
        length INTEGER,
        lengthCalculated INTEGER,
        bpm INTEGER,
        year INTEGER,
        path TEXT,
        filename TEXT,
        bitrate INTEGER,
        bpmAnalyzed REAL,
        trackType INTEGER,
        isExternalTrack INTEGER,
        uuidOfExternalDatabase TEXT,
        idTrackInExternalDatabase INTEGER,
        idAlbumArt INTEGER,
        pdbImportKey INTEGER,
        streamingSource TEXT,
        uri TEXT,
        isBeatGridLocked INTEGER,
        originDatabaseUuid TEXT,
        originTrackId INTEGER,
        trackData BLOB,
        overviewWaveFormData BLOB,
        beatData BLOB,
        quickCues BLOB,
        loops BLOB,
        thirdPartySourceId INTEGER,
        streamingFlags INTEGER,
        explicitLyrics INTEGER,
        activeOnLoadLoops INTEGER
      );
    `);

    // MetaData table - textual metadata
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS MetaData (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type INTEGER,
        text TEXT
      );
    `);

    // MetaDataInteger table - numeric metadata
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS MetaDataInteger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type INTEGER,
        value INTEGER
      );
    `);

    // Crate table - track collections
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS Crate (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        path TEXT
      );
    `);

    // CrateTrackList table - tracks in crates
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS CrateTrackList (
        databaseUuid TEXT,
        crateId INTEGER,
        trackId INTEGER,
        trackNumber INTEGER,
        PRIMARY KEY (databaseUuid, crateId, trackId)
      );
    `);

    // Playlist table
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS Playlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        parentListId INTEGER,
        isPersisted INTEGER,
        nextListId INTEGER,
        lastEditTime TEXT,
        isExplicitlyExported INTEGER
      );
    `);

    // PlaylistTrackList table
    this.mainDb.exec(`
      CREATE TABLE IF NOT EXISTS PlaylistTrackList (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlistId INTEGER,
        trackId INTEGER,
        trackIdInOriginDatabase INTEGER,
        databaseUuid TEXT,
        trackNumber INTEGER,
        FOREIGN KEY (playlistId) REFERENCES Playlist(id)
      );
    `);

    console.log('✅ Engine DJ main database schema created');
  }

  /**
   * Create performance database schema (p.db)
   */
  private async createPerformanceDatabaseSchema(): Promise<void> {
    if (!this.performanceDb) return;

    // PerformanceData table - beat grids, waveforms, etc.
    this.performanceDb.exec(`
      CREATE TABLE IF NOT EXISTS PerformanceData (
        id INTEGER PRIMARY KEY,
        isAnalyzed INTEGER,
        isRendered INTEGER,
        trackData BLOB,
        highResolutionWaveFormData BLOB,
        overviewWaveFormData BLOB,
        beatData BLOB,
        quickCues BLOB,
        loops BLOB,
        hasSeratoValues INTEGER,
        hasRekordboxValues INTEGER,
        hasTraktorValues INTEGER
      );
    `);

    console.log('✅ Engine DJ performance database schema created');
  }

  /**
   * Export a single track to Engine DJ format
   */
  private async exportTrack(track: Track, musicPath: string, copyFile: boolean): Promise<void> {
    if (!this.mainDb) throw new Error('Database not initialized');

    const dbUuid = this.getOrCreateDatabaseUuid();

    // Determine destination path
    let destPath: string;
    let relativePath: string;

    if (copyFile) {
      // Copy file to Engine Library/Music/
      const filename = path.basename(track.path);
      destPath = path.join(musicPath, filename);
      relativePath = path.join('Music', filename);

      // Copy file
      await fs.copyFile(track.path, destPath);
    } else {
      // Use original path (link mode)
      destPath = track.path;
      relativePath = track.path;
    }

    // Insert metadata entries
    const titleId = this.insertMetadata(1, track.title || 'Unknown');
    const artistId = this.insertMetadata(2, track.artist || 'Unknown');
    const albumId = this.insertMetadata(3, track.album || '');
    const genreId = this.insertMetadata(4, track.genre || '');
    const commentId = this.insertMetadata(5, '');

    // Insert track
    const trackInsert = this.mainDb.prepare(`
      INSERT INTO Track (
        playOrder, length, lengthCalculated, bpm, year, path, filename, bitrate,
        bpmAnalyzed, trackType, isExternalTrack, uuidOfExternalDatabase,
        idTrackInExternalDatabase, originDatabaseUuid, originTrackId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const trackInfo = trackInsert.run(
      0, // playOrder
      Math.round((track.duration || 0) * 1000), // length in milliseconds
      Math.round((track.duration || 0) * 1000), // lengthCalculated
      Math.round(track.bpm || 0) * 100, // BPM * 100
      track.year || 0,
      relativePath,
      path.basename(track.path),
      320, // bitrate - default 320kbps
      track.bpm || 0,
      1, // trackType (1 = track)
      0, // isExternalTrack
      null,
      null,
      dbUuid,
      track.id
    );

    console.log(`✅ Exported: ${track.artist} - ${track.title}`);
  }

  /**
   * Create a playlist/crate with the exported tracks
   */
  private async createPlaylist(name: string, tracks: Track[]): Promise<void> {
    if (!this.mainDb) throw new Error('Database not initialized');

    const dbUuid = this.getOrCreateDatabaseUuid();

    // Create playlist
    const playlistInsert = this.mainDb.prepare(`
      INSERT INTO Playlist (title, parentListId, isPersisted, nextListId, lastEditTime, isExplicitlyExported)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const playlistInfo = playlistInsert.run(
      name,
      0, // parentListId (0 = root)
      1, // isPersisted
      0, // nextListId
      new Date().toISOString(),
      1  // isExplicitlyExported
    );

    const playlistId = playlistInfo.lastInsertRowid as number;

    // Add tracks to playlist
    const trackInsert = this.mainDb.prepare(`
      INSERT INTO PlaylistTrackList (playlistId, trackId, trackIdInOriginDatabase, databaseUuid, trackNumber)
      VALUES (?, ?, ?, ?, ?)
    `);

    tracks.forEach((track, index) => {
      trackInsert.run(playlistId, index + 1, track.id, dbUuid, index);
    });

    console.log(`✅ Created playlist: ${name} with ${tracks.length} tracks`);
  }

  /**
   * Insert metadata text and return its ID
   */
  private insertMetadata(type: number, text: string): number {
    if (!this.mainDb) throw new Error('Database not initialized');

    const insert = this.mainDb.prepare(`
      INSERT INTO MetaData (type, text) VALUES (?, ?)
    `);

    const result = insert.run(type, text);
    return result.lastInsertRowid as number;
  }

  /**
   * Get or create database UUID
   */
  private getOrCreateDatabaseUuid(): string {
    if (!this.mainDb) throw new Error('Database not initialized');

    const row = this.mainDb.prepare('SELECT uuid FROM Information WHERE id = 1').get() as { uuid: string } | undefined;
    return row?.uuid || this.generateUUID();
  }

  /**
   * Generate a UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
