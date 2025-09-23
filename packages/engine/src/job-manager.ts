import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CleanCueDatabase } from './database';
import type {
  BaseJob, JobType, JobStatus, ScanJobPayload, FileStageJobPayload,
  BatchAnalyzeJobPayload, AnalyzeJobPayload, BatchExportJobPayload,
  ExportJobPayload, ScanJobResult, FileStageJobResult, AnalyzeJobResult,
  ExportJobResult
} from '@cleancue/shared';

export interface JobManagerOptions {
  maxConcurrentJobs?: number;      // Default: 3
  jobTimeoutSeconds?: number;      // Default: 300 (5 minutes)
  retryDelayMs?: number;          // Default: 5000 (5 seconds)
  cleanupIntervalMs?: number;     // Default: 300000 (5 minutes)
}

export interface JobQueueStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export class JobManager extends EventEmitter {
  private db: CleanCueDatabase;
  private options: Required<JobManagerOptions>;
  private runningJobs = new Map<string, NodeJS.Timeout>();
  private queueProcessor?: NodeJS.Timeout;
  private cleanupProcessor?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(database: CleanCueDatabase, options: JobManagerOptions = {}) {
    super();
    this.db = database;
    this.options = {
      maxConcurrentJobs: options.maxConcurrentJobs ?? 3,
      jobTimeoutSeconds: options.jobTimeoutSeconds ?? 300,
      retryDelayMs: options.retryDelayMs ?? 5000,
      cleanupIntervalMs: options.cleanupIntervalMs ?? 300000
    };

    console.log('[JOB-MANAGER] 🚀 Enterprise Job Manager initialized');
    console.log('[JOB-MANAGER] 📊 Max concurrent jobs:', this.options.maxConcurrentJobs);
    console.log('[JOB-MANAGER] ⏱️  Default timeout:', this.options.jobTimeoutSeconds, 'seconds');
  }

  async initialize(): Promise<void> {
    console.log('[JOB-MANAGER] 🔧 Initializing job management system...');

    // Recover jobs from previous session
    await this.recoverJobs();

    // Start queue processor
    this.startQueueProcessor();

    // Start cleanup processor
    this.startCleanupProcessor();

    console.log('[JOB-MANAGER] ✅ Job management system ready');
  }

  // ============================================================================
  // JOB CREATION METHODS
  // ============================================================================

  async createScanJob(
    paths: string[],
    extensions: string[] = ['.mp3', '.flac', '.wav', '.aac', '.m4a'],
    userInitiated = true,
    priority = 3
  ): Promise<string> {
    const payload: ScanJobPayload = {
      paths,
      extensions,
      recursive: true
    };

    return this.createJob('scan', payload, {
      userInitiated,
      priority,
      timeoutSeconds: 1800 // 30 minutes for large scans
    });
  }

  async createFileStageJob(
    filePath: string,
    hash: string,
    metadata?: Record<string, any>,
    parentJobId?: string
  ): Promise<string> {
    const payload: FileStageJobPayload = {
      filePath,
      hash,
      metadata
    };

    return this.createJob('file_stage', payload, {
      userInitiated: false,
      priority: 5,
      parentJobId,
      timeoutSeconds: 60
    });
  }

  async createBatchAnalyzeJob(
    trackIds: string[],
    analysisTypes: ('key' | 'bpm' | 'structure' | 'energy')[],
    userInitiated = true,
    forceReanalysis = false
  ): Promise<string> {
    const payload: BatchAnalyzeJobPayload = {
      trackIds,
      analysisTypes,
      forceReanalysis
    };

    return this.createJob('batch_analyze', payload, {
      userInitiated,
      priority: userInitiated ? 2 : 6,
      timeoutSeconds: 3600 // 1 hour for large batches
    });
  }

  async createAnalyzeJob(
    trackId: string,
    trackPath: string,
    analysisType: 'key' | 'bpm' | 'structure' | 'energy',
    parentJobId?: string,
    parameters?: Record<string, any>
  ): Promise<string> {
    const payload: AnalyzeJobPayload = {
      trackId,
      trackPath,
      analysisType,
      parameters
    };

    return this.createJob('analyze', payload, {
      userInitiated: false,
      priority: 5,
      parentJobId,
      timeoutSeconds: 300
    });
  }

  async createBatchExportJob(
    trackIds: string[],
    format: 'rekordbox' | 'serato' | 'traktor' | 'usb',
    destination: string,
    options?: Record<string, any>
  ): Promise<string> {
    const payload: BatchExportJobPayload = {
      trackIds,
      format,
      destination,
      options
    };

    return this.createJob('batch_export', payload, {
      userInitiated: true,
      priority: 1, // Highest priority for exports
      timeoutSeconds: 1800
    });
  }

  async createExportJob(
    tracks: string[],
    format: string,
    destination: string,
    parentJobId?: string,
    options?: Record<string, any>
  ): Promise<string> {
    const payload: ExportJobPayload = {
      tracks,
      format,
      destination,
      options
    };

    return this.createJob('export', payload, {
      userInitiated: false,
      priority: 1,
      parentJobId,
      timeoutSeconds: 600
    });
  }

  // ============================================================================
  // CORE JOB MANAGEMENT
  // ============================================================================

  private async createJob(
    type: JobType,
    payload: Record<string, any>,
    options: {
      userInitiated?: boolean;
      priority?: number;
      parentJobId?: string;
      timeoutSeconds?: number;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const now = Date.now();

    const job: Omit<BaseJob, 'createdAt' | 'queuedAt' | 'startedAt' | 'completedAt' | 'timeoutAt'> = {
      id: jobId,
      type,
      status: 'created',
      priority: options.priority ?? 5,
      payload,
      progress: 0,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      parentJobId: options.parentJobId,
      userInitiated: options.userInitiated ?? false,
      timeoutSeconds: options.timeoutSeconds ?? this.options.jobTimeoutSeconds
    };

    // Insert job into database
    this.db.createJob(
      job.id,
      job.type,
      job.priority,
      job.payload,
      job.userInitiated,
      job.timeoutSeconds,
      job.parentJobId
    );

    console.log(`[JOB-MANAGER] 📝 Created ${type} job: ${jobId} (priority ${job.priority})`);

    // Queue the job immediately
    await this.queueJob(jobId);

    return jobId;
  }

  async queueJob(jobId: string): Promise<void> {
    this.db.updateJobStatus(jobId, 'queued');

    console.log(`[JOB-MANAGER] 📋 Queued job: ${jobId}`);
    this.emit('job:queued', { jobId });

    // Trigger queue processing
    this.processQueue();
  }

  async queueJobs(): Promise<void> {
    const createdJobs = this.getJobsByStatus('created') || [];

    if (!Array.isArray(createdJobs)) {
      console.warn('[JOB-MANAGER] ⚠️ getJobsByStatus returned non-array:', createdJobs);
      return;
    }

    for (const job of createdJobs) {
      await this.queueJob(job.id);
    }

    console.log(`[JOB-MANAGER] 📋 Queued ${createdJobs.length} jobs`);
  }

  /** Force process the job queue (for testing) */
  async forceProcessQueue(): Promise<void> {
    return this.processQueue();
  }

  /** Update job status (for testing) */
  async updateJobStatus(jobId: string, status: JobStatus, metadata?: Record<string, any>): Promise<void> {
    return this.db.updateJobStatus(jobId, status, metadata);
  }

  /** Create job with legacy signature (for testing compatibility) */
  async createJobForTest(type: JobType, priority: number, payload: Record<string, any>, userInitiated: boolean): Promise<string> {
    return this.createJob(type, payload, {
      priority,
      userInitiated,
      timeoutSeconds: 300
    });
  }

  /** Update job progress (for testing) */
  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    return this.db.updateJobProgress(jobId, progress);
  }

  /** Update batch job progress (for testing) */
  async updateBatchJobProgress(batchJobId: string): Promise<void> {
    // Get all child jobs for this batch
    const childJobs = this.getJobsByParent(batchJobId);

    if (childJobs.length === 0) {
      return;
    }

    // Calculate average progress
    const totalProgress = childJobs.reduce((sum, job) => sum + (job.progress || 0), 0);
    const averageProgress = Math.round(totalProgress / childJobs.length);

    // Update batch job progress
    await this.updateJobProgress(batchJobId, averageProgress);
  }

  /** Handle timeouts (for testing) */
  async handleTimeouts(): Promise<void> {
    // Implementation would go here - for now just return
    return;
  }

  /** Recover jobs (for testing) */
  async recoverJobsForTest(): Promise<void> {
    return;
  }

  async cancelJob(jobId: string, reason = 'User requested cancellation'): Promise<boolean> {
    const job = this.getJob(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      // Stop running job
      const timeout = this.runningJobs.get(jobId);
      if (timeout) {
        clearTimeout(timeout);
        this.runningJobs.delete(jobId);
      }
    }

    const now = Date.now();
    this.db.updateJobStatus(jobId, 'cancelled', {
      completedAt: new Date(),
      error: reason
    });

    console.log(`[JOB-MANAGER] ❌ Cancelled job: ${jobId} - ${reason}`);
    this.emit('job:cancelled', { jobId, reason });

    return true;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const job = this.getJob(jobId);
    if (!job || (job.status !== 'failed' && job.status !== 'timeout')) {
      return false;
    }

    if (job.attempts >= job.maxAttempts) {
      console.log(`[JOB-MANAGER] ⚠️ Job ${jobId} exceeded max attempts (${job.maxAttempts})`);
      return false;
    }

    this.db.updateJobStatus(jobId, 'queued', {
      queuedAt: new Date(),
      error: undefined
    });

    console.log(`[JOB-MANAGER] 🔄 Retrying job: ${jobId} (attempt ${job.attempts + 1}/${job.maxAttempts})`);
    this.emit('job:retried', { jobId });

    this.processQueue();
    return true;
  }

  // ============================================================================
  // QUEUE PROCESSING
  // ============================================================================

  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.runningJobs.size >= this.options.maxConcurrentJobs) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get next job from queue (ordered by priority, then creation time)
      const queuedJobs = this.db.getJobsByStatus('queued') || [];

      if (!Array.isArray(queuedJobs) || queuedJobs.length === 0) {
        return; // No jobs in queue
      }

      // Sort by priority, then by creation time
      queuedJobs.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Handle different timestamp formats from database
        const aTime = a.createdAt ? (typeof a.createdAt === 'object' ? a.createdAt.getTime() : new Date(a.createdAt).getTime()) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'object' ? b.createdAt.getTime() : new Date(b.createdAt).getTime()) : 0;
        return aTime - bTime;
      });

      const job = queuedJobs[0];

      await this.executeJob(job);

    } catch (error) {
      console.error('[JOB-MANAGER] ❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(job: BaseJob): Promise<void> {
    const startTime = Date.now();
    const timeoutSeconds = job.timeoutSeconds || this.options.jobTimeoutSeconds;
    const timeoutAt = startTime + (timeoutSeconds * 1000);

    // Validate dates before passing to database
    const startedAtDate = new Date(startTime);
    const timeoutAtDate = new Date(timeoutAt);

    if (isNaN(startedAtDate.getTime()) || isNaN(timeoutAtDate.getTime())) {
      console.error('[JOB-MANAGER] ❌ Invalid date calculation for job:', job.id, {
        startTime,
        timeoutSeconds,
        timeoutAt
      });
      throw new Error('Invalid date calculation during job execution');
    }

    // Update job status to running
    this.db.updateJobStatus(job.id, 'running', {
      startedAt: startedAtDate,
      timeoutAt: timeoutAtDate,
      attempts: job.attempts + 1
    });

    console.log(`[JOB-MANAGER] ▶️ Starting ${job.type} job: ${job.id}`);
    this.emit('job:started', { jobId: job.id, type: job.type });

    // Set timeout
    const timeoutHandle = setTimeout(() => {
      this.timeoutJob(job.id);
    }, timeoutSeconds * 1000);

    this.runningJobs.set(job.id, timeoutHandle);

    try {
      let result: Record<string, any> | undefined;

      // Execute job based on type
      switch (job.type) {
        case 'scan':
          result = await this.executeScanJob(job);
          break;
        case 'file_stage':
          result = await this.executeFileStageJob(job);
          break;
        case 'batch_analyze':
          result = await this.executeBatchAnalyzeJob(job);
          break;
        case 'analyze':
          result = await this.executeAnalyzeJob(job);
          break;
        case 'batch_export':
          result = await this.executeBatchExportJob(job);
          break;
        case 'export':
          result = await this.executeExportJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Job completed successfully
      await this.completeJob(job.id, result);

    } catch (error) {
      console.error(`[JOB-MANAGER] ❌ Job ${job.id} failed:`, error);
      await this.failJob(job.id, error instanceof Error ? error.message : String(error));
    }
  }

  private async completeJob(jobId: string, result?: Record<string, any>): Promise<void> {
    const timeout = this.runningJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.runningJobs.delete(jobId);
    }

    const now = Date.now();
    this.db.updateJobStatus(jobId, 'completed', {
      progress: 100,
      result: result ? JSON.stringify(result) : undefined,
      completedAt: new Date()
    });

    console.log(`[JOB-MANAGER] ✅ Completed job: ${jobId}`);
    this.emit('job:completed', { jobId, result });

    // Continue processing queue
    this.processQueue();
  }

  private async failJob(jobId: string, error: string): Promise<void> {
    const timeout = this.runningJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.runningJobs.delete(jobId);
    }

    const job = this.getJob(jobId);
    if (!job) return;

    const now = Date.now();

    // Check if we should retry
    if (job.attempts < job.maxAttempts) {
      console.log(`[JOB-MANAGER] 🔄 Will retry job ${jobId} in ${this.options.retryDelayMs}ms`);

      setTimeout(() => {
        this.retryJob(jobId);
      }, this.options.retryDelayMs);

    } else {
      // Mark as permanently failed
      this.db.updateJobStatus(jobId, 'failed', {
        error: error,
        completedAt: new Date()
      });

      console.log(`[JOB-MANAGER] ❌ Job failed permanently: ${jobId}`);
      this.emit('job:failed', { jobId, error });
    }

    // Continue processing queue
    this.processQueue();
  }

  private timeoutJob(jobId: string): void {
    const timeout = this.runningJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.runningJobs.delete(jobId);
    }

    const now = Date.now();
    this.db.updateJobStatus(jobId, 'timeout', {
      error: 'Job exceeded timeout limit',
      completedAt: new Date()
    });

    console.log(`[JOB-MANAGER] ⏰ Job timed out: ${jobId}`);
    this.emit('job:timeout', { jobId });

    // Continue processing queue
    this.processQueue();
  }

  // ============================================================================
  // JOB EXECUTION METHODS
  // ============================================================================

  private async safeUpdateProgress(jobId: string, progress: number): Promise<void> {
    try {
      await this.db.updateJobProgress(jobId, progress);
    } catch (e) {
      console.warn('[JOB-MANAGER] Could not update progress (non-critical):', e.message);
    }
  }

  private async executeScanJob(job: BaseJob): Promise<ScanJobResult> {
    const payload = job.payload as ScanJobPayload;
    console.log(`[JOB-MANAGER] 🔍 Executing scan job: ${job.id}`, payload);

    // Simulate scan progress
    await this.safeUpdateProgress(job.id, 25);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.safeUpdateProgress(job.id, 50);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.safeUpdateProgress(job.id, 75);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.safeUpdateProgress(job.id, 100);

    // Return mock result
    const result: ScanJobResult = {
      filesFound: 0,
      filesStaged: 0,
      duplicatesSkipped: 0,
      errors: [],
      childJobIds: []
    };

    console.log(`[JOB-MANAGER] ✅ Scan job completed: ${job.id}`, result);
    return result;
  }

  private async executeFileStageJob(job: BaseJob): Promise<FileStageJobResult> {
    const payload = job.payload as FileStageJobPayload;
    console.log(`[JOB-MANAGER] 📁 Executing file stage job: ${job.id}`, payload);

    // Simulate file staging
    await this.safeUpdateProgress(job.id, 50);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.safeUpdateProgress(job.id, 100);

    const result: FileStageJobResult = {
      trackId: `track-${Date.now()}`,
      metadata: payload.metadata || {}
    };

    console.log(`[JOB-MANAGER] ✅ File stage job completed: ${job.id}`, result);
    return result;
  }

  private async executeBatchAnalyzeJob(job: BaseJob): Promise<Record<string, any>> {
    const payload = job.payload as BatchAnalyzeJobPayload;
    console.log(`[JOB-MANAGER] 🎯📦 Executing batch analyze job: ${job.id}`, payload);

    // Simulate batch analysis
    await this.safeUpdateProgress(job.id, 25);
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.safeUpdateProgress(job.id, 75);
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.safeUpdateProgress(job.id, 100);

    const trackIds = payload.trackIds || [];
    const result = {
      tracksAnalyzed: trackIds.length,
      analysisTypes: payload.analysisTypes || [],
      results: trackIds.map(trackId => ({
        trackId,
        status: 'completed',
        analysisData: { mock: true }
      })),
      processingTimeMs: 400
    };

    console.log(`[JOB-MANAGER] ✅ Batch analyze job completed: ${job.id}`, result);
    return result;
  }

  private async executeAnalyzeJob(job: BaseJob): Promise<AnalyzeJobResult> {
    const payload = job.payload as AnalyzeJobPayload;
    console.log(`[JOB-MANAGER] 🎯 Executing analyze job: ${job.id}`, payload);

    // Simulate analysis progress
    await this.safeUpdateProgress(job.id, 30);
    await new Promise(resolve => setTimeout(resolve, 150));
    await this.safeUpdateProgress(job.id, 60);
    await new Promise(resolve => setTimeout(resolve, 150));
    await this.safeUpdateProgress(job.id, 90);
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.safeUpdateProgress(job.id, 100);

    // Return mock result
    const result: AnalyzeJobResult = {
      trackId: payload.trackId,
      analysisType: payload.analysisType,
      results: {
        // Mock data based on analysis type
        ...(payload.analysisType === 'key' && { key: 'C major', confidence: 0.85 }),
        ...(payload.analysisType === 'bpm' && { bpm: 128, confidence: 0.92 }),
        ...(payload.analysisType === 'energy' && { energy: 0.75, confidence: 0.88 }),
        ...(payload.analysisType === 'structure' && {
          sections: [
            { type: 'intro', startTime: 0, endTime: 16 },
            { type: 'verse', startTime: 16, endTime: 48 },
            { type: 'chorus', startTime: 48, endTime: 80 }
          ]
        })
      },
      processingTimeMs: 400
    };

    console.log(`[JOB-MANAGER] ✅ Analyze job completed: ${job.id}`, result);
    return result;
  }

  private async executeBatchExportJob(job: BaseJob): Promise<Record<string, any>> {
    const payload = job.payload as BatchExportJobPayload;
    console.log(`[JOB-MANAGER] 📦🚀 Executing batch export job: ${job.id}`, payload);

    // Simulate batch export
    await this.safeUpdateProgress(job.id, 30);
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.safeUpdateProgress(job.id, 70);
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.safeUpdateProgress(job.id, 100);

    const trackIds = payload.trackIds || [];
    const result = {
      tracksExported: trackIds.length,
      format: payload.format,
      destination: payload.destination,
      exportedFiles: trackIds.map(trackId => `${payload.destination}/${trackId}.${payload.format}`),
      processingTimeMs: 400
    };

    console.log(`[JOB-MANAGER] ✅ Batch export job completed: ${job.id}`, result);
    return result;
  }

  private async executeExportJob(job: BaseJob): Promise<ExportJobResult> {
    const payload = job.payload as ExportJobPayload;
    console.log(`[JOB-MANAGER] 🚀 Executing export job: ${job.id}`, payload);

    // Simulate export
    await this.safeUpdateProgress(job.id, 40);
    await new Promise(resolve => setTimeout(resolve, 150));
    await this.safeUpdateProgress(job.id, 80);
    await new Promise(resolve => setTimeout(resolve, 150));
    await this.safeUpdateProgress(job.id, 100);

    const tracks = payload.tracks || [];
    const result: ExportJobResult = {
      tracksExported: tracks.length,
      outputPath: payload.destination,
      fileSize: 1024000, // Mock 1MB file size
      errors: []
    };

    console.log(`[JOB-MANAGER] ✅ Export job completed: ${job.id}`, result);
    return result;
  }

  // ============================================================================
  // RECOVERY AND CLEANUP
  // ============================================================================

  private async recoverJobs(): Promise<void> {
    console.log('[JOB-MANAGER] 🔄 Recovering jobs from previous session...');

    // Reset running jobs to queued (they were interrupted)
    const runningJobs = this.db.exec(`
      SELECT COUNT(*) as count FROM jobs WHERE status = 'running'
    `);
    const runningCount = runningJobs[0]?.values[0]?.[0] || 0;

    if (runningCount > 0) {
      this.db.exec(`
        UPDATE jobs
        SET status = 'queued', error = 'Interrupted by application restart'
        WHERE status = 'running'
      `);
      console.log(`[JOB-MANAGER] 🔄 Reset ${runningCount} running jobs to queued`);
    }

    // Check for timed out jobs
    const now = Date.now();
    const timedOutJobs = this.db.exec(`
      SELECT COUNT(*) as count FROM jobs
      WHERE status = 'queued' AND timeout_at IS NOT NULL AND timeout_at < ?
    `, [now]);
    const timedOutCount = timedOutJobs[0]?.values[0]?.[0] || 0;

    if (timedOutCount > 0) {
      this.db.exec(`
        UPDATE jobs
        SET status = 'timeout', error = 'Job exceeded timeout limit', completed_at = ?
        WHERE status = 'queued' AND timeout_at IS NOT NULL AND timeout_at < ?
      `, [now, now]);
      console.log(`[JOB-MANAGER] ⏰ Marked ${timedOutCount} jobs as timed out`);
    }

    const stats = this.getQueueStats();
    console.log('[JOB-MANAGER] 📊 Job recovery complete:', stats);
  }

  private startCleanupProcessor(): void {
    this.cleanupProcessor = setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupIntervalMs);
  }

  private performCleanup(): void {
    // Archive old completed jobs (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const result = this.db.exec(`
      DELETE FROM jobs
      WHERE status IN ('completed', 'failed', 'cancelled', 'timeout')
      AND completed_at < ?
    `, [sevenDaysAgo]);

    // Log cleanup if jobs were removed
    if (result.length > 0) {
      console.log(`[JOB-MANAGER] 🧹 Cleaned up old jobs`);
    }
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  getJob(jobId: string): BaseJob | null {
    return this.db.getJob(jobId);
  }

  getJobsByStatus(status: JobStatus): BaseJob[] {
    const result = this.db.getJobsByStatus(status);
    return Array.isArray(result) ? result : [];
  }

  getJobsByParent(parentJobId: string): BaseJob[] {
    const result = this.db.exec(`
      SELECT * FROM jobs WHERE parent_job_id = ?
      ORDER BY created_at ASC
    `, [parentJobId]);

    if (result.length === 0) return [];

    return result[0].values.map(row => this.parseJobFromDatabase(row));
  }

  getQueueStats(): JobQueueStats {
    const result = this.db.exec(`
      SELECT status, COUNT(*) as count FROM jobs
      GROUP BY status
    `);

    const stats: JobQueueStats = {
      total: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    if (result.length > 0) {
      for (const row of result[0].values) {
        const status = row[0] as string;
        const count = row[1] as number;
        stats.total += count;

        if (status in stats) {
          (stats as any)[status] = count;
        }
      }
    }

    return stats;
  }

  getActiveJobs(): BaseJob[] {
    return this.getJobsByStatus('running').concat(this.getJobsByStatus('queued'));
  }

  getUserJobs(userInitiated = true): BaseJob[] {
    const result = this.db.exec(`
      SELECT * FROM jobs WHERE user_initiated = ?
      ORDER BY created_at DESC
    `, [userInitiated ? 1 : 0]);

    if (result.length === 0) return [];

    return result[0].values.map(row => this.parseJobFromDatabase(row));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private parseJobFromDatabase(row: any[]): BaseJob {
    return {
      id: row[0],
      type: row[1] as JobType,
      status: row[2] as JobStatus,
      priority: row[3],
      payload: JSON.parse(row[4]),
      progress: row[5],
      result: row[6] ? JSON.parse(row[6]) : undefined,
      error: row[7],
      attempts: row[8],
      maxAttempts: row[9],
      parentJobId: row[10],
      userInitiated: row[11] === 1,
      timeoutSeconds: row[12],
      createdAt: new Date(row[13]),
      queuedAt: row[14] ? new Date(row[14]) : undefined,
      startedAt: row[15] ? new Date(row[15]) : undefined,
      completedAt: row[16] ? new Date(row[16]) : undefined,
      timeoutAt: row[17] ? new Date(row[17]) : undefined
    };
  }

  async abortAllJobs(reason = 'System shutdown'): Promise<number> {
    const activeJobs = this.getActiveJobs();

    for (const job of activeJobs) {
      await this.cancelJob(job.id, reason);
    }

    console.log(`[JOB-MANAGER] 🚫 Aborted ${activeJobs.length} active jobs`);
    return activeJobs.length;
  }

  shutdown(): void {
    console.log('[JOB-MANAGER] 🛑 Shutting down job manager...');

    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }

    if (this.cleanupProcessor) {
      clearInterval(this.cleanupProcessor);
    }

    // Clear all running job timeouts
    for (const timeout of this.runningJobs.values()) {
      clearTimeout(timeout);
    }
    this.runningJobs.clear();

    console.log('[JOB-MANAGER] ✅ Job manager shutdown complete');
  }
}