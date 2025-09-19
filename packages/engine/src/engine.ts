import { CleanCueDatabase } from './database';
import { FileScanner } from './scanner';
import { WorkerPool } from './workers';
import { EventBus } from './events';
import { ConfigManager } from './config';
import { USBExporter } from './usb-exporter';
import { StemSeparationService, StemSeparationSettings, StemSeparationResult } from './stem-separation-service';
import { YouTubeDownloaderService, YouTubeDownloadOptions, YouTubeVideoInfo, YouTubeDownloadResult, YouTubeSearchResult } from './youtube-downloader-service';
import type {
  Track, Analysis, ScanResult, HealthReport, ExportOptions,
  ExportFormat, CleanCueEvent, CuePoint, Config, USBExportOptions, USBExportResult
} from '@cleancue/shared';
import { promises as fs } from 'fs';
import path from 'path';

export class CleanCueEngine {
  private db: CleanCueDatabase;
  private scanner: FileScanner;
  private workerPool: WorkerPool;
  private events: EventBus;
  private config: ConfigManager;
  private usbExporter: USBExporter;
  private stemSeparationService: StemSeparationService;
  private youtubeDownloader: YouTubeDownloaderService;

  constructor(configPath?: string) {
    this.config = new ConfigManager(configPath);
    this.db = new CleanCueDatabase(this.config.get('database.path'));
    this.scanner = new FileScanner(this.config.get('scanning'));
    this.workerPool = new WorkerPool(this.config.get('workers'));
    this.events = new EventBus();
    this.usbExporter = new USBExporter();
    this.stemSeparationService = new StemSeparationService(this.db, this.config.get('stems.outputPath'));
    this.youtubeDownloader = new YouTubeDownloaderService(
      this.config.get('workers.workersPath'),
      this.config.get('workers.pythonPath')
    );

    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  private setupEventHandlers() {
    // Forward worker events through main event bus
    this.workerPool.on('job:started', (data) => {
      this.events.emit('analysis:started', data);
    });

    this.workerPool.on('job:progress', (data) => {
      this.events.emit('analysis:progress', data);
    });

    this.workerPool.on('job:completed', (data) => {
      this.events.emit('analysis:completed', data);
    });

    // Forward YouTube downloader events
    this.youtubeDownloader.on('download:completed', (data) => {
      this.events.emit('youtube:download:completed', data);
    });

    this.youtubeDownloader.on('download:failed', (data) => {
      this.events.emit('youtube:download:failed', data);
    });

    this.youtubeDownloader.on('batch:started', (data) => {
      this.events.emit('youtube:batch:started', data);
    });

    this.youtubeDownloader.on('batch:progress', (data) => {
      this.events.emit('youtube:batch:progress', data);
    });

    this.youtubeDownloader.on('batch:completed', (data) => {
      this.events.emit('youtube:batch:completed', data);
    });
  }

  // Event management
  on<T extends CleanCueEvent>(event: T['type'], handler: (data: T['data']) => void): void {
    this.events.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    this.events.off(event, handler);
  }

  // Library scanning
  async scanLibrary(paths: string[]): Promise<ScanResult> {
    const scanId = Math.random().toString(36).substring(7)
    console.log(`[ENGINE] 🔍 [${scanId}] Starting library scan for paths:`, paths);
    console.log(`[ENGINE] 🔍 [${scanId}] Call stack:`, new Error().stack);
    this.events.emit('scan:started', { paths });

    const result: ScanResult = {
      tracksScanned: 0,
      tracksAdded: 0,
      tracksUpdated: 0,
      errors: []
    };

    try {
      console.log(`[ENGINE] Scanning for audio files...`);
      const files = await this.scanner.scanPaths(paths);
      console.log(`[ENGINE] Found ${files.length} audio files to process`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const filename = path.basename(file.path);
        const progress = Math.round(((i + 1) / files.length) * 100);
        console.log(`\n[ENGINE] 🔄 [${progress}%] Processing ${i + 1}/${files.length}: "${filename}"`);
        this.events.emit('scan:progress', {
          current: i + 1,
          total: files.length,
          currentFile: file.path
        });

        // Yield to event loop every 5 files to allow UI updates
        if (i % 5 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }

        try {
          const filename = path.basename(file.path);
          const fileSize = (file.sizeBytes / (1024 * 1024)).toFixed(1);
          console.log(`[ENGINE] 📄 Processing: "${filename}" (${fileSize}MB, ${path.extname(file.path).toUpperCase()})`);

          const existingTrack = this.db.getTrackByPath(file.path);

          if (existingTrack) {
            const lastModified = existingTrack.fileModifiedAt.toISOString().split('T')[0];
            const currentModified = file.modifiedAt.toISOString().split('T')[0];
            console.log(`[ENGINE] 🔍 Track exists in database (last seen: ${lastModified})`);

            // Check if file has been modified
            if (existingTrack.fileModifiedAt.getTime() !== file.modifiedAt.getTime()) {
              // Re-analyze the file
              console.log(`[ENGINE] 🔄 File modified since ${lastModified}, updating metadata...`);
              const updatedMetadata = await this.scanner.extractMetadata(file.path);

              console.log(`[ENGINE] 📝 Extracted metadata: "${updatedMetadata.title || filename}" by "${updatedMetadata.artist || 'Unknown'}" (${Math.round((updatedMetadata.durationMs || 0) / 1000)}s)`);

              this.db.updateTrack(existingTrack.id, {
                ...updatedMetadata,
                fileModifiedAt: file.modifiedAt,
                updatedAt: new Date()
              });
              result.tracksUpdated++;
              console.log(`[ENGINE] ✅ Track updated: "${updatedMetadata.title || filename}"`);
            } else {
              console.log(`[ENGINE] ⏭️  Track unchanged since ${lastModified}, skipping`);
            }
          } else {
            console.log(`[ENGINE] 🆕 New track detected, checking for duplicates...`);
            // Check for duplicates by hash
            const duplicates = this.db.getTrackByHash(file.hash);

            if (duplicates.length === 0) {
              // New unique track
              console.log(`[ENGINE] 🎵 Unique track, extracting metadata from "${filename}"...`);
              const metadata = await this.scanner.extractMetadata(file.path);

              const title = metadata.title || filename;
              const artist = metadata.artist || 'Unknown Artist';
              const duration = metadata.durationMs ? `${Math.floor(metadata.durationMs / 60000)}:${String(Math.floor((metadata.durationMs % 60000) / 1000)).padStart(2, '0')}` : 'Unknown';
              const bitrate = metadata.bitrate ? `${Math.round(metadata.bitrate)}kbps` : 'Unknown';

              console.log(`[ENGINE] 📝 Extracted: "${title}" by "${artist}" [${duration}, ${bitrate}]`);

              await this.db.insertTrack({
                path: file.path,
                hash: file.hash,
                filename: path.basename(file.path),
                extension: path.extname(file.path).toLowerCase(),
                sizeBytes: file.sizeBytes,
                fileModifiedAt: file.modifiedAt,
                ...metadata
              });
              result.tracksAdded++;
              console.log(`[ENGINE] ✅ Added to library: "${title}" by "${artist}"`);
            } else {
              // Duplicate found - still add but mark as duplicate
              console.log(`[ENGINE] ⚠️  Duplicate content detected! Found ${duplicates.length} existing track(s) with same audio data`);
              const metadata = await this.scanner.extractMetadata(file.path);

              const title = metadata.title || filename;
              const artist = metadata.artist || 'Unknown Artist';
              console.log(`[ENGINE] 📝 Metadata: "${title}" by "${artist}" - adding as duplicate with different path`);

              await this.db.insertTrack({
                path: file.path,
                hash: file.hash,
                filename: path.basename(file.path),
                extension: path.extname(file.path).toLowerCase(),
                sizeBytes: file.sizeBytes,
                fileModifiedAt: file.modifiedAt,
                ...metadata
              });
              result.tracksAdded++;
              console.log(`[ENGINE] ✅ Duplicate added to library: "${title}" (different location)`);
            }
          }

          result.tracksScanned++;
          console.log(`[ENGINE] 📊 Progress: ${result.tracksScanned}/${files.length} processed (${result.tracksAdded} added, ${result.tracksUpdated} updated)\n`);
        } catch (error) {
          console.error(`[ENGINE] ❌ CRITICAL: Failed to process file during scan`);
          console.error(`[ENGINE] ❌ File Path: ${file.path}`);
          console.error(`[ENGINE] ❌ File Info:`, {
            sizeBytes: file.sizeBytes,
            hash: file.hash?.substring(0, 12),
            modifiedAt: file.modifiedAt?.toISOString(),
            extension: path.extname(file.path)
          });
          console.error(`[ENGINE] ❌ Error Details:`, {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            errorType: error?.constructor?.name || typeof error
          });

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            path: file.path,
            error: `File processing failed: ${errorMessage}`
          });
        }
      }
    } catch (error) {
      console.error(`[ENGINE] Critical scan error:`, error);
      result.errors.push({
        path: 'scan_operation',
        error: error instanceof Error ? error.message : 'Failed to scan library'
      });
    }

    console.log(`[ENGINE] 🔍 [${scanId}] Scan completed. Final results:`, result);
    this.events.emit('scan:completed', result);
    return result;
  }

  // Track analysis
  async analyzeTrack(trackId: string, analyzers: string[] = ['tempo', 'key']): Promise<void> {
    const track = this.db.getTrack(trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    // Check if file still exists
    try {
      await fs.access(track.path);
    } catch {
      throw new Error(`Track file not found: ${track.path}`);
    }

    const enabledAnalyzers = this.config.get('analyzers');
    const activeAnalyzers = analyzers.filter(name => enabledAnalyzers[name]?.enabled);

    for (const analyzerName of activeAnalyzers) {
      const analyzerConfig = enabledAnalyzers[analyzerName];
      
      // Create pending analysis record
      const analysis = await this.db.insertAnalysis({
        trackId,
        analyzerName,
        analyzerVersion: '1.0.0', // TODO: Get from analyzer
        parameters: analyzerConfig.parameters || {},
        results: {},
        status: 'pending'
      });

      // Submit job to worker pool and wait for completion
      const result = await this.workerPool.submitJob({
        id: analysis.id,
        trackId,
        audioPath: track.path,
        analyzer: analyzerName,
        parameters: analyzerConfig.parameters || {}
      });

      // Update analysis with results
      this.db.updateAnalysis(analysis.id, {
        results: result.results,
        status: result.status
      });

      // If analysis completed successfully, update the track record
      if (result.status === 'completed' && result.results) {
        const updates: any = {};

        console.log(`🔍 ANALYSIS DEBUG - Analyzer: ${analyzerName}`);
        console.log(`🔍 Raw analysis results:`, result.results);

        // Extract BPM from tempo analysis
        if (analyzerName === 'tempo' && result.results.tempo) {
          updates.bpm = Math.round(result.results.tempo);
          console.log(`🔍 Setting BPM: ${updates.bpm} (from tempo: ${result.results.tempo})`);
        }

        // Extract key from key analysis
        if (analyzerName === 'key' && result.results.key) {
          updates.key = result.results.key;
          console.log(`🔍 Setting key: ${updates.key}`);
        }

        // Extract energy from energy analysis
        if (analyzerName === 'energy' && result.results.energy_stats?.mean) {
          updates.energy = Math.round(result.results.energy_stats.mean * 100); // Convert to 0-100 scale
          console.log(`🔍 Setting energy: ${updates.energy} (from energy_stats.mean: ${result.results.energy_stats.mean})`);
        }

        console.log(`🔍 Updates to apply:`, updates);

        // Update the track record if we have any updates
        if (Object.keys(updates).length > 0) {
          console.log(`🔍 Calling updateTrack with trackId: ${trackId}, updates:`, updates);
          this.db.updateTrack(trackId, updates);

          // Verify the update worked by reading back the track
          const updatedTrack = this.db.getTrack(trackId);
          console.log(`🔍 Track after update:`, {
            id: updatedTrack?.id,
            path: updatedTrack?.path,
            bpm: updatedTrack?.bpm,
            key: updatedTrack?.key,
            energy: updatedTrack?.energy
          });

          console.log(`[ENGINE] ✅ Updated track ${trackId} with analysis results:`, updates);

          // Write tags to file if setting is enabled
          await this.writeTagsToFile(trackId, updates);
        } else {
          console.log(`🔍 No updates to apply for ${analyzerName} analysis`);
        }
      } else {
        console.log(`🔍 Analysis not completed or no results - status: ${result.status}, hasResults: ${!!result.results}`);
      }
    }
  }

  async analyzeSelectedTracks(trackIds: string[], analyzers: string[] = ['tempo', 'key', 'energy']): Promise<void> {
    console.log(`[ENGINE] 🎯 Starting analysis of ${trackIds.length} selected tracks...`);

    this.events.emit('analysis:started', {
      trackIds,
      totalTracks: trackIds.length,
      analyzers
    });

    let completed = 0;
    for (const trackId of trackIds) {
      try {
        await this.analyzeTrack(trackId, analyzers);
        completed++;

        console.log(`[ENGINE] 📊 Completed analysis ${completed}/${trackIds.length}: track ${trackId}`);

        this.events.emit('analysis:progress', {
          trackId,
          completed,
          total: trackIds.length,
          progress: Math.round((completed / trackIds.length) * 100)
        });

      } catch (error) {
        console.error(`[ENGINE] ❌ Analysis failed for track ${trackId}:`, error);
      }
    }

    this.events.emit('analysis:completed', {
      totalTracks: trackIds.length,
      completedTracks: completed,
      failedTracks: trackIds.length - completed
    });

    console.log(`[ENGINE] 🎯 Analysis complete: ${completed}/${trackIds.length} tracks analyzed successfully`);
  }

  async analyzeLibrary(analyzers?: string[]): Promise<void> {
    const tracks = this.db.getAllTracks();
    
    for (const track of tracks) {
      try {
        await this.analyzeTrack(track.id, analyzers);
      } catch (error) {
        console.warn(`Failed to analyze track ${track.path}:`, error);
      }
    }
  }

  // Enhanced cue point generation
  async generateCues(trackId: string): Promise<CuePoint[]> {
    const track = this.db.getTrack(trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    // Get analysis results for cue generation
    const analyses = this.db.getAnalysesByTrack(trackId);
    const tempoAnalysis = analyses.find(a => a.analyzerName === 'tempo' && a.status === 'completed');
    const energyAnalysis = analyses.find(a => a.analyzerName === 'energy' && a.status === 'completed');

    if (!tempoAnalysis) {
      throw new Error('Track must be analyzed for tempo before generating cues');
    }

    const cues: CuePoint[] = [];
    const tempoData = tempoAnalysis.results as any;
    const energyData = energyAnalysis?.results as any;

    if (track.durationMs && tempoData) {
      const bpm = tempoData.tempo || 120;
      const beatPositions = tempoData.beat_positions || [];
      const secondsPerBeat = 60 / bpm;

      // Calculate 8-bar and 16-bar intervals in milliseconds
      const eightBarMs = 8 * 4 * secondsPerBeat * 1000; // 8 bars = 32 beats
      const sixteenBarMs = 16 * 4 * secondsPerBeat * 1000; // 16 bars = 64 beats

      // INTRO CUE: Find first strong beat or 8 bars, whichever comes first
      let introPosition = 0;
      if (beatPositions.length > 0) {
        // Look for the first strong beat after initial silence
        const firstStrongBeat = beatPositions.find((beat: number) => beat > 1) || beatPositions[0];
        introPosition = Math.min(firstStrongBeat * 1000, eightBarMs);
      }

      cues.push(await this.db.insertCue({
        trackId,
        type: 'intro',
        positionMs: introPosition,
        label: beatPositions.length > 0 ? 'First Beat' : 'Intro',
        confidence: beatPositions.length > 0 ? 0.9 : 0.5
      }));

      // OUTRO CUE: 16 bars from end or last strong beat
      const sixteenBarsFromEnd = Math.max(0, track.durationMs - sixteenBarMs);
      let outroPosition = sixteenBarsFromEnd;

      if (beatPositions.length > 0) {
        // Find last beat that's at least 16 bars from end
        const lastGoodBeat = beatPositions
          .map((beat: number) => beat * 1000)
          .reverse()
          .find((beatMs: number) => beatMs <= sixteenBarsFromEnd);

        if (lastGoodBeat) {
          outroPosition = lastGoodBeat;
        }
      }

      cues.push(await this.db.insertCue({
        trackId,
        type: 'outro',
        positionMs: outroPosition,
        label: 'Outro (16 bars)',
        confidence: beatPositions.length > 0 ? 0.8 : 0.5
      }));

      // ENERGY-BASED CUES: Use energy analysis if available
      if (energyData) {
        // DROP CUE: Find highest energy spike (typical drop location)
        if (energyData.energy_curve && Array.isArray(energyData.energy_curve)) {
          const energyCurve = energyData.energy_curve;
          let maxEnergy = 0;
          let dropIndex = Math.floor(energyCurve.length * 0.25); // fallback to 1/4

          // Find the biggest energy jump in the first half of the track
          for (let i = Math.floor(energyCurve.length * 0.1); i < Math.floor(energyCurve.length * 0.6); i++) {
            const energyJump = energyCurve[i] - (energyCurve[i-5] || 0); // Compare to 5 points back
            if (energyJump > maxEnergy) {
              maxEnergy = energyJump;
              dropIndex = i;
            }
          }

          const dropPositionMs = (dropIndex / energyCurve.length) * track.durationMs;

          // Snap to nearest beat if available
          let finalDropPosition = dropPositionMs;
          if (beatPositions.length > 0) {
            const nearestBeat = beatPositions
              .map((beat: number) => ({ beat, diff: Math.abs((beat * 1000) - dropPositionMs) }))
              .sort((a, b) => a.diff - b.diff)[0];

            if (nearestBeat.diff < 2000) { // Within 2 seconds
              finalDropPosition = nearestBeat.beat * 1000;
            }
          }

          cues.push(await this.db.insertCue({
            trackId,
            type: 'drop',
            positionMs: finalDropPosition,
            label: 'Drop (Energy Peak)',
            confidence: maxEnergy > 0.1 ? 0.85 : 0.4
          }));
        } else {
          // Fallback drop cue
          cues.push(await this.db.insertCue({
            trackId,
            type: 'drop',
            positionMs: Math.floor(track.durationMs * 0.25),
            label: 'Drop (Estimated)',
            confidence: 0.3
          }));
        }

        // BREAKDOWN CUE: Look for energy dips (breakdown sections)
        if (energyData.energy_curve && Array.isArray(energyData.energy_curve)) {
          const energyCurve = energyData.energy_curve;
          let minEnergy = 1;
          let breakdownIndex = -1;

          // Find the biggest energy drop in the middle section
          for (let i = Math.floor(energyCurve.length * 0.3); i < Math.floor(energyCurve.length * 0.7); i++) {
            if (energyCurve[i] < minEnergy && energyCurve[i] < 0.3) {
              minEnergy = energyCurve[i];
              breakdownIndex = i;
            }
          }

          if (breakdownIndex > 0) {
            const breakdownPositionMs = (breakdownIndex / energyCurve.length) * track.durationMs;

            // Snap to beat
            let finalBreakdownPosition = breakdownPositionMs;
            if (beatPositions.length > 0) {
              const nearestBeat = beatPositions
                .map((beat: number) => ({ beat, diff: Math.abs((beat * 1000) - breakdownPositionMs) }))
                .sort((a, b) => a.diff - b.diff)[0];

              if (nearestBeat.diff < 3000) {
                finalBreakdownPosition = nearestBeat.beat * 1000;
              }
            }

            cues.push(await this.db.insertCue({
              trackId,
              type: 'break',
              positionMs: finalBreakdownPosition,
              label: 'Breakdown',
              confidence: 0.7
            }));
          }
        }
      } else {
        // Fallback drop cue without energy analysis
        cues.push(await this.db.insertCue({
          trackId,
          type: 'drop',
          positionMs: Math.floor(track.durationMs * 0.25),
          label: 'Drop (Estimated)',
          confidence: 0.3
        }));
      }

      // HOT CUE: Mark strong beats at 8-bar intervals for DJ mixing
      if (beatPositions.length > 10) {
        const hotCuePositions = [];
        for (let bars = 16; bars <= 64; bars += 16) {
          const targetTimeSeconds = bars * 4 * secondsPerBeat; // bars * beats_per_bar * seconds_per_beat
          const nearestBeat = beatPositions
            .map((beat: number) => ({ beat, diff: Math.abs(beat - targetTimeSeconds) }))
            .sort((a, b) => a.diff - b.diff)[0];

          if (nearestBeat.diff < 1 && nearestBeat.beat * 1000 < track.durationMs * 0.8) {
            hotCuePositions.push(nearestBeat.beat * 1000);
          }
        }

        for (let i = 0; i < hotCuePositions.length; i++) {
          const position = hotCuePositions[i];
          cues.push(await this.db.insertCue({
            trackId,
            type: 'custom',
            positionMs: position,
            label: `Hot Cue ${i + 1}`,
            confidence: 0.8
          }));
        }
      }
    }

    return cues;
  }

  // Health check
  async runDoctor(): Promise<HealthReport> {
    const tracks = this.db.getAllTracks();
    const issues = this.db.getHealthIssues();

    // Add file system checks
    for (const track of tracks) {
      try {
        await fs.access(track.path);
      } catch {
        issues.push({
          trackId: track.id,
          path: track.path,
          type: 'missing_file',
          severity: 'error',
          message: 'File no longer exists on disk'
        });
      }
    }

    return {
      totalTracks: tracks.length,
      issues
    };
  }

  // Export functionality
  async exportLibrary(format: ExportFormat, options: ExportOptions): Promise<void> {
    this.events.emit('export:started', { 
      format: format.name, 
      trackCount: this.db.getAllTracks().length 
    });

    const tracks = options.playlistIds?.length 
      ? this.getTracksFromPlaylists(options.playlistIds)
      : this.db.getAllTracks();

    if (format.name === 'm3u' || format.name === 'serato' || format.name === 'engine') {
      await this.exportM3U(tracks, options);
    }

    this.events.emit('export:completed', { outputPath: options.outputPath });
  }

  private getTracksFromPlaylists(playlistIds: string[]): Track[] {
    return this.db.getAllTracks();
  }

  private async exportM3U(tracks: Track[], options: ExportOptions): Promise<void> {
    const lines: string[] = ['#EXTM3U'];

    for (const track of tracks) {
      const duration = track.durationMs ? Math.round(track.durationMs / 1000) : -1;
      const artist = track.artist || 'Unknown Artist';
      const title = track.title || track.filename;
      
      lines.push(`#EXTINF:${duration},${artist} - ${title}`);
      
      const trackPath = options.relativePaths 
        ? path.relative(path.dirname(options.outputPath), track.path)
        : track.path;
        
      lines.push(trackPath);
      
      if (options.includeCues) {
        const cues = this.db.getCuesByTrack(track.id);
        for (const cue of cues) {
          const cueTimeSeconds = Math.round(cue.positionMs / 1000);
          lines.push(`#EXTCUE:${cueTimeSeconds}:${cue.type}:${cue.label || ''}`);
        }
      }
    }

    await fs.writeFile(options.outputPath, lines.join('\n'), 'utf8');
  }

  getConfig(): Config {
    return this.config.getAll();
  }

  updateConfig(updates: Partial<Config>): void {
    this.config.update(updates);
  }

  getAllTracks(): Track[] {
    return this.db.getAllTracks();
  }

  getTrack(id: string): Track | null {
    return this.db.getTrack(id);
  }

  getAnalysesByTrack(trackId: string): Analysis[] {
    return this.db.getAnalysesByTrack(trackId);
  }

  getAllAnalysisJobs(): Array<{
    id: string;
    trackTitle: string;
    trackArtist: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    currentTask?: string;
    results?: {
      bpm?: number;
      key?: string;
      energy?: number;
      duration?: number;
      errors?: string[];
    };
  }> {
    const tracks = this.db.getAllTracks();
    const jobs: Array<any> = [];

    for (const track of tracks) {
      const analyses = this.db.getAnalysesByTrack(track.id);

      for (const analysis of analyses) {
        let progress = 0;
        let results: any = {};
        let errors: string[] = [];

        if (analysis.status === 'completed') {
          progress = 100;
          // Extract results based on analyzer type
          if (analysis.analyzerName === 'tempo' && analysis.results) {
            results.bpm = (analysis.results as any).tempo;
          }
          if (analysis.analyzerName === 'key' && analysis.results) {
            results.key = (analysis.results as any).key;
          }
          if (analysis.analyzerName === 'energy' && analysis.results) {
            results.energy = (analysis.results as any).energy;
          }
          results.duration = track.durationMs ? Math.floor(track.durationMs / 1000) : undefined;
        } else if (analysis.status === 'failed') {
          progress = 0;
          errors.push(`Analysis failed: ${analysis.analyzerName}`);
        } else if (analysis.status === 'running') {
          progress = 50; // Assume halfway if running
        }

        jobs.push({
          id: analysis.id,
          trackTitle: track.title || 'Unknown Title',
          trackArtist: track.artist || 'Unknown Artist',
          status: analysis.status,
          progress: progress,
          currentTask: analysis.status === 'running' ? `Analyzing ${analysis.analyzerName}...` : undefined,
          results: Object.keys(results).length > 0 ? {
            ...results,
            errors: errors.length > 0 ? errors : undefined
          } : (errors.length > 0 ? { errors } : undefined)
        });
      }
    }

    return jobs;
  }

  getCuesByTrack(trackId: string): CuePoint[] {
    return this.db.getCuesByTrack(trackId);
  }

  async exportToUSB(trackIds: string[], options: USBExportOptions): Promise<USBExportResult> {
    const tracks = trackIds.map(id => this.db.getTrack(id)).filter(track => track !== null) as Track[];

    if (tracks.length === 0) {
      throw new Error('No valid tracks found for export');
    }

    // Get all cue points for the tracks
    const allCues: CuePoint[] = [];
    for (const track of tracks) {
      const trackCues = this.db.getCuesByTrack(track.id);
      allCues.push(...trackCues);
    }

    this.events.emit('export:started', { format: 'USB', trackCount: tracks.length });

    try {
      const result = await this.usbExporter.exportToUSB(tracks, allCues, options);

      this.events.emit('export:completed', { outputPath: result.outputPath });
      return result;
    } catch (error) {
      throw new Error(`USB export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getUSBExportProfiles() {
    return this.usbExporter.getDefaultProfiles();
  }

  // Track deletion
  async deleteTracks(trackIds: string[], deleteFiles: boolean = false): Promise<{ removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> }> {
    const result = {
      removedFromLibrary: 0,
      deletedFiles: 0,
      errors: [] as Array<{ trackId: string; error: string }>
    };

    this.events.emit('tracks:delete:started', { trackIds, deleteFiles });

    for (const trackId of trackIds) {
      try {
        const track = this.db.getTrack(trackId);
        if (!track) {
          result.errors.push({ trackId, error: 'Track not found in database' });
          continue;
        }

        // If deleteFiles is true, try to delete the file from disk
        if (deleteFiles) {
          try {
            await fs.unlink(track.path);
            result.deletedFiles++;
            this.events.emit('tracks:file:deleted', { trackId, path: track.path });
          } catch (fileError) {
            // File might not exist or no permission - log but continue with DB removal
            result.errors.push({
              trackId,
              error: `Failed to delete file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
            });
          }
        }

        // Remove from database (this will cascade to analyses and cue points due to foreign keys)
        this.db.deleteTrack(trackId);
        result.removedFromLibrary++;
        this.events.emit('tracks:removed:from:library', { trackId });

      } catch (error) {
        result.errors.push({
          trackId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.events.emit('tracks:delete:completed', result);
    return result;
  }

  // STEM Separation functionality
  async checkStemSeparationDependencies(): Promise<{ available: boolean; missingDeps: string[] }> {
    return this.stemSeparationService.checkDependencies();
  }

  async startStemSeparation(trackId: string, settings?: Partial<StemSeparationSettings>): Promise<string> {
    const track = this.db.getTrack(trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    // Check if file exists
    try {
      await fs.access(track.path);
    } catch {
      throw new Error(`Track file not found: ${track.path}`);
    }

    // Use provided settings or defaults
    const separationSettings = {
      ...this.stemSeparationService.getDefaultSettings(),
      ...settings
    };

    this.events.emit('stem:separation:started', { trackId, settings: separationSettings });

    const separationId = await this.stemSeparationService.startSeparation(
      trackId,
      track.path,
      separationSettings
    );

    return separationId;
  }

  async getStemSeparationStatus(separationId: string): Promise<StemSeparationResult | null> {
    return this.stemSeparationService.getSeparationStatus(separationId);
  }

  async getStemSeparationByTrackId(trackId: string): Promise<StemSeparationResult | null> {
    return this.stemSeparationService.getSeparationByTrackId(trackId);
  }

  async getAllStemSeparations(): Promise<StemSeparationResult[]> {
    return this.stemSeparationService.getAllSeparations();
  }

  async cancelStemSeparation(separationId: string): Promise<boolean> {
    const result = await this.stemSeparationService.cancelSeparation(separationId);
    if (result) {
      this.events.emit('stem:separation:cancelled', { separationId });
    }
    return result;
  }

  async deleteStemSeparation(separationId: string): Promise<boolean> {
    const result = await this.stemSeparationService.deleteSeparation(separationId);
    if (result) {
      this.events.emit('stem:separation:deleted', { separationId });
    }
    return result;
  }

  getAvailableStemModels(): Promise<string[]> {
    return this.stemSeparationService.getAvailableModels();
  }

  getStemSeparationDefaultSettings(): StemSeparationSettings {
    return this.stemSeparationService.getDefaultSettings();
  }

  async estimateStemProcessingTime(trackId: string, model: string): Promise<number> {
    const track = this.db.getTrack(trackId);
    if (!track || !track.durationMs) {
      throw new Error('Track not found or duration unknown');
    }

    return this.stemSeparationService.estimateProcessingTime(track.durationMs, model);
  }

  // Duplicate detection functionality
  getDuplicateGroups(): Array<{
    id: string;
    tracks: Array<{
      id: string;
      title: string;
      artist: string;
      path: string;
      similarity: number;
    }>;
    reason: string;
  }> {
    const tracks = this.db.getAllTracks();
    const duplicateGroups: Array<any> = [];
    const processed = new Set<string>();

    for (let i = 0; i < tracks.length; i++) {
      const trackA = tracks[i];
      if (processed.has(trackA.id)) continue;

      const potentialDuplicates = [];
      potentialDuplicates.push({
        id: trackA.id,
        title: trackA.title || 'Unknown Title',
        artist: trackA.artist || 'Unknown Artist',
        path: trackA.path,
        similarity: 1.0
      });

      for (let j = i + 1; j < tracks.length; j++) {
        const trackB = tracks[j];
        if (processed.has(trackB.id)) continue;

        const similarity = this.calculateTrackSimilarity(trackA, trackB);
        if (similarity > 0.7) { // 70% similarity threshold
          potentialDuplicates.push({
            id: trackB.id,
            title: trackB.title || 'Unknown Title',
            artist: trackB.artist || 'Unknown Artist',
            path: trackB.path,
            similarity: similarity
          });
          processed.add(trackB.id);
        }
      }

      if (potentialDuplicates.length > 1) {
        const reason = this.getDuplicateReason(potentialDuplicates);
        duplicateGroups.push({
          id: `group_${duplicateGroups.length + 1}`,
          tracks: potentialDuplicates.sort((a, b) => b.similarity - a.similarity),
          reason: reason
        });

        // Mark all tracks in this group as processed
        potentialDuplicates.forEach(track => processed.add(track.id));
      }
    }

    return duplicateGroups;
  }

  private calculateTrackSimilarity(trackA: any, trackB: any): number {
    let score = 0;
    let factors = 0;

    // Title similarity (weighted heavily)
    if (trackA.title && trackB.title) {
      const titleSim = this.stringSimilarity(
        trackA.title.toLowerCase().trim(),
        trackB.title.toLowerCase().trim()
      );
      score += titleSim * 0.4;
      factors += 0.4;
    }

    // Artist similarity
    if (trackA.artist && trackB.artist) {
      const artistSim = this.stringSimilarity(
        trackA.artist.toLowerCase().trim(),
        trackB.artist.toLowerCase().trim()
      );
      score += artistSim * 0.3;
      factors += 0.3;
    }

    // Duration similarity (within 5 seconds = high similarity)
    if (trackA.durationMs && trackB.durationMs) {
      const durationDiff = Math.abs(trackA.durationMs - trackB.durationMs);
      const durationSim = durationDiff <= 5000 ? 1.0 : Math.max(0, 1 - (durationDiff / 30000));
      score += durationSim * 0.2;
      factors += 0.2;
    }

    // File size similarity (rough indicator)
    if (trackA.fileSizeBytes && trackB.fileSizeBytes) {
      const sizeDiff = Math.abs(trackA.fileSizeBytes - trackB.fileSizeBytes);
      const avgSize = (trackA.fileSizeBytes + trackB.fileSizeBytes) / 2;
      const sizeSim = sizeDiff < avgSize * 0.1 ? 1.0 : Math.max(0, 1 - (sizeDiff / avgSize));
      score += sizeSim * 0.1;
      factors += 0.1;
    }

    return factors > 0 ? score / factors : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Levenshtein distance normalized
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,        // deletion
          matrix[j - 1][i] + 1,        // insertion
          matrix[j - 1][i - 1] + indicator   // substitution
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  private getDuplicateReason(tracks: Array<any>): string {
    const reasons = [];

    // Check if titles are very similar
    const titles = tracks.map(t => t.title?.toLowerCase().trim()).filter(Boolean);
    if (titles.length > 1 && titles.every(title => this.stringSimilarity(title, titles[0]) > 0.8)) {
      reasons.push('Similar titles');
    }

    // Check if artists match
    const artists = tracks.map(t => t.artist?.toLowerCase().trim()).filter(Boolean);
    if (artists.length > 1 && artists.every(artist => artist === artists[0])) {
      reasons.push('Same artist');
    }

    // Check for different file formats
    const extensions = tracks.map(t => {
      const path = t.path || '';
      return path.split('.').pop()?.toLowerCase();
    }).filter(Boolean);
    const uniqueExts = [...new Set(extensions)];
    if (uniqueExts.length > 1) {
      reasons.push(`Different formats (${uniqueExts.join(', ')})`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Similar tracks detected';
  }

  async scanForDuplicates(): Promise<{ success: boolean; groupsFound: number }> {
    try {
      console.log('[ENGINE] Starting duplicate detection scan...');
      this.events.emit('duplicates:scan:started', {});

      const groups = this.getDuplicateGroups();

      console.log(`[ENGINE] Found ${groups.length} duplicate groups`);
      this.events.emit('duplicates:scan:completed', { groupsFound: groups.length });

      return { success: true, groupsFound: groups.length };
    } catch (error) {
      console.error('[ENGINE] Duplicate scan failed:', error);
      this.events.emit('duplicates:scan:failed', { error: (error as Error).message });
      return { success: false, groupsFound: 0 };
    }
  }

  // Health checking functionality
  getLibraryHealth(): Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    details?: string;
    trackId?: string;
    canAutoFix?: boolean;
  }> {
    const issues: Array<any> = [];
    const tracks = this.db.getAllTracks();

    for (const track of tracks) {
      // Check if file exists
      try {
        require('fs').accessSync(track.path);
      } catch {
        issues.push({
          id: `missing_file_${track.id}`,
          type: 'error',
          category: 'Missing Files',
          message: `Track file not found: ${track.title || 'Unknown'}`,
          details: `File path: ${track.path}`,
          trackId: track.id,
          canAutoFix: false
        });
      }

      // Check for missing metadata
      if (!track.title || track.title.trim() === '') {
        issues.push({
          id: `missing_title_${track.id}`,
          type: 'warning',
          category: 'Missing Metadata',
          message: `Track missing title`,
          details: `Path: ${track.path}`,
          trackId: track.id,
          canAutoFix: true
        });
      }

      if (!track.artist || track.artist.trim() === '') {
        issues.push({
          id: `missing_artist_${track.id}`,
          type: 'warning',
          category: 'Missing Metadata',
          message: `Track missing artist`,
          details: `Title: ${track.title || 'Unknown'}`,
          trackId: track.id,
          canAutoFix: true
        });
      }

      // Check for missing analysis
      const analyses = this.db.getAnalysesByTrack(track.id);
      const hasTempoAnalysis = analyses.some(a => a.analyzerName === 'tempo' && a.status === 'completed');
      const hasKeyAnalysis = analyses.some(a => a.analyzerName === 'key' && a.status === 'completed');

      if (!hasTempoAnalysis) {
        issues.push({
          id: `missing_bpm_${track.id}`,
          type: 'info',
          category: 'Missing Analysis',
          message: `Track missing BPM analysis`,
          details: `Title: ${track.title || 'Unknown'} - ${track.artist || 'Unknown'}`,
          trackId: track.id,
          canAutoFix: true
        });
      }

      if (!hasKeyAnalysis) {
        issues.push({
          id: `missing_key_${track.id}`,
          type: 'info',
          category: 'Missing Analysis',
          message: `Track missing key analysis`,
          details: `Title: ${track.title || 'Unknown'} - ${track.artist || 'Unknown'}`,
          trackId: track.id,
          canAutoFix: true
        });
      }
    }

    // Check for duplicate groups
    const duplicateGroups = this.getDuplicateGroups();
    if (duplicateGroups.length > 0) {
      issues.push({
        id: 'duplicate_tracks',
        type: 'warning',
        category: 'Duplicates',
        message: `Found ${duplicateGroups.length} groups of potential duplicate tracks`,
        details: `Use the Duplicate Detection feature to review and clean up duplicates`,
        canAutoFix: false
      });
    }

    return issues;
  }

  async scanLibraryHealth(): Promise<{ success: boolean; issuesFound: number }> {
    try {
      console.log('[ENGINE] Starting library health scan...');
      this.events.emit('health:scan:started', {});

      const issues = this.getLibraryHealth();

      console.log(`[ENGINE] Found ${issues.length} health issues`);
      this.events.emit('health:scan:completed', { issuesFound: issues.length });

      return { success: true, issuesFound: issues.length };
    } catch (error) {
      console.error('[ENGINE] Health scan failed:', error);
      this.events.emit('health:scan:failed', { error: (error as Error).message });
      return { success: false, issuesFound: 0 };
    }
  }

  async fixHealthIssue(issueId: string): Promise<{ success: boolean; message: string }> {
    try {
      const issue = this.getLibraryHealth().find(i => i.id === issueId);
      if (!issue) {
        return { success: false, message: 'Issue not found' };
      }

      if (!issue.canAutoFix) {
        return { success: false, message: 'This issue cannot be automatically fixed' };
      }

      if (issue.category === 'Missing Analysis' && issue.trackId) {
        // Trigger analysis for the track
        if (issue.id.includes('missing_bpm')) {
          await this.analyzeTrack(issue.trackId, ['tempo']);
          return { success: true, message: 'BPM analysis started' };
        } else if (issue.id.includes('missing_key')) {
          await this.analyzeTrack(issue.trackId, ['key']);
          return { success: true, message: 'Key analysis started' };
        }
      }

      if (issue.category === 'Missing Metadata' && issue.trackId) {
        // For metadata issues, we can suggest using tag editors or manual input
        return { success: false, message: 'Metadata issues require manual correction' };
      }

      return { success: false, message: 'Unable to fix this issue automatically' };
    } catch (error) {
      console.error('[ENGINE] Failed to fix health issue:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  // YouTube downloader methods
  async checkYouTubeDependencies(): Promise<{ available: boolean; error?: string }> {
    return this.youtubeDownloader.checkDependencies();
  }

  async getYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    return this.youtubeDownloader.getVideoInfo(url);
  }

  async searchYouTubeVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
    return this.youtubeDownloader.searchVideos(query, maxResults);
  }

  async downloadYouTubeAudio(url: string, options: YouTubeDownloadOptions = {}): Promise<YouTubeDownloadResult> {
    return this.youtubeDownloader.downloadAudio(url, options);
  }

  async downloadYouTubeBatch(
    items: Array<{ url?: string; query?: string; options?: YouTubeDownloadOptions }>,
    globalOptions: YouTubeDownloadOptions = {}
  ): Promise<YouTubeDownloadResult[]> {
    return this.youtubeDownloader.downloadBatch(items, globalOptions);
  }

  // Tag writing methods
  private async writeTagsToFile(trackId: string, updates: any): Promise<void> {
    try {
      // Check if tag writing is enabled in settings
      const writeTagsEnabled = this.config.get('analysis.writeTagsToFiles') ?? true;
      if (!writeTagsEnabled) {
        console.log(`[ENGINE] 🏷️ Tag writing disabled in settings, skipping for track ${trackId}`);
        return;
      }

      // Only write if we have BPM, key, or energy updates
      const hasTagData = updates.bpm || updates.key || updates.energy;
      if (!hasTagData) {
        console.log(`[ENGINE] 🏷️ No tag data to write for track ${trackId}`);
        return;
      }

      // Get track path
      const track = this.db.getTrack(trackId);
      if (!track) {
        console.log(`[ENGINE] 🏷️ Track not found: ${trackId}`);
        return;
      }

      console.log(`[ENGINE] 🏷️ Writing tags to file: ${track.path}`);
      console.log(`[ENGINE] 🏷️ Tag data:`, updates);

      // Prepare tag data for the Python worker
      const tagData: any = {};
      if (updates.bpm) tagData.bpm = updates.bpm;
      if (updates.key) tagData.key = updates.key;
      if (updates.energy) tagData.energy = updates.energy;

      // Use the existing worker pool to run the tag writer
      const workersPath = this.config.get('workers.workersPath');
      const pythonPath = this.config.get('workers.pythonPath');

      const { spawn } = require('child_process');

      return new Promise<void>((resolve, reject) => {
        const tagWriterPath = path.join(workersPath, 'src', 'tag_writer.py');
        const args = [
          tagWriterPath,
          '--audio-path', track.path,
          '--tag-data', JSON.stringify(tagData),
          '--job-id', `tag-write-${trackId}-${Date.now()}`
        ];

        console.log(`[ENGINE] 🏷️ Running tag writer: ${pythonPath} ${args.join(' ')}`);

        const worker = spawn(pythonPath, args);
        let output = '';
        let errorOutput = '';

        worker.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        worker.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        worker.on('close', (code: number) => {
          if (code === 0) {
            // Parse result from output
            const resultMatch = output.match(/RESULT:(.+)/);
            if (resultMatch) {
              try {
                const result = JSON.parse(resultMatch[1]);
                console.log(`[ENGINE] ✅ Tags written successfully to ${track.path}:`, result);
                resolve();
              } catch (error) {
                console.error(`[ENGINE] ❌ Failed to parse tag writer result:`, error);
                reject(error);
              }
            } else {
              console.log(`[ENGINE] ✅ Tag writing completed for ${track.path}`);
              resolve();
            }
          } else {
            console.error(`[ENGINE] ❌ Tag writer failed with code ${code}`);
            console.error(`[ENGINE] ❌ Error output:`, errorOutput);
            reject(new Error(`Tag writer failed with code ${code}: ${errorOutput}`));
          }
        });

        worker.on('error', (error: Error) => {
          console.error(`[ENGINE] ❌ Failed to spawn tag writer:`, error);
          reject(error);
        });
      });

    } catch (error) {
      console.error(`[ENGINE] ❌ Tag writing failed for track ${trackId}:`, error);
      // Don't throw - tag writing failure shouldn't stop analysis
    }
  }

  close(): void {
    this.workerPool.close();
    this.db.close();
  }
}
