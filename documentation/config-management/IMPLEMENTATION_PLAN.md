# Implementation Plan: Workspace Configuration Management System

## Project Overview

This document tracks the implementation of a comprehensive workspace management system with configuration persistence, dynamic component composition, and profile management.

### Key Principles
- **Simplicity First**: No unnecessary abstractions or layers
- **Performance**: Use Zustand for state, not Context
- **Type Safety**: Full TypeScript coverage, no `any` types
- **Modern UI**: All components use shadcn/ui
- **Stability**: Prevent circular dependencies and infinite loops

### Technology Stack
- React 18 with TypeScript
- Vite for build tooling
- Zustand for state management
- idb (IndexedDB wrapper) for persistence
- shadcn/ui for components
- AG-Grid Enterprise for data tables
- Dockview for workspace layout

### Related Documentation
- [Architecture Guide](./ARCHITECTURE_GUIDE.md)
- [Configuration Management Guide](./README.md)
- [Component API Guide](./COMPONENT_API_GUIDE.md)
- [Data Provider Guide](./DATA_PROVIDER_GUIDE.md)

## File Organization & Naming Conventions

### Directory Structure
All new code will be organized under the `app-v2` folder with the following structure:

```
src/app-v2/
├── components/              # React components
│   ├── ui/                 # Base UI components
│   │   ├── BaseDialog/
│   │   │   ├── BaseDialog.tsx
│   │   │   ├── BaseDialog.types.ts
│   │   │   └── index.ts
│   │   ├── DraggableDialog/
│   │   │   ├── DraggableDialog.tsx
│   │   │   ├── DraggableDialog.types.ts
│   │   │   └── index.ts
│   │   └── MultiSelect/
│   │       ├── MultiSelect.tsx
│   │       ├── MultiSelect.types.ts
│   │       └── index.ts
│   ├── DataTable/
│   │   ├── DataTable.tsx
│   │   ├── DataTable.types.ts
│   │   ├── DataTable.hooks.ts
│   │   └── index.ts
│   ├── ProfileManager/
│   │   ├── ProfileManager.tsx
│   │   ├── ProfileManager.types.ts
│   │   └── index.ts
│   └── Workspace/
│       ├── Workspace.tsx
│       ├── Workspace.types.ts
│       └── index.ts
├── contexts/               # React contexts
│   ├── config.context.tsx
│   └── data-provider.context.tsx
├── hooks/                  # Custom React hooks
│   ├── useDebounce.ts
│   ├── useUpdateGuard.ts
│   ├── useAutoSave.ts
│   └── useDebouncedCallback.ts
├── services/               # Business logic services
│   ├── config/
│   │   ├── config.service.ts
│   │   ├── config.types.ts
│   │   └── config.db.ts    # idb database setup
│   └── data-provider/
│       ├── data-provider.types.ts
│       ├── stomp.provider.ts
│       └── rest.provider.ts
├── stores/                 # Zustand stores
│   ├── config.store.ts
│   └── workspace.store.ts
├── types/                  # Shared TypeScript types
│   ├── component-api.types.ts
│   └── common.types.ts
└── utils/                  # Utility functions
    ├── config.utils.ts
    ├── component.factory.ts
    └── id.utils.ts
```

### Naming Conventions

#### Files
- **React Components**: PascalCase (e.g., `DataTable.tsx`, `ProfileManager.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useDebounce.ts`, `useConfig.ts`)
- **Services**: kebab-case with '.service' suffix (e.g., `config.service.ts`)
- **Types**: kebab-case with '.types' suffix (e.g., `config.types.ts`)
- **Utils**: kebab-case with '.utils' suffix (e.g., `config.utils.ts`)
- **Stores**: kebab-case with '.store' suffix (e.g., `config.store.ts`)
- **Contexts**: kebab-case with '.context' suffix (e.g., `config.context.tsx`)

#### Code
- **Components**: PascalCase (e.g., `export const DataTable`)
- **Interfaces**: PascalCase with 'I' prefix optional (e.g., `Config` or `IConfig`)
- **Types**: PascalCase (e.g., `ConfigFilter`)
- **Functions**: camelCase (e.g., `generateId`, `saveConfig`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`)
- **Enums**: PascalCase with singular names (e.g., `ComponentType`)

#### Component Structure
Each component folder should contain:
- `ComponentName.tsx` - Main component file
- `ComponentName.types.ts` - TypeScript interfaces/types (if needed)
- `ComponentName.hooks.ts` - Component-specific hooks (if needed)
- `ComponentName.utils.ts` - Component-specific utilities (if needed)
- `index.ts` - Re-exports for cleaner imports

Example:
```typescript
// src/app-v2/components/DataTable/index.ts
export { DataTable } from './DataTable';
export type { DataTableProps, DataTableConfig } from './DataTable.types';
```

## Current Status

**Start Date**: December 2024  
**Current Phase**: Planning Complete  
**Next Step**: Implement Config Service

### Completed ✅
- [x] Architecture documentation
- [x] Configuration schema design
- [x] Component API patterns
- [x] Data Provider design
- [x] Implementation plan

### In Progress 🚧
- [ ] Config Service implementation

### Not Started ⏳
- [ ] Base UI components
- [ ] State management
- [ ] Profile Management UI
- [ ] Component API system
- [ ] Data Providers
- [ ] Final integration

## Phase 1: Config Service (Week 1)

### Objectives
- Create a simple, performant configuration service
- Implement IndexedDB persistence
- Provide React Context integration
- Support all CRUD operations

### Deliverables

#### 1.1 Type Definitions
**File**: `src/app-v2/services/config/config.types.ts`
```typescript
export interface Config {
  // Identity
  configId: string;
  appId: string;
  userId: string;
  
  // Type Information
  componentType: string;
  subComponentType?: string;
  
  // Relationships
  parentId?: string;
  ownerId?: string;
  
  // User-Facing Information
  name: string;
  description?: string;
  tags?: string[];
  
  // Configuration Data
  settings: any;
  
  // For components with multiple profiles
  activeSettingsId?: string;
  
  // Sharing
  isPublic?: boolean;
  isTemplate?: boolean;
  sharedWith?: string[];
  
  // Audit Fields
  createdBy: string;
  updatedBy?: string;
  creationTime: number;
  lastUpdated?: number;
}

export interface ConfigFilter {
  userId?: string;
  componentType?: string;
  parentId?: string;
  ownerId?: string;
  tags?: string[];
  isPublic?: boolean;
  isTemplate?: boolean;
}

export interface ConfigService {
  save: (config: Config) => Promise<void>;
  get: (id: string) => Promise<Config | null>;
  update: (id: string, updates: Partial<Config>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  list: (filter?: ConfigFilter) => Promise<Config[]>;
  saveMany: (configs: Config[]) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
}
```

#### 1.2 Config Service Implementation
**File**: `src/app-v2/services/config/config.service.ts`
- idb initialization
- CRUD operations using idb
- Query filtering
- Error handling
- Bulk operations

**idb Database Setup** (`src/app-v2/services/config/config.db.ts`):
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Config } from './config.types';

interface ConfigDBSchema extends DBSchema {
  configs: {
    key: string;
    value: Config;
    indexes: {
      'by-user': string;
      'by-type': string;
      'by-parent': string;
      'by-owner': string;
      'by-user-type': [string, string];
    };
  };
}

const DB_NAME = 'ConfigDB';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase<ConfigDBSchema>> {
  return openDB<ConfigDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the object store
      const store = db.createObjectStore('configs', {
        keyPath: 'configId'
      });
      
      // Create indexes for efficient queries
      store.createIndex('by-user', 'userId');
      store.createIndex('by-type', 'componentType');
      store.createIndex('by-parent', 'parentId');
      store.createIndex('by-owner', 'ownerId');
      store.createIndex('by-user-type', ['userId', 'componentType']);
    },
  });
}
```

#### 1.3 React Context
**File**: `src/app-v2/contexts/config.context.tsx`
- ConfigContext creation
- ConfigProvider component
- useConfig hook
- Loading states
- Error boundaries

Example implementation:
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { IDBPDatabase } from 'idb';
import { ConfigService, Config, ConfigFilter } from '../services/config/config.types';
import { initDB } from '../services/config/config.db';
import { ConfigServiceImpl } from '../services/config/config.service';

const ConfigContext = createContext<ConfigService | null>(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [service, setService] = useState<ConfigService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const initializeService = async () => {
      try {
        const db = await initDB();
        const configService = new ConfigServiceImpl(db);
        setService(configService);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to initialize config service:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeService();
  }, []);
  
  if (isLoading) {
    return <div>Loading configuration service...</div>;
  }
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  return (
    <ConfigContext.Provider value={service}>
      {children}
    </ConfigContext.Provider>
  );
};
```

#### 1.4 Utilities
**File**: `src/app-v2/utils/config.utils.ts`
```typescript
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidConfig = (config: any): config is Config => {
  return (
    config &&
    typeof config.configId === 'string' &&
    typeof config.name === 'string'
    // ... other validations
  );
};
```

### Testing Requirements
- [ ] Unit tests for all CRUD operations
- [ ] IndexedDB integration tests
- [ ] React hook tests
- [ ] Error handling tests
- [ ] Performance tests with large datasets

### Success Criteria
- All CRUD operations work correctly
- Queries filter results accurately
- React integration is seamless
- Performance is acceptable (< 50ms for most operations)
- No memory leaks

## Phase 2: Base UI Components (Week 1-2)

### Objectives
- Create reusable UI components using shadcn
- Implement draggable dialog with transparent overlay
- Build custom shadcn components as needed

### Deliverables

#### 2.1 Draggable Dialog
**File**: `src/app-v2/components/ui/DraggableDialog/DraggableDialog.tsx`
- Non-modal behavior
- Transparent overlay
- Drag functionality
- Resize handles
- Position persistence
- Maximize/minimize

#### 2.2 Multi-Select Component
**File**: `src/app-v2/components/ui/MultiSelect/MultiSelect.tsx`
- shadcn-based implementation
- Keyboard navigation
- Search functionality
- Badge display

#### 2.3 Enhanced Dialogs
**File**: `src/app-v2/components/ui/BaseDialog/BaseDialog.tsx`
- Standard dialog patterns
- Consistent styling
- Accessibility

### Testing Requirements
- [ ] Component unit tests
- [ ] Storybook stories
- [ ] Accessibility tests
- [ ] Browser compatibility

### Success Criteria
- Components follow shadcn patterns
- Draggable dialog works smoothly
- All components are accessible
- Performance is good

## Phase 3: State Management (Week 2)

### Objectives
- Set up Zustand stores
- Create performance-optimized selectors
- Implement core hooks

### Deliverables

#### 3.1 Config Store
**File**: `src/app-v2/stores/config.store.ts`
```typescript
interface ConfigState {
  configs: Map<string, Config>;
  loading: boolean;
  error: Error | null;
  
  // Actions
  loadConfigs: (filter?: ConfigFilter) => Promise<void>;
  saveConfig: (config: Config) => Promise<void>;
  updateConfig: (id: string, updates: Partial<Config>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
}
```

#### 3.2 Workspace Store
**File**: `src/app-v2/stores/workspace.store.ts`
- Workspace state management
- Component registry
- Layout persistence
- Dirty tracking

#### 3.3 Core Hooks
**Files**: `src/app-v2/hooks/`
- `useDebounce.ts`
- `useUpdateGuard.ts`
- `useAutoSave.ts`
- `useDebouncedCallback.ts`

### Testing Requirements
- [ ] Store action tests
- [ ] Selector performance tests
- [ ] Hook unit tests
- [ ] Integration tests

### Success Criteria
- State updates are performant
- No unnecessary re-renders
- Hooks work reliably
- Memory usage is optimal

## Phase 4: Profile Management UI (Week 2-3)

### Objectives
- Build profile management components
- Integrate with Config Service
- Create intuitive UI for settings

### Deliverables

#### 4.1 Profile Manager
**File**: `src/app-v2/components/ProfileManager/ProfileManager.tsx`
- Profile selector dropdown
- Save/update/delete operations
- Preview functionality
- Template support

#### 4.2 Save Profile Dialog
**File**: `src/app-v2/components/SaveProfileDialog/SaveProfileDialog.tsx`
- Name and description inputs
- Settings preview
- Validation
- Save operation

#### 4.3 Profile Selector
**File**: `src/app-v2/components/ProfileSelector/ProfileSelector.tsx`
- Dropdown with search
- Profile preview on hover
- Quick actions

### Testing Requirements
- [ ] Component tests
- [ ] Integration tests with Config Service
- [ ] User flow tests
- [ ] Error handling tests

### Success Criteria
- Profile switching is instant
- Save operations are reliable
- UI is intuitive
- Error messages are helpful

## Phase 5: Component API System (Week 3)

### Objectives
- Implement standardized component API
- Create forwardRef patterns
- Enable parent-child communication

### Deliverables

#### 5.1 Type Definitions
**File**: `src/app-v2/types/component-api.types.ts`
- ComponentAPI interface
- Standard props
- Validation types

#### 5.2 Base Component Wrapper
**File**: `src/app-v2/components/BaseComponent/BaseComponent.tsx`
- forwardRef implementation
- useImperativeHandle patterns
- Standard lifecycle

#### 5.3 Component Factory
**File**: `src/app-v2/utils/component.factory.ts`
- Component registry
- Dynamic component creation
- Type safety

### Testing Requirements
- [ ] API contract tests
- [ ] Ref handling tests
- [ ] Lifecycle tests
- [ ] Communication tests

### Success Criteria
- All components expose consistent API
- Parent components can control children
- No memory leaks with refs
- Type safety is maintained

## Phase 6: Data Providers (Week 3-4)

### Objectives
- Implement data provider system
- Create STOMP provider
- Build provider UI

### Deliverables

#### 6.1 Provider Interfaces
**File**: `src/app-v2/services/data-provider/data-provider.types.ts`
- DataProvider interface
- Event types
- Field definitions

#### 6.2 STOMP Provider
**File**: `src/app-v2/services/data-provider/stomp.provider.ts`
- WebSocket connection
- STOMP protocol
- Auto-reconnection
- Error handling

#### 6.3 Provider UI
**File**: `src/app-v2/components/DataProviderDialog/DataProviderDialog.tsx`
- Provider configuration
- Column mapping
- Test connection
- Status display

### Testing Requirements
- [ ] Provider unit tests
- [ ] WebSocket mock tests
- [ ] UI integration tests
- [ ] Performance tests

### Success Criteria
- Providers connect reliably
- Data streams efficiently
- UI is intuitive
- Multiple components can share providers

## Phase 7: Final Integration (Week 4)

### Objectives
- Update all components with new features
- Integrate all systems
- Performance optimization
- Final testing

### Deliverables

#### 7.1 DataTable Update
**File**: `src/app-v2/components/DataTable/DataTable.tsx`
- Add profile support
- Implement ComponentAPI
- Connect to data providers

#### 7.2 Workspace Update
**File**: `src/app-v2/components/Workspace/Workspace.tsx`
- Component management
- Save/load workspace
- Layout persistence

#### 7.3 Documentation
- Update all guides
- Create examples
- Migration guide

### Testing Requirements
- [ ] End-to-end tests
- [ ] Performance benchmarks
- [ ] User acceptance tests
- [ ] Production readiness

### Success Criteria
- All features work together
- Performance meets targets
- No regressions
- Documentation is complete

## Implementation Checklist

### Phase 1: Config Service ✅
- [x] Create directory structure under app-v2
- [x] Create config.types.ts
- [x] Create config.db.ts (idb setup)
- [x] Implement config.service.ts
- [x] Create config.context.tsx
- [x] Add config.utils.ts
- [x] Write unit tests
- [x] Write integration tests
- [x] Create example component

### Phase 2: Base UI Components ✅
- [x] Implement DraggableDialog component
- [x] Create MultiSelect component
- [x] Implement BaseDialog component
- [x] Create UI components example
- [x] Write component tests
- [x] Follow shadcn patterns

### Phase 3: State Management ⏳
- [ ] Create config.store.ts
- [ ] Create workspace.store.ts
- [ ] Implement useDebounce
- [ ] Implement useUpdateGuard
- [ ] Implement useAutoSave
- [ ] Write tests
- [ ] Optimize performance

### Phase 4: Profile Management ⏳
- [ ] Build ProfileManager
- [ ] Create SaveProfileDialog
- [ ] Implement ProfileSelector
- [ ] Integrate with Config Service
- [ ] Add preview functionality
- [ ] Write tests

### Phase 5: Component API ⏳
- [ ] Define ComponentAPI interface
- [ ] Create BaseComponent wrapper
- [ ] Implement component factory
- [ ] Update existing components
- [ ] Write documentation
- [ ] Create tests

### Phase 6: Data Providers ⏳
- [ ] Define provider interfaces
- [ ] Implement STOMP provider
- [ ] Create provider UI
- [ ] Add provider registry
- [ ] Implement sharing
- [ ] Write tests

### Phase 7: Integration ⏳
- [ ] Update DataTable
- [ ] Update Workspace
- [ ] Add remaining components
- [ ] Performance optimization
- [ ] Final testing
- [ ] Update documentation

## Known Issues & Risks

### Technical Risks
1. **IndexedDB Limitations**: Size limits, browser compatibility
2. **WebSocket Stability**: Connection drops, reconnection logic
3. **Performance**: Large datasets, many components
4. **Memory Leaks**: Refs, event listeners, subscriptions

### Mitigation Strategies
1. **IndexedDB**: Implement quota management, fallback to localStorage
2. **WebSocket**: Robust reconnection, offline queue
3. **Performance**: Virtual scrolling, memoization, lazy loading
4. **Memory**: Proper cleanup, weak references, monitoring

## Next Steps

1. **Immediate** (Today):
   - Start Phase 1: Config Service implementation
   - Set up test environment
   - Create initial file structure

2. **This Week**:
   - Complete Config Service
   - Start UI components
   - Begin state management

3. **Next Week**:
   - Complete profile management
   - Start Component API
   - Continue testing

## Notes for Resuming

If we get disconnected, resume from:
1. Check this document for current phase
2. Review completed items in checklist
3. Check git status for work in progress
4. Continue with next unchecked item

### Key Decisions Made
- Use Zustand instead of Context for performance
- Flat configuration structure for sharing
- Non-modal draggable dialogs
- forwardRef pattern for component APIs
- STOMP for real-time data

### Important Files Created
- `/documentation/config-management/ARCHITECTURE_GUIDE.md`
- `/documentation/config-management/README.md`
- `/documentation/config-management/COMPONENT_API_GUIDE.md`
- `/documentation/config-management/DATA_PROVIDER_GUIDE.md`
- This implementation plan

---

**Last Updated**: December 2024  
**Status**: Ready to begin implementation