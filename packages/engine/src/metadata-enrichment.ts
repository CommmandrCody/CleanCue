import { EventEmitter } from 'events';
import type { Track } from '@cleancue/shared';
import { MetadataExtractor, EnhancedMetadata } from './metadata';
import { MusicFingerprintingService } from './music-fingerprinting';
import { AlbumArtService } from './album-art-service';
import { YouTubeDownloaderService } from './youtube-downloader';

export interface EnrichmentJob {
  id: string;
  trackIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    current?: string; // Current track being processed
    stage: 'metadata' | 'fingerprinting' | 'album_art' | 'finalizing';
  };
  options: EnrichmentOptions;
  results?: Map<string, EnhancedMetadata>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface EnrichmentOptions {
  enableFingerprinting: boolean;
  enableAlbumArt: boolean;
  enableFilenameParser: boolean;
  overwriteExisting: boolean;
  albumArtQuality: 'thumbnail' | 'medium' | 'large' | 'best';
  fingerprintingSources: ('lastfm' | 'musicbrainz' | 'acoustid')[];
  albumArtSources: ('embedded' | 'lastfm' | 'musicbrainz' | 'spotify' | 'itunes' | 'discogs')[];
  batchSize: number; // Process tracks in batches to avoid API rate limits
  parallelRequests: number; // Max parallel requests to external APIs
}

export interface EnrichmentStats {
  totalTracks: number;
  enrichedTracks: number;
  fingerprintMatches: number;
  albumArtFound: number;
  filenameParsed: number;
  errors: number;
  processingTime: number;
  apiCalls: {
    lastfm: number;
    musicbrainz: number;
    spotify: number;
    itunes: number;
    discogs: number;
  };
}

export class MetadataEnrichmentService extends EventEmitter {
  private metadataExtractor: MetadataExtractor;
  private fingerprintingService: MusicFingerprintingService;
  private albumArtService: AlbumArtService;
  private youtubeService?: YouTubeDownloaderService;
  private activeJobs = new Map<string, EnrichmentJob>();
  private defaultOptions: EnrichmentOptions;

  constructor(
    cacheDirectory: string,
    ytDlpPath?: string,
    cookiesDir?: string
  ) {
    super();

    this.metadataExtractor = new MetadataExtractor();
    this.fingerprintingService = new MusicFingerprintingService();
    this.albumArtService = new AlbumArtService(cacheDirectory);

    if (ytDlpPath) {
      this.youtubeService = new YouTubeDownloaderService(ytDlpPath, cookiesDir);
      this.setupYouTubeServiceEvents();
    }

    this.defaultOptions = {
      enableFingerprinting: true,
      enableAlbumArt: true,
      enableFilenameParser: true,
      overwriteExisting: false,
      albumArtQuality: 'large',
      fingerprintingSources: ['lastfm', 'musicbrainz'],
      albumArtSources: ['embedded', 'lastfm', 'spotify', 'musicbrainz'],
      batchSize: 10,
      parallelRequests: 3
    };
  }

  private setupYouTubeServiceEvents(): void {
    if (!this.youtubeService) return;

    this.youtubeService.on('updateCheckCompleted', (result) => {
      this.emit('ytDlpUpdateAvailable', result);
    });

    this.youtubeService.on('updateRequired', (info) => {
      this.emit('ytDlpInstallationRequired', info);
    });

    this.youtubeService.on('cookiesRefreshed', (info) => {
      this.emit('cookiesRefreshed', info);
    });
  }

  async enrichTracks(
    tracks: Track[],
    options: Partial<EnrichmentOptions> = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const mergedOptions = { ...this.defaultOptions, ...options };

    const job: EnrichmentJob = {
      id: jobId,
      trackIds: tracks.map(t => t.id),
      status: 'pending',
      progress: {
        total: tracks.length,
        completed: 0,
        stage: 'metadata'
      },
      options: mergedOptions,
      createdAt: new Date()
    };

    this.activeJobs.set(jobId, job);
    this.emit('jobCreated', job);

    // Start processing asynchronously
    this.processEnrichmentJob(jobId, tracks).catch(error => {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.emit('jobFailed', job);
    });

    return jobId;
  }

  private async processEnrichmentJob(jobId: string, tracks: Track[]): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new Error('Job not found');

    const startTime = Date.now();
    job.status = 'running';
    job.results = new Map();
    this.emit('jobStarted', job);

    const stats: EnrichmentStats = {
      totalTracks: tracks.length,
      enrichedTracks: 0,
      fingerprintMatches: 0,
      albumArtFound: 0,
      filenameParsed: 0,
      errors: 0,
      processingTime: 0,
      apiCalls: {
        lastfm: 0,
        musicbrainz: 0,
        spotify: 0,
        itunes: 0,
        discogs: 0
      }
    };

    try {
      // Process tracks in batches to manage memory and API rate limits
      const batches = this.createBatches(tracks, job.options.batchSize);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        // Stage 1: Extract basic metadata and parse filenames
        job.progress.stage = 'metadata';
        await this.processBatchMetadata(batch, job, stats);

        // Stage 2: Music fingerprinting
        if (job.options.enableFingerprinting) {
          job.progress.stage = 'fingerprinting';
          await this.processBatchFingerprinting(batch, job, stats);
        }

        // Stage 3: Album art
        if (job.options.enableAlbumArt) {
          job.progress.stage = 'album_art';
          await this.processBatchAlbumArt(batch, job, stats);
        }

        // Update progress
        job.progress.completed = Math.min(
          job.progress.total,
          (batchIndex + 1) * job.options.batchSize
        );
        this.emit('jobProgress', job);

        // Rate limiting between batches
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Stage 4: Finalize
      job.progress.stage = 'finalizing';
      stats.processingTime = Date.now() - startTime;
      stats.enrichedTracks = job.results.size;

      job.status = 'completed';
      job.completedAt = new Date();
      this.emit('jobCompleted', { job, stats });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      stats.processingTime = Date.now() - startTime;
      this.emit('jobFailed', { job, stats });
    }
  }

  private async processBatchMetadata(
    tracks: Track[],
    job: EnrichmentJob,
    stats: EnrichmentStats
  ): Promise<void> {
    for (const track of tracks) {
      try {
        job.progress.current = track.path;
        this.emit('jobProgress', job);

        // Extract enhanced metadata
        const metadata = await this.metadataExtractor.extractEnhancedMetadata(track.path);

        if (metadata.filenamePattern && job.options.enableFilenameParser) {
          stats.filenameParsed++;
        }

        job.results!.set(track.id, metadata);
      } catch (error) {
        stats.errors++;
        console.error(`Error processing metadata for ${track.path}:`, error);
      }
    }
  }

  private async processBatchFingerprinting(
    tracks: Track[],
    job: EnrichmentJob,
    stats: EnrichmentStats
  ): Promise<void> {
    const semaphore = new Semaphore(job.options.parallelRequests);

    await Promise.allSettled(
      tracks.map(async track => {
        await semaphore.acquire();
        try {
          const existingMetadata = job.results!.get(track.id);
          if (!existingMetadata) return;

          job.progress.current = track.path;
          this.emit('jobProgress', job);

          const enrichedMetadata = await this.fingerprintingService.enrichMetadata(
            track,
            existingMetadata
          );

          if (enrichedMetadata.fingerprintConfidence && enrichedMetadata.fingerprintConfidence > 0.5) {
            stats.fingerprintMatches++;
            this.incrementApiStats(stats, enrichedMetadata.fingerprintSource);
          }

          job.results!.set(track.id, enrichedMetadata);
        } catch (error) {
          stats.errors++;
          console.error(`Error fingerprinting ${track.path}:`, error);
        } finally {
          semaphore.release();
        }
      })
    );
  }

  private async processBatchAlbumArt(
    tracks: Track[],
    job: EnrichmentJob,
    stats: EnrichmentStats
  ): Promise<void> {
    const semaphore = new Semaphore(job.options.parallelRequests);

    await Promise.allSettled(
      tracks.map(async track => {
        await semaphore.acquire();
        try {
          const existingMetadata = job.results!.get(track.id);
          if (!existingMetadata) return;

          job.progress.current = track.path;
          this.emit('jobProgress', job);

          const artResult = await this.albumArtService.findAlbumArt(track, existingMetadata);

          if (artResult.selectedArt) {
            stats.albumArtFound++;
            existingMetadata.albumArtPath = artResult.selectedArt.localPath;
            existingMetadata.albumArtSource = artResult.selectedArt.source.source;
            existingMetadata.albumArtQuality = artResult.selectedArt.source.quality;

            this.incrementApiStats(stats, artResult.selectedArt.source.source);
          }

          job.results!.set(track.id, existingMetadata);
        } catch (error) {
          stats.errors++;
          console.error(`Error fetching album art for ${track.path}:`, error);
        } finally {
          semaphore.release();
        }
      })
    );
  }

  private incrementApiStats(stats: EnrichmentStats, source?: string): void {
    if (!source) return;

    switch (source) {
      case 'lastfm':
        stats.apiCalls.lastfm++;
        break;
      case 'musicbrainz':
      case 'coverartarchive':
        stats.apiCalls.musicbrainz++;
        break;
      case 'spotify':
        stats.apiCalls.spotify++;
        break;
      case 'itunes':
        stats.apiCalls.itunes++;
        break;
      case 'discogs':
        stats.apiCalls.discogs++;
        break;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  getJob(jobId: string): EnrichmentJob | undefined {
    return this.activeJobs.get(jobId);
  }

  getAllJobs(): EnrichmentJob[] {
    return Array.from(this.activeJobs.values());
  }

  getActiveJobs(): EnrichmentJob[] {
    return Array.from(this.activeJobs.values()).filter(job =>
      ['pending', 'running'].includes(job.status)
    );
  }

  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && ['pending', 'running'].includes(job.status)) {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.emit('jobCancelled', job);
      return true;
    }
    return false;
  }

  clearCompletedJobs(): void {
    const completedJobIds = Array.from(this.activeJobs.entries())
      .filter(([_, job]) => ['completed', 'failed', 'cancelled'].includes(job.status))
      .map(([id, _]) => id);

    completedJobIds.forEach(id => this.activeJobs.delete(id));
    this.emit('jobsCleared', completedJobIds);
  }

  private generateJobId(): string {
    return `enrichment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // YouTube Integration methods
  async downloadFromYouTube(
    url: string,
    outputDir: string,
    format: 'mp3-320' | 'flac' | 'best' = 'mp3-320'
  ): Promise<{ jobId: string; tracks?: Track[] }> {
    if (!this.youtubeService) {
      throw new Error('YouTube service not initialized');
    }

    const options = {
      format,
      outputDir,
      extractAudio: true,
      keepVideo: false,
      embedThumbnail: true,
      addMetadata: true,
      skipUnavailable: true,
      ignoreCopyright: false
    };

    const outputPath = await this.youtubeService.downloadUrl(url, options);

    // After download, scan for new tracks and enrich metadata
    // This would integrate with the existing track scanning system

    return { jobId: 'youtube_download', tracks: [] };
  }

  async checkYouTubeCapabilities(): Promise<{
    installed: boolean;
    version?: string;
    cookiesConfigured: boolean;
    lastUpdate?: Date;
    supportedSites?: string[];
  }> {
    if (!this.youtubeService) {
      return { installed: false, cookiesConfigured: false };
    }

    const installation = await this.youtubeService.checkYtDlpInstallation();
    const cookiesStatus = this.youtubeService.getCookiesStatus();

    let supportedSites: string[] | undefined;
    if (installation.installed) {
      try {
        supportedSites = await this.youtubeService.getSupportedSites();
      } catch (error) {
        console.error('Error getting supported sites:', error);
      }
    }

    return {
      installed: installation.installed,
      version: installation.version,
      cookiesConfigured: cookiesStatus.exists,
      lastUpdate: cookiesStatus.lastModified,
      supportedSites
    };
  }

  async refreshYouTubeCookies(browser: 'chrome' | 'firefox' | 'safari' | 'edge' = 'chrome'): Promise<{ success: boolean; message: string }> {
    if (!this.youtubeService) {
      return { success: false, message: 'YouTube service not initialized' };
    }

    return await this.youtubeService.refreshBrowserCookies(browser);
  }
}

// Simple semaphore for rate limiting
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        this.permits--;
        next();
      }
    }
  }
}