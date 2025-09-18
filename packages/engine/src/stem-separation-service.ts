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

  constructor(db: CleanCueDatabase, outputDir?: string) {
    this.db = db;
    this.outputBaseDir = outputDir || path.join(process.cwd(), 'stems');
    this.pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    this.separatorScript = path.join(__dirname, 'stem-separator.py');
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
      missingDeps.push('demucs (pip install demucs)');
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
      missingDeps.push('torch (pip install torch torchaudio)');
    }

    return {
      available: missingDeps.length === 0,
      missingDeps
    };
  }

  async startSeparation(
    trackId: string,
    inputPath: string,
    settings: StemSeparationSettings
  ): Promise<string> {
    // Create database entry
    const separationId = await this.db.insertStemSeparation({
      trackId,
      modelName: settings.model,
      modelVersion: '4.0',
      settings,
      status: 'pending'
    });

    // Create output directory for this separation
    const outputDir = path.join(this.outputBaseDir, separationId);
    await fs.mkdir(outputDir, { recursive: true });

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
      // Update database status
      this.db.updateStemSeparation(separationId, {
        status: 'error',
        errorMessage: 'Cancelled by user'
      });

      // TODO: Keep track of running processes and kill them
      // For now, just update the database
      return true;
    } catch (error) {
      console.error(`Failed to cancel separation: ${error}`);
      return false;
    }
  }

  async deleteSeparation(separationId: string): Promise<boolean> {
    try {
      // Get separation info to delete files
      const separation = await this.getSeparationStatus(separationId);
      if (separation) {
        // Delete output files
        const outputDir = path.join(this.outputBaseDir, separationId);
        try {
          await fs.rm(outputDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to delete output directory: ${error}`);
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
}