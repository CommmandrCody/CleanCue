const { test, expect } = require('@playwright/test')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs/promises')

/**
 * End-to-End tests for the job management system
 * These tests simulate real user workflows with the CleanCue application
 */

test.describe('Job Management E2E Tests', () => {
  let electronApp

  test.beforeAll(async () => {
    // Build the application if needed
    const buildProcess = spawn('pnpm', ['run', 'build'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    })

    await new Promise((resolve, reject) => {
      buildProcess.on('exit', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Build failed with code ${code}`))
      })
    })
  })

  test.beforeEach(async ({ _electron }) => {
    // Launch Electron app
    electronApp = await _electron.launch({
      args: [path.join(__dirname, '../apps/desktop/dist/main.js')],
      timeout: 30000
    })

    // Wait for app to be ready
    await electronApp.firstWindow()
  })

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test.describe('Complete Scan Workflow', () => {
    test('should create, execute, and complete a scan job', async () => {
      const page = await electronApp.firstWindow()

      // Navigate to scan dialog
      await page.click('[data-testid=\"scan-button\"]')

      // Wait for scan dialog to open
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')

      // Select a test folder
      const testMusicPath = path.join(__dirname, 'fixtures/test-music')
      await page.fill('[data-testid=\"folder-input\"]', testMusicPath)

      // Select file extensions
      await page.check('[data-testid=\"mp3-checkbox\"]')
      await page.check('[data-testid=\"wav-checkbox\"]')

      // Start scan
      await page.click('[data-testid=\"start-scan-button\"]')

      // Navigate to job management to monitor progress
      await page.click('[data-testid=\"analysis-tab\"]')

      // Wait for scan job to appear
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"scan\")')

      // Verify job details
      const scanJob = page.locator('[data-testid=\"job-row\"]:has-text(\"scan\")')
      await expect(scanJob).toContainText('queued')

      // Wait for job to start processing
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"running\")', { timeout: 10000 })

      // Monitor progress updates
      const progressBar = scanJob.locator('[data-testid=\"progress-bar\"]')
      await expect(progressBar).toBeVisible()

      // Wait for completion
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"completed\")', { timeout: 30000 })

      // Verify job completed successfully
      await expect(scanJob).toContainText('completed')
      await expect(scanJob).toContainText('100%')

      // Expand job details to see results
      await scanJob.click()
      await page.waitForSelector('[data-testid=\"job-details\"]')

      // Verify scan results
      const jobDetails = page.locator('[data-testid=\"job-details\"]')
      await expect(jobDetails).toContainText('tracksFound')
      await expect(jobDetails).toContainText('tracksAdded')

      // Check that tracks were added to library
      await page.click('[data-testid=\"library-tab\"]')
      await page.waitForSelector('[data-testid=\"track-row\"]')

      const trackRows = page.locator('[data-testid=\"track-row\"]')
      await expect(trackRows).toHaveCountGreaterThan(0)
    })

    test('should handle scan errors gracefully', async () => {
      const page = await electronApp.firstWindow()

      // Navigate to scan dialog
      await page.click('[data-testid=\"scan-button\"]')
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')

      // Enter invalid path
      await page.fill('[data-testid=\"folder-input\"]', '/invalid/nonexistent/path')
      await page.check('[data-testid=\"mp3-checkbox\"]')

      // Start scan
      await page.click('[data-testid=\"start-scan-button\"]')

      // Monitor job in job management
      await page.click('[data-testid=\"analysis-tab\"]')
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"scan\")')

      // Wait for job to fail
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"failed\")', { timeout: 10000 })

      const failedJob = page.locator('[data-testid=\"job-row\"]:has-text(\"failed\")')
      await expect(failedJob).toContainText('failed')

      // Check error message
      await failedJob.click()
      await page.waitForSelector('[data-testid=\"job-error\"]')

      const errorMessage = page.locator('[data-testid=\"job-error\"]')
      await expect(errorMessage).toContainText('does not exist')
    })
  })

  test.describe('Analysis Job Workflow', () => {
    test('should analyze tracks and show progress', async () => {
      const page = await electronApp.firstWindow()

      // First ensure we have tracks in the library
      await test.step('Add tracks to library', async () => {
        await page.click('[data-testid=\"scan-button\"]')
        await page.waitForSelector('[data-testid=\"scan-dialog\"]')
        await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/test-music'))
        await page.check('[data-testid=\"mp3-checkbox\"]')
        await page.click('[data-testid=\"start-scan-button\"]')

        // Wait for scan to complete
        await page.click('[data-testid=\"analysis-tab\"]')
        await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"completed\")', { timeout: 30000 })
      })

      // Navigate to library and select tracks for analysis
      await page.click('[data-testid=\"library-tab\"]')
      await page.waitForSelector('[data-testid=\"track-row\"]')

      // Select multiple tracks
      const trackCheckboxes = page.locator('[data-testid=\"track-checkbox\"]')
      await trackCheckboxes.first().check()
      await trackCheckboxes.nth(1).check()

      // Start analysis
      await page.click('[data-testid=\"analyze-selected-button\"]')

      // Wait for analysis dialog
      await page.waitForSelector('[data-testid=\"analysis-dialog\"]')

      // Select analysis types
      await page.check('[data-testid=\"key-analysis-checkbox\"]')
      await page.check('[data-testid=\"bpm-analysis-checkbox\"]')

      // Start analysis
      await page.click('[data-testid=\"start-analysis-button\"]')

      // Monitor analysis jobs
      await page.click('[data-testid=\"analysis-tab\"]')

      // Should see batch analysis job
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"batch_analyze\")')

      // Should see individual analysis jobs
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"analyze\")')

      // Wait for all analysis jobs to complete
      await page.waitForFunction(
        () => {
          const runningJobs = document.querySelectorAll('[data-testid=\"job-row\"]:has-text(\"running\")')
          return runningJobs.length === 0
        },
        { timeout: 60000 }
      )

      // Verify all analysis jobs completed
      const analyzeJobs = page.locator('[data-testid=\"job-row\"]:has-text(\"analyze\")')
      await expect(analyzeJobs.first()).toContainText('completed')

      // Check that tracks now have analysis data
      await page.click('[data-testid=\"library-tab\"]')

      const trackRows = page.locator('[data-testid=\"track-row\"]')
      await expect(trackRows.first()).toContainText(/[A-G][#b]?[mM]?/) // Key signature
      await expect(trackRows.first()).toContainText(/\d+\s*BPM/) // BPM value
    })

    test('should retry failed analysis jobs', async () => {
      const page = await electronApp.firstWindow()

      // Create an analysis job that will fail (corrupted file)
      const corruptedPath = path.join(__dirname, 'fixtures/corrupted-audio.mp3')

      // First add the corrupted file to library
      await page.click('[data-testid=\"scan-button\"]')
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')
      await page.fill('[data-testid=\"folder-input\"]', path.dirname(corruptedPath))
      await page.check('[data-testid=\"mp3-checkbox\"]')
      await page.click('[data-testid=\"start-scan-button\"]')

      // Start analysis which will fail
      await page.click('[data-testid=\"library-tab\"]')
      await page.waitForSelector('[data-testid=\"track-row\"]')
      await page.locator('[data-testid=\"track-checkbox\"]').first().check()
      await page.click('[data-testid=\"analyze-selected-button\"]')

      await page.waitForSelector('[data-testid=\"analysis-dialog\"]')
      await page.check('[data-testid=\"key-analysis-checkbox\"]')
      await page.click('[data-testid=\"start-analysis-button\"]')

      // Monitor for failed job
      await page.click('[data-testid=\"analysis-tab\"]')
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"failed\")', { timeout: 30000 })

      const failedJob = page.locator('[data-testid=\"job-row\"]:has-text(\"failed\")')

      // Retry the job
      const retryButton = failedJob.locator('[data-testid=\"retry-button\"]')
      await expect(retryButton).toBeVisible()
      await retryButton.click()

      // Job should change to queued
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"queued\")')

      // Should fail again
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"failed\")', { timeout: 30000 })

      // Check attempt count increased
      await failedJob.click()
      await page.waitForSelector('[data-testid=\"job-details\"]')

      const jobDetails = page.locator('[data-testid=\"job-details\"]')
      await expect(jobDetails).toContainText('Attempts: 2')
    })
  })

  test.describe('Export Job Workflow', () => {
    test('should export selected tracks', async () => {
      const page = await electronApp.firstWindow()

      // Ensure we have tracks to export
      await test.step('Add tracks to library', async () => {
        await page.click('[data-testid=\"scan-button\"]')
        await page.waitForSelector('[data-testid=\"scan-dialog\"]')
        await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/test-music'))
        await page.check('[data-testid=\"mp3-checkbox\"]')
        await page.click('[data-testid=\"start-scan-button\"]')

        await page.click('[data-testid=\"analysis-tab\"]')
        await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"completed\")', { timeout: 30000 })
      })

      // Select tracks to export
      await page.click('[data-testid=\"library-tab\"]')
      await page.waitForSelector('[data-testid=\"track-row\"]')

      await page.locator('[data-testid=\"track-checkbox\"]').first().check()
      await page.locator('[data-testid=\"track-checkbox\"]').nth(1).check()

      // Start export
      await page.click('[data-testid=\"export-selected-button\"]')

      // Configure export settings
      await page.waitForSelector('[data-testid=\"export-dialog\"]')
      await page.selectOption('[data-testid=\"export-format\"]', 'mp3')
      await page.selectOption('[data-testid=\"export-quality\"]', '320')
      await page.fill('[data-testid=\"export-destination\"]', '/tmp/cleancue-exports')

      await page.click('[data-testid=\"start-export-button\"]')

      // Monitor export job (should have highest priority)
      await page.click('[data-testid=\"analysis-tab\"]')
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"batch_export\")')

      const exportJob = page.locator('[data-testid=\"job-row\"]:has-text(\"batch_export\")')

      // Export jobs should have priority 1 (highest)
      await exportJob.click()
      await page.waitForSelector('[data-testid=\"job-details\"]')

      const jobDetails = page.locator('[data-testid=\"job-details\"]')
      await expect(jobDetails).toContainText('Priority: 1')

      // Wait for export to complete
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"completed\")', { timeout: 60000 })

      // Verify export results
      await exportJob.click()
      await expect(jobDetails).toContainText('exportedFiles')
      await expect(jobDetails).toContainText('path')
    })
  })

  test.describe('Job Management Features', () => {
    test('should cancel running jobs', async () => {
      const page = await electronApp.firstWindow()

      // Start a long-running scan job
      await page.click('[data-testid=\"scan-button\"]')
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')
      await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/large-music-library'))
      await page.check('[data-testid=\"mp3-checkbox\"]')
      await page.click('[data-testid=\"start-scan-button\"]')

      // Wait for job to start running
      await page.click('[data-testid=\"analysis-tab\"]')
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"running\")', { timeout: 10000 })

      const runningJob = page.locator('[data-testid=\"job-row\"]:has-text(\"running\")')

      // Cancel the job
      const cancelButton = runningJob.locator('[data-testid=\"cancel-button\"]')
      await expect(cancelButton).toBeVisible()
      await cancelButton.click()

      // Job should be cancelled
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"cancelled\")')

      const cancelledJob = page.locator('[data-testid=\"job-row\"]:has-text(\"cancelled\")')
      await expect(cancelledJob).toContainText('cancelled')
    })

    test('should abort all jobs', async () => {
      const page = await electronApp.firstWindow()

      // Start multiple jobs
      await Promise.all([
        // Scan job
        test.step('Start scan job', async () => {
          await page.click('[data-testid=\"scan-button\"]')
          await page.waitForSelector('[data-testid=\"scan-dialog\"]')
          await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/test-music'))
          await page.check('[data-testid=\"mp3-checkbox\"]')
          await page.click('[data-testid=\"start-scan-button\"]')
        }),

        // Analysis jobs
        test.step('Start analysis jobs', async () => {
          await page.click('[data-testid=\"library-tab\"]')
          await page.waitForSelector('[data-testid=\"track-row\"]')
          await page.locator('[data-testid=\"track-checkbox\"]').first().check()
          await page.click('[data-testid=\"analyze-selected-button\"]')
          await page.waitForSelector('[data-testid=\"analysis-dialog\"]')
          await page.check('[data-testid=\"key-analysis-checkbox\"]')
          await page.click('[data-testid=\"start-analysis-button\"]')
        })
      ])

      // Go to job management
      await page.click('[data-testid=\"analysis-tab\"]')

      // Wait for multiple jobs to be visible
      await page.waitForFunction(
        () => {
          const jobRows = document.querySelectorAll('[data-testid=\"job-row\"]')
          return jobRows.length >= 2
        }
      )

      // Abort all jobs
      await page.click('[data-testid=\"abort-all-button\"]')

      // Confirm abort
      await page.click('[data-testid=\"confirm-abort-button\"]')

      // All jobs should be cancelled
      await page.waitForFunction(
        () => {
          const runningJobs = document.querySelectorAll('[data-testid=\"job-row\"]').filter(
            job => !job.textContent.includes('cancelled')
          )
          return runningJobs.length === 0
        },
        { timeout: 10000 }
      )
    })

    test('should filter jobs by type and status', async () => {
      const page = await electronApp.firstWindow()

      // Create jobs of different types
      // [Previous test steps to create various jobs...]

      await page.click('[data-testid=\"analysis-tab\"]')

      // Test type filter
      await page.selectOption('[data-testid=\"type-filter\"]', 'scan')

      // Should only show scan jobs
      const visibleJobs = page.locator('[data-testid=\"job-row\"]:visible')
      const jobTexts = await visibleJobs.allTextContents()

      for (const text of jobTexts) {
        expect(text).toContain('scan')
      }

      // Test status filter
      await page.selectOption('[data-testid=\"type-filter\"]', '') // Clear type filter
      await page.selectOption('[data-testid=\"status-filter\"]', 'completed')

      // Should only show completed jobs
      const completedJobs = page.locator('[data-testid=\"job-row\"]:visible')
      const completedTexts = await completedJobs.allTextContents()

      for (const text of completedTexts) {
        expect(text).toContain('completed')
      }
    })
  })

  test.describe('Real-time Updates', () => {
    test('should show real-time progress updates', async () => {
      const page = await electronApp.firstWindow()

      // Start a scan job
      await page.click('[data-testid=\"scan-button\"]')
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')
      await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/test-music'))
      await page.check('[data-testid=\"mp3-checkbox\"]')
      await page.click('[data-testid=\"start-scan-button\"]')

      // Monitor job progress in real-time
      await page.click('[data-testid=\"analysis-tab\"]')
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"scan\")')

      const scanJob = page.locator('[data-testid=\"job-row\"]:has-text(\"scan\")')
      const progressBar = scanJob.locator('[data-testid=\"progress-bar\"]')

      // Monitor progress changes
      let previousProgress = 0
      let progressIncreased = false

      // Poll for progress changes
      const checkProgress = async () => {
        const progressText = await scanJob.locator('[data-testid=\"progress-text\"]').textContent()
        const currentProgress = parseInt(progressText.match(/(\d+)%/)?.[1] || '0')

        if (currentProgress > previousProgress) {
          progressIncreased = true
          previousProgress = currentProgress
        }

        return currentProgress === 100
      }

      // Wait for progress to increase and complete
      await page.waitForFunction(checkProgress, { timeout: 30000 })

      expect(progressIncreased).toBe(true)
    })

    test('should update job list when jobs complete', async () => {
      const page = await electronApp.firstWindow()

      // Start multiple jobs and monitor status changes
      await page.click('[data-testid=\"scan-button\"]')
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')
      await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/test-music'))
      await page.check('[data-testid=\"mp3-checkbox\"]')
      await page.click('[data-testid=\"start-scan-button\"]')

      await page.click('[data-testid=\"analysis-tab\"]')

      // Track status changes
      const statusChanges = []

      const trackStatusChange = async () => {
        const jobRow = page.locator('[data-testid=\"job-row\"]:has-text(\"scan\")').first()
        const statusElement = jobRow.locator('[data-testid=\"job-status\"]')
        const status = await statusElement.textContent()

        if (!statusChanges.includes(status)) {
          statusChanges.push(status)
        }

        return status === 'completed'
      }

      await page.waitForFunction(trackStatusChange, { timeout: 30000 })

      // Should have seen status progression
      expect(statusChanges).toContain('queued')
      expect(statusChanges).toContain('running')
      expect(statusChanges).toContain('completed')
    })
  })

  test.describe('Error Recovery', () => {
    test('should handle application restart during job execution', async () => {
      const page = await electronApp.firstWindow()

      // Start a long-running job
      await page.click('[data-testid=\"scan-button\"]')
      await page.waitForSelector('[data-testid=\"scan-dialog\"]')
      await page.fill('[data-testid=\"folder-input\"]', path.join(__dirname, 'fixtures/large-music-library'))
      await page.check('[data-testid=\"mp3-checkbox\"]')
      await page.click('[data-testid=\"start-scan-button\"]')

      // Wait for job to start
      await page.click('[data-testid=\"analysis-tab\"]')
      await page.waitForSelector('[data-testid=\"job-row\"]:has-text(\"running\")', { timeout: 10000 })

      // Simulate app restart
      await electronApp.close()

      // Restart app
      electronApp = await _electron.launch({
        args: [path.join(__dirname, '../apps/desktop/dist/main.js')],
        timeout: 30000
      })

      const newPage = await electronApp.firstWindow()

      // Check that running job was recovered to queued state
      await newPage.click('[data-testid=\"analysis-tab\"]')
      await newPage.waitForSelector('[data-testid=\"job-row\"]')

      const recoveredJob = newPage.locator('[data-testid=\"job-row\"]:has-text(\"scan\")')

      // Job should be queued (recovered from running state)
      await expect(recoveredJob).toContainText('queued')
    })
  })
})