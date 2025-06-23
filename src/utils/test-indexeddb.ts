/**
 * Test IndexedDB functionality
 * Run this in the browser console to check if IndexedDB is working
 */

export async function testIndexedDB() {
  console.log('=== Testing IndexedDB ===');
  
  try {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.error('IndexedDB is not available in this browser');
      return;
    }
    console.log('✓ IndexedDB is available');
    
    // Open a test database
    const dbName = 'agv1-test-db';
    const request = window.indexedDB.open(dbName, 1);
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
    };
    
    request.onsuccess = () => {
      console.log('✓ Successfully opened test database');
      const db = request.result;
      
      // List existing databases
      if ('databases' in window.indexedDB) {
        window.indexedDB.databases().then(databases => {
          console.log('Existing databases:', databases);
          
          // Check for AGV1 database
          const agv1Db = databases.find(db => db.name === 'agv1-storage');
          if (agv1Db) {
            console.log('✓ AGV1 database exists:', agv1Db);
            
            // Try to open and inspect AGV1 database
            const agv1Request = window.indexedDB.open('agv1-storage');
            agv1Request.onsuccess = () => {
              const agv1Database = agv1Request.result;
              console.log('✓ Opened AGV1 database');
              console.log('Object stores:', Array.from(agv1Database.objectStoreNames));
              
              // Try to read from componentConfigs
              if (agv1Database.objectStoreNames.contains('componentConfigs')) {
                const transaction = agv1Database.transaction(['componentConfigs'], 'readonly');
                const store = transaction.objectStore('componentConfigs');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                  console.log('Component configs in database:', getAllRequest.result);
                };
                
                getAllRequest.onerror = () => {
                  console.error('Failed to read component configs:', getAllRequest.error);
                };
              }
              
              agv1Database.close();
            };
          } else {
            console.warn('AGV1 database does not exist yet');
          }
        });
      }
      
      // Clean up test database
      db.close();
      window.indexedDB.deleteDatabase(dbName);
    };
    
    request.onupgradeneeded = () => {
      console.log('Creating test database schema');
    };
    
  } catch (error) {
    console.error('IndexedDB test failed:', error);
  }
}

// Export to window for easy access
if (typeof window !== 'undefined') {
  (window as any).testIndexedDB = testIndexedDB;
}