/**
 * Profile Types - Configuration Groups for Components
 * 
 * Profiles are NOT user profiles - they are named configuration sets
 * that components can save and load.
 */

import type { ColDef, ColumnState, FilterModel, SortModelItem } from 'ag-grid-community';

export interface ComponentProfile {
  id: string;
  name: string;
  description?: string;
  componentType: string;
  componentInstanceId: string;
  datasourceId?: string;
  isDefault?: boolean;
  isProtected?: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  configuration: any; // Component-specific configuration
}

export interface DataTableProfile extends ComponentProfile {
  componentType: 'datatable';
  configuration: {
    columnSettings: {
      columnCustomizations: Record<string, ColumnCustomization>;
      baseColumnDefs: ColDef[];
    };
    gridState: {
      columnState: ColumnState[];
      filterModel: FilterModel;
      sortModel: SortModelItem[];
    };
    gridOptions: {
      font?: string;
      fontSize?: string;
      rowHeight?: number;
      headerHeight?: number;
      theme?: string;
      density?: 'compact' | 'normal' | 'comfortable';
      showRowNumbers?: boolean;
      alternatingRowColors?: boolean;
      showGridLines?: 'none' | 'horizontal' | 'vertical' | 'both';
    };
    displayOptions: {
      quickFilter?: boolean;
      statusBar?: boolean;
      sideBar?: boolean;
      pagination?: boolean;
      pageSize?: number;
    };
  };
}

export interface ColumnCustomization {
  width?: number;
  pinned?: 'left' | 'right' | null;
  hide?: boolean;
  sort?: 'asc' | 'desc' | null;
  sortIndex?: number;
  cellStyle?: any;
  cellClass?: string | string[];
  headerClass?: string | string[];
  filter?: any;
  floatingFilter?: boolean;
  editable?: boolean;
  cellEditor?: string;
  cellRenderer?: string;
  valueFormatter?: string;
  valueGetter?: string;
  valueSetter?: string;
}

export interface ProfileManagementState {
  profiles: Map<string, ComponentProfile[]>; // Keyed by componentInstanceId
  activeProfiles: Map<string, string>; // componentInstanceId -> profileId
}

export interface ProfileOperations {
  // Profile CRUD
  createProfile(componentInstanceId: string, profile: Omit<ComponentProfile, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ComponentProfile>;
  updateProfile(profileId: string, updates: Partial<ComponentProfile>): Promise<void>;
  deleteProfile(profileId: string): Promise<void>;
  getProfile(profileId: string): ComponentProfile | undefined;
  getProfilesForComponent(componentInstanceId: string): ComponentProfile[];
  
  // Profile activation
  activateProfile(componentInstanceId: string, profileId: string): void;
  getActiveProfile(componentInstanceId: string): ComponentProfile | undefined;
  
  // Profile operations
  duplicateProfile(profileId: string, newName: string): Promise<ComponentProfile>;
  exportProfile(profileId: string): string;
  importProfile(componentInstanceId: string, profileData: string): Promise<ComponentProfile>;
  
  // Bulk operations
  exportAllProfiles(componentInstanceId: string): string;
  importProfiles(componentInstanceId: string, data: string): Promise<ComponentProfile[]>;
}