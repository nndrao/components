/**
 * Configuration Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDatabase } from './config.db';
import { createConfigService } from './config.service';
import { Config, ConfigService } from './config.types';
import { generateConfigId } from '../../utils/config.utils';

// Restore console for these tests
beforeEach(() => {
  global.console = {
    ...console,
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };
});

describe('ConfigService', () => {
  let service: ConfigService;
  
  beforeEach(async () => {
    // Clear database before each test
    await deleteDatabase();
    service = await createConfigService();
  });
  
  afterEach(async () => {
    // Clean up after tests
    await deleteDatabase();
  });
  
  describe('CRUD Operations', () => {
    it('should save and retrieve a configuration', async () => {
      const config: Config = {
        configId: generateConfigId('test'),
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: 'Test Table',
        settings: { columns: ['id', 'name'] },
        createdBy: 'test-user',
        creationTime: Date.now()
      };
      
      await service.save(config);
      
      const retrieved = await service.get(config.configId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.configId).toBe(config.configId);
      expect(retrieved?.name).toBe(config.name);
      expect(retrieved?.settings).toEqual(config.settings);
    });
    
    it('should update a configuration', async () => {
      const config: Config = {
        configId: generateConfigId('test'),
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: 'Original Name',
        settings: {},
        createdBy: 'test-user',
        creationTime: Date.now()
      };
      
      await service.save(config);
      
      await service.update(config.configId, {
        name: 'Updated Name',
        settings: { updated: true }
      });
      
      const updated = await service.get(config.configId);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.settings).toEqual({ updated: true });
      expect(updated?.lastUpdated).toBeDefined();
    });
    
    it('should delete a configuration', async () => {
      const config: Config = {
        configId: generateConfigId('test'),
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: 'To Delete',
        settings: {},
        createdBy: 'test-user',
        creationTime: Date.now()
      };
      
      await service.save(config);
      
      const exists = await service.exists(config.configId);
      expect(exists).toBe(true);
      
      await service.delete(config.configId);
      
      const deleted = await service.get(config.configId);
      expect(deleted).toBeNull();
    });
  });
  
  describe('Query Operations', () => {
    beforeEach(async () => {
      // Add test data
      const configs: Config[] = [
        {
          configId: '1',
          appId: 'app1',
          userId: 'user1',
          componentType: 'DataTable',
          name: 'Table 1',
          settings: {},
          createdBy: 'user1',
          creationTime: Date.now() - 3000
        },
        {
          configId: '2',
          appId: 'app1',
          userId: 'user1',
          componentType: 'Chart',
          name: 'Chart 1',
          settings: {},
          createdBy: 'user1',
          creationTime: Date.now() - 2000
        },
        {
          configId: '3',
          appId: 'app1',
          userId: 'user2',
          componentType: 'DataTable',
          name: 'Table 2',
          settings: {},
          createdBy: 'user2',
          creationTime: Date.now() - 1000
        }
      ];
      
      await service.saveMany(configs);
    });
    
    it('should list all configurations', async () => {
      const all = await service.list();
      expect(all).toHaveLength(3);
    });
    
    it('should filter by userId', async () => {
      const user1Configs = await service.list({ userId: 'user1' });
      expect(user1Configs).toHaveLength(2);
      expect(user1Configs.every(c => c.userId === 'user1')).toBe(true);
    });
    
    it('should filter by componentType', async () => {
      const tables = await service.list({ componentType: 'DataTable' });
      expect(tables).toHaveLength(2);
      expect(tables.every(c => c.componentType === 'DataTable')).toBe(true);
    });
    
    it('should filter by multiple componentTypes', async () => {
      const configs = await service.list({ 
        componentType: ['DataTable', 'Chart'] 
      });
      expect(configs).toHaveLength(3);
    });
    
    it('should count configurations', async () => {
      const total = await service.count();
      expect(total).toBe(3);
      
      const tableCount = await service.count({ componentType: 'DataTable' });
      expect(tableCount).toBe(2);
    });
  });
  
  describe('Bulk Operations', () => {
    it('should save multiple configurations', async () => {
      const configs: Config[] = Array.from({ length: 5 }, (_, i) => ({
        configId: `bulk-${i}`,
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: `Bulk Config ${i}`,
        settings: {},
        createdBy: 'test-user',
        creationTime: Date.now()
      }));
      
      await service.saveMany(configs);
      
      const saved = await service.list();
      expect(saved).toHaveLength(5);
    });
    
    it('should delete multiple configurations', async () => {
      const configs: Config[] = Array.from({ length: 3 }, (_, i) => ({
        configId: `delete-${i}`,
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: `Delete Config ${i}`,
        settings: {},
        createdBy: 'test-user',
        creationTime: Date.now()
      }));
      
      await service.saveMany(configs);
      
      const ids = configs.map(c => c.configId);
      await service.deleteMany(ids);
      
      const remaining = await service.list();
      expect(remaining).toHaveLength(0);
    });
  });
  
  describe('Relationship Operations', () => {
    it('should get children by parentId', async () => {
      const parent: Config = {
        configId: 'parent-1',
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'Workspace',
        name: 'Parent Workspace',
        settings: {},
        createdBy: 'test-user',
        creationTime: Date.now()
      };
      
      const children: Config[] = [
        {
          configId: 'child-1',
          appId: 'test-app',
          userId: 'test-user',
          componentType: 'DataTable',
          parentId: 'parent-1',
          name: 'Child Table 1',
          settings: {},
          createdBy: 'test-user',
          creationTime: Date.now()
        },
        {
          configId: 'child-2',
          appId: 'test-app',
          userId: 'test-user',
          componentType: 'Chart',
          parentId: 'parent-1',
          name: 'Child Chart',
          settings: {},
          createdBy: 'test-user',
          creationTime: Date.now()
        }
      ];
      
      await service.save(parent);
      await service.saveMany(children);
      
      const foundChildren = await service.getChildren('parent-1');
      expect(foundChildren).toHaveLength(2);
      expect(foundChildren.every(c => c.parentId === 'parent-1')).toBe(true);
    });
    
    it('should get profiles by ownerId', async () => {
      const component: Config = {
        configId: 'comp-1',
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: 'Main Table',
        settings: {},
        createdBy: 'test-user',
        creationTime: Date.now()
      };
      
      const profiles: Config[] = [
        {
          configId: 'prof-1',
          appId: 'test-app',
          userId: 'test-user',
          componentType: 'DataTable.Profile',
          ownerId: 'comp-1',
          name: 'Profile 1',
          settings: { columns: ['a', 'b'] },
          createdBy: 'test-user',
          creationTime: Date.now()
        },
        {
          configId: 'prof-2',
          appId: 'test-app',
          userId: 'test-user',
          componentType: 'DataTable.Profile',
          ownerId: 'comp-1',
          name: 'Profile 2',
          settings: { columns: ['c', 'd'] },
          createdBy: 'test-user',
          creationTime: Date.now()
        }
      ];
      
      await service.save(component);
      await service.saveMany(profiles);
      
      const foundProfiles = await service.getProfiles('comp-1');
      expect(foundProfiles).toHaveLength(2);
      expect(foundProfiles.every(p => p.ownerId === 'comp-1')).toBe(true);
    });
  });
  
  describe('Template Operations', () => {
    it('should get templates by component type', async () => {
      const templates: Config[] = [
        {
          configId: 'tmpl-1',
          appId: 'test-app',
          userId: 'test-user',
          componentType: 'DataTable',
          name: 'Table Template',
          isTemplate: true,
          settings: { defaultColumns: true },
          createdBy: 'test-user',
          creationTime: Date.now()
        },
        {
          configId: 'tmpl-2',
          appId: 'test-app',
          userId: 'test-user',
          componentType: 'Chart',
          name: 'Chart Template',
          isTemplate: true,
          settings: { defaultChart: true },
          createdBy: 'test-user',
          creationTime: Date.now()
        }
      ];
      
      await service.saveMany(templates);
      
      const tableTemplates = await service.getTemplates('DataTable');
      expect(tableTemplates).toHaveLength(1);
      expect(tableTemplates[0].componentType).toBe('DataTable');
      expect(tableTemplates[0].isTemplate).toBe(true);
    });
    
    it('should create from template', async () => {
      const template: Config = {
        configId: 'tmpl-1',
        appId: 'test-app',
        userId: 'test-user',
        componentType: 'DataTable',
        name: 'Table Template',
        isTemplate: true,
        settings: { columns: ['id', 'name', 'status'] },
        createdBy: 'test-user',
        creationTime: Date.now()
      };
      
      await service.save(template);
      
      const newConfig = await service.createFromTemplate('tmpl-1', {
        name: 'My New Table',
        userId: 'new-user',
        createdBy: 'new-user'
      });
      
      expect(newConfig.name).toBe('My New Table');
      expect(newConfig.userId).toBe('new-user');
      expect(newConfig.settings).toEqual(template.settings);
      expect(newConfig.isTemplate).toBe(false);
      expect(newConfig.configId).not.toBe(template.configId);
    });
  });
});