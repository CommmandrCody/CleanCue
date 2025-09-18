import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { Config } from '@cleancue/shared';

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  private getDefaultConfigPath(): string {
    const configDir = path.join(os.homedir(), '.cleancue');
    return path.join(configDir, 'config.json');
  }

  private getDefaultConfig(): Config {
    return {
      database: {
        path: path.join(os.homedir(), '.cleancue', 'library.db')
      },
      scanning: {
        extensions: ['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.wma', '.aiff', '.ape'],
        respectGitignore: false,
        followSymlinks: false,
        maxFileSize: 500 * 1024 * 1024, // 500MB
        hashAlgorithm: 'sha256'
      },
      workers: {
        maxWorkers: Math.max(1, Math.floor(os.cpus().length / 2)),
        jobTimeout: 300000, // 5 minutes
        retryAttempts: 2
      },
      analyzers: {
        tempo: {
          enabled: true,
          parameters: {
            minBpm: 60,
            maxBpm: 200,
            windowSize: 2048
          }
        },
        key: {
          enabled: true,
          parameters: {
            algorithm: 'krumhansl',
            windowSize: 4096
          }
        },
        energy: {
          enabled: false,
          parameters: {
            windowSize: 1024,
            hopSize: 512
          }
        },
        segments: {
          enabled: false,
          parameters: {
            minSegmentLength: 5000, // 5 seconds
            threshold: 0.3
          }
        }
      },
      export: {
        defaultFormat: 'm3u',
        relativePaths: true,
        includeCues: true
      },
      ui: {
        theme: 'dark',
        language: 'en',
        autoScan: false,
        notifications: true
      }
    };
  }

  private async loadConfig(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Try to load existing config
      const configData = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(configData);
      
      // Merge with defaults to ensure all properties exist
      this.config = this.mergeConfig(this.config, loadedConfig);
    } catch (error) {
      // Config file doesn't exist or is invalid, use defaults
      if ((error as Error).message.includes('ENOENT')) {
        // File doesn't exist, create it with defaults
        await this.saveConfig();
      } else {
        console.warn('Failed to load config, using defaults:', (error as Error).message);
      }
    }
  }

  private mergeConfig(defaultConfig: any, userConfig: any): any {
    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergeConfig(defaultConfig[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  private async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf8');
    } catch (error) {
      console.error('Failed to save config:', (error as Error).message);
    }
  }

  get<T = any>(path: string): T {
    const keys = path.split('.');
    let current: any = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined as T;
      }
    }
    
    return current as T;
  }

  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    let current: any = this.config;
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    this.saveConfig();
  }

  update(updates: Partial<Config>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.saveConfig();
  }

  getAll(): Config {
    return JSON.parse(JSON.stringify(this.config)); // Deep copy
  }

  reset(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  getConfigPath(): string {
    return this.configPath;
  }

  // Validate configuration
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check database path
    if (!this.config.database?.path) {
      errors.push('Database path is required');
    }
    
    // Check worker configuration
    if (this.config.workers?.maxWorkers && this.config.workers.maxWorkers < 1) {
      errors.push('Maximum workers must be at least 1');
    }
    
    if (this.config.workers?.jobTimeout && this.config.workers.jobTimeout < 1000) {
      errors.push('Job timeout must be at least 1000ms');
    }
    
    // Check scanning configuration
    if (this.config.scanning?.maxFileSize && this.config.scanning.maxFileSize < 1024) {
      errors.push('Maximum file size must be at least 1KB');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}