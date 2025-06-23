# Dockview Integration Guide

## Overview
This guide details the integration of React Dockview for layout management in the AGV1 component system. Dockview provides a modern, zero-dependency solution for creating complex, dockable layouts with support for tabs, floating panels, and popout windows.

## Installation and Setup

### Installation
```bash
npm install dockview
```

### Basic Setup
```typescript
// Import required styles
import 'dockview/dist/styles/dockview.css';
import './styles/dockview-theme.css'; // Custom theme

// Import components
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
  SerializedDockview
} from 'dockview';
```

## Core Concepts

### 1. Panels
Panels are the basic building blocks that contain your components:
- Each panel has a unique ID
- Panels can be docked, floated, or popped out
- Support for custom headers and actions

### 2. Groups
Groups contain one or more panels as tabs:
- Users can drag panels between groups
- Groups can be split horizontally or vertically
- Support for maximizing and minimizing

### 3. Layout Serialization
Dockview layouts can be serialized to JSON:
- Save and restore complete workspace layouts
- Preserve panel positions, sizes, and states
- Support for versioning layouts

## Implementation Architecture

### Main Layout Component

```typescript
// src/components/layout/DockviewLayout.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
  SerializedDockview,
  DockviewPanelApi,
  DockviewGroupPanelApi
} from 'dockview';
import { useAppContainer } from '@/hooks/useAppContainer';
import { useServices } from '@/hooks/useServices';
import { ComponentType } from '@/types';

interface DockviewLayoutProps {
  initialLayout?: SerializedDockview;
  onLayoutChange?: (layout: SerializedDockview) => void;
  theme?: 'light' | 'dark';
}

export const DockviewLayout: React.FC<DockviewLayoutProps> = ({
  initialLayout,
  onLayoutChange,
  theme = 'dark'
}) => {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const appContainer = useAppContainer();
  const services = useServices();
  
  // Component factory for different panel types
  const components = {
    datatable: DataTablePanel,
    chart: ChartPanel,
    properties: PropertiesPanel,
    datasource: DataSourcePanel,
    empty: EmptyPanel
  };
  
  // Initialize Dockview
  const onReady = useCallback((event: DockviewReadyEvent) => {
    setApi(event.api);
    
    // Apply initial layout or create default
    if (initialLayout) {
      event.api.fromJSON(initialLayout);
    } else {
      createDefaultLayout(event.api);
    }
    
    // Set up event listeners
    const disposables = [
      event.api.onDidLayoutChange(() => {
        const layout = event.api.toJSON();
        onLayoutChange?.(layout);
        services.settingsService.setSetting('workspace.layout', layout);
      }),
      
      event.api.onDidAddPanel((panel) => {
        console.log('Panel added:', panel.id);
      }),
      
      event.api.onDidRemovePanel((panel) => {
        console.log('Panel removed:', panel.id);
        // Clean up component if needed
        const instanceId = panel.params?.instanceId;
        if (instanceId) {
          appContainer.unregisterComponent(instanceId);
        }
      })
    ];
    
    return () => disposables.forEach(d => d.dispose());
  }, [initialLayout, onLayoutChange, services, appContainer]);
  
  // Create default layout
  const createDefaultLayout = (api: DockviewApi) => {
    // Main data table
    api.addPanel({
      id: 'main-datatable',
      component: 'datatable',
      params: { instanceId: 'datatable-main' },
      title: 'Data Table',
      position: { referencePanel: undefined }
    });
    
    // Properties panel
    api.addPanel({
      id: 'properties',
      component: 'properties',
      title: 'Properties',
      position: { 
        referencePanel: 'main-datatable', 
        direction: 'right',
        ratio: 0.3
      }
    });
    
    // Data source panel
    api.addPanel({
      id: 'datasource',
      component: 'datasource',
      title: 'Data Source',
      position: { 
        referencePanel: 'properties',
        direction: 'below',
        ratio: 0.5
      }
    });
  };
  
  // Panel management methods
  const addPanel = useCallback((
    type: ComponentType,
    config?: any
  ) => {
    if (!api) return;
    
    const instanceId = `${type}-${Date.now()}`;
    const panel = api.addPanel({
      id: instanceId,
      component: type,
      params: { instanceId, config },
      title: `New ${type}`,
      position: { referencePanel: api.panels[0]?.id }
    });
    
    return panel;
  }, [api]);
  
  const removePanel = useCallback((panelId: string) => {
    if (!api) return;
    api.removePanel(panelId);
  }, [api]);
  
  const createFloatingPanel = useCallback((
    type: ComponentType,
    config?: any
  ) => {
    if (!api) return;
    
    const instanceId = `${type}-floating-${Date.now()}`;
    const panel = api.addPanel({
      id: instanceId,
      component: type,
      params: { instanceId, config },
      title: `Floating ${type}`,
      floating: {
        width: 600,
        height: 400,
        x: 100,
        y: 100
      }
    });
    
    return panel;
  }, [api]);
  
  const createPopoutPanel = useCallback((panelId: string) => {
    if (!api) return;
    
    const panel = api.getPanel(panelId);
    if (!panel) return;
    
    api.addPopoutGroup(panel, {
      popoutUrl: '/popout.html',
      width: 800,
      height: 600,
      left: 100,
      top: 100
    });
  }, [api]);
  
  return (
    <div className={`dockview-container h-full ${theme === 'dark' ? 'dockview-theme-dark' : 'dockview-theme-light'}`}>
      <DockviewReact
        components={components}
        onReady={onReady}
        className="dockview-wrapper"
        disableFloatingGroups={false}
        floatingGroupBounds="viewport"
        createLeftHeaderActionsElement={createLeftHeaderActions}
        createRightHeaderActionsElement={createRightHeaderActions}
        createTabComponent={createCustomTab}
        watermarkComponent={WatermarkComponent}
      />
    </div>
  );
};
```

### Panel Component Implementation

```typescript
// src/components/layout/panels/DataTablePanel.tsx
import React, { useEffect, useRef } from 'react';
import { IDockviewPanelProps } from 'dockview';
import { DataTable } from '@/components/datatable/DataTable';
import { IDataTableComponent } from '@/types';
import { useAppContainer } from '@/hooks/useAppContainer';

export const DataTablePanel: React.FC<IDockviewPanelProps> = ({
  api,
  params
}) => {
  const appContainer = useAppContainer();
  const componentRef = useRef<IDataTableComponent>(null);
  const instanceId = params?.instanceId || `datatable-${Date.now()}`;
  
  useEffect(() => {
    // Register component when mounted
    if (componentRef.current) {
      appContainer.registerComponent(componentRef.current);
    }
    
    // Set up panel-specific features
    api.setTitle(params?.title || 'Data Table');
    
    // Handle dimension changes
    const disposable = api.onDidDimensionsChange((dimensions) => {
      componentRef.current?.onResize?.(dimensions.width, dimensions.height);
    });
    
    return () => {
      disposable.dispose();
      appContainer.unregisterComponent(instanceId);
    };
  }, [api, instanceId, appContainer, params]);
  
  return (
    <div className="h-full w-full overflow-hidden">
      <DataTable
        ref={componentRef}
        instanceId={instanceId}
        initialConfig={params?.config}
      />
    </div>
  );
};
```

### Custom Header Actions

```typescript
// src/components/layout/DockviewHeaderActions.tsx
const createRightHeaderActions = (group: DockviewGroupPanelApi) => {
  const container = document.createElement('div');
  container.className = 'dockview-header-actions';
  
  // Settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'dockview-action-button';
  settingsBtn.innerHTML = '<svg>...</svg>'; // Settings icon
  settingsBtn.onclick = () => {
    const activePanel = group.activePanel;
    if (activePanel) {
      openPanelSettings(activePanel.id);
    }
  };
  
  // Maximize button
  const maximizeBtn = document.createElement('button');
  maximizeBtn.className = 'dockview-action-button';
  maximizeBtn.innerHTML = '<svg>...</svg>'; // Maximize icon
  maximizeBtn.onclick = () => {
    group.api.maximize();
  };
  
  // More options
  const moreBtn = document.createElement('button');
  moreBtn.className = 'dockview-action-button';
  moreBtn.innerHTML = '<svg>...</svg>'; // More icon
  moreBtn.onclick = (e) => {
    showPanelContextMenu(e, group);
  };
  
  container.appendChild(settingsBtn);
  container.appendChild(maximizeBtn);
  container.appendChild(moreBtn);
  
  return container;
};
```

### Custom Tab Component

```typescript
// src/components/layout/DockviewCustomTab.tsx
import React from 'react';
import { IDockviewPanelHeaderProps } from 'dockview';
import { X, Settings, Maximize2 } from 'lucide-react';

export const CustomTab: React.FC<IDockviewPanelHeaderProps> = ({
  api,
  group,
  isActive,
  params
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.close();
  };
  
  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPanelSettings(api.id);
  };
  
  return (
    <div className={`custom-tab ${isActive ? 'active' : ''}`}>
      <span className="tab-title">{api.title}</span>
      <div className="tab-actions">
        <button
          className="tab-action"
          onClick={handleSettings}
          title="Settings"
        >
          <Settings size={14} />
        </button>
        <button
          className="tab-action close"
          onClick={handleClose}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
```

## Theming

### Dark Theme
```css
/* src/styles/dockview-theme-dark.css */
.dockview-theme-dark {
  /* Core colors */
  --dv-group-view-background-color: hsl(210 12% 17%);
  --dv-tabs-and-actions-container-background-color: hsl(210 12% 20%);
  --dv-tabs-container-background-color: hsl(210 12% 20%);
  --dv-tab-background-color: hsl(210 12% 20%);
  --dv-tab-color: hsl(210 40% 98%);
  --dv-active-tab-background-color: hsl(210 12% 17%);
  --dv-active-tab-color: hsl(210 40% 98%);
  --dv-inactive-tab-background-color: hsl(210 12% 22%);
  --dv-inactive-tab-color: hsl(210 40% 70%);
  --dv-hover-tab-background-color: hsl(210 12% 25%);
  
  /* Borders */
  --dv-group-border: hsl(210 12% 25%);
  --dv-activegroup-border: hsl(162 23% 54%);
  --dv-tab-divider-color: hsl(210 12% 25%);
  --dv-separator-border: hsl(210 12% 25%);
  
  /* Drag overlay */
  --dv-drag-over-background-color: hsl(162 23% 54% / 0.1);
  --dv-drag-over-border-color: hsl(162 23% 54%);
  
  /* Typography */
  --dv-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --dv-font-size: 13px;
  --dv-tab-height: 32px;
  
  /* Floating groups */
  --dv-floating-box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  /* Scrollbars */
  --dv-scrollbar-background: hsl(210 12% 20%);
  --dv-scrollbar-thumb: hsl(210 12% 30%);
  --dv-scrollbar-thumb-hover: hsl(210 12% 35%);
}

/* Custom styles */
.dockview-theme-dark .custom-tab {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 100%;
  gap: 8px;
}

.dockview-theme-dark .custom-tab.active {
  background: var(--dv-active-tab-background-color);
  border-bottom: 2px solid var(--dv-activegroup-border);
}

.dockview-theme-dark .tab-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.dockview-theme-dark .tab-action {
  padding: 2px;
  border-radius: 3px;
  opacity: 0.6;
  transition: all 0.2s;
}

.dockview-theme-dark .tab-action:hover {
  opacity: 1;
  background: var(--dv-hover-tab-background-color);
}
```

## Advanced Features

### 1. Layout Persistence

```typescript
// src/hooks/useDockviewPersistence.ts
export const useDockviewPersistence = (api: DockviewApi | null) => {
  const services = useServices();
  
  const saveLayout = useCallback(async (name?: string) => {
    if (!api) return;
    
    const layout = api.toJSON();
    const layoutId = name || 'current-layout';
    
    await services.storageAdapter.saveLayout({
      id: layoutId,
      name,
      layout,
      timestamp: new Date().toISOString(),
      userId: services.userId
    });
  }, [api, services]);
  
  const loadLayout = useCallback(async (layoutId: string) => {
    if (!api) return;
    
    const saved = await services.storageAdapter.getLayout(layoutId);
    if (saved) {
      api.fromJSON(saved.layout);
    }
  }, [api, services]);
  
  const listLayouts = useCallback(async () => {
    return services.storageAdapter.listLayouts(services.userId);
  }, [services]);
  
  return { saveLayout, loadLayout, listLayouts };
};
```

### 2. Floating Panels

```typescript
// src/components/layout/FloatingPanelManager.tsx
export const FloatingPanelManager: React.FC<{ api: DockviewApi }> = ({ api }) => {
  const createFloatingDataTable = () => {
    api.addPanel({
      id: `datatable-floating-${Date.now()}`,
      component: 'datatable',
      title: 'Floating Data Table',
      floating: {
        width: 800,
        height: 600,
        x: (window.innerWidth - 800) / 2,
        y: (window.innerHeight - 600) / 2
      }
    });
  };
  
  const convertToFloating = (panelId: string) => {
    const panel = api.getPanel(panelId);
    if (!panel) return;
    
    const group = panel.group;
    if (!group) return;
    
    api.addFloatingGroup(group, {
      width: 600,
      height: 400,
      x: 100,
      y: 100
    });
  };
  
  return (
    <div className="floating-panel-controls">
      <button onClick={createFloatingDataTable}>
        New Floating Table
      </button>
    </div>
  );
};
```

### 3. Popout Windows

```typescript
// src/components/layout/PopoutManager.tsx
export const PopoutManager = () => {
  const handlePopout = (api: DockviewApi, panelId: string) => {
    const panel = api.getPanel(panelId);
    if (!panel) return;
    
    // Create popout window
    api.addPopoutGroup(panel.group, {
      popoutUrl: '/popout.html',
      width: 1024,
      height: 768,
      left: 100,
      top: 100,
      onDidOpen: (window) => {
        // Configure popout window
        window.document.title = `AGV1 - ${panel.title}`;
      },
      onWillClose: () => {
        // Handle cleanup
        return true; // Allow close
      }
    });
  };
  
  return { handlePopout };
};
```

### 4. Drag and Drop Integration

```typescript
// src/components/layout/DragDropHandler.tsx
const setupDragDrop = (api: DockviewApi) => {
  // External drag sources
  document.addEventListener('dragstart', (e) => {
    const dragData = e.dataTransfer?.getData('application/json');
    if (dragData) {
      const data = JSON.parse(dragData);
      if (data.type === 'component') {
        api.addPanel({
          id: `${data.componentType}-${Date.now()}`,
          component: data.componentType,
          title: data.title,
          params: data.config
        });
      }
    }
  });
  
  // Handle drops on watermark
  api.onDidDrop((e) => {
    console.log('Dropped on dockview:', e);
  });
};
```

## Integration with Component System

### Panel Lifecycle Management

```typescript
// src/hooks/usePanelLifecycle.ts
export const usePanelLifecycle = (
  api: DockviewPanelApi,
  componentRef: React.RefObject<IConfigurableComponent>
) => {
  const appContainer = useAppContainer();
  
  useEffect(() => {
    // Panel focused
    const onFocus = api.onDidFocusChange(() => {
      if (api.isFocused && componentRef.current) {
        appContainer.setActiveComponent(componentRef.current);
      }
    });
    
    // Panel visibility changed
    const onVisibility = api.onDidVisibilityChange(() => {
      componentRef.current?.setVisible?.(api.isVisible);
    });
    
    // Panel dimensions changed
    const onResize = api.onDidDimensionsChange(({ width, height }) => {
      componentRef.current?.onResize?.(width, height);
    });
    
    // Panel will close
    const onWillClose = api.onWillClose(() => {
      // Save component state before closing
      if (componentRef.current) {
        const config = componentRef.current.getConfiguration();
        const state = componentRef.current.getState();
        appContainer.saveComponentState(api.id, { config, state });
      }
      return true; // Allow close
    });
    
    return () => {
      onFocus.dispose();
      onVisibility.dispose();
      onResize.dispose();
      onWillClose.dispose();
    };
  }, [api, componentRef, appContainer]);
};
```

## Best Practices

### 1. Performance
- Lazy load panel components
- Use React.memo for panel components
- Debounce layout change events
- Virtualize large data sets in panels

### 2. State Management
- Save layout state periodically
- Preserve component state on panel close
- Handle panel restoration properly
- Sync state across popout windows

### 3. User Experience
- Provide visual feedback during drag operations
- Show loading states for heavy components
- Implement proper error boundaries
- Add keyboard shortcuts for common operations

### 4. Accessibility
- Ensure keyboard navigation works
- Add proper ARIA labels
- Support screen readers
- Provide focus indicators

## Troubleshooting

### Common Issues

1. **Panels not rendering**
   - Check component registration
   - Verify component props
   - Look for console errors

2. **Layout not persisting**
   - Ensure storage adapter is configured
   - Check serialization format
   - Verify user permissions

3. **Drag and drop not working**
   - Check z-index conflicts
   - Verify event handlers
   - Ensure proper drag data

4. **Performance issues**
   - Profile component renders
   - Check for memory leaks
   - Optimize heavy computations

## Migration from Other Layout Systems

### From GoldenLayout
```typescript
// Conversion utility
const convertGoldenLayoutConfig = (goldenlayout: any): SerializedDockview => {
  // Map GoldenLayout config to Dockview format
  return {
    grid: mapGridConfig(goldenlayout.content),
    panels: mapPanels(goldenlayout.content)
  };
};
```

### From React Grid Layout
```typescript
// Conversion utility
const convertGridLayoutConfig = (gridLayout: any): SerializedDockview => {
  // Map grid positions to Dockview panels
  return {
    panels: gridLayout.map(item => ({
      id: item.i,
      component: item.component,
      position: calculatePosition(item)
    }))
  };
};
```

This guide provides a comprehensive overview of integrating Dockview into the AGV1 component system, ensuring a modern and flexible layout management solution.