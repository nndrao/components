# AGV1 React Components - Development Checkpoint

## Last Updated: 2025-06-22 (Updated with Dockview styling improvements)

## Overview
This document tracks the development progress of the AGV1 React Components system, a comprehensive enterprise data management platform with real-time data visualization capabilities.

## Current State Summary
✅ **Working State**: The application is now functional with:
- AppContainer managing component lifecycle
- DataTable components displaying dummy data
- Theme synchronization (dark/light mode) - Fixed with parameter-based theming
- IndexedDB storage for persistence
- Profile system for saving/loading configurations
- AG-Grid theme properly syncs with app theme using `themeQuartz.withParams()`

## Architecture Decisions

### 1. **AppContainer as Central Hub**
- Manages all component instances, datasources, and profiles
- Uses a ref pattern (`stateRef`) to avoid stale closures in callbacks
- Provides a unified API for component operations

### 2. **Dummy Data Source**
- Created at AppContainer level for centralized management
- Provides both data AND column definitions (schema-driven approach)
- Supports multiple data types: products, trades, orders, positions
- Auto-updates every 5 seconds for real-time simulation

### 3. **Storage Strategy**
- Using IndexedDB instead of localStorage for better capacity
- ProfileServiceV2 manages configuration groups (not user profiles)
- Workspace state auto-saves every 30 seconds

## Key Files and Their Purposes

### Core Components
1. **`/src/components/agv1/app-container/AppContainer.tsx`**
   - Central management hub for all components
   - Fixed stale closure issue using `stateRef`
   - Manages component creation with automatic dummy datasource assignment

2. **`/src/components/agv1/datatable/DataTable.tsx`**
   - AG-Grid based data table with real-time updates
   - Receives schema (columns) from datasource
   - Supports theming, profiles, and data export

3. **`/src/services/datasource/DummyDataSource.ts`**
   - Generates sample data with proper column definitions
   - Implements IDataSource interface
   - Sends initial data as `{ type: 'initial', data: [...], schema: { columns, keyColumn } }`

### Service Layer
4. **`/src/services/profile/ProfileServiceV2.ts`**
   - Manages component configuration profiles using IndexedDB
   - Supports import/export of configurations

5. **`/src/services/storage/IndexedDBAdapter.ts`**
   - Handles all IndexedDB operations
   - Fixed initialization timing issues

### Provider Infrastructure
6. **`/src/components/agv1/providers/ServicesProvider.tsx`**
   - Dependency injection for all services
   - Fixed circular dependency issues with AppContainer

## Recent Fixes Applied

### 1. **Stale Closure Fix** (Most Recent)
```typescript
// Problem: Callbacks were capturing initial empty state
// Solution: Use ref to always access current state
const stateRef = useRef(state);
stateRef.current = state;

getComponent: useCallback((instanceId: string) => {
  return stateRef.current.components.get(instanceId);
}, []), // No dependencies needed
```

### 2. **Dummy DataSource Schema**
- Changed from sending just array of data to sending structured response
- DataTable now receives columns from datasource instead of hardcoding them

### 3. **Component Registration Timing**
- Added retry logic in DataTable to handle timing issues
- Component now waits for registration before connecting to datasource

### 4. **Enhanced Theme Synchronization** (Latest Fix - 2025-06-22)
- Fixed AG-Grid not syncing with app theme changes
- Using parameter-based theming with `themeQuartz.withParams()`
- Added `document.body.dataset.agThemeMode` for CSS variable support
- Force grid re-render on theme change with `key={currentTheme}`
- Added custom CSS variables in App.css for theme-specific AG-Grid colors
- System theme detection with dynamic updates
- Using Tailwind-compatible color values (zinc palette)

### 5. **DataTable Toolbar Theme Compatibility** (2025-06-22)
- Updated DataTableToolbar to use only shadcn/ui components
- Fixed toolbar layout to be theme-aware with bg-background
- Updated ConnectionStatusIndicator with dark mode colors
- Enhanced UpdateStreamIndicator to use Badge component
- All UI elements now properly sync with dark/light mode

### 6. **Dockview Theme Synchronization** (2025-06-22)
- Added dynamic theme class to DockviewReact component
- Created resolvedTheme state to handle system theme changes
- Updated AppContainer.css with comprehensive theme variables
- Used shadcn/ui CSS variables (--background, --muted, --border, etc.)
- Added hover states and active tab indicators
- Dockview now properly syncs with app dark/light mode

### 7. **Dockview Tab Bar Background Fix** (2025-06-22)
- Fixed tab bar background not changing between themes
- Added correct CSS selectors: `.dv-tabs-and-actions-container`
- Overrode hardcoded dark colors with theme-aware colors
- Added `!important` to ensure theme overrides take precedence
- Set appropriate `color-scheme` CSS property

### 8. **Dockview Drop Indicator Enhancement** (2025-06-22)
- Made dock area indicators more visible
- Changed background to primary color with 20% opacity
- Added 2px solid border using primary color
- Removed default opacity that was hiding drop targets
- Added hover effects for better user feedback

### 9. **Dockview Tab Header Styling Improvements** (2025-06-22)
- Added proper padding (12px) around tab content
- Reduced close button size from default to 16x16px (icon 12x12px)
- Improved active/inactive tab distinction:
  - Active: Bold font, primary color underline, background color
  - Inactive: Semi-transparent muted background with subtle border
- Added rounded corners and smooth transitions
- Removed tab dividers for cleaner appearance
- Increased tab container height to 38px for better proportions

## Current Working Features

### ✅ Completed
1. **Component Management**
   - Create/destroy components via AppContainer
   - Automatic dummy data assignment
   - Component registration and lifecycle

2. **Data Display**
   - AG-Grid integration with proper theming
   - Dynamic column generation from datasource
   - Real-time data updates (simulated)

3. **Profiles System**
   - Save/load component configurations
   - Multiple profiles per component
   - IndexedDB persistence

4. **Theme Support**
   - Dark/light mode synchronization across all components
   - AG-Grid theme integration using parameter-based themeQuartz
   - Dockview theme synchronization with custom CSS variables
   - System theme detection with dynamic updates
   - Improved color contrast and visual hierarchy
   - Consistent theming for all UI elements

5. **Data Sources**
   - Dummy data generation for testing
   - WebSocket infrastructure (ready for real data)
   - Multiple data types support

### 🚧 In Progress
1. **DataSource Configuration Dialog**
   - UI is complete but needs connection logic
   - STOMP configuration fields ready

2. **Real-time WebSocket Connection**
   - Infrastructure exists but not connected
   - Need to implement actual STOMP connection

### 📋 TODO
1. **Testing & Quality**
   - Unit tests for services
   - Integration tests for components
   - E2E tests for workflows

2. **Migration Tools**
   - Import from legacy system
   - Bulk configuration management

3. **Production Readiness**
   - Performance optimization
   - Error boundaries
   - Monitoring integration

## Known Issues & Solutions

### Issue 1: Multiple Service Initializations
- **Symptom**: Services initialize multiple times in React StrictMode
- **Solution**: Added initialization guards but may need further optimization

### Issue 2: TypeScript Strictness
- **Symptom**: Some type assertions using `as any`
- **Solution**: Gradually improve type definitions

## Development Commands

```bash
# Start development server
npm run dev

# Run tests (when implemented)
npm test

# Build for production
npm run build

# Type checking
npm run type-check
```

## Next Steps

### Immediate (Priority High)
1. Connect DataSource Configuration Dialog to actual WebSocket
2. Implement real STOMP message handling
3. Add error handling for failed connections

### Short-term (Priority Medium)
1. Add unit tests for critical services
2. Implement data persistence across sessions
3. Add more visualization components (charts, pivot tables)

### Long-term (Priority Low)
1. Performance optimization for large datasets
2. Advanced filtering and aggregation
3. Export to various formats (Excel, PDF)

## Code Patterns to Follow

### 1. **Component Creation Pattern**
```typescript
const instanceId = appContainer.createComponent('datatable', {
  title: 'My Data Table',
  datasourceId: 'my-datasource' // optional
});
```

### 2. **Service Access Pattern**
```typescript
const { appContainer } = useAppContainer(instanceId);
const dataSource = appContainer.getDatasource(datasourceId);
```

### 3. **State Update Pattern**
Always use functional updates to avoid race conditions:
```typescript
setState(prev => ({
  ...prev,
  someField: newValue
}));
```

## Recovery Instructions

If you need to continue development:

1. **Check Current State**
   ```bash
   git status
   npm install
   npm run dev
   ```

2. **Verify Working Features**
   - Open http://localhost:5173
   - Click "Add Component" -> "Data Table"
   - Should see grid with 100 rows of product data
   - Theme toggle should work
   - Profile save/load should work

3. **Continue From TODO List**
   - Check the TODO section above
   - Start with high priority items
   - Run tests after each major change

## Environment Details
- Node.js version: Check with `node -v`
- React: 19.0.0
- AG-Grid: 33.0.0
- TypeScript: 5.3.3
- Vite: 5.4.8

## Git Commit Guidelines
When committing changes:
```bash
git add .
git commit -m "feat: [component] description

- Detailed change 1
- Detailed change 2

🤖 Generated with Claude Code"
```

---

This checkpoint provides a complete snapshot of the current state. Save this file and update it regularly as development progresses.