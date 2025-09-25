import { StatsCommand } from '../../commands/stats';
import { CleanCueEngine } from '@cleancue/simple-engine';

jest.mock('@cleancue/simple-engine');

describe('StatsCommand', () => {
  let statsCommand: StatsCommand;
  let mockEngine: jest.Mocked<CleanCueEngine>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    statsCommand = new StatsCommand();
    mockEngine = {
      getAllTracks: jest.fn()
    } as any;

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should have correct command metadata', () => {
    expect(statsCommand.name).toBe('stats');
    expect(statsCommand.description).toBe('Show comprehensive library statistics');
    expect(statsCommand.usage).toBe('stats');
  });

  it('should handle empty library', async () => {
    mockEngine.getAllTracks.mockResolvedValue([]);

    await statsCommand.execute([], mockEngine);

    expect(consoleSpy).toHaveBeenCalledWith('📭 No tracks found. Run "cleancue scan <path>" to add music files.');
  });

  it('should display comprehensive statistics for populated library', async () => {
    const mockTracks = [
      {
        id: '1',
        path: '/music/track1.mp3',
        filename: 'track1.mp3',
        size: 5 * 1024 * 1024, // 5MB
        duration: 180, // 3 minutes in seconds
        bpm: 128,
        key: 'C',
        energy: 0.8
      },
      {
        id: '2',
        path: '/music/track2.mp3',
        filename: 'track2.mp3',
        size: 7 * 1024 * 1024, // 7MB
        duration: 240, // 4 minutes in seconds
        bpm: 132,
        key: 'Am',
        energy: 0.7
      },
      {
        id: '3',
        path: '/music/track3.mp3',
        filename: 'track3.mp3',
        size: 6 * 1024 * 1024, // 6MB
        duration: 210, // 3.5 minutes in seconds
        bpm: undefined, // Not analyzed
        key: undefined, // Not analyzed
        energy: undefined
      }
    ];

    mockEngine.getAllTracks.mockResolvedValue(mockTracks as any);

    await statsCommand.execute([], mockEngine);

    expect(consoleSpy).toHaveBeenCalledWith('📊 Library Statistics:');
    expect(consoleSpy).toHaveBeenCalledWith('   Total tracks: 3');
    expect(consoleSpy).toHaveBeenCalledWith('   Total size: 0.02 GB'); // ~18MB
    expect(consoleSpy).toHaveBeenCalledWith('   Average file size: 6.00 MB');
    expect(consoleSpy).toHaveBeenCalledWith('   Total duration: 11 minutes'); // 630 seconds
    expect(consoleSpy).toHaveBeenCalledWith('   Average duration: 210 seconds');

    expect(consoleSpy).toHaveBeenCalledWith('🔬 Analysis Progress:');
    expect(consoleSpy).toHaveBeenCalledWith('   BPM/Tempo analyzed: 2/3 (67%)');
    expect(consoleSpy).toHaveBeenCalledWith('   Key analyzed: 2/3 (67%)');
    expect(consoleSpy).toHaveBeenCalledWith('   Energy analyzed: 2/3 (67%)');
  });

  it('should handle tracks without duration data', async () => {
    const mockTracks = [
      {
        id: '1',
        path: '/music/track1.mp3',
        filename: 'track1.mp3',
        size: 5 * 1024 * 1024,
        duration: undefined,
        bpm: 128
      }
    ];

    mockEngine.getAllTracks.mockResolvedValue(mockTracks as any);

    await statsCommand.execute([], mockEngine);

    expect(consoleSpy).toHaveBeenCalledWith('   Total duration: 0 minutes');
    expect(consoleSpy).toHaveBeenCalledWith('   Average duration: 0 seconds');
  });
});