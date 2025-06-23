/**
 * MongoDB REST API Adapter (Mock Implementation)
 * 
 * This is a mock implementation that simulates REST API calls to a MongoDB backend.
 * In production, this would make actual HTTP requests to your backend API.
 * The mock stores data in memory and localStorage for persistence across sessions.
 */

import {
  IStorageAdapter,
  ComponentConfig,
  ProfileConfig,
  Version,
  SearchCriteria,
  MongoDBConfig,
  StorageEvent,
  StorageEventListener
} from '@/types';

/**
 * Mock API response type
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

/**
 * Default MongoDB configuration
 */
const DEFAULT_CONFIG: MongoDBConfig = {
  connectionString: 'mock://localhost:27017',
  database: 'agv1',
  collections: {
    componentConfigs: 'component_configs',
    profiles: 'profiles',
    users: 'users'
  }
};

export class MongoDBAdapter implements IStorageAdapter {
  private config: MongoDBConfig;
  private baseUrl: string;
  private authToken?: string;
  private eventListeners: StorageEventListener[] = [];
  private mockDelay = 50; // Simulate network delay

  constructor(config?: Partial<MongoDBConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseUrl = '/api/v1'; // In production, this would be your actual API URL
    
    // Initialize mock storage
    this.initializeMockStorage();
  }

  /**
   * Initialize the MongoDB connection (mock)
   */
  async initialize(): Promise<void> {
    // Simulate connection delay
    await this.simulateDelay();
    
    // In production, this would:
    // 1. Test the connection to MongoDB
    // 2. Ensure collections exist
    // 3. Set up indexes
    
    console.log('MongoDB adapter initialized (mock mode)');
    
    // Load existing data from localStorage
    this.loadMockData();
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Save a component configuration
   */
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    const endpoint = `${this.baseUrl}/configs`;
    
    try {
      const existing = await this.getComponentConfig(config.instanceId);
      
      if (existing) {
        // Update existing
        await this.mockApiCall<void>('PUT', `${endpoint}/${config.instanceId}`, {
          ...config,
          updatedAt: new Date().toISOString()
        });
        
        this.emitEvent({
          type: 'config-updated',
          timestamp: new Date().toISOString(),
          data: { instanceId: config.instanceId }
        });
      } else {
        // Create new
        const newConfig = {
          ...config,
          createdAt: config.createdAt || new Date().toISOString(),
          updatedAt: config.updatedAt || new Date().toISOString()
        };
        
        await this.mockApiCall<void>('POST', endpoint, newConfig);
        
        this.emitEvent({
          type: 'config-saved',
          timestamp: new Date().toISOString(),
          data: { instanceId: config.instanceId }
        });
      }
    } catch (error) {
      console.error('Failed to save component config:', error);
      throw error;
    }
  }

  /**
   * Get a component configuration by ID
   */
  async getComponentConfig(instanceId: string): Promise<ComponentConfig | null> {
    const endpoint = `${this.baseUrl}/configs/${instanceId}`;
    
    try {
      const response = await this.mockApiCall<ComponentConfig>('GET', endpoint);
      
      if (response.data && !response.data.isDeleted) {
        // Update access metadata
        response.data.metadata.lastAccessed = new Date().toISOString();
        response.data.metadata.accessCount = (response.data.metadata.accessCount || 0) + 1;
        
        // Update in background
        this.updateAccessMetadata(instanceId, response.data.metadata).catch(console.error);
        
        return response.data;
      }
      
      return null;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all component configurations for a user
   */
  async getUserComponentConfigs(userId: string, appId: string): Promise<ComponentConfig[]> {
    const endpoint = `${this.baseUrl}/configs`;
    const params = new URLSearchParams({
      userId,
      appId,
      deleted: 'false'
    });
    
    const response = await this.mockApiCall<ComponentConfig[]>('GET', `${endpoint}?${params}`);
    return response.data || [];
  }

  /**
   * Update a component configuration
   */
  async updateComponentConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<void> {
    const endpoint = `${this.baseUrl}/configs/${instanceId}`;
    
    await this.mockApiCall<void>('PATCH', endpoint, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    this.emitEvent({
      type: 'config-updated',
      timestamp: new Date().toISOString(),
      data: { instanceId }
    });
  }

  /**
   * Delete a component configuration (soft delete)
   */
  async deleteComponentConfig(instanceId: string): Promise<void> {
    const endpoint = `${this.baseUrl}/configs/${instanceId}`;
    
    await this.mockApiCall<void>('DELETE', endpoint);
    
    this.emitEvent({
      type: 'config-deleted',
      timestamp: new Date().toISOString(),
      data: { instanceId }
    });
  }

  /**
   * Save a profile
   */
  async saveProfile(profile: ProfileConfig): Promise<void> {
    const endpoint = `${this.baseUrl}/profiles`;
    
    try {
      const existing = await this.getProfile(profile.id);
      
      if (existing) {
        // Update existing
        await this.mockApiCall<void>('PUT', `${endpoint}/${profile.id}`, {
          ...profile,
          updatedAt: new Date().toISOString()
        });
        
        this.emitEvent({
          type: 'profile-updated',
          timestamp: new Date().toISOString(),
          data: { profileId: profile.id }
        });
      } else {
        // Create new
        const newProfile = {
          ...profile,
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: profile.updatedAt || new Date().toISOString(),
          lastAccessedAt: profile.lastAccessedAt || new Date().toISOString()
        };
        
        await this.mockApiCall<void>('POST', endpoint, newProfile);
        
        this.emitEvent({
          type: 'profile-saved',
          timestamp: new Date().toISOString(),
          data: { profileId: profile.id }
        });
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }

  /**
   * Get a profile by ID
   */
  async getProfile(profileId: string): Promise<ProfileConfig | null> {
    const endpoint = `${this.baseUrl}/profiles/${profileId}`;
    
    try {
      const response = await this.mockApiCall<ProfileConfig>('GET', endpoint);
      
      if (response.data) {
        // Update last accessed
        response.data.lastAccessedAt = new Date().toISOString();
        
        // Update in background
        this.updateProfile(profileId, { 
          lastAccessedAt: response.data.lastAccessedAt 
        }).catch(console.error);
        
        return response.data;
      }
      
      return null;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all profiles for a user
   */
  async getUserProfiles(userId: string, appId: string): Promise<ProfileConfig[]> {
    const endpoint = `${this.baseUrl}/profiles`;
    const params = new URLSearchParams({ userId, appId });
    
    const response = await this.mockApiCall<ProfileConfig[]>('GET', `${endpoint}?${params}`);
    return response.data || [];
  }

  /**
   * Update a profile
   */
  async updateProfile(profileId: string, updates: Partial<ProfileConfig>): Promise<void> {
    const endpoint = `${this.baseUrl}/profiles/${profileId}`;
    
    await this.mockApiCall<void>('PATCH', endpoint, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    this.emitEvent({
      type: 'profile-updated',
      timestamp: new Date().toISOString(),
      data: { profileId }
    });
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const endpoint = `${this.baseUrl}/profiles/${profileId}`;
    
    await this.mockApiCall<void>('DELETE', endpoint);
    
    this.emitEvent({
      type: 'profile-deleted',
      timestamp: new Date().toISOString(),
      data: { profileId }
    });
  }

  /**
   * Create a new version for a component
   */
  async createVersion(instanceId: string, version: Version): Promise<void> {
    const endpoint = `${this.baseUrl}/configs/${instanceId}/versions`;
    
    await this.mockApiCall<void>('POST', endpoint, version);
  }

  /**
   * Get all versions for a component
   */
  async getVersions(instanceId: string): Promise<Version[]> {
    const endpoint = `${this.baseUrl}/configs/${instanceId}/versions`;
    
    const response = await this.mockApiCall<Version[]>('GET', endpoint);
    return response.data || [];
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(instanceId: string, versionId: string): Promise<void> {
    const endpoint = `${this.baseUrl}/configs/${instanceId}/versions/${versionId}/restore`;
    
    await this.mockApiCall<void>('POST', endpoint);
  }

  /**
   * Search configurations by criteria
   */
  async searchConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    const endpoint = `${this.baseUrl}/configs/search`;
    
    const response = await this.mockApiCall<ComponentConfig[]>('POST', endpoint, criteria);
    return response.data || [];
  }

  /**
   * Get shared configurations
   */
  async getSharedConfigs(userId: string): Promise<ComponentConfig[]> {
    const endpoint = `${this.baseUrl}/configs/shared`;
    const params = new URLSearchParams({ userId });
    
    const response = await this.mockApiCall<ComponentConfig[]>('GET', `${endpoint}?${params}`);
    return response.data || [];
  }

  /**
   * Get public configurations
   */
  async getPublicConfigs(): Promise<ComponentConfig[]> {
    const endpoint = `${this.baseUrl}/configs/public`;
    
    const response = await this.mockApiCall<ComponentConfig[]>('GET', endpoint);
    return response.data || [];
  }

  /**
   * Mock API call implementation
   */
  private async mockApiCall<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    await this.simulateDelay();
    
    // In production, this would be a real fetch call:
    /*
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
    */
    
    // Mock implementation
    const mockStorage = this.getMockStorage();
    
    // Parse endpoint to determine resource and operation
    const parts = endpoint.split('/');
    const resource = parts[3]; // configs or profiles
    const id = parts[4];
    const subResource = parts[5]; // versions, etc.
    
    switch (method) {
      case 'GET':
        return this.handleMockGet(mockStorage, resource, id, subResource);
      case 'POST':
        return this.handleMockPost(mockStorage, resource, data, subResource);
      case 'PUT':
        return this.handleMockPut(mockStorage, resource, id, data);
      case 'PATCH':
        return this.handleMockPatch(mockStorage, resource, id, data);
      case 'DELETE':
        return this.handleMockDelete(mockStorage, resource, id);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Handle mock GET requests
   */
  private handleMockGet<T>(
    storage: any,
    resource: string,
    id?: string,
    subResource?: string
  ): ApiResponse<T> {
    if (resource === 'configs') {
      if (id) {
        if (subResource === 'versions') {
          const config = storage.configs[id];
          if (config) {
            return {
              success: true,
              data: Object.values(config.settings?.versions || {}) as T
            };
          }
        } else {
          const config = storage.configs[id];
          if (config && !config.isDeleted) {
            return { success: true, data: config as T };
          }
        }
        throw { status: 404, message: 'Not found' };
      } else {
        // Return all configs (with filtering in real implementation)
        const configs = Object.values(storage.configs)
          .filter((c: any) => !c.isDeleted);
        return { success: true, data: configs as T };
      }
    } else if (resource === 'profiles') {
      if (id) {
        const profile = storage.profiles[id];
        if (profile) {
          return { success: true, data: profile as T };
        }
        throw { status: 404, message: 'Not found' };
      } else {
        const profiles = Object.values(storage.profiles);
        return { success: true, data: profiles as T };
      }
    }
    
    throw new Error(`Unknown resource: ${resource}`);
  }

  /**
   * Handle mock POST requests
   */
  private handleMockPost<T>(
    storage: any,
    resource: string,
    data: any,
    subResource?: string
  ): ApiResponse<T> {
    if (resource === 'configs') {
      if (subResource === 'search') {
        // Handle search
        const configs = this.searchMockConfigs(storage.configs, data as SearchCriteria);
        return { success: true, data: configs as T };
      } else {
        // Create new config
        storage.configs[data.instanceId] = data;
        this.saveMockStorage(storage);
        return { success: true };
      }
    } else if (resource === 'profiles') {
      // Create new profile
      storage.profiles[data.id] = data;
      this.saveMockStorage(storage);
      return { success: true };
    }
    
    throw new Error(`Unknown resource: ${resource}`);
  }

  /**
   * Handle mock PUT requests
   */
  private handleMockPut<T>(
    storage: any,
    resource: string,
    id: string,
    data: any
  ): ApiResponse<T> {
    if (resource === 'configs') {
      storage.configs[id] = data;
      this.saveMockStorage(storage);
      return { success: true };
    } else if (resource === 'profiles') {
      storage.profiles[id] = data;
      this.saveMockStorage(storage);
      return { success: true };
    }
    
    throw new Error(`Unknown resource: ${resource}`);
  }

  /**
   * Handle mock PATCH requests
   */
  private handleMockPatch<T>(
    storage: any,
    resource: string,
    id: string,
    data: any
  ): ApiResponse<T> {
    if (resource === 'configs') {
      if (storage.configs[id]) {
        storage.configs[id] = { ...storage.configs[id], ...data };
        this.saveMockStorage(storage);
        return { success: true };
      }
    } else if (resource === 'profiles') {
      if (storage.profiles[id]) {
        storage.profiles[id] = { ...storage.profiles[id], ...data };
        this.saveMockStorage(storage);
        return { success: true };
      }
    }
    
    throw { status: 404, message: 'Not found' };
  }

  /**
   * Handle mock DELETE requests
   */
  private handleMockDelete<T>(
    storage: any,
    resource: string,
    id: string
  ): ApiResponse<T> {
    if (resource === 'configs') {
      if (storage.configs[id]) {
        // Soft delete
        storage.configs[id].isDeleted = true;
        storage.configs[id].deletedAt = new Date().toISOString();
        this.saveMockStorage(storage);
        return { success: true };
      }
    } else if (resource === 'profiles') {
      if (storage.profiles[id]) {
        delete storage.profiles[id];
        this.saveMockStorage(storage);
        return { success: true };
      }
    }
    
    throw { status: 404, message: 'Not found' };
  }

  /**
   * Search mock configurations
   */
  private searchMockConfigs(configs: any, criteria: SearchCriteria): ComponentConfig[] {
    let results = Object.values(configs) as ComponentConfig[];
    
    // Apply filters (simplified version)
    if (criteria.userId) {
      results = results.filter(c => c.userId === criteria.userId);
    }
    
    if (criteria.componentType) {
      results = results.filter(c => c.componentType === criteria.componentType);
    }
    
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(c => 
        c.displayName?.toLowerCase().includes(query) ||
        c.metadata.notes?.toLowerCase().includes(query)
      );
    }
    
    return results;
  }

  /**
   * Initialize mock storage
   */
  private initializeMockStorage(): void {
    if (!localStorage.getItem('agv1-mock-storage')) {
      localStorage.setItem('agv1-mock-storage', JSON.stringify({
        configs: {},
        profiles: {}
      }));
    }
  }

  /**
   * Load mock data from localStorage
   */
  private loadMockData(): void {
    const stored = localStorage.getItem('agv1-mock-storage');
    if (stored) {
      try {
        JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load mock data:', error);
        this.initializeMockStorage();
      }
    }
  }

  /**
   * Get mock storage
   */
  private getMockStorage(): any {
    const stored = localStorage.getItem('agv1-mock-storage');
    return stored ? JSON.parse(stored) : { configs: {}, profiles: {} };
  }

  /**
   * Save mock storage
   */
  private saveMockStorage(storage: any): void {
    localStorage.setItem('agv1-mock-storage', JSON.stringify(storage));
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, this.mockDelay));
  }

  /**
   * Update access metadata in background
   */
  private async updateAccessMetadata(instanceId: string, metadata: any): Promise<void> {
    // In mock mode, we update directly
    const storage = this.getMockStorage();
    if (storage.configs[instanceId]) {
      storage.configs[instanceId].metadata = metadata;
      this.saveMockStorage(storage);
    }
  }

  /**
   * Emit storage event
   */
  private emitEvent(event: StorageEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in storage event listener:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: StorageEventListener): () => void {
    this.eventListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Search component configurations by criteria (alias for searchConfigs)
   */
  async searchComponentConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    return this.searchConfigs(criteria);
  }
}