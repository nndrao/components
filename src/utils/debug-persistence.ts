/**
 * Debug persistence issues
 */

import { IndexedDBAdapter } from '@/services/storage/IndexedDBAdapter';
import type { ComponentConfig } from '@/types';

export async function debugPersistence() {
  console.log('=== Debugging Persistence ===');
  
  const adapter = new IndexedDBAdapter();
  
  try {
    console.log('1. Initializing IndexedDB adapter...');
    await adapter.initialize();
    console.log('✓ IndexedDB adapter initialized');
    
    console.log('\n2. Searching for workspace configs...');
    const configs = await adapter.searchComponentConfigs({
      componentType: 'workspace',
      appId: 'agv1'
    });
    console.log('Found configs:', configs);
    
    if (configs.length > 0) {
      console.log('\n3. Workspace config found:');
      const config = configs[0];
      console.log('- Instance ID:', config.instanceId);
      console.log('- Display Name:', config.displayName);
      console.log('- Created:', config.createdAt);
      console.log('- Updated:', config.updatedAt);
      console.log('- Configuration:', JSON.stringify(config.configuration, null, 2));
    } else {
      console.log('\n3. No workspace config found. Creating test config...');
      
      const testConfig: ComponentConfig = {
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
            ['test-ds', {
              id: 'test-ds',
              name: 'Test DataSource',
              type: 'websocket',
              config: {
                url: 'ws://localhost:8080/ws',
                topic: '/topic/test'
              }
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
          tags: [],
          notes: '',
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
            accessLevel: 'view',
            requiresAuth: false
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Saving test config...');
      await adapter.saveComponentConfig(testConfig);
      console.log('✓ Test config saved');
      
      console.log('\n4. Verifying save...');
      const savedConfigs = await adapter.searchComponentConfigs({
        componentType: 'workspace',
        appId: 'agv1'
      });
      console.log('Configs after save:', savedConfigs.length);
      if (savedConfigs.length > 0) {
        console.log('✓ Save verified successfully');
      } else {
        console.error('✗ Save verification failed');
      }
    }
    
    console.log('\n5. Testing direct get...');
    const directGet = await adapter.getComponentConfig('workspace');
    console.log('Direct get result:', directGet ? 'Found' : 'Not found');
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await adapter.close();
  }
}

// Export to window for easy access
if (typeof window !== 'undefined') {
  (window as any).debugPersistence = debugPersistence;
}