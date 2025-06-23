/**
 * Comprehensive persistence test
 */

import { IndexedDBAdapter } from '@/services/storage/IndexedDBAdapter';

export async function testPersistence() {
  console.log('=== Testing Persistence Workflow ===\n');
  
  console.log('1. First, check IndexedDB is working:');
  console.log('   Run: testIndexedDB()');
  console.log('   Expected: Should show IndexedDB is available and working\n');
  
  console.log('2. Debug current persistence state:');
  console.log('   Run: debugPersistence()');
  console.log('   Expected: Should show workspace config if saved, or create test config\n');
  
  console.log('3. Test manual save:');
  console.log('   - Create a datasource in the UI');
  console.log('   - Click the Save button (floppy disk icon)');
  console.log('   - Check console for "Manual save triggered" and save logs\n');
  
  console.log('4. Test refresh persistence:');
  console.log('   - After saving, refresh the page');
  console.log('   - Check console for "Found workspace configs: 1"');
  console.log('   - Your datasources should be restored\n');
  
  console.log('5. If persistence is not working:');
  console.log('   - Open DevTools > Application > IndexedDB');
  console.log('   - Look for "agv1-storage" database');
  console.log('   - Check "componentConfigs" object store');
  console.log('   - Look for entry with instanceId: "workspace"\n');
  
  console.log('6. Common issues:');
  console.log('   - State not updated before save');
  console.log('   - Save called too early (before state update)');
  console.log('   - IndexedDB permissions blocked');
  console.log('   - Browser in private/incognito mode\n');
  
  console.log('Run the numbered functions above to diagnose the issue.');
}

// Helper to clear all data
export async function clearAllData() {
  if (confirm('This will delete all saved data. Are you sure?')) {
    const dbs = await window.indexedDB.databases();
    for (const db of dbs) {
      if (db.name === 'agv1-storage') {
        window.indexedDB.deleteDatabase(db.name);
        console.log('Deleted database:', db.name);
      }
    }
    console.log('All data cleared. Please refresh the page.');
  }
}

// Helper to manually create test data
export async function createTestData() {
  const adapter = new IndexedDBAdapter();
  
  try {
    await adapter.initialize();
    
    const testConfig = {
      instanceId: 'workspace',
      componentType: 'workspace',
      displayName: 'Test Workspace',
      userId: 'default',
      ownerId: 'default',
      appId: 'agv1',
      settings: {
        versions: {},
        activeVersionId: '1.0.0'
      },
      configuration: {
        components: [],
        datasources: [
          ['test-ws-ds', {
            id: 'test-ws-ds',
            name: 'Test WebSocket DataSource',
            type: 'websocket',
            config: {
              url: 'ws://localhost:8080/ws',
              topic: '/topic/prices',
              snapshotEndToken: 'SNAPSHOT_END',
              keyColumn: 'symbol',
              fields: [
                {
                  name: 'symbol',
                  path: 'symbol',
                  type: 'string',
                  selected: true
                },
                {
                  name: 'price',
                  path: 'price',
                  type: 'number',
                  selected: true
                }
              ],
              columnDefs: [
                { field: 'symbol', headerName: 'Symbol' },
                { field: 'price', headerName: 'Price', type: 'numericColumn' }
              ]
            },
            status: 'inactive'
          }]
        ],
        activeDatasources: [],
        profiles: [],
        layoutConfig: null,
        theme: 'light',
        locale: 'en-US'
      },
      metadata: {
        lastAccessed: new Date().toISOString(),
        accessCount: 1,
        tags: ['test'],
        notes: 'Test workspace with sample datasource',
        favorited: false,
        category: 'default'
      },
      permissions: {
        isPublic: false,
        canEdit: [],
        canView: [],
        allowSharing: false,
        editableByOthers: false
      },
      sharing: {
        isShared: false,
        sharedWith: [],
        publicAccess: {
          enabled: false,
          accessLevel: 'view' as 'view',
          requiresAuth: false
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await adapter.saveComponentConfig(testConfig);
    console.log('Test data created successfully!');
    console.log('Refresh the page to see the test datasource.');
    
  } catch (error) {
    console.error('Failed to create test data:', error);
  } finally {
    await adapter.close();
  }
}

// Export all functions to window
if (typeof window !== 'undefined') {
  (window as any).testPersistence = testPersistence;
  (window as any).clearAllData = clearAllData;
  (window as any).createTestData = createTestData;
}