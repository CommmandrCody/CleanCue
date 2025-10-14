#!/usr/bin/env node
"use strict";
/**
 * Fix DeepSelects playlist by finding matching tracks
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var dbPath, db, dbInfo, dbUuid, playlistId, targetTracks, foundTracks, _i, targetTracks_1, target, track, playlistEntityInsert, prevEntityId, _a, foundTracks_1, trackId, entityResult, currentEntityId;
        return __generator(this, function (_b) {
            dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';
            console.log('🔧 Fix DeepSelects Playlist\n');
            try {
                db = new better_sqlite3_1.default(dbPath);
                dbInfo = db.prepare('SELECT uuid FROM Information WHERE id = 1').get();
                dbUuid = dbInfo.uuid;
                playlistId = 125;
                // Delete existing (empty) entities
                db.prepare('DELETE FROM PlaylistEntity WHERE listId = ?').run(playlistId);
                targetTracks = [
                    { artist: 'Sonny Fodera', title: 'Into You' },
                    { artist: 'Dom Dolla', title: 'You' },
                    { artist: 'Hot Since 82', title: 'Buggin' },
                    { artist: 'Tube & Berger', title: 'Set Free' },
                    { artist: 'Elderbrook', title: 'Capricorn' }
                ];
                console.log("\uD83D\uDD0D Finding ".concat(targetTracks.length, " tracks...\n"));
                foundTracks = [];
                for (_i = 0, targetTracks_1 = targetTracks; _i < targetTracks_1.length; _i++) {
                    target = targetTracks_1[_i];
                    track = db.prepare("\n        SELECT id, artist, title, filename\n        FROM Track\n        WHERE (artist LIKE ? OR filename LIKE ?)\n        AND (title LIKE ? OR filename LIKE ?)\n        LIMIT 1\n      ").get("%".concat(target.artist, "%"), "%".concat(target.artist, "%"), "%".concat(target.title, "%"), "%".concat(target.title, "%"));
                    if (track) {
                        console.log("\u2713 Found: ".concat(track.artist, " - ").concat(track.title));
                        console.log("  File: ".concat(track.filename));
                        console.log("  ID: ".concat(track.id, "\n"));
                        foundTracks.push(track.id);
                    }
                    else {
                        console.log("\u26A0\uFE0F  Not found: ".concat(target.artist, " - ").concat(target.title, "\n"));
                    }
                }
                if (foundTracks.length === 0) {
                    console.log('❌ No tracks found');
                    db.close();
                    return [2 /*return*/];
                }
                console.log("\n\uD83D\uDCCB Adding ".concat(foundTracks.length, " tracks to DeepSelects...\n"));
                db.prepare('BEGIN').run();
                playlistEntityInsert = db.prepare("\n      INSERT INTO PlaylistEntity (listId, trackId, databaseUuid, nextEntityId, membershipReference)\n      VALUES (?, ?, ?, ?, ?)\n    ");
                prevEntityId = null;
                for (_a = 0, foundTracks_1 = foundTracks; _a < foundTracks_1.length; _a++) {
                    trackId = foundTracks_1[_a];
                    entityResult = playlistEntityInsert.run(playlistId, trackId, dbUuid, 0, // nextEntityId (will be updated for previous entity)
                    0 // membershipReference
                    );
                    currentEntityId = entityResult.lastInsertRowid;
                    // Update previous entity to point to this one
                    if (prevEntityId) {
                        db.prepare('UPDATE PlaylistEntity SET nextEntityId = ? WHERE id = ?')
                            .run(currentEntityId, prevEntityId);
                    }
                    prevEntityId = currentEntityId;
                }
                db.prepare('COMMIT').run();
                console.log('💾 Transaction committed');
                db.close();
                console.log("\n\u2705 DeepSelects playlist fixed: ".concat(foundTracks.length, " tracks added\n"));
            }
            catch (error) {
                console.error('❌ Error:', error);
                process.exit(1);
            }
            return [2 /*return*/];
        });
    });
}
main();
