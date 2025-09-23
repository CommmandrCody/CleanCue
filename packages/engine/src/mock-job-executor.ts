/**
 * Mock Job Execution System for Testing
 *
 * This module provides a comprehensive mock system for testing job execution
 * without requiring actual Python workers or file system operations.
 */

import { JobType, BaseJob, ScanJobPayload, AnalyzeJobPayload, ExportJobPayload } from '@cleancue/shared'
import { EventEmitter } from 'events'

export interface MockJobResult {
  success: boolean
  result?: any
  error?: string
  duration?: number
}

export interface MockExecutionOptions {
  // Timing control
  minDuration?: number
  maxDuration?: number

  // Failure simulation
  failureRate?: number  // 0.0 to 1.0
  specificFailures?: Set<string> // Specific job IDs to fail

  // Progress simulation
  enableProgressUpdates?: boolean
  progressUpdateInterval?: number

  // Resource simulation
  simulateMemoryUsage?: boolean
  simulateFileOperations?: boolean

  // Concurrency limits
  maxConcurrentJobs?: number
}

export class MockJobExecutor extends EventEmitter {
  private runningJobs = new Map<string, Promise<MockJobResult>>()
  private executionOptions: MockExecutionOptions
  private jobResults = new Map<string, MockJobResult>()
  private cancelledJobs = new Set<string>()

  constructor(options: MockExecutionOptions = {}) {
    super()
    this.executionOptions = {
      minDuration: 10,
      maxDuration: 100,
      failureRate: 0.05, // 5% failure rate by default
      enableProgressUpdates: true,
      progressUpdateInterval: 25,
      maxConcurrentJobs: 10,
      ...options
    }
  }

  /**
   * Execute a mock scan job
   */
  async executeScanJob(job: BaseJob): Promise<MockJobResult> {
    const payload = job.payload as ScanJobPayload

    if (this.cancelledJobs.has(job.id)) {
      return { success: false, error: 'Job was cancelled' }
    }

    if (this.shouldFail(job.id)) {
      return {
        success: false,
        error: this.generateScanError(payload),
        duration: this.getRandomDuration()
      }
    }

    const result = await this.simulateJobExecution(job, async () => {
      // Simulate scanning files
      const tracksFound = this.simulateTrackDiscovery(payload.paths)
      const tracksAdded = Math.floor(tracksFound * 0.8) // 80% are new
      const tracksUpdated = tracksFound - tracksAdded

      return {
        success: true,
        tracksFound,
        tracksAdded,
        tracksUpdated,
        paths: payload.paths,
        extensions: payload.extensions,
        errors: this.generateMinorErrors(payload.paths)
      }
    })

    return result
  }

  /**
   * Execute a mock analysis job
   */
  async executeAnalysisJob(job: BaseJob): Promise<MockJobResult> {
    const payload = job.payload as AnalyzeJobPayload

    if (this.cancelledJobs.has(job.id)) {
      return { success: false, error: 'Job was cancelled' }
    }

    if (this.shouldFail(job.id)) {
      return {
        success: false,
        error: this.generateAnalysisError(payload),
        duration: this.getRandomDuration()
      }
    }

    const result = await this.simulateJobExecution(job, async () => {
      // Simulate audio analysis
      const analysisResults = this.generateAnalysisResults(payload)

      return {
        success: true,
        trackId: payload.trackId,
        analysisType: payload.analysisType,
        results: analysisResults
      }
    })

    return result
  }

  /**
   * Execute a mock export job
   */
  async executeExportJob(job: BaseJob): Promise<MockJobResult> {
    const payload = job.payload as ExportJobPayload

    if (this.cancelledJobs.has(job.id)) {
      return { success: false, error: 'Job was cancelled' }
    }

    if (this.shouldFail(job.id)) {
      return {
        success: false,
        error: this.generateExportError(payload),
        duration: this.getRandomDuration()
      }
    }

    const result = await this.simulateJobExecution(job, async () => {
      // Simulate file export
      const exportPath = this.generateExportPath(payload)
      const exportedFiles = payload.tracks?.length || 0

      return {
        success: true,
        path: exportPath,
        exportedFiles,
        format: payload.format || 'mp3',
        totalSize: exportedFiles * this.getRandomFileSize()
      }
    })

    return result
  }

  /**
   * Execute a mock batch job
   */
  async executeBatchJob(job: BaseJob): Promise<MockJobResult> {
    if (this.cancelledJobs.has(job.id)) {
      return { success: false, error: 'Job was cancelled' }
    }

    // Batch jobs coordinate child jobs
    const result = await this.simulateJobExecution(job, async () => {
      return {
        success: true,
        childJobsCreated: this.getRandomNumber(5, 50),
        estimatedCompletion: Date.now() + this.getRandomNumber(60000, 300000)
      }
    })

    return result
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): void {
    this.cancelledJobs.add(jobId)
    this.emit('job-cancelled', jobId)
  }

  /**
   * Get currently running jobs
   */
  getRunningJobs(): string[] {
    return Array.from(this.runningJobs.keys())
  }

  /**
   * Get job execution result
   */
  getJobResult(jobId: string): MockJobResult | undefined {
    return this.jobResults.get(jobId)
  }

  /**
   * Clear all cached results and state
   */
  reset(): void {
    this.runningJobs.clear()
    this.jobResults.clear()
    this.cancelledJobs.clear()
  }

  /**
   * Configure execution options
   */
  updateOptions(options: Partial<MockExecutionOptions>): void {
    this.executionOptions = { ...this.executionOptions, ...options }
  }

  // Private helper methods

  private async simulateJobExecution(job: BaseJob, executor: () => Promise<any>): Promise<MockJobResult> {
    const startTime = Date.now()

    // Check concurrency limits
    if (this.runningJobs.size >= (this.executionOptions.maxConcurrentJobs || 10)) {
      return {
        success: false,
        error: 'Maximum concurrent jobs exceeded',
        duration: 0
      }
    }

    const executionPromise = this.runJobWithProgress(job, executor)
    this.runningJobs.set(job.id, executionPromise)

    try {
      const result = await executionPromise
      const duration = Date.now() - startTime

      const finalResult = { ...result, duration }
      this.jobResults.set(job.id, finalResult)

      this.emit('job-completed', job.id, finalResult)
      return finalResult
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }

      this.jobResults.set(job.id, errorResult)
      this.emit('job-failed', job.id, errorResult)
      return errorResult
    } finally {
      this.runningJobs.delete(job.id)
    }
  }

  private async runJobWithProgress(job: BaseJob, executor: () => Promise<any>): Promise<MockJobResult> {
    const duration = this.getRandomDuration()
    const progressSteps = this.executionOptions.enableProgressUpdates ?
      Math.floor(duration / (this.executionOptions.progressUpdateInterval || 25)) : 0

    // Emit job started
    this.emit('job-started', job.id)

    if (progressSteps > 0) {
      // Simulate progress updates
      for (let step = 1; step <= progressSteps; step++) {
        await new Promise(resolve => setTimeout(resolve, this.executionOptions.progressUpdateInterval))

        if (this.cancelledJobs.has(job.id)) {
          throw new Error('Job cancelled')
        }

        const progress = Math.floor((step / progressSteps) * 90) // Leave 10% for completion
        this.emit('job-progress', job.id, progress)
      }
    } else {
      // Simple delay without progress
      await new Promise(resolve => setTimeout(resolve, duration))
    }

    if (this.cancelledJobs.has(job.id)) {
      throw new Error('Job cancelled')
    }

    // Execute the actual job logic
    const result = await executor()

    // Final progress update
    this.emit('job-progress', job.id, 100)

    return result
  }

  private shouldFail(jobId: string): boolean {
    if (this.executionOptions.specificFailures?.has(jobId)) {
      return true
    }

    return Math.random() < (this.executionOptions.failureRate || 0)
  }

  private getRandomDuration(): number {
    const min = this.executionOptions.minDuration || 10
    const max = this.executionOptions.maxDuration || 100
    return Math.floor(Math.random() * (max - min) + min)
  }

  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min)
  }

  private getRandomFileSize(): number {
    return this.getRandomNumber(3000000, 8000000) // 3-8MB files
  }

  private simulateTrackDiscovery(paths: string[]): number {
    // Simulate finding tracks based on path complexity
    let totalTracks = 0

    for (const path of paths) {
      const pathComplexity = path.split('/').length
      const baseTracks = this.getRandomNumber(5, 50)
      totalTracks += baseTracks * Math.min(pathComplexity, 5)
    }

    return totalTracks
  }

  private generateAnalysisResults(payload: AnalyzeJobPayload): any {
    const results: any = {}

    if (payload.analysisType === 'key') {
      const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
      const modes = ['m', 'M'] // minor, major
      results.key = keys[Math.floor(Math.random() * keys.length)] +
                   modes[Math.floor(Math.random() * modes.length)]
    }

    if (payload.analysisType === 'bpm') {
      results.bpm = this.getRandomNumber(60, 180)
    }

    if (payload.analysisType === 'structure') {
      const structures = [
        ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
        ['intro', 'verse', 'pre-chorus', 'chorus', 'verse', 'pre-chorus', 'chorus', 'outro'],
        ['intro', 'breakdown', 'buildup', 'drop', 'breakdown', 'buildup', 'drop', 'outro']
      ]
      results.structure = structures[Math.floor(Math.random() * structures.length)]
    }

    if (payload.analysisType === 'energy') {
      results.energy = Math.random()
    }

    return results
  }

  private generateExportPath(payload: ExportJobPayload): string {
    const timestamp = Date.now()
    const format = payload.format || 'mp3'
    return `/tmp/cleancue-exports/export-${timestamp}.${format === 'playlist' ? 'zip' : format}`
  }

  private generateScanError(payload: ScanJobPayload): string {
    const errors = [
      `Path does not exist: ${payload.paths[0]}`,
      'Permission denied accessing music directory',
      'Disk space insufficient for scanning',
      'Network drive disconnected during scan',
      'Corrupted file system detected'
    ]
    return errors[Math.floor(Math.random() * errors.length)]
  }

  private generateAnalysisError(payload: AnalyzeJobPayload): string {
    const errors = [
      'Audio file is corrupted or unreadable',
      'Unsupported audio format for analysis',
      'Audio file too short for meaningful analysis',
      'Analysis engine crashed during processing',
      'Insufficient memory for audio analysis'
    ]
    return errors[Math.floor(Math.random() * errors.length)]
  }

  private generateExportError(payload: ExportJobPayload): string {
    const errors = [
      'Destination directory does not exist',
      'Insufficient disk space for export',
      'Export format not supported',
      'Source audio files not found',
      'Export process interrupted by system'
    ]
    return errors[Math.floor(Math.random() * errors.length)]
  }

  private generateMinorErrors(paths: string[]): string[] {
    const possibleErrors = [
      'Skipped hidden file: .DS_Store',
      'Could not read metadata for corrupted file',
      'Duplicate file found and skipped',
      'Non-audio file ignored: readme.txt'
    ]

    const errorCount = Math.floor(Math.random() * 3) // 0-2 minor errors
    const errors = []

    for (let i = 0; i < errorCount; i++) {
      errors.push(possibleErrors[Math.floor(Math.random() * possibleErrors.length)])
    }

    return errors
  }
}

/**
 * Factory function to create a mock job executor with predefined scenarios
 */
export function createMockExecutor(scenario: 'success' | 'failures' | 'mixed' | 'slow'): MockJobExecutor {
  const scenarios = {
    success: {
      failureRate: 0,
      minDuration: 10,
      maxDuration: 50,
      enableProgressUpdates: true
    },
    failures: {
      failureRate: 0.3, // 30% failure rate
      minDuration: 5,
      maxDuration: 25,
      enableProgressUpdates: true
    },
    mixed: {
      failureRate: 0.1, // 10% failure rate
      minDuration: 20,
      maxDuration: 100,
      enableProgressUpdates: true,
      progressUpdateInterval: 50
    },
    slow: {
      failureRate: 0.05,
      minDuration: 500,
      maxDuration: 2000,
      enableProgressUpdates: true,
      progressUpdateInterval: 100
    }
  }

  return new MockJobExecutor(scenarios[scenario])
}

/**
 * Test utilities for creating specific job scenarios
 */
export class JobTestScenarios {
  static createLargeScanJob(): BaseJob {
    return {
      id: 'large-scan-job',
      type: 'scan',
      status: 'created',
      priority: 5,
      payload: {
        paths: ['/music/electronic', '/music/rock', '/music/jazz', '/music/classical'],
        extensions: ['mp3', 'wav', 'flac', 'm4a'],
        recursive: true
      },
      userInitiated: true,
      createdAt: new Date(),
      timeoutSeconds: 600,
      progress: 0,
      attempts: 0,
      maxAttempts: 3
    } as BaseJob
  }

  static createBatchAnalysisJob(trackCount: number): BaseJob {
    const trackIds = Array.from({ length: trackCount }, (_, i) => `track-${i}`)

    return {
      id: 'batch-analysis-job',
      type: 'batch_analyze',
      status: 'created',
      priority: 3,
      payload: {
        trackIds,
        analysisTypes: ['key', 'bpm', 'structure', 'energy']
      },
      userInitiated: true,
      createdAt: new Date(),
      timeoutSeconds:1800,
      progress: 0,
      attempts: 0,
      maxAttempts:3
    } as BaseJob
  }

  static createFailingJob(): BaseJob {
    return {
      id: 'failing-job',
      type: 'analyze',
      status: 'created',
      priority: 5,
      payload: {
        trackId: 'corrupted-track',
        trackPath: '/corrupted/track.mp3',
        analysisType: 'key'
      },
      userInitiated: true,
      createdAt: new Date(),
      timeoutSeconds:300,
      progress: 0,
      attempts: 0,
      maxAttempts:3
    } as BaseJob
  }

  static createHighPriorityExport(): BaseJob {
    return {
      id: 'urgent-export',
      type: 'batch_export',
      status: 'created',
      priority: 1,
      payload: {
        trackIds: ['track-1', 'track-2', 'track-3'],
        format: 'rekordbox',
        destination: '/exports/urgent',
        options: { quality: 'lossless' }
      },
      userInitiated: true,
      createdAt: new Date(),
      timeoutSeconds:900,
      progress: 0,
      attempts: 0,
      maxAttempts:1
    } as BaseJob
  }
}