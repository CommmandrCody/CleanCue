/**
 * UI-CLI Bridge Service
 *
 * This service allows the UI (which has its own engine) to call the
 * standalone CLI for specific operations like scanning large directories.
 *
 * Architecture:
 * - UI has its own @cleancue/engine for real-time operations
 * - UI calls standalone CLI for heavy shell operations
 * - Results from CLI are imported into UI's engine
 * - Best of both worlds: fast shell ops + rich UI features
 */

import { spawn } from 'child_process';
import { StandaloneCLI } from '@cleancue/cli';
import path from 'path';

export interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface ScanProgress {
  currentFile: string;
  filesFound: number;
  isComplete: boolean;
}

export class CLIBridge {
  private cliPath: string;
  private standaloneCLI: StandaloneCLI;

  constructor() {
    // Path to the CLI binary for shell execution
    this.cliPath = path.resolve(__dirname, '../../../cli/bin/cleancue');
    // Direct TypeScript CLI instance for in-process calls
    this.standaloneCLI = new StandaloneCLI();
  }

  /**
   * Execute CLI command in-process (fastest)
   * Use this for quick operations
   */
  async executeInProcess(command: string, args: string[]): Promise<CLIResult> {
    const startTime = Date.now();

    try {
      // Use the standalone CLI for in-process execution
      const result = await this.standaloneCLI.executeAndCapture(command, args);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Execute CLI command as separate process (for very large operations)
   * Use this for massive directory scans that might block the UI
   */
  async executeAsProcess(command: string, args: string[], options: {
    onProgress?: (data: string) => void;
    timeout?: number;
  } = {}): Promise<CLIResult> {
    const startTime = Date.now();
    const { onProgress, timeout = 300000 } = options; // 5 minute timeout

    return new Promise((resolve) => {
      const child = spawn('node', [this.cliPath, command, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onProgress) {
          onProgress(chunk);
        }
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: code !== 0 ? errorOutput.trim() : undefined,
          duration: Date.now() - startTime
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: output.trim(),
          error: error.message,
          duration: Date.now() - startTime
        });
      });

      // Set timeout
      if (timeout > 0) {
        setTimeout(() => {
          child.kill();
          resolve({
            success: false,
            output: output.trim(),
            error: `Command timed out after ${timeout}ms`,
            duration: Date.now() - startTime
          });
        }, timeout);
      }
    });
  }

  /**
   * Fast directory scan optimized for UI integration
   * Scans directory using CLI, then imports results into UI engine
   */
  async scanDirectoryForUI(
    paths: string[],
    options: {
      onProgress?: (progress: ScanProgress) => void;
      format?: string;
      useProcess?: boolean; // true for very large scans
    } = {}
  ): Promise<{
    files: Array<{
      path: string;
      filename: string;
      size: number;
      format: string;
    }>;
    totalFiles: number;
    totalSize: number;
    duration: number;
  }> {
    const args = [...paths];
    if (options.format) {
      args.push('--format', options.format);
    }

    // Progress tracking
    let filesFound = 0;
    const progressCallback = (data: string) => {
      const match = data.match(/Found (\d+) files/);
      if (match && options.onProgress) {
        filesFound = parseInt(match[1]);
        options.onProgress({
          currentFile: data,
          filesFound,
          isComplete: false
        });
      }
    };

    const result = options.useProcess
      ? await this.executeAsProcess('scan', args, { onProgress: progressCallback })
      : await this.executeInProcess('scan', args);

    if (options.onProgress) {
      options.onProgress({
        currentFile: '',
        filesFound,
        isComplete: true
      });
    }

    if (!result.success) {
      throw new Error(result.error || 'Scan failed');
    }

    // Parse CLI output to extract file information
    return this.parseScanOutput(result.output, result.duration);
  }

  /**
   * Quick count operation for UI
   */
  async quickCount(paths: string[], format?: string): Promise<number> {
    const args = [...paths];
    if (format) {
      args.push('--format', format);
    }

    const result = await this.executeInProcess('count', args);

    if (!result.success) {
      throw new Error(result.error || 'Count failed');
    }

    // Parse count from output: "Found X audio files"
    const match = result.output.match(/Found ([\d,]+) audio files/);
    return match ? parseInt(match[1].replace(/,/g, '')) : 0;
  }

  /**
   * Find files with filters for UI
   */
  async findFiles(
    path: string,
    filters: {
      format?: string;
      namePattern?: string;
      large?: boolean;
      small?: boolean;
    } = {}
  ): Promise<Array<{ path: string; filename: string; size: number }>> {
    const args = [path];

    if (filters.format) args.push('--format', filters.format);
    if (filters.namePattern) args.push('--name', filters.namePattern);
    if (filters.large) args.push('--large');
    if (filters.small) args.push('--small');

    const result = await this.executeInProcess('find', args);

    if (!result.success) {
      throw new Error(result.error || 'Find failed');
    }

    return this.parseFindOutput(result.output);
  }

  private parseScanOutput(output: string, duration: number) {
    // This is a simplified parser - in practice you'd parse the actual CLI output format
    const lines = output.split('\n');
    const files: Array<{ path: string; filename: string; size: number; format: string }> = [];

    let totalFiles = 0;
    let totalSize = 0;

    for (const line of lines) {
      const filesMatch = line.match(/(\d+) files found/);
      if (filesMatch) {
        totalFiles = parseInt(filesMatch[1]);
      }

      const sizeMatch = line.match(/Total size: ([\d.]+) ([A-Z]+)/);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        totalSize = this.convertToBytes(size, unit);
      }
    }

    return {
      files,
      totalFiles,
      totalSize,
      duration
    };
  }

  private parseFindOutput(_output: string) {
    // Simplified parser for find results - TODO: implement proper parsing
    return [];
  }

  private convertToBytes(size: number, unit: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    return size * (units[unit] || 1);
  }
}