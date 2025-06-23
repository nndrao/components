# AGV1 React Implementation Plan (Updated with Dockview)

## Technology Stack

### Core Technologies

#### UI Framework
- **React 19** with TypeScript 5.x
- **Vite 5.x** for build tooling
- **React Router** for navigation (if needed)

#### Data Grid
- **AG-Grid Enterprise 33.x**
  - All enterprise features available
  - Row grouping, pivoting, Excel export
  - Advanced filtering and aggregations
  - Master/detail views

#### Layout Management
- **React Dockview** (instead of Infragistics)
  - Zero-dependency docking solution
  - Advanced docking layouts
  - Save/restore layout states
  - Floating panels support
  - Popout windows
  - Tab grouping

#### State Management
- **Zustand** for global state
- **React Query** for server state
- **Context API** for component trees

#### Data Persistence
- **Local**: IDB package for IndexedDB
  - Better performance than localStorage
  - Larger storage capacity
  - Async API
- **Remote**: MongoDB integration
  - Profile storage
  - Shared configurations
  - Team collaboration

#### UI Components
- **Radix UI** primitives
- **shadcn/ui** component library
- **Floating UI** for positioning
- **Lucide React** for icons

#### Styling
- **Tailwind CSS 3.x**
- **CSS Variables** for theming
- Match current dark theme aesthetics

#### Real-time Data
- **STOMP.js** for WebSocket
- **Socket.io** as alternative

#### Additional Libraries
- **date-fns** for date formatting
- **Comlink** for Web Workers
- **React Hook Form** for complex forms
- **Zod** for validation

## Component Interface Architecture

### Core Pattern: forwardRef with useImperativeHandle
All components implement standardized interfaces using React's forwardRef pattern:

```typescript
// Base interface all components must implement
interface IConfigurableComponent<TConfig = any> {
  componentId: string;
  componentType: ComponentType;
  
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

// Component implementation pattern
export const DataTable = forwardRef<IDataTableComponent, DataTableProps>(
  ({ instanceId, initialConfig }, ref) => {
    // Expose interface via useImperativeHandle
    useImperativeHandle(ref, () => ({
      componentId: instanceId,
      componentType: 'datatable',
      getConfiguration: () => { /* implementation */ },
      setConfiguration: (config) => { /* implementation */ },
      // ... other methods
    }), [instanceId]);
    
    return <div>{/* Component UI */}</div>;
  }
);
```

## Storage Schema

### Universal Component Configuration
Based on the Profile Management Architecture document:

```typescript
interface ComponentConfig {
  // Identity
  instanceId: string;
  componentType: string;
  displayName?: string;
  
  // Ownership & Access
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
  
  // Settings with Versioning
  settings: {
    activeVersionId: string;
    versions: Record<string, Version>;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  metadata: {
    tags: string[];
    category: string;
    lastAccessed: string;
    accessCount: number;
    favorited: boolean;
    notes: string;
  };
  
  // Sharing
  sharing: {
    isShared: boolean;
    sharedWith: SharedUser[];
    publicAccess: PublicAccessConfig;
  };
}
```

## Project Structure

```
components/
├── src/
│   ├── components/
│   │   ├── datatable/
│   │   │   ├── DataTable.tsx (with forwardRef)
│   │   │   ├── DataTableToolbar.tsx
│   │   │   └── hooks/
│   │   ├── dialogs/
│   │   │   ├── ColumnFormattingDialog/
│   │   │   ├── DataSourceDialog/
│   │   │   └── ProfileManagementDialog/
│   │   ├── layout/
│   │   │   ├── DockviewLayout.tsx
│   │   │   ├── DockviewPanel.tsx
│   │   │   └── dockview-theme.css
│   │   └── ui/ (shadcn components)
│   │
│   ├── services/
│   │   ├── storage/
│   │   │   ├── StorageAdapter.ts
│   │   │   ├── IDBStorageAdapter.ts
│   │   │   ├── MongoDBAdapter.ts
│   │   │   └── HybridStorageAdapter.ts
│   │   ├── formatting/
│   │   ├── datasource/
│   │   └── export/
│   │
│   ├── stores/
│   ├── types/
│   │   ├── component.interfaces.ts
│   │   ├── storage.interfaces.ts
│   │   └── service.interfaces.ts
│   ├── hooks/
│   └── App.tsx
│
├── documents/
├── public/
├── tests/
└── package.json
```

## Key Implementation Changes from Original Plan

### 1. Dockview Instead of Infragistics
- Zero dependencies vs proprietary solution
- Better React integration
- More flexible and modern API
- Open source with active community

### 2. Component Interface Pattern
- All components use forwardRef
- Expose methods via useImperativeHandle
- App container manages components through refs
- Enables direct method calls on components

### 3. Service Architecture
- Services injected via Context
- Storage adapters for flexibility
- Hybrid storage mode (local + remote)
- Automatic sync with conflict resolution

### 4. Multi-Instance Support
- Each component has unique instanceId
- Isolated configurations per instance
- Layout state preserves instance mapping
- No shared state between instances

## Implementation Phases (Updated)

### Phase 1: Core Infrastructure (Week 1)
- Type definitions with component interfaces
- Storage adapters (IDB, MongoDB, Hybrid)
- Service layer with dependency injection
- App container with ref management

### Phase 2: DataTable Component (Week 2)
- Implement with forwardRef pattern
- Full interface implementation
- AG-Grid Enterprise integration
- Configuration and state management

### Phase 3: Dockview Layout Integration (Week 3)
- DockviewLayout component
- Panel management system
- Custom theme implementation
- Layout persistence

### Phase 4: Profile Management UI (Week 4)
- Profile manager component
- Version control interface
- Sharing capabilities
- Workspace management

### Phase 5-10: [Continues as in original plan]

## Key Benefits of Updated Architecture

1. **Standardized Interfaces**: All components follow same pattern
2. **Direct Component Control**: App container can call methods directly
3. **Better Performance**: React 19 optimizations with forwardRef
4. **Type Safety**: Full TypeScript support throughout
5. **Flexible Layout**: Dockview provides modern docking solution
6. **Future Ready**: Architecture supports Server Components when stable

This updated plan incorporates all the architectural decisions made during our discussion while maintaining the core goals of the original implementation plan.