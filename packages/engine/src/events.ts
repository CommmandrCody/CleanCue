import { EventEmitter } from 'events';
import type { CleanCueEvent } from '@cleancue/shared';

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Increase limit for complex applications
  }

  // Type-safe event emission
  emit<T extends CleanCueEvent>(event: T['type'], data: T['data']): boolean {
    return super.emit(event, data);
  }

  // Type-safe event listening
  on<T extends CleanCueEvent>(event: T['type'], handler: (data: T['data']) => void): this {
    return super.on(event, handler);
  }

  // Type-safe one-time event listening
  once<T extends CleanCueEvent>(event: T['type'], handler: (data: T['data']) => void): this {
    return super.once(event, handler);
  }

  // Remove event listener
  off(event: string, handler: (...args: any[]) => void): this {
    return super.off(event, handler);
  }

  // Get listener count for debugging
  getListenerCount(event: string): number {
    return this.listenerCount(event);
  }

  // Get all registered event names
  getEventNames(): (string | symbol)[] {
    return this.eventNames();
  }

  // Clear all listeners for an event
  removeAllListeners(event?: string): this {
    return super.removeAllListeners(event);
  }
}