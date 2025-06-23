/**
 * Service Interfaces for AGV1 React Components
 * 
 * This file defines the interfaces for all services in the AGV1 system,
 * including the service registry, profile service, configuration service,
 * and data source service.
 */

import { 
  ComponentConfig, 
  ProfileConfig, 
  IStorageAdapter,
  SearchCriteria,
  Version,
  User,
  SharedUser
} from './storage.interfaces';
import { 
  IConfigurableComponent, 
  ComponentType, 
  IDataSource,
  ComponentRegistryEntry,
  ComponentFactory
} from './component.interfaces';
import type { ColumnFormatService } from '@/services/agv1/ColumnFormatService';

/**
 * Service registry interface for dependency injection
 */
export interface IServiceRegistry {
  /** Register a service */
  register<T>(name: string, service: T): void;
  
  /** Get a registered service */
  get<T>(name: string): T;
  
  /** Check if a service is registered */
  has(name: string): boolean;
  
  /** Unregister a service */
  unregister(name: string): void;
  
  /** Get all registered service names */
  getServiceNames(): string[];
}

/**
 * User profile type
 */
export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  description?: string;
  email?: string;
  avatarUrl?: string;
  isDefault: boolean;
  settings: Record<string, any>;
  metadata: {
    created: string;
    lastModified: string;
    lastActivity: string;
  };
  lastActivity?: string; // For backward compatibility
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Profile validation result
 */
export interface ProfileValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Profile event types
 */
export type ProfileEventType = 'created' | 'updated' | 'deleted' | 'switched';

/**
 * Profile event
 */
export interface ProfileEvent {
  type: ProfileEventType;
  profileId: string;
  profile?: UserProfile;
  timestamp: string;
}

/**
 * Profile service for managing user profiles
 */
export interface IProfileService {
  /** Initialize the profile service */
  initialize(userId: string, appId: string): Promise<void>;
  
  /**
   * Profile Management
   */
  
  /** Create a new profile */
  createProfile(profile: Omit<ProfileConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileConfig>;
  
  /** Create a new profile from UserProfile */
  createUserProfile?(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile | null>;
  
  /** Get a profile by ID */
  getProfile(profileId: string): Promise<ProfileConfig | null>;
  
  /** Get a profile as UserProfile */
  getUserProfile?(profileId: string): Promise<UserProfile | null>;
  
  /** Get all profiles for the current user */
  getUserProfiles(): Promise<ProfileConfig[]>;
  
  /** Update a profile */
  updateProfile(profileId: string, updates: Partial<ProfileConfig>): Promise<void>;
  
  /** Update a profile from UserProfile */
  updateUserProfile?(profileId: string, updates: Partial<UserProfile>): Promise<boolean>;
  
  /** Delete a profile */
  deleteProfile(profileId: string): Promise<void>;
  
  /** Set a profile as default */
  setDefaultProfile(profileId: string): Promise<void>;
  
  /** Get the default profile */
  getDefaultProfile(): Promise<ProfileConfig | null>;
  
  /**
   * Profile Operations
   */
  
  /** Load a profile (switch to it) */
  loadProfile(profileId: string): Promise<void>;
  
  /** Save the current workspace as a profile */
  saveCurrentAsProfile(name: string, description?: string): Promise<ProfileConfig>;
  
  /** Export a profile */
  exportProfile(profileId: string): Promise<string>;
  
  /** Import a profile */
  importProfile(profileData: string): Promise<ProfileConfig>;
  
  /** Clone a profile */
  cloneProfile(profileId: string, newName: string): Promise<ProfileConfig>;
  
  /**
   * Events
   */
  
  /** Subscribe to profile changes */
  onProfileChange(callback: (profile: ProfileConfig) => void): () => void;
  
  /** Get current active profile */
  getCurrentProfile(): ProfileConfig | null;
  
  /**
   * Additional profile methods
   */
  
  /** Get all profiles (returns UserProfile array) */
  getAllProfiles(): Promise<UserProfile[]>;
  
  /** Switch to a different profile */
  switchProfile(profileId: string): Promise<boolean>;
  
  /** Get current profile as UserProfile */
  getCurrentUserProfile(): Promise<UserProfile | null>;
  
  /** Subscribe to profile events */
  subscribe(callback: (event: ProfileEvent) => void): () => void;
}

/**
 * Configuration service for managing component configurations
 */
export interface IConfigurationService {
  /** Initialize the configuration service */
  initialize(storageAdapter: IStorageAdapter): Promise<void>;
  
  /** Set user context for the service */
  setUserContext(userId: string, appId: string): void;
  
  /**
   * Configuration Management
   */
  
  /** Save a component configuration */
  saveConfiguration(componentId: string, config: any): Promise<void>;
  
  /** Load a component configuration */
  loadConfiguration(componentId: string): Promise<any>;
  
  /** Delete a component configuration */
  deleteConfiguration(componentId: string): Promise<void>;
  
  /** Get all configurations */
  getAllConfigurations(): Promise<ComponentConfig[]>;
  
  /**
   * Version Management
   */
  
  /** Create a new version */
  createVersion(componentId: string, versionName: string, description?: string): Promise<Version>;
  
  /** Get all versions for a component */
  getVersions(componentId: string): Promise<Version[]>;
  
  /** Restore a version */
  restoreVersion(componentId: string, versionId: string): Promise<void>;
  
  /** Delete a version */
  deleteVersion(componentId: string, versionId: string): Promise<void>;
  
  /**
   * Sharing and Permissions
   */
  
  /** Share a configuration with users */
  shareConfiguration(componentId: string, users: SharedUser[]): Promise<void>;
  
  /** Revoke sharing for a user */
  revokeSharing(componentId: string, userId: string): Promise<void>;
  
  /** Make a configuration public */
  makePublic(componentId: string, accessLevel: 'view' | 'interact' | 'full'): Promise<void>;
  
  /** Make a configuration private */
  makePrivate(componentId: string): Promise<void>;
  
  /**
   * Search and Query
   */
  
  /** Search configurations */
  searchConfigurations(criteria: SearchCriteria): Promise<ComponentConfig[]>;
  
  /** Get shared configurations */
  getSharedConfigurations(): Promise<ComponentConfig[]>;
  
  /** Get public configurations */
  getPublicConfigurations(): Promise<ComponentConfig[]>;
  
  /**
   * Bulk Operations
   */
  
  /** Save all component configurations */
  saveAllConfigurations(componentRefs: React.RefObject<IConfigurableComponent>[]): Promise<void>;
  
  /** Load configurations for multiple components */
  loadConfigurations(componentIds: string[]): Promise<Record<string, any>>;
  
  /** Export configurations */
  exportConfigurations(componentIds: string[]): Promise<string>;
  
  /** Import configurations */
  importConfigurations(data: string): Promise<ComponentConfig[]>;
  
  /** List all configurations */
  listConfigurations(): Promise<ComponentConfig[]>;
}

/**
 * Data source service for managing data connections
 */
export interface IDataSourceService {
  /**
   * Data Source Management
   */
  
  /** Register a data source */
  registerDataSource(dataSource: IDataSource): void;
  
  /** Get a data source by ID */
  getDataSource(id: string): IDataSource | null;
  
  /** Get all data sources */
  getAllDataSources(): IDataSource[];
  
  /** Remove a data source */
  removeDataSource(id: string): void;
  
  /**
   * Connection Management
   */
  
  /** Connect to a data source */
  connect(dataSourceId: string): Promise<void>;
  
  /** Disconnect from a data source */
  disconnect(dataSourceId: string): Promise<void>;
  
  /** Check connection status */
  getConnectionStatus(dataSourceId: string): 'connected' | 'disconnected' | 'error' | 'connecting';
  
  /** Reconnect to a data source */
  reconnect(dataSourceId: string): Promise<void>;
  
  /**
   * Data Operations
   */
  
  /** Subscribe to data updates */
  subscribe(dataSourceId: string, callback: (data: any) => void): () => void;
  
  /** Get data snapshot */
  getData(dataSourceId: string): Promise<any[]>;
  
  /** Send data request */
  sendRequest(dataSourceId: string, request: any): Promise<any>;
  
  /**
   * Events
   */
  
  /** Subscribe to connection status changes */
  onConnectionStatusChange(callback: (dataSourceId: string, status: string) => void): () => void;
  
  /** Subscribe to data source errors */
  onError(callback: (dataSourceId: string, error: Error) => void): () => void;
}

/**
 * App container service for managing component lifecycle
 */
export interface IAppContainerService {
  /**
   * Component Registry
   */
  
  /** Register a component factory */
  registerComponentFactory?(type: ComponentType, factory: ComponentFactory): void;
  
  /** Register a component */
  registerComponent(entry: ComponentRegistryEntry): void;
  
  /** Get a component by instance ID */
  getComponent(instanceId: string): ComponentRegistryEntry | null;
  
  /** Get all components */
  getAllComponents(): ComponentRegistryEntry[];
  
  /** Get components by type */
  getComponentsByType(type: ComponentType): ComponentRegistryEntry[];
  
  /** Remove a component */
  removeComponent(instanceId: string): void;
  
  /**
   * Component Creation
   */
  
  /** Create a new component instance */
  createComponent(
    type: ComponentType, 
    config?: any,
    metadata?: any
  ): ComponentRegistryEntry;
  
  /** Destroy a component instance */
  destroyComponent(instanceId: string): void;
  
  /**
   * Component Operations
   */
  
  /** Save all component configurations */
  saveAllConfigurations(): Promise<void>;
  
  /** Load all component configurations */
  loadAllConfigurations(): Promise<void>;
  
  /** Reset all components to default */
  resetAllComponents(): void;
  
  /** Get component ref by instance ID */
  getComponentRef(instanceId: string): React.RefObject<IConfigurableComponent> | null;
  
  /**
   * Layout Management
   */
  
  /** Save current layout */
  saveLayout(): Promise<any>;
  
  /** Load a layout */
  loadLayout(layout: any): Promise<void>;
  
  /** Reset layout to default */
  resetLayout(): void;
  
  /**
   * Events
   */
  
  /** Subscribe to component registry changes */
  onRegistryChange(callback: (registry: ComponentRegistryEntry[]) => void): () => void;
  
  /** Subscribe to component lifecycle events */
  onComponentLifecycle(
    callback: (event: ComponentLifecycleEvent) => void
  ): () => void;
}

/**
 * Component lifecycle event
 */
export interface ComponentLifecycleEvent {
  type: 'created' | 'destroyed' | 'configured' | 'error';
  instanceId: string;
  componentType: ComponentType;
  timestamp: string;
  data?: any;
  error?: Error;
}

/**
 * WebSocket service for real-time data
 */
export interface IWebSocketService {
  /** Connect to WebSocket server */
  connect(url: string, options?: any): Promise<void>;
  
  /** Disconnect from WebSocket server */
  disconnect(): Promise<void>;
  
  /** Subscribe to a topic */
  subscribe(topic: string, callback: (message: any) => void): () => void;
  
  /** Unsubscribe from a topic */
  unsubscribe(topic: string): void;
  
  /** Send a message */
  send(destination: string, message: any): void;
  
  /** Get connection status */
  getStatus(): 'connected' | 'disconnected' | 'connecting' | 'error';
  
  /** Subscribe to connection status changes */
  onStatusChange(callback: (status: string) => void): () => void;
}

/**
 * Notification service for user notifications
 */
export interface INotificationService {
  /** Show a notification */
  show(notification: Notification): void;
  
  /** Show success notification */
  success(message: string, options?: NotificationOptions): void;
  
  /** Show error notification */
  error(message: string, options?: NotificationOptions): void;
  
  /** Show warning notification */
  warning(message: string, options?: NotificationOptions): void;
  
  /** Show info notification */
  info(message: string, options?: NotificationOptions): void;
  
  /** Clear all notifications */
  clearAll(): void;
  
  /** Clear a specific notification */
  clear(id: string): void;
}

/**
 * Notification type
 */
export interface Notification {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Notification options
 */
export interface NotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * All services available in the AGV1 system
 */
export interface AGV1Services {
  registry: IServiceRegistry;
  profile: IProfileService;
  configuration: IConfigurationService;
  dataSource: IDataSourceService;
  appContainer: IAppContainerService;
  webSocket: IWebSocketService;
  notification: INotificationService;
  storage: IStorageAdapter;
  columnFormatService: ColumnFormatService;
}