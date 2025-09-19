import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Track } from '@cleancue/shared';
import { EnhancedMetadata } from './metadata';

export interface AlbumArtSource {
  url: string;
  size: { width: number; height: number };
  quality: 'thumbnail' | 'medium' | 'large' | 'extralarge' | 'mega';
  source: 'embedded' | 'lastfm' | 'musicbrainz' | 'coverartarchive' | 'spotify' | 'itunes' | 'discogs';
  confidence: number;
}

export interface AlbumArtResult {
  trackId: string;
  sources: AlbumArtSource[];
  selectedArt?: {
    localPath: string;
    source: AlbumArtSource;
  };
  error?: string;
}

export class AlbumArtService {
  private readonly LASTFM_API_KEY = process.env.LASTFM_API_KEY;
  private readonly SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  private readonly SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  private readonly artworkCacheDir: string;
  private readonly RATE_LIMIT_DELAY = 1000;
  private lastApiCall = 0;
  private spotifyToken?: { token: string; expires: number };

  constructor(cacheDirectory: string) {
    this.artworkCacheDir = path.join(cacheDirectory, 'artwork');
    this.ensureCacheDirectory();
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.artworkCacheDir, { recursive: true });
    } catch (error) {
      console.error('Error creating artwork cache directory:', error);
    }
  }

  async findAlbumArt(track: Track, metadata: EnhancedMetadata): Promise<AlbumArtResult> {
    const result: AlbumArtResult = {
      trackId: track.id,
      sources: []
    };

    try {
      // Try multiple sources in parallel
      const artSources = await Promise.allSettled([
        this.extractEmbeddedArt(track.path),
        this.searchLastFmArt(metadata),
        this.searchMusicBrainzArt(metadata),
        this.searchSpotifyArt(metadata),
        this.searchItunesArt(metadata),
        this.searchDiscogsArt(metadata)
      ]);

      // Collect all successful results
      artSources.forEach((source) => {
        if (source.status === 'fulfilled' && source.value) {
          if (Array.isArray(source.value)) {
            result.sources.push(...source.value);
          } else {
            result.sources.push(source.value);
          }
        }
      });

      // Sort by quality and confidence
      result.sources.sort((a, b) => {
        const qualityScore = this.getQualityScore(b.quality) - this.getQualityScore(a.quality);
        if (qualityScore !== 0) return qualityScore;
        return b.confidence - a.confidence;
      });

      // Download the best quality artwork
      if (result.sources.length > 0) {
        result.selectedArt = await this.downloadAndCacheArt(track.id, result.sources[0]);
      }

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  private async extractEmbeddedArt(filePath: string): Promise<AlbumArtSource | null> {
    try {
      const musicMetadata = await import('music-metadata');
      const metadata = await musicMetadata.parseFile(filePath);

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];

        // Create a data URL for the embedded image
        const dataUrl = `data:${picture.format};base64,${picture.data.toString()}`;

        return {
          url: dataUrl,
          size: { width: 0, height: 0 }, // Unknown size for embedded
          quality: 'large', // Assume good quality for embedded
          source: 'embedded',
          confidence: 1.0 // Highest confidence for embedded art
        };
      }
    } catch (error) {
      console.error('Error extracting embedded art:', error);
    }
    return null;
  }

  private async searchLastFmArt(metadata: EnhancedMetadata): Promise<AlbumArtSource[]> {
    if (!this.LASTFM_API_KEY || !metadata.artist || (!metadata.album && !metadata.title)) {
      return [];
    }

    try {
      await this.rateLimitDelay();

      const sources: AlbumArtSource[] = [];

      // Try album art first if we have album info
      if (metadata.album) {
        const albumResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
          params: {
            method: 'album.getInfo',
            api_key: this.LASTFM_API_KEY,
            artist: metadata.artist,
            album: metadata.album,
            format: 'json'
          },
          timeout: 10000
        });

        if (albumResponse.data?.album?.image) {
          albumResponse.data.album.image.forEach((img: any) => {
            if (img['#text']) {
              sources.push({
                url: img['#text'],
                size: this.getLastFmImageSize(img.size),
                quality: this.mapLastFmSizeToQuality(img.size),
                source: 'lastfm',
                confidence: 0.9
              });
            }
          });
        }
      }

      // Try track art if no album art found
      if (sources.length === 0 && metadata.title) {
        const trackResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
          params: {
            method: 'track.getInfo',
            api_key: this.LASTFM_API_KEY,
            artist: metadata.artist,
            track: metadata.title,
            format: 'json'
          },
          timeout: 10000
        });

        if (trackResponse.data?.track?.album?.image) {
          trackResponse.data.track.album.image.forEach((img: any) => {
            if (img['#text']) {
              sources.push({
                url: img['#text'],
                size: this.getLastFmImageSize(img.size),
                quality: this.mapLastFmSizeToQuality(img.size),
                source: 'lastfm',
                confidence: 0.8
              });
            }
          });
        }
      }

      return sources;
    } catch (error) {
      console.error('Error searching Last.fm for art:', error);
      return [];
    }
  }

  private async searchMusicBrainzArt(metadata: EnhancedMetadata): Promise<AlbumArtSource[]> {
    if (!metadata.artist || !metadata.album) {
      return [];
    }

    try {
      await this.rateLimitDelay();

      // Search for the release
      const searchResponse = await axios.get('https://musicbrainz.org/ws/2/release', {
        params: {
          query: `artist:"${metadata.artist}" AND release:"${metadata.album}"`,
          fmt: 'json',
          limit: 5
        },
        headers: {
          'User-Agent': 'CleanCue/1.0 ( contact@cleancue.com )'
        },
        timeout: 10000
      });

      if (searchResponse.data?.releases?.length > 0) {
        const releaseId = searchResponse.data.releases[0].id;

        // Get artwork from Cover Art Archive
        const artResponse = await axios.get(`https://coverartarchive.org/release/${releaseId}`, {
          timeout: 10000
        });

        if (artResponse.data?.images) {
          return artResponse.data.images.map((img: any) => ({
            url: img.image,
            size: { width: 0, height: 0 }, // Cover Art Archive doesn't provide dimensions
            quality: img.front ? 'large' : 'medium',
            source: 'coverartarchive',
            confidence: img.front ? 0.95 : 0.8
          }));
        }
      }
    } catch (error) {
      console.error('Error searching MusicBrainz/Cover Art Archive:', error);
    }

    return [];
  }

  private async searchSpotifyArt(metadata: EnhancedMetadata): Promise<AlbumArtSource[]> {
    if (!this.SPOTIFY_CLIENT_ID || !this.SPOTIFY_CLIENT_SECRET || !metadata.artist || !metadata.album) {
      return [];
    }

    try {
      await this.rateLimitDelay();

      // Get access token if needed
      if (!this.spotifyToken || Date.now() > this.spotifyToken.expires) {
        await this.refreshSpotifyToken();
      }

      if (!this.spotifyToken) {
        return [];
      }

      const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: `artist:"${metadata.artist}" album:"${metadata.album}"`,
          type: 'album',
          limit: 5
        },
        headers: {
          'Authorization': `Bearer ${this.spotifyToken.token}`
        },
        timeout: 10000
      });

      if (searchResponse.data?.albums?.items?.length > 0) {
        const album = searchResponse.data.albums.items[0];
        if (album.images) {
          return album.images.map((img: any) => ({
            url: img.url,
            size: { width: img.width, height: img.height },
            quality: this.mapSpotifyImageToQuality(img.width),
            source: 'spotify',
            confidence: 0.85
          }));
        }
      }
    } catch (error) {
      console.error('Error searching Spotify for art:', error);
    }

    return [];
  }

  private async refreshSpotifyToken(): Promise<void> {
    if (!this.SPOTIFY_CLIENT_ID || !this.SPOTIFY_CLIENT_SECRET) return;

    try {
      const response = await axios.post('https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.SPOTIFY_CLIENT_ID}:${this.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
          },
          timeout: 10000
        }
      );

      this.spotifyToken = {
        token: response.data.access_token,
        expires: Date.now() + (response.data.expires_in * 1000) - 60000 // Refresh 1 min early
      };
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
    }
  }

  private async searchItunesArt(metadata: EnhancedMetadata): Promise<AlbumArtSource[]> {
    if (!metadata.artist || !metadata.album) {
      return [];
    }

    try {
      await this.rateLimitDelay();

      const response = await axios.get('https://itunes.apple.com/search', {
        params: {
          term: `${metadata.artist} ${metadata.album}`,
          media: 'music',
          entity: 'album',
          limit: 5
        },
        timeout: 10000
      });

      if (response.data?.results?.length > 0) {
        return response.data.results
          .filter((result: any) => result.artworkUrl100)
          .map((result: any) => ({
            url: result.artworkUrl100.replace('100x100', '600x600'), // Get higher resolution
            size: { width: 600, height: 600 },
            quality: 'large',
            source: 'itunes',
            confidence: 0.8
          }));
      }
    } catch (error) {
      console.error('Error searching iTunes for art:', error);
    }

    return [];
  }

  private async searchDiscogsArt(metadata: EnhancedMetadata): Promise<AlbumArtSource[]> {
    if (!metadata.artist || !metadata.album) {
      return [];
    }

    try {
      await this.rateLimitDelay();

      const response = await axios.get('https://api.discogs.com/database/search', {
        params: {
          q: `${metadata.artist} ${metadata.album}`,
          type: 'release',
          per_page: 5
        },
        headers: {
          'User-Agent': 'CleanCue/1.0'
        },
        timeout: 10000
      });

      if (response.data?.results?.length > 0) {
        return response.data.results
          .filter((result: any) => result.cover_image && result.cover_image !== '')
          .map((result: any) => ({
            url: result.cover_image,
            size: { width: 0, height: 0 }, // Discogs doesn't provide dimensions
            quality: 'medium',
            source: 'discogs',
            confidence: 0.7
          }));
      }
    } catch (error) {
      console.error('Error searching Discogs for art:', error);
    }

    return [];
  }

  private async downloadAndCacheArt(trackId: string, source: AlbumArtSource): Promise<{ localPath: string; source: AlbumArtSource }> {
    const filename = this.generateArtworkFilename(trackId, source);
    const localPath = path.join(this.artworkCacheDir, filename);

    // Check if already cached
    try {
      await fs.access(localPath);
      return { localPath, source };
    } catch {
      // Not cached, download it
    }

    try {
      if (source.url.startsWith('data:')) {
        // Handle embedded art (data URL)
        const base64Data = source.url.split(',')[1];
        await fs.writeFile(localPath, Buffer.from(base64Data, 'base64'));
      } else {
        // Download from URL
        const response = await axios.get(source.url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'CleanCue/1.0'
          }
        });

        await fs.writeFile(localPath, response.data);
      }

      return { localPath, source };
    } catch (error) {
      console.error('Error downloading artwork:', error);
      throw error;
    }
  }

  private generateArtworkFilename(trackId: string, source: AlbumArtSource): string {
    const hash = crypto.createHash('md5').update(`${trackId}-${source.url}`).digest('hex');
    const extension = this.getFileExtensionFromUrl(source.url) || 'jpg';
    return `${hash}.${extension}`;
  }

  private getFileExtensionFromUrl(url: string): string | null {
    if (url.startsWith('data:')) {
      const mimeMatch = url.match(/data:image\/([^;]+)/);
      return mimeMatch ? mimeMatch[1] : null;
    }

    const urlParts = url.split('.');
    const extension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension) ? extension : 'jpg';
  }

  private getQualityScore(quality: string): number {
    const scores = {
      'thumbnail': 1,
      'medium': 2,
      'large': 3,
      'extralarge': 4,
      'mega': 5
    };
    return scores[quality as keyof typeof scores] || 0;
  }

  private getLastFmImageSize(size: string): { width: number; height: number } {
    const sizes = {
      'small': { width: 34, height: 34 },
      'medium': { width: 64, height: 64 },
      'large': { width: 174, height: 174 },
      'extralarge': { width: 300, height: 300 },
      'mega': { width: 600, height: 600 }
    };
    return sizes[size as keyof typeof sizes] || { width: 0, height: 0 };
  }

  private mapLastFmSizeToQuality(size: string): AlbumArtSource['quality'] {
    const mapping = {
      'small': 'thumbnail',
      'medium': 'medium',
      'large': 'large',
      'extralarge': 'extralarge',
      'mega': 'mega'
    };
    return mapping[size as keyof typeof mapping] as AlbumArtSource['quality'] || 'medium';
  }

  private mapSpotifyImageToQuality(width: number): AlbumArtSource['quality'] {
    if (width >= 640) return 'mega';
    if (width >= 300) return 'extralarge';
    if (width >= 174) return 'large';
    if (width >= 64) return 'medium';
    return 'thumbnail';
  }

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastCall));
    }

    this.lastApiCall = Date.now();
  }

  async batchFetchAlbumArt(tracks: Track[], metadata: Map<string, EnhancedMetadata>, onProgress?: (completed: number, total: number) => void): Promise<Map<string, AlbumArtResult>> {
    const results = new Map<string, AlbumArtResult>();

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const trackMetadata = metadata.get(track.id);

      if (trackMetadata) {
        try {
          const artResult = await this.findAlbumArt(track, trackMetadata);
          results.set(track.id, artResult);

          if (onProgress) {
            onProgress(i + 1, tracks.length);
          }

          // Rate limiting between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error fetching art for track ${track.path}:`, error);
          results.set(track.id, {
            trackId: track.id,
            sources: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return results;
  }

  async cleanupCache(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(this.artworkCacheDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.artworkCacheDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up artwork cache:', error);
    }
  }
}

// Extend EnhancedMetadata interface for album art
declare module './metadata' {
  interface EnhancedMetadata {
    albumArtPath?: string;
    albumArtSource?: string;
    albumArtQuality?: string;
  }
}