# Comprehensive Testing Framework

## Overview

CleanCue's testing framework is designed to be as robust and comprehensive as the job management system itself. The framework provides multiple layers of testing to ensure reliability, performance, and correctness across all components.

## Test Architecture

### Test Layers

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Component interaction testing
3. **Database Tests** - Data layer validation
4. **UI Component Tests** - React component testing
5. **Performance Tests** - Load and scalability testing
6. **End-to-End Tests** - Complete workflow validation
7. **Mock System** - Realistic test execution environment

### Test File Organization

```
packages/
├── engine/src/
│   ├── job-manager.test.ts           # Unit tests for JobManager
│   ├── job-lifecycle.integration.test.ts  # Integration tests
│   ├── database-jobs.test.ts         # Database operation tests
│   ├── job-performance.test.ts       # Performance and scalability
│   └── mock-job-executor.ts          # Mock execution system
├── ui/src/
│   └── components/
│       └── JobManagement.test.tsx    # UI component tests
└── tests/
    └── job-system-e2e.test.js        # End-to-end workflows
```

## Unit Testing (`job-manager.test.ts`)

### Test Coverage

- ✅ Job creation for all types (scan, analyze, export, batch)
- ✅ Job lifecycle management (queue, execute, complete)
- ✅ Priority-based processing
- ✅ Error handling and retry logic
- ✅ Job cancellation and cleanup
- ✅ Batch operation coordination
- ✅ Event emission and handling
- ✅ Recovery from failures
- ✅ Performance with large datasets
- ✅ Concurrency limits and control

### Key Test Scenarios

```typescript
// Job creation with proper parameters
it('should create a scan job with correct parameters', async () => {
  const jobId = await jobManager.createScanJob(paths, extensions, true)
  expect(jobId).toBeDefined()
  // Verify job stored correctly in database
})

// Priority-based processing
it('should process jobs in priority order', async () => {
  // Create jobs with different priorities
  // Verify high-priority jobs execute first
})

// Error handling
it('should handle database errors gracefully', async () => {
  mockDb.createJob.mockRejectedValueOnce(new Error('Database error'))
  await expect(jobManager.createScanJob(['/test'])).rejects.toThrow()
})
```

### Mock Configuration

```typescript
const mockDb = {
  createJob: vi.fn(),
  getJob: vi.fn(),
  getAllJobs: vi.fn(),
  updateJobStatus: vi.fn(),
  // ... comprehensive database mocking
}

const mockWorkerPool = {
  submitJob: vi.fn(),
  killAllJobs: vi.fn(),
  getActiveJobs: vi.fn().mockReturnValue([])
}
```

## Integration Testing (`job-lifecycle.integration.test.ts`)

### Complete Workflow Testing

- ✅ Scan job from creation to completion
- ✅ Batch analysis with child job coordination
- ✅ Export job execution with high priority
- ✅ Job recovery after application restart
- ✅ Cross-component communication
- ✅ Real-time progress updates
- ✅ Error propagation and handling

### Test Environment Setup

```typescript
beforeEach(async () => {
  // Create temporary database
  tempDbPath = path.join(__dirname, `test-db-${Date.now()}.db`)

  // Initialize engine with test configuration
  engine = new Engine({
    databasePath: tempDbPath,
    cachePath: path.join(__dirname, 'test-cache'),
    workers: mockWorkerPool
  })

  await engine.initialize()
})
```

### Workflow Examples

```typescript
// Complete scan workflow
it('should execute a complete scan job lifecycle', async () => {
  const jobId = await engine.createScanJob(['/test/music'], ['mp3'])

  // Queue the job
  await engine.jobManager.queueJobs()

  // Process with mocked execution
  vi.spyOn(engine.jobManager, 'executeScanJob').mockResolvedValue({
    success: true,
    tracksFound: 15,
    tracksAdded: 12
  })

  await engine.jobManager.processQueue()

  // Verify completion
  const job = await engine.getJobById(jobId)
  expect(job.status).toBe('completed')
})
```

## Database Testing (`database-jobs.test.ts`)

### Comprehensive Database Validation

- ✅ Job CRUD operations
- ✅ Query performance with large datasets
- ✅ Data integrity and constraints
- ✅ Concurrent operation safety
- ✅ Parent-child relationship management
- ✅ Index effectiveness
- ✅ Edge cases and error handling

### Performance Testing

```typescript
it('should handle inserting many jobs efficiently', async () => {
  const jobCount = 1000
  const startTime = Date.now()

  // Create 1000 jobs in batches
  const promises = []
  for (let i = 0; i < jobCount; i++) {
    promises.push(db.createJob(/*...*/))
  }

  await Promise.all(promises)
  const duration = Date.now() - startTime

  // Should complete in under 5 seconds
  expect(duration).toBeLessThan(5000)
})
```

### Data Integrity Testing

```typescript
it('should maintain referential integrity for parent-child relationships', async () => {
  await db.createJob(parentId, 'batch_analyze', /*...*/)
  await db.createJob(childId, 'analyze', /*...*/, parentId)

  const childJobs = await db.getJobsByParentId(parentId)
  expect(childJobs).toHaveLength(1)
  expect(childJobs[0].id).toBe(childId)
})
```

## UI Component Testing (`JobManagement.test.tsx`)

### React Component Validation

- ✅ Component rendering with various data states
- ✅ User interaction handling (cancel, retry, filter)
- ✅ Real-time updates from job events
- ✅ Error display and handling
- ✅ Accessibility compliance
- ✅ Performance with large job lists
- ✅ Keyboard navigation support

### Mock Electron API

```typescript
const mockElectronAPI = {
  getAllJobs: vi.fn(),
  cancelJob: vi.fn(),
  retryJob: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})
```

### Interactive Testing

```typescript
it('should cancel a running job', async () => {
  mockElectronAPI.getAllJobs.mockResolvedValue([mockRunningJob])
  render(<JobManagement />)

  await waitFor(() => {
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
  })

  expect(mockElectronAPI.cancelJob).toHaveBeenCalledWith('running-job')
})
```

## Performance Testing (`job-performance.test.ts`)

### Scalability Validation

- ✅ Large-scale job creation (10,000+ jobs)
- ✅ High-volume processing (1,000+ concurrent)
- ✅ Memory usage optimization
- ✅ Database query performance
- ✅ Batch operation efficiency
- ✅ Priority processing under load

### Benchmark Testing

```typescript
it('should create 10,000 jobs quickly', async () => {
  const jobCount = 10000
  const startTime = performance.now()

  // Create jobs in optimized batches
  for (let batch = 0; batch < batches; batch++) {
    const promises = []
    for (let i = batchStart; i < batchEnd; i++) {
      promises.push(engine.jobManager.createJob(/*...*/))
    }
    await Promise.all(promises)
  }

  const duration = performance.now() - startTime
  expect(duration).toBeLessThan(10000) // Under 10 seconds
})
```

### Memory Testing

```typescript
it('should handle large job payloads efficiently', async () => {
  const initialMemory = process.memoryUsage()

  // Create jobs with large payloads
  for (let i = 0; i < 500; i++) {
    await engine.jobManager.createJob('batch_analyze', 5, largePayload)
  }

  const finalMemory = process.memoryUsage()
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

  expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024) // Under 500MB
})
```

## End-to-End Testing (`job-system-e2e.test.js`)

### Complete User Workflows

- ✅ Scan folder and add tracks to library
- ✅ Analyze tracks with progress monitoring
- ✅ Export tracks with priority handling
- ✅ Job cancellation and retry operations
- ✅ Application restart during job execution
- ✅ Error recovery and user feedback

### Playwright Configuration

```javascript
// Launch Electron app for testing
electronApp = await _electron.launch({
  args: [path.join(__dirname, '../apps/desktop/dist/main.js')],
  timeout: 30000
})

const page = await electronApp.firstWindow()
```

### User Interaction Testing

```javascript
it('should create, execute, and complete a scan job', async () => {
  // Navigate to scan dialog
  await page.click('[data-testid="scan-button"]')

  // Configure scan
  await page.fill('[data-testid="folder-input"]', testMusicPath)
  await page.check('[data-testid="mp3-checkbox"]')

  // Start scan
  await page.click('[data-testid="start-scan-button"]')

  // Monitor in job management
  await page.click('[data-testid="analysis-tab"]')

  // Verify completion
  await page.waitForSelector('[data-testid="job-row"]:has-text("completed")')
})
```

## Mock Execution System (`mock-job-executor.ts`)

### Realistic Test Environment

The mock system provides comprehensive job execution simulation:

```typescript
export class MockJobExecutor extends EventEmitter {
  async executeScanJob(job: BaseJob): Promise<MockJobResult> {
    // Simulate realistic scan behavior
    const tracksFound = this.simulateTrackDiscovery(payload.paths)
    const tracksAdded = Math.floor(tracksFound * 0.8)

    return await this.simulateJobExecution(job, async () => ({
      success: true,
      tracksFound,
      tracksAdded,
      tracksUpdated: tracksFound - tracksAdded
    }))
  }
}
```

### Configuration Options

```typescript
const mockExecutor = new MockJobExecutor({
  minDuration: 10,        // Minimum execution time
  maxDuration: 100,       // Maximum execution time
  failureRate: 0.05,      // 5% failure rate
  enableProgressUpdates: true,
  maxConcurrentJobs: 10
})
```

### Scenario Testing

```typescript
// Predefined test scenarios
export function createMockExecutor(scenario: 'success' | 'failures' | 'mixed' | 'slow') {
  const scenarios = {
    success: { failureRate: 0, minDuration: 10, maxDuration: 50 },
    failures: { failureRate: 0.3, minDuration: 5, maxDuration: 25 },
    mixed: { failureRate: 0.1, minDuration: 20, maxDuration: 100 },
    slow: { failureRate: 0.05, minDuration: 500, maxDuration: 2000 }
  }

  return new MockJobExecutor(scenarios[scenario])
}
```

## Test Execution

### Running Individual Test Suites

```bash
# Unit tests
pnpm --filter @cleancue/engine test job-manager.test.ts

# Integration tests
pnpm --filter @cleancue/engine test job-lifecycle.integration.test.ts

# Database tests
pnpm --filter @cleancue/engine test database-jobs.test.ts

# UI tests
pnpm --filter @cleancue/ui test JobManagement.test.tsx

# Performance tests
pnpm --filter @cleancue/engine test job-performance.test.ts

# End-to-end tests
pnpm test:e2e job-system-e2e.test.js
```

### Running Complete Test Suite

```bash
# Run all job management tests
pnpm test:jobs

# Run with coverage reporting
pnpm test:coverage

# Run performance benchmarks
pnpm test:performance

# Run full CI pipeline
pnpm run ci
```

### Continuous Integration

The testing framework integrates with GitHub Actions:

```yaml
name: Job Management Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Run unit tests
        run: pnpm test:unit
      - name: Run integration tests
        run: pnpm test:integration
      - name: Run performance tests
        run: pnpm test:performance
```

## Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 95% line coverage
- **Integration Tests**: 90% workflow coverage
- **Database Tests**: 100% CRUD operation coverage
- **UI Tests**: 85% component interaction coverage
- **Performance Tests**: Key bottleneck validation
- **E2E Tests**: Critical user path coverage

### Coverage Reporting

```bash
# Generate coverage report
pnpm test:coverage

# View detailed coverage
open coverage/index.html
```

## Test Data Management

### Test Fixtures

```
tests/fixtures/
├── test-music/          # Sample audio files
├── corrupted-audio.mp3  # Intentionally corrupted file
├── large-music-library/ # Performance testing data
└── test-database.db     # Sample database states
```

### Test Database Management

```typescript
// Clean database state for each test
beforeEach(async () => {
  tempDbPath = path.join(__dirname, `test-db-${Date.now()}.db`)
  db = new Database(tempDbPath)
  await db.initialize()
})

afterEach(async () => {
  await db.close()
  await fs.unlink(tempDbPath)
})
```

## Debugging and Troubleshooting

### Test Debugging

```typescript
// Enable verbose logging in tests
process.env.DEBUG = 'cleancue:*'

// Add test timeouts for slow operations
it('should handle large dataset', async () => {
  // Test implementation
}, 30000) // 30 second timeout
```

### Common Test Issues

1. **Database Lock Errors**: Ensure proper cleanup in afterEach hooks
2. **Memory Leaks**: Monitor memory usage in performance tests
3. **Race Conditions**: Use proper async/await patterns
4. **Mock Configuration**: Verify mock implementations match real behavior

### Test Performance Monitoring

```typescript
// Track test execution time
const testStart = performance.now()
// ... test execution
const testDuration = performance.now() - testStart
console.log(`Test completed in ${testDuration.toFixed(2)}ms`)
```

## Best Practices

### Test Design

1. **Isolation**: Each test should be independent and isolated
2. **Clarity**: Test names should clearly describe what is being tested
3. **Completeness**: Cover both happy path and error scenarios
4. **Performance**: Tests should run quickly to enable rapid feedback
5. **Maintenance**: Keep tests simple and maintainable

### Mock Strategy

1. **Realistic Behavior**: Mocks should behave like real implementations
2. **Error Simulation**: Include failure scenarios in mocks
3. **Performance Characteristics**: Simulate realistic timing
4. **State Management**: Maintain proper mock state between tests

### Data Management

1. **Clean State**: Start each test with clean, known state
2. **Test Data**: Use consistent, representative test data
3. **Isolation**: Avoid shared state between tests
4. **Cleanup**: Always clean up resources after tests

## Future Enhancements

### Planned Improvements

1. **Property-Based Testing**: Add QuickCheck-style property testing
2. **Mutation Testing**: Validate test quality with mutation testing
3. **Visual Regression**: Add screenshot testing for UI components
4. **Load Testing**: Continuous performance monitoring
5. **Chaos Engineering**: Random failure injection for resilience testing

### Metrics and Monitoring

1. **Test Execution Time**: Track and optimize slow tests
2. **Coverage Trends**: Monitor coverage changes over time
3. **Flaky Test Detection**: Identify and fix unstable tests
4. **Performance Regression**: Automated performance monitoring

## Conclusion

The comprehensive testing framework ensures the job management system operates reliably under all conditions. With multiple test layers, realistic mocking, and thorough coverage, the framework provides confidence in system stability and performance.

For questions or contributions to the testing framework, refer to the test files and examples throughout the codebase.