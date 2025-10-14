#!/usr/bin/env node
/**
 * Fix missing tracks in playlists by searching the entire database
 */

import Database from 'better-sqlite3';

interface MissingTrack {
  artist: string;
  title: string;
  playlistId: number;
  playlistName: string;
}

async function main() {
  const dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';

  console.log('🔧 Fix Missing Tracks\n');

  const db = new Database(dbPath);

  // Get database UUID
  const dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get() as { uuid: string };
  const dbUuid = dbInfo.uuid;

  // Define missing tracks and their playlists
  const missing: MissingTrack[] = [
    // DeepSelects (ID 125) - all 5 tracks missing
    { artist: 'Sonny Fodera', title: 'Into You', playlistId: 125, playlistName: 'DeepSelects' },
    { artist: 'Dom Dolla', title: 'You', playlistId: 125, playlistName: 'DeepSelects' },
    { artist: 'Hot Since 82', title: 'Buggin', playlistId: 125, playlistName: 'DeepSelects' },
    { artist: 'Tube & Berger', title: 'Set Free', playlistId: 125, playlistName: 'DeepSelects' },
    { artist: 'Elderbrook', title: 'Capricorn', playlistId: 125, playlistName: 'DeepSelects' },

    // Master (ID 127) - same 5 tracks
    { artist: 'Sonny Fodera', title: 'Into You', playlistId: 127, playlistName: 'Master' },
    { artist: 'Dom Dolla', title: 'You', playlistId: 127, playlistName: 'Master' },
    { artist: 'Hot Since 82', title: 'Buggin', playlistId: 127, playlistName: 'Master' },
    { artist: 'Tube & Berger', title: 'Set Free', playlistId: 127, playlistName: 'Master' },
    { artist: 'Elderbrook', title: 'Capricorn', playlistId: 127, playlistName: 'Master' },

    // WarmUp (ID 129) - 1 track
    { artist: 'Satin Jackets', title: 'Coffee', playlistId: 129, playlistName: 'WarmUp' },
  ];

  console.log(`🔍 Searching for ${missing.length} missing tracks...\n`);

  const normalize = (s: string) => s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  db.prepare('BEGIN').run();

  const playlistEntityInsert = db.prepare(`
    INSERT INTO PlaylistEntity (listId, trackId, databaseUuid, nextEntityId, membershipReference)
    VALUES (?, ?, ?, ?, ?)
  `);

  let added = 0;

  for (const m of missing) {
    const normalizedArtist = normalize(m.artist);
    const normalizedTitle = normalize(m.title);

    // Search for track in database
    const tracks = db.prepare(`
      SELECT id, artist, title, filename
      FROM Track
      WHERE 1=1
    `).all() as { id: number; artist: string; title: string; filename: string }[];

    const track = tracks.find(t => {
      const fileNorm = normalize(t.filename);
      const artistNorm = normalize(t.artist || '');
      const titleNorm = normalize(t.title || '');

      return (fileNorm.includes(normalizedArtist) || artistNorm.includes(normalizedArtist)) &&
             (fileNorm.includes(normalizedTitle) || titleNorm.includes(normalizedTitle));
    });

    if (track) {
      console.log(`✓ Found: ${m.artist} - ${m.title}`);
      console.log(`  Track ID: ${track.id}, File: ${track.filename}`);
      console.log(`  Adding to ${m.playlistName}...`);

      // Get last entity in this playlist to append after it
      const lastEntity = db.prepare(`
        SELECT id FROM PlaylistEntity
        WHERE listId = ?
        AND id NOT IN (
          SELECT nextEntityId FROM PlaylistEntity
          WHERE listId = ? AND nextEntityId > 0
        )
        LIMIT 1
      `).get(m.playlistId, m.playlistId) as { id: number } | undefined;

      const entityResult = playlistEntityInsert.run(
        m.playlistId,
        track.id,
        dbUuid,
        0,
        0
      );

      const newEntityId = entityResult.lastInsertRowid as number;

      // Update previous last entity to point to this one
      if (lastEntity) {
        db.prepare('UPDATE PlaylistEntity SET nextEntityId = ? WHERE id = ?')
          .run(newEntityId, lastEntity.id);
      }

      console.log(`  ✅ Added\n`);
      added++;
    } else {
      console.log(`⚠️  Not found: ${m.artist} - ${m.title}\n`);
    }
  }

  db.prepare('COMMIT').run();
  console.log('💾 Transaction committed');

  // Show final counts
  console.log('\n📊 Final playlist counts:');
  const playlists = db.prepare(`
    SELECT p.id, p.title, COUNT(pe.id) as tracks
    FROM Playlist p
    LEFT JOIN PlaylistEntity pe ON p.id = pe.listId
    WHERE p.id >= 123
    GROUP BY p.id
    ORDER BY p.id
  `).all() as { id: number; title: string; tracks: number }[];

  for (const p of playlists) {
    console.log(`  ${p.title}: ${p.tracks} tracks`);
  }

  db.close();

  console.log(`\n✅ Fixed ${added} missing tracks\n`);
}

main();
