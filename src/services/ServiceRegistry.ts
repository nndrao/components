/**
 * Service Registry
 * 
 * Central registry for all services in the AGV1 system.
 * Implements dependency injection pattern for loose coupling
 * and easy testing.
 */

import { IServiceRegistry } from '@/types';

/**
 * Service not found error
 */
export class ServiceNotFoundError extends Error {
  constructor(serviceName: string) {
    super(`Service '${serviceName}' not found in registry`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Service already registered error
 */
export class ServiceAlreadyRegisteredError extends Error {
  constructor(serviceName: string) {
    super(`Service '${serviceName}' is already registered`);
    this.name = 'ServiceAlreadyRegisteredError';
  }
}

/**
 * Service registry implementation
 */
export class ServiceRegistry implements IServiceRegistry {
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();
  private singletons: Map<string, any> = new Map();

  /**
   * Register a service instance
   */
  register<T>(name: string, service: T): void {
    if (this.services.has(name)) {
      throw new ServiceAlreadyRegisteredError(name);
    }
    
    this.services.set(name, service);
    console.log(`Service '${name}' registered`);
  }

  /**
   * Register a service factory
   * The factory will be called each time the service is requested
   */
  registerFactory<T>(name: string, factory: () => T): void {
    if (this.factories.has(name) || this.services.has(name)) {
      throw new ServiceAlreadyRegisteredError(name);
    }
    
    this.factories.set(name, factory);
    console.log(`Service factory '${name}' registered`);
  }

  /**
   * Register a singleton service factory
   * The factory will be called only once, and the result cached
   */
  registerSingleton<T>(name: string, factory: () => T): void {
    if (this.factories.has(name) || this.services.has(name)) {
      throw new ServiceAlreadyRegisteredError(name);
    }
    
    this.factories.set(name, () => {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, factory());
      }
      return this.singletons.get(name);
    });
    
    console.log(`Singleton service '${name}' registered`);
  }

  /**
   * Get a registered service
   */
  get<T>(name: string): T {
    // Check direct services first
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }
    
    // Check factories
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      return factory() as T;
    }
    
    throw new ServiceNotFoundError(name);
  }

  /**
   * Try to get a service, return null if not found
   */
  tryGet<T>(name: string): T | null {
    try {
      return this.get<T>(name);
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Unregister a service
   */
  unregister(name: string): void {
    const removed = this.services.delete(name) || 
                   this.factories.delete(name);
    
    // Also remove from singletons if it exists
    this.singletons.delete(name);
    
    if (removed) {
      console.log(`Service '${name}' unregistered`);
    }
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return [
      ...this.services.keys(),
      ...this.factories.keys()
    ];
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    console.log('All services cleared');
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalServices: number;
    directServices: number;
    factories: number;
    singletons: number;
  } {
    return {
      totalServices: this.services.size + this.factories.size,
      directServices: this.services.size,
      factories: this.factories.size,
      singletons: this.singletons.size
    };
  }

  /**
   * Create a scoped registry
   * Useful for testing or creating isolated service contexts
   */
  createScope(): ServiceRegistry {
    const scopedRegistry = new ServiceRegistry();
    
    // Copy all services to the scoped registry
    for (const [name, service] of this.services) {
      scopedRegistry.services.set(name, service);
    }
    
    // Copy all factories (but not singleton instances)
    for (const [name, factory] of this.factories) {
      scopedRegistry.factories.set(name, factory);
    }
    
    return scopedRegistry;
  }
}

/**
 * Global service registry instance
 */
export const globalRegistry = new ServiceRegistry();

/**
 * Service names constants for type safety
 */
export const ServiceNames = {
  STORAGE: 'storage',
  PROFILE: 'profile',
  CONFIGURATION: 'configuration',
  DATA_SOURCE: 'dataSource',
  APP_CONTAINER: 'appContainer',
  WEBSOCKET: 'webSocket',
  NOTIFICATION: 'notification',
  COLUMN_FORMAT: 'columnFormat'
} as const;

/**
 * Type for service names
 */
export type ServiceName = typeof ServiceNames[keyof typeof ServiceNames];