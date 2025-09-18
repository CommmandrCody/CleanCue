import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import type { AnalysisJob, AnalysisResult } from '@cleancue/shared';

export interface WorkerConfig {
  maxWorkers: number;
  jobTimeout: number;
  retryAttempts: number;
  pythonPath?: string;
  workersPath?: string;
}

export class WorkerPool extends EventEmitter {
  private config: WorkerConfig;
  private activeJobs = new Map<string, any>();

  constructor(config: Partial<WorkerConfig> = {}) {
    super();

    this.config = {
      maxWorkers: 4,
      jobTimeout: 300000, // 5 minutes
      retryAttempts: 2,
      pythonPath: '/Users/wagner/cleancue/packages/workers/venv/bin/python',
      workersPath: path.resolve(__dirname, '../../workers'),
      ...config
    };

    console.log('Real WorkerPool initialized with Python workers');
  }

  async submitJob(job: AnalysisJob): Promise<AnalysisResult> {
    this.emit('job:started', { jobId: job.id, trackId: job.trackId, analyzer: job.analyzer });

    try {
      const result = await this.runPythonWorker(job);
      this.emit('job:completed', result);
      return result;
    } catch (error) {
      this.emit('job:error', { jobId: job.id, error: error.message });
      throw error;
    }
  }

  private async runPythonWorker(job: AnalysisJob): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      const workerScript = this.getWorkerScript(job.analyzer);
      if (!workerScript) {
        return reject(new Error(`Unknown analyzer: ${job.analyzer}`));
      }

      const args = [
        workerScript,
        '--audio-path', job.audioPath,
        '--parameters', JSON.stringify(job.parameters || {}),
        '--job-id', job.id
      ];

      console.log(`Running: ${this.config.pythonPath} ${args.join(' ')}`);

      const worker = spawn(this.config.pythonPath!, args, {
        cwd: this.config.workersPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let lastProgress = 0;

      this.activeJobs.set(job.id, worker);

      const timeout = setTimeout(() => {
        worker.kill();
        this.activeJobs.delete(job.id);
        reject(new Error(`Worker timeout after ${this.config.jobTimeout}ms`));
      }, this.config.jobTimeout);

      worker.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Handle progress updates
        const progressMatch = output.match(/PROGRESS:(\d+)/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            this.emit('job:progress', {
              jobId: job.id,
              trackId: job.trackId,
              progress
            });
          }
        }
      });

      worker.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      worker.on('close', (code) => {
        clearTimeout(timeout);
        this.activeJobs.delete(job.id);

        if (code === 0) {
          try {
            // Extract result from stdout
            const resultMatch = stdout.match(/RESULT:(.+)/);
            if (resultMatch) {
              const results = JSON.parse(resultMatch[1]);
              resolve({
                jobId: job.id,
                trackId: job.trackId,
                analyzer: job.analyzer,
                results,
                status: 'completed',
                completedAt: new Date()
              });
            } else {
              reject(new Error('No result found in worker output'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse worker result: ${error.message}`));
          }
        } else {
          reject(new Error(`Worker failed with code ${code}: ${stderr}`));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        this.activeJobs.delete(job.id);
        reject(new Error(`Worker spawn error: ${error.message}`));
      });
    });
  }

  private getWorkerScript(analyzer: string): string | null {
    const scriptMap = {
      'tempo': 'src/tempo_worker.py',
      'key': 'src/key_worker.py',
      'energy': 'src/energy_worker.py',
      'metadata': 'src/metadata_worker.py',
      'duplicate': 'src/duplicate_detector.py'
    };

    const script = scriptMap[analyzer];
    return script ? path.join(this.config.workersPath!, script) : null;
  }

  close() {
    // Kill all active jobs
    for (const [jobId, worker] of this.activeJobs) {
      worker.kill();
    }
    this.activeJobs.clear();
    console.log('WorkerPool closed');
  }
}
