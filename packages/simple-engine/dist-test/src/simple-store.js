"use strict";
/**
 * Simple Store - Replace Complex Database/Engine
 *
 * Ultra-lightweight storage using JSON files instead of complex database.
 * Perfect for preserving the great UI while simplifying the backend.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleStore = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
/**
 * Sanitization utilities for metadata - Engine DJ safe
 */
class MetadataSanitizer {
    static CHAR_MAP = {
        'ü': 'u', 'ö': 'o', 'ä': 'a', 'ß': 'ss',
        'Ü': 'U', 'Ö': 'O', 'Ä': 'A',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
        'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
        'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O',
        'ú': 'u', 'ù': 'u', 'û': 'u',
        'Ú': 'U', 'Ù': 'U', 'Û': 'U',
        'ñ': 'n', 'Ñ': 'N',
        'ç': 'c', 'Ç': 'C',
        'ø': 'o', 'Ø': 'O',
        'æ': 'ae', 'Æ': 'AE',
        'œ': 'oe', 'Œ': 'OE',
        '\u2026': '...',
        '\u2013': '-',
        '\u2014': '-',
        '\u2018': "'",
        '\u2019': "'",
        '\u201C': '"',
        '\u201D': '"',
    };
    static sanitizeText(text) {
        if (!text || typeof text !== 'string')
            return '';
        let result = text;
        // Apply character normalization
        for (const [from, to] of Object.entries(this.CHAR_MAP)) {
            result = result.split(from).join(to);
        }
        // Remove problematic characters
        result = result
            .replace(/[<>:"|?*\\]/g, '') // Windows prohibited
            .replace(/[{}[\]#%&]/g, '') // Engine DJ issues
            .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        return result || '';
    }
    static cleanArtist(artist) {
        if (!artist)
            return '';
        let cleaned = this.sanitizeText(artist);
        // Remove streaming platform junk
        cleaned = cleaned
            .replace(/\s*-?\s*(Official|VEVO|Records|Music|Channel|Audio|Video)\s*/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned;
    }
    static cleanTitle(title, artist) {
        if (!title)
            return '';
        let cleaned = this.sanitizeText(title);
        // Remove streaming junk
        cleaned = cleaned
            .replace(/\s*-?\s*(Official\s+)?(Music\s+)?Video\s*/gi, ' ')
            .replace(/\s*-?\s*Official\s+Audio\s*/gi, ' ')
            .replace(/\s*-?\s*(Visualiser|Visualizer|Lyric\s+Video)\s*/gi, ' ')
            .replace(/\s*-?\s*(HD|HQ|4K|1080p|720p)\s*(Audio|Video)?\s*/gi, ' ')
            .replace(/\s*-?\s*Remastered\s*/gi, ' ')
            .replace(/\s+(feat\.?|ft\.?|featuring)\s+/gi, ' feat. ')
            .replace(/\s*-?\s*(Extended|Club|Radio|Original|Instrumental)\s+(Mix|Edit|Version)\s*/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        // Remove duplicate artist prefix
        if (artist) {
            const artistLower = artist.toLowerCase();
            const cleanedLower = cleaned.toLowerCase();
            if (cleanedLower.startsWith(artistLower + ' - ')) {
                cleaned = cleaned.substring(artist.length + 3).trim();
            }
            else if (cleanedLower.startsWith(artistLower + ' ')) {
                cleaned = cleaned.substring(artist.length + 1).trim();
            }
        }
        return cleaned;
    }
}
class SimpleStore {
    storePath;
    library;
    loaded = false;
    constructor(storePath) {
        // Store in user's home directory by default
        this.storePath = storePath || path_1.default.join(require('os').homedir(), '.cleancue', 'library.json');
        this.library = {
            tracks: [],
            lastScan: new Date(),
            totalFiles: 0,
            totalSize: 0
        };
    }
    async load() {
        try {
            await fs_1.promises.mkdir(path_1.default.dirname(this.storePath), { recursive: true });
            const data = await fs_1.promises.readFile(this.storePath, 'utf8');
            const parsed = JSON.parse(data);
            // Convert date strings back to Date objects
            this.library = {
                ...parsed,
                lastScan: new Date(parsed.lastScan),
                tracks: parsed.tracks.map((track) => ({
                    ...track,
                    dateAdded: new Date(track.dateAdded),
                    lastModified: new Date(track.lastModified)
                }))
            };
            this.loaded = true;
        }
        catch (error) {
            // File doesn't exist or is invalid, start fresh
            console.log('Starting with empty library');
            this.loaded = true;
        }
    }
    /**
     * Create a backup of the current library database
     * Returns the backup file path
     */
    async backup() {
        if (!this.loaded)
            await this.load();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path_1.default.join(path_1.default.dirname(this.storePath), 'backups');
        const backupPath = path_1.default.join(backupDir, `library-backup-${timestamp}.json`);
        try {
            // Create backups directory if it doesn't exist
            await fs_1.promises.mkdir(backupDir, { recursive: true });
            // Copy current library file to backup
            if (await this.fileExists(this.storePath)) {
                await fs_1.promises.copyFile(this.storePath, backupPath);
                console.log(`✅ Database backed up to: ${backupPath}`);
            }
            else {
                // If no file exists yet, save current state as backup
                await fs_1.promises.writeFile(backupPath, JSON.stringify(this.library, null, 2));
                console.log(`✅ New database backup created: ${backupPath}`);
            }
            // Clean up old backups (keep last 10)
            await this.cleanupOldBackups(backupDir, 10);
            return backupPath;
        }
        catch (error) {
            console.error('Failed to create backup:', error);
            throw new Error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Clean up old backups, keeping only the most recent N backups
     */
    async cleanupOldBackups(backupDir, keepCount) {
        try {
            const files = await fs_1.promises.readdir(backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('library-backup-') && f.endsWith('.json'))
                .map(f => ({
                name: f,
                path: path_1.default.join(backupDir, f)
            }))
                .sort((a, b) => b.name.localeCompare(a.name)); // Sort newest first
            // Delete old backups beyond keepCount
            const toDelete = backupFiles.slice(keepCount);
            for (const file of toDelete) {
                await fs_1.promises.unlink(file.path);
                console.log(`🗑️  Removed old backup: ${file.name}`);
            }
        }
        catch (error) {
            console.warn('Could not clean up old backups:', error);
        }
    }
    /**
     * Check if a file exists
     */
    async fileExists(filePath) {
        try {
            await fs_1.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async save() {
        if (!this.loaded)
            await this.load();
        await fs_1.promises.mkdir(path_1.default.dirname(this.storePath), { recursive: true });
        await fs_1.promises.writeFile(this.storePath, JSON.stringify(this.library, null, 2));
    }
    async getTracks() {
        if (!this.loaded)
            await this.load();
        return [...this.library.tracks]; // Return copy
    }
    async getTrackById(id) {
        if (!this.loaded)
            await this.load();
        return this.library.tracks.find(track => track.id === id);
    }
    async addTrack(trackData) {
        if (!this.loaded)
            await this.load();
        const track = {
            ...trackData,
            id: this.generateId(trackData.path),
            dateAdded: new Date(),
            // Sanitize metadata on insert
            artist: trackData.artist ? MetadataSanitizer.cleanArtist(trackData.artist) : undefined,
            title: trackData.title ? MetadataSanitizer.cleanTitle(trackData.title, trackData.artist) : undefined,
            album: trackData.album ? MetadataSanitizer.sanitizeText(trackData.album) : undefined,
            genre: trackData.genre ? MetadataSanitizer.sanitizeText(trackData.genre) : undefined,
            composer: trackData.composer ? MetadataSanitizer.sanitizeText(trackData.composer) : undefined,
        };
        // Remove existing track with same path
        this.library.tracks = this.library.tracks.filter(t => t.path !== track.path);
        // Add new track
        this.library.tracks.push(track);
        this.updateStats();
        return track;
    }
    async updateTrack(id, updates) {
        if (!this.loaded)
            await this.load();
        const trackIndex = this.library.tracks.findIndex(t => t.id === id);
        if (trackIndex === -1)
            return undefined;
        // Sanitize metadata on update
        const sanitizedUpdates = { ...updates };
        if (sanitizedUpdates.artist) {
            sanitizedUpdates.artist = MetadataSanitizer.cleanArtist(sanitizedUpdates.artist);
        }
        if (sanitizedUpdates.title) {
            sanitizedUpdates.title = MetadataSanitizer.cleanTitle(sanitizedUpdates.title, sanitizedUpdates.artist || this.library.tracks[trackIndex].artist);
        }
        if (sanitizedUpdates.album) {
            sanitizedUpdates.album = MetadataSanitizer.sanitizeText(sanitizedUpdates.album);
        }
        if (sanitizedUpdates.genre) {
            sanitizedUpdates.genre = MetadataSanitizer.sanitizeText(sanitizedUpdates.genre);
        }
        if (sanitizedUpdates.composer) {
            sanitizedUpdates.composer = MetadataSanitizer.sanitizeText(sanitizedUpdates.composer);
        }
        this.library.tracks[trackIndex] = {
            ...this.library.tracks[trackIndex],
            ...sanitizedUpdates
        };
        return this.library.tracks[trackIndex];
    }
    async removeTrack(id) {
        if (!this.loaded)
            await this.load();
        const initialLength = this.library.tracks.length;
        this.library.tracks = this.library.tracks.filter(t => t.id !== id);
        if (this.library.tracks.length < initialLength) {
            this.updateStats();
            return true;
        }
        return false;
    }
    async searchTracks(query) {
        if (!this.loaded)
            await this.load();
        const normalizedQuery = query.toLowerCase();
        return this.library.tracks.filter(track => track.filename.toLowerCase().includes(normalizedQuery) ||
            track.title?.toLowerCase().includes(normalizedQuery) ||
            track.artist?.toLowerCase().includes(normalizedQuery) ||
            track.album?.toLowerCase().includes(normalizedQuery));
    }
    async getTracksByFormat(format) {
        if (!this.loaded)
            await this.load();
        return this.library.tracks.filter(track => track.format === format.toUpperCase());
    }
    async getRecentTracks(limit = 20) {
        if (!this.loaded)
            await this.load();
        return this.library.tracks
            .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
            .slice(0, limit);
    }
    async getStats() {
        if (!this.loaded)
            await this.load();
        const formatBreakdown = {};
        let bpmCount = 0;
        let keyCount = 0;
        let energyCount = 0;
        for (const track of this.library.tracks) {
            formatBreakdown[track.format] = (formatBreakdown[track.format] || 0) + 1;
            if (track.bpm)
                bpmCount++;
            if (track.key)
                keyCount++;
            if (track.energy !== undefined)
                energyCount++;
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
    async cleanup() {
        if (!this.loaded)
            await this.load();
        const originalCount = this.library.tracks.length;
        const validTracks = [];
        // Check if files still exist
        for (const track of this.library.tracks) {
            try {
                await fs_1.promises.access(track.path);
                validTracks.push(track);
            }
            catch {
                // File no longer exists, remove from library
            }
        }
        this.library.tracks = validTracks;
        this.updateStats();
        return originalCount - validTracks.length;
    }
    updateStats() {
        this.library.totalFiles = this.library.tracks.length;
        this.library.totalSize = this.library.tracks.reduce((sum, track) => sum + track.size, 0);
        this.library.lastScan = new Date();
    }
    generateId(filePath) {
        return (0, crypto_1.createHash)('md5').update(filePath).digest('hex').substring(0, 12);
    }
    // Utility methods for the UI
    async exportToJson(outputPath) {
        if (!this.loaded)
            await this.load();
        const exportPath = outputPath || path_1.default.join(path_1.default.dirname(this.storePath), `library-export-${Date.now()}.json`);
        await fs_1.promises.writeFile(exportPath, JSON.stringify(this.library, null, 2));
        return exportPath;
    }
    async importFromJson(jsonPath) {
        const data = await fs_1.promises.readFile(jsonPath, 'utf8');
        const importedLibrary = JSON.parse(data);
        if (!importedLibrary.tracks || !Array.isArray(importedLibrary.tracks)) {
            throw new Error('Invalid library format');
        }
        const importedCount = importedLibrary.tracks.length;
        // Merge with existing library (avoid duplicates by path)
        const existingPaths = new Set(this.library.tracks.map(t => t.path));
        const newTracks = importedLibrary.tracks.filter((track) => !existingPaths.has(track.path));
        this.library.tracks.push(...newTracks);
        this.updateStats();
        return newTracks.length;
    }
}
exports.SimpleStore = SimpleStore;
