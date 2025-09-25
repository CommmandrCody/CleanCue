import path from 'path';
import { CleanCueEngine } from '@cleancue/simple-engine';

export function setupEventHandlers(engine: CleanCueEngine): void {
  // Scan progress reporting
  engine.on('scan:started', (data: any) => {
    console.log(`🔍 Starting scan of ${data.paths.length} path(s)...`);
  });

  engine.on('scan:progress', (data: any) => {
    const percentage = Math.round((data.current / data.total) * 100);
    process.stdout.write(`\r📂 Scanning: ${percentage}% (${data.current}/${data.total}) - ${path.basename(data.currentFile)}`);
  });

  engine.on('scan:completed', (data: any) => {
    console.log(`\n✅ Scan complete: ${data.tracksAdded} added, ${data.tracksUpdated} updated, ${data.errors.length} errors`);
    if (data.errors.length > 0) {
      console.log('❌ Errors encountered:');
      data.errors.slice(0, 5).forEach((error: any) => {
        console.log(`   ${error.path}: ${error.error}`);
      });
      if (data.errors.length > 5) {
        console.log(`   ... and ${data.errors.length - 5} more errors`);
      }
    }
  });

  // Analysis progress reporting
  engine.on('analysis:started', (data: any) => {
    console.log(`🔬 Starting ${data.analyzer} analysis for track ${data.trackId}...`);
  });

  engine.on('analysis:progress', (data: any) => {
    process.stdout.write(`\r🔬 Analyzing: ${data.progress}%`);
  });

  engine.on('analysis:completed', (data: any) => {
    console.log(`\n✅ ${data.analyzer} analysis complete for track ${data.trackId}`);
  });
}