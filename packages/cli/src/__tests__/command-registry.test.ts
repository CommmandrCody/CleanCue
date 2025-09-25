import { CommandRegistry } from '../command-registry';
import { Command } from '../types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('should register default commands', () => {
    const commands = registry.getAll();
    const names = registry.getNames();

    expect(commands).toHaveLength(7);
    expect(names).toEqual(
      expect.arrayContaining(['scan', 'analyze', 'stats', 'list', 'doctor', 'help', 'info'])
    );
  });

  it('should register custom commands', () => {
    const customCommand: Command = {
      name: 'custom',
      description: 'Custom command',
      usage: 'custom [args]',
      execute: jest.fn()
    };

    registry.register(customCommand);

    expect(registry.get('custom')).toBe(customCommand);
    expect(registry.getNames()).toContain('custom');
    expect(registry.getAll()).toHaveLength(8);
  });

  it('should return undefined for unknown commands', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should override existing commands', () => {
    const originalHelp = registry.get('help');
    const newHelp: Command = {
      name: 'help',
      description: 'New help command',
      usage: 'help',
      execute: jest.fn()
    };

    registry.register(newHelp);

    expect(registry.get('help')).toBe(newHelp);
    expect(registry.get('help')).not.toBe(originalHelp);
    expect(registry.getAll()).toHaveLength(7); // Same count, command replaced
  });
});