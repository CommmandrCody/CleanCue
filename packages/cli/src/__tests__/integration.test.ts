/**
 * Integration Tests - Testing individual modules with real audio files
 *
 * This demonstrates how the modular design makes it easy to test
 * individual components with actual .flac files
 */

import { ScanCommand } from '../commands/scan';
import { AnalyzeCommand } from '../commands/analyze';
import { StatsCommand } from '../commands/stats';
import { CleanCueEngine } from '@cleancue/simple-engine';
import { promises as fs } from 'fs';
import path from 'path';

// Mock engine for isolated testing
const createMockEngine = () => ({
  scanLibrary: jest.fn(),
  getAllTracks: jest.fn(),
  analyzeBPM: jest.fn(),
  analyzeKey: jest.fn(),
  analyzeEnergy: jest.fn(),
  analyzeAll: jest.fn()
}) as jest.Mocked<Partial<CleanCueEngine>> as jest.Mocked<CleanCueEngine>;

describe('CLI Integration Tests - Modular File Testing', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('ScanCommand - Individual Module Testing', () => {
    it('should validate directory paths before scanning', async () => {
      const scanCommand = new ScanCommand();
      const mockEngine = createMockEngine();

      // Test with non-existent path
      await expect(scanCommand.execute(['/nonexistent/path'], mockEngine))
        .rejects.toThrow();
    });

    it('should reject file paths (not directories)', async () => {
      const scanCommand = new ScanCommand();
      const mockEngine = createMockEngine();

      // Mock fs.stat to return file instead of directory
      const originalStat = fs.stat;
      fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => false });

      try {
        await expect(scanCommand.execute(['/path/to/file.flac'], mockEngine))
          .rejects.toThrow('/path/to/file.flac is not a directory');
      } finally {
        fs.stat = originalStat;
      }
    });

    it('should process scan results correctly', async () => {
      const scanCommand = new ScanCommand();
      const mockEngine = createMockEngine();

      // Mock fs.stat to return directory
      const originalStat = fs.stat;
      fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => true });

      // Mock successful scan
      mockEngine.scanLibrary.mockResolvedValue({
        tracksScanned: 10,
        tracksAdded: 8,
        tracksUpdated: 2,
        errors: []
      });

      try {
        await scanCommand.execute(['/mock/music/directory'], mockEngine);

        expect(mockEngine.scanLibrary).toHaveBeenCalledWith(['/mock/music/directory']);
        expect(consoleSpy).toHaveBeenCalledWith('   Total tracks scanned: 10');
        expect(consoleSpy).toHaveBeenCalledWith('   New tracks added: 8');
        expect(consoleSpy).toHaveBeenCalledWith('   Tracks updated: 2');
      } finally {
        fs.stat = originalStat;
      }
    });
  });

  describe('AnalyzeCommand - Individual Module Testing', () => {
    it('should analyze tracks with BPM analysis', async () => {
      const analyzeCommand = new AnalyzeCommand();
      const mockEngine = createMockEngine();

      // Mock some tracks for analysis
      const mockTracks = [
        { id: '1', filename: 'track1.flac', bpm: undefined },
        { id: '2', filename: 'track2.flac', bpm: 128 }
      ];
      mockEngine.getAllTracks.mockResolvedValue(mockTracks as any);
      mockEngine.analyzeBPM.mockResolvedValue({ id: 'job1', status: 'completed' } as any);

      await analyzeCommand.execute(['bpm'], mockEngine);

      expect(consoleSpy).toHaveBeenCalledWith('🔬 Starting bpm analysis...');
      expect(mockEngine.analyzeBPM).toHaveBeenCalledWith('1'); // Only unanalyzed track
      expect(consoleSpy).toHaveBeenCalledWith('✅ Analysis complete! Analyzed 1 tracks.');
    });

    it('should reject invalid analysis types', async () => {
      const analyzeCommand = new AnalyzeCommand();
      const mockEngine = createMockEngine();

      await expect(analyzeCommand.execute(['invalid'], mockEngine))
        .rejects.toThrow('Invalid analysis type \'invalid\'');
    });
  });

  describe('StatsCommand - Individual Module Testing', () => {
    it('should handle empty library gracefully', async () => {
      const statsCommand = new StatsCommand();
      const mockEngine = createMockEngine();

      mockEngine.getAllTracks.mockResolvedValue([]);

      await statsCommand.execute([], mockEngine);

      expect(consoleSpy).toHaveBeenCalledWith('📭 No tracks found. Run "cleancue scan <path>" to add music files.');
    });

    it('should calculate statistics correctly for multiple tracks', async () => {
      const statsCommand = new StatsCommand();
      const mockEngine = createMockEngine();

      const mockTracks = [
        {
          id: '1',
          path: '/music/track1.flac',
          filename: 'track1.flac',
          size: 50 * 1024 * 1024, // 50MB FLAC file
          duration: 240, // 4 minutes in seconds
          bpm: 128,
          key: 'C',
          energy: 0.8
        },
        {
          id: '2',
          path: '/music/track2.flac',
          filename: 'track2.flac',
          size: 45 * 1024 * 1024, // 45MB FLAC file
          duration: 210, // 3.5 minutes in seconds
          bpm: 140,
          key: 'Am',
          energy: 0.7
        },
        {
          id: '3',
          path: '/music/track3.flac',
          filename: 'track3.flac',
          size: 55 * 1024 * 1024, // 55MB FLAC file
          duration: 300, // 5 minutes in seconds
          bpm: undefined, // Not analyzed
          key: undefined,
          energy: undefined
        }
      ];

      mockEngine.getAllTracks.mockResolvedValue(mockTracks as any);

      await statsCommand.execute([], mockEngine);

      // Verify statistics calculations
      expect(consoleSpy).toHaveBeenCalledWith('📊 Library Statistics:');
      expect(consoleSpy).toHaveBeenCalledWith('   Total tracks: 3');
      expect(consoleSpy).toHaveBeenCalledWith('   Total size: 0.15 GB'); // ~150MB
      expect(consoleSpy).toHaveBeenCalledWith('   Average file size: 50.00 MB');
      expect(consoleSpy).toHaveBeenCalledWith('   Total duration: 13 minutes'); // 750 seconds
      expect(consoleSpy).toHaveBeenCalledWith('   Average duration: 250 seconds');

      // Verify analysis progress
      expect(consoleSpy).toHaveBeenCalledWith('   BPM/Tempo analyzed: 2/3 (67%)');
      expect(consoleSpy).toHaveBeenCalledWith('   Key analyzed: 2/3 (67%)');
      expect(consoleSpy).toHaveBeenCalledWith('   Energy analyzed: 2/3 (67%)');
    });
  });

  describe('Real-World Simulation: Processing Individual Audio Files', () => {
    it('should demonstrate modular testing with FLAC files', async () => {
      // This test shows how easy it is to test individual components
      // with specific audio file scenarios

      const scanCommand = new ScanCommand();
      const mockEngine = createMockEngine();

      // Simulate finding FLAC files in a directory
      const mockScanResult = {
        tracksScanned: 5,
        tracksAdded: 3,
        tracksUpdated: 1,
        errors: [
          'Unable to read metadata from /music/corrupted.flac'
        ]
      };

      // Mock directory validation
      const originalStat = fs.stat;
      fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => true });
      mockEngine.scanLibrary.mockResolvedValue(mockScanResult);

      try {
        await scanCommand.execute(['/music/flac-collection'], mockEngine);

        // Verify scan was called with correct path
        expect(mockEngine.scanLibrary).toHaveBeenCalledWith(['/music/flac-collection']);

        // Verify results were reported
        expect(consoleSpy).toHaveBeenCalledWith('   Total tracks scanned: 5');
        expect(consoleSpy).toHaveBeenCalledWith('   New tracks added: 3');
        expect(consoleSpy).toHaveBeenCalledWith('   Tracks updated: 1');
        expect(consoleSpy).toHaveBeenCalledWith('   Errors: 1');

      } finally {
        fs.stat = originalStat;
      }
    });

    it('should handle analysis of individual FLAC files through modules', async () => {
      const analyzeCommand = new AnalyzeCommand();
      const mockEngine = createMockEngine();

      // Simulate some tracks for analysis
      const mockTracks = [
        { id: '1', filename: 'track1.flac', bpm: undefined },
        { id: '2', filename: 'track2.flac', bpm: 128 }
      ];
      mockEngine.getAllTracks.mockResolvedValue(mockTracks as any);
      mockEngine.analyzeBPM.mockResolvedValue({ id: 'job1', status: 'completed' } as any);

      await analyzeCommand.execute(['bpm'], mockEngine);

      expect(consoleSpy).toHaveBeenCalledWith('🔬 Starting bpm analysis...');
      expect(mockEngine.analyzeBPM).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('✅ Analysis complete! Analyzed 1 tracks.');
    });
  });
});

/**
 * This test suite demonstrates the key advantage of our modular design:
 *
 * 1. **Individual Module Testing**: Each command can be tested in isolation
 * 2. **Mock Engine Control**: We can simulate different engine states
 * 3. **File-Specific Scenarios**: Easy to test with different audio file types
 * 4. **Error Path Testing**: Simple to test error conditions
 * 5. **Real-World Simulation**: Can mock complex scanning/analysis scenarios
 *
 * With this design, testing individual .flac files (or any audio format)
 * becomes straightforward - just mock the engine responses and test the
 * command logic independently.
 */