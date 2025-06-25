/**
 * Component API Types
 * 
 * Defines the standardized interfaces for component configuration
 * and lifecycle management.
 */

import { Config } from '../../services/config';

/**
 * Base interface for all configurable components
 */
export interface ConfigurableComponent<TSettings = any> {
  /**
   * Unique component type identifier
   */
  componentType: string;
  
  /**
   * Current component instance ID
   */
  componentId: string;
  
  /**
   * Component display name
   */
  displayName: string;
  
  /**
   * Component version
   */
  version?: string;
  
  /**
   * Component metadata
   */
  metadata?: ComponentMetadata;
}

/**
 * Component metadata
 */
export interface ComponentMetadata {
  /**
   * Component description
   */
  description?: string;
  
  /**
   * Component category
   */
  category?: string;
  
  /**
   * Component tags
   */
  tags?: string[];
  
  /**
   * Component icon
   */
  icon?: string;
  
  /**
   * Component author
   */
  author?: string;
  
  /**
   * Component documentation URL
   */
  documentationUrl?: string;
  
  /**
   * Whether component supports profiles
   */
  supportsProfiles?: boolean;
  
  /**
   * Whether component supports templates
   */
  supportsTemplates?: boolean;
  
  /**
   * Component capabilities
   */
  capabilities?: ComponentCapabilities;
}

/**
 * Component capabilities
 */
export interface ComponentCapabilities {
  /**
   * Can export data
   */
  canExport?: boolean;
  
  /**
   * Can import data
   */
  canImport?: boolean;
  
  /**
   * Can share configurations
   */
  canShare?: boolean;
  
  /**
   * Can be embedded
   */
  canEmbed?: boolean;
  
  /**
   * Supports real-time updates
   */
  supportsRealtime?: boolean;
  
  /**
   * Supports collaborative editing
   */
  supportsCollaboration?: boolean;
}

/**
 * Component lifecycle hooks
 */
export interface ComponentLifecycle<TSettings = any> {
  /**
   * Called when component is mounted
   */
  onMount?: () => void | Promise<void>;
  
  /**
   * Called when component is unmounted
   */
  onUnmount?: () => void | Promise<void>;
  
  /**
   * Called when settings are loaded
   */
  onSettingsLoad?: (settings: TSettings) => void | Promise<void>;
  
  /**
   * Called before settings are saved
   */
  onBeforeSettingsSave?: (settings: TSettings) => TSettings | Promise<TSettings>;
  
  /**
   * Called after settings are saved
   */
  onAfterSettingsSave?: (settings: TSettings) => void | Promise<void>;
  
  /**
   * Called when profile is changed
   */
  onProfileChange?: (profileId: string | undefined) => void | Promise<void>;
  
  /**
   * Called when component receives external data
   */
  onDataReceived?: (data: any) => void | Promise<void>;
  
  /**
   * Called when component state changes
   */
  onStateChange?: (state: ComponentState) => void | Promise<void>;
}

/**
 * Component state
 */
export interface ComponentState {
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error state
   */
  error?: Error | null;
  
  /**
   * Dirty state (has unsaved changes)
   */
  isDirty: boolean;
  
  /**
   * Connected state (for real-time components)
   */
  isConnected?: boolean;
  
  /**
   * Active users (for collaborative components)
   */
  activeUsers?: string[];
  
  /**
   * Custom state data
   */
  customState?: Record<string, any>;
}

/**
 * Component API interface
 */
export interface ComponentAPI<TSettings = any> {
  /**
   * Component information
   */
  component: ConfigurableComponent<TSettings>;
  
  /**
   * Current settings
   */
  settings: TSettings;
  
  /**
   * Current profile ID
   */
  profileId?: string;
  
  /**
   * Available profiles
   */
  profiles: Config[];
  
  /**
   * Component state
   */
  state: ComponentState;
  
  /**
   * Load settings from a profile
   */
  loadProfile: (profileId: string) => Promise<void>;
  
  /**
   * Save current settings to active profile
   */
  saveSettings: (settings: Partial<TSettings>) => Promise<void>;
  
  /**
   * Create a new profile from current settings
   */
  createProfile: (name: string, description?: string) => Promise<Config>;
  
  /**
   * Delete a profile
   */
  deleteProfile: (profileId: string) => Promise<void>;
  
  /**
   * Export component data
   */
  exportData?: () => Promise<any>;
  
  /**
   * Import component data
   */
  importData?: (data: any) => Promise<void>;
  
  /**
   * Reset to default settings
   */
  resetSettings: () => Promise<void>;
  
  /**
   * Validate settings
   */
  validateSettings: (settings: TSettings) => ValidationResult;
  
  /**
   * Get setting value by path
   */
  getSetting: <T = any>(path: string) => T | undefined;
  
  /**
   * Set setting value by path
   */
  setSetting: (path: string, value: any) => Promise<void>;
  
  /**
   * Subscribe to setting changes
   */
  onSettingChange: (path: string, callback: (value: any) => void) => () => void;
  
  /**
   * Component lifecycle hooks
   */
  lifecycle?: ComponentLifecycle<TSettings>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Is valid
   */
  valid: boolean;
  
  /**
   * Validation errors
   */
  errors?: ValidationError[];
  
  /**
   * Validation warnings
   */
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /**
   * Error path (e.g., "columns[0].width")
   */
  path: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Error code
   */
  code?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /**
   * Warning path
   */
  path: string;
  
  /**
   * Warning message
   */
  message: string;
  
  /**
   * Warning code
   */
  code?: string;
}

/**
 * Settings schema definition
 */
export interface SettingsSchema {
  /**
   * Schema type
   */
  type: 'object';
  
  /**
   * Schema properties
   */
  properties: Record<string, SchemaProperty>;
  
  /**
   * Required properties
   */
  required?: string[];
  
  /**
   * Additional properties allowed
   */
  additionalProperties?: boolean;
}

/**
 * Schema property definition
 */
export interface SchemaProperty {
  /**
   * Property type
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  
  /**
   * Property title
   */
  title?: string;
  
  /**
   * Property description
   */
  description?: string;
  
  /**
   * Default value
   */
  default?: any;
  
  /**
   * Enum values (for string type)
   */
  enum?: any[];
  
  /**
   * Minimum value (for number type)
   */
  minimum?: number;
  
  /**
   * Maximum value (for number type)
   */
  maximum?: number;
  
  /**
   * Array items (for array type)
   */
  items?: SchemaProperty;
  
  /**
   * Object properties (for object type)
   */
  properties?: Record<string, SchemaProperty>;
  
  /**
   * UI hints
   */
  ui?: SchemaUIHints;
}

/**
 * Schema UI hints
 */
export interface SchemaUIHints {
  /**
   * UI widget type
   */
  widget?: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'color' | 'date' | 'file';
  
  /**
   * Widget options
   */
  options?: Record<string, any>;
  
  /**
   * Help text
   */
  help?: string;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Hide from UI
   */
  hidden?: boolean;
  
  /**
   * Read-only in UI
   */
  readonly?: boolean;
  
  /**
   * Display order
   */
  order?: number;
}