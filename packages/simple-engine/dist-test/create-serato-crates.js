#!/usr/bin/env node
"use strict";
/**
 * Create Serato .crate files from CSV playlists
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
var fs_1 = require("fs");
var path_1 = __importDefault(require("path"));
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
function writeBigEndianUint32(value) {
    var buf = Buffer.alloc(4);
    buf.writeUInt32BE(value, 0);
    return buf;
}
function toUTF16BE(str) {
    var buf = Buffer.alloc(str.length * 2);
    for (var i = 0; i < str.length; i++) {
        buf.writeUInt16BE(str.charCodeAt(i), i * 2);
    }
    return buf;
}
function createCrateFile(tracks) {
    var chunks = [];
    // Version header (UTF-16BE encoded)
    var versionString = '1.0/Serato ScratchLive Crate';
    var versionBuf = toUTF16BE(versionString);
    chunks.push(Buffer.from('vrsn'));
    chunks.push(writeBigEndianUint32(versionBuf.length));
    chunks.push(versionBuf);
    // Add each track
    for (var _i = 0, tracks_1 = tracks; _i < tracks_1.length; _i++) {
        var track = tracks_1[_i];
        // otrk = outer track container
        var ptrk = Buffer.from('ptrk');
        var pathBuf = toUTF16BE(track.filepath);
        var ptrkData = Buffer.concat([
            ptrk,
            writeBigEndianUint32(pathBuf.length),
            pathBuf
        ]);
        chunks.push(Buffer.from('otrk'));
        chunks.push(writeBigEndianUint32(ptrkData.length));
        chunks.push(ptrkData);
    }
    return Buffer.concat(chunks);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var playlistDir, outputDir, files, csvFiles, _i, csvFiles_1, csvFile, crateName, tracks, crateData, cratePath, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    playlistDir = '/Users/wagner/Downloads/Bathrobe_PoolParty_EngineDJ_Package';
                    outputDir = '/Users/wagner/Music/_Serato_/Subcrates';
                    console.log('🎵 Create Serato Crates from CSV\n');
                    console.log("\uD83D\uDCC2 Playlists: ".concat(playlistDir));
                    console.log("\uD83D\uDCC2 Output: ".concat(outputDir, "\n"));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    // Create output directory if it doesn't exist
                    return [4 /*yield*/, fs_1.promises.mkdir(outputDir, { recursive: true })];
                case 2:
                    // Create output directory if it doesn't exist
                    _a.sent();
                    return [4 /*yield*/, fs_1.promises.readdir(playlistDir)];
                case 3:
                    files = _a.sent();
                    csvFiles = files.filter(function (f) {
                        return f.endsWith('.csv') &&
                            !f.includes('Timed') &&
                            !f.includes('Spine');
                    });
                    console.log("\uD83D\uDCCB Found ".concat(csvFiles.length, " playlists to convert:\n"));
                    _i = 0, csvFiles_1 = csvFiles;
                    _a.label = 4;
                case 4:
                    if (!(_i < csvFiles_1.length)) return [3 /*break*/, 8];
                    csvFile = csvFiles_1[_i];
                    crateName = csvFile.replace('.csv', '').replace('Bathrobe_', '');
                    return [4 /*yield*/, parseCSV(path_1.default.join(playlistDir, csvFile))];
                case 5:
                    tracks = _a.sent();
                    console.log("  \uD83D\uDCDD ".concat(crateName, ": ").concat(tracks.length, " tracks"));
                    crateData = createCrateFile(tracks);
                    cratePath = path_1.default.join(outputDir, "".concat(crateName, ".crate"));
                    return [4 /*yield*/, fs_1.promises.writeFile(cratePath, crateData)];
                case 6:
                    _a.sent();
                    console.log("     \u2705 ".concat(cratePath));
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 4];
                case 8:
                    console.log("\n\u2705 Created ".concat(csvFiles.length, " Serato crates!\n"));
                    console.log('💡 Next steps:');
                    console.log('   1. Open Serato DJ Pro');
                    console.log('   2. Refresh your library to see the new crates');
                    console.log('   3. Use Engine DJ Desktop to import from Serato\n');
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _a.sent();
                    console.error('❌ Error:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
main();
