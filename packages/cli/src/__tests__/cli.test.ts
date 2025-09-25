import { CleanCueCLI } from '../cli';
import { CleanCueEngine } from '@cleancue/simple-engine';

jest.mock('@cleancue/simple-engine');

describe('CleanCueCLI', () => {
  let cli: CleanCueCLI;
  let consoleSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    cli = new CleanCueCLI({ help: true }); // Disable event handlers for testing
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should handle version flag', async () => {
    await cli.run(['node', 'cli.js', '--version']);
    expect(consoleSpy).toHaveBeenCalledWith('CleanCue CLI v0.2.4');
  });

  it('should handle help flag', async () => {
    await cli.run(['node', 'cli.js', '--help']);
    expect(consoleSpy).toHaveBeenCalledWith('CleanCue CLI v0.2.4');
  });

  it('should default to help command when no args', async () => {
    await cli.run(['node', 'cli.js']);
    expect(consoleSpy).toHaveBeenCalledWith('CleanCue CLI v0.2.4');
  });

  it('should handle unknown command', async () => {
    await expect(cli.run(['node', 'cli.js', 'unknown']))
      .rejects.toThrow('Unknown command: unknown');

    expect(consoleSpy).toHaveBeenCalledWith('❌ Unknown command: unknown');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Available commands:'));
  });

  it('should register and execute commands', async () => {
    const registry = cli.getRegistry();
    const commands = registry.getAll();

    expect(commands).toHaveLength(7); // scan, analyze, stats, list, doctor, help, info
    expect(registry.getNames()).toEqual(
      expect.arrayContaining(['scan', 'analyze', 'stats', 'list', 'doctor', 'help', 'info'])
    );
  });

  it('should provide access to engine for testing', () => {
    const engine = cli.getEngineIfInitialized();
    expect(engine).toBeUndefined(); // Engine not initialized yet
  });

  it('should handle command execution errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock a command that throws
    const mockCommand = {
      name: 'test',
      description: 'test',
      usage: 'test',
      execute: jest.fn().mockRejectedValue(new Error('Test error'))
    };

    cli.getRegistry().register(mockCommand);

    await expect(cli.run(['node', 'cli.js', 'test']))
      .rejects.toThrow('Test error');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ test failed:', 'Test error');

    consoleErrorSpy.mockRestore();
  });
});