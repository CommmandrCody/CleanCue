import { promises as fs } from 'fs';
import path from 'path';
import type { Track, CuePoint } from '@cleancue/shared';

export interface FilenameTemplate {
  pattern: string;
  separator: string;
  includeTrackNumber: boolean;
  zeroPadTrackNumber: number;
  maxLength: number;
  conflictResolution: 'append_number' | 'overwrite' | 'skip';
}

export interface CharacterNormalization {
  removeAccents: boolean;
  replaceSpaces: boolean;
  spaceReplacement: string;
  allowedCharacters: 'strict' | 'relaxed' | 'custom';
  customAllowedPattern?: string;
  caseTransform: 'none' | 'lowercase' | 'uppercase' | 'titlecase';
  removeSpecialChars: boolean;
  customReplacements: { [key: string]: string };
}

export interface USBExportProfile {
  name: string;
  description: string;
  filenameTemplate: FilenameTemplate;
  characterNormalization: CharacterNormalization;
  preserveStructure: boolean;
  createArtistFolders: boolean;
  createGenreFolders: boolean;
  flattenFolders: boolean;
  includeMetadataFiles: boolean;
  createPlaylist: boolean;
  playlistFormat: 'm3u' | 'pls';
}

export interface USBExportOptions {
  profile: USBExportProfile;
  outputPath: string;
  fileAction: 'copy' | 'move' | 'hardlink' | 'symlink';
  backupOriginal: boolean;
  backupLocation?: string;
  overwriteExisting: boolean;
  verifyIntegrity: boolean;
  preserveTimestamps: boolean;
  compressionLevel?: number; // 0-9 for future compression support
}

export interface USBExportResult {
  success: boolean;
  totalFiles: number;
  copiedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  outputPath: string;
  totalSize: number;
  errors: Array<{ file: string; error: string }>;
  warnings: Array<{ file: string; warning: string }>;
  duplicatesHandled: number;
  backupsCreated: number;
}

export class USBExporter {
  private readonly defaultProfiles: { [key: string]: USBExportProfile } = {
    dj_standard: {
      name: 'DJ Standard',
      description: 'Standard DJ USB format with artist-title filenames',
      filenameTemplate: {
        pattern: '{artist} - {title}',
        separator: ' - ',
        includeTrackNumber: false,
        zeroPadTrackNumber: 2,
        maxLength: 255,
        conflictResolution: 'append_number'
      },
      characterNormalization: {
        removeAccents: true,
        replaceSpaces: true,
        spaceReplacement: '_',
        allowedCharacters: 'strict',
        caseTransform: 'none',
        removeSpecialChars: true,
        customReplacements: {
          '&': 'and',
          '+': 'plus',
          '@': 'at',
          '#': 'hash'
        }
      },
      preserveStructure: false,
      createArtistFolders: false,
      createGenreFolders: false,
      flattenFolders: true,
      includeMetadataFiles: true,
      createPlaylist: true,
      playlistFormat: 'm3u'
    },

    organized_folders: {
      name: 'Organized Folders',
      description: 'Organize by artist folders with clean filenames',
      filenameTemplate: {
        pattern: '{track_number} - {title}',
        separator: ' - ',
        includeTrackNumber: true,
        zeroPadTrackNumber: 2,
        maxLength: 200,
        conflictResolution: 'append_number'
      },
      characterNormalization: {
        removeAccents: true,
        replaceSpaces: false,
        spaceReplacement: '_',
        allowedCharacters: 'relaxed',
        caseTransform: 'titlecase',
        removeSpecialChars: true,
        customReplacements: {}
      },
      preserveStructure: false,
      createArtistFolders: true,
      createGenreFolders: false,
      flattenFolders: false,
      includeMetadataFiles: true,
      createPlaylist: true,
      playlistFormat: 'm3u'
    },

    genre_organized: {
      name: 'Genre Organized',
      description: 'Organize by genre with BPM and key in filenames',
      filenameTemplate: {
        pattern: '{artist} - {title} ({bpm}bpm {key})',
        separator: ' - ',
        includeTrackNumber: false,
        zeroPadTrackNumber: 2,
        maxLength: 240,
        conflictResolution: 'append_number'
      },
      characterNormalization: {
        removeAccents: true,
        replaceSpaces: true,
        spaceReplacement: '_',
        allowedCharacters: 'strict',
        caseTransform: 'lowercase',
        removeSpecialChars: true,
        customReplacements: {
          'minor': 'min',
          'major': 'maj'
        }
      },
      preserveStructure: false,
      createArtistFolders: false,
      createGenreFolders: true,
      flattenFolders: false,
      includeMetadataFiles: true,
      createPlaylist: true,
      playlistFormat: 'm3u'
    },

    serato_optimized: {
      name: 'Serato Optimized',
      description: 'Optimized for Serato DJ with metadata preservation',
      filenameTemplate: {
        pattern: '{artist} - {title}',
        separator: ' - ',
        includeTrackNumber: false,
        zeroPadTrackNumber: 2,
        maxLength: 200,
        conflictResolution: 'append_number'
      },
      characterNormalization: {
        removeAccents: false,
        replaceSpaces: false,
        spaceReplacement: '_',
        allowedCharacters: 'relaxed',
        caseTransform: 'none',
        removeSpecialChars: false,
        customReplacements: {}
      },
      preserveStructure: true,
      createArtistFolders: false,
      createGenreFolders: false,
      flattenFolders: false,
      includeMetadataFiles: true,
      createPlaylist: false,
      playlistFormat: 'm3u'
    },

    rekordbox_optimized: {
      name: 'Rekordbox Optimized',
      description: 'Optimized for Pioneer Rekordbox',
      filenameTemplate: {
        pattern: '{track_number}. {artist} - {title}',
        separator: '. ',
        includeTrackNumber: true,
        zeroPadTrackNumber: 3,
        maxLength: 180,
        conflictResolution: 'append_number'
      },
      characterNormalization: {
        removeAccents: true,
        replaceSpaces: false,
        spaceReplacement: '_',
        allowedCharacters: 'relaxed',
        caseTransform: 'none',
        removeSpecialChars: true,
        customReplacements: {
          '&': 'and'
        }
      },
      preserveStructure: false,
      createArtistFolders: false,
      createGenreFolders: false,
      flattenFolders: true,
      includeMetadataFiles: false,
      createPlaylist: true,
      playlistFormat: 'm3u'
    }
  };

  async exportToUSB(
    tracks: Track[],
    cues: CuePoint[],
    options: USBExportOptions
  ): Promise<USBExportResult> {
    const result: USBExportResult = {
      success: false,
      totalFiles: tracks.length,
      copiedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
      outputPath: options.outputPath,
      totalSize: 0,
      errors: [],
      warnings: [],
      duplicatesHandled: 0,
      backupsCreated: 0
    };

    try {
      // Ensure output directory exists
      await fs.mkdir(options.outputPath, { recursive: true });

      // Process each track
      const processedFiles = new Set<string>();
      let trackCounter = 1;

      for (const track of tracks) {
        try {
          // Generate normalized filename
          const normalizedFilename = this.generateFilename(track, trackCounter, options.profile);

          // Determine output path based on profile settings
          const outputFilePath = this.getOutputPath(track, normalizedFilename, options);

          // Check for duplicates
          let finalOutputPath = outputFilePath;
          if (processedFiles.has(finalOutputPath.toLowerCase())) {
            finalOutputPath = await this.handleDuplicate(outputFilePath, options.profile.filenameTemplate.conflictResolution);
            result.duplicatesHandled++;
          }

          processedFiles.add(finalOutputPath.toLowerCase());

          // Backup original if requested
          if (options.backupOriginal) {
            await this.createBackup(track, options);
            result.backupsCreated++;
          }

          // Check if file already exists
          if (!options.overwriteExisting && await this.fileExists(finalOutputPath)) {
            result.skippedFiles++;
            result.warnings.push({
              file: track.filename,
              warning: 'File already exists and overwrite is disabled'
            });
            continue;
          }

          // Create directory structure
          await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

          // Copy/move file
          await this.transferFile(track.path, finalOutputPath, options);

          // Verify integrity if requested
          if (options.verifyIntegrity) {
            const verified = await this.verifyFileIntegrity(track.path, finalOutputPath);
            if (!verified) {
              throw new Error('File integrity verification failed');
            }
          }

          // Preserve timestamps if requested
          if (options.preserveTimestamps) {
            await this.preserveTimestamps(track.path, finalOutputPath);
          }

          const stats = await fs.stat(finalOutputPath);
          result.totalSize += stats.size;
          result.copiedFiles++;
          trackCounter++;

        } catch (error) {
          result.errorFiles++;
          result.errors.push({
            file: track.filename,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Create playlist if requested
      if (options.profile.createPlaylist) {
        await this.createPlaylist(tracks, options);
      }

      // Create metadata files if requested
      if (options.profile.includeMetadataFiles) {
        await this.createMetadataFiles(tracks, cues, options);
      }

      result.success = result.errorFiles === 0;
      return result;

    } catch (error) {
      result.errors.push({
        file: 'export_operation',
        error: error instanceof Error ? error.message : 'Export operation failed'
      });
      return result;
    }
  }

  private generateFilename(track: Track, trackNumber: number, profile: USBExportProfile): string {
    const template = profile.filenameTemplate;
    let filename = template.pattern;

    // Replace template variables
    const replacements = {
      '{artist}': this.normalizeString(track.artist || 'Unknown Artist', profile.characterNormalization),
      '{title}': this.normalizeString(track.title || track.filename, profile.characterNormalization),
      '{album}': this.normalizeString(track.album || '', profile.characterNormalization),
      '{genre}': this.normalizeString(track.genre || '', profile.characterNormalization),
      '{year}': track.year?.toString() || '',
      '{bpm}': track.bpm ? Math.round(track.bpm).toString() : '',
      '{key}': this.normalizeString(track.key || '', profile.characterNormalization),
      '{track_number}': template.includeTrackNumber ?
        trackNumber.toString().padStart(template.zeroPadTrackNumber, '0') : ''
    };

    // Apply replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      filename = filename.replace(new RegExp(placeholder.replace(/[{}]/g, '\\\\$&'), 'g'), value);
    }

    // Clean up empty placeholders and extra separators
    filename = filename
      .replace(/\s*\(\s*\)/g, '') // Remove empty parentheses
      .replace(/\s*\[\s*\]/g, '') // Remove empty brackets
      .replace(new RegExp(`\\\\s*${this.escapeRegex(template.separator)}\\\\s*${this.escapeRegex(template.separator)}`, 'g'), template.separator)
      .replace(new RegExp(`^\\\\s*${this.escapeRegex(template.separator)}|${this.escapeRegex(template.separator)}\\\\s*$`, 'g'), '')
      .trim();

    // Ensure filename isn't empty
    if (!filename) {
      filename = this.normalizeString(track.filename, profile.characterNormalization);
    }

    // Truncate if too long (preserve extension)
    const extension = path.extname(track.filename);
    const nameWithoutExt = filename;
    const maxNameLength = template.maxLength - extension.length;

    if (nameWithoutExt.length > maxNameLength) {
      filename = nameWithoutExt.substring(0, maxNameLength);
    }

    return filename + extension;
  }

  private normalizeString(input: string, normalization: CharacterNormalization): string {
    if (!input) return '';

    let result = input;

    // Apply case transformation first
    switch (normalization.caseTransform) {
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'titlecase':
        result = result.replace(/\\w\\S*/g, (txt) =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
    }

    // Remove accents
    if (normalization.removeAccents) {
      result = result.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    }

    // Apply custom replacements
    for (const [from, to] of Object.entries(normalization.customReplacements)) {
      result = result.replace(new RegExp(this.escapeRegex(from), 'g'), to);
    }

    // Handle allowed characters
    switch (normalization.allowedCharacters) {
      case 'strict':
        // Only alphanumeric, spaces, hyphens, underscores
        result = result.replace(/[^a-zA-Z0-9\\s\\-_]/g, '');
        break;
      case 'relaxed':
        // Remove only problematic filesystem characters
        result = result.replace(/[<>:"/\\\\|?*]/g, '');
        break;
      case 'custom':
        if (normalization.customAllowedPattern) {
          const pattern = new RegExp(`[^${normalization.customAllowedPattern}]`, 'g');
          result = result.replace(pattern, '');
        }
        break;
    }

    // Remove special characters if requested
    if (normalization.removeSpecialChars) {
      result = result.replace(/[!@#$%^&*()+=\\[\\]{}|;':".,<>?]/g, '');
    }

    // Replace spaces
    if (normalization.replaceSpaces) {
      result = result.replace(/\\s+/g, normalization.spaceReplacement);
    }

    // Clean up multiple consecutive replacement characters
    if (normalization.spaceReplacement !== ' ') {
      const escaped = this.escapeRegex(normalization.spaceReplacement);
      result = result.replace(new RegExp(`${escaped}+`, 'g'), normalization.spaceReplacement);
    }

    return result.trim();
  }

  private getOutputPath(track: Track, filename: string, options: USBExportOptions): string {
    const profile = options.profile;
    let relativePath = '';

    if (profile.preserveStructure) {
      // Preserve original directory structure
      const originalDir = path.dirname(track.path);
      const basePath = this.findCommonBasePath([track.path]); // This would need all tracks for proper implementation
      relativePath = path.relative(basePath, originalDir);
    } else if (profile.createGenreFolders && track.genre) {
      relativePath = this.normalizeString(track.genre, profile.characterNormalization);
    } else if (profile.createArtistFolders && track.artist) {
      relativePath = this.normalizeString(track.artist, profile.characterNormalization);
    }

    return path.join(options.outputPath, relativePath, filename);
  }

  private findCommonBasePath(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return path.dirname(paths[0]);

    const parts = paths[0].split(path.sep);
    let commonPath = '';

    for (let i = 0; i < parts.length; i++) {
      const testPath = parts.slice(0, i + 1).join(path.sep);
      if (paths.every(p => p.startsWith(testPath + path.sep))) {
        commonPath = testPath;
      } else {
        break;
      }
    }

    return commonPath;
  }

  private async handleDuplicate(originalPath: string, resolution: string): Promise<string> {
    switch (resolution) {
      case 'append_number': {
        const dir = path.dirname(originalPath);
        const ext = path.extname(originalPath);
        const base = path.basename(originalPath, ext);

        let counter = 1;
        let newPath: string;

        do {
          newPath = path.join(dir, `${base} (${counter})${ext}`);
          counter++;
        } while (await this.fileExists(newPath));

        return newPath;
      }
      case 'overwrite':
        return originalPath;
      case 'skip':
        throw new Error('File already exists and skip resolution is set');
      default:
        return originalPath;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async createBackup(track: Track, options: USBExportOptions): Promise<void> {
    if (!options.backupLocation) return;

    const backupPath = path.join(
      options.backupLocation,
      path.basename(track.path)
    );

    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(track.path, backupPath);
  }

  private async transferFile(sourcePath: string, destPath: string, options: USBExportOptions): Promise<void> {
    switch (options.fileAction) {
      case 'copy':
        await fs.copyFile(sourcePath, destPath);
        break;
      case 'move':
        await fs.rename(sourcePath, destPath);
        break;
      case 'hardlink':
        await fs.link(sourcePath, destPath);
        break;
      case 'symlink':
        await fs.symlink(sourcePath, destPath);
        break;
      default:
        await fs.copyFile(sourcePath, destPath);
    }
  }

  private async verifyFileIntegrity(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      const [sourceStats, destStats] = await Promise.all([
        fs.stat(sourcePath),
        fs.stat(destPath)
      ]);

      return sourceStats.size === destStats.size;
    } catch {
      return false;
    }
  }

  private async preserveTimestamps(sourcePath: string, destPath: string): Promise<void> {
    try {
      const stats = await fs.stat(sourcePath);
      await fs.utimes(destPath, stats.atime, stats.mtime);
    } catch {
      // Silently fail if timestamp preservation isn't possible
    }
  }

  private async createPlaylist(tracks: Track[], options: USBExportOptions): Promise<void> {
    const playlistName = `CleanCue_Export.${options.profile.playlistFormat}`;
    const playlistPath = path.join(options.outputPath, playlistName);

    let content = '';

    if (options.profile.playlistFormat === 'm3u') {
      content = '#EXTM3U\\n';
      for (const track of tracks) {
        const duration = track.durationMs ? Math.round(track.durationMs / 1000) : -1;
        const artist = track.artist || 'Unknown Artist';
        const title = track.title || track.filename;
        const filename = this.generateFilename(track, tracks.indexOf(track) + 1, options.profile);

        content += `#EXTINF:${duration},${artist} - ${title}\\n`;
        content += `${filename}\\n`;
      }
    } else if (options.profile.playlistFormat === 'pls') {
      content = '[playlist]\\n';
      content += `NumberOfEntries=${tracks.length}\\n\\n`;

      tracks.forEach((track, index) => {
        const num = index + 1;
        const filename = this.generateFilename(track, num, options.profile);
        const artist = track.artist || 'Unknown Artist';
        const title = track.title || track.filename;
        const duration = track.durationMs ? Math.round(track.durationMs / 1000) : -1;

        content += `File${num}=${filename}\\n`;
        content += `Title${num}=${artist} - ${title}\\n`;
        if (duration > 0) {
          content += `Length${num}=${duration}\\n`;
        }
        content += '\\n';
      });

      content += 'Version=2\\n';
    }

    await fs.writeFile(playlistPath, content, 'utf8');
  }

  private async createMetadataFiles(tracks: Track[], cues: CuePoint[], options: USBExportOptions): Promise<void> {
    // Create CSV metadata file
    const metadataPath = path.join(options.outputPath, 'metadata.csv');
    const headers = ['Filename', 'Artist', 'Title', 'Album', 'Genre', 'Year', 'BPM', 'Key', 'Duration'];
    let csv = headers.join(',') + '\\n';

    for (const track of tracks) {
      const filename = this.generateFilename(track, tracks.indexOf(track) + 1, options.profile);
      const row = [
        this.escapeCsvField(filename),
        this.escapeCsvField(track.artist || ''),
        this.escapeCsvField(track.title || track.filename),
        this.escapeCsvField(track.album || ''),
        this.escapeCsvField(track.genre || ''),
        track.year || '',
        track.bpm ? Math.round(track.bpm) : '',
        this.escapeCsvField(track.key || ''),
        track.durationMs ? Math.round(track.durationMs / 1000) : ''
      ];
      csv += row.join(',') + '\\n';
    }

    await fs.writeFile(metadataPath, csv, 'utf8');

    // Create cues file if cues exist
    if (cues.length > 0) {
      const cuesPath = path.join(options.outputPath, 'cues.json');
      await fs.writeFile(cuesPath, JSON.stringify(cues, null, 2), 'utf8');
    }
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\\n')) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  // Public methods for profile management
  getDefaultProfiles(): { [key: string]: USBExportProfile } {
    return { ...this.defaultProfiles };
  }

  getProfile(name: string): USBExportProfile | undefined {
    return this.defaultProfiles[name];
  }

  validateProfile(profile: USBExportProfile): string[] {
    const errors: string[] = [];

    if (!profile.name) {
      errors.push('Profile name is required');
    }

    if (!profile.filenameTemplate.pattern) {
      errors.push('Filename template pattern is required');
    }

    if (profile.filenameTemplate.maxLength < 20) {
      errors.push('Maximum filename length must be at least 20 characters');
    }

    if (profile.characterNormalization.allowedCharacters === 'custom' &&
        !profile.characterNormalization.customAllowedPattern) {
      errors.push('Custom allowed pattern is required when using custom character filtering');
    }

    return errors;
  }
}