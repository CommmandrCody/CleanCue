// Jest setup file for CleanCue tests
jest.setTimeout(30000);

afterAll(async () => {
  if (global.testCleanupFunctions) {
    for (const cleanup of global.testCleanupFunctions) {
      try {
        await cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    }
  }
});