/**
 * Typed Event Emitter
 * 
 * Type-safe event emitter for data providers.
 */

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<Function>>();

  /**
   * Add event listener
   */
  on<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Function);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as Function);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event
   */
  protected emit<K extends keyof TEvents>(
    event: K,
    ...args: Parameters<TEvents[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  protected removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Remove all listeners for a specific event
   */
  protected removeListeners<K extends keyof TEvents>(event: K): void {
    this.listeners.delete(event);
  }

  /**
   * Get listener count for an event
   */
  protected listenerCount<K extends keyof TEvents>(event: K): number {
    const handlers = this.listeners.get(event);
    return handlers ? handlers.size : 0;
  }
}