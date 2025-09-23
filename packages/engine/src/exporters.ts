import { promises as fs } from 'fs';
import path from 'path';
import type { Track, CuePoint, Playlist, PlaylistTrack } from '@cleancue/shared';

export interface ExportOptions {
  outputPath: string;
  format: 'universal' | 'serato' | 'engine' | 'rekordbox' | 'traktor' | 'm3u' | 'pls';
  includeMetadata?: boolean;
  includeCues?: boolean;
  useRelativePaths?: boolean;
  playlistName?: string;
  trackSelection?: 'all' | 'playlist' | 'filtered';
  filters?: {
    genre?: string[];
    year?: { min?: number; max?: number };
    bpm?: { min?: number; max?: number };
    key?: string[];
  };
}

export interface ExportResult {
  format: string;
  outputPath: string;
  tracksExported: number;
  playlistsExported: number;
  warnings: string[];
  success: boolean;
  error?: string;
}

export class DJSoftwareExporter {
  private readonly formatHandlers = {
    universal: this.exportUniversal.bind(this),
    serato: this.exportSerato.bind(this),
    engine: this.exportEngine.bind(this),
    rekordbox: this.exportRekordbox.bind(this),
    traktor: this.exportTraktor.bind(this),
    m3u: this.exportM3U.bind(this),
    pls: this.exportPLS.bind(this)
  };

  async exportLibrary(
    tracks: Track[],
    playlists: Playlist[] = [],
    playlistTracks: PlaylistTrack[] = [],
    cues: CuePoint[] = [],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Filter tracks if needed
      const filteredTracks = this.filterTracks(tracks, options);

      // Validate output directory
      await this.ensureOutputDirectory(options.outputPath);

      // Get handler for the specified format
      const handler = this.formatHandlers[options.format];
      if (!handler) {
        throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Execute the export
      const result = await handler(filteredTracks, playlists, playlistTracks, cues, options);

      return {
        format: options.format,
        outputPath: options.outputPath,
        tracksExported: filteredTracks.length,
        playlistsExported: playlists.length,
        warnings: result.warnings || [],
        success: true
      };

    } catch (error) {
      return {
        format: options.format,
        outputPath: options.outputPath,
        tracksExported: 0,
        playlistsExported: 0,
        warnings: [],
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private filterTracks(tracks: Track[], options: ExportOptions): Track[] {
    if (!options.filters) return tracks;

    return tracks.filter(track => {
      const filters = options.filters!;

      // Genre filter
      if (filters.genre && filters.genre.length > 0) {
        if (!track.genre || !filters.genre.includes(track.genre)) {
          return false;
        }
      }

      // Year filter
      if (filters.year) {
        if (filters.year.min && (!track.year || track.year < filters.year.min)) {
          return false;
        }
        if (filters.year.max && (!track.year || track.year > filters.year.max)) {
          return false;
        }
      }

      // BPM filter
      if (filters.bpm) {
        if (filters.bpm.min && (!track.bpm || track.bpm < filters.bpm.min)) {
          return false;
        }
        if (filters.bpm.max && (!track.bpm || track.bpm > filters.bpm.max)) {
          return false;
        }
      }

      // Key filter
      if (filters.key && filters.key.length > 0) {
        if (!track.key || !filters.key.includes(track.key)) {
          return false;
        }
      }

      return true;
    });
  }

  private async ensureOutputDirectory(outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
  }

  // Universal export - compatible with most software
  private async exportUniversal(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Export main M3U playlist
    const m3uContent = this.generateM3UContent(tracks, options);
    await fs.writeFile(options.outputPath, m3uContent, 'utf8');

    // Export metadata CSV for universal compatibility
    const metadataPath = options.outputPath.replace(/\\.m3u$/i, '_metadata.csv');
    const csvContent = this.generateMetadataCSV(tracks);
    await fs.writeFile(metadataPath, csvContent, 'utf8');

    // Export cues if requested
    if (options.includeCues && cues.length > 0) {
      const cuesPath = options.outputPath.replace(/\\.m3u$/i, '_cues.json');
      await fs.writeFile(cuesPath, JSON.stringify(cues, null, 2), 'utf8');
    }

    return { warnings };
  }

  // Serato export - .crate files and metadata
  private async exportSerato(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Generate Serato crate file
    const crateName = options.playlistName || 'CleanCue_Export';
    const crateContent = this.generateSeratoCrate(tracks, crateName, options);

    const crateDir = path.join(path.dirname(options.outputPath), '_Serato_', 'Crates');
    await fs.mkdir(crateDir, { recursive: true });

    const cratePath = path.join(crateDir, `${crateName}.crate`);
    await fs.writeFile(cratePath, crateContent);

    // Export metadata for Serato
    const metadataPath = options.outputPath.replace(/\.[^.]+$/, '_serato_metadata.txt');
    const seratoMetadata = this.generateSeratoMetadata(tracks);
    await fs.writeFile(metadataPath, seratoMetadata, 'utf8');

    warnings.push('Remember to rescan your Serato library after adding these files');

    return { warnings };
  }

  // Engine DJ export - XML format
  private async exportEngine(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Generate Engine DJ XML
    const xmlContent = this.generateEngineXML(tracks, playlists, playlistTracks, cues, options);
    const xmlPath = options.outputPath.replace(/\.[^.]+$/, '.xml');
    await fs.writeFile(xmlPath, xmlContent, 'utf8');

    // Also create M3U for compatibility
    const m3uContent = this.generateM3UContent(tracks, options);
    await fs.writeFile(options.outputPath, m3uContent, 'utf8');

    warnings.push('Import the XML file into Engine DJ using the "Import Collection" feature');

    return { warnings };
  }

  // Rekordbox XML export
  private async exportRekordbox(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Generate Rekordbox XML
    const xmlContent = this.generateRekordboxXML(tracks, playlists, playlistTracks, cues, options);
    const xmlPath = options.outputPath.replace(/\.[^.]+$/, '.xml');
    await fs.writeFile(xmlPath, xmlContent, 'utf8');

    warnings.push('Import the XML file into Rekordbox via File > Import > Import Collection');

    return { warnings };
  }

  // Traktor NML export
  private async exportTraktor(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Generate Traktor NML
    const nmlContent = this.generateTraktorNML(tracks, playlists, playlistTracks, cues, options);
    const nmlPath = options.outputPath.replace(/\\.[^.]+$/, '.nml');
    await fs.writeFile(nmlPath, nmlContent, 'utf8');

    warnings.push('Import the NML file into Traktor via File > Import Collection');

    return { warnings };
  }

  // Standard M3U export
  private async exportM3U(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const content = this.generateM3UContent(tracks, options);
    await fs.writeFile(options.outputPath, content, 'utf8');
    return { warnings: [] };
  }

  // PLS export
  private async exportPLS(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): Promise<{ warnings: string[] }> {
    const content = this.generatePLSContent(tracks, options);
    await fs.writeFile(options.outputPath, content, 'utf8');
    return { warnings: [] };
  }

  // Content generation methods
  private generateM3UContent(tracks: Track[], options: ExportOptions): string {
    let content = '#EXTM3U\\n';

    for (const track of tracks) {
      const duration = track.durationMs ? Math.round(track.durationMs / 1000) : -1;
      const artist = track.artist || 'Unknown Artist';
      const title = track.title || track.filename;
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;

      content += `#EXTINF:${duration},${artist} - ${title}\\n`;

      if (options.includeMetadata && (track.genre || track.year || track.bpm)) {
        const metadata = [];
        if (track.genre) metadata.push(`Genre=${track.genre}`);
        if (track.year) metadata.push(`Year=${track.year}`);
        if (track.bpm) metadata.push(`BPM=${Math.round(track.bpm)}`);
        if (track.key) metadata.push(`Key=${track.key}`);
        content += `#EXTGENRE:${metadata.join(';')}\\n`;
      }

      content += `${trackPath}\\n`;
    }

    return content;
  }

  private generatePLSContent(tracks: Track[], options: ExportOptions): string {
    let content = '[playlist]\\n';
    content += `NumberOfEntries=${tracks.length}\\n\\n`;

    tracks.forEach((track, index) => {
      const num = index + 1;
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;
      const artist = track.artist || 'Unknown Artist';
      const title = track.title || track.filename;
      const duration = track.durationMs ? Math.round(track.durationMs / 1000) : -1;

      content += `File${num}=${trackPath}\\n`;
      content += `Title${num}=${artist} - ${title}\\n`;
      if (duration > 0) {
        content += `Length${num}=${duration}\\n`;
      }
      content += '\\n';
    });

    content += 'Version=2\\n';
    return content;
  }

  private generateMetadataCSV(tracks: Track[]): string {
    const headers = [
      'Path', 'Artist', 'Title', 'Album', 'Genre', 'Year', 'BPM', 'Key',
      'Duration', 'Bitrate', 'Comment'
    ];

    let csv = headers.join(',') + '\\n';

    for (const track of tracks) {
      const row = [
        this.escapeCsvField(track.path),
        this.escapeCsvField(track.artist || ''),
        this.escapeCsvField(track.title || track.filename),
        this.escapeCsvField(track.album || ''),
        this.escapeCsvField(track.genre || ''),
        track.year || '',
        track.bpm ? Math.round(track.bpm) : '',
        this.escapeCsvField(track.key || ''),
        track.durationMs ? Math.round(track.durationMs / 1000) : '',
        track.bitrate || '',
        this.escapeCsvField(track.comment || '')
      ];

      csv += row.join(',') + '\\n';
    }

    return csv;
  }

  private generateSeratoCrate(tracks: Track[], crateName: string, options: ExportOptions): string {
    // Serato .crate files are binary, but we'll create a text representation
    // that can be converted or imported via other tools
    let content = `vrsn\\x00\\x00\\x00\\x1a1.0/Serato ScratchLive Crate\\x00\\x00`;
    content += `otrk\\x00\\x00\\x00\\x04${tracks.length.toString().padStart(4, '0')}`;

    for (const track of tracks) {
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;
      content += `ptrk\\x00\\x00\\x00${trackPath.length.toString(16)}${trackPath}`;
    }

    return content;
  }

  private generateSeratoMetadata(tracks: Track[]): string {
    let content = '# CleanCue Export for Serato\\n';
    content += '# Import instructions: Copy to your music folder and rescan library\\n\\n';

    for (const track of tracks) {
      content += `File: ${track.path}\\n`;
      if (track.artist) content += `Artist: ${track.artist}\\n`;
      if (track.title) content += `Title: ${track.title}\\n`;
      if (track.album) content += `Album: ${track.album}\\n`;
      if (track.genre) content += `Genre: ${track.genre}\\n`;
      if (track.year) content += `Year: ${track.year}\\n`;
      if (track.bpm) content += `BPM: ${Math.round(track.bpm)}\\n`;
      if (track.key) content += `Key: ${track.key}\\n`;
      content += '\\n';
    }

    return content;
  }

  private generateEngineXML(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): string {
    const playlistName = options.playlistName || 'CleanCue Export';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n';
    xml += '<ENGINE VERSION="2.0.0">\\n';
    xml += '  <COLLECTION>\\n';

    // Add tracks
    tracks.forEach((track, index) => {
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;

      xml += `    <TRACK TrackID="${index + 1}" Location="${this.escapeXml(trackPath)}"\\n`;
      xml += `           Artist="${this.escapeXml(track.artist || '')}"\\n`;
      xml += `           Title="${this.escapeXml(track.title || track.filename)}"\\n`;
      xml += `           Album="${this.escapeXml(track.album || '')}"\\n`;
      xml += `           Genre="${this.escapeXml(track.genre || '')}"\\n`;
      xml += `           Year="${track.year || ''}"\\n`;
      xml += `           BPM="${track.bpm ? track.bpm.toFixed(2) : ''}"\\n`;
      xml += `           Key="${this.escapeXml(track.key || '')}"\\n`;
      xml += `           Duration="${track.durationMs ? (track.durationMs / 1000).toFixed(2) : ''}"\\n`;
      xml += `           Bitrate="${track.bitrate || ''}"\\n`;
      xml += `           Comment="${this.escapeXml(track.comment || '')}">\\n`;

      // Add cues for this track
      if (options.includeCues) {
        const trackCues = cues.filter(cue => cue.trackId === track.id);
        trackCues.forEach((cue, cueIndex) => {
          xml += `      <CUE_V2 Name="${this.escapeXml(cue.label || cue.type)}"\\n`;
          xml += `              Displ_Order="${cueIndex}"\\n`;
          xml += `              Type="${this.mapCueTypeToEngine(cue.type)}"\\n`;
          xml += `              Start="${(cue.positionMs / 1000).toFixed(6)}"\\n`;
          xml += `              Num="${cueIndex}" />\\n`;
        });
      }

      xml += '    </TRACK>\\n';
    });

    xml += '  </COLLECTION>\\n';

    // Add playlist
    xml += '  <PLAYLISTS>\\n';
    xml += `    <NODE Type="1" Name="${this.escapeXml(playlistName)}">\\n`;
    tracks.forEach((track, index) => {
      xml += `      <TRACK Key="${index + 1}" />\\n`;
    });
    xml += '    </NODE>\\n';
    xml += '  </PLAYLISTS>\\n';

    xml += '</ENGINE>\\n';

    return xml;
  }

  private generateRekordboxXML(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): string {
    const playlistName = options.playlistName || 'CleanCue Export';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n';
    xml += '<DJ_PLAYLISTS Version="1.0.0">\\n';
    xml += '  <PRODUCT Name="CleanCue" Version="1.0.0" Company="CleanCue"/>\\n';
    xml += '  <COLLECTION Entries="' + tracks.length + '">\\n';

    // Add tracks
    tracks.forEach((track, index) => {
      const trackId = index + 1;
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;

      xml += `    <TRACK TrackID="${trackId}"\\n`;
      xml += `           Name="${this.escapeXml(track.title || track.filename)}"\\n`;
      xml += `           Artist="${this.escapeXml(track.artist || '')}"\\n`;
      xml += `           Album="${this.escapeXml(track.album || '')}"\\n`;
      xml += `           Genre="${this.escapeXml(track.genre || '')}"\\n`;
      xml += `           Year="${track.year || ''}"\\n`;
      xml += `           AverageBpm="${track.bpm ? track.bpm.toFixed(2) : ''}"\\n`;
      xml += `           DateCreated="${new Date().toISOString().split('T')[0]}"\\n`;
      xml += `           SampleRate="${track.sampleRate || ''}"\\n`;
      xml += `           BitRate="${track.bitrate || ''}"\\n`;
      xml += `           PlayTime="${track.durationMs || ''}"\\n`;
      xml += `           Location="${this.escapeXml('file://localhost' + trackPath)}"\\n`;
      xml += `           Kind="MP3 File">\\n`;

      // Add tempo markers if BPM is available
      if (track.bpm) {
        xml += `      <TEMPO Inizio="0.000" Bpm="${track.bpm.toFixed(2)}" Metro="4/4" Battito="1"/>\\n`;
      }

      // Add cues for this track
      if (options.includeCues) {
        const trackCues = cues.filter(cue => cue.trackId === track.id);
        trackCues.forEach((cue, cueIndex) => {
          xml += `      <POSITION_MARK Name="${this.escapeXml(cue.label || cue.type)}"\\n`;
          xml += `                    Type="${this.mapCueTypeToRekordbox(cue.type)}"\\n`;
          xml += `                    Start="${(cue.positionMs / 1000).toFixed(6)}"\\n`;
          xml += `                    Num="${cueIndex}"/>\\n`;
        });
      }

      xml += '    </TRACK>\\n';
    });

    xml += '  </COLLECTION>\\n';

    // Add playlist
    xml += '  <PLAYLISTS>\\n';
    xml += `    <NODE Type="1" Name="ROOT" Count="1">\\n`;
    xml += `      <NODE Name="${this.escapeXml(playlistName)}" Type="1" KeyType="0" Entries="${tracks.length}">\\n`;
    tracks.forEach((track, index) => {
      xml += `        <TRACK Key="${index + 1}"/>\\n`;
    });
    xml += '      </NODE>\\n';
    xml += '    </NODE>\\n';
    xml += '  </PLAYLISTS>\\n';

    xml += '</DJ_PLAYLISTS>\\n';

    return xml;
  }

  private generateTraktorNML(
    tracks: Track[],
    playlists: Playlist[],
    playlistTracks: PlaylistTrack[],
    cues: CuePoint[],
    options: ExportOptions
  ): string {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\\n';
    xml += '<NML VERSION="19">\\n';
    xml += '  <HEAD COMPANY="Native Instruments" PROGRAM="Traktor"/>\\n';
    xml += '  <MUSICFOLDERS>\\n';
    xml += '    <FOLDER DIR=":" TYPE="FOLDER" VOLUME="CLEANCUE"/>\\n';
    xml += '  </MUSICFOLDERS>\\n';
    xml += '  <COLLECTION>\\n';

    // Add tracks
    tracks.forEach((track, index) => {
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;

      xml += `    <ENTRY MODIFIED_DATE="${Math.floor(Date.now() / 1000)}"\\n`;
      xml += `           MODIFIED_TIME="${track.updatedAt ? Math.floor(new Date(track.updatedAt).getTime() / 1000) : Math.floor(Date.now() / 1000)}"\\n`;
      xml += `           LOCK="0" LOCK_MODIFICATION_TIME="0" AUDIO_ID="${index + 1}">\\n`;

      xml += `      <LOCATION DIR="/:${this.escapeXml(path.dirname(trackPath))}/"\\n`;
      xml += `                FILE="${this.escapeXml(path.basename(trackPath))}"\\n`;
      xml += `                VOLUME="CLEANCUE" VOLUMEID="CLEANCUE"/>\\n`;

      xml += `      <ALBUM TRACK="${track.trackNumber || ''}" TITLE="${this.escapeXml(track.album || '')}"/>\\n`;

      xml += `      <MODIFICATION_INFO AUTHOR_TYPE="user"/>\\n`;

      xml += `      <INFO BITRATE="${track.bitrate || ''}"\\n`;
      xml += `            GENRE="${this.escapeXml(track.genre || '')}"\\n`;
      xml += `            COMMENT="${this.escapeXml(track.comment || '')}"\\n`;
      xml += `            COVERARTID=""\\n`;
      xml += `            KEY="${this.escapeXml(this.convertKeyToTraktor(track.key))}"\\n`;
      xml += `            PLAYTIME="${track.durationMs || ''}"\\n`;
      xml += `            RANKING=""\\n`;
      xml += `            IMPORT_DATE="${Math.floor(Date.now() / 1000)}"\\n`;
      xml += `            RELEASE_DATE="${track.year || ''}"\\n`;
      xml += `            FLAGS="12"\\n`;
      xml += `            FILESIZE="${track.sizeBytes || ''}"/>\\n`;

      xml += `      <TEMPO BPM="${track.bpm ? track.bpm.toFixed(6) : ''}"\\n`;
      xml += `             BPM_QUALITY="100.000000"/>\\n`;

      xml += `      <LOUDNESS PEAK_DB="0.000000" PERCEIVED_DB="0.000000" ANALYZED_DB="0.000000"/>\\n`;

      xml += `      <MUSICAL_KEY VALUE="${this.convertKeyToTraktorValue(track.key)}"/>\\n`;

      // Add cues
      if (options.includeCues) {
        const trackCues = cues.filter(cue => cue.trackId === track.id);
        if (trackCues.length > 0) {
          xml += '      <CUE_V2>\\n';
          trackCues.forEach((cue, cueIndex) => {
            xml += `        <CUE NAME="${this.escapeXml(cue.label || cue.type)}"\\n`;
            xml += `             DISPL_ORDER="${cueIndex}"\\n`;
            xml += `             TYPE="${this.mapCueTypeToTraktor(cue.type)}"\\n`;
            xml += `             START="${(cue.positionMs / 1000).toFixed(6)}"\\n`;
            xml += `             LEN="0.000000"\\n`;
            xml += `             REPEATS="-1"\\n`;
            xml += `             HOTCUE="${cueIndex}"/>\\n`;
          });
          xml += '      </CUE_V2>\\n';
        }
      }

      xml += '    </ENTRY>\\n';
    });

    xml += '  </COLLECTION>\\n';

    // Add playlist
    const playlistName = options.playlistName || 'CleanCue Export';
    xml += '  <PLAYLISTS>\\n';
    xml += `    <NODE TYPE="FOLDER" NAME="${this.escapeXml(playlistName)}">\\n`;
    xml += `      <SUBNODES COUNT="${tracks.length}">\\n`;
    tracks.forEach((track, index) => {
      const trackPath = options.useRelativePaths ?
        path.relative(path.dirname(options.outputPath), track.path) :
        track.path;
      xml += `        <NODE TYPE="TRACK">\\n`;
      xml += `          <PRIMARYKEY TYPE="TRACK" KEY="/:${this.escapeXml(trackPath)}"/>\\n`;
      xml += '        </NODE>\\n';
    });
    xml += '      </SUBNODES>\\n';
    xml += '    </NODE>\\n';
    xml += '  </PLAYLISTS>\\n';

    xml += '</NML>\\n';

    return xml;
  }

  // Utility methods
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\\n')) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private mapCueTypeToEngine(type: string): string {
    const mapping = {
      'intro': '0',
      'outro': '1',
      'drop': '4',
      'break': '5',
      'buildup': '6',
      'custom': '0'
    };
    return mapping[type as keyof typeof mapping] || '0';
  }

  private mapCueTypeToRekordbox(type: string): string {
    const mapping = {
      'intro': '0',
      'outro': '1',
      'drop': '0',
      'break': '0',
      'buildup': '0',
      'custom': '0'
    };
    return mapping[type as keyof typeof mapping] || '0';
  }

  private mapCueTypeToTraktor(type: string): string {
    const mapping = {
      'intro': '0',
      'outro': '1',
      'drop': '4',
      'break': '5',
      'buildup': '6',
      'custom': '0'
    };
    return mapping[type as keyof typeof mapping] || '0';
  }

  private convertKeyToTraktor(key?: string): string {
    if (!key) return '';

    // Convert from Camelot or standard notation to Traktor format
    const camelotToTraktor = {
      '1A': 'C minor', '1B': 'E major',
      '2A': 'G minor', '2B': 'B major',
      '3A': 'D minor', '3B': 'F# major',
      '4A': 'A minor', '4B': 'C# major',
      '5A': 'E minor', '5B': 'G# major',
      '6A': 'B minor', '6B': 'D# major',
      '7A': 'F# minor', '7B': 'A# major',
      '8A': 'C# minor', '8B': 'F major',
      '9A': 'G# minor', '9B': 'C major',
      '10A': 'D# minor', '10B': 'G major',
      '11A': 'A# minor', '11B': 'D major',
      '12A': 'F minor', '12B': 'A major'
    };

    return camelotToTraktor[key as keyof typeof camelotToTraktor] || key;
  }

  private convertKeyToTraktorValue(key?: string): string {
    if (!key) return '0';

    // Map to Traktor's internal key values
    const keyValues: { [key: string]: string } = {
      'C major': '1', 'C minor': '13',
      'C# major': '2', 'C# minor': '14',
      'D major': '3', 'D minor': '15',
      'D# major': '4', 'D# minor': '16',
      'E major': '5', 'E minor': '17',
      'F major': '6', 'F minor': '18',
      'F# major': '7', 'F# minor': '19',
      'G major': '8', 'G minor': '20',
      'G# major': '9', 'G# minor': '21',
      'A major': '10', 'A minor': '22',
      'A# major': '11', 'A# minor': '23',
      'B major': '12', 'B minor': '24'
    };

    const traktorKey = this.convertKeyToTraktor(key);
    return keyValues[traktorKey] || '0';
  }
}