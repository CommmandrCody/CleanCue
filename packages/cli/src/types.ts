import { CleanCueEngine } from '@cleancue/simple-engine';

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute(args: string[], engine?: CleanCueEngine): Promise<void> | void;
}

export interface CLIOptions {
  verbose?: boolean;
  help?: boolean;
}