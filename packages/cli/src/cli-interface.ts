/**
 * Clean CLI Interface for UI Integration
 *
 * This module provides a clean, testable interface between the CLI and UI systems.
 * It exposes only what the UI needs while keeping the CLI modular and scalable.
 */

import { CleanCueCLI } from './cli.js';
import { Command } from './types.js';

export interface CLIResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class CLIInterface {
  private cli: CleanCueCLI;

  constructor() {
    // Initialize CLI without engine initialization for performance
    this.cli = new CleanCueCLI({ help: true });
  }

  /**
   * Execute a CLI command and return structured result
   */
  async executeCommand(command: string, args: string[] = []): Promise<CLIResult> {
    try {
      // Capture console output
      const originalConsoleLog = console.log;
      let output = '';

      console.log = (...messages) => {
        output += messages.join(' ') + '\n';
      };

      await this.cli.runCommand(command, args);

      // Restore console
      console.log = originalConsoleLog;

      return {
        success: true,
        message: output.trim(),
        data: { command, args }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: { command, args }
      };
    }
  }

  /**
   * Get available commands
   */
  getAvailableCommands(): Command[] {
    return this.cli.getRegistry().getAll();
  }

  /**
   * Check if a command exists
   */
  hasCommand(name: string): boolean {
    return this.cli.getRegistry().get(name) !== undefined;
  }

  /**
   * Get command information
   */
  getCommand(name: string): Command | undefined {
    return this.cli.getRegistry().get(name);
  }

  /**
   * Execute scan command and return structured data
   */
  async scan(paths: string[]): Promise<CLIResult> {
    return this.executeCommand('scan', paths);
  }

  /**
   * Execute analyze command
   */
  async analyze(type: string = 'all'): Promise<CLIResult> {
    return this.executeCommand('analyze', [type]);
  }

  /**
   * Get library statistics
   */
  async getStats(): Promise<CLIResult> {
    return this.executeCommand('stats');
  }

  /**
   * List tracks
   */
  async listTracks(limit?: number): Promise<CLIResult> {
    return this.executeCommand('list', limit ? [limit.toString()] : []);
  }

  /**
   * Run health check
   */
  async doctor(): Promise<CLIResult> {
    return this.executeCommand('doctor');
  }
}