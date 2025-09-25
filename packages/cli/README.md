# @cleancue/cli

Clean, modular, testable CLI for CleanCue music library management.

## Architecture

### Modular Design
- **Commands**: Each command is a separate class implementing the `Command` interface
- **Registry**: Dynamic command registration and discovery system
- **Interface**: Clean abstraction layer for UI integration
- **Testing**: Comprehensive test coverage for all modules

### File Structure
```
src/
├── commands/           # Individual command implementations
│   ├── scan.ts        # Library scanning
│   ├── analyze.ts     # Audio analysis
│   ├── stats.ts       # Statistics reporting
│   ├── list.ts        # Track listing
│   ├── doctor.ts      # Health checks
│   └── help.ts        # Help and info
├── cli.ts             # Main CLI orchestrator
├── cli-interface.ts   # UI integration interface
├── command-registry.ts # Command registration system
├── event-handlers.ts  # Progress and event handling
├── types.ts          # TypeScript interfaces
└── index.ts          # Main entry point and exports
```

## Usage

### CLI Usage
```bash
# Direct CLI usage
cleancue scan ~/Music
cleancue analyze all
cleancue stats
```

### Programmatic Usage
```typescript
import { CLIInterface } from '@cleancue/cli';

const cli = new CLIInterface();

// Execute commands
const result = await cli.scan(['/path/to/music']);
const stats = await cli.getStats();

// Check available commands
const commands = cli.getAvailableCommands();
```

### UI Integration
```typescript
import { CLIInterface } from '@cleancue/cli';

// Clean interface for UI - no engine initialization overhead
const cli = new CLIInterface();

// Structured results
const result = await cli.executeCommand('scan', ['/music']);
if (result.success) {
  console.log(result.message);
} else {
  console.error(result.error);
}
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Scalability Features

1. **Lazy Engine Loading**: Engine only initializes when needed
2. **Command Isolation**: Each command is independently testable
3. **Registry Pattern**: Easy to add/remove/modify commands
4. **Clean Interface**: UI can use CLI without CLI-specific concerns
5. **Event System**: Progress reporting and real-time updates
6. **Error Isolation**: One command failure doesn't affect others

## Adding New Commands

```typescript
import { Command } from '@cleancue/cli';

export class MyCommand implements Command {
  name = 'my-command';
  description = 'Does something cool';
  usage = 'my-command [options]';

  async execute(args: string[], engine?: CleanCueEngine): Promise<void> {
    // Implementation
  }
}

// Register in command-registry.ts
this.register(new MyCommand());
```

## Iron-clad CLI Design

- **Zero Dependencies**: Only depends on @cleancue/engine
- **Full Test Coverage**: Every command and interface tested
- **TypeScript Strict**: Full type safety
- **Error Handling**: Comprehensive error reporting
- **Performance**: Fast startup, lazy loading
- **Modularity**: Easy to maintain and extend