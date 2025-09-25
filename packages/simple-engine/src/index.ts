/**
 * Simple Engine - Main Export
 *
 * This replaces the complex @cleancue/engine package with a much simpler system.
 * Drop-in replacement that maintains the same interface for your UI components.
 */

export { SimpleStore } from './simple-store';
export { UIService } from './ui-service';

// Maintain compatibility with existing UI code
export { UIService as CleanCueEngine } from './ui-service';