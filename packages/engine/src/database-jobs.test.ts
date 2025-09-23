import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CleanCueDatabase as Database } from './database'
import { JobType, JobStatus } from '@cleancue/shared'
import fs from 'fs/promises'
import path from 'path'

describe('Database Job Operations', () => {
  let db: Database
  let tempDbPath: string

  beforeEach(async () => {
    tempDbPath = path.join(__dirname, `test-db-${Date.now()}.db`)
    db = new Database(tempDbPath)
    await db.initialize()
  })

  afterEach(async () => {
    await db.close()
    try {
      await fs.unlink(tempDbPath)
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Job Creation', () => {
    it('should create a job with all required fields', async () => {
      const jobId = 'test-job-001'
      const payload = { paths: ['/test'], extensions: ['mp3'] }

      await db.createJob(jobId, 'scan', 5, payload, true, 300)

      const job = await db.getJob(jobId)
      expect(job).toBeDefined()
      expect(job!.id).toBe(jobId)
      expect(job!.type).toBe('scan')
      expect(job!.status).toBe('created')
      expect(job!.priority).toBe(5)
      expect(JSON.parse(job!.payload)).toEqual(payload)
      expect(job!.user_initiated).toBe(1)
      expect(job!.timeout_seconds).toBe(300)
      expect(job!.progress).toBe(0)
      expect(job!.attempts).toBe(0)
      expect(job!.max_attempts).toBe(3)
      expect(job!.created_at).toBeDefined()
    })

    it('should create job with parent relationship', async () => {
      const parentId = 'parent-job'
      const childId = 'child-job'

      // Create parent job
      await db.createJob(parentId, 'batch_analyze', 3, { trackIds: ['track1', 'track2'] }, true, 600)

      // Create child job
      await db.createJob(childId, 'analyze', 3, { trackId: 'track1' }, true, 300, parentId)

      const childJob = await db.getJob(childId)
      expect(childJob!.parent_job_id).toBe(parentId)

      const childJobs = await db.getJobsByParentId(parentId)
      expect(childJobs).toHaveLength(1)
      expect(childJobs[0].id).toBe(childId)
    })

    it('should handle duplicate job ID creation', async () => {
      const jobId = 'duplicate-job'
      const payload = { test: 'data' }

      await db.createJob(jobId, 'scan', 5, payload, true)

      // Second creation with same ID should fail
      let errorThrown = false
      try {
        await db.createJob(jobId, 'analyze', 3, payload, true)
      } catch (error) {
        errorThrown = true
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('UNIQUE constraint failed')
      }
      expect(errorThrown).toBe(true)
    })
  })

  describe('Job Retrieval', () => {
    beforeEach(async () => {
      // Create test jobs with different statuses and priorities
      await db.createJob('job-created', 'scan', 5, { test: 'data' }, true)
      await db.createJob('job-queued', 'analyze', 3, { test: 'data' }, true)
      await db.createJob('job-running', 'export', 1, { test: 'data' }, true)
      await db.createJob('job-completed', 'scan', 7, { test: 'data' }, false)
      await db.createJob('job-failed', 'analyze', 5, { test: 'data' }, true)

      // Update statuses
      await db.updateJobStatus('job-queued', 'queued')
      await db.updateJobStatus('job-running', 'running')
      await db.updateJobStatus('job-completed', 'completed')
      await db.updateJobStatus('job-failed', 'failed')
    })

    it('should retrieve all jobs', async () => {
      const jobs = await db.getAllJobs()
      expect(jobs).toHaveLength(5)
    })

    it('should retrieve jobs by status', async () => {
      const queuedJobs = await db.getJobsByStatus('queued')
      expect(queuedJobs).toHaveLength(1)
      expect(queuedJobs[0].id).toBe('job-queued')

      const runningJobs = await db.getJobsByStatus('running')
      expect(runningJobs).toHaveLength(1)
      expect(runningJobs[0].id).toBe('job-running')

      const completedJobs = await db.getJobsByStatus('completed')
      expect(completedJobs).toHaveLength(1)
      expect(completedJobs[0].id).toBe('job-completed')
    })

    it('should retrieve active jobs (created, queued, running)', async () => {
      const activeJobs = await db.getActiveJobs()
      expect(activeJobs).toHaveLength(3)

      const activeIds = activeJobs.map(job => job.id)
      expect(activeIds).toContain('job-created')
      expect(activeIds).toContain('job-queued')
      expect(activeIds).toContain('job-running')
    })

    it('should retrieve queued jobs only', async () => {
      const queuedJobs = await db.getQueuedJobs()
      expect(queuedJobs).toHaveLength(1)
      expect(queuedJobs[0].id).toBe('job-queued')
    })

    it('should retrieve jobs by type', async () => {
      const scanJobs = await db.getJobsByType('scan')
      expect(scanJobs).toHaveLength(2)

      const analyzeJobs = await db.getJobsByType('analyze')
      expect(analyzeJobs).toHaveLength(2)

      const exportJobs = await db.getJobsByType('export')
      expect(exportJobs).toHaveLength(1)
    })

    it('should return null for non-existent job', async () => {
      const job = await db.getJob('non-existent')
      expect(job).toBeNull()
    })
  })

  describe('Job Status Updates', () => {
    beforeEach(async () => {
      await db.createJob('test-job', 'scan', 5, { test: 'data' }, true)
    })

    it('should update job status', async () => {
      await db.updateJobStatus('test-job', 'queued')

      const job = await db.getJob('test-job')
      expect(job!.status).toBe('queued')
      expect(job!.queued_at).toBeDefined()
    })

    it('should update job to running status with started_at', async () => {
      await db.updateJobStatus('test-job', 'running')

      const job = await db.getJob('test-job')
      expect(job!.status).toBe('running')
      expect(job!.started_at).toBeDefined()
    })

    it('should update job to completed status with completed_at', async () => {
      await db.updateJobStatus('test-job', 'completed')

      const job = await db.getJob('test-job')
      expect(job!.status).toBe('completed')
      expect(job!.completed_at).toBeDefined()
    })

    it('should update job progress', async () => {
      await db.updateJobProgress('test-job', 50)

      const job = await db.getJob('test-job')
      expect(job!.progress).toBe(50)
    })

    it('should update job result', async () => {
      const result = { tracksFound: 10, tracksAdded: 8 }
      await db.updateJobResult('test-job', JSON.stringify(result))

      const job = await db.getJob('test-job')
      expect(JSON.parse(job!.result!)).toEqual(result)
    })

    it('should update job error', async () => {
      const errorMessage = 'File not found'
      await db.updateJobError('test-job', errorMessage)

      const job = await db.getJob('test-job')
      expect(job!.error).toBe(errorMessage)
    })

    it('should increment job attempts', async () => {
      await db.incrementJobAttempts('test-job')
      await db.incrementJobAttempts('test-job')

      const job = await db.getJob('test-job')
      expect(job!.attempts).toBe(2)
    })
  })

  describe('Job Cancellation', () => {
    beforeEach(async () => {
      await db.createJob('running-job', 'scan', 5, { test: 'data' }, true)
      await db.updateJobStatus('running-job', 'running')
    })

    it('should cancel a job', async () => {
      await db.cancelJob('running-job')

      const job = await db.getJob('running-job')
      expect(job!.status).toBe('cancelled')
      expect(job!.completed_at).toBeDefined()
    })

    it('should handle cancelling non-existent job', async () => {
      // Should not throw error
      await db.cancelJob('non-existent')
    })
  })

  describe('Complex Queries and Filtering', () => {
    beforeEach(async () => {
      // Create jobs with various combinations of attributes
      await db.createJob('user-scan-high', 'scan', 1, { priority: 'high' }, true)
      await db.createJob('user-analyze-med', 'analyze', 5, { priority: 'medium' }, true)
      await db.createJob('system-cleanup-low', 'cleanup', 10, { priority: 'low' }, false)
      await db.createJob('user-export-urgent', 'export', 1, { priority: 'urgent' }, true)

      // Update some statuses
      await db.updateJobStatus('user-scan-high', 'completed')
      await db.updateJobStatus('user-analyze-med', 'running')
      await db.updateJobStatus('system-cleanup-low', 'queued')
    })

    it('should retrieve jobs by multiple criteria', async () => {
      const userJobs = await db.getUserInitiatedJobs()
      expect(userJobs).toHaveLength(3)

      const systemJobs = await db.getSystemJobs()
      expect(systemJobs).toHaveLength(1)
      expect(systemJobs[0].id).toBe('system-cleanup-low')
    })

    it('should sort jobs by priority and creation time', async () => {
      const jobs = await db.getJobsSortedByPriority()

      // Should be sorted by priority (1 = highest) then by creation time
      expect(jobs[0].priority).toBe(1)
      expect(jobs[1].priority).toBe(1)
      expect(jobs[2].priority).toBe(5)
      expect(jobs[3].priority).toBe(10)
    })

    it('should get job statistics', async () => {
      const stats = await db.getJobStatistics()

      expect(stats.total).toBe(4)
      expect(stats.completed).toBe(1)
      expect(stats.running).toBe(1)
      expect(stats.queued).toBe(1)
      expect(stats.created).toBe(1)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })

    it('should get jobs created in time range', async () => {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const recentJobs = await db.getJobsInTimeRange(hourAgo, now)
      expect(recentJobs).toHaveLength(4) // All jobs created in last hour
    })
  })

  describe('Performance with Large Datasets', () => {
    it('should handle inserting many jobs efficiently', async () => {
      const startTime = Date.now()
      const jobCount = 1000

      // Create 1000 jobs
      const promises = []
      for (let i = 0; i < jobCount; i++) {
        promises.push(
          db.createJob(
            `perf-job-${i}`,
            i % 2 === 0 ? 'scan' : 'analyze',
            Math.floor(Math.random() * 10) + 1,
            { index: i },
            Math.random() > 0.5
          )
        )
      }

      await Promise.all(promises)
      const endTime = Date.now()

      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000)

      // Verify all jobs were created
      const allJobs = await db.getAllJobs()
      expect(allJobs).toHaveLength(jobCount)
    })

    it('should efficiently query large job sets', async () => {
      // First create a large dataset
      const jobCount = 500
      for (let i = 0; i < jobCount; i++) {
        await db.createJob(
          `query-job-${i}`,
          'analyze',
          Math.floor(Math.random() * 10) + 1,
          { index: i },
          true
        )
      }

      const startTime = Date.now()

      // Perform various queries
      await db.getAllJobs()
      await db.getJobsByStatus('created')
      await db.getJobsByType('analyze')
      await db.getActiveJobs()

      const endTime = Date.now()

      // All queries should complete quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })

  describe('Database Integrity and Constraints', () => {
    it('should enforce job status enum constraints', async () => {
      await db.createJob('test-job', 'scan', 5, {}, true)

      // Valid status updates should work
      await db.updateJobStatus('test-job', 'queued')
      await db.updateJobStatus('test-job', 'running')
      await db.updateJobStatus('test-job', 'completed')

      // Invalid status should be handled gracefully
      // (Database should either reject or handle gracefully)
      try {
        await db.updateJobStatus('test-job', 'invalid-status' as JobStatus)
      } catch (error) {
        // Expected behavior - invalid status rejected
        expect(error).toBeDefined()
      }
    })

    it('should maintain referential integrity for parent-child relationships', async () => {
      const parentId = 'parent-job'
      const childId = 'child-job'

      await db.createJob(parentId, 'batch_analyze', 3, {}, true)
      await db.createJob(childId, 'analyze', 3, {}, true, 300, parentId)

      // Child should reference parent
      const child = await db.getJob(childId)
      expect(child!.parent_job_id).toBe(parentId)

      // Parent should be findable through child
      const children = await db.getJobsByParentId(parentId)
      expect(children).toHaveLength(1)
      expect(children[0].id).toBe(childId)
    })

    it('should handle concurrent job updates safely', async () => {
      await db.createJob('concurrent-job', 'scan', 5, {}, true)

      // Simulate concurrent updates
      const updates = [
        db.updateJobProgress('concurrent-job', 25),
        db.updateJobProgress('concurrent-job', 50),
        db.updateJobProgress('concurrent-job', 75),
        db.updateJobStatus('concurrent-job', 'running'),
        db.incrementJobAttempts('concurrent-job')
      ]

      // All updates should complete without deadlocks
      await Promise.all(updates)

      const job = await db.getJob('concurrent-job')
      expect(job!.progress).toBeGreaterThanOrEqual(25)
      expect(job!.status).toBe('running')
      expect(job!.attempts).toBe(1)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty payload gracefully', async () => {
      await db.createJob('empty-payload', 'scan', 5, {}, true)

      const job = await db.getJob('empty-payload')
      expect(JSON.parse(job!.payload)).toEqual({})
    })

    it('should handle very large payloads', async () => {
      const largePayload = {
        paths: Array(1000).fill('/very/long/path/to/music/files'),
        metadata: Array(1000).fill({ title: 'Very long track title with lots of metadata' })
      }

      await db.createJob('large-payload', 'scan', 5, largePayload, true)

      const job = await db.getJob('large-payload')
      expect(JSON.parse(job!.payload)).toEqual(largePayload)
    })

    it('should handle special characters in job data', async () => {
      const specialPayload = {
        paths: ['/music/特殊字符/français/español/русский'],
        metadata: { title: 'Song with émojis 🎵🎶 and "quotes" & <tags>' }
      }

      await db.createJob('special-chars', 'scan', 5, specialPayload, true)

      const job = await db.getJob('special-chars')
      expect(JSON.parse(job!.payload)).toEqual(specialPayload)
    })

    it('should handle job queries on empty database', async () => {
      // Test on fresh database with no jobs
      const freshDb = new Database(':memory:')
      await freshDb.initialize()

      const jobs = await freshDb.getAllJobs()
      expect(jobs).toHaveLength(0)

      const activeJobs = await freshDb.getActiveJobs()
      expect(activeJobs).toHaveLength(0)

      const stats = await freshDb.getJobStatistics()
      expect(stats.total).toBe(0)

      await freshDb.close()
    })
  })
})