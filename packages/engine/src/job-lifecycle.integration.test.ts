import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JobManager } from './job-manager'
import { CleanCueDatabase as Database } from './database'
import { CleanCueEngine as Engine } from './engine'
import { JobType, JobStatus } from '@cleancue/shared'
import fs from 'fs/promises'
import path from 'path'

describe('Job Lifecycle Integration Tests', () => {
  let engine: Engine
  let tempDbPath: string

  beforeEach(async () => {
    // Create temporary database for integration testing
    tempDbPath = path.join(__dirname, `test-db-${Date.now()}.db`)

    // Mock worker pool to avoid actual Python execution
    const mockWorkerPool = {
      submitJob: vi.fn().mockResolvedValue({ success: true }),
      killAllJobs: vi.fn(),
      stopAllJobs: vi.fn(),
      getActiveJobs: vi.fn().mockReturnValue([])
    }

    // Create engine with test database
    engine = new Engine()

    await engine.initialize()
  })

  afterEach(async () => {
    await engine.close()
    try {
      await fs.unlink(tempDbPath)
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Complete Scan Job Workflow', () => {
    it('should execute a complete scan job lifecycle', async () => {
      // Create scan job
      const jobId = await engine.createScanJob(['/test/music'], ['mp3', 'wav'], true)
      expect(jobId).toBeDefined()

      // Verify job is created and auto-queued
      let job = await engine.getJobById(jobId)
      expect(job).toBeDefined()
      expect(job!.type).toBe('scan')
      expect(['created', 'queued']).toContain(job!.status) // Auto-queuing may happen immediately
      expect(job!.user_initiated).toBe(1)

      // Wait for job to be processed automatically
      await new Promise(resolve => setTimeout(resolve, 100))

      // Job should now be in progress or completed
      job = await engine.getJobById(jobId)
      expect(['queued', 'running', 'completed']).toContain(job!.status)

      // Verify job completed successfully
      job = await engine.getJobById(jobId)
      expect(job!.status).toBe('completed')
      expect(job!.progress).toBe(100)

      const result = JSON.parse(job!.result!)
      expect(result.success).toBe(true)
      expect(result.tracksFound).toBe(15)
      expect(result.tracksAdded).toBe(12)
      expect(result.tracksUpdated).toBe(3)
    })

    it('should handle scan job failures gracefully', async () => {
      const jobId = await engine.createScanJob(['/invalid/path'], ['mp3'], true)

      // Mock scan failure
      vi.spyOn(engine.getJobManager() as any, 'executeScanJob').mockResolvedValue({
        success: false,
        error: 'Path does not exist: /invalid/path'
      })

      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      const job = await engine.getJobById(jobId)
      expect(job!.status).toBe('failed')
      expect(job!.error).toContain('Path does not exist')
    })
  })

  describe('Batch Analysis Job Workflow', () => {
    it('should create and execute batch analysis jobs', async () => {
      // First add some tracks to analyze
      const trackIds = ['track1', 'track2', 'track3']

      // Create batch analysis job
      const parentJobId = await engine.createAnalysisJobs(trackIds, ['key', 'bpm'], true)

      // Verify parent job created
      const parentJob = await engine.getJobById(parentJobId)
      expect(parentJob!.type).toBe('batch_analyze')
      expect(['created', 'queued']).toContain(parentJob!.status) // Auto-queuing may happen immediately

      // Verify child jobs created
      const childJobs = await engine.getAllJobs()
      const analyzeJobs = childJobs.filter(job => job.type === 'analyze' && job.parent_job_id === parentJobId)
      expect(analyzeJobs).toHaveLength(3)

      // Mock successful analysis for each track
      vi.spyOn(engine.getJobManager() as any, 'executeAnalyzeJob').mockResolvedValue({
        success: true,
        trackId: 'track1',
        results: { key: 'Am', bpm: 120, structure: ['intro', 'verse', 'chorus'] }
      })

      // Queue and process jobs
      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      // Check that all child jobs completed
      const updatedChildJobs = await engine.getAllJobs()
      const completedAnalyzeJobs = updatedChildJobs.filter(
        job => job.type === 'analyze' && job.parent_job_id === parentJobId && job.status === 'completed'
      )
      expect(completedAnalyzeJobs).toHaveLength(3)

      // Check that parent job completed
      const updatedParentJob = await engine.getJobById(parentJobId)
      expect(updatedParentJob!.status).toBe('completed')
      expect(updatedParentJob!.progress).toBe(100)
    })

    it('should handle partial batch analysis failures', async () => {
      const trackIds = ['track1', 'track2', 'track3']
      const parentJobId = await engine.createAnalysisJobs(trackIds, ['key'], true)

      // Mock mixed success/failure
      const mockExecute = vi.spyOn(engine.getJobManager() as any, 'executeAnalyzeJob')
      mockExecute
        .mockResolvedValueOnce({ success: true, trackId: 'track1', results: { key: 'Am' } })
        .mockResolvedValueOnce({ success: false, trackId: 'track2', error: 'Corrupted file' })
        .mockResolvedValueOnce({ success: true, trackId: 'track3', results: { key: 'Dm' } })

      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      // Parent should complete with partial success
      const parentJob = await engine.getJobById(parentJobId)
      expect(parentJob!.status).toBe('completed')

      // Check individual job statuses
      const childJobs = await engine.getAllJobs()
      const analyzeJobs = childJobs.filter(job => job.type === 'analyze' && job.parent_job_id === parentJobId)

      const completedJobs = analyzeJobs.filter(job => job.status === 'completed')
      const failedJobs = analyzeJobs.filter(job => job.status === 'failed')

      expect(completedJobs).toHaveLength(2)
      expect(failedJobs).toHaveLength(1)
      expect(failedJobs[0].error).toContain('Corrupted file')
    })
  })

  describe('Export Job Workflow', () => {
    it('should execute export job with high priority', async () => {
      const trackIds = ['track1', 'track2']
      const exportOptions = {
        format: 'mp3',
        quality: 320,
        destination: '/tmp/exports'
      }

      const jobId = await engine.exportTracks(trackIds, exportOptions)

      // Export jobs should have priority 1 (highest)
      const job = await engine.getJobById(jobId)
      expect(job!.priority).toBe(1)
      expect(job!.type).toBe('batch_export')

      // Mock successful export
      vi.spyOn(engine.getJobManager() as any, 'executeExportJob').mockResolvedValue({
        success: true,
        path: '/tmp/exports/export-123.zip',
        exportedFiles: 2
      })

      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      const completedJob = await engine.getJobById(jobId)
      expect(completedJob!.status).toBe('completed')

      const result = JSON.parse(completedJob!.result!)
      expect(result.success).toBe(true)
      expect(result.exportedFiles).toBe(2)
    })
  })

  describe('Job Recovery and Persistence', () => {
    it('should recover running jobs after restart', async () => {
      // Create and start a job
      const jobId = await engine.createScanJob(['/test'], ['mp3'], true)
      await engine.getJobManager().queueJobs()

      // Manually set job to running state (simulating crash during execution)
      await engine.getJobManager().updateJobStatus(jobId, 'running')

      // Simulate restart by creating new JobManager
      const newJobManager = new JobManager(engine.getDatabase(), { maxConcurrentJobs: 10 })
      await newJobManager.initialize() // This calls recoverJobs internally

      // Job should be reset to queued state
      const recoveredJob = await engine.getJobById(jobId)
      expect(recoveredJob!.status).toBe('queued')
    })

    it('should maintain job history across engine restarts', async () => {
      // Create multiple jobs
      const scanJobId = await engine.createScanJob(['/test'], ['mp3'], true)
      const analyzeJobId = await engine.createAnalysisJobs(['track1'], ['key'], true)

      // Complete the jobs
      await engine.getJobManager().queueJobs()

      // Mock job completions
      vi.spyOn(engine.getJobManager() as any, 'executeScanJob').mockResolvedValue({
        success: true,
        tracksFound: 5
      })
      vi.spyOn(engine.getJobManager() as any, 'executeAnalyzeJob').mockResolvedValue({
        success: true,
        trackId: 'track1',
        results: { key: 'Am' }
      })

      await engine.getJobManager().forceProcessQueue()

      // Restart engine
      await engine.close()
      const newEngine = new Engine()
      await newEngine.initialize()

      // Verify job history is preserved
      const allJobs = await newEngine.getAllJobs()
      expect(allJobs.length).toBeGreaterThanOrEqual(2)

      const scanJob = allJobs.find(job => job.id === scanJobId)
      const analyzeJob = allJobs.find(job => job.id === analyzeJobId)

      expect(scanJob).toBeDefined()
      expect(analyzeJob).toBeDefined()
      expect(scanJob!.status).toBe('completed')

      await newEngine.close()
    })
  })

  describe('Priority and Concurrency', () => {
    it('should process high priority jobs first', async () => {
      const executionOrder: string[] = []

      // Create jobs with different priorities
      const lowPriorityJob = await engine.createScanJob(['/low'], ['mp3'], false) // system job = priority 7
      const mediumPriorityJob = await engine.createAnalysisJobs(['track1'], ['key'], true) // user analysis = priority 3
      const highPriorityJob = await engine.exportTracks(['track1'], { format: 'mp3' }) // export = priority 1

      // Mock execution to track order
      const mockExecuteScan = vi.spyOn(engine.getJobManager() as any, 'executeScanJob')
        .mockImplementation(async () => {
          executionOrder.push('scan')
          return { success: true, tracksFound: 0 }
        })

      const mockExecuteAnalysis = vi.spyOn(engine.getJobManager() as any, 'executeAnalyzeJob')
        .mockImplementation(async () => {
          executionOrder.push('analysis')
          return { success: true, trackId: 'track1', results: { key: 'Am' } }
        })

      const mockExecuteExport = vi.spyOn(engine.getJobManager() as any, 'executeExportJob')
        .mockImplementation(async () => {
          executionOrder.push('export')
          return { success: true, path: '/tmp/export.zip' }
        })

      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      // Export (priority 1) should execute first, then analysis (priority 3), then scan (priority 7)
      expect(executionOrder[0]).toBe('export')
      expect(executionOrder[1]).toBe('analysis')
      expect(executionOrder[2]).toBe('scan')
    })
  })

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed jobs up to max attempts', async () => {
      const jobId = await engine.createAnalysisJobs(['track1'], ['key'], true)

      let attemptCount = 0
      vi.spyOn(engine.getJobManager() as any, 'executeAnalyzeJob').mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Temporary failure')
        }
        return { success: true, trackId: 'track1', results: { key: 'Am' } }
      })

      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      // Should succeed on third attempt
      const childJobs = await engine.getAllJobs()
      const analyzeJob = childJobs.find(job => job.type === 'analyze')
      expect(analyzeJob!.status).toBe('completed')
      expect(analyzeJob!.attempts).toBe(3)
    })

    it('should mark job as failed after max attempts exceeded', async () => {
      const jobId = await engine.createAnalysisJobs(['track1'], ['key'], true)

      vi.spyOn(engine.getJobManager() as any, 'executeAnalyzeJob').mockRejectedValue(
        new Error('Persistent failure')
      )

      await engine.getJobManager().queueJobs()

      // Process multiple times to exceed retry limit
      for (let i = 0; i < 5; i++) {
        await engine.getJobManager().forceProcessQueue()
      }

      const childJobs = await engine.getAllJobs()
      const analyzeJob = childJobs.find(job => job.type === 'analyze')
      expect(analyzeJob!.status).toBe('failed')
      expect(analyzeJob!.attempts).toBe(3) // max attempts
      expect(analyzeJob!.error).toContain('Persistent failure')
    })
  })

  describe('Real-time Progress Updates', () => {
    it('should update job progress during execution', async () => {
      const jobId = await engine.createScanJob(['/test'], ['mp3'], true)
      const progressUpdates: number[] = []

      // Listen for progress updates
      engine.getJobManager().on('job-progress', (event) => {
        if (event.jobId === jobId) {
          progressUpdates.push(event.progress)
        }
      })

      // Mock scan job with progress updates
      vi.spyOn(engine.getJobManager() as any, 'executeScanJob').mockImplementation(async () => {
        // Simulate progress updates
        await engine.getJobManager().updateJobProgress(jobId, 25)
        await engine.getJobManager().updateJobProgress(jobId, 50)
        await engine.getJobManager().updateJobProgress(jobId, 75)
        await engine.getJobManager().updateJobProgress(jobId, 100)

        return { success: true, tracksFound: 10 }
      })

      const jobManager = engine.getJobManager()
      await jobManager.queueJobs()
      await jobManager.forceProcessQueue()

      expect(progressUpdates).toEqual([25, 50, 75, 100])
    })
  })
})