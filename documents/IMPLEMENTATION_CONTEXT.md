# Implementation Context - AGV1 React Components

## Project Overview
Building a React 19-based component system with standardized interfaces, forwardRef patterns, and comprehensive state management for the AGV1 data visualization platform.

## Current Date: 2025-06-21
## Session Start: 6:00 AM

## Architecture Decisions Made

### 1. Component Interface Pattern
- All components implement `IConfigurableComponent` interface
- Components expose methods via `forwardRef` and `useImperativeHandle`
- App container manages component lifecycle through refs
- Each component has a unique `instanceId` for multi-instance support

### 2. Storage Architecture
- **Local**: IndexedDB using `idb` package
- **Remote**: MongoDB with REST API
- **Hybrid mode**: Automatic sync with conflict resolution
- **Universal schema**: Based on `ui_component_settings.json` structure

### 3. Layout Management
- **React Dockview** (not Infragistics) for layout management
- Support for floating panels and popout windows
- Serializable layout state
- Custom theming to match AGV1 design system

### 4. Technology Stack
- **React 19 RC** with functional components only
- **TypeScript 5.x** with strict mode
- **AG-Grid Enterprise 33.x** for data tables
- **Zustand 5.x** for state management
- **Tailwind CSS 3.x** + **shadcn/ui** for styling
- **Vite 5.x** for build tooling
- **React Dockview** for layout management
- **STOMP.js** for WebSocket connections

## Key Interfaces Defined

### Base Component Interface
```typescript
interface IConfigurableComponent<TConfig = any> {
  componentId: string;
  componentType: 'datatable' | 'chart' | 'datasource' | 'filter' | 'custom';
  
  // Configuration management
  getConfiguration(): TConfig;
  setConfiguration(config: TConfig): void;
  resetConfiguration(): void;
  
  // State persistence
  getState(): ComponentState;
  setState(state: ComponentState): void;
  
  // Lifecycle hooks
  onBeforeSave?(): Promise<void>;
  onAfterLoad?(config: TConfig): Promise<void>;
  
  // Validation
  validateConfiguration?(config: TConfig): ValidationResult;
}
```

### DataTable Specific Interface
```typescript
interface IDataTableComponent extends IConfigurableComponent<DataTableConfig> {
  setDataSource(source: IDataSource): void;
  refreshData(): Promise<void>;
  getGridApi(): GridApi | null;
  exportData(format: ExportFormat): Promise<Blob>;
  getColumnDefinitions(): ColDef[];
  updateColumnDefinitions(columns: ColDef[]): void;
}
```

## Schema Specifications

### Universal Component Config Schema
```typescript
interface ComponentConfig {
  instanceId: string;
  componentType: string;
  displayName?: string;
  appId: string;
  userId: string;
  ownerId: string;
  permissions: {
    isPublic: boolean;
    canEdit: string[];
    canView: string[];
    allowSharing: boolean;
    editableByOthers: boolean;
  };
  settings: {
    activeVersionId: string;
    versions: Record<string, Version>;
  };
  metadata: {
    tags: string[];
    category: string;
    lastAccessed: string;
    accessCount: number;
    favorited: boolean;
    notes: string;
  };
  sharing: {
    isShared: boolean;
    sharedWith: SharedUser[];
    publicAccess: PublicAccessConfig;
  };
  createdAt: string;
  updatedAt: string;
}
```

## Implementation Status

### ✅ Completed
- Architecture planning and documentation
- Interface definitions for component system
- Storage schema specifications (local and remote)
- Technology stack selection
- Dockview integration planning
- Project scaffolding at `/Users/develop/Documents/projects/components`

### 🚧 In Progress
- Creating implementation documentation
- Setting up file structure

### 📋 Next Steps (Priority Order)
1. Create all type definition files (`src/types/*.ts`)
2. Implement storage adapters (IDB, MongoDB, Hybrid)
3. Build service layer (ServiceRegistry, ProfileService, etc.)
4. Create AppContainerProvider with ref management
5. Implement DataTable component with forwardRef
6. Integrate Dockview for layout management
7. Add profile management UI components
8. Implement data source connections
9. Add testing infrastructure
10. Performance optimization

## Important Implementation Notes

### Component Registration Flow
1. Component created via `appContainer.createComponent()`
2. Ref created and stored in registry
3. Component mounted and registers itself via `useEffect`
4. Component methods exposed via `useImperativeHandle`
5. App container can call methods directly via ref

### State Persistence Strategy
1. Each component maintains its own configuration
2. App container coordinates saves across all components
3. Versions stored with full audit trail
4. Automatic sync between local and remote storage

### Multi-Instance Support
- Each component instance has unique `instanceId`
- Configurations stored separately per instance
- Layout state includes instance mappings
- No shared state between instances

## File Locations

### Original AGV1 Project
- Location: `/Users/develop/Documents/projects/agv1`
- Key files:
  - `src/components/datatable/DataTable.tsx` (reference implementation)
  - `src/services/profile/` (profile management logic)
  - `documentation/` (architecture docs)

### New React Implementation
- Location: `/Users/develop/Documents/projects/components`
- Structure follows modular architecture
- All components use forwardRef pattern
- Services injected via context providers

## Dependencies Installed
- React 19 RC
- AG-Grid Enterprise
- React Dockview
- Zustand
- IDB
- Tailwind CSS
- shadcn/ui components
- And all other specified dependencies

## Configuration Notes
- AG-Grid license key needed in `.env`
- MongoDB connection string for remote storage
- WebSocket URL for real-time updates
- Tailwind configured with shadcn/ui presets

## Session Recovery Instructions
If disconnected, resume by:
1. Read this context document
2. Check implementation status above
3. Continue with next steps in priority order
4. Reference architecture documents in `documents/` folder
5. Maintain consistent patterns established

## Related Documents
- `COMPONENT_INTERFACE_ARCHITECTURE.md` - Complete interface specs
- `STORAGE_SCHEMA_SPECIFICATION.md` - Detailed storage schemas
- `DOCKVIEW_INTEGRATION_GUIDE.md` - Layout management details
- `IMPLEMENTATION_ROADMAP.md` - Phased implementation plan