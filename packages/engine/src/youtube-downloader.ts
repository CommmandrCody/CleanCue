import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import type { Track } from '@cleancue/shared';
import { EnhancedMetadata } from './metadata';

export interface YtDlpInfo {
  id: string;
  title: string;
  uploader: string;
  uploader_id: string;
  duration: number;
  view_count?: number;
  like_count?: number;
  upload_date: string;
  description?: string;
  thumbnail?: string;
  webpage_url: string;
  format_id: string;
  ext: string;
  resolution?: string;
  filesize?: number;
  abr?: number; // Average bitrate
  acodec?: string;
  vcodec?: string;
  playlist?: string;
  playlist_index?: number;
  artist?: string;
  album?: string;
  track?: string;
  genre?: string;
}

export interface DownloadJob {
  id: string;
  url: string;
  type: 'single' | 'playlist';
  status: 'pending' | 'extracting' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    percent: number;
    downloaded: number;
    total: number;
    speed?: string;
    eta?: string;
  };
  info?: YtDlpInfo | YtDlpInfo[];
  outputPath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface DownloadOptions {
  format: 'best' | 'mp3-320' | 'mp3-256' | 'mp3-192' | 'wav' | 'flac' | 'opus';
  outputDir: string;
  extractAudio: boolean;
  keepVideo: boolean;
  embedThumbnail: boolean;
  addMetadata: boolean;
  playlistStart?: number;
  playlistEnd?: number;
  maxFilesize?: string; // e.g., "50M", "1G"
  skipUnavailable: boolean;
  ignoreCopyright: boolean;
  proxy?: string;
  cookies?: string; // Path to cookies file
}

export class YouTubeDownloaderService extends EventEmitter {
  private ytDlpPath: string;
  private activeJobs = new Map<string, DownloadJob>();
  private runningProcesses = new Map<string, ChildProcess>();
  private cookiesPath?: string;
  private lastUpdateCheck: Date | null = null;
  private updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours

  constructor(ytDlpPath: string = 'yt-dlp', cookiesDir?: string) {
    super();
    this.ytDlpPath = ytDlpPath;
    if (cookiesDir) {
      this.cookiesPath = path.join(cookiesDir, 'browser-cookies.txt');
    }

    // Check for updates on startup
    this.checkForUpdatesOnStartup();
  }

  async checkYtDlpInstallation(): Promise<{ installed: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const process = spawn(this.ytDlpPath, ['--version']);
      let version = '';
      let error = '';

      process.stdout.on('data', (data) => {
        version += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ installed: true, version: version.trim() });
        } else {
          resolve({
            installed: false,
            error: error || 'yt-dlp not found. Please install yt-dlp: pip install yt-dlp'
          });
        }
      });

      process.on('error', (err) => {
        resolve({
          installed: false,
          error: `Failed to execute yt-dlp: ${err.message}`
        });
      });
    });
  }

  async extractInfo(url: string): Promise<YtDlpInfo | YtDlpInfo[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-warnings',
        '--ignore-errors',
        url
      ];

      const process = spawn(this.ytDlpPath, args);
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n').filter(line => line.trim());
            const results = lines.map(line => JSON.parse(line));
            resolve(results.length === 1 ? results[0] : results);
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseError}`));
          }
        } else {
          reject(new Error(`yt-dlp failed: ${error}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to execute yt-dlp: ${err.message}`));
      });
    });
  }

  async downloadUrl(url: string, options: DownloadOptions): Promise<string> {
    const jobId = this.generateJobId();
    const job: DownloadJob = {
      id: jobId,
      url,
      type: 'single', // Will be updated after info extraction
      status: 'pending',
      progress: { percent: 0, downloaded: 0, total: 0 },
      createdAt: new Date()
    };

    this.activeJobs.set(jobId, job);
    this.emit('jobCreated', job);

    try {
      // Extract info first
      job.status = 'extracting';
      this.emit('jobUpdated', job);

      const info = await this.extractInfo(url);
      job.info = info;
      job.type = Array.isArray(info) ? 'playlist' : 'single';

      // Start download
      job.status = 'downloading';
      this.emit('jobUpdated', job);

      const outputPath = await this.executeDownload(jobId, url, options);

      job.status = 'completed';
      job.outputPath = outputPath;
      job.completedAt = new Date();
      this.emit('jobCompleted', job);

      return outputPath;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.emit('jobFailed', job);
      throw error;
    }
  }

  private async executeDownload(jobId: string, url: string, options: DownloadOptions): Promise<string> {
    const args = await this.buildYtDlpArgs(url, options);

    return new Promise((resolve, reject) => {
      const process = spawn(this.ytDlpPath, args);

      this.runningProcesses.set(jobId, process);

      let outputPath = '';
      let error = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        this.parseProgress(jobId, output);

        // Extract output filename
        const filenameMatch = output.match(/\[download\] Destination: (.+)/);
        if (filenameMatch) {
          outputPath = filenameMatch[1];
        }
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
        this.parseProgress(jobId, data.toString());
      });

      process.on('close', (code) => {
        this.runningProcesses.delete(jobId);

        if (code === 0) {
          resolve(outputPath || options.outputDir);
        } else {
          reject(new Error(`Download failed: ${error}`));
        }
      });

      process.on('error', (err) => {
        this.runningProcesses.delete(jobId);
        reject(new Error(`Failed to execute yt-dlp: ${err.message}`));
      });
    });
  }

  private async buildYtDlpArgs(url: string, options: DownloadOptions): Promise<string[]> {
    const args = [
      '--no-warnings',
      '--progress',
      '--newline',
      url
    ];

    // Output directory
    args.push('-o', path.join(options.outputDir, '%(uploader)s - %(title)s.%(ext)s'));

    // Format selection
    if (options.extractAudio) {
      args.push('--extract-audio');

      switch (options.format) {
        case 'mp3-320':
          args.push('--audio-format', 'mp3', '--audio-quality', '320K');
          break;
        case 'mp3-256':
          args.push('--audio-format', 'mp3', '--audio-quality', '256K');
          break;
        case 'mp3-192':
          args.push('--audio-format', 'mp3', '--audio-quality', '192K');
          break;
        case 'flac':
          args.push('--audio-format', 'flac');
          break;
        case 'wav':
          args.push('--audio-format', 'wav');
          break;
        case 'opus':
          args.push('--audio-format', 'opus');
          break;
        default:
          args.push('--audio-format', 'best');
      }
    } else {
      args.push('-f', 'best');
    }

    // Keep video option
    if (options.keepVideo && options.extractAudio) {
      args.push('--keep-video');
    }

    // Embed thumbnail
    if (options.embedThumbnail) {
      args.push('--embed-thumbnail');
    }

    // Add metadata
    if (options.addMetadata) {
      args.push('--add-metadata');
      args.push('--embed-info-json');
    }

    // Playlist options
    if (options.playlistStart) {
      args.push('--playlist-start', options.playlistStart.toString());
    }
    if (options.playlistEnd) {
      args.push('--playlist-end', options.playlistEnd.toString());
    }

    // File size limit
    if (options.maxFilesize) {
      args.push('--max-filesize', options.maxFilesize);
    }

    // Skip unavailable videos
    if (options.skipUnavailable) {
      args.push('--ignore-errors');
    }

    // Ignore copyright restrictions (use with caution)
    if (options.ignoreCopyright) {
      args.push('--ignore-config');
    }

    // Proxy
    if (options.proxy) {
      args.push('--proxy', options.proxy);
    }

    // Cookies - use our extracted cookies if available
    const cookiesFile = options.cookies || this.cookiesPath;
    if (cookiesFile) {
      try {
        await fs.access(cookiesFile);
        args.push('--cookies', cookiesFile);
      } catch {
        // Cookies file doesn't exist, continue without it
        console.warn(`Cookies file not found: ${cookiesFile}`);
      }
    }

    return args;
  }

  private async checkForUpdatesOnStartup(): Promise<void> {
    try {
      const installation = await this.checkYtDlpInstallation();
      if (!installation.installed) {
        this.emit('updateRequired', {
          type: 'installation',
          message: 'yt-dlp is not installed. Please install it with: pip install yt-dlp'
        });
        return;
      }

      // Check if we need to update (daily check)
      if (this.lastUpdateCheck &&
          Date.now() - this.lastUpdateCheck.getTime() < this.updateCheckInterval) {
        return;
      }

      this.lastUpdateCheck = new Date();
      this.emit('updateCheckStarted');

      // Check for updates in background
      setTimeout(() => this.performUpdateCheck(), 5000); // Delay 5 seconds after startup
    } catch (error) {
      console.error('Error during startup update check:', error);
    }
  }

  private async performUpdateCheck(): Promise<void> {
    try {
      const updateResult = await this.updateYtDlp();
      if (updateResult.success) {
        if (updateResult.message.includes('yt-dlp is up to date')) {
          this.emit('updateCheckCompleted', { upToDate: true });
        } else {
          this.emit('updateCheckCompleted', {
            upToDate: false,
            updated: true,
            message: updateResult.message
          });
        }
      } else {
        this.emit('updateCheckFailed', updateResult.message);
      }
    } catch (error) {
      this.emit('updateCheckFailed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async extractBrowserCookies(browser: 'chrome' | 'firefox' | 'safari' | 'edge' = 'chrome'): Promise<{ success: boolean; message: string; cookiesPath?: string }> {
    if (!this.cookiesPath) {
      return { success: false, message: 'Cookies directory not configured' };
    }

    try {
      // Ensure cookies directory exists
      await fs.mkdir(path.dirname(this.cookiesPath), { recursive: true });

      const args = [
        '--cookies-from-browser', browser,
        '--cookies', this.cookiesPath,
        '--no-download',
        'https://www.youtube.com' // Just extract cookies, don't download
      ];

      const result = await this.executeCommand(args);

      if (result.success) {
        // Verify cookies file was created
        try {
          await fs.access(this.cookiesPath);
          return {
            success: true,
            message: `Successfully extracted ${browser} cookies`,
            cookiesPath: this.cookiesPath
          };
        } catch {
          return { success: false, message: 'Cookies file was not created' };
        }
      } else {
        return { success: false, message: result.error || 'Failed to extract cookies' };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error extracting cookies: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async refreshBrowserCookies(browser: 'chrome' | 'firefox' | 'safari' | 'edge' = 'chrome'): Promise<{ success: boolean; message: string }> {
    const result = await this.extractBrowserCookies(browser);
    if (result.success) {
      this.emit('cookiesRefreshed', { browser, cookiesPath: result.cookiesPath });
    }
    return result;
  }

  private async executeCommand(args: string[]): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const process = spawn(this.ytDlpPath, args);
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: output.trim() });
        } else {
          resolve({ success: false, error: error.trim() || 'Command failed' });
        }
      });

      process.on('error', (err) => {
        resolve({ success: false, error: `Failed to execute command: ${err.message}` });
      });
    });
  }

  getCookiesStatus(): { configured: boolean; exists: boolean; path?: string; lastModified?: Date } {
    if (!this.cookiesPath) {
      return { configured: false, exists: false };
    }

    try {
      const stats = require('fs').statSync(this.cookiesPath);
      return {
        configured: true,
        exists: true,
        path: this.cookiesPath,
        lastModified: stats.mtime
      };
    } catch {
      return {
        configured: true,
        exists: false,
        path: this.cookiesPath
      };
    }
  }

  async testDownloadCapability(testUrl: string = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'): Promise<{ success: boolean; message: string; info?: any }> {
    try {
      this.emit('testStarted', { url: testUrl });

      // First try to extract info without downloading
      const info = await this.extractInfo(testUrl);

      if (Array.isArray(info) ? info.length > 0 : info) {
        this.emit('testCompleted', { success: true, info });
        return {
          success: true,
          message: 'Successfully extracted video information',
          info: Array.isArray(info) ? info[0] : info
        };
      } else {
        const message = 'Failed to extract video information - cookies may be required';
        this.emit('testFailed', { message });
        return { success: false, message };
      }
    } catch (error) {
      const message = `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.emit('testFailed', { message });
      return { success: false, message };
    }
  }

  private parseProgress(jobId: string, output: string): void {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    // Parse download progress
    const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/);
    if (progressMatch) {
      job.progress.percent = parseFloat(progressMatch[1]);
      job.progress.speed = progressMatch[3];
      job.progress.eta = progressMatch[4];
      this.emit('progressUpdated', job);
    }

    // Parse file size
    const sizeMatch = output.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?\s*(\d+\.?\d*[KMGT]?B)/);
    if (sizeMatch) {
      job.progress.percent = parseFloat(sizeMatch[1]);
      const sizeStr = sizeMatch[2];
      job.progress.total = this.parseFileSize(sizeStr);
      job.progress.downloaded = Math.round((job.progress.percent / 100) * job.progress.total);
      this.emit('progressUpdated', job);
    }

    // Check for completion or errors
    if (output.includes('[download] 100%')) {
      job.status = 'processing';
      job.progress.percent = 100;
      this.emit('jobUpdated', job);
    }

    if (output.includes('ERROR:')) {
      job.status = 'failed';
      job.error = output.match(/ERROR:\s*(.+)/)?.[1] || 'Unknown error';
      this.emit('jobFailed', job);
    }
  }

  private parseFileSize(sizeStr: string): number {
    const match = sizeStr.match(/(\d+\.?\d*)\s*([KMGT]?)B/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers = { '': 1, 'K': 1024, 'M': 1024 ** 2, 'G': 1024 ** 3, 'T': 1024 ** 4 };
    return value * (multipliers[unit as keyof typeof multipliers] || 1);
  }

  cancelJob(jobId: string): boolean {
    const process = this.runningProcesses.get(jobId);
    const job = this.activeJobs.get(jobId);

    if (process) {
      process.kill('SIGTERM');
      this.runningProcesses.delete(jobId);
    }

    if (job) {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.emit('jobCancelled', job);
      return true;
    }

    return false;
  }

  getJob(jobId: string): DownloadJob | undefined {
    return this.activeJobs.get(jobId);
  }

  getAllJobs(): DownloadJob[] {
    return Array.from(this.activeJobs.values());
  }

  getActiveJobs(): DownloadJob[] {
    return Array.from(this.activeJobs.values()).filter(job =>
      ['pending', 'extracting', 'downloading', 'processing'].includes(job.status)
    );
  }

  clearCompletedJobs(): void {
    const completedJobIds = Array.from(this.activeJobs.entries())
      .filter(([_, job]) => ['completed', 'failed', 'cancelled'].includes(job.status))
      .map(([id, _]) => id);

    completedJobIds.forEach(id => this.activeJobs.delete(id));
    this.emit('jobsCleared', completedJobIds);
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async convertToMetadata(info: YtDlpInfo, downloadPath: string): Promise<EnhancedMetadata> {
    const metadata: EnhancedMetadata = {
      title: this.cleanTitle(info.title),
      artist: info.uploader || info.artist || 'Unknown Artist',
      album: info.album || info.playlist || 'YouTube Downloads',
      year: info.upload_date ? parseInt(info.upload_date.substring(0, 4)) : undefined,
      durationMs: info.duration ? info.duration * 1000 : undefined,
      genre: info.genre || 'Electronic',
      comment: `Downloaded from ${info.webpage_url}`,

      // YouTube-specific metadata
      originalArtist: info.artist,
      version: this.extractVersion(info.title),

      // Technical metadata
      bitrate: info.abr,

      // Quality indicators
      metadataQuality: 'good',
      filenamePattern: 'youtube_download',
      filenameConfidence: 0.8,

      // YouTube metadata
      youtubeId: info.id,
      youtubeUrl: info.webpage_url,
      youtubeUploader: info.uploader,
      youtubeViews: info.view_count,
      youtubeLikes: info.like_count,
      youtubeDescription: info.description?.substring(0, 500), // Limit description length
      youtubeThumbnail: info.thumbnail
    };

    return metadata;
  }

  private cleanTitle(title: string): string {
    // Remove common YouTube suffixes
    let cleaned = title
      .replace(/\s*\(Official.*?\)/gi, '')
      .replace(/\s*\[Official.*?\]/gi, '')
      .replace(/\s*- Official.*$/gi, '')
      .replace(/\s*\| Official.*$/gi, '')
      .replace(/\s*HD$/gi, '')
      .replace(/\s*4K$/gi, '')
      .replace(/\s*\(HD\)/gi, '')
      .replace(/\s*\[HD\]/gi, '')
      .trim();

    return cleaned;
  }

  private extractVersion(title: string): string | undefined {
    const versionMatch = title.match(/\((.*(?:remix|mix|edit|version|extended|radio).*)\)/i);
    return versionMatch ? versionMatch[1] : undefined;
  }

  async getSupportedSites(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ytDlpPath, ['--list-extractors']);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const sites = output
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('yt-dlp'))
            .map(line => line.trim());
          resolve(sites);
        } else {
          reject(new Error('Failed to get supported sites'));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to execute yt-dlp: ${err.message}`));
      });
    });
  }

  async updateYtDlp(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const process = spawn(this.ytDlpPath, ['-U']);
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: output.trim() });
        } else {
          resolve({ success: false, message: error || 'Update failed' });
        }
      });

      process.on('error', (err) => {
        resolve({ success: false, message: `Failed to execute yt-dlp: ${err.message}` });
      });
    });
  }
}

// Extend EnhancedMetadata interface for YouTube metadata
declare module './metadata' {
  interface EnhancedMetadata {
    youtubeId?: string;
    youtubeUrl?: string;
    youtubeUploader?: string;
    youtubeViews?: number;
    youtubeLikes?: number;
    youtubeDescription?: string;
    youtubeThumbnail?: string;
  }
}