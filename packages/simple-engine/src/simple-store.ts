/**
 * Simple Store - Replace Complex Database/Engine
 *
 * Ultra-lightweight storage using JSON files instead of complex database.
 * Perfect for preserving the great UI you built while simplifying the backend.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export interface CuePoint {
  id: string;
  name: string;
  position: number; // seconds
  type: 'cue' | 'loop' | 'hotcue';
  color?: string;
}

export interface Track {
  id: string;
  path: string;
  filename: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number; // seconds
  bpm?: number;
  key?: string;
  camelotKey?: string;
  energy?: number; // 0-1 scale
  size: number;
  format: string;
  dateAdded: Date;
  lastModified: Date;
  hash?: string;
  cuePoints?: CuePoint[];
}

export interface Library {
  tracks: Track[];
  lastScan: Date;
  totalFiles: number;
  totalSize: number;
}

export class SimpleStore {
  private storePath: string;
  private library: Library;
  private loaded = false;

  constructor(storePath?: string) {
    // Store in user's home directory by default
    this.storePath = storePath || path.join(require('os').homedir(), '.cleancue', 'library.json');
    this.library = {
      tracks: [],
      lastScan: new Date(),
      totalFiles: 0,
      totalSize: 0
    };
  }

  async load(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storePath), { recursive: true });

      const data = await fs.readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(data);

      // Convert date strings back to Date objects
      this.library = {
        ...parsed,
        lastScan: new Date(parsed.lastScan),
        tracks: parsed.tracks.map((track: any) => ({
          ...track,
          dateAdded: new Date(track.dateAdded),
          lastModified: new Date(track.lastModified)
        }))
      };

      this.loaded = true;
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      console.log('Starting with empty library');
      this.loaded = true;
    }
  }

  async save(): Promise<void> {
    if (!this.loaded) await this.load();

    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(this.library, null, 2));
  }

  async getTracks(): Promise<Track[]> {
    if (!this.loaded) await this.load();
    return [...this.library.tracks]; // Return copy
  }

  async getTrackById(id: string): Promise<Track | undefined> {
    if (!this.loaded) await this.load();
    return this.library.tracks.find(track => track.id === id);
  }

  async addTrack(trackData: Omit<Track, 'id' | 'dateAdded'>): Promise<Track> {
    if (!this.loaded) await this.load();

    const track: Track = {
      ...trackData,
      id: this.generateId(trackData.path),
      dateAdded: new Date()
    };

    // Remove existing track with same path
    this.library.tracks = this.library.tracks.filter(t => t.path !== track.path);

    // Add new track
    this.library.tracks.push(track);
    this.updateStats();

    return track;
  }

  async updateTrack(id: string, updates: Partial<Track>): Promise<Track | undefined> {
    if (!this.loaded) await this.load();

    const trackIndex = this.library.tracks.findIndex(t => t.id === id);
    if (trackIndex === -1) return undefined;

    this.library.tracks[trackIndex] = {
      ...this.library.tracks[trackIndex],
      ...updates
    };

    return this.library.tracks[trackIndex];
  }

  async removeTrack(id: string): Promise<boolean> {
    if (!this.loaded) await this.load();

    const initialLength = this.library.tracks.length;
    this.library.tracks = this.library.tracks.filter(t => t.id !== id);

    if (this.library.tracks.length < initialLength) {
      this.updateStats();
      return true;
    }

    return false;
  }

  async searchTracks(query: string): Promise<Track[]> {
    if (!this.loaded) await this.load();

    const normalizedQuery = query.toLowerCase();

    return this.library.tracks.filter(track =>
      track.filename.toLowerCase().includes(normalizedQuery) ||
      track.title?.toLowerCase().includes(normalizedQuery) ||
      track.artist?.toLowerCase().includes(normalizedQuery) ||
      track.album?.toLowerCase().includes(normalizedQuery)
    );
  }

  async getTracksByFormat(format: string): Promise<Track[]> {
    if (!this.loaded) await this.load();
    return this.library.tracks.filter(track => track.format === format.toUpperCase());
  }

  async getRecentTracks(limit: number = 20): Promise<Track[]> {
    if (!this.loaded) await this.load();

    return this.library.tracks
      .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
      .slice(0, limit);
  }

  async getStats(): Promise<{
    totalTracks: number;
    totalSize: number;
    formatBreakdown: Record<string, number>;
    analyzedCounts: {
      bpm: number;
      key: number;
      energy: number;
      total: number;
    };
  }> {
    if (!this.loaded) await this.load();

    const formatBreakdown: Record<string, number> = {};
    let bpmCount = 0;
    let keyCount = 0;
    let energyCount = 0;

    for (const track of this.library.tracks) {
      formatBreakdown[track.format] = (formatBreakdown[track.format] || 0) + 1;
      if (track.bpm) bpmCount++;
      if (track.key) keyCount++;
      if (track.energy !== undefined) energyCount++;
    }

    return {
      totalTracks: this.library.totalFiles,
      totalSize: this.library.totalSize,
      formatBreakdown,
      analyzedCounts: {
        bpm: bpmCount,
        key: keyCount,
        energy: energyCount,
        total: this.library.totalFiles
      }
    };
  }

  async cleanup(): Promise<number> {
    if (!this.loaded) await this.load();

    const originalCount = this.library.tracks.length;
    const validTracks: Track[] = [];

    // Check if files still exist
    for (const track of this.library.tracks) {
      try {
        await fs.access(track.path);
        validTracks.push(track);
      } catch {
        // File no longer exists, remove from library
      }
    }

    this.library.tracks = validTracks;
    this.updateStats();

    return originalCount - validTracks.length;
  }

  private updateStats(): void {
    this.library.totalFiles = this.library.tracks.length;
    this.library.totalSize = this.library.tracks.reduce((sum, track) => sum + track.size, 0);
    this.library.lastScan = new Date();
  }

  private generateId(filePath: string): string {
    return createHash('md5').update(filePath).digest('hex').substring(0, 12);
  }

  // Utility methods for the UI
  async exportToJson(outputPath?: string): Promise<string> {
    if (!this.loaded) await this.load();

    const exportPath = outputPath || path.join(path.dirname(this.storePath), `library-export-${Date.now()}.json`);
    await fs.writeFile(exportPath, JSON.stringify(this.library, null, 2));
    return exportPath;
  }

  async importFromJson(jsonPath: string): Promise<number> {
    const data = await fs.readFile(jsonPath, 'utf8');
    const importedLibrary = JSON.parse(data);

    if (!importedLibrary.tracks || !Array.isArray(importedLibrary.tracks)) {
      throw new Error('Invalid library format');
    }

    const importedCount = importedLibrary.tracks.length;

    // Merge with existing library (avoid duplicates by path)
    const existingPaths = new Set(this.library.tracks.map(t => t.path));
    const newTracks = importedLibrary.tracks.filter((track: Track) => !existingPaths.has(track.path));

    this.library.tracks.push(...newTracks);
    this.updateStats();

    return newTracks.length;
  }
}