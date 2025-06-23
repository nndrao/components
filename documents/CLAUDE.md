# CLAUDE.md - AGV1 React Components Project

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the new React 19 implementation of AGV1 (Advanced Grid Visualization), a complete rewrite focusing on:
- Standardized component interfaces using forwardRef
- Multi-instance component support
- Hybrid storage (local IndexedDB + remote MongoDB)
- Modern layout management with React Dockview
- Enterprise features with AG-Grid

**Tech Stack:**
- React 19 RC + TypeScript 5.x
- Vite 5.x (build tool)
- AG-Grid Enterprise 33.x (data grid)
- Zustand 5.x (state management)
- React Dockview (layout management)
- shadcn/ui + Tailwind CSS (UI components)
- IDB (IndexedDB wrapper)
- STOMP.js (WebSocket connections)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm run test

# Preview production build
npm run preview
```

## Architecture Patterns

### Component Interface Pattern
- **forwardRef everywhere**: All configurable components use forwardRef
- **useImperativeHandle**: Expose methods for parent access
- **IConfigurableComponent**: Base interface all components implement
- **Ref-based API**: App container manages components through refs

### State Management
- **Service Registry**: All services injected via Context
- **Zustand stores**: Global state management
- **Component configs**: Stored with versioning and audit trails
- **Hybrid storage**: Automatic sync between local and remote

### Layout Management
- **React Dockview**: Zero-dependency docking solution
- **Panel lifecycle**: Managed through hooks
- **Layout persistence**: Save/restore complete workspace
- **Floating & popout**: Full window management support

## Key Implementation Details

### Component Registration Flow
1. Component created via `appContainer.createComponent()`
2. Ref created and stored in registry
3. Component mounted and registers itself
4. Methods exposed via useImperativeHandle
5. App container can call methods directly

### Storage Architecture
- **Local**: IndexedDB with idb package
- **Remote**: MongoDB with REST API
- **Hybrid**: Automatic sync with conflict resolution
- **Schema**: Universal ComponentConfig with versioning

### Multi-Instance Support
- Each component has unique `instanceId`
- Configurations isolated per instance
- No shared state between instances
- Layout preserves instance mapping

## Code Style Guidelines

- Use TypeScript strict mode
- All components use functional syntax (no classes)
- forwardRef for all configurable components
- Proper cleanup in useEffect returns
- Memoization with useMemo and useCallback
- Path alias `@/` for imports from `src/`

## Testing

Test files should follow this pattern:
- Component tests: Test interface implementation
- Service tests: Test business logic
- Integration tests: Test component interactions
- Use React Testing Library

## Common Tasks

### Adding a New Component
1. Create component with forwardRef
2. Implement IConfigurableComponent interface
3. Add component-specific methods
4. Register component type in factory
5. Create panel wrapper for Dockview

### Implementing Component Interface
```typescript
export const MyComponent = forwardRef<IMyComponent, MyComponentProps>(
  ({ instanceId, initialConfig }, ref) => {
    useImperativeHandle(ref, () => ({
      componentId: instanceId,
      componentType: 'mycomponent',
      getConfiguration: () => config,
      setConfiguration: (newConfig) => setConfig(newConfig),
      // ... other methods
    }), [instanceId, config]);
    
    return <div>{/* UI */}</div>;
  }
);
```

### Working with Services
```typescript
const services = useServices();
const { dataSourceService, profileService } = services;
```

### Managing Configurations
- Use `appContainer.saveAllConfigurations()` to save all
- Configurations include version history
- Each save creates a new version
- Can rollback to previous versions

## Important Files and Locations

### Types
- `/src/types/component.interfaces.ts` - Component interfaces
- `/src/types/storage.interfaces.ts` - Storage schemas
- `/src/types/service.interfaces.ts` - Service interfaces

### Core Components
- `/src/components/layout/DockviewLayout.tsx` - Main layout
- `/src/components/datatable/DataTable.tsx` - Data grid
- `/src/components/providers/` - Context providers

### Services
- `/src/services/storage/` - Storage adapters
- `/src/services/profile/` - Profile management
- `/src/services/datasource/` - Data connections

### Documentation
- `/documents/IMPLEMENTATION_CONTEXT.md` - Current status
- `/documents/COMPONENT_INTERFACE_ARCHITECTURE.md` - Interface specs
- `/documents/STORAGE_SCHEMA_SPECIFICATION.md` - Storage schemas
- `/documents/DOCKVIEW_INTEGRATION_GUIDE.md` - Layout details

## Performance Considerations

- Lazy load heavy components
- Use React.memo for panel components
- Implement virtual scrolling for large data
- Debounce rapid state updates
- Profile renders with React DevTools

## Migration Notes

This is a complete rewrite from the original AGV1 project. Key differences:
- React 19 with functional components only
- forwardRef pattern instead of class components
- Dockview instead of custom layout system
- IndexedDB instead of localStorage
- Standardized component interfaces

When referencing the original project, note these architectural changes.