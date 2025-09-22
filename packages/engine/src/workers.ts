import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import type { AnalysisJob, AnalysisResult } from '@cleancue/shared';

export interface WorkerConfig {
  maxWorkers: number;
  maxConcurrentJobs: number;
  jobTimeout: number;
  retryAttempts: number;
  pythonPath?: string;
  workersPath?: string;
  watchdogInterval: number; // How often to check for stuck processes (ms)
  maxJobAge: number; // Maximum time a job can run before being considered stuck (ms)
}

interface JobInfo {
  process: any;
  startTime: number;
  jobId: string;
  trackId: string;
  analyzer: string;
  retryCount: number;
}

export class WorkerPool extends EventEmitter {
  private config: WorkerConfig;
  private activeJobs = new Map<string, JobInfo>();
  private jobQueue: AnalysisJob[] = [];
  private watchdogTimer?: NodeJS.Timeout;

  constructor(config: Partial<WorkerConfig> = {}) {
    super();

    this.config = {
      maxWorkers: 2,
      maxConcurrentJobs: 1, // More conservative: 1 job at a time for stability
      jobTimeout: 180000, // 3 minutes - shorter timeout
      retryAttempts: 1, // Fewer retries to avoid overwhelming system
      pythonPath: '/Users/wagner/cleancue/packages/workers/venv/bin/python',
      workersPath: path.resolve(__dirname, '../../workers'),
      watchdogInterval: 15000, // Check every 15 seconds for faster cleanup
      maxJobAge: 300000, // 5 minutes max job age
      ...config
    };

    console.log('Real WorkerPool initialized with concurrency controls:', {
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      jobTimeout: this.config.jobTimeout,
      watchdogInterval: this.config.watchdogInterval
    });

    // Start the watchdog timer
    this.startWatchdog();
  }

  async submitJob(job: AnalysisJob): Promise<AnalysisResult> {
    // Check if we're at the concurrent job limit
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      console.log(`🕐 Job ${job.id} queued - ${this.activeJobs.size}/${this.config.maxConcurrentJobs} slots occupied`);
      this.jobQueue.push(job);

      // Wait for a slot to become available
      return new Promise((resolve, reject) => {
        const checkQueue = () => {
          if (this.activeJobs.size < this.config.maxConcurrentJobs) {
            // Remove from queue and process
            const queueIndex = this.jobQueue.findIndex(qJob => qJob.id === job.id);
            if (queueIndex !== -1) {
              this.jobQueue.splice(queueIndex, 1);
              this.processJob(job).then(resolve).catch(reject);
            }
          } else {
            // Check again in 1 second
            setTimeout(checkQueue, 1000);
          }
        };
        checkQueue();
      });
    }

    return this.processJob(job);
  }

  private async processJob(job: AnalysisJob): Promise<AnalysisResult> {
    this.emit('job:started', { jobId: job.id, trackId: job.trackId, analyzer: job.analyzer });

    try {
      const result = await this.runPythonWorker(job);
      this.emit('job:completed', result);
      this.processNextInQueue(); // Process next queued job
      return result;
    } catch (error) {
      this.emit('job:error', { jobId: job.id, error: error.message });
      this.processNextInQueue(); // Process next queued job even on error
      throw error;
    }
  }

  private processNextInQueue(): void {
    if (this.jobQueue.length > 0 && this.activeJobs.size < this.config.maxConcurrentJobs) {
      const nextJob = this.jobQueue.shift();
      if (nextJob) {
        console.log(`🚀 Processing next queued job: ${nextJob.id}`);
        this.processJob(nextJob).catch(error => {
          console.error(`❌ Queued job ${nextJob.id} failed:`, error);
        });
      }
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

      // Track job with metadata
      const jobInfo: JobInfo = {
        process: worker,
        startTime: Date.now(),
        jobId: job.id,
        trackId: job.trackId,
        analyzer: job.analyzer,
        retryCount: 0
      };
      this.activeJobs.set(job.id, jobInfo);

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

  private startWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      this.checkForStuckJobs();
    }, this.config.watchdogInterval);

    console.log(`🐕 Watchdog started - checking every ${this.config.watchdogInterval/1000}s for stuck jobs`);
  }

  private checkForStuckJobs(): void {
    const now = Date.now();
    const stuckJobs: string[] = [];

    for (const [jobId, jobInfo] of this.activeJobs) {
      const jobAge = now - jobInfo.startTime;

      if (jobAge > this.config.maxJobAge) {
        console.warn(`🐕 WATCHDOG: Job ${jobId} (${jobInfo.analyzer}) stuck for ${Math.round(jobAge/1000)}s - killing process`);

        try {
          // Kill the stuck process
          jobInfo.process.kill('SIGTERM');

          // Give it a moment, then force kill
          setTimeout(() => {
            if (this.activeJobs.has(jobId)) {
              jobInfo.process.kill('SIGKILL');
            }
          }, 5000);

          stuckJobs.push(jobId);
          this.activeJobs.delete(jobId);

          // Emit error event for stuck job
          this.emit('job:error', {
            jobId: jobInfo.jobId,
            error: `Job stuck for ${Math.round(jobAge/1000)}s - killed by watchdog`
          });

        } catch (error) {
          console.error(`🐕 WATCHDOG: Failed to kill stuck job ${jobId}:`, error);
        }
      }
    }

    if (stuckJobs.length > 0) {
      console.log(`🐕 WATCHDOG: Cleaned up ${stuckJobs.length} stuck jobs, processing next in queue...`);
      this.processNextInQueue();
    }

    // Log current status every few cycles
    if (this.activeJobs.size > 0) {
      console.log(`🔄 WORKER STATUS: ${this.activeJobs.size} active, ${this.jobQueue.length} queued`);
    }
  }

  getStatus(): { activeJobs: number; queuedJobs: number; details: Array<{jobId: string, analyzer: string, ageSeconds: number}> } {
    const now = Date.now();
    const details = Array.from(this.activeJobs.values()).map(jobInfo => ({
      jobId: jobInfo.jobId,
      analyzer: jobInfo.analyzer,
      ageSeconds: Math.round((now - jobInfo.startTime) / 1000)
    }));

    return {
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      details
    };
  }

  clearQueue(): void {
    console.log(`🧹 Clearing job queue (${this.jobQueue.length} jobs)`);
    this.jobQueue = [];
  }

  killAllJobs(): void {
    console.log(`💀 Killing all active jobs (${this.activeJobs.size} jobs)`);
    for (const [jobId, jobInfo] of this.activeJobs) {
      try {
        jobInfo.process.kill('SIGTERM');
      } catch (error) {
        console.error(`Failed to kill job ${jobId}:`, error);
      }
    }
    this.activeJobs.clear();
    this.clearQueue();
  }

  close() {
    // Stop the watchdog
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }

    // Kill all active jobs
    this.killAllJobs();

    console.log('WorkerPool closed');
  }
}
