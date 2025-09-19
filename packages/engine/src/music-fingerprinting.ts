import axios from 'axios';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { Track } from '@cleancue/shared';
import { EnhancedMetadata } from './metadata';

export interface FingerprintMatch {
  acoustId?: string;
  musicBrainzId?: string;
  confidence: number;
  matchSource: 'acoustid' | 'musicbrainz' | 'lastfm' | 'filename';
  metadata: {
    title: string;
    artist: string;
    album?: string;
    albumArtist?: string;
    releaseDate?: string;
    duration?: number;
    genre?: string[];
    isrc?: string;
    label?: string;
    catalogNumber?: string;
  };
}

export interface AudioSignature {
  duration: number;
  checksum: string;
  fileSize: number;
  fingerprint?: string;
}

export class MusicFingerprintingService {
  private readonly ACOUSTID_API_KEY = process.env.ACOUSTID_API_KEY;
  private readonly LASTFM_API_KEY = process.env.LASTFM_API_KEY;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between API calls
  private lastApiCall = 0;

  async identifyTrack(filePath: string, existingMetadata?: EnhancedMetadata): Promise<FingerprintMatch[]> {
    const matches: FingerprintMatch[] = [];

    try {
      // Generate audio signature for duplicate detection
      const signature = await this.generateAudioSignature(filePath);

      // Try multiple identification methods
      await Promise.allSettled([
        this.identifyByFilename(filePath, existingMetadata).then(match => {
          if (match) matches.push(match);
        }),
        this.identifyByAudioFingerprint(filePath, signature).then(match => {
          if (match) matches.push(match);
        }),
        this.identifyByLastFm(existingMetadata).then(match => {
          if (match) matches.push(match);
        }),
        this.identifyByMusicBrainz(existingMetadata).then(match => {
          if (match) matches.push(match);
        })
      ]);

      // Sort by confidence
      return matches.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error identifying track:', error);
      return matches;
    }
  }

  private async generateAudioSignature(filePath: string): Promise<AudioSignature> {
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);
      const checksum = crypto.createHash('md5').update(buffer).digest('hex');

      // Extract basic audio properties from existing metadata
      const musicMetadata = await import('music-metadata');
      const metadata = await musicMetadata.parseFile(filePath);

      return {
        duration: metadata.format.duration || 0,
        checksum,
        fileSize: stats.size,
        fingerprint: this.generateSimpleFingerprint(buffer)
      };
    } catch (error) {
      console.error('Error generating audio signature:', error);
      throw error;
    }
  }

  private generateSimpleFingerprint(buffer: Buffer): string {
    // Simple fingerprint based on file content structure
    // This is a basic implementation - in production you'd use proper audio fingerprinting
    const samples = [];
    const step = Math.floor(buffer.length / 100);

    for (let i = 0; i < buffer.length; i += step) {
      if (i + 3 < buffer.length) {
        const sample = buffer.readUInt32BE(i);
        samples.push(sample);
      }
    }

    return crypto.createHash('sha256').update(Buffer.from(samples)).digest('hex').substring(0, 32);
  }

  private async identifyByFilename(filePath: string, metadata?: EnhancedMetadata): Promise<FingerprintMatch | null> {
    if (!metadata?.suggestedArtist || !metadata?.suggestedTitle) {
      return null;
    }

    // High confidence if we have clean filename parsing
    const confidence = metadata.filenameConfidence || 0.5;

    if (confidence < 0.4) {
      return null;
    }

    return {
      confidence: confidence * 0.8, // Scale down since this is just filename parsing
      matchSource: 'filename',
      metadata: {
        title: metadata.suggestedTitle,
        artist: metadata.suggestedArtist,
        album: metadata.album,
        albumArtist: metadata.albumArtist,
        genre: metadata.genre ? [metadata.genre] : undefined
      }
    };
  }

  private async identifyByAudioFingerprint(filePath: string, signature: AudioSignature): Promise<FingerprintMatch | null> {
    if (!this.ACOUSTID_API_KEY) {
      console.warn('AcoustID API key not configured');
      return null;
    }

    try {
      await this.rateLimitDelay();

      // Note: This is a simplified version. Real AcoustID integration would require:
      // 1. Generating proper chromaprint fingerprints using fpcalc
      // 2. Submitting to AcoustID API
      // For now, we'll simulate this with a lookup by duration and basic properties

      const lookupUrl = 'https://api.acoustid.org/v2/lookup';
      const params = {
        client: this.ACOUSTID_API_KEY,
        format: 'json',
        meta: 'recordings+releases+artists',
        // In real implementation, this would be the actual fingerprint
        fingerprint: signature.fingerprint,
        duration: Math.round(signature.duration)
      };

      // This is a placeholder - real implementation would use proper fingerprinting
      console.log('Would query AcoustID with:', params);

      return null; // Return null for now until proper fingerprinting is implemented
    } catch (error) {
      console.error('Error querying AcoustID:', error);
      return null;
    }
  }

  private async identifyByLastFm(metadata?: EnhancedMetadata): Promise<FingerprintMatch | null> {
    if (!this.LASTFM_API_KEY || !metadata?.artist || !metadata?.title) {
      return null;
    }

    try {
      await this.rateLimitDelay();

      const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
        params: {
          method: 'track.getInfo',
          api_key: this.LASTFM_API_KEY,
          artist: metadata.artist,
          track: metadata.title,
          format: 'json'
        },
        timeout: 10000
      });

      if (response.data?.track) {
        const track = response.data.track;
        const confidence = this.calculateLastFmConfidence(track, metadata);

        return {
          confidence,
          matchSource: 'lastfm',
          metadata: {
            title: track.name,
            artist: track.artist?.name || metadata.artist,
            album: track.album?.title,
            albumArtist: track.artist?.name,
            duration: track.duration ? parseInt(track.duration) : undefined,
            genre: track.toptags?.tag?.map((t: any) => t.name) || undefined
          }
        };
      }
    } catch (error) {
      console.error('Error querying Last.fm:', error);
    }

    return null;
  }

  private calculateLastFmConfidence(lastFmTrack: any, metadata: EnhancedMetadata): number {
    let confidence = 0.5;

    // Exact artist match
    if (lastFmTrack.artist?.name?.toLowerCase() === metadata.artist?.toLowerCase()) {
      confidence += 0.3;
    }

    // Exact title match
    if (lastFmTrack.name?.toLowerCase() === metadata.title?.toLowerCase()) {
      confidence += 0.3;
    }

    // Album match
    if (lastFmTrack.album?.title && metadata.album &&
        lastFmTrack.album.title.toLowerCase() === metadata.album.toLowerCase()) {
      confidence += 0.2;
    }

    // Duration match (within 5 seconds)
    if (lastFmTrack.duration && metadata.durationMs) {
      const durationDiff = Math.abs(parseInt(lastFmTrack.duration) - metadata.durationMs / 1000);
      if (durationDiff <= 5) {
        confidence += 0.1;
      }
    }

    return Math.min(1.0, confidence);
  }

  private async identifyByMusicBrainz(metadata?: EnhancedMetadata): Promise<FingerprintMatch | null> {
    if (!metadata?.artist || !metadata?.title) {
      return null;
    }

    try {
      await this.rateLimitDelay();

      // Search MusicBrainz for the track
      const searchQuery = `artist:"${metadata.artist}" AND recording:"${metadata.title}"`;
      const response = await axios.get('https://musicbrainz.org/ws/2/recording', {
        params: {
          query: searchQuery,
          fmt: 'json',
          limit: 5
        },
        headers: {
          'User-Agent': 'CleanCue/1.0 ( contact@cleancue.com )'
        },
        timeout: 10000
      });

      if (response.data?.recordings?.length > 0) {
        const recording = response.data.recordings[0];
        const confidence = this.calculateMusicBrainzConfidence(recording, metadata);

        return {
          musicBrainzId: recording.id,
          confidence,
          matchSource: 'musicbrainz',
          metadata: {
            title: recording.title,
            artist: recording['artist-credit']?.[0]?.name || metadata.artist,
            album: recording.releases?.[0]?.title,
            albumArtist: recording.releases?.[0]?.['artist-credit']?.[0]?.name,
            releaseDate: recording.releases?.[0]?.date,
            duration: recording.length ? Math.round(recording.length / 1000) : undefined,
            isrc: recording.isrcs?.[0],
            label: recording.releases?.[0]?.['label-info']?.[0]?.label?.name
          }
        };
      }
    } catch (error) {
      console.error('Error querying MusicBrainz:', error);
    }

    return null;
  }

  private calculateMusicBrainzConfidence(recording: any, metadata: EnhancedMetadata): number {
    let confidence = 0.6; // Base confidence for MusicBrainz match

    // Exact title match
    if (recording.title?.toLowerCase() === metadata.title?.toLowerCase()) {
      confidence += 0.2;
    }

    // Artist match
    const recordingArtist = recording['artist-credit']?.[0]?.name;
    if (recordingArtist?.toLowerCase() === metadata.artist?.toLowerCase()) {
      confidence += 0.2;
    }

    // Album match
    const recordingAlbum = recording.releases?.[0]?.title;
    if (recordingAlbum && metadata.album &&
        recordingAlbum.toLowerCase() === metadata.album.toLowerCase()) {
      confidence += 0.1;
    }

    // Duration match (within 5 seconds)
    if (recording.length && metadata.durationMs) {
      const durationDiff = Math.abs(recording.length - metadata.durationMs);
      if (durationDiff <= 5000) { // 5 seconds in milliseconds
        confidence += 0.1;
      }
    }

    return Math.min(1.0, confidence);
  }

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastCall));
    }

    this.lastApiCall = Date.now();
  }

  async enrichMetadata(track: Track, existingMetadata: EnhancedMetadata): Promise<EnhancedMetadata> {
    try {
      const matches = await this.identifyTrack(track.path, existingMetadata);

      if (matches.length === 0) {
        return existingMetadata;
      }

      const bestMatch = matches[0];
      const enriched = { ...existingMetadata };

      // Only override if we have high confidence and missing data
      if (bestMatch.confidence > 0.7) {
        if (!enriched.title && bestMatch.metadata.title) {
          enriched.title = bestMatch.metadata.title;
        }
        if (!enriched.artist && bestMatch.metadata.artist) {
          enriched.artist = bestMatch.metadata.artist;
        }
        if (!enriched.album && bestMatch.metadata.album) {
          enriched.album = bestMatch.metadata.album;
        }
        if (!enriched.albumArtist && bestMatch.metadata.albumArtist) {
          enriched.albumArtist = bestMatch.metadata.albumArtist;
        }
        if (!enriched.genre && bestMatch.metadata.genre?.[0]) {
          enriched.genre = bestMatch.metadata.genre[0];
        }
        if (!enriched.label && bestMatch.metadata.label) {
          enriched.label = bestMatch.metadata.label;
        }
        if (!enriched.catalogNumber && bestMatch.metadata.catalogNumber) {
          enriched.catalogNumber = bestMatch.metadata.catalogNumber;
        }
      }

      // Add fingerprint information
      enriched.musicBrainzId = bestMatch.musicBrainzId;
      enriched.acoustId = bestMatch.acoustId;
      enriched.fingerprintConfidence = bestMatch.confidence;
      enriched.fingerprintSource = bestMatch.matchSource;

      return enriched;
    } catch (error) {
      console.error('Error enriching metadata:', error);
      return existingMetadata;
    }
  }

  async batchIdentifyTracks(tracks: Track[], onProgress?: (completed: number, total: number) => void): Promise<Map<string, FingerprintMatch[]>> {
    const results = new Map<string, FingerprintMatch[]>();

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];

      try {
        // Load existing metadata first
        const musicMetadata = await import('music-metadata');
        const metadata = await musicMetadata.parseFile(track.path);

        // Convert to enhanced metadata format
        const enhancedMetadata: EnhancedMetadata = {
          title: metadata.common.title,
          artist: metadata.common.artist,
          album: metadata.common.album,
          albumArtist: metadata.common.albumartist,
          genre: metadata.common.genre?.[0],
          year: metadata.common.year,
          trackNumber: metadata.common.track?.no,
          discNumber: metadata.common.disk?.no,
          durationMs: metadata.format.duration ? metadata.format.duration * 1000 : undefined,
          bitrate: metadata.format.bitrate,
          sampleRate: metadata.format.sampleRate,
          channels: metadata.format.numberOfChannels
        };

        const matches = await this.identifyTrack(track.path, enhancedMetadata);
        results.set(track.id, matches);

        if (onProgress) {
          onProgress(i + 1, tracks.length);
        }

        // Rate limiting between tracks
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error identifying track ${track.path}:`, error);
        results.set(track.id, []);
      }
    }

    return results;
  }
}

// Extend EnhancedMetadata interface for fingerprinting
declare module './metadata' {
  interface EnhancedMetadata {
    musicBrainzId?: string;
    acoustId?: string;
    fingerprintConfidence?: number;
    fingerprintSource?: 'acoustid' | 'musicbrainz' | 'lastfm' | 'filename';
  }
}