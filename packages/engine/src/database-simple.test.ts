import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CleanCueDatabase } from './database'
import fs from 'fs/promises'
import path from 'path'

describe('Simple Database Job Tests', () => {
  let db: CleanCueDatabase
  let tempDbPath: string

  beforeEach(async () => {
    tempDbPath = path.join(__dirname, `simple-test-db-${Date.now()}.db`)
    db = new CleanCueDatabase(tempDbPath)
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

  it('should create and retrieve a job', async () => {
    const jobId = 'test-job-001'
    const payload = { paths: ['/test'], extensions: ['mp3'] }

    const createdJobId = await db.createJob(jobId, 'scan', 5, payload, true, 300)
    expect(createdJobId).toBe(jobId)

    const job = await db.getJob(jobId)
    expect(job).toBeDefined()
    expect(job.id).toBe(jobId)
    expect(job.type).toBe('scan')
    expect(job.status).toBe('created')
    expect(job.priority).toBe(5)
    expect(JSON.parse(job.payload)).toEqual(payload)
  })

  it('should get all jobs', async () => {
    await db.createJob('job1', 'scan', 5, { test: 'data1' })
    await db.createJob('job2', 'analyze', 3, { test: 'data2' })

    const jobs = await db.getAllJobs()
    expect(jobs).toHaveLength(2)
  })

  it('should filter jobs by status', async () => {
    await db.createJob('job1', 'scan', 5, { test: 'data1' })
    await db.createJob('job2', 'analyze', 3, { test: 'data2' })

    const createdJobs = await db.getJobsByStatus('created')
    expect(createdJobs).toHaveLength(2)

    const queuedJobs = await db.getJobsByStatus('queued')
    expect(queuedJobs).toHaveLength(0)
  })

  it('should update job progress', async () => {
    const jobId = 'progress-job'
    await db.createJob(jobId, 'scan', 5, { test: 'data' })

    await db.updateJobProgress(jobId, 50)

    const job = await db.getJob(jobId)
    expect(job.progress).toBe(50)
  })

  it('should get job statistics', async () => {
    await db.createJob('job1', 'scan', 5, { test: 'data1' })
    await db.createJob('job2', 'analyze', 3, { test: 'data2' })

    // Update one to completed
    await db.updateJobStatus('job1', 'completed')

    const stats = await db.getJobStatistics()
    expect(stats.total).toBe(2)
    expect(stats.completed).toBe(1)
    expect(stats.created).toBe(1)
  })
})