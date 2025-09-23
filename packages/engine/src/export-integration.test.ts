import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { DJSoftwareExporter } from './exporters';
import type { Track, Playlist, PlaylistTrack, CuePoint, ExportOptions } from '@cleancue/shared';

describe('Export Integration Tests', () => {
  let tempDir: string;
  let exporter: DJSoftwareExporter;
  let mockTracks: Track[];
  let mockPlaylists: Playlist[];
  let mockPlaylistTracks: PlaylistTrack[];
  let mockCues: CuePoint[];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cleancue-export-test-'));
    exporter = new DJSoftwareExporter();

    // Create mock data representing typical DJ tracks
    mockTracks = [
      {
        id: 'track-1',
        path: '/test/music/artist1 - track1.mp3',
        filename: 'artist1 - track1.mp3',
        title: 'Test Track 1',
        artist: 'Artist One',
        album: 'Test Album',
        genre: 'House',
        year: 2023,
        bpm: 128,
        key: '8A',
        energy: 75,
        duration_ms: 300000,
        bitrate: 320,
        sample_rate: 44100,
        channels: 2,
        hash: 'hash1',
        extension: 'mp3',
        size_bytes: 12000000,
        file_modified_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'track-2',
        path: '/test/music/artist2 - track2.wav',
        filename: 'artist2 - track2.wav',
        title: 'Test Track 2',
        artist: 'Artist Two',
        album: 'Another Album',
        genre: 'Techno',
        year: 2024,
        bpm: 132,
        key: '1B',
        energy: 85,
        duration_ms: 420000,
        bitrate: 1411,
        sample_rate: 44100,
        channels: 2,
        hash: 'hash2',
        extension: 'wav',
        size_bytes: 45000000,
        file_modified_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    mockPlaylists = [
      {
        id: 'playlist-1',
        name: 'Peak Time Mix',
        description: 'High energy tracks for peak time',
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    mockPlaylistTracks = [
      {
        id: 'pt-1',
        playlist_id: 'playlist-1',
        track_id: 'track-1',
        position: 0,
        created_at: Date.now()
      },
      {
        id: 'pt-2',
        playlist_id: 'playlist-1',
        track_id: 'track-2',
        position: 1,
        created_at: Date.now()
      }
    ];

    mockCues = [
      {
        id: 'cue-1',
        track_id: 'track-1',
        type: 'cue',
        position_ms: 32000,
        label: 'Intro',
        confidence: 0.9,
        created_at: Date.now()
      },
      {
        id: 'cue-2',
        track_id: 'track-1',
        type: 'loop',
        position_ms: 180000,
        label: 'Drop Loop',
        confidence: 0.85,
        created_at: Date.now()
      }
    ];
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Failed to clean up temp directory:', err);
    }
  });

  describe('Serato Export', () => {
    it('should create Serato .crate file with correct structure', async () => {
      const outputPath = path.join(tempDir, 'test_export.crate');
      const options: ExportOptions = {
        format: 'serato',
        outputPath,
        playlistName: 'Peak Time Mix'
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Remember to rescan your Serato library after adding these files');

      // Check that Serato directory structure was created
      const seratoDir = path.join(tempDir, '_Serato_', 'Crates');
      const cratePath = path.join(seratoDir, 'Peak Time Mix.crate');

      expect(await fs.access(cratePath).then(() => true).catch(() => false)).toBe(true);

      // Verify crate file has Serato header
      const crateContent = await fs.readFile(cratePath, 'utf8');
      expect(crateContent).toContain('vrsn');
      expect(crateContent).toContain('Serato ScratchLive Crate');
      expect(crateContent).toContain('otrk'); // Track count header
    });

    it('should create Serato metadata file with track information', async () => {
      const outputPath = path.join(tempDir, 'test_export.crate');
      const options: ExportOptions = {
        format: 'serato',
        outputPath,
        playlistName: 'Peak Time Mix'
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(true);

      // Check metadata file was created
      const metadataPath = path.join(tempDir, 'test_export_serato_metadata.txt');
      expect(await fs.access(metadataPath).then(() => true).catch(() => false)).toBe(true);

      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      expect(metadataContent).toContain('# CleanCue Export for Serato');
      expect(metadataContent).toContain('Artist: Artist One');
      expect(metadataContent).toContain('Title: Test Track 1');
      expect(metadataContent).toContain('BPM: 128');
      expect(metadataContent).toContain('Key: 8A');
      expect(metadataContent).toContain('Genre: House');
    });

    it('should handle relative paths when useRelativePaths is enabled', async () => {
      const outputPath = path.join(tempDir, 'subfolder', 'test_export.crate');
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const options: ExportOptions = {
        format: 'serato',
        outputPath,
        playlistName: 'Relative Test',
        useRelativePaths: true
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(true);

      const cratePath = path.join(tempDir, 'subfolder', '_Serato_', 'Crates', 'Relative Test.crate');
      const crateContent = await fs.readFile(cratePath, 'utf8');

      // Should contain relative paths, not absolute
      expect(crateContent).not.toContain('/test/music/');
    });
  });

  describe('Engine DJ Export', () => {
    it('should create Engine DJ XML file with proper structure', async () => {
      const outputPath = path.join(tempDir, 'engine_export.xml');
      const options: ExportOptions = {
        format: 'engine',
        outputPath,
        playlistName: 'Peak Time Mix'
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Import the XML file into Engine DJ using the "Import Collection" feature');

      // Verify XML file was created
      expect(await fs.access(outputPath).then(() => true).catch(() => false)).toBe(true);

      const xmlContent = await fs.readFile(outputPath, 'utf8');
      expect(xmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlContent).toContain('<ENGINE VERSION="2.0">');
      expect(xmlContent).toContain('<COLLECTION>');
      expect(xmlContent).toContain('<TRACK>');
      expect(xmlContent).toContain('<PLAYLISTS>');

      // Check track metadata is present
      expect(xmlContent).toContain('TITLE="Test Track 1"');
      expect(xmlContent).toContain('ARTIST="Artist One"');
      expect(xmlContent).toContain('BPM="128"');
      expect(xmlContent).toContain('TONALITY="8A"');
    });

    it('should include cue points in Engine DJ export', async () => {
      const outputPath = path.join(tempDir, 'engine_cues.xml');
      const options: ExportOptions = {
        format: 'engine',
        outputPath,
        playlistName: 'Cue Test'
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(true);

      const xmlContent = await fs.readFile(outputPath, 'utf8');
      expect(xmlContent).toContain('<CUE_V2>');
      expect(xmlContent).toContain('START="32000"'); // Cue at 32 seconds
      expect(xmlContent).toContain('NAME="Intro"');
      expect(xmlContent).toContain('TYPE="0"'); // Standard cue point
    });

    it('should handle playlists correctly in Engine DJ format', async () => {
      const outputPath = path.join(tempDir, 'engine_playlist.xml');
      const options: ExportOptions = {
        format: 'engine',
        outputPath,
        playlistName: 'Peak Time Mix'
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(true);

      const xmlContent = await fs.readFile(outputPath, 'utf8');
      expect(xmlContent).toContain('<NODE TYPE="1" NAME="Peak Time Mix">');
      expect(xmlContent).toContain('<TRACK TITLE="Test Track 1"');
      expect(xmlContent).toContain('<TRACK TITLE="Test Track 2"');
    });
  });

  describe('Export Error Handling', () => {
    it('should handle invalid output directory gracefully', async () => {
      const invalidPath = '/invalid/nonexistent/path/export.xml';
      const options: ExportOptions = {
        format: 'engine',
        outputPath: invalidPath
      };

      const result = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        options
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty track list', async () => {
      const outputPath = path.join(tempDir, 'empty_export.xml');
      const options: ExportOptions = {
        format: 'engine',
        outputPath
      };

      const result = await exporter.exportLibrary(
        [],
        [],
        [],
        [],
        options
      );

      expect(result.success).toBe(true);

      const xmlContent = await fs.readFile(outputPath, 'utf8');
      expect(xmlContent).toContain('<COLLECTION>');
      expect(xmlContent).toContain('</COLLECTION>');
    });
  });

  describe('Cross-Format Compatibility', () => {
    it('should preserve DJ metadata across both formats', async () => {
      // Test that key metadata elements are preserved in both formats
      const seratoPath = path.join(tempDir, 'serato_test.crate');
      const enginePath = path.join(tempDir, 'engine_test.xml');

      const seratoOptions: ExportOptions = {
        format: 'serato',
        outputPath: seratoPath,
        playlistName: 'DJ Test'
      };

      const engineOptions: ExportOptions = {
        format: 'engine',
        outputPath: enginePath,
        playlistName: 'DJ Test'
      };

      // Export to both formats
      const seratoResult = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        seratoOptions
      );

      const engineResult = await exporter.exportLibrary(
        mockTracks,
        mockPlaylists,
        mockPlaylistTracks,
        mockCues,
        engineOptions
      );

      expect(seratoResult.success).toBe(true);
      expect(engineResult.success).toBe(true);

      // Verify both contain essential DJ metadata
      const seratoMetadata = await fs.readFile(
        path.join(tempDir, 'serato_test_serato_metadata.txt'),
        'utf8'
      );
      const engineXml = await fs.readFile(enginePath, 'utf8');

      // Both should contain BPM and key information
      expect(seratoMetadata).toContain('BPM: 128');
      expect(seratoMetadata).toContain('Key: 8A');
      expect(engineXml).toContain('BPM="128"');
      expect(engineXml).toContain('TONALITY="8A"');
    });
  });
});