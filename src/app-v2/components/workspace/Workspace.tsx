import React, { useRef, useEffect } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
  DockviewApi,
} from 'dockview-react';
import { useAppStore } from '../../store';
import { DataTable } from '../data-table/DataTable';
import 'dockview-react/dist/styles/dockview.css';

// Panel components mapping
const components = {
  'data-table': (props: IDockviewPanelProps<{ id: string }>) => (
    <DataTable id={props.params.id} />
  ),
};

export function Workspace() {
  const dockviewRef = useRef<DockviewApi | null>(null);
  const hasRestoredRef = useRef(false);
  const isReadyRef = useRef(false);
  const { layout, saveLayout, components: componentMap } = useAppStore();
  
  const onReady = (event: DockviewReadyEvent) => {
    console.log('[Workspace] Dockview ready');
    dockviewRef.current = event.api;
    isReadyRef.current = true;
    
    // Add welcome panel if no components
    if (componentMap.size === 0) {
      event.api.addPanel({
        id: 'welcome',
        component: 'welcome',
        title: 'Welcome',
      });
    } else {
      // Add existing components
      console.log('[Workspace] Adding existing components on ready:', componentMap.size);
      componentMap.forEach((component, id) => {
        event.api.addPanel({
          id,
          component: component.type,
          title: component.title,
          params: { id },
        });
      });
    }
    
    // Save layout on changes
    event.api.onDidLayoutChange(() => {
      const currentLayout = event.api.toJSON();
      if (currentLayout.panels && Object.keys(currentLayout.panels).length > 0) {
        saveLayout(currentLayout);
      }
    });
  };
  
  // Add new components that aren't in the layout
  useEffect(() => {
    if (!dockviewRef.current || !isReadyRef.current) return;
    
    // If clearing workspace, remove all panels first
    if (componentMap.size === 0) {
      hasRestoredRef.current = false;
      const panels = [...dockviewRef.current.panels];
      panels.forEach(panel => {
        dockviewRef.current!.removePanel(panel);
      });
      return;
    }
    
    // Remove welcome panel if we have components
    const welcomePanel = dockviewRef.current.getPanel('welcome');
    if (welcomePanel && componentMap.size > 0) {
      dockviewRef.current.removePanel(welcomePanel);
    }
    
    // Add missing panels
    console.log('[Workspace] Adding panels for components:', componentMap.size);
    componentMap.forEach((component, id) => {
      if (!dockviewRef.current!.getPanel(id)) {
        console.log('[Workspace] Adding panel:', id, component.type);
        dockviewRef.current!.addPanel({
          id,
          component: component.type,
          title: component.title,
          params: { id },
        });
      }
    });
  }, [componentMap]);
  
  // Restore layout in a separate effect
  useEffect(() => {
    if (!dockviewRef.current || !layout || hasRestoredRef.current || componentMap.size === 0) {
      return;
    }
    
    // Check if all components have panels
    let allPanelsReady = true;
    componentMap.forEach((_, id) => {
      if (!dockviewRef.current!.getPanel(id)) {
        allPanelsReady = false;
      }
    });
    
    if (allPanelsReady && layout) {
      try {
        dockviewRef.current.fromJSON(layout as any);
        hasRestoredRef.current = true;
      } catch (error) {
        console.error('Failed to restore layout:', error);
      }
    }
  }, [layout, componentMap]);
  
  return (
    <div className="flex-1 h-full dockview-theme-light">
      <DockviewReact
        onReady={onReady}
        components={{
          ...components,
          welcome: () => (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-xl font-medium mb-2">Welcome to Workspace</h2>
                <p>Click "Add Table" to get started</p>
              </div>
            </div>
          ),
        }}
        watermarkComponent={() => null}
      />
    </div>
  );
}