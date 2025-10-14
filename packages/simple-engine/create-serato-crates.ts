#!/usr/bin/env node
/**
 * Create Serato .crate files from CSV playlists
 */

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

function writeBigEndianUint32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value, 0);
  return buf;
}

function toUTF16BE(str: string): Buffer {
  const buf = Buffer.alloc(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    buf.writeUInt16BE(str.charCodeAt(i), i * 2);
  }
  return buf;
}

function createCrateFile(tracks: PlaylistTrack[]): Buffer {
  const chunks: Buffer[] = [];

  // Version header (UTF-16BE encoded)
  const versionString = '1.0/Serato ScratchLive Crate';
  const versionBuf = toUTF16BE(versionString);
  chunks.push(Buffer.from('vrsn'));
  chunks.push(writeBigEndianUint32(versionBuf.length));
  chunks.push(versionBuf);

  // Add each track
  for (const track of tracks) {
    // otrk = outer track container
    const ptrk = Buffer.from('ptrk');
    const pathBuf = toUTF16BE(track.filepath);
    const ptrkData = Buffer.concat([
      ptrk,
      writeBigEndianUint32(pathBuf.length),
      pathBuf
    ]);

    chunks.push(Buffer.from('otrk'));
    chunks.push(writeBigEndianUint32(ptrkData.length));
    chunks.push(ptrkData);
  }

  return Buffer.concat(chunks);
}

async function main() {
  const playlistDir = '/Users/wagner/Downloads/Bathrobe_PoolParty_EngineDJ_Package';
  const outputDir = '/Users/wagner/Music/_Serato_/Subcrates';

  console.log('🎵 Create Serato Crates from CSV\n');
  console.log(`📂 Playlists: ${playlistDir}`);
  console.log(`📂 Output: ${outputDir}\n`);

  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Find all CSV files
    const files = await fs.readdir(playlistDir);
    const csvFiles = files.filter(f =>
      f.endsWith('.csv') &&
      !f.includes('Timed') &&
      !f.includes('Spine')
    );

    console.log(`📋 Found ${csvFiles.length} playlists to convert:\n`);

    for (const csvFile of csvFiles) {
      const crateName = csvFile.replace('.csv', '').replace('Bathrobe_', '');
      const tracks = await parseCSV(path.join(playlistDir, csvFile));

      console.log(`  📝 ${crateName}: ${tracks.length} tracks`);

      // Create .crate file
      const crateData = createCrateFile(tracks);
      const cratePath = path.join(outputDir, `${crateName}.crate`);

      await fs.writeFile(cratePath, crateData);
      console.log(`     ✅ ${cratePath}`);
    }

    console.log(`\n✅ Created ${csvFiles.length} Serato crates!\n`);
    console.log('💡 Next steps:');
    console.log('   1. Open Serato DJ Pro');
    console.log('   2. Refresh your library to see the new crates');
    console.log('   3. Use Engine DJ Desktop to import from Serato\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
