// Jest setup file for CLI tests

// Set NODE_ENV to test to prevent process.exit
process.env.NODE_ENV = 'test';

// Mock console methods globally to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock process.exit to prevent tests from terminating
process.exit = jest.fn() as never;