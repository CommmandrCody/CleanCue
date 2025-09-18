import { CleanCueDatabase } from './database.js';
import { FileScanner } from './scanner.js';
import { WorkerPool } from './workers.js';
import { EventBus } from './events.js';
import { ConfigManager } from './config.js';
import { USBExporter } from './usb-exporter.js';
import { StemSeparationService, StemSeparationSettings, StemSeparationResult } from './stem-separation-service.js';
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

  constructor(configPath?: string) {
    this.config = new ConfigManager(configPath);
    this.db = new CleanCueDatabase(this.config.get('database.path'));
    this.scanner = new FileScanner(this.config.get('scanning'));
    this.workerPool = new WorkerPool(this.config.get('workers'));
    this.events = new EventBus();
    this.usbExporter = new USBExporter();
    this.stemSeparationService = new StemSeparationService(this.db, this.config.get('stems.outputPath'));

    this.setupEventHandlers();
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
    this.events.emit('scan:started', { paths });

    const result: ScanResult = {
      tracksScanned: 0,
      tracksAdded: 0,
      tracksUpdated: 0,
      errors: []
    };

    try {
      const files = await this.scanner.scanPaths(paths);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        this.events.emit('scan:progress', {
          current: i + 1,
          total: files.length,
          currentFile: file.path
        });

        try {
          const existingTrack = this.db.getTrackByPath(file.path);
          
          if (existingTrack) {
            // Check if file has been modified
            if (existingTrack.fileModifiedAt.getTime() !== file.modifiedAt.getTime()) {
              // Re-analyze the file
              const updatedMetadata = await this.scanner.extractMetadata(file.path);
              this.db.updateTrack(existingTrack.id, {
                ...updatedMetadata,
                fileModifiedAt: file.modifiedAt,
                updatedAt: new Date()
              });
              result.tracksUpdated++;
            }
          } else {
            // Check for duplicates by hash
            const duplicates = this.db.getTrackByHash(file.hash);
            
            if (duplicates.length === 0) {
              // New unique track
              const metadata = await this.scanner.extractMetadata(file.path);
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
            } else {
              // Duplicate found - still add but mark as duplicate
              const metadata = await this.scanner.extractMetadata(file.path);
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
            }
          }

          result.tracksScanned++;
        } catch (error) {
          result.errors.push({
            path: file.path,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      result.errors.push({
        path: 'scan_operation',
        error: error instanceof Error ? error.message : 'Failed to scan library'
      });
    }

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
    }
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

  close(): void {
    this.workerPool.close();
    this.db.close();
  }
}
