#!/usr/bin/env node
"use strict";
/**
 * Add CSV playlists to existing Engine DJ database
 * Preserves all existing tracks and playlists
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = __importDefault(require("path"));
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
function parseCSV(csvPath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, lines, tracks, i, line, parts;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs_1.promises.readFile(csvPath, 'utf-8')];
                case 1:
                    content = _a.sent();
                    lines = content.trim().split('\n');
                    tracks = [];
                    for (i = 1; i < lines.length; i++) {
                        line = lines[i].trim();
                        if (!line)
                            continue;
                        parts = line.split(',');
                        if (parts.length >= 4) {
                            tracks.push({
                                filename: parts[0],
                                artist: parts[1],
                                title: parts[2],
                                filepath: parts[3]
                            });
                        }
                    }
                    return [2 /*return*/, tracks];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var playlistDir, dbPath, musicDir, backupPath, db, dbInfo, dbUuid, existingTracks, existingPlaylists, files, csvFiles, playlists, csvFiles_1, csvFiles_1_1, csvFile, playlistName, tracks, e_1_1, dbTracks, actualFiles, normalize_1, trackMap, newTracks, allCsvTracks, playlists_1, playlists_1_1, playlist, _a, _b, track, _loop_1, allCsvTracks_1, allCsvTracks_1_1, _c, csvPath, track, trackInsert, newTracks_1, newTracks_1_1, _d, csvPath, track, actualPath, actualFile, result, playlistInsert, playlistEntityInsert, playlists_2, playlists_2_1, playlist, existingPlaylist, playlistId, result, prevEntityId, trackCount, _e, _f, track, trackId, entityResult, currentEntityId, error_1;
        var e_1, _g, e_2, _h, e_3, _j, e_4, _k, e_5, _l, e_6, _m, e_7, _o;
        return __generator(this, function (_p) {
            switch (_p.label) {
                case 0:
                    playlistDir = '/Users/wagner/Downloads/Bathrobe_PoolParty_EngineDJ_Package';
                    dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';
                    musicDir = '/Users/wagner/Music/DJ/Bathrobe_PoolParty';
                    console.log('🎵 Add Playlists to Existing Engine DJ Database\n');
                    console.log("\uD83D\uDCC2 Database: ".concat(dbPath));
                    console.log("\uD83D\uDCC2 Playlists: ".concat(playlistDir));
                    console.log("\uD83D\uDCC2 Music: ".concat(musicDir));
                    console.log('');
                    _p.label = 1;
                case 1:
                    _p.trys.push([1, 13, , 14]);
                    // BACKUP FIRST!
                    console.log('💾 Creating backup...');
                    backupPath = dbPath + '.backup-' + Date.now();
                    return [4 /*yield*/, fs_1.promises.copyFile(dbPath, backupPath)];
                case 2:
                    _p.sent();
                    console.log("\u2705 Backup created: ".concat(backupPath, "\n"));
                    db = new better_sqlite3_1.default(dbPath);
                    dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get();
                    if (!dbInfo) {
                        console.log('❌ Invalid Engine DJ database - no Information table');
                        process.exit(1);
                    }
                    dbUuid = dbInfo.uuid;
                    existingTracks = db.prepare('SELECT COUNT(*) as count FROM Track').get();
                    existingPlaylists = db.prepare('SELECT COUNT(*) as count FROM Playlist').get();
                    console.log('📊 Existing database:');
                    console.log("  Tracks: ".concat(existingTracks.count));
                    console.log("  Playlists: ".concat(existingPlaylists.count, "\n"));
                    return [4 /*yield*/, fs_1.promises.readdir(playlistDir)];
                case 3:
                    files = _p.sent();
                    csvFiles = files.filter(function (f) {
                        return f.endsWith('.csv') &&
                            !f.includes('Timed') &&
                            !f.includes('Spine');
                    });
                    console.log("\uD83D\uDCCB Found ".concat(csvFiles.length, " playlists to import:\n"));
                    playlists = [];
                    _p.label = 4;
                case 4:
                    _p.trys.push([4, 9, 10, 11]);
                    csvFiles_1 = __values(csvFiles), csvFiles_1_1 = csvFiles_1.next();
                    _p.label = 5;
                case 5:
                    if (!!csvFiles_1_1.done) return [3 /*break*/, 8];
                    csvFile = csvFiles_1_1.value;
                    playlistName = csvFile.replace('.csv', '').replace('Bathrobe_', '');
                    return [4 /*yield*/, parseCSV(path_1.default.join(playlistDir, csvFile))];
                case 6:
                    tracks = _p.sent();
                    playlists.push({ name: playlistName, tracks: tracks });
                    console.log("  \uD83D\uDCDD ".concat(playlistName, ": ").concat(tracks.length, " tracks"));
                    _p.label = 7;
                case 7:
                    csvFiles_1_1 = csvFiles_1.next();
                    return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 11];
                case 9:
                    e_1_1 = _p.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 11];
                case 10:
                    try {
                        if (csvFiles_1_1 && !csvFiles_1_1.done && (_g = csvFiles_1.return)) _g.call(csvFiles_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 11:
                    console.log('');
                    dbTracks = db.prepare('SELECT id, path, filename FROM Track').all();
                    console.log("\uD83D\uDD0D Checking for tracks in database (".concat(dbTracks.length, " existing tracks)...\n"));
                    return [4 /*yield*/, fs_1.promises.readdir(musicDir)];
                case 12:
                    actualFiles = _p.sent();
                    normalize_1 = function (s) { return s
                        .normalize('NFD') // Decompose unicode
                        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                        .toLowerCase()
                        .replace(/[^\w\s]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim(); };
                    trackMap = new Map();
                    newTracks = [];
                    allCsvTracks = new Map();
                    try {
                        for (playlists_1 = __values(playlists), playlists_1_1 = playlists_1.next(); !playlists_1_1.done; playlists_1_1 = playlists_1.next()) {
                            playlist = playlists_1_1.value;
                            try {
                                for (_a = (e_3 = void 0, __values(playlist.tracks)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    track = _b.value;
                                    allCsvTracks.set(track.filepath, track);
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_j = _a.return)) _j.call(_a);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (playlists_1_1 && !playlists_1_1.done && (_h = playlists_1.return)) _h.call(playlists_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    console.log("\uD83D\uDCC0 Processing ".concat(allCsvTracks.size, " unique tracks...\n"));
                    _loop_1 = function (csvPath, track) {
                        // First, check if track already exists in database (by path or filename)
                        var dbTrack = dbTracks.find(function (t) { return t.path === csvPath; });
                        if (!dbTrack) {
                            // Try by filename
                            var csvFilename_1 = path_1.default.basename(csvPath);
                            dbTrack = dbTracks.find(function (t) { return t.filename === csvFilename_1; });
                        }
                        if (dbTrack) {
                            console.log("  \u2713 Already in DB: ".concat(track.artist, " - ").concat(track.title));
                            trackMap.set(csvPath, dbTrack.id);
                            return "continue";
                        }
                        // Not in database - try to find the actual file by artist and title
                        var normalizedArtist = normalize_1(track.artist);
                        var normalizedTitle = normalize_1(track.title);
                        var actualFile = actualFiles.find(function (f) {
                            var normalizedFile = normalize_1(f.replace(/\.flac$/, ''));
                            // Match if file contains both artist and title
                            return normalizedFile.includes(normalizedArtist) &&
                                normalizedFile.includes(normalizedTitle);
                        });
                        if (actualFile) {
                            var actualPath_1 = path_1.default.join(musicDir, actualFile);
                            // Check if this actual path already exists in database (from previous run)
                            var existing = dbTracks.find(function (t) { return t.path === actualPath_1; });
                            if (existing) {
                                console.log("  \u2713 Already in DB (by path): ".concat(track.artist, " - ").concat(track.title));
                                trackMap.set(csvPath, existing.id);
                            }
                            else {
                                newTracks.push({ csvPath: csvPath, track: track, actualPath: actualPath_1, actualFile: actualFile });
                            }
                        }
                        else {
                            console.log("  \u26A0\uFE0F  File not found: ".concat(track.artist, " - ").concat(track.title));
                        }
                    };
                    try {
                        for (allCsvTracks_1 = __values(allCsvTracks), allCsvTracks_1_1 = allCsvTracks_1.next(); !allCsvTracks_1_1.done; allCsvTracks_1_1 = allCsvTracks_1.next()) {
                            _c = __read(allCsvTracks_1_1.value, 2), csvPath = _c[0], track = _c[1];
                            _loop_1(csvPath, track);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (allCsvTracks_1_1 && !allCsvTracks_1_1.done && (_k = allCsvTracks_1.return)) _k.call(allCsvTracks_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    // Add new tracks to database
                    if (newTracks.length > 0) {
                        console.log("\n\u2795 Adding ".concat(newTracks.length, " new tracks to database...\n"));
                        trackInsert = db.prepare("\n        INSERT INTO Track (\n          playOrder, length, bpm, year, path, filename, bitrate,\n          bpmAnalyzed, title, artist\n        )\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ");
                        try {
                            for (newTracks_1 = __values(newTracks), newTracks_1_1 = newTracks_1.next(); !newTracks_1_1.done; newTracks_1_1 = newTracks_1.next()) {
                                _d = newTracks_1_1.value, csvPath = _d.csvPath, track = _d.track, actualPath = _d.actualPath, actualFile = _d.actualFile;
                                result = trackInsert.run(0, // playOrder
                                0, // length
                                0, // bpm
                                0, // year
                                actualPath, actualFile, 320, // bitrate
                                0, // bpmAnalyzed
                                track.title, track.artist);
                                trackMap.set(csvPath, result.lastInsertRowid);
                                console.log("  \u2705 ".concat(track.artist, " - ").concat(track.title));
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (newTracks_1_1 && !newTracks_1_1.done && (_l = newTracks_1.return)) _l.call(newTracks_1);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                    // Create playlists
                    console.log("\n\uD83D\uDCCB Creating playlists...\n");
                    // Start transaction
                    db.prepare('BEGIN').run();
                    playlistInsert = db.prepare("\n      INSERT INTO Playlist (title, parentListId, isPersisted, nextListId, lastEditTime, isExplicitlyExported)\n      VALUES (?, ?, ?, ?, ?, ?)\n    ");
                    playlistEntityInsert = db.prepare("\n      INSERT INTO PlaylistEntity (listId, trackId, databaseUuid, nextEntityId, membershipReference)\n      VALUES (?, ?, ?, ?, ?)\n    ");
                    try {
                        for (playlists_2 = __values(playlists), playlists_2_1 = playlists_2.next(); !playlists_2_1.done; playlists_2_1 = playlists_2.next()) {
                            playlist = playlists_2_1.value;
                            existingPlaylist = db.prepare('SELECT id FROM Playlist WHERE title = ? AND parentListId = 0')
                                .get(playlist.name);
                            playlistId = void 0;
                            if (existingPlaylist) {
                                console.log("  \u267B\uFE0F  Updating existing playlist: ".concat(playlist.name));
                                playlistId = existingPlaylist.id;
                                // Delete existing entities
                                db.prepare('DELETE FROM PlaylistEntity WHERE listId = ?').run(playlistId);
                            }
                            else {
                                result = playlistInsert.run(playlist.name, 0, 1, 0, new Date().toISOString(), 1);
                                playlistId = result.lastInsertRowid;
                            }
                            prevEntityId = null;
                            trackCount = 0;
                            try {
                                for (_e = (e_7 = void 0, __values(playlist.tracks)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                    track = _f.value;
                                    trackId = trackMap.get(track.filepath);
                                    if (trackId) {
                                        console.log("    Adding track ".concat(trackId, " to playlist ").concat(playlistId));
                                        entityResult = playlistEntityInsert.run(playlistId, trackId, dbUuid, 0, // nextEntityId (will be updated for previous entity)
                                        0 // membershipReference (must be 0, not 1!)
                                        );
                                        currentEntityId = entityResult.lastInsertRowid;
                                        console.log("      Entity ID: ".concat(currentEntityId));
                                        // Update previous entity to point to this one
                                        if (prevEntityId) {
                                            db.prepare('UPDATE PlaylistEntity SET nextEntityId = ? WHERE id = ?')
                                                .run(currentEntityId, prevEntityId);
                                        }
                                        prevEntityId = currentEntityId;
                                        trackCount++;
                                    }
                                    else {
                                        console.log("    \u26A0\uFE0F  No trackId for: ".concat(track.filepath));
                                    }
                                }
                            }
                            catch (e_7_1) { e_7 = { error: e_7_1 }; }
                            finally {
                                try {
                                    if (_f && !_f.done && (_o = _e.return)) _o.call(_e);
                                }
                                finally { if (e_7) throw e_7.error; }
                            }
                            console.log("  \u2705 ".concat(playlist.name, ": ").concat(trackCount, " tracks"));
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (playlists_2_1 && !playlists_2_1.done && (_m = playlists_2.return)) _m.call(playlists_2);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    // Commit transaction
                    db.prepare('COMMIT').run();
                    console.log('\n💾 Transaction committed');
                    db.close();
                    console.log("\n\u2705 Playlists added successfully!\n");
                    console.log('📊 Summary:');
                    console.log("  New tracks added: ".concat(newTracks.length));
                    console.log("  Playlists created: ".concat(playlists.length));
                    console.log("  Backup saved: ".concat(backupPath, "\n"));
                    console.log('💡 The playlists should now appear in Engine DJ Desktop or hardware!');
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _p.sent();
                    console.error('❌ Error:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
main();
