/**
 * Simple test to verify IndexedDB setup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDB, deleteDatabase } from './config.db';

describe('Config Database', () => {
  beforeEach(async () => {
    // Clean up before each test
    await deleteDatabase();
  });
  
  it('should initialize database', async () => {
    const db = await initDB();
    expect(db).toBeDefined();
    expect(db.name).toBe('ConfigDB');
    expect(db.version).toBe(1);
    expect(db.objectStoreNames.contains('configs')).toBe(true);
    db.close();
  });
  
  it('should create indexes', async () => {
    const db = await initDB();
    const tx = db.transaction('configs', 'readonly');
    const store = tx.objectStore('configs');
    
    expect(store.indexNames.contains('by-user')).toBe(true);
    expect(store.indexNames.contains('by-type')).toBe(true);
    expect(store.indexNames.contains('by-parent')).toBe(true);
    expect(store.indexNames.contains('by-owner')).toBe(true);
    expect(store.indexNames.contains('by-user-type')).toBe(true);
    
    db.close();
  });
});