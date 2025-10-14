#!/usr/bin/env node
/**
 * Fix track paths to use relative format instead of absolute
 * Handles UNIQUE constraint by reusing existing tracks when possible
 */

import Database from 'better-sqlite3';

async function main() {
  const dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';

  console.log('🔧 Fix Track Paths to Relative Format\n');
  console.log(`📂 Database: ${dbPath}\n`);

  try {
    // BACKUP FIRST!
    const backupPath = dbPath + '.backup-paths-' + Date.now();
    const fs = require('fs');
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup created: ${backupPath}\n`);

    const db = new Database(dbPath);

    // Get our new tracks (5129-5146)
    const ourTracks = db.prepare(`
      SELECT id, path, filename FROM Track
      WHERE id >= 5129 AND id <= 5146
      ORDER BY id
    `).all() as { id: number; path: string; filename: string }[];

    console.log(`📀 Found ${ourTracks.length} tracks to process\n`);

    db.prepare('BEGIN').run();

    let reused = 0;
    let updated = 0;

    for (const track of ourTracks) {
      // Convert absolute path to relative
      // /Users/wagner/Music/DJ/Bathrobe_PoolParty/file.flac -> ../DJ/Bathrobe_PoolParty/file.flac
      const relativePath = track.path.replace('/Users/wagner/Music/', '../');

      console.log(`\nProcessing track ${track.id}:`);
      console.log(`  Current: ${track.path}`);
      console.log(`  Relative: ${relativePath}`);

      // Check if a track with this relative path already exists
      const existing = db.prepare('SELECT id FROM Track WHERE path = ?')
        .get(relativePath) as { id: number } | undefined;

      if (existing && existing.id !== track.id) {
        console.log(`  ✓ Found existing track with relative path: ${existing.id}`);

        // Update all PlaylistEntity records that reference our track to use the existing one
        const result = db.prepare(`
          UPDATE PlaylistEntity
          SET trackId = ?
          WHERE trackId = ?
        `).run(existing.id, track.id);

        console.log(`  → Updated ${result.changes} PlaylistEntity records`);

        // Delete our duplicate track
        db.prepare('DELETE FROM Track WHERE id = ?').run(track.id);
        console.log(`  → Deleted duplicate track ${track.id}`);

        reused++;
      } else {
        // No existing track with this path - just update the path
        db.prepare('UPDATE Track SET path = ? WHERE id = ?')
          .run(relativePath, track.id);
        console.log(`  ✓ Updated path to relative format`);
        updated++;
      }
    }

    db.prepare('COMMIT').run();
    console.log('\n💾 Transaction committed');

    db.close();

    console.log(`\n✅ Path fix complete!\n`);
    console.log('📊 Summary:');
    console.log(`  Tracks reused (existing): ${reused}`);
    console.log(`  Tracks updated (paths): ${updated}`);
    console.log(`  Backup saved: ${backupPath}\n`);
    console.log('💡 Check Engine DJ to see if playlists now display tracks!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
