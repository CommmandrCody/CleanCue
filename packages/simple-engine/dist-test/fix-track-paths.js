#!/usr/bin/env node
"use strict";
/**
 * Fix track paths to use relative format instead of absolute
 * Handles UNIQUE constraint by reusing existing tracks when possible
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
        var dbPath, backupPath, fs, db, ourTracks, reused, updated, _i, ourTracks_1, track, relativePath, existing, result;
        return __generator(this, function (_a) {
            dbPath = '/Users/wagner/Music/Engine Library/Database2/m.db';
            console.log('🔧 Fix Track Paths to Relative Format\n');
            console.log("\uD83D\uDCC2 Database: ".concat(dbPath, "\n"));
            try {
                backupPath = dbPath + '.backup-paths-' + Date.now();
                fs = require('fs');
                fs.copyFileSync(dbPath, backupPath);
                console.log("\u2705 Backup created: ".concat(backupPath, "\n"));
                db = new better_sqlite3_1.default(dbPath);
                ourTracks = db.prepare("\n      SELECT id, path, filename FROM Track\n      WHERE id >= 5129 AND id <= 5146\n      ORDER BY id\n    ").all();
                console.log("\uD83D\uDCC0 Found ".concat(ourTracks.length, " tracks to process\n"));
                db.prepare('BEGIN').run();
                reused = 0;
                updated = 0;
                for (_i = 0, ourTracks_1 = ourTracks; _i < ourTracks_1.length; _i++) {
                    track = ourTracks_1[_i];
                    relativePath = track.path.replace('/Users/wagner/Music/', '../');
                    console.log("\nProcessing track ".concat(track.id, ":"));
                    console.log("  Current: ".concat(track.path));
                    console.log("  Relative: ".concat(relativePath));
                    existing = db.prepare('SELECT id FROM Track WHERE path = ?')
                        .get(relativePath);
                    if (existing && existing.id !== track.id) {
                        console.log("  \u2713 Found existing track with relative path: ".concat(existing.id));
                        result = db.prepare("\n          UPDATE PlaylistEntity\n          SET trackId = ?\n          WHERE trackId = ?\n        ").run(existing.id, track.id);
                        console.log("  \u2192 Updated ".concat(result.changes, " PlaylistEntity records"));
                        // Delete our duplicate track
                        db.prepare('DELETE FROM Track WHERE id = ?').run(track.id);
                        console.log("  \u2192 Deleted duplicate track ".concat(track.id));
                        reused++;
                    }
                    else {
                        // No existing track with this path - just update the path
                        db.prepare('UPDATE Track SET path = ? WHERE id = ?')
                            .run(relativePath, track.id);
                        console.log("  \u2713 Updated path to relative format");
                        updated++;
                    }
                }
                db.prepare('COMMIT').run();
                console.log('\n💾 Transaction committed');
                db.close();
                console.log("\n\u2705 Path fix complete!\n");
                console.log('📊 Summary:');
                console.log("  Tracks reused (existing): ".concat(reused));
                console.log("  Tracks updated (paths): ".concat(updated));
                console.log("  Backup saved: ".concat(backupPath, "\n"));
                console.log('💡 Check Engine DJ to see if playlists now display tracks!');
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
