import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import type { Track } from '@cleancue/shared';

export interface AudioAnalysisResult {
  peak: number; // Peak level in dB
  rms: number; // RMS level in dB
  lufs: number; // Loudness Units relative to Full Scale
  truePeak: number; // True peak level in dB
  clippingDetected: boolean;
  clippingPercentage: number; // Percentage of samples that are clipped
  dynamicRange: number; // DR14 dynamic range
  recommendations: AudioRecommendation[];
}

export interface AudioRecommendation {
  type: 'normalize' | 'reduce_clipping' | 'increase_dynamic_range' | 'adjust_lufs';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  targetValue?: number;
  currentValue: number;
}

export interface NormalizationOptions {
  targetLufs: number; // Target loudness (-23 LUFS for broadcast, -14 for streaming)
  targetPeak: number; // Target peak level in dB (typically -1 to -3 dB)
  enableLimiter: boolean; // Apply limiter to prevent clipping
  preserveDynamics: boolean; // Preserve dynamic range while normalizing
  outputFormat: 'wav' | 'flac' | 'aiff'; // Format for normalized file
  createBackup: boolean; // Keep original file as backup
  suffix: string; // Suffix for normalized files (e.g., '_normalized')
}

export interface NormalizationJob {
  id: string;
  trackId: string;
  status: 'pending' | 'analyzing' | 'normalizing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    stage: 'analysis' | 'normalization' | 'verification';
    percent: number;
  };
  inputPath: string;
  outputPath?: string;
  backupPath?: string;
  analysisResult?: AudioAnalysisResult;
  options: NormalizationOptions;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class AudioNormalizationService extends EventEmitter {
  private ffmpegPath: string;
  private ffprobePath: string;
  private activeJobs = new Map<string, NormalizationJob>();
  private runningProcesses = new Map<string, ChildProcess>();

  constructor(ffmpegPath: string = 'ffmpeg', ffprobePath: string = 'ffprobe') {
    super();
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
  }

  async checkDependencies(): Promise<{ ffmpeg: boolean; ffprobe: boolean; error?: string }> {
    const checkCommand = async (command: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const process = spawn(command, ['-version']);
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
      });
    };

    const [ffmpeg, ffprobe] = await Promise.all([
      checkCommand(this.ffmpegPath),
      checkCommand(this.ffprobePath)
    ]);

    if (!ffmpeg || !ffprobe) {
      return {
        ffmpeg,
        ffprobe,
        error: 'FFmpeg and FFprobe are required for audio normalization. Please install FFmpeg.'
      };
    }

    return { ffmpeg, ffprobe };
  }

  async analyzeAudio(filePath: string): Promise<AudioAnalysisResult> {
    try {
      // Use FFmpeg's loudnorm and astats filters for comprehensive analysis
      const analysisCommand = [
        '-i', filePath,
        '-af', 'loudnorm=I=-23:LRA=7:tp=-2:print_format=json,astats=metadata=1:reset=1',
        '-f', 'null',
        '-'
      ];

      const { output } = await this.executeFFmpeg(analysisCommand);

      // Parse FFmpeg output for loudness and stats
      const loudnormMatch = output.match(/\{[\s\S]*?"output_i"\s*:\s*"([^"]+)"[\s\S]*?"output_lra"\s*:\s*"([^"]+)"[\s\S]*?"output_tp"\s*:\s*"([^"]+)"[\s\S]*?"output_thresh"\s*:\s*"([^"]+)"[\s\S]*?\}/);
      const peakMatch = output.match(/Peak level\s*dB:\s*([-\d.]+)/);
      const rmsMatch = output.match(/RMS level\s*dB:\s*([-\d.]+)/);
      const clippingMatch = output.match(/Peak count:\s*(\d+)/);
      const sampleCountMatch = output.match(/Sample count:\s*(\d+)/);

      const peak = peakMatch ? parseFloat(peakMatch[1]) : 0;
      const rms = rmsMatch ? parseFloat(rmsMatch[1]) : -60;
      const lufs = loudnormMatch ? parseFloat(loudnormMatch[1]) : -23;
      const truePeak = loudnormMatch ? parseFloat(loudnormMatch[3]) : peak;
      const clippingCount = clippingMatch ? parseInt(clippingMatch[1]) : 0;
      const sampleCount = sampleCountMatch ? parseInt(sampleCountMatch[1]) : 1;

      const clippingPercentage = sampleCount > 0 ? (clippingCount / sampleCount) * 100 : 0;
      const clippingDetected = clippingPercentage > 0.01; // More than 0.01% clipping
      const dynamicRange = Math.abs(peak - rms); // Simplified DR calculation

      const result: AudioAnalysisResult = {
        peak,
        rms,
        lufs,
        truePeak,
        clippingDetected,
        clippingPercentage,
        dynamicRange,
        recommendations: []
      };

      // Generate recommendations
      result.recommendations = this.generateRecommendations(result);

      return result;
    } catch (error) {
      throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateRecommendations(analysis: AudioAnalysisResult): AudioRecommendation[] {
    const recommendations: AudioRecommendation[] = [];

    // Clipping detection
    if (analysis.clippingDetected) {
      const severity = analysis.clippingPercentage > 1 ? 'critical' :
                     analysis.clippingPercentage > 0.1 ? 'high' : 'medium';

      recommendations.push({
        type: 'reduce_clipping',
        severity,
        message: `Audio contains ${analysis.clippingPercentage.toFixed(3)}% clipped samples`,
        currentValue: analysis.clippingPercentage
      });
    }

    // Loudness recommendations
    if (analysis.lufs > -14) {
      recommendations.push({
        type: 'adjust_lufs',
        severity: 'medium',
        message: `Audio is too loud for streaming platforms (${analysis.lufs.toFixed(1)} LUFS)`,
        targetValue: -14,
        currentValue: analysis.lufs
      });
    } else if (analysis.lufs < -30) {
      recommendations.push({
        type: 'adjust_lufs',
        severity: 'high',
        message: `Audio is too quiet (${analysis.lufs.toFixed(1)} LUFS)`,
        targetValue: -18,
        currentValue: analysis.lufs
      });
    }

    // Peak level recommendations
    if (analysis.truePeak > -1) {
      recommendations.push({
        type: 'normalize',
        severity: 'high',
        message: `True peak level too high (${analysis.truePeak.toFixed(1)} dB)`,
        targetValue: -1,
        currentValue: analysis.truePeak
      });
    }

    // Dynamic range recommendations
    if (analysis.dynamicRange < 7) {
      recommendations.push({
        type: 'increase_dynamic_range',
        severity: 'medium',
        message: `Low dynamic range (${analysis.dynamicRange.toFixed(1)} dB)`,
        targetValue: 10,
        currentValue: analysis.dynamicRange
      });
    }

    return recommendations;
  }

  async normalizeAudio(
    track: Track,
    options: Partial<NormalizationOptions> = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const normalizedOptions: NormalizationOptions = {
      targetLufs: -14, // Good for streaming platforms
      targetPeak: -1,
      enableLimiter: true,
      preserveDynamics: true,
      outputFormat: 'wav',
      createBackup: true,
      suffix: '_normalized',
      ...options
    };

    const job: NormalizationJob = {
      id: jobId,
      trackId: track.id,
      status: 'pending',
      progress: { stage: 'analysis', percent: 0 },
      inputPath: track.path,
      options: normalizedOptions,
      createdAt: new Date()
    };

    this.activeJobs.set(jobId, job);
    this.emit('jobCreated', job);

    try {
      // Stage 1: Analyze audio
      job.status = 'analyzing';
      job.progress = { stage: 'analysis', percent: 10 };
      this.emit('jobProgress', job);

      const analysis = await this.analyzeAudio(track.path);
      job.analysisResult = analysis;
      job.progress = { stage: 'analysis', percent: 30 };
      this.emit('jobProgress', job);

      // Stage 2: Normalize audio
      job.status = 'normalizing';
      job.progress = { stage: 'normalization', percent: 40 };
      this.emit('jobProgress', job);

      const outputPath = await this.performNormalization(job);
      job.outputPath = outputPath;

      // Stage 3: Verify result
      job.progress = { stage: 'verification', percent: 90 };
      this.emit('jobProgress', job);

      const verificationAnalysis = await this.analyzeAudio(outputPath);

      job.status = 'completed';
      job.progress = { stage: 'verification', percent: 100 };
      job.completedAt = new Date();
      this.emit('jobCompleted', { job, verificationAnalysis });

      return outputPath;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.emit('jobFailed', job);
      throw error;
    }
  }

  private async performNormalization(job: NormalizationJob): Promise<string> {
    const { inputPath, options } = job;
    const pathInfo = path.parse(inputPath);
    const outputPath = path.join(
      pathInfo.dir,
      `${pathInfo.name}${options.suffix}.${options.outputFormat}`
    );

    // Create backup if requested
    if (options.createBackup) {
      const backupPath = path.join(pathInfo.dir, `${pathInfo.name}_backup${pathInfo.ext}`);
      await fs.copyFile(inputPath, backupPath);
      job.backupPath = backupPath;
    }

    // Build FFmpeg command for normalization
    const command = [
      '-i', inputPath,
      '-af', this.buildFilterChain(job.analysisResult!, options),
      '-c:a', this.getAudioCodec(options.outputFormat),
      '-y', // Overwrite output file
      outputPath
    ];

    await this.executeFFmpegWithProgress(command, job);
    return outputPath;
  }

  private buildFilterChain(analysis: AudioAnalysisResult, options: NormalizationOptions): string {
    const filters: string[] = [];

    // Apply declipping if needed
    if (analysis.clippingDetected && analysis.clippingPercentage > 0.1) {
      filters.push('adeclick=threshold=0.1');
    }

    // Apply loudness normalization
    const loudnormParams = [
      `I=${options.targetLufs}`,
      'LRA=7', // Loudness range
      `tp=${options.targetPeak}`,
      'measured_I=' + analysis.lufs.toFixed(1),
      'measured_LRA=7.0',
      'measured_tp=' + analysis.truePeak.toFixed(1),
      'measured_thresh=' + (analysis.lufs - 10).toFixed(1)
    ];

    if (options.preserveDynamics) {
      loudnormParams.push('linear=true');
    }

    filters.push(`loudnorm=${loudnormParams.join(':')}`);

    // Apply limiter if enabled
    if (options.enableLimiter) {
      filters.push(`alimiter=limit=${options.targetPeak}:attack=5:release=50`);
    }

    return filters.join(',');
  }

  private getAudioCodec(format: string): string {
    switch (format) {
      case 'flac':
        return 'flac';
      case 'aiff':
        return 'pcm_s24be';
      case 'wav':
      default:
        return 'pcm_s24le';
    }
  }

  private async executeFFmpeg(args: string[]): Promise<{ output: string; error: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
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
          resolve({ output: error, error }); // FFmpeg outputs to stderr
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${error}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to execute FFmpeg: ${err.message}`));
      });
    });
  }

  private async executeFFmpegWithProgress(args: string[], job: NormalizationJob): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      this.runningProcesses.set(job.id, process);

      let error = '';

      process.stderr.on('data', (data) => {
        const output = data.toString();
        error += output;

        // Parse progress from FFmpeg output
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);

        if (timeMatch && durationMatch) {
          const currentTime = this.parseTime(timeMatch[1], timeMatch[2], timeMatch[3]);
          const totalTime = this.parseTime(durationMatch[1], durationMatch[2], durationMatch[3]);

          if (totalTime > 0) {
            const progressPercent = Math.min(100, (currentTime / totalTime) * 100);
            job.progress = {
              stage: 'normalization',
              percent: 40 + (progressPercent * 0.5) // 40-90% for normalization
            };
            this.emit('jobProgress', job);
          }
        }
      });

      process.on('close', (code) => {
        this.runningProcesses.delete(job.id);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg normalization failed: ${error}`));
        }
      });

      process.on('error', (err) => {
        this.runningProcesses.delete(job.id);
        reject(new Error(`Failed to execute FFmpeg: ${err.message}`));
      });
    });
  }

  private parseTime(hours: string, minutes: string, seconds: string): number {
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
  }

  async batchNormalize(
    tracks: Track[],
    options: Partial<NormalizationOptions> = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];

      try {
        const outputPath = await this.normalizeAudio(track, options);
        results.set(track.id, outputPath);

        if (onProgress) {
          onProgress(i + 1, tracks.length);
        }
      } catch (error) {
        console.error(`Failed to normalize track ${track.path}:`, error);
        // Continue with next track
      }
    }

    return results;
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

  getJob(jobId: string): NormalizationJob | undefined {
    return this.activeJobs.get(jobId);
  }

  getAllJobs(): NormalizationJob[] {
    return Array.from(this.activeJobs.values());
  }

  getActiveJobs(): NormalizationJob[] {
    return Array.from(this.activeJobs.values()).filter(job =>
      ['pending', 'analyzing', 'normalizing'].includes(job.status)
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
    return `normalize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Presets for common scenarios
  static getDJPreset(): Partial<NormalizationOptions> {
    return {
      targetLufs: -12, // Slightly louder for DJ use
      targetPeak: -1,
      enableLimiter: true,
      preserveDynamics: true,
      outputFormat: 'wav'
    };
  }

  static getBroadcastPreset(): Partial<NormalizationOptions> {
    return {
      targetLufs: -23, // EBU R128 standard
      targetPeak: -2,
      enableLimiter: false,
      preserveDynamics: true,
      outputFormat: 'wav'
    };
  }

  static getStreamingPreset(): Partial<NormalizationOptions> {
    return {
      targetLufs: -14, // Good for Spotify, Apple Music, etc.
      targetPeak: -1,
      enableLimiter: true,
      preserveDynamics: false,
      outputFormat: 'flac'
    };
  }
}