#!/usr/bin/env node

import { StandaloneCLI } from './cli-standalone.js';

const CLI_VERSION = '0.2.4';

// Only run CLI if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  // Run the standalone CLI (no engine dependencies)
  const cli = new StandaloneCLI();

  // Show version header only for interactive commands (not help/version)
  const command = process.argv[2];
  if (command && !['--help', '-h', '--version', '-v', 'help'].includes(command)) {
    console.log(`CleanCue CLI v${CLI_VERSION}`);
  }

  cli.run().catch(error => {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

// Export standalone CLI for programmatic use (no engine dependencies)
export { StandaloneCLI } from './cli-standalone.js';
export * from './commands/index-standalone.js';
export * from './core/file-scanner.js';
export * from './core/metadata-reader.js';
export * from './types.js';

// Legacy exports for backward compatibility (but these require engine)
export { CleanCueCLI } from './cli.js';
export { CLIInterface } from './cli-interface.js';