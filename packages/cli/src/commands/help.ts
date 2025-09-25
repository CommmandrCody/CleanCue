import { CleanCueEngine } from '@cleancue/simple-engine';
import { Command } from '../types.js';

const CLI_VERSION = '0.2.4';

export class HelpCommand implements Command {
  name = 'help';
  description = 'Show help information';
  usage = 'help';

  execute(args: string[], engine?: CleanCueEngine): void {
    console.log(`CleanCue CLI v${CLI_VERSION}`);
    console.log('');
    console.log('Usage: cleancue <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  scan <path> [path2] ...  Scan directories for music files');
    console.log('  analyze [type]           Analyze tracks (types: all, tempo, key, energy)');
    console.log('  list [limit]             List tracks in library (default: 20)');
    console.log('  stats                    Show library statistics');
    console.log('  doctor                   Run system health check');
    console.log('  info                     Show application information');
    console.log('  help                     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  cleancue scan ~/Music/DJ\\ Collection');
    console.log('  cleancue analyze all');
    console.log('  cleancue analyze tempo');
    console.log('  cleancue list 50');
    console.log('  cleancue stats');
  }
}

export class InfoCommand implements Command {
  name = 'info';
  description = 'Show application information';
  usage = 'info';

  execute(args: string[], engine?: CleanCueEngine): void {
    console.log('CleanCue - Professional DJ Library Management');
    console.log(`Version: ${CLI_VERSION}`);
    console.log('A modern tool for managing and analyzing music libraries');
    console.log('');
    console.log('Features:');
    console.log('• Fast library scanning with metadata extraction');
    console.log('• BPM detection using librosa');
    console.log('• Musical key detection with Camelot wheel notation');
    console.log('• Volume analysis and clipping detection');
    console.log('• Energy analysis for DJ cue point generation');
    console.log('• Export to M3U and other DJ software formats');
  }
}