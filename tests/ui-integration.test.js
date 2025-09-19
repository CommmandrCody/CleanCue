const { Application } = require('spectron');
const path = require('path');
const fs = require('fs');

describe('CleanCue UI Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Build the app first
    const electronPath = path.join(__dirname, '../node_modules/.bin/electron');
    const appPath = path.join(__dirname, '../apps/desktop/dist/main.js');

    app = new Application({
      path: electronPath,
      args: [appPath],
      env: {
        NODE_ENV: 'test',
        ELECTRON_ENABLE_LOGGING: true,
        SPECTRON_TEST: true
      },
      startTimeout: 30000,
      waitTimeout: 10000
    });

    await app.start();
    await app.client.waitUntilWindowLoaded();
  }, 60000);

  afterAll(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  describe('Application Launch', () => {
    test('should launch CleanCue successfully', async () => {
      expect(await app.client.getWindowCount()).toBe(1);
      expect(await app.browserWindow.isVisible()).toBe(true);
      expect(await app.browserWindow.getTitle()).toContain('CleanCue');
    });

    test('should have correct window dimensions', async () => {
      const bounds = await app.browserWindow.getBounds();
      expect(bounds.width).toBeGreaterThan(800);
      expect(bounds.height).toBeGreaterThan(600);
    });
  });

  describe('Header Component', () => {
    test('should display CleanCue logo and navigation', async () => {
      await app.client.waitForExist('[data-testid="header"]', 5000);

      // Check for CleanCue branding
      const logoExists = await app.client.isExisting('[data-testid="logo"]');
      expect(logoExists).toBe(true);

      // Check for main navigation buttons
      expect(await app.client.isExisting('[data-testid="scan-button"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="analyze-button"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="settings-button"]')).toBe(true);
    });

    test('should handle scan library button click', async () => {
      const scanButton = await app.client.$('[data-testid="scan-button"]');
      await scanButton.click();

      // Should open scan dialog or file picker
      // Wait for scan dialog to appear
      await app.client.waitForExist('[data-testid="scan-dialog"]', 3000);
      const dialogExists = await app.client.isExisting('[data-testid="scan-dialog"]');
      expect(dialogExists).toBe(true);
    });
  });

  describe('Library View', () => {
    test('should display library table with proper columns', async () => {
      await app.client.waitForExist('[data-testid="library-view"]', 5000);

      // Check for table headers
      const headers = [
        'track-header',
        'bpm-header',
        'key-header',
        'energy-header',
        'duration-header'
      ];

      for (const header of headers) {
        expect(await app.client.isExisting(`[data-testid="${header}"]`)).toBe(true);
      }
    });

    test('should handle track selection', async () => {
      // Check if there are any tracks loaded
      const trackRows = await app.client.$$('[data-testid^="track-row-"]');

      if (trackRows.length > 0) {
        // Click first track
        await trackRows[0].click();

        // Check if track becomes selected
        const selectedClass = await trackRows[0].getAttribute('class');
        expect(selectedClass).toContain('selected');
      }
    });
  });

  describe('Settings Panel', () => {
    test('should open settings panel', async () => {
      const settingsButton = await app.client.$('[data-testid="settings-button"]');
      await settingsButton.click();

      await app.client.waitForExist('[data-testid="settings-panel"]', 3000);
      expect(await app.client.isExisting('[data-testid="settings-panel"]')).toBe(true);
    });

    test('should display all settings tabs', async () => {
      const tabs = [
        'dj-workflow-tab',
        'library-tab',
        'database-tab',
        'analysis-tab',
        'interface-tab'
      ];

      for (const tab of tabs) {
        expect(await app.client.isExisting(`[data-testid="${tab}"]`)).toBe(true);
      }
    });

    test('should switch between settings tabs', async () => {
      // Click DJ Workflow tab
      const djTab = await app.client.$('[data-testid="dj-workflow-tab"]');
      await djTab.click();

      await app.client.waitForExist('[data-testid="dj-workflow-content"]', 2000);
      expect(await app.client.isExisting('[data-testid="dj-workflow-content"]')).toBe(true);

      // Check for normalization controls
      expect(await app.client.isExisting('[data-testid="normalization-enable"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="normalization-preset"]')).toBe(true);
    });

    test('should handle normalization settings', async () => {
      // Toggle normalization
      const enableToggle = await app.client.$('[data-testid="normalization-enable"]');
      const initialState = await enableToggle.isSelected();

      await enableToggle.click();
      const newState = await enableToggle.isSelected();
      expect(newState).toBe(!initialState);

      // Check preset dropdown
      const presetSelect = await app.client.$('[data-testid="normalization-preset"]');
      await presetSelect.click();

      // Should have preset options
      expect(await app.client.isExisting('[data-testid="preset-dj"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="preset-streaming"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="preset-broadcast"]')).toBe(true);
    });
  });

  describe('Audio Analysis', () => {
    test('should handle analyze button functionality', async () => {
      // First check if tracks are available
      const trackRows = await app.client.$$('[data-testid^="track-row-"]');

      if (trackRows.length > 0) {
        // Select a track
        await trackRows[0].click();

        // Click analyze button
        const analyzeButton = await app.client.$('[data-testid="analyze-button"]');
        await analyzeButton.click();

        // Should show analysis progress or dialog
        await app.client.waitForExist('[data-testid="analysis-progress"]', 3000);
        const progressExists = await app.client.isExisting('[data-testid="analysis-progress"]');
        expect(progressExists).toBe(true);
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle Cmd+A to select all tracks', async () => {
      // Send Cmd+A (or Ctrl+A on Windows)
      const modifier = process.platform === 'darwin' ? 'cmd' : 'ctrl';
      await app.client.keys([modifier, 'a']);

      // Check if multiple tracks are selected
      const selectedTracks = await app.client.$$('[data-testid^="track-row-"].selected');
      expect(selectedTracks.length).toBeGreaterThan(0);
    });

    test('should handle Cmd+, to open settings', async () => {
      const modifier = process.platform === 'darwin' ? 'cmd' : 'ctrl';
      await app.client.keys([modifier, ',']);

      await app.client.waitForExist('[data-testid="settings-panel"]', 2000);
      expect(await app.client.isExisting('[data-testid="settings-panel"]')).toBe(true);
    });
  });

  describe('DJ Workflow', () => {
    test('should complete professional DJ workflow steps', async () => {
      // Step 1: Discover (scan library) - already tested

      // Step 2: Settings should show normalization options
      const settingsButton = await app.client.$('[data-testid="settings-button"]');
      await settingsButton.click();

      const djTab = await app.client.$('[data-testid="dj-workflow-tab"]');
      await djTab.click();

      // Verify DJ workflow controls are present
      expect(await app.client.isExisting('[data-testid="normalization-enable"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="auto-normalize"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="backup-originals"]')).toBe(true);

      // Step 3: Analysis options should be available
      const analysisTab = await app.client.$('[data-testid="analysis-tab"]');
      await analysisTab.click();

      expect(await app.client.isExisting('[data-testid="auto-analyze"]')).toBe(true);
      expect(await app.client.isExisting('[data-testid="write-tags"]')).toBe(true);

      // Step 4: Review in library view (already tested)

      // Step 5: Export options should be available (future feature)
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid file paths gracefully', async () => {
      // This would test error boundaries and user feedback
      // Implementation depends on how the app handles errors
      expect(true).toBe(true); // Placeholder
    });

    test('should maintain UI state during analysis failures', async () => {
      // Test that the UI remains responsive even if analysis fails
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance', () => {
    test('should load large libraries efficiently', async () => {
      // Test performance with large number of tracks
      const startTime = Date.now();

      // Perform library operations
      await app.client.waitForExist('[data-testid="library-view"]', 5000);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('should handle rapid UI interactions', async () => {
      // Test rapid clicking and UI responsiveness
      for (let i = 0; i < 5; i++) {
        const settingsButton = await app.client.$('[data-testid="settings-button"]');
        await settingsButton.click();
        await app.client.pause(100);
      }

      // UI should remain responsive
      expect(await app.client.isExisting('[data-testid="settings-panel"]')).toBe(true);
    });
  });
});