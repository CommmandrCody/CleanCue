module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        outDir: './dist',
        rootDir: '.',
        verbatimModuleSyntax: false
      }
    }],
  },
  collectCoverageFrom: [
    'packages/**/*.ts',
    'apps/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/release/**',
    '!packages/ui/**'
  ],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  moduleNameMapper: {
    '^@cleancue/(.*)$': '<rootDir>/packages/$1/src'
  },
  extensionsToTreatAsEsm: ['.ts']
};