import { ScanCommand } from '../../commands/scan';
import { CleanCueEngine } from '@cleancue/simple-engine';
import { promises as fs } from 'fs';

// Mock fs and CleanCueEngine
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn()
  }
}));

jest.mock('@cleancue/simple-engine');

describe('ScanCommand', () => {
  let scanCommand: ScanCommand;
  let mockEngine: jest.Mocked<CleanCueEngine>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    scanCommand = new ScanCommand();
    mockEngine = {
      scanLibrary: jest.fn()
    } as any;

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should have correct command metadata', () => {
    expect(scanCommand.name).toBe('scan');
    expect(scanCommand.description).toBe('Scan directories for music files');
    expect(scanCommand.usage).toBe('scan <path1> [path2] [path3] ...');
  });

  it('should throw error when no paths provided', async () => {
    await expect(scanCommand.execute([], mockEngine))
      .rejects.toThrow('Please provide path(s) to scan');
  });

  it('should throw error when path is not a directory', async () => {
    const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    await expect(scanCommand.execute(['/path/to/file'], mockEngine))
      .rejects.toThrow('/path/to/file is not a directory');
  });

  it('should successfully scan valid directories', async () => {
    const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
    mockStat.mockResolvedValue({ isDirectory: () => true } as any);

    mockEngine.scanLibrary.mockResolvedValue({
      tracksScanned: 100,
      tracksAdded: 15,
      tracksUpdated: 3,
      errors: []
    });

    await scanCommand.execute(['/path/to/music'], mockEngine);

    expect(mockEngine.scanLibrary).toHaveBeenCalledWith(['/path/to/music']);
    expect(consoleSpy).toHaveBeenCalledWith('\n📊 Scan Summary:');
    expect(consoleSpy).toHaveBeenCalledWith('   Total tracks scanned: 100');
    expect(consoleSpy).toHaveBeenCalledWith('   New tracks added: 15');
    expect(consoleSpy).toHaveBeenCalledWith('   Tracks updated: 3');
    expect(consoleSpy).toHaveBeenCalledWith('   Errors: 0');
  });

  it('should handle multiple directories', async () => {
    const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
    mockStat.mockResolvedValue({ isDirectory: () => true } as any);

    mockEngine.scanLibrary.mockResolvedValue({
      tracksScanned: 200,
      tracksAdded: 30,
      tracksUpdated: 5,
      errors: []
    });

    const paths = ['/path/to/music1', '/path/to/music2'];
    await scanCommand.execute(paths, mockEngine);

    expect(fs.stat).toHaveBeenCalledTimes(2);
    expect(mockEngine.scanLibrary).toHaveBeenCalledWith(paths);
  });
});