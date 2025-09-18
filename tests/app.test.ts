import { TestSetup } from './setup'

describe('CleanCue App Tests', () => {
  let testSetup: any

  beforeEach(() => {
    testSetup = new TestSetup()
  })

  afterEach(async () => {
    await testSetup.stopApp()
  })

  test('should start the app successfully', async () => {
    await testSetup.startApp()

    expect(testSetup.app).toBeTruthy()
    expect(testSetup.app?.isRunning()).toBe(true)

    const windowCount = await testSetup.getWindowCount()
    expect(windowCount).toBe(1)
  }, 15000)

  test('should have correct window title', async () => {
    await testSetup.startApp()

    const title = await testSetup.getTitle()
    expect(title).toBe('CleanCue')
  }, 15000)

  test('should not crash on startup', async () => {
    await testSetup.startApp()

    // Wait a moment for any startup crashes
    await new Promise(resolve => setTimeout(resolve, 2000))

    expect(testSetup.app?.isRunning()).toBe(true)
  }, 15000)

  test('should handle graceful shutdown', async () => {
    await testSetup.startApp()

    expect(testSetup.app?.isRunning()).toBe(true)

    await testSetup.stopApp()

    expect(testSetup.app?.isRunning()).toBe(false)
  }, 15000)
})