/**
 * useComponentAPI Hook
 * 
 * Provides a standardized API for components to interact with
 * the configuration system.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useConfigStore, useConfigsByType } from '../../stores/config.store';
import { Config } from '../../services/config';
import { generateConfigId } from '../../utils/config.utils';
import { getProfileType } from '../../services/config/config.types';
import { useDebounce } from '../../hooks/useDebounce';
import { useAutoSave } from '../../hooks/useAutoSave';
import { get, set, cloneDeep } from 'lodash-es';
import {
  ComponentAPI,
  ComponentState,
  ConfigurableComponent,
  ComponentLifecycle,
  ValidationResult,
  SettingsSchema,
  SchemaProperty,
} from './component.types';

interface UseComponentAPIOptions<TSettings = any> {
  /**
   * Component information
   */
  component: ConfigurableComponent<TSettings>;
  
  /**
   * Default settings
   */
  defaultSettings: TSettings;
  
  /**
   * Settings schema for validation
   */
  schema?: SettingsSchema;
  
  /**
   * Component lifecycle hooks
   */
  lifecycle?: ComponentLifecycle<TSettings>;
  
  /**
   * Enable auto-save
   */
  enableAutoSave?: boolean;
  
  /**
   * Auto-save delay in ms
   */
  autoSaveDelay?: number;
  
  /**
   * Initial profile ID
   */
  initialProfileId?: string;
  
  /**
   * Custom validation function
   */
  validate?: (settings: TSettings) => ValidationResult;
}

export function useComponentAPI<TSettings = any>(
  options: UseComponentAPIOptions<TSettings>
): ComponentAPI<TSettings> {
  const {
    component,
    defaultSettings,
    schema,
    lifecycle,
    enableAutoSave = true,
    autoSaveDelay = 1000,
    initialProfileId,
    validate: customValidate,
  } = options;

  // Config store
  const { saveConfig, deleteConfig } = useConfigStore();
  const profileType = getProfileType(component.componentType);
  const profiles = useConfigsByType(profileType);

  // State
  const [settings, setSettings] = useState<TSettings>(defaultSettings);
  const [profileId, setProfileId] = useState<string | undefined>(initialProfileId);
  const [state, setState] = useState<ComponentState>({
    isLoading: false,
    error: null,
    isDirty: false,
  });

  // Refs
  const settingsRef = useRef(settings);
  const changeListeners = useRef<Map<string, Set<(value: any) => void>>>(new Map());
  const activeConfig = useRef<Config | null>(null);

  // Update settings ref
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Debounced settings for auto-save
  const debouncedSettings = useDebounce(settings, autoSaveDelay);

  // Auto-save
  useAutoSave(
    debouncedSettings,
    {
      onSave: async (data) => {
        if (profileId && activeConfig.current && enableAutoSave) {
          const updated: Config = {
            ...activeConfig.current,
            settings: data,
            lastUpdated: Date.now(),
          };
          await saveConfig(updated);
          setState((prev) => ({ ...prev, isDirty: false }));
        }
      },
      enabled: enableAutoSave && !!profileId && state.isDirty,
      debounceDelay: 0, // Already debounced
    }
  );

  // Load profile
  const loadProfile = useCallback(async (newProfileId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const profile = profiles.find((p) => p.configId === newProfileId);
      if (!profile) {
        throw new Error(`Profile ${newProfileId} not found`);
      }

      activeConfig.current = profile;
      const newSettings = profile.settings || defaultSettings;
      
      // Call lifecycle hook
      await lifecycle?.onSettingsLoad?.(newSettings);
      
      setSettings(newSettings);
      setProfileId(newProfileId);
      setState((prev) => ({ ...prev, isLoading: false, isDirty: false }));
      
      // Call lifecycle hook
      await lifecycle?.onProfileChange?.(newProfileId);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }));
      throw error;
    }
  }, [profiles, defaultSettings, lifecycle]);

  // Save settings
  const saveSettings = useCallback(async (updates: Partial<TSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      
      // Call lifecycle hook
      const processedSettings = await lifecycle?.onBeforeSettingsSave?.(newSettings) || newSettings;
      
      setSettings(processedSettings);
      setState((prev) => ({ ...prev, isDirty: true }));
      
      // Notify change listeners
      Object.entries(updates).forEach(([path, value]) => {
        const listeners = changeListeners.current.get(path);
        listeners?.forEach((callback) => callback(value));
      });
      
      // Call lifecycle hook
      await lifecycle?.onAfterSettingsSave?.(processedSettings);
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, [settings, lifecycle]);

  // Create profile
  const createProfile = useCallback(async (
    name: string,
    description?: string
  ): Promise<Config> => {
    const newProfile: Config = {
      configId: generateConfigId(profileType),
      appId: component.componentId,
      userId: 'current-user',
      componentType: profileType,
      name,
      settings: cloneDeep(settings),
      description,
      createdBy: 'current-user',
      creationTime: Date.now(),
    };

    await saveConfig(newProfile);
    return newProfile;
  }, [component.componentId, profileType, settings, saveConfig]);

  // Delete profile
  const deleteProfile = useCallback(async (deleteProfileId: string) => {
    await deleteConfig(deleteProfileId);
    
    // If deleted profile was active, clear it
    if (profileId === deleteProfileId) {
      setProfileId(undefined);
      activeConfig.current = null;
      setSettings(defaultSettings);
      setState((prev) => ({ ...prev, isDirty: false }));
    }
  }, [profileId, defaultSettings, deleteConfig]);

  // Reset settings
  const resetSettings = useCallback(async () => {
    setSettings(defaultSettings);
    setState((prev) => ({ ...prev, isDirty: true }));
  }, [defaultSettings]);

  // Validate settings
  const validateSettings = useCallback((settingsToValidate: TSettings): ValidationResult => {
    // Use custom validation if provided
    if (customValidate) {
      return customValidate(settingsToValidate);
    }

    // Schema-based validation
    if (schema) {
      return validateWithSchema(settingsToValidate, schema);
    }

    // Default to valid
    return { valid: true };
  }, [customValidate, schema]);

  // Get setting by path
  const getSetting = useCallback(<T = any>(path: string): T | undefined => {
    return get(settingsRef.current, path);
  }, []);

  // Set setting by path
  const setSetting = useCallback(async (path: string, value: any) => {
    const newSettings = cloneDeep(settings);
    set(newSettings as any, path, value);
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Subscribe to setting changes
  const onSettingChange = useCallback((path: string, callback: (value: any) => void) => {
    if (!changeListeners.current.has(path)) {
      changeListeners.current.set(path, new Set());
    }
    changeListeners.current.get(path)!.add(callback);

    // Return unsubscribe function
    return () => {
      changeListeners.current.get(path)?.delete(callback);
      if (changeListeners.current.get(path)?.size === 0) {
        changeListeners.current.delete(path);
      }
    };
  }, []);

  // Call mount lifecycle
  useEffect(() => {
    lifecycle?.onMount?.();
    return () => {
      lifecycle?.onUnmount?.();
    };
  }, [lifecycle]);

  // Call state change lifecycle
  useEffect(() => {
    lifecycle?.onStateChange?.(state);
  }, [state, lifecycle]);

  // Load initial profile
  useEffect(() => {
    if (initialProfileId && !profileId) {
      loadProfile(initialProfileId);
    }
  }, [initialProfileId, profileId, loadProfile]);

  // Return API
  return {
    component,
    settings,
    profileId,
    profiles,
    state,
    loadProfile,
    saveSettings,
    createProfile,
    deleteProfile,
    resetSettings,
    validateSettings,
    getSetting,
    setSetting,
    onSettingChange,
    lifecycle,
  };
}

/**
 * Validate settings against schema
 */
function validateWithSchema(settings: any, schema: SettingsSchema): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  // Validate required properties
  if (schema.required) {
    for (const prop of schema.required) {
      if (!(prop in settings)) {
        errors.push({
          path: prop,
          message: `Required property "${prop}" is missing`,
          code: 'REQUIRED_PROPERTY_MISSING',
        });
      }
    }
  }

  // Validate properties
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const value = settings[key];
    if (value !== undefined) {
      validateProperty(value, propSchema, key, errors, warnings);
    }
  }

  // Check for additional properties
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(settings)) {
      if (!(key in schema.properties)) {
        warnings.push({
          path: key,
          message: `Unknown property "${key}"`,
          code: 'UNKNOWN_PROPERTY',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a single property
 */
function validateProperty(
  value: any,
  schema: SchemaProperty,
  path: string,
  errors: ValidationResult['errors'],
  warnings: ValidationResult['warnings']
) {
  // Type validation
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== schema.type) {
    errors!.push({
      path,
      message: `Expected ${schema.type} but got ${actualType}`,
      code: 'TYPE_MISMATCH',
    });
    return;
  }

  // String validations
  if (schema.type === 'string' && schema.enum) {
    if (!schema.enum.includes(value)) {
      errors!.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
      });
    }
  }

  // Number validations
  if (schema.type === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors!.push({
        path,
        message: `Value must be at least ${schema.minimum}`,
        code: 'NUMBER_TOO_SMALL',
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors!.push({
        path,
        message: `Value must be at most ${schema.maximum}`,
        code: 'NUMBER_TOO_LARGE',
      });
    }
  }

  // Array validations
  if (schema.type === 'array' && schema.items) {
    (value as any[]).forEach((item, index) => {
      validateProperty(item, schema.items!, `${path}[${index}]`, errors, warnings);
    });
  }

  // Object validations
  if (schema.type === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) {
        validateProperty(value[key], propSchema, `${path}.${key}`, errors, warnings);
      }
    }
  }
}