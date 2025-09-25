/**
 * Standalone CLI - No Engine Dependencies
 *
 * Fast, lightweight CLI optimized for shell operations and large track sweeps.
 * Completely decoupled from the engine for maximum performance.
 */

import { StandaloneCommandRegistry } from './command-registry-standalone.js';
import { CLIOptions } from './types.js';

const CLI_VERSION = '0.2.4';

export class StandaloneCLI {
  private registry: StandaloneCommandRegistry;

  constructor(options: CLIOptions = {}) {
    this.registry = new StandaloneCommandRegistry();
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

    return this.runCommand(command, args);
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
      // All standalone commands don't need an engine
      await command.execute(args);
    } catch (error) {
      console.error(`❌ ${command.name} failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // For testing and UI integration
  getRegistry(): StandaloneCommandRegistry {
    return this.registry;
  }

  // Execute command and capture output for UI integration
  async executeAndCapture(commandName: string, args: string[]): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    let output = '';
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    // Capture console output
    console.log = (...messages) => {
      output += messages.join(' ') + '\n';
    };
    console.error = (...messages) => {
      output += messages.join(' ') + '\n';
    };

    try {
      await this.runCommand(commandName, args);
      return {
        success: true,
        output: output.trim()
      };
    } catch (error) {
      return {
        success: false,
        output: output.trim(),
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      // Restore console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  }
}