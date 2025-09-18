import { randomUUID } from 'crypto';
import type { Track, Analysis, CuePoint, Playlist, PlaylistTrack, HealthIssue } from '@cleancue/shared';

export class CleanCueDatabase {
  private tracks: Map<string, Track> = new Map();
  private analyses: Map<string, Analysis> = new Map();
  private cues: Map<string, CuePoint> = new Map();
  private tracksByPath: Map<string, string> = new Map();
  private tracksByHash: Map<string, string[]> = new Map();

  constructor(dbPath: string) {
    console.log(`Mock database initialized at: ${dbPath}`);
  }

  async insertTrack(track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track> {
    const id = randomUUID();
    const now = new Date();
    
    const newTrack: Track = {
      ...track,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.tracks.set(id, newTrack);
    this.tracksByPath.set(track.path, id);
    
    // Handle hash mapping
    if (!this.tracksByHash.has(track.hash)) {
      this.tracksByHash.set(track.hash, []);
    }
    this.tracksByHash.get(track.hash)!.push(id);
    
    return newTrack;
  }

  updateTrack(id: string, updates: Partial<Track>): void {
    const track = this.tracks.get(id);
    if (track) {
      const updatedTrack = { ...track, ...updates, updatedAt: new Date() };
      this.tracks.set(id, updatedTrack);
    }
  }

  getTrack(id: string): Track | null {
    return this.tracks.get(id) || null;
  }

  getTrackByPath(path: string): Track | null {
    const id = this.tracksByPath.get(path);
    return id ? this.tracks.get(id) || null : null;
  }

  getTrackByHash(hash: string): Track[] {
    const ids = this.tracksByHash.get(hash) || [];
    return ids.map(id => this.tracks.get(id)!).filter(Boolean);
  }

  getAllTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  async insertAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt'>): Promise<Analysis> {
    const id = randomUUID();
    const newAnalysis: Analysis = {
      ...analysis,
      id,
      createdAt: new Date()
    };
    
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }

  updateAnalysis(id: string, updates: Partial<Analysis>): void {
    const analysis = this.analyses.get(id);
    if (analysis) {
      const updatedAnalysis = { ...analysis, ...updates };
      this.analyses.set(id, updatedAnalysis);
    }
  }

  getAnalysesByTrack(trackId: string): Analysis[] {
    return Array.from(this.analyses.values()).filter(a => a.trackId === trackId);
  }

  async insertCue(cue: Omit<CuePoint, 'id' | 'createdAt'>): Promise<CuePoint> {
    const id = randomUUID();
    const newCue: CuePoint = {
      ...cue,
      id,
      createdAt: new Date()
    };
    
    this.cues.set(id, newCue);
    return newCue;
  }

  getCuesByTrack(trackId: string): CuePoint[] {
    return Array.from(this.cues.values()).filter(c => c.trackId === trackId);
  }

  getHealthIssues(): HealthIssue[] {
    const issues: HealthIssue[] = [];
    
    // Mock some health checks
    for (const track of this.tracks.values()) {
      const analyses = this.getAnalysesByTrack(track.id);
      if (analyses.length === 0) {
        issues.push({
          trackId: track.id,
          path: track.path,
          type: 'no_analysis',
          severity: 'info',
          message: 'Track has not been analyzed'
        });
      }
    }
    
    return issues;
  }

  close(): void {
    console.log('Mock database closed');
  }
}
