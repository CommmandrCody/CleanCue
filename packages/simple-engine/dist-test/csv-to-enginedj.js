#!/usr/bin/env node
"use strict";
/**
 * Convert CSV playlists directly to Engine DJ database
 * No CleanCue library needed - just CSV files and music files
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
async function parseCSV(csvPath) {
    const content = await fs_1.promises.readFile(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const tracks = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
        const parts = line.split(',');
        if (parts.length >= 4) {
            tracks.push({
                filename: parts[0],
                artist: parts[1],
                title: parts[2],
                filepath: parts[3]
            });
        }
    }
    return tracks;
}
async function createEngineDJDatabase(outputPath, playlists) {
    // Create Engine Library directory structure
    const engineLibPath = path_1.default.join(outputPath, 'Engine Library');
    await fs_1.promises.mkdir(engineLibPath, { recursive: true });
    // Create main database
    const mainDbPath = path_1.default.join(engineLibPath, 'm.db');
    const db = new better_sqlite3_1.default(mainDbPath);
    console.log('📊 Creating Engine DJ database schema...\n');
    // Information table
    db.exec(`
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
    // Generate UUID
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    db.prepare(`
    INSERT OR REPLACE INTO Information
    (id, uuid, schemaVersionMajor, schemaVersionMinor, schemaVersionPatch, currentPlayedIndiciator, lastRekordBoxLibraryImportReadCounter)
    VALUES (1, ?, 1, 15, 0, 0, 0)
  `).run(uuid);
    // Track table
    db.exec(`
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
    // MetaData table
    db.exec(`
    CREATE TABLE IF NOT EXISTS MetaData (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type INTEGER,
      text TEXT
    );
  `);
    // Playlist table
    db.exec(`
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
    db.exec(`
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
    console.log('✅ Schema created\n');
    // Collect all unique tracks
    const trackMap = new Map();
    for (const playlist of playlists) {
        for (const track of playlist.tracks) {
            trackMap.set(track.filepath, track);
        }
    }
    console.log(`📀 Adding ${trackMap.size} tracks to database...\n`);
    // Insert tracks
    const trackInsert = db.prepare(`
    INSERT INTO Track (
      playOrder, length, lengthCalculated, bpm, year, path, filename, bitrate,
      bpmAnalyzed, trackType, isExternalTrack, originDatabaseUuid, originTrackId
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const metadataInsert = db.prepare(`
    INSERT INTO MetaData (type, text) VALUES (?, ?)
  `);
    // Scan the directory to find actual files
    const musicDir = '/Users/wagner/Music/DJ/Bathrobe_PoolParty';
    console.log(`🔍 Scanning directory: ${musicDir}\n`);
    const actualFiles = await fs_1.promises.readdir(musicDir);
    const normalize = (s) => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const trackIdMap = new Map();
    let trackNum = 0;
    for (const [csvPath, track] of trackMap) {
        // Try to find the actual file by fuzzy matching
        const expectedFilename = path_1.default.basename(csvPath);
        const normalizedExpected = normalize(expectedFilename.replace(/\.flac$/, ''));
        let actualFile = actualFiles.find(f => {
            const normalizedActual = normalize(f.replace(/\.flac$/, ''));
            // Check if actual file starts with expected (handles added BPM/key suffixes)
            return normalizedActual.startsWith(normalizedExpected) ||
                normalizedActual.includes(normalizedExpected);
        });
        if (!actualFile) {
            console.log(`  ⚠️  File not found: ${track.artist} - ${track.title}`);
            continue;
        }
        const actualPath = path_1.default.join(musicDir, actualFile);
        // Insert metadata
        metadataInsert.run(1, track.title); // title
        metadataInsert.run(2, track.artist); // artist
        // Insert track with ACTUAL file path
        const result = trackInsert.run(0, // playOrder
        0, // length (we don't have this from CSV)
        0, // lengthCalculated
        0, // BPM * 100
        0, // year
        actualPath, // Use actual found path
        actualFile, // Use actual filename
        320, // bitrate default
        0, // bpmAnalyzed
        1, // trackType
        0, // isExternalTrack
        uuid, trackNum);
        trackIdMap.set(csvPath, result.lastInsertRowid);
        trackNum++;
        console.log(`  ✅ ${track.artist} - ${track.title}`);
    }
    console.log(`\n📋 Creating ${playlists.length} playlists...\n`);
    // Create playlists
    const playlistInsert = db.prepare(`
    INSERT INTO Playlist (title, parentListId, isPersisted, nextListId, lastEditTime, isExplicitlyExported)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const playlistTrackInsert = db.prepare(`
    INSERT INTO PlaylistTrackList (playlistId, trackId, trackIdInOriginDatabase, databaseUuid, trackNumber)
    VALUES (?, ?, ?, ?, ?)
  `);
    for (const playlist of playlists) {
        const result = playlistInsert.run(playlist.name, 0, // parentListId
        1, // isPersisted
        0, // nextListId
        new Date().toISOString(), 1 // isExplicitlyExported
        );
        const playlistId = result.lastInsertRowid;
        let trackNumber = 0;
        for (const track of playlist.tracks) {
            const trackId = trackIdMap.get(track.filepath);
            if (trackId) {
                playlistTrackInsert.run(playlistId, trackId, trackId, uuid, trackNumber);
                trackNumber++;
            }
        }
        console.log(`  ✅ ${playlist.name}: ${trackNumber} tracks`);
    }
    db.close();
    console.log(`\n✅ Engine DJ database created!`);
    console.log(`📂 Location: ${engineLibPath}\n`);
    return mainDbPath;
}
async function main() {
    const playlistDir = '/Users/wagner/Downloads/Bathrobe_PoolParty_EngineDJ_Package';
    const outputPath = '/Users/wagner/Desktop/EngineDJ_Export_Direct';
    console.log('🎵 CSV to Engine DJ Converter\n');
    console.log('📂 Reading playlists from:', playlistDir);
    console.log('📂 Output to:', outputPath);
    console.log('');
    try {
        // Find all CSV files
        const files = await fs_1.promises.readdir(playlistDir);
        const csvFiles = files.filter(f => f.endsWith('.csv') &&
            !f.includes('Timed') &&
            !f.includes('Spine'));
        console.log(`📋 Found ${csvFiles.length} playlists:\n`);
        // Parse all playlists
        const playlists = [];
        for (const csvFile of csvFiles) {
            const playlistName = csvFile.replace('.csv', '').replace('Bathrobe_', '');
            const tracks = await parseCSV(path_1.default.join(playlistDir, csvFile));
            playlists.push({ name: playlistName, tracks });
            console.log(`  📝 ${playlistName}: ${tracks.length} tracks`);
        }
        console.log('');
        // Create Engine DJ database
        const dbPath = await createEngineDJDatabase(outputPath, playlists);
        console.log('💡 Next steps:');
        console.log('   1. Copy the "Engine Library" folder to your USB drive');
        console.log('   2. Insert USB into Engine DJ hardware');
        console.log('   3. Check if tracks and playlists appear\n');
        // Verify database
        console.log('🔍 Database verification:\n');
        const db = new better_sqlite3_1.default(dbPath, { readonly: true });
        const trackCount = db.prepare('SELECT COUNT(*) as count FROM Track').get();
        const playlistCount = db.prepare('SELECT COUNT(*) as count FROM Playlist').get();
        console.log(`  Tracks: ${trackCount.count}`);
        console.log(`  Playlists: ${playlistCount.count}`);
        db.close();
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}
main();
