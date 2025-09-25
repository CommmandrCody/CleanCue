import { Command } from './types.js';
import {
  StandaloneScanCommand,
  CountCommand,
  FindCommand,
  HelpCommand,
  InfoCommand,
  DoctorCommand
} from './commands/index-standalone.js';

export class StandaloneCommandRegistry {
  private commands = new Map<string, Command>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new StandaloneScanCommand());
    this.register(new CountCommand());
    this.register(new FindCommand());
    this.register(new HelpCommand());
    this.register(new InfoCommand());
    this.register(new DoctorCommand());
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