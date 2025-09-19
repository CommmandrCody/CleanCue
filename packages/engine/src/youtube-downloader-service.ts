import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { promises as fs } from 'fs';
import { EventEmitter } from 'events';
import path from 'path';

export interface YouTubeDownloadOptions {
  quality?: string | number;
  format?: string;
  outputTemplate?: string;
  downloadPlaylist?: boolean;
  embedMetadata?: boolean;
  embedThumbnail?: boolean;
  verbose?: boolean;
  outputDir?: string;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  uploader: string;
  duration?: number;
  view_count?: number;
  description?: string;
  upload_date?: string;
  url: string;
  playlist?: boolean;
  entries?: YouTubeVideoInfo[];
  entry_count?: number;
}

export interface YouTubeDownloadResult {
  success: boolean;
  downloadedFiles?: string[];
  outputDir?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  uploader: string;
  duration?: number;
  view_count?: number;
  url: string;
}

export class YouTubeDownloaderService extends EventEmitter {
  private pythonPath: string;
  private workersPath: string;
  private defaultOutputDir: string;

  constructor(workersPath: string, pythonPath: string = 'python3') {
    super();
    this.pythonPath = pythonPath;
    this.workersPath = workersPath;
    this.defaultOutputDir = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', 'Downloads', 'CleanCue');
  }

  /**
   * Check if yt-dlp is available
   */
  async checkDependencies(): Promise<{ available: boolean; error?: string }> {
    try {
      // Check for yt-dlp executable in common locations
      const ytDlpPaths = ['/usr/local/bin/yt-dlp', 'yt-dlp'];

      for (const ytDlpPath of ytDlpPaths) {
        try {
          const { spawn } = require('child_process');
          await new Promise<void>((resolve, reject) => {
            const process = spawn(ytDlpPath, ['--version']);
            process.on('close', (code: number) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`yt-dlp not found at ${ytDlpPath}`));
              }
            });
            process.on('error', reject);
          });
          return { available: true };
        } catch (error) {
          continue; // Try next path
        }
      }

      return {
        available: false,
        error: `yt-dlp not found. Please install with: brew install yt-dlp (macOS) or pip install yt-dlp`
      };
    } catch (error) {
      return {
        available: false,
        error: `yt-dlp check failed: ${error}`
      };
    }
  }

  /**
   * Get information about a YouTube video or playlist
   */
  async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    try {
      const result = await this.runPythonScript('info', [url]);
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Failed to get video info: ${error}`);
    }
  }

  /**
   * Search YouTube videos
   */
  async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
    try {
      const result = await this.runPythonScript('search', [query, maxResults.toString()]);
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Download audio from YouTube URL
   */
  async downloadAudio(url: string, options: YouTubeDownloadOptions = {}): Promise<YouTubeDownloadResult> {
    try {
      // Ensure output directory exists
      const outputDir = options.outputDir || this.defaultOutputDir;
      await fs.mkdir(outputDir, { recursive: true });

      const downloadOptions = {
        quality: options.quality || 'best',
        format: options.format || 'mp3',
        output_template: options.outputTemplate || '%(uploader)s - %(title)s.%(ext)s',
        download_playlist: options.downloadPlaylist || false,
        embed_metadata: options.embedMetadata !== false,
        embed_thumbnail: options.embedThumbnail || false,
        verbose: options.verbose || false,
        output_dir: outputDir
      };

      const optionsJson = JSON.stringify(downloadOptions);
      const result = await this.runPythonScript('download', [url, optionsJson]);

      const downloadResult: YouTubeDownloadResult = JSON.parse(result.stdout);

      // Emit events for progress tracking
      if (downloadResult.success) {
        this.emit('download:completed', {
          url,
          files: downloadResult.downloadedFiles,
          outputDir: downloadResult.outputDir
        });
      } else {
        this.emit('download:failed', {
          url,
          error: downloadResult.error
        });
      }

      return downloadResult;

    } catch (error) {
      const errorResult = {
        success: false,
        error: `Download failed: ${error}`
      };

      this.emit('download:failed', {
        url,
        error: errorResult.error
      });

      return errorResult;
    }
  }

  /**
   * Download multiple videos from URLs or search queries
   */
  async downloadBatch(
    items: Array<{ url?: string; query?: string; options?: YouTubeDownloadOptions }>,
    globalOptions: YouTubeDownloadOptions = {}
  ): Promise<YouTubeDownloadResult[]> {
    const results: YouTubeDownloadResult[] = [];

    this.emit('batch:started', { totalItems: items.length });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      this.emit('batch:progress', {
        current: i + 1,
        total: items.length,
        item: item.url || item.query
      });

      try {
        let url = item.url;

        // If no URL provided, search for the query and use first result
        if (!url && item.query) {
          const searchResults = await this.searchVideos(item.query, 1);
          if (searchResults.length > 0) {
            url = searchResults[0].url;
          } else {
            results.push({
              success: false,
              error: `No search results found for: ${item.query}`
            });
            continue;
          }
        }

        if (!url) {
          results.push({
            success: false,
            error: 'No URL or search query provided'
          });
          continue;
        }

        const mergedOptions = { ...globalOptions, ...item.options };
        const result = await this.downloadAudio(url, mergedOptions);
        results.push(result);

      } catch (error) {
        results.push({
          success: false,
          error: `Failed to download ${item.url || item.query}: ${error}`
        });
      }
    }

    this.emit('batch:completed', {
      totalItems: items.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Run the Python YouTube downloader script
   */
  private async runPythonScript(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.workersPath, 'youtube-downloader.py');
      const pythonArgs = [scriptPath, command, ...args];

      const pythonProcess = spawn(this.pythonPath, pythonArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin'
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }
}