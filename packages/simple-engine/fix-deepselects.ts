#!/usr/bin/env node
/**
 * Fix DeepSelects playlist by finding matching tracks
 */

import Database from 'better-sqlite3';

async function main() {
  const dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';

  console.log('🔧 Fix DeepSelects Playlist\n');

  try {
    const db = new Database(dbPath);

    // Get database UUID
    const dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get() as { uuid: string };
    const dbUuid = dbInfo.uuid;

    // DeepSelects playlist ID
    const playlistId = 125;

    // Delete existing (empty) entities
    db.prepare('DELETE FROM PlaylistEntity WHERE listId = ?').run(playlistId);

    // Define the tracks we want (artist - title)
    const targetTracks = [
      { artist: 'Sonny Fodera', title: 'Into You' },
      { artist: 'Dom Dolla', title: 'You' },
      { artist: 'Hot Since 82', title: 'Buggin' },
      { artist: 'Tube & Berger', title: 'Set Free' },
      { artist: 'Elderbrook', title: 'Capricorn' }
    ];

    console.log(`🔍 Finding ${targetTracks.length} tracks...\n`);

    const foundTracks: number[] = [];

    for (const target of targetTracks) {
      // Search for track by artist and title (fuzzy match)
      const track = db.prepare(`
        SELECT id, artist, title, filename
        FROM Track
        WHERE (artist LIKE ? OR filename LIKE ?)
        AND (title LIKE ? OR filename LIKE ?)
        LIMIT 1
      `).get(
        `%${target.artist}%`,
        `%${target.artist}%`,
        `%${target.title}%`,
        `%${target.title}%`
      ) as { id: number; artist: string; title: string; filename: string } | undefined;

      if (track) {
        console.log(`✓ Found: ${track.artist} - ${track.title}`);
        console.log(`  File: ${track.filename}`);
        console.log(`  ID: ${track.id}\n`);
        foundTracks.push(track.id);
      } else {
        console.log(`⚠️  Not found: ${target.artist} - ${target.title}\n`);
      }
    }

    if (foundTracks.length === 0) {
      console.log('❌ No tracks found');
      db.close();
      return;
    }

    console.log(`\n📋 Adding ${foundTracks.length} tracks to DeepSelects...\n`);

    db.prepare('BEGIN').run();

    const playlistEntityInsert = db.prepare(`
      INSERT INTO PlaylistEntity (listId, trackId, databaseUuid, nextEntityId, membershipReference)
      VALUES (?, ?, ?, ?, ?)
    `);

    let prevEntityId: number | null = null;

    for (const trackId of foundTracks) {
      const entityResult = playlistEntityInsert.run(
        playlistId,
        trackId,
        dbUuid,
        0, // nextEntityId (will be updated for previous entity)
        0  // membershipReference
      );

      const currentEntityId = entityResult.lastInsertRowid as number;

      // Update previous entity to point to this one
      if (prevEntityId) {
        db.prepare('UPDATE PlaylistEntity SET nextEntityId = ? WHERE id = ?')
          .run(currentEntityId, prevEntityId);
      }

      prevEntityId = currentEntityId;
    }

    db.prepare('COMMIT').run();
    console.log('💾 Transaction committed');

    db.close();

    console.log(`\n✅ DeepSelects playlist fixed: ${foundTracks.length} tracks added\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
