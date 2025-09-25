import { CLIInterface } from '../cli-interface';

describe('CLIInterface', () => {
  let cliInterface: CLIInterface;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    cliInterface = new CLIInterface();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should initialize without starting the engine', () => {
    expect(cliInterface).toBeDefined();
  });

  it('should execute help command successfully', async () => {
    const result = await cliInterface.executeCommand('help');

    expect(result.success).toBe(true);
    expect(result.message).toContain('CleanCue CLI');
    expect(result.data).toEqual({ command: 'help', args: [] });
  });

  it('should handle unknown commands', async () => {
    const result = await cliInterface.executeCommand('nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown command: nonexistent');
  });

  it('should list available commands', () => {
    const commands = cliInterface.getAvailableCommands();

    expect(commands).toHaveLength(7);
    const commandNames = commands.map(cmd => cmd.name);
    expect(commandNames).toEqual(
      expect.arrayContaining(['scan', 'analyze', 'stats', 'list', 'doctor', 'help', 'info'])
    );
  });

  it('should check command existence', () => {
    expect(cliInterface.hasCommand('help')).toBe(true);
    expect(cliInterface.hasCommand('scan')).toBe(true);
    expect(cliInterface.hasCommand('nonexistent')).toBe(false);
  });

  it('should get command information', () => {
    const helpCommand = cliInterface.getCommand('help');
    const nonexistentCommand = cliInterface.getCommand('nonexistent');

    expect(helpCommand).toBeDefined();
    expect(helpCommand?.name).toBe('help');
    expect(nonexistentCommand).toBeUndefined();
  });

  it('should provide convenience methods for common operations', async () => {
    // Mock the underlying commands to avoid engine initialization
    jest.spyOn(cliInterface, 'executeCommand').mockResolvedValue({
      success: true,
      message: 'Mocked result'
    });

    const scanResult = await cliInterface.scan(['/path/to/music']);
    const analyzeResult = await cliInterface.analyze('tempo');
    const statsResult = await cliInterface.getStats();
    const listResult = await cliInterface.listTracks(10);
    const doctorResult = await cliInterface.doctor();

    expect(scanResult.success).toBe(true);
    expect(analyzeResult.success).toBe(true);
    expect(statsResult.success).toBe(true);
    expect(listResult.success).toBe(true);
    expect(doctorResult.success).toBe(true);
  });
});