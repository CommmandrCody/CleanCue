import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JobManager } from './job-manager'
import { CleanCueDatabase as Database } from './database'
import { CleanCueEngine as Engine } from './engine'
import { JobType, JobStatus } from '@cleancue/shared'
import fs from 'fs/promises'
import path from 'path'

describe('Job System Performance Tests', () => {
  let engine: Engine
  let tempDbPath: string
  let mockWorkerPool: any

  beforeEach(async () => {
    tempDbPath = path.join(__dirname, `perf-test-db-${Date.now()}.db`)

    mockWorkerPool = {
      submitJob: vi.fn().mockResolvedValue({ success: true }),
      killAllJobs: vi.fn(),
      stopAllJobs: vi.fn(),
      getActiveJobs: vi.fn().mockReturnValue([])
    }

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

  describe('Large Scale Job Creation', () => {
    it('should create 10,000 jobs quickly', async () => {
      const jobCount = 10000
      const startTime = performance.now()

      // Create jobs in batches for better performance
      const batchSize = 100
      const batches = Math.ceil(jobCount / batchSize)

      for (let batch = 0; batch < batches; batch++) {
        const promises = []
        const batchStart = batch * batchSize
        const batchEnd = Math.min(batchStart + batchSize, jobCount)

        for (let i = batchStart; i < batchEnd; i++) {
          const jobType: JobType = ['scan', 'analyze', 'export'][i % 3] as JobType
          const priority = Math.floor(Math.random() * 10) + 1
          const payload = {
            id: i,
            type: jobType,
            data: `test-data-${i}`,
            timestamp: Date.now()
          }

          promises.push(
            engine.getJobManager().createJobForTest(jobType, priority, payload, true)
          )
        }

        await Promise.all(promises)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Created ${jobCount} jobs in ${duration.toFixed(2)}ms`)

      // Should create 10k jobs in under 10 seconds
      expect(duration).toBeLessThan(10000)

      // Verify all jobs were created
      const allJobs = await engine.getAllJobs()
      expect(allJobs).toHaveLength(jobCount)
    })

    it('should handle concurrent job creation without deadlocks', async () => {
      const concurrentBatches = 50
      const jobsPerBatch = 20

      const startTime = performance.now()

      // Create multiple concurrent batches
      const batchPromises = Array.from({ length: concurrentBatches }, async (_, batchIndex) => {
        const batchJobs = []
        for (let i = 0; i < jobsPerBatch; i++) {
          const jobIndex = batchIndex * jobsPerBatch + i
          batchJobs.push(
            engine.getJobManager().createJobForTest(
              'analyze',
              5,
              { trackId: `track-${jobIndex}`, batch: batchIndex },
              true
            )
          )
        }
        return Promise.all(batchJobs)
      })

      await Promise.all(batchPromises)

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Created ${concurrentBatches * jobsPerBatch} concurrent jobs in ${duration.toFixed(2)}ms`)

      // Should complete without deadlocks in reasonable time
      expect(duration).toBeLessThan(5000)

      // Verify all jobs were created
      const allJobs = await engine.getAllJobs()
      expect(allJobs).toHaveLength(concurrentBatches * jobsPerBatch)
    })
  })

  describe('High Volume Job Processing', () => {
    it('should process 1000 jobs efficiently', async () => {
      const jobCount = 1000

      // Create jobs
      const jobIds = []
      for (let i = 0; i < jobCount; i++) {
        const jobId = await engine.getJobManager().createJobForTest(
          'analyze',
          Math.floor(Math.random() * 10) + 1,
          { trackId: `track-${i}` },
          true
        )
        jobIds.push(jobId)
      }

      // Mock job execution to complete quickly
      vi.spyOn(engine.getJobManager() as any, 'executeAnalysisJob').mockImplementation(async (job) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1))
        return {
          success: true,
          trackId: JSON.parse((job as any).payload).trackId,
          results: { key: 'Am', bpm: 120 }
        }
      })

      const startTime = performance.now()

      // Queue and process all jobs
      await engine.getJobManager().queueJobs()

      // Process in multiple rounds to simulate real processing
      let completedJobs = 0
      while (completedJobs < jobCount) {
        await engine.getJobManager().forceProcessQueue()

        // Check completion
        const activeJobs = await engine.getActiveJobs()
        const runningJobs = activeJobs.filter(job => job.status === 'running' || job.status === 'queued')

        if (runningJobs.length === 0) {
          break
        }

        await new Promise(resolve => setTimeout(resolve, 10)) // Brief pause
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Processed ${jobCount} jobs in ${duration.toFixed(2)}ms`)

      // Should process 1000 jobs in under 30 seconds
      expect(duration).toBeLessThan(30000)

      // Verify all jobs completed
      const completedJobsList = await engine.getAllJobs()
      const completed = completedJobsList.filter(job => job.status === 'completed')
      expect(completed).toHaveLength(jobCount)
    })

    it('should maintain performance with priority-based processing', async () => {
      const highPriorityJobs = 100
      const mediumPriorityJobs = 500
      const lowPriorityJobs = 400

      // Create jobs with different priorities
      const allJobIds = []

      // High priority (exports)
      for (let i = 0; i < highPriorityJobs; i++) {
        const jobId = await engine.getJobManager().createJobForTest(
          'export',
          1, // highest priority
          { trackIds: [`track-${i}`] },
          true
        )
        allJobIds.push({ id: jobId, priority: 1 })
      }

      // Medium priority (user analysis)
      for (let i = 0; i < mediumPriorityJobs; i++) {
        const jobId = await engine.getJobManager().createJobForTest(
          'analyze',
          3,
          { trackId: `track-${i}` },
          true
        )
        allJobIds.push({ id: jobId, priority: 3 })
      }

      // Low priority (system scans)
      for (let i = 0; i < lowPriorityJobs; i++) {
        const jobId = await engine.getJobManager().createJobForTest(
          'scan',
          7,
          { paths: [`/test-${i}`] },
          false
        )
        allJobIds.push({ id: jobId, priority: 7 })
      }

      // Mock execution tracking
      const executionOrder: Array<{ jobId: string, priority: number }> = []

      const mockExecute = vi.fn().mockImplementation(async (job) => {
        executionOrder.push({ jobId: job.id, priority: job.priority })
        await new Promise(resolve => setTimeout(resolve, 1))
        return { success: true }
      })

      vi.spyOn(engine.getJobManager() as any, 'executeExportJob').mockImplementation(mockExecute)
      vi.spyOn(engine.getJobManager() as any, 'executeAnalysisJob').mockImplementation(mockExecute)
      vi.spyOn(engine.getJobManager() as any, 'executeScanJob').mockImplementation(mockExecute)

      const startTime = performance.now()

      await engine.getJobManager().queueJobs()

      // Process in chunks to verify priority ordering
      for (let chunk = 0; chunk < 10; chunk++) {
        await engine.getJobManager().forceProcessQueue()
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Processed ${allJobIds.length} priority-ordered jobs in ${duration.toFixed(2)}ms`)

      // Performance should still be good with priority ordering
      expect(duration).toBeLessThan(15000)

      // Verify priority ordering in first batch
      const firstBatch = executionOrder.slice(0, 50)
      const priorities = firstBatch.map(job => job.priority)

      // High priority jobs should be processed first
      const highPriorityInFirst50 = priorities.filter(p => p === 1).length
      expect(highPriorityInFirst50).toBeGreaterThan(20) // At least 20% of first batch should be high priority
    })
  })

  describe('Memory Usage and Efficiency', () => {
    it('should handle large job payloads efficiently', async () => {
      const jobCount = 500

      // Create jobs with large payloads
      const largePayload = {
        tracks: Array.from({ length: 1000 }, (_, i) => ({
          id: `track-${i}`,
          path: `/very/long/path/to/music/files/with/deeply/nested/folder/structure/track-${i}.mp3`,
          metadata: {
            title: `Very Long Track Title With Many Words That Takes Up Space - Track ${i}`,
            artist: `Artist Name With Very Long Name That Also Takes Up Significant Space ${i}`,
            album: `Album Title That Is Also Very Long And Contains Detailed Information ${i}`,
            genre: 'Electronic Dance Music Subgenre With Very Specific Classification',
            description: 'A very detailed description of the track that contains many words and takes up significant memory space in the payload when multiplied across many jobs'.repeat(5)
          }
        })),
        options: {
          analysisTypes: ['key', 'bpm', 'structure', 'energy', 'danceability', 'mood', 'genre'],
          quality: 'high',
          advanced: true,
          customSettings: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`setting${i}`, `value${i}`.repeat(10)])
          )
        }
      }

      const startTime = performance.now()
      const initialMemory = process.memoryUsage()

      // Create jobs with large payloads
      for (let i = 0; i < jobCount; i++) {
        await engine.getJobManager().createJobForTest(
          'batch_analyze',
          5,
          { ...largePayload, jobIndex: i },
          true
        )
      }

      const endTime = performance.now()
      const finalMemory = process.memoryUsage()

      const duration = endTime - startTime
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      console.log(`Created ${jobCount} large payload jobs in ${duration.toFixed(2)}ms`)
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // Should handle large payloads efficiently
      expect(duration).toBeLessThan(5000)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024) // Less than 500MB increase
    })

    it('should efficiently query large job datasets', async () => {
      const jobCount = 5000

      // Create diverse job dataset
      const jobTypes: JobType[] = ['scan', 'analyze', 'export', 'batch_analyze', 'batch_export']
      const statuses: JobStatus[] = ['created', 'queued', 'running', 'completed', 'failed']

      for (let i = 0; i < jobCount; i++) {
        const jobId = await engine.getJobManager().createJobForTest(
          jobTypes[i % jobTypes.length],
          Math.floor(Math.random() * 10) + 1,
          { index: i, timestamp: Date.now() },
          Math.random() > 0.3 // 70% user-initiated
        )

        // Randomly set different statuses
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        if (status !== 'created') {
          await engine.getDatabase().updateJobStatus(jobId, status)
        }

        // Add progress for some jobs
        if (Math.random() > 0.5) {
          await engine.getDatabase().updateJobProgress(jobId, Math.floor(Math.random() * 100))
        }
      }

      // Test various query patterns
      const queryTests = [
        () => engine.getAllJobs(),
        () => engine.getActiveJobs(),
        () => engine.getQueuedJobs(),
        () => engine.getDatabase().getJobsByStatus('completed'),
        () => engine.getDatabase().getJobsByType('analyze'),
        () => engine.getDatabase().getUserInitiatedJobs(),
        () => engine.getDatabase().getJobStatistics(),
        () => engine.getDatabase().getJobsSortedByPriority()
      ]

      const startTime = performance.now()

      // Run all query types
      for (const queryTest of queryTests) {
        const queryStart = performance.now()
        await queryTest()
        const queryEnd = performance.now()

        // Each query should complete quickly
        expect(queryEnd - queryStart).toBeLessThan(1000)
      }

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      console.log(`Completed ${queryTests.length} different queries on ${jobCount} jobs in ${totalDuration.toFixed(2)}ms`)

      // All queries should complete quickly
      expect(totalDuration).toBeLessThan(5000)
    })
  })

  describe('Batch Operations Performance', () => {
    it('should efficiently handle large batch operations', async () => {
      const batchSize = 1000

      // Test batch analyze
      const trackIds = Array.from({ length: batchSize }, (_, i) => `track-${i}`)

      const startTime = performance.now()

      const batchJobId = await engine.createAnalysisJobs(trackIds, ['key', 'bpm'], true)

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Created batch analysis for ${batchSize} tracks in ${duration.toFixed(2)}ms`)

      // Should create batch operation quickly
      expect(duration).toBeLessThan(5000)

      // Verify batch job and children were created
      const batchJob = await engine.getJobById(batchJobId)
      expect(batchJob).toBeDefined()
      expect(batchJob!.type).toBe('batch_analyze')

      const allJobs = await engine.getAllJobs()
      const childJobs = allJobs.filter(job => job.parent_job_id === batchJobId)
      expect(childJobs).toHaveLength(batchSize)
    })

    it('should update batch progress efficiently', async () => {
      const batchSize = 500

      // Create batch job with children
      const trackIds = Array.from({ length: batchSize }, (_, i) => `track-${i}`)
      const batchJobId = await engine.createAnalysisJobs(trackIds, ['key'], true)

      // Get child job IDs
      const allJobs = await engine.getAllJobs()
      const childJobs = allJobs.filter(job => job.parent_job_id === batchJobId)

      const startTime = performance.now()

      // Simulate completing child jobs progressively
      for (let i = 0; i < childJobs.length; i += 50) { // Update in chunks
        const chunk = childJobs.slice(i, Math.min(i + 50, childJobs.length))

        // Complete chunk of jobs
        for (const child of chunk) {
          await engine.getDatabase().updateJobStatus(child.id, 'completed')
          await engine.getDatabase().updateJobProgress(child.id, 100)
        }

        // Update batch progress
        await engine.getJobManager().updateBatchJobProgress(batchJobId)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Updated batch progress for ${batchSize} children in ${duration.toFixed(2)}ms`)

      // Should update batch progress efficiently
      expect(duration).toBeLessThan(5000)

      // Verify final batch state
      const finalBatchJob = await engine.getJobById(batchJobId)
      expect(finalBatchJob!.status).toBe('completed')
      expect(finalBatchJob!.progress).toBe(100)
    })
  })

  describe('Database Performance Under Load', () => {
    it('should maintain performance with frequent updates', async () => {
      const jobCount = 1000
      const updateRounds = 10

      // Create initial jobs
      const jobIds = []
      for (let i = 0; i < jobCount; i++) {
        const jobId = await engine.getJobManager().createJobForTest(
          'analyze',
          5,
          { trackId: `track-${i}` },
          true
        )
        jobIds.push(jobId)
      }

      const startTime = performance.now()

      // Perform multiple rounds of updates
      for (let round = 0; round < updateRounds; round++) {
        const updatePromises = jobIds.map(async (jobId, index) => {
          // Update different aspects of each job
          await engine.getDatabase().updateJobProgress(jobId, Math.floor(Math.random() * 100))

          if (index % 10 === 0) {
            await engine.getDatabase().updateJobStatus(jobId, 'running')
          }

          if (index % 20 === 0) {
            await engine.getDatabase().incrementJobAttempts(jobId)
          }

          if (index % 30 === 0) {
            await engine.getDatabase().updateJobResult(jobId, JSON.stringify({ key: 'Am', bpm: 120 }))
          }
        })

        await Promise.all(updatePromises)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      const totalUpdates = jobCount * updateRounds * 1.4 // Approximate number of updates per job per round

      console.log(`Performed ~${totalUpdates} database updates in ${duration.toFixed(2)}ms`)

      // Should handle high frequency updates efficiently
      expect(duration).toBeLessThan(15000)
    })

    it('should maintain query performance during heavy write operations', async () => {
      const jobCount = 2000

      // Start background write operations
      let writeOperations = 0
      const backgroundWrites = setInterval(async () => {
        try {
          const jobId = await engine.getJobManager().createJobForTest(
            'analyze',
            5,
            { trackId: `bg-track-${writeOperations}` },
            true
          )

          await engine.getDatabase().updateJobProgress(jobId, Math.floor(Math.random() * 100))
          writeOperations++
        } catch (error) {
          // Ignore errors during cleanup
        }
      }, 5)

      // Create initial dataset
      for (let i = 0; i < jobCount; i++) {
        await engine.getJobManager().createJobForTest(
          'analyze',
          Math.floor(Math.random() * 10) + 1,
          { trackId: `track-${i}` },
          true
        )
      }

      // Test read performance during writes
      const readTests = []

      for (let i = 0; i < 20; i++) {
        const readStart = performance.now()

        await Promise.all([
          engine.getAllJobs(),
          engine.getActiveJobs(),
          engine.getDatabase().getJobStatistics(),
          engine.getDatabase().getJobsByType('analyze')
        ])

        const readEnd = performance.now()
        readTests.push(readEnd - readStart)

        await new Promise(resolve => setTimeout(resolve, 100)) // Brief pause between tests
      }

      clearInterval(backgroundWrites)

      const avgReadTime = readTests.reduce((sum, time) => sum + time, 0) / readTests.length
      const maxReadTime = Math.max(...readTests)

      console.log(`Average read time during writes: ${avgReadTime.toFixed(2)}ms`)
      console.log(`Max read time during writes: ${maxReadTime.toFixed(2)}ms`)
      console.log(`Background writes performed: ${writeOperations}`)

      // Read operations should remain fast even during heavy writes
      expect(avgReadTime).toBeLessThan(500)
      expect(maxReadTime).toBeLessThan(2000)
    })
  })
})