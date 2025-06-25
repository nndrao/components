/**
 * IndexedDB setup using idb library
 * 
 * This file handles the database schema and initialization for the configuration service.
 * It uses the idb library for a cleaner, promise-based API with TypeScript support.
 */

import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb';
import { Config } from './config.types';

/**
 * Database schema definition
 * Defines the structure of our IndexedDB database with TypeScript types
 */
export interface ConfigDBSchema extends DBSchema {
  configs: {
    key: string;
    value: Config;
    indexes: {
      'by-user': string;
      'by-type': string;
      'by-parent': string;
      'by-owner': string;
      'by-user-type': [string, string];
      'by-template': string;
      'by-creation': number;
      'by-update': number;
    };
  };
}

// Database constants
export const DB_NAME = 'ConfigDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'configs';

/**
 * Initialize the database with proper schema and indexes
 */
export async function initDB(): Promise<IDBPDatabase<ConfigDBSchema>> {
  return openDB<ConfigDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
      
      // Delete old object stores if they exist (for clean migrations)
      if (oldVersion > 0) {
        const objectStoreNames = Array.from(db.objectStoreNames);
        objectStoreNames.forEach(name => {
          if (db.objectStoreNames.contains(name)) {
            db.deleteObjectStore(name);
          }
        });
      }
      
      // Create the configs object store
      const store = db.createObjectStore('configs', {
        keyPath: 'configId'
      });
      
      // Create indexes for efficient queries
      // Single field indexes
      store.createIndex('by-user', 'userId', { unique: false });
      store.createIndex('by-type', 'componentType', { unique: false });
      store.createIndex('by-parent', 'parentId', { unique: false });
      store.createIndex('by-owner', 'ownerId', { unique: false });
      store.createIndex('by-template', 'isTemplate', { unique: false });
      store.createIndex('by-creation', 'creationTime', { unique: false });
      store.createIndex('by-update', 'lastUpdated', { unique: false });
      
      // Compound index for user + type queries
      store.createIndex('by-user-type', ['userId', 'componentType'], { unique: false });
      
      console.log('Database schema created successfully');
    },
    
    blocked() {
      console.warn('Database upgrade blocked by another connection');
    },
    
    blocking() {
      console.warn('This connection is blocking a database upgrade');
    },
    
    terminated() {
      console.error('Database connection was terminated');
    }
  });
}

/**
 * Database connection manager
 * Handles singleton connection and reconnection logic
 */
export class DBConnectionManager {
  private static instance: DBConnectionManager;
  private db: IDBPDatabase<ConfigDBSchema> | null = null;
  private initPromise: Promise<IDBPDatabase<ConfigDBSchema>> | null = null;
  
  private constructor() {}
  
  static getInstance(): DBConnectionManager {
    if (!DBConnectionManager.instance) {
      DBConnectionManager.instance = new DBConnectionManager();
    }
    return DBConnectionManager.instance;
  }
  
  async getDB(): Promise<IDBPDatabase<ConfigDBSchema>> {
    // If we have a valid connection, return it
    if (this.db && !this.isDBClosed(this.db)) {
      return this.db;
    }
    
    // If we're already initializing, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Initialize new connection
    this.initPromise = this.initializeDB();
    this.db = await this.initPromise;
    this.initPromise = null;
    
    return this.db;
  }
  
  private async initializeDB(): Promise<IDBPDatabase<ConfigDBSchema>> {
    try {
      const db = await initDB();
      console.log('Database connection established');
      return db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
  
  private isDBClosed(db: IDBPDatabase<ConfigDBSchema>): boolean {
    // Check if the database connection is still valid
    try {
      // Attempt to get transaction - will throw if connection is closed
      const tx = db.transaction('configs', 'readonly');
      tx.abort(); // We don't actually need the transaction
      return false;
    } catch {
      return true;
    }
  }
  
  async closeDB(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }
  
  async deleteDatabase(): Promise<void> {
    await this.closeDB();
    await deleteDB(DB_NAME);
    console.log('Database deleted');
  }
}

/**
 * Get database instance
 * Convenience function for getting the database connection
 */
export async function getDB(): Promise<IDBPDatabase<ConfigDBSchema>> {
  return DBConnectionManager.getInstance().getDB();
}

/**
 * Close database connection
 * Should be called when the app is closing or during cleanup
 */
export async function closeDB(): Promise<void> {
  return DBConnectionManager.getInstance().closeDB();
}

/**
 * Delete the entire database
 * Use with caution - this will delete all data
 */
export async function deleteDatabase(): Promise<void> {
  return DBConnectionManager.getInstance().deleteDatabase();
}

/**
 * Database utilities
 */
export const dbUtils = {
  /**
   * Check if database exists
   */
  async exists(): Promise<boolean> {
    const databases = await indexedDB.databases();
    return databases.some(db => db.name === DB_NAME);
  },
  
  /**
   * Get database info
   */
  async getInfo(): Promise<{ version: number; stores: string[] } | null> {
    try {
      const db = await getDB();
      return {
        version: db.version,
        stores: Array.from(db.objectStoreNames)
      };
    } catch {
      return null;
    }
  },
  
  /**
   * Clear all data from a store
   */
  async clearStore(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.objectStore(STORE_NAME).clear();
    await tx.done;
  },
  
  /**
   * Get store count
   */
  async getCount(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAME);
  }
};