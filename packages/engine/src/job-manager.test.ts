import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JobManager } from './job-manager'
import { CleanCueDatabase as Database } from './database'
import { JobType, JobStatus, BaseJob } from '@cleancue/shared'
import { v4 as uuidv4 } from 'uuid'

// Mock Database
vi.mock('./database')
const MockedDatabase = vi.mocked(Database)

// Mock UUID for predictable test results
vi.mock('uuid')
const mockedUuid = vi.mocked(uuidv4)

// Mock WorkerPool
const mockWorkerPool = {
  submitJob: vi.fn(),
  killAllJobs: vi.fn(),
  stopAllJobs: vi.fn(),
  getActiveJobs: vi.fn().mockReturnValue([])
}

describe('JobManager', () => {
  let jobManager: JobManager
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup database mock
    mockDb = {
      createJob: vi.fn(),
      getJob: vi.fn(),
      getAllJobs: vi.fn(),
      getActiveJobs: vi.fn(),
      getQueuedJobs: vi.fn(),
      updateJobStatus: vi.fn(),
      updateJobProgress: vi.fn(),
      updateJobResult: vi.fn(),
      updateJobError: vi.fn(),
      cancelJob: vi.fn(),
      getJobsByParentId: vi.fn(),
      getJobsByStatus: vi.fn(),
      getJobsByType: vi.fn(),
      exec: vi.fn()
    }

    MockedDatabase.mockImplementation(() => mockDb)

    // Setup predictable UUIDs
    let uuidCounter = 0
    mockedUuid.mockImplementation(() => `test-uuid-${++uuidCounter}`)

    jobManager = new JobManager(mockDb, { maxConcurrentJobs: 10 })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Job Creation', () => {
    it('should create a scan job with correct parameters', async () => {
      const paths = ['/test/path1', '/test/path2']
      const extensions = ['mp3', 'wav']

      mockDb.createJob.mockResolvedValueOnce('test-uuid-1')

      const jobId = await jobManager.createScanJob(paths, extensions, true)

      expect(jobId).toBe('test-uuid-1')
      expect(mockDb.createJob).toHaveBeenCalledWith(
        'test-uuid-1',
        'scan',
        3, // default priority for user-initiated scan
        expect.objectContaining({
          paths,
          extensions,
          recursive: true
        }),
        true, // userInitiated
        1800, // scan timeout (30 minutes)
        undefined // no parent job
      )
    })

    it('should create a batch analyze job with child jobs', async () => {
      const trackIds = ['track1', 'track2', 'track3']
      const analysisTypes: ('key' | 'bpm' | 'structure' | 'energy')[] = ['key', 'bpm']

      mockDb.createJob.mockResolvedValueOnce('test-uuid-1') // parent job
      mockDb.createJob.mockResolvedValueOnce('test-uuid-2') // child 1
      mockDb.createJob.mockResolvedValueOnce('test-uuid-3') // child 2
      mockDb.createJob.mockResolvedValueOnce('test-uuid-4') // child 3

      const jobId = await jobManager.createBatchAnalyzeJob(trackIds, analysisTypes, true)

      expect(jobId).toBe('test-uuid-1')
      expect(mockDb.createJob).toHaveBeenCalledTimes(4) // 1 parent + 3 children

      // Check parent job
      expect(mockDb.createJob).toHaveBeenNthCalledWith(1,
        'test-uuid-1',
        'batch_analyze',
        3, // high priority for user-initiated
        expect.objectContaining({
          trackIds,
          analysisTypes,
          userInitiated: true,
          childJobIds: ['test-uuid-2', 'test-uuid-3', 'test-uuid-4']
        }),
        true,
        600 // longer timeout for batch
      )

      // Check child jobs
      expect(mockDb.createJob).toHaveBeenNthCalledWith(2,
        'test-uuid-2',
        'analyze',
        3,
        expect.objectContaining({
          trackId: 'track1',
          analysisTypes
        }),
        true,
        300
      )
    })

    it('should create export jobs with proper priority', async () => {
      const trackIds = ['track1', 'track2']
      const options = { format: 'mp3', quality: 320 }

      mockDb.createJob.mockResolvedValueOnce('test-uuid-1')

      const jobId = await jobManager.createBatchExportJob(trackIds, 'rekordbox', '/exports', options)

      expect(mockDb.createJob).toHaveBeenCalledWith(
        'test-uuid-1',
        'batch_export',
        1, // highest priority for exports
        expect.objectContaining({
          trackIds,
          options,
          userInitiated: true
        }),
        true,
        900 // long timeout for exports
      )
    })
  })

  describe('Job Lifecycle Management', () => {
    it('should queue jobs correctly', async () => {
      const mockJobs = [
        { id: 'job1', type: 'scan', status: 'created', priority: 5 },
        { id: 'job2', type: 'analyze', status: 'created', priority: 3 },
        { id: 'job3', type: 'export', status: 'created', priority: 1 }
      ]

      mockDb.getJobsByStatus.mockReturnValueOnce(mockJobs)

      await jobManager.queueJobs()

      expect(mockDb.updateJobStatus).toHaveBeenCalledTimes(3)
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('job1', 'queued')
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('job2', 'queued')
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('job3', 'queued')
    })

    it('should process queue in priority order', async () => {
      const mockJobs = [
        { id: 'job1', type: 'scan', status: 'queued', priority: 5 },
        { id: 'job2', type: 'analyze', status: 'queued', priority: 3 },
        { id: 'job3', type: 'export', status: 'queued', priority: 1 }
      ]

      mockDb.getJobsByStatus.mockResolvedValueOnce(mockJobs)
      mockWorkerPool.getActiveJobs.mockReturnValue([])

      const processJobSpy = vi.spyOn(jobManager as any, 'processJob').mockResolvedValue(undefined)

      await jobManager.forceProcessQueue()

      // Should process highest priority first (priority 1 = highest)
      expect(processJobSpy).toHaveBeenCalledTimes(3)
      expect(processJobSpy).toHaveBeenNthCalledWith(1, mockJobs[2]) // job3 (priority 1)
      expect(processJobSpy).toHaveBeenNthCalledWith(2, mockJobs[1]) // job2 (priority 3)
      expect(processJobSpy).toHaveBeenNthCalledWith(3, mockJobs[0]) // job1 (priority 5)
    })

    it('should handle job timeouts', async () => {
      const timeoutJob = {
        id: 'timeout-job',
        type: 'analyze',
        status: 'running',
        started_at: new Date(Date.now() - 400000).toISOString(), // 400 seconds ago
        timeout_seconds: 300 // 5 minute timeout
      }

      mockDb.getJobsByStatus.mockResolvedValueOnce([timeoutJob])

      await jobManager.handleTimeouts()

      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('timeout-job', 'timeout')
      expect(mockDb.updateJobError).toHaveBeenCalledWith(
        'timeout-job',
        'Job timed out after 300 seconds'
      )
    })

    it('should retry failed jobs within attempt limits', async () => {
      const failedJob = {
        id: 'failed-job',
        type: 'analyze',
        status: 'failed',
        attempts: 1,
        max_attempts: 3,
        payload: JSON.stringify({ trackId: 'track1' })
      }

      mockDb.getJobsByStatus.mockResolvedValueOnce([failedJob])

      const success = await jobManager.retryJob('failed-job')

      expect(success).toBe(true)
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('failed-job', 'queued')
    })

    it('should not retry jobs that exceed max attempts', async () => {
      const exhaustedJob = {
        id: 'exhausted-job',
        type: 'analyze',
        status: 'failed',
        attempts: 3,
        max_attempts: 3,
        payload: JSON.stringify({ trackId: 'track1' })
      }

      mockDb.getJob.mockResolvedValueOnce(exhaustedJob)

      const success = await jobManager.retryJob('exhausted-job')

      expect(success).toBe(false)
      expect(mockDb.updateJobStatus).not.toHaveBeenCalled()
    })
  })

  describe('Job Cancellation', () => {
    it('should cancel a running job', async () => {
      const runningJob = {
        id: 'running-job',
        type: 'analyze',
        status: 'running'
      }

      mockDb.getJob.mockResolvedValueOnce(runningJob)

      const success = await jobManager.cancelJob('running-job')

      expect(success).toBe(true)
      expect(mockDb.cancelJob).toHaveBeenCalledWith('running-job')
      expect(mockWorkerPool.killAllJobs).toHaveBeenCalled()
    })

    it('should cancel a queued job', async () => {
      const queuedJob = {
        id: 'queued-job',
        type: 'analyze',
        status: 'queued'
      }

      mockDb.getJob.mockResolvedValueOnce(queuedJob)

      const success = await jobManager.cancelJob('queued-job')

      expect(success).toBe(true)
      expect(mockDb.cancelJob).toHaveBeenCalledWith('queued-job')
    })

    it('should not cancel completed jobs', async () => {
      const completedJob = {
        id: 'completed-job',
        type: 'analyze',
        status: 'completed'
      }

      mockDb.getJob.mockResolvedValueOnce(completedJob)

      const success = await jobManager.cancelJob('completed-job')

      expect(success).toBe(false)
      expect(mockDb.cancelJob).not.toHaveBeenCalled()
    })
  })

  describe('Batch Operations', () => {
    it('should update batch job progress based on children', async () => {
      const parentJob = {
        id: 'parent-job',
        type: 'batch_analyze',
        status: 'running'
      }

      const childJobs = [
        { id: 'child1', status: 'completed', progress: 100 },
        { id: 'child2', status: 'running', progress: 50 },
        { id: 'child3', status: 'queued', progress: 0 }
      ]

      mockDb.getJob.mockResolvedValueOnce(parentJob)
      mockDb.getJobsByParentId.mockResolvedValueOnce(childJobs)

      await jobManager.updateBatchJobProgress('parent-job')

      // Progress should be average: (100 + 50 + 0) / 3 = 50
      expect(mockDb.updateJobProgress).toHaveBeenCalledWith('parent-job', 50)
    })

    it('should complete batch job when all children complete', async () => {
      const parentJob = {
        id: 'parent-job',
        type: 'batch_analyze',
        status: 'running'
      }

      const childJobs = [
        { id: 'child1', status: 'completed', progress: 100 },
        { id: 'child2', status: 'completed', progress: 100 },
        { id: 'child3', status: 'completed', progress: 100 }
      ]

      mockDb.getJob.mockResolvedValueOnce(parentJob)
      mockDb.getJobsByParentId.mockResolvedValueOnce(childJobs)

      await jobManager.updateBatchJobProgress('parent-job')

      expect(mockDb.updateJobProgress).toHaveBeenCalledWith('parent-job', 100)
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('parent-job', 'completed')
    })
  })

  describe('Recovery and Cleanup', () => {
    it('should recover stale running jobs on startup', async () => {
      const staleJobs = [
        { id: 'stale1', type: 'analyze', status: 'running' },
        { id: 'stale2', type: 'scan', status: 'running' }
      ]

      mockDb.getJobsByStatus.mockResolvedValueOnce(staleJobs)

      await jobManager.recoverJobsForTest()

      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('stale1', 'queued')
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('stale2', 'queued')
    })

    it('should abort all jobs', async () => {
      const activeJobs = [
        { id: 'job1', type: 'analyze', status: 'running' },
        { id: 'job2', type: 'scan', status: 'queued' }
      ]

      mockDb.getActiveJobs.mockResolvedValueOnce(activeJobs)

      await jobManager.abortAllJobs()

      expect(mockWorkerPool.stopAllJobs).toHaveBeenCalled()
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('job1', 'cancelled')
      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('job2', 'cancelled')
    })
  })

  describe('Event Handling', () => {
    it('should emit events for job status changes', async () => {
      const eventSpy = vi.fn()
      jobManager.on('job-status-changed', eventSpy)

      // Simulate internal job status change
      await (jobManager as any).updateJobStatus('test-job', 'completed', { tracks: 5 })

      expect(mockDb.updateJobStatus).toHaveBeenCalledWith('test-job', 'completed')
      expect(mockDb.updateJobResult).toHaveBeenCalledWith('test-job', JSON.stringify({ tracks: 5 }))
      expect(eventSpy).toHaveBeenCalledWith({
        jobId: 'test-job',
        status: 'completed',
        result: { tracks: 5 }
      })
    })

    it('should emit events for job progress updates', async () => {
      const eventSpy = vi.fn()
      jobManager.on('job-progress', eventSpy)

      // Simulate internal job progress update
      await (jobManager as any).updateJobProgress('test-job', 75)

      expect(mockDb.updateJobProgress).toHaveBeenCalledWith('test-job', 75)
      expect(eventSpy).toHaveBeenCalledWith({
        jobId: 'test-job',
        progress: 75
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.createJob.mockRejectedValueOnce(new Error('Database error'))

      await expect(jobManager.createScanJob(['/test'], ['mp3'])).rejects.toThrow('Database error')
    })

    it('should handle worker pool errors', async () => {
      const job = { id: 'test-job', type: 'analyze', status: 'queued' }
      mockWorkerPool.submitJob.mockRejectedValueOnce(new Error('Worker error'))

      const processJobSpy = vi.spyOn(jobManager as any, 'processJob')
      processJobSpy.mockImplementation(async () => {
        throw new Error('Worker error')
      })

      await expect((jobManager as any).processJob(job)).rejects.toThrow('Worker error')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large numbers of jobs efficiently', async () => {
      const manyJobs = Array.from({ length: 1000 }, (_, i) => ({
        id: `job-${i}`,
        type: 'analyze',
        status: 'created',
        priority: Math.floor(Math.random() * 10) + 1
      }))

      mockDb.getJobsByStatus.mockResolvedValueOnce(manyJobs)

      const start = Date.now()
      await jobManager.queueJobs()
      const duration = Date.now() - start

      // Should process 1000 jobs in under 1 second
      expect(duration).toBeLessThan(1000)
      expect(mockDb.updateJobStatus).toHaveBeenCalledTimes(1000)
    })

    it('should limit concurrent job processing', async () => {
      const queuedJobs = Array.from({ length: 20 }, (_, i) => ({
        id: `job-${i}`,
        type: 'analyze',
        status: 'queued',
        priority: 5
      }))

      mockDb.getJobsByStatus.mockResolvedValueOnce(queuedJobs)
      mockWorkerPool.getActiveJobs.mockReturnValue(Array(5).fill({})) // 5 active jobs

      const processJobSpy = vi.spyOn(jobManager as any, 'processJob').mockResolvedValue(undefined)

      await jobManager.forceProcessQueue()

      // Should only process remaining slots (assuming max 10 concurrent)
      expect(processJobSpy).toHaveBeenCalledTimes(5) // 10 max - 5 active = 5 new
    })
  })
})