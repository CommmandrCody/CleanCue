#!/usr/bin/env node
"use strict";
/**
 * Test script for Engine DJ export
 * Tests the export functionality with a small dataset
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const engine_dj_exporter_js_1 = require("./src/exporters/engine-dj-exporter.js");
const simple_store_js_1 = require("./src/simple-store.js");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
async function testExport() {
    console.log('🧪 Testing Engine DJ Export\n');
    try {
        // Create test output directory
        const testOutputPath = '/tmp/cleancue-test-export';
        await fs_1.promises.mkdir(testOutputPath, { recursive: true });
        console.log(`✅ Created test output directory: ${testOutputPath}\n`);
        // Initialize store
        const store = new simple_store_js_1.SimpleStore();
        await store.load();
        // Get all tracks from library
        const allTracks = await store.getTracks();
        console.log(`📚 Found ${allTracks.length} tracks in library\n`);
        if (allTracks.length === 0) {
            console.log('❌ No tracks in library. Please scan some music first.');
            process.exit(1);
        }
        // Take first 5 tracks for testing
        const testTracks = allTracks.slice(0, Math.min(5, allTracks.length));
        console.log(`🎵 Testing with ${testTracks.length} tracks:\n`);
        testTracks.forEach((track, idx) => {
            console.log(`  ${idx + 1}. ${track.artist || 'Unknown'} - ${track.title || 'Unknown'}`);
            console.log(`     BPM: ${track.bpm || 'N/A'}, Key: ${track.key || 'N/A'}`);
            console.log(`     Path: ${track.path}`);
            console.log('');
        });
        // Test export WITHOUT copying files (faster test)
        console.log('🚀 Starting export (link mode - no file copy)...\n');
        const exporter = new engine_dj_exporter_js_1.EngineDJExporter();
        const result = await exporter.export(testTracks, {
            outputPath: testOutputPath,
            copyFiles: false, // Don't copy files, just create database
            createPerformanceData: false,
            playlistName: 'CleanCue Test Export'
        });
        console.log('\n📊 Export Results:\n');
        console.log(`  Success: ${result.success ? '✅' : '❌'}`);
        console.log(`  Tracks Exported: ${result.tracksExported}`);
        console.log(`  Files Copied: ${result.filescopied}`);
        console.log(`  Database Path: ${result.databasePath}`);
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
        // Verify database was created
        if (result.success) {
            console.log('\n🔍 Verifying database...\n');
            const dbPath = path_1.default.join(testOutputPath, 'Engine Library', 'm.db');
            try {
                await fs_1.promises.access(dbPath);
                const stats = await fs_1.promises.stat(dbPath);
                console.log(`  ✅ Database exists: ${dbPath}`);
                console.log(`  📦 Database size: ${(stats.size / 1024).toFixed(2)} KB`);
                // Try to inspect the database
                const Database = (await import('better-sqlite3')).default;
                const db = new Database(dbPath, { readonly: true });
                const trackCount = db.prepare('SELECT COUNT(*) as count FROM Track').get();
                const metadataCount = db.prepare('SELECT COUNT(*) as count FROM MetaData').get();
                const playlistCount = db.prepare('SELECT COUNT(*) as count FROM Playlist').get();
                console.log(`\n  📊 Database Contents:`);
                console.log(`     Tracks: ${trackCount.count}`);
                console.log(`     Metadata Entries: ${metadataCount.count}`);
                console.log(`     Playlists: ${playlistCount.count}`);
                // Sample a track
                const sampleTrack = db.prepare('SELECT * FROM Track LIMIT 1').get();
                if (sampleTrack) {
                    console.log(`\n  🎵 Sample Track:`);
                    console.log(`     ID: ${sampleTrack.id}`);
                    console.log(`     Path: ${sampleTrack.path}`);
                    console.log(`     Filename: ${sampleTrack.filename}`);
                    console.log(`     BPM: ${sampleTrack.bpmAnalyzed}`);
                    console.log(`     Length: ${(sampleTrack.length / 1000).toFixed(1)}s`);
                }
                db.close();
            }
            catch (err) {
                console.log(`  ❌ Database verification failed: ${err}`);
            }
        }
        console.log(`\n✅ Test complete! Output directory: ${testOutputPath}\n`);
        console.log('💡 To test on Engine DJ:');
        console.log(`   1. Copy the "Engine Library" folder to a USB drive`);
        console.log(`   2. Insert USB into Engine DJ hardware/software`);
        console.log(`   3. Check if tracks appear in the library\n`);
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
testExport();
