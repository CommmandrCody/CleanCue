#!/usr/bin/env node
/**
 * Add CSV playlists to existing Engine DJ database
 * Preserves all existing tracks and playlists
 */

import { promises as fs } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

interface PlaylistTrack {
  filename: string;
  artist: string;
  title: string;
  filepath: string;
}

async function parseCSV(csvPath: string): Promise<PlaylistTrack[]> {
  const content = await fs.readFile(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  const tracks: PlaylistTrack[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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

async function main() {
  const playlistDir = '/Users/wagner/Downloads/Bathrobe_PoolParty_EngineDJ_Package';
  const dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';
  const musicDir = '/Users/wagner/Music/DJ/Bathrobe_PoolParty';

  console.log('🎵 Add Playlists to Existing Engine DJ Database\n');
  console.log(`📂 Database: ${dbPath}`);
  console.log(`📂 Playlists: ${playlistDir}`);
  console.log(`📂 Music: ${musicDir}`);
  console.log('');

  try {
    // BACKUP FIRST!
    console.log('💾 Creating backup...');
    const backupPath = dbPath + '.backup-' + Date.now();
    await fs.copyFile(dbPath, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);

    // Open existing database
    const db = new Database(dbPath);

    // Get database UUID
    const dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get() as { uuid: string } | undefined;
    if (!dbInfo) {
      console.log('❌ Invalid Engine DJ database - no Information table');
      process.exit(1);
    }
    const dbUuid = dbInfo.uuid;

    // Check existing content
    const existingTracks = db.prepare('SELECT COUNT(*) as count FROM Track').get() as { count: number };
    const existingPlaylists = db.prepare('SELECT COUNT(*) as count FROM Playlist').get() as { count: number };
    console.log('📊 Existing database:');
    console.log(`  Tracks: ${existingTracks.count}`);
    console.log(`  Playlists: ${existingPlaylists.count}\n`);

    // Find all CSV files
    const files = await fs.readdir(playlistDir);
    const csvFiles = files.filter(f =>
      f.endsWith('.csv') &&
      !f.includes('Timed') &&
      !f.includes('Spine')
    );

    console.log(`📋 Found ${csvFiles.length} playlists to import:\n`);

    // Parse all playlists
    const playlists: { name: string; tracks: PlaylistTrack[] }[] = [];
    for (const csvFile of csvFiles) {
      const playlistName = csvFile.replace('.csv', '').replace('Bathrobe_', '');
      const tracks = await parseCSV(path.join(playlistDir, csvFile));
      playlists.push({ name: playlistName, tracks });
      console.log(`  📝 ${playlistName}: ${tracks.length} tracks`);
    }
    console.log('');

    // Get all existing tracks in database
    const dbTracks = db.prepare('SELECT id, path, filename FROM Track').all() as { id: number; path: string; filename: string }[];
    console.log(`🔍 Checking for tracks in database (${dbTracks.length} existing tracks)...\n`);

    // Scan music directory
    const actualFiles = await fs.readdir(musicDir);
    const normalize = (s: string) => s
      .normalize('NFD')  // Decompose unicode
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Build map of CSV tracks to database track IDs
    const trackMap = new Map<string, number>(); // CSV filepath -> DB track ID
    const newTracks: { csvPath: string; track: PlaylistTrack; actualPath: string; actualFile: string }[] = [];

    // Collect unique tracks from all playlists
    const allCsvTracks = new Map<string, PlaylistTrack>();
    for (const playlist of playlists) {
      for (const track of playlist.tracks) {
        allCsvTracks.set(track.filepath, track);
      }
    }

    console.log(`📀 Processing ${allCsvTracks.size} unique tracks...\n`);

    for (const [csvPath, track] of allCsvTracks) {
      // First, check if track already exists in database (by path or filename)
      let dbTrack = dbTracks.find(t => t.path === csvPath);

      if (!dbTrack) {
        // Try by filename
        const csvFilename = path.basename(csvPath);
        dbTrack = dbTracks.find(t => t.filename === csvFilename);
      }

      if (dbTrack) {
        console.log(`  ✓ Already in DB: ${track.artist} - ${track.title}`);
        trackMap.set(csvPath, dbTrack.id);
        continue;
      }

      // Not in database - try to find the actual file by artist and title
      const normalizedArtist = normalize(track.artist);
      const normalizedTitle = normalize(track.title);

      const actualFile = actualFiles.find(f => {
        const normalizedFile = normalize(f.replace(/\.flac$/, ''));
        // Match if file contains both artist and title
        return normalizedFile.includes(normalizedArtist) &&
               normalizedFile.includes(normalizedTitle);
      });

      if (actualFile) {
        const actualPath = path.join(musicDir, actualFile);

        // Check if this actual path already exists in database (from previous run)
        const existing = dbTracks.find(t => t.path === actualPath);
        if (existing) {
          console.log(`  ✓ Already in DB (by path): ${track.artist} - ${track.title}`);
          trackMap.set(csvPath, existing.id);
        } else {
          newTracks.push({ csvPath, track, actualPath, actualFile });
        }
      } else {
        console.log(`  ⚠️  File not found: ${track.artist} - ${track.title}`);
      }
    }

    // Add new tracks to database
    if (newTracks.length > 0) {
      console.log(`\n➕ Adding ${newTracks.length} new tracks to database...\n`);

      const trackInsert = db.prepare(`
        INSERT INTO Track (
          playOrder, length, bpm, year, path, filename, bitrate,
          bpmAnalyzed, title, artist
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const { csvPath, track, actualPath, actualFile } of newTracks) {
        // Insert track with metadata
        const result = trackInsert.run(
          0, // playOrder
          0, // length
          0, // bpm
          0, // year
          actualPath,
          actualFile,
          320, // bitrate
          0, // bpmAnalyzed
          track.title,
          track.artist
        );

        trackMap.set(csvPath, result.lastInsertRowid as number);
        console.log(`  ✅ ${track.artist} - ${track.title}`);
      }
    }

    // Create playlists
    console.log(`\n📋 Creating playlists...\n`);

    // Start transaction
    db.prepare('BEGIN').run();

    const playlistInsert = db.prepare(`
      INSERT INTO Playlist (title, parentListId, isPersisted, nextListId, lastEditTime, isExplicitlyExported)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const playlistEntityInsert = db.prepare(`
      INSERT INTO PlaylistEntity (listId, trackId, databaseUuid, nextEntityId, membershipReference)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const playlist of playlists) {
      // Check if playlist already exists
      const existingPlaylist = db.prepare('SELECT id FROM Playlist WHERE title = ? AND parentListId = 0')
        .get(playlist.name) as { id: number } | undefined;

      let playlistId: number;

      if (existingPlaylist) {
        console.log(`  ♻️  Updating existing playlist: ${playlist.name}`);
        playlistId = existingPlaylist.id;

        // Delete existing entities
        db.prepare('DELETE FROM PlaylistEntity WHERE listId = ?').run(playlistId);
      } else {
        const result = playlistInsert.run(
          playlist.name,
          0, 1, 0,
          new Date().toISOString(),
          1
        );
        playlistId = result.lastInsertRowid as number;
      }

      let prevEntityId: number | null = null;
      let trackCount = 0;

      for (const track of playlist.tracks) {
        const trackId = trackMap.get(track.filepath);
        if (trackId) {
          console.log(`    Adding track ${trackId} to playlist ${playlistId}`);
          const entityResult = playlistEntityInsert.run(
            playlistId,
            trackId,
            dbUuid,
            0, // nextEntityId (will be updated for previous entity)
            0  // membershipReference (must be 0, not 1!)
          );

          const currentEntityId = entityResult.lastInsertRowid as number;
          console.log(`      Entity ID: ${currentEntityId}`);

          // Update previous entity to point to this one
          if (prevEntityId) {
            db.prepare('UPDATE PlaylistEntity SET nextEntityId = ? WHERE id = ?')
              .run(currentEntityId, prevEntityId);
          }

          prevEntityId = currentEntityId;
          trackCount++;
        } else {
          console.log(`    ⚠️  No trackId for: ${track.filepath}`);
        }
      }

      console.log(`  ✅ ${playlist.name}: ${trackCount} tracks`);
    }

    // Commit transaction
    db.prepare('COMMIT').run();
    console.log('\n💾 Transaction committed');

    db.close();

    console.log(`\n✅ Playlists added successfully!\n`);
    console.log('📊 Summary:');
    console.log(`  New tracks added: ${newTracks.length}`);
    console.log(`  Playlists created: ${playlists.length}`);
    console.log(`  Backup saved: ${backupPath}\n`);

    console.log('💡 The playlists should now appear in Engine DJ Desktop or hardware!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
