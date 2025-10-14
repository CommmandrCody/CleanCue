#!/usr/bin/env node
/**
 * Import CSV playlists into Engine DJ database
 */

import { EngineDJExporter } from './src/exporters/engine-dj-exporter.js';
import { SimpleStore } from './src/simple-store.js';
import { promises as fs } from 'fs';
import path from 'path';

interface PlaylistTrack {
  filename: string;
  artist: string;
  title: string;
  filepath: string;
}

async function parseCSV(csvPath: string): Promise<PlaylistTrack[]> {
  const content = await fs.readFile(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  // Skip header
  const tracks: PlaylistTrack[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV (simple split, assumes no commas in fields)
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

async function importPlaylists() {
  const playlistDir = '/Users/wagner/Downloads/Bathrobe_PoolParty_EngineDJ_Package';
  const outputPath = '/Users/wagner/Desktop/EngineDJ_Export';

  console.log('🎵 Engine DJ Playlist Import\n');

  try {
    // Initialize store
    console.log('📚 Loading CleanCue library...');
    const store = new SimpleStore();
    await store.load();
    const allTracks = await store.getTracks();
    console.log(`✅ Loaded ${allTracks.length} tracks\n`);

    // Find all CSV files
    const files = await fs.readdir(playlistDir);
    const csvFiles = files.filter(f => f.endsWith('.csv') && !f.includes('Timed') && !f.includes('Spine'));

    console.log(`📋 Found ${csvFiles.length} playlists:\n`);
    csvFiles.forEach(f => console.log(`  - ${f}`));
    console.log('');

    // Parse all playlists
    const playlists: { name: string; tracks: PlaylistTrack[] }[] = [];
    for (const csvFile of csvFiles) {
      const playlistName = csvFile.replace('.csv', '').replace('Bathrobe_', '');
      const tracks = await parseCSV(path.join(playlistDir, csvFile));
      playlists.push({ name: playlistName, tracks });
      console.log(`📝 ${playlistName}: ${tracks.length} tracks`);
    }
    console.log('');

    // Match tracks from CSV to library
    console.log('🔍 Matching tracks to library...\n');
    const allPlaylistTracks = new Set<string>();
    const matchedTracks = new Map<string, any>();

    for (const playlist of playlists) {
      let matched = 0;
      let missing = 0;

      for (const csvTrack of playlist.tracks) {
        allPlaylistTracks.add(csvTrack.filepath);

        // Normalize for comparison
        const normalizeText = (s: string) => s.toLowerCase().trim()
          .replace(/[^\w\s]/g, '') // Remove punctuation
          .replace(/\s+/g, ' ');   // Normalize whitespace

        const csvArtistNorm = normalizeText(csvTrack.artist);
        const csvTitleNorm = normalizeText(csvTrack.title);

        // Try to find in library by path
        let found = allTracks.find(t => t.path === csvTrack.filepath);

        // Try by filename
        if (!found) {
          found = allTracks.find(t => t.filename === csvTrack.filename);
        }

        // Try by normalized artist + title (handles punctuation differences)
        if (!found) {
          found = allTracks.find(t => {
            const trackArtistNorm = normalizeText(t.artist || '');
            const trackTitleNorm = normalizeText(t.title || '');

            return trackArtistNorm === csvArtistNorm && trackTitleNorm === csvTitleNorm;
          });
        }

        // Try partial title match (sometimes titles have extra info)
        if (!found) {
          found = allTracks.find(t => {
            const trackArtistNorm = normalizeText(t.artist || '');
            const trackTitleNorm = normalizeText(t.title || '');

            return trackArtistNorm === csvArtistNorm && trackTitleNorm.includes(csvTitleNorm);
          });
        }

        if (found) {
          matchedTracks.set(csvTrack.filepath, found);
          matched++;
        } else {
          console.log(`  ⚠️  Missing: ${csvTrack.artist} - ${csvTrack.title}`);
          missing++;
        }
      }

      console.log(`  ${playlist.name}: ${matched} matched, ${missing} missing`);
    }

    console.log(`\n✅ Total unique tracks: ${allPlaylistTracks.size}`);
    console.log(`✅ Matched in library: ${matchedTracks.size}\n`);

    if (matchedTracks.size === 0) {
      console.log('❌ No tracks matched. Cannot create Engine DJ export.');
      process.exit(1);
    }

    // Create output directory
    await fs.mkdir(outputPath, { recursive: true });

    // Export all matched tracks to Engine DJ
    console.log('🚀 Creating Engine DJ database...\n');
    const tracksToExport = Array.from(matchedTracks.values());

    const exporter = new EngineDJExporter();
    const result = await exporter.export(tracksToExport, {
      outputPath,
      copyFiles: false, // Don't copy files, use original paths
      createPerformanceData: false,
      playlistName: 'Bathrobe_Master' // We'll add individual playlists next
    });

    if (!result.success) {
      console.log(`❌ Export failed: ${result.error}`);
      process.exit(1);
    }

    console.log(`✅ Exported ${result.tracksExported} tracks`);
    console.log(`📂 Database: ${result.databasePath}\n`);

    // Now add individual playlists to the database
    console.log('📋 Creating playlists...\n');

    const Database = (await import('better-sqlite3')).default;
    const db = new Database(result.databasePath);

    // Get database UUID
    const dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get() as { uuid: string };
    const dbUuid = dbInfo.uuid;

    // Get track ID mapping (filepath -> database ID)
    const trackIdMap = new Map<string, number>();
    const dbTracks = db.prepare('SELECT id, path FROM Track').all() as { id: number; path: string }[];
    dbTracks.forEach(t => trackIdMap.set(t.path, t.id));

    // Create each playlist
    for (const playlist of playlists) {
      const playlistInsert = db.prepare(`
        INSERT INTO Playlist (title, parentListId, isPersisted, nextListId, lastEditTime, isExplicitlyExported)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const playlistInfo = playlistInsert.run(
        playlist.name,
        0, // parentListId (0 = root)
        1, // isPersisted
        0, // nextListId
        new Date().toISOString(),
        1  // isExplicitlyExported
      );

      const playlistId = playlistInfo.lastInsertRowid as number;

      // Add tracks to playlist
      const trackInsert = db.prepare(`
        INSERT INTO PlaylistTrackList (playlistId, trackId, trackIdInOriginDatabase, databaseUuid, trackNumber)
        VALUES (?, ?, ?, ?, ?)
      `);

      let trackNumber = 0;
      for (const csvTrack of playlist.tracks) {
        const libraryTrack = matchedTracks.get(csvTrack.filepath);
        if (libraryTrack) {
          const dbTrackId = trackIdMap.get(libraryTrack.path);
          if (dbTrackId) {
            trackInsert.run(playlistId, dbTrackId, libraryTrack.id, dbUuid, trackNumber);
            trackNumber++;
          }
        }
      }

      console.log(`  ✅ ${playlist.name}: ${trackNumber} tracks`);
    }

    db.close();

    console.log(`\n✅ Export complete!\n`);
    console.log(`📂 Location: ${outputPath}/Engine Library/\n`);
    console.log('💡 Next steps:');
    console.log('   1. Copy "Engine Library" folder to your USB drive');
    console.log('   2. Insert USB into Engine DJ hardware');
    console.log('   3. Your playlists should appear in the playlist browser\n');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importPlaylists();
