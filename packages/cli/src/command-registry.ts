import { Command } from './types.js';
import {
  ScanCommand,
  AnalyzeCommand,
  StatsCommand,
  ListCommand,
  DoctorCommand,
  HelpCommand,
  InfoCommand
} from './commands/index.js';

export class CommandRegistry {
  private commands = new Map<string, Command>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new ScanCommand());
    this.register(new AnalyzeCommand());
    this.register(new StatsCommand());
    this.register(new ListCommand());
    this.register(new DoctorCommand());
    this.register(new HelpCommand());
    this.register(new InfoCommand());
  }

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getNames(): string[] {
    return Array.from(this.commands.keys());
  }
}