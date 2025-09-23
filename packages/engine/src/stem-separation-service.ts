import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { CleanCueDatabase } from './database';

export interface StemSeparationSettings {
  model: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra';
  outputFormat: 'wav' | 'flac' | 'mp3';
  quality: 'low' | 'medium' | 'high';
  segments: number;
  overlap: number;
  clipMode: 'rescale' | 'clamp';
  mp3Bitrate?: number;
  jobs?: number;
}

export interface StemSeparationResult {
  id: string;
  trackId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  vocalsPath?: string;
  drumsPath?: string;
  bassPath?: string;
  otherPath?: string;
  processingTimeMs?: number;
  errorMessage?: string;
}

export class StemSeparationService {
  private db: CleanCueDatabase;
  private outputBaseDir: string;
  private pythonExecutable: string;
  private separatorScript: string;
  private workersPath: string;
  private runningProcesses: Map<string, any> = new Map(); // Track running Python processes

  constructor(db: CleanCueDatabase, outputDir?: string, workersPath?: string, pythonPath?: string) {
    this.db = db;
    this.outputBaseDir = outputDir || path.join(process.cwd(), 'stems');
    this.workersPath = workersPath || path.join(process.cwd(), 'packages', 'workers');

    // Use the provided Python path or fall back to virtual environment Python
    this.pythonExecutable = pythonPath || path.join(this.workersPath, 'venv', 'bin', 'python');

    // Handle both development and production paths for the Python script
    // In development: __dirname points to src/, script is in src/
    // In production: __dirname points to dist/, but script should be in src/
    const srcScript = path.join(__dirname, 'stem-separator.py');
    const distScript = path.join(__dirname, '..', 'src', 'stem-separator.py');

    // Try src first (development), then dist fallback (production)
    try {
      require('fs').accessSync(srcScript);
      this.separatorScript = srcScript;
      console.log(`🎵 [STEM-SERVICE] Using development script path: ${srcScript}`);
    } catch {
      this.separatorScript = distScript;
      console.log(`🎵 [STEM-SERVICE] Using production script path: ${distScript}`);
    }

    console.log(`🎵 [STEM-SERVICE] Configuration:`, {
      pythonExecutable: this.pythonExecutable,
      separatorScript: this.separatorScript,
      workersPath: this.workersPath,
      outputBaseDir: this.outputBaseDir
    });

    // Ensure base output directory exists with proper permissions
    this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.outputBaseDir, { recursive: true, mode: 0o755 });

      // Try to set permissions, but don't fail if it doesn't work
      try {
        await fs.chmod(this.outputBaseDir, 0o755);
      } catch (chmodError) {
        // Ignore chmod errors - they're common on macOS and don't prevent functionality
        console.debug('Could not set permissions on stems directory (non-critical):', chmodError.code);
      }
    } catch (error) {
      // Only log if directory creation fails
      if (error.code !== 'EEXIST') {
        console.warn('Could not create base stems directory:', error);
      }
    }
  }

  async checkDependencies(): Promise<{ available: boolean; missingDeps: string[] }> {
    const missingDeps: string[] = [];

    try {
      // Check if Python is available
      await new Promise((resolve, reject) => {
        const python = spawn(this.pythonExecutable, ['--version']);
        python.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('Python not found'));
          }
        });
        python.on('error', reject);
      });
    } catch {
      missingDeps.push('Python 3.8+');
    }

    try {
      // Check if demucs is installed
      await new Promise((resolve, reject) => {
        const python = spawn(this.pythonExecutable, ['-c', 'import demucs; print("OK")']);
        python.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('Demucs not found'));
          }
        });
        python.on('error', reject);
      });
    } catch {
      missingDeps.push('demucs');
    }

    try {
      // Check if torch is installed
      await new Promise((resolve, reject) => {
        const python = spawn(this.pythonExecutable, ['-c', 'import torch; print("OK")']);
        python.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('PyTorch not found'));
          }
        });
        python.on('error', reject);
      });
    } catch {
      missingDeps.push('torch');
    }

    try {
      // Check if torchaudio is installed
      await new Promise((resolve, reject) => {
        const python = spawn(this.pythonExecutable, ['-c', 'import torchaudio; print("OK")']);
        python.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('TorchAudio not found'));
          }
        });
        python.on('error', reject);
      });
    } catch {
      missingDeps.push('torchaudio');
    }

    return {
      available: missingDeps.length === 0,
      missingDeps
    };
  }

  async installDependencies(onProgress?: (message: string) => void): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎵 [STEM-SERVICE] Installing Python dependencies for STEM separation...');
      onProgress?.('Installing STEM separation dependencies...');

      // Use the dependency installer script
      const installerScript = path.join(this.workersPath, 'src', 'dependency_installer.py');

      return new Promise((resolve) => {
        const installer = spawn(this.pythonExecutable, [installerScript, '--install-stems'], {
          cwd: this.workersPath
        });

        installer.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`🎵 [STEM-INSTALL] ${output}`);
          onProgress?.(output.trim());
        });

        installer.stderr.on('data', (data) => {
          const error = data.toString();
          console.log(`🎵 [STEM-INSTALL] ${error}`);
          onProgress?.(error.trim());
        });

        installer.on('close', (code) => {
          if (code === 0) {
            console.log('🎵 [STEM-SERVICE] ✅ Dependencies installed successfully');
            onProgress?.('Dependencies installed successfully!');
            resolve({ success: true });
          } else {
            const errorMsg = `Failed to install dependencies (exit code: ${code})`;
            console.error(`🎵 [STEM-SERVICE] ❌ ${errorMsg}`);
            resolve({ success: false, error: errorMsg });
          }
        });

        installer.on('error', (error) => {
          const errorMsg = `Installation process error: ${error.message}`;
          console.error(`🎵 [STEM-SERVICE] ❌ ${errorMsg}`);
          resolve({ success: false, error: errorMsg });
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during installation';
      console.error(`🎵 [STEM-SERVICE] ❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  async startSeparation(
    trackId: string,
    inputPath: string,
    settings: StemSeparationSettings,
    onProgress?: (message: string) => void
  ): Promise<string> {
    // Check if dependencies are available
    console.log('🎵 [STEM-SERVICE] Checking dependencies...');
    const depCheck = await this.checkDependencies();

    if (!depCheck.available) {
      console.log(`🎵 [STEM-SERVICE] Missing dependencies: ${depCheck.missingDeps.join(', ')}`);
      onProgress?.(`Installing missing dependencies: ${depCheck.missingDeps.join(', ')}`);

      // Auto-install missing dependencies
      const installResult = await this.installDependencies(onProgress);

      if (!installResult.success) {
        throw new Error(`Failed to install dependencies: ${installResult.error}`);
      }

      // Re-check dependencies after installation
      const recheckResult = await this.checkDependencies();
      if (!recheckResult.available) {
        throw new Error(`Dependencies still missing after installation: ${recheckResult.missingDeps.join(', ')}`);
      }
    }

    // Create database entry
    const separationId = await this.db.insertStemSeparation({
      trackId,
      modelName: settings.model,
      modelVersion: '4.0',
      settings,
      status: 'pending'
    });

    // Get track info to create organized folder name
    const track = this.db.getTrack(trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    // Create a clean folder name from track info
    const artist = track.artist || 'Unknown Artist';
    const title = track.title || track.filename.replace(/\.[^/.]+$/, ''); // Remove extension
    const cleanFolderName = this.sanitizeFolderName(`${artist} - ${title}`);

    // Create output directory with organized name
    const outputDir = path.join(this.outputBaseDir, cleanFolderName);
    await fs.mkdir(outputDir, { recursive: true, mode: 0o755 });

    // Ensure proper ownership/permissions in case process has elevated permissions
    try {
      await fs.chmod(outputDir, 0o755);
    } catch (error) {
      console.warn('Could not set directory permissions:', error);
    }

    // Start the separation process
    this.runSeparation(separationId, inputPath, outputDir, settings);

    return separationId;
  }

  private async runSeparation(
    separationId: string,
    inputPath: string,
    outputDir: string,
    settings: StemSeparationSettings
  ): Promise<void> {
    try {
      // Get database path
      const dbPath = this.db['db'].name; // Access the sqlite3 database path

      // Prepare arguments for Python script
      const args = [
        this.separatorScript,
        dbPath,
        inputPath,
        outputDir,
        separationId,
        JSON.stringify(settings)
      ];

      console.log(`Starting STEM separation: ${separationId}`);
      console.log(`Input: ${inputPath}`);
      console.log(`Output: ${outputDir}`);
      console.log(`Model: ${settings.model}`);

      // Update status to processing
      this.db.updateStemSeparation(separationId, { status: 'processing', progress: 0 });

      // Spawn Python process
      const python = spawn(this.pythonExecutable, args);

      // Track the running process
      this.runningProcesses.set(separationId, python);

      // Handle stdout
      python.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[STEM ${separationId}] ${output}`);
      });

      // Handle stderr
      python.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`[STEM ${separationId}] ${error}`);
      });

      // Handle process completion
      python.on('close', (code) => {
        // Remove from tracking when process completes
        this.runningProcesses.delete(separationId);

        if (code === 0) {
          console.log(`STEM separation completed successfully: ${separationId}`);
        } else {
          console.error(`STEM separation failed with code ${code}: ${separationId}`);
          this.db.updateStemSeparation(separationId, {
            status: 'error',
            errorMessage: `Process exited with code ${code}`
          });
        }
      });

      // Handle process errors
      python.on('error', (error) => {
        // Remove from tracking on error
        this.runningProcesses.delete(separationId);

        console.error(`STEM separation process error: ${error.message}`);
        this.db.updateStemSeparation(separationId, {
          status: 'error',
          errorMessage: error.message
        });
      });

    } catch (error) {
      console.error(`Failed to start STEM separation: ${error}`);
      this.db.updateStemSeparation(separationId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSeparationStatus(separationId: string): Promise<StemSeparationResult | null> {
    return this.db.getStemSeparationByTrackId(separationId);
  }

  async getSeparationByTrackId(trackId: string): Promise<StemSeparationResult | null> {
    return this.db.getStemSeparationByTrackId(trackId);
  }

  async getAllSeparations(): Promise<StemSeparationResult[]> {
    return this.db.getAllStemSeparations();
  }

  async cancelSeparation(separationId: string): Promise<boolean> {
    try {
      console.log(`🎵 [STEM-SERVICE] Cancelling separation: ${separationId}`);

      // Kill the running process if it exists
      const process = this.runningProcesses.get(separationId);
      if (process) {
        console.log(`🎵 [STEM-SERVICE] Killing Python process for: ${separationId}`);
        process.kill('SIGTERM');

        // Give it a moment, then force kill if needed
        setTimeout(() => {
          if (this.runningProcesses.has(separationId)) {
            console.log(`🎵 [STEM-SERVICE] Force killing process for: ${separationId}`);
            process.kill('SIGKILL');
          }
        }, 5000);

        this.runningProcesses.delete(separationId);
      }

      // Update database status
      this.db.updateStemSeparation(separationId, {
        status: 'error',
        errorMessage: 'Cancelled by user'
      });

      console.log(`🎵 [STEM-SERVICE] ✅ Separation cancelled: ${separationId}`);
      return true;
    } catch (error) {
      console.error(`🎵 [STEM-SERVICE] ❌ Failed to cancel separation: ${error}`);
      return false;
    }
  }

  async deleteSeparation(separationId: string): Promise<boolean> {
    try {
      // Get separation info to delete files
      const separation = await this.getSeparationStatus(separationId);
      if (separation) {
        // Get track info to recreate the folder path
        const track = this.db.getTrack(separation.trackId);
        if (track) {
          const artist = track.artist || 'Unknown Artist';
          const title = track.title || track.filename.replace(/\.[^/.]+$/, '');
          const cleanFolderName = this.sanitizeFolderName(`${artist} - ${title}`);
          const outputDir = path.join(this.outputBaseDir, cleanFolderName);

          try {
            await fs.rm(outputDir, { recursive: true, force: true });
          } catch (error) {
            console.warn(`Failed to delete output directory: ${error}`);
          }
        }
      }

      // Delete from database
      return this.db.deleteStemSeparation(separationId);
    } catch (error) {
      console.error(`Failed to delete separation: ${error}`);
      return false;
    }
  }

  getDefaultSettings(): StemSeparationSettings {
    return {
      model: 'htdemucs',
      outputFormat: 'wav',
      quality: 'high',
      segments: 4,
      overlap: 0.25,
      clipMode: 'rescale',
      jobs: 1
    };
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'htdemucs',      // Hybrid Transformer Demucs (best quality)
      'htdemucs_ft',   // Fine-tuned version
      'htdemucs_6s',   // 6-source separation (vocals, drums, bass, other, guitar, piano)
      'mdx_extra'      // MDX model for specific use cases
    ];
  }

  async estimateProcessingTime(durationMs: number, model: string): Promise<number> {
    // Rough estimation based on model complexity and audio duration
    const baseMultiplier = {
      'htdemucs': 0.8,      // Fastest
      'htdemucs_ft': 1.0,   // Medium
      'htdemucs_6s': 1.5,   // Slower (6 sources)
      'mdx_extra': 1.2      // Medium-slow
    };

    const multiplier = baseMultiplier[model as keyof typeof baseMultiplier] || 1.0;
    const estimatedSeconds = (durationMs / 1000) * multiplier;

    // Add overhead for loading model, I/O, etc.
    return Math.round(estimatedSeconds + 30);
  }

  getRunningProcessCount(): number {
    return this.runningProcesses.size;
  }

  getRunningProcesses(): string[] {
    return Array.from(this.runningProcesses.keys());
  }

  private sanitizeFolderName(name: string): string {
    // Remove/replace problematic characters for folder names
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filesystem characters
      .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim()
      .substring(0, 100); // Limit length to 100 characters
  }
}