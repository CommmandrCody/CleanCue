#!/usr/bin/env node
"use strict";
/**
 * Fix missing tracks in playlists by searching the entire database
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var dbPath, db, dbInfo, dbUuid, missing, normalize, playlistEntityInsert, added, _loop_1, missing_1, missing_1_1, m, playlists, playlists_1, playlists_1_1, p;
        var e_1, _a, e_2, _b;
        return __generator(this, function (_c) {
            dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';
            console.log('🔧 Fix Missing Tracks\n');
            db = new better_sqlite3_1.default(dbPath);
            dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get();
            dbUuid = dbInfo.uuid;
            missing = [
                // DeepSelects (ID 125) - all 5 tracks missing
                { artist: 'Sonny Fodera', title: 'Into You', playlistId: 125, playlistName: 'DeepSelects' },
                { artist: 'Dom Dolla', title: 'You', playlistId: 125, playlistName: 'DeepSelects' },
                { artist: 'Hot Since 82', title: 'Buggin', playlistId: 125, playlistName: 'DeepSelects' },
                { artist: 'Tube & Berger', title: 'Set Free', playlistId: 125, playlistName: 'DeepSelects' },
                { artist: 'Elderbrook', title: 'Capricorn', playlistId: 125, playlistName: 'DeepSelects' },
                // Master (ID 127) - same 5 tracks
                { artist: 'Sonny Fodera', title: 'Into You', playlistId: 127, playlistName: 'Master' },
                { artist: 'Dom Dolla', title: 'You', playlistId: 127, playlistName: 'Master' },
                { artist: 'Hot Since 82', title: 'Buggin', playlistId: 127, playlistName: 'Master' },
                { artist: 'Tube & Berger', title: 'Set Free', playlistId: 127, playlistName: 'Master' },
                { artist: 'Elderbrook', title: 'Capricorn', playlistId: 127, playlistName: 'Master' },
                // WarmUp (ID 129) - 1 track
                { artist: 'Satin Jackets', title: 'Coffee', playlistId: 129, playlistName: 'WarmUp' },
            ];
            console.log("\uD83D\uDD0D Searching for ".concat(missing.length, " missing tracks...\n"));
            normalize = function (s) { return s
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim(); };
            db.prepare('BEGIN').run();
            playlistEntityInsert = db.prepare("\n    INSERT INTO PlaylistEntity (listId, trackId, databaseUuid, nextEntityId, membershipReference)\n    VALUES (?, ?, ?, ?, ?)\n  ");
            added = 0;
            _loop_1 = function (m) {
                var normalizedArtist = normalize(m.artist);
                var normalizedTitle = normalize(m.title);
                // Search for track in database
                var tracks = db.prepare("\n      SELECT id, artist, title, filename\n      FROM Track\n      WHERE 1=1\n    ").all();
                var track = tracks.find(function (t) {
                    var fileNorm = normalize(t.filename);
                    var artistNorm = normalize(t.artist || '');
                    var titleNorm = normalize(t.title || '');
                    return (fileNorm.includes(normalizedArtist) || artistNorm.includes(normalizedArtist)) &&
                        (fileNorm.includes(normalizedTitle) || titleNorm.includes(normalizedTitle));
                });
                if (track) {
                    console.log("\u2713 Found: ".concat(m.artist, " - ").concat(m.title));
                    console.log("  Track ID: ".concat(track.id, ", File: ").concat(track.filename));
                    console.log("  Adding to ".concat(m.playlistName, "..."));
                    // Get last entity in this playlist to append after it
                    var lastEntity = db.prepare("\n        SELECT id FROM PlaylistEntity\n        WHERE listId = ?\n        AND id NOT IN (\n          SELECT nextEntityId FROM PlaylistEntity\n          WHERE listId = ? AND nextEntityId > 0\n        )\n        LIMIT 1\n      ").get(m.playlistId, m.playlistId);
                    var entityResult = playlistEntityInsert.run(m.playlistId, track.id, dbUuid, 0, 0);
                    var newEntityId = entityResult.lastInsertRowid;
                    // Update previous last entity to point to this one
                    if (lastEntity) {
                        db.prepare('UPDATE PlaylistEntity SET nextEntityId = ? WHERE id = ?')
                            .run(newEntityId, lastEntity.id);
                    }
                    console.log("  \u2705 Added\n");
                    added++;
                }
                else {
                    console.log("\u26A0\uFE0F  Not found: ".concat(m.artist, " - ").concat(m.title, "\n"));
                }
            };
            try {
                for (missing_1 = __values(missing), missing_1_1 = missing_1.next(); !missing_1_1.done; missing_1_1 = missing_1.next()) {
                    m = missing_1_1.value;
                    _loop_1(m);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (missing_1_1 && !missing_1_1.done && (_a = missing_1.return)) _a.call(missing_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            db.prepare('COMMIT').run();
            console.log('💾 Transaction committed');
            // Show final counts
            console.log('\n📊 Final playlist counts:');
            playlists = db.prepare("\n    SELECT p.id, p.title, COUNT(pe.id) as tracks\n    FROM Playlist p\n    LEFT JOIN PlaylistEntity pe ON p.id = pe.listId\n    WHERE p.id >= 123\n    GROUP BY p.id\n    ORDER BY p.id\n  ").all();
            try {
                for (playlists_1 = __values(playlists), playlists_1_1 = playlists_1.next(); !playlists_1_1.done; playlists_1_1 = playlists_1.next()) {
                    p = playlists_1_1.value;
                    console.log("  ".concat(p.title, ": ").concat(p.tracks, " tracks"));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (playlists_1_1 && !playlists_1_1.done && (_b = playlists_1.return)) _b.call(playlists_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            db.close();
            console.log("\n\u2705 Fixed ".concat(added, " missing tracks\n"));
            return [2 /*return*/];
        });
    });
}
main();
