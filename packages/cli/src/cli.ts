import { CleanCueEngine } from '@cleancue/simple-engine';
import { CommandRegistry } from './command-registry.js';
import { setupEventHandlers } from './event-handlers.js';
import { CLIOptions } from './types.js';

const CLI_VERSION = '0.2.4';

export class CleanCueCLI {
  private engine?: CleanCueEngine;
  private registry: CommandRegistry;
  private options: CLIOptions;

  constructor(options: CLIOptions = {}) {
    this.options = options;
    this.registry = new CommandRegistry();
  }

  private getEngine(): CleanCueEngine {
    if (!this.engine) {
      this.engine = new CleanCueEngine();
      if (!this.options.help) {
        setupEventHandlers(this.engine);
      }
    }
    return this.engine;
  }

  async run(argv: string[] = process.argv): Promise<void> {
    const command = argv[2] || 'help';
    const args = argv.slice(3);

    // Handle help flags
    if (command === '--help' || command === '-h') {
      return this.runCommand('help', []);
    }

    // Handle version flag
    if (command === '--version' || command === '-v') {
      console.log(`CleanCue CLI v${CLI_VERSION}`);
      return;
    }

    try {
      return await this.runCommand(command, args);
    } catch (error) {
      // Only exit process if we're running directly, not from tests
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      throw error;
    }
  }

  async runCommand(commandName: string, args: string[]): Promise<void> {
    const command = this.registry.get(commandName);

    if (!command) {
      const error = new Error(`Unknown command: ${commandName}`);
      console.log(`❌ ${error.message}`);
      console.log(`Available commands: ${this.registry.getNames().join(', ')}`);
      console.log('Use "cleancue help" for more information.');
      throw error;
    }

    try {
      // Only initialize engine for commands that need it
      if (['scan', 'analyze', 'stats', 'list', 'doctor'].includes(command.name)) {
        await command.execute(args, this.getEngine());
      } else {
        await command.execute(args);
      }
    } catch (error) {
      console.error(`❌ ${command.name} failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // For testing: get access to registry and engine
  getRegistry(): CommandRegistry {
    return this.registry;
  }

  getEngineIfInitialized(): CleanCueEngine | undefined {
    return this.engine;
  }
}