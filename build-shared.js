#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Building shared package manually...');

// Create dist directory
const distDir = path.join(__dirname, 'packages/shared/dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy and transform TypeScript files to JavaScript
const srcDir = path.join(__dirname, 'packages/shared/src');
const files = fs.readdirSync(srcDir);

for (const file of files) {
  if (file.endsWith('.ts')) {
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');

    // Simple TS to JS transformation (remove type annotations)
    const jsContent = content
      .replace(/: \w+(\[\])?/g, '') // Remove simple type annotations
      .replace(/interface \w+ \{[^}]+\}/g, '') // Remove interface declarations
      .replace(/export interface[^}]+\}/g, '') // Remove exported interfaces
      .replace(/export type[^;]+;/g, '') // Remove type exports
      .replace(/import type[^;]+;/g, '') // Remove type imports
      .replace(/\?\s*:/g, ':') // Remove optional property markers
      .replace(/as \w+/g, '') // Remove type assertions
      .replace(/\n\n+/g, '\n\n'); // Clean up extra newlines

    const jsFile = file.replace('.ts', '.js');
    fs.writeFileSync(path.join(distDir, jsFile), jsContent);
    console.log(`Converted ${file} -> ${jsFile}`);
  }
}

// Create package.json in dist
const packageJson = {
  "name": "@cleancue/shared",
  "version": "0.2.3",
  "main": "index.js",
  "types": "index.d.ts"
};

fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(packageJson, null, 2));

// Create simple .d.ts files
const indexDts = `
export * from './types';
export * from './shared_types';
`;

fs.writeFileSync(path.join(distDir, 'index.d.ts'), indexDts);

const typesDts = `
// Core entity types
export interface Track {
  id: string;
  path: string;
  hash: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  fileModifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Audio metadata
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  trackNumber?: number;
  discNumber?: number;
  composer?: string;
  comment?: string;

  // Technical properties
  durationMs?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;

  // Analysis results (cached)
  bpm?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  valence?: number;

  // Filename intelligence (from enhanced metadata worker)
  filenameConfidence?: number;
  filenamePattern?: string;
  suggestedTitle?: string;
  suggestedArtist?: string;
  suggestedRemixer?: string;
  metadataQuality?: 'excellent' | 'good' | 'poor' | 'missing';
  needsReview?: boolean;
}

export interface Analysis {
  id: string;
  trackId: string;
  analyzerName: string;
  analyzerVersion: string;
  parameters: Record<string, any>;
  results: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface HealthIssue {
  trackId: string;
  path: string;
  type: 'missing_file' | 'analysis_failed' | 'no_analysis' | 'duplicate' | 'corrupted';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ScanResult {
  tracksScanned: number;
  tracksAdded: number;
  tracksUpdated: number;
  errors: Array<{
    path: string;
    error: string;
  }>;
}

export interface HealthReport {
  totalTracks: number;
  issues: HealthIssue[];
}
`;

fs.writeFileSync(path.join(distDir, 'types.d.ts'), typesDts);
fs.writeFileSync(path.join(distDir, 'shared_types.d.ts'), '// Shared types\n');

console.log('✅ Shared package built successfully!');