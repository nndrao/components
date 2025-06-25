# Architecture Guide: Performance, Simplicity, and Stability

## Overview

This guide documents the architectural decisions and patterns for building a performant, scalable workspace management system without layers of abstraction. We focus on simplicity, preventing circular dependencies, avoiding infinite loops, and using modern React patterns.

## Table of Contents

1. [Core Principles](#core-principles)
2. [State Management with Zustand](#state-management-with-zustand)
3. [Preventing Circular Dependencies](#preventing-circular-dependencies)
4. [Avoiding Infinite Loops](#avoiding-infinite-loops)
5. [UI Components with shadcn](#ui-components-with-shadcn)
6. [Draggable Dialog Implementation](#draggable-dialog-implementation)
7. [Performance Optimization](#performance-optimization)
8. [Complete Code Examples](#complete-code-examples)

## Core Principles

### 1. Simplicity First
- No unnecessary abstractions
- Direct component-to-store communication
- Flat file structure where possible
- Clear, single-purpose functions

### 2. Performance by Default
- Use Zustand for frequent state updates (not Context)
- Memoize expensive operations
- Debounce user inputs
- Virtual scrolling for large lists

### 3. Type Safety
- Full TypeScript coverage
- No `any` types
- Proper interface definitions
- Type guards where needed

## State Management with Zustand

### Why Zustand over Context?

React Context causes re-renders of all consuming components when any part of the context value changes. Zustand uses a subscription model that only re-renders components that use specific state slices.

### Store Structure

```typescript
// store/workspace.store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface WorkspaceState {
  // State
  workspaces: Map<string, WorkspaceConfig>;
  activeWorkspaceId: string | null;
  components: Map<string, ComponentConfig>;
  isDirty: boolean;
  lastSaveTime: number | null;
  
  // Actions
  setActiveWorkspace: (id: string) => void;
  addComponent: (workspaceId: string, component: ComponentConfig) => void;
  updateComponent: (id: string, updates: Partial<ComponentConfig>) => void;
  removeComponent: (id: string) => void;
  saveWorkspace: () => Promise<void>;
  markClean: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      workspaces: new Map(),
      activeWorkspaceId: null,
      components: new Map(),
      isDirty: false,
      lastSaveTime: null,
      
      // Actions
      setActiveWorkspace: (id) => set((state) => {
        state.activeWorkspaceId = id;
      }),
      
      addComponent: (workspaceId, component) => set((state) => {
        state.components.set(component.id, component);
        state.isDirty = true;
      }),
      
      updateComponent: (id, updates) => set((state) => {
        const component = state.components.get(id);
        if (component) {
          Object.assign(component, updates);
          state.isDirty = true;
        }
      }),
      
      removeComponent: (id) => set((state) => {
        state.components.delete(id);
        state.isDirty = true;
      }),
      
      saveWorkspace: async () => {
        const state = get();
        if (!state.activeWorkspaceId || !state.isDirty) return;
        
        // Save logic here
        await saveToIndexedDB(state);
        
        set((state) => {
          state.isDirty = false;
          state.lastSaveTime = Date.now();
        });
      },
      
      markClean: () => set((state) => {
        state.isDirty = false;
      }),
    }))
  )
);
```

### Using Selectors for Performance

```typescript
// hooks/useWorkspaceSelectors.ts
import { useWorkspaceStore } from '@/store/workspace.store';
import { shallow } from 'zustand/shallow';

// Select only what you need
export const useActiveWorkspace = () => {
  return useWorkspaceStore((state) => 
    state.workspaces.get(state.activeWorkspaceId || '')
  );
};

// Use shallow comparison for arrays/objects
export const useWorkspaceComponents = (workspaceId: string) => {
  return useWorkspaceStore(
    (state) => Array.from(state.components.values())
      .filter(c => c.workspaceId === workspaceId),
    shallow
  );
};

// Subscribe to specific changes
export const useIsDirty = () => {
  return useWorkspaceStore((state) => state.isDirty);
};
```

## Preventing Circular Dependencies

### 1. Clear Dependency Hierarchy

```
┌─────────────────┐
│     Types       │  (No dependencies)
└────────┬────────┘
         │
┌────────▼────────┐
│     Utils       │  (Only depends on types)
└────────┬────────┘
         │
┌────────▼────────┐
│     Hooks       │  (Depends on types, utils)
└────────┬────────┘
         │
┌────────▼────────┐
│     Store       │  (Depends on types, utils, hooks)
└────────┬────────┘
         │
┌────────▼────────┐
│   Components    │  (Can use everything above)
└─────────────────┘
```

### 2. File Organization

```
src/
├── types/               # No imports from other app folders
│   ├── workspace.types.ts
│   ├── component.types.ts
│   └── config.types.ts
├── utils/               # Only imports from types
│   ├── id-generator.ts
│   ├── validators.ts
│   └── formatters.ts
├── hooks/               # Imports from types, utils
│   ├── useConfig.ts
│   ├── useDebounce.ts
│   └── useAutoSave.ts
├── store/               # Imports from types, utils, hooks
│   ├── workspace.store.ts
│   └── config.store.ts
└── components/          # Can import from any folder above
    ├── workspace/
    ├── data-table/
    └── dialogs/
```

### 3. Import Rules

```typescript
// ✅ Good - Clear dependency direction
// components/DataTable.tsx
import { ComponentConfig } from '@/types/component.types';
import { generateId } from '@/utils/id-generator';
import { useConfig } from '@/hooks/useConfig';
import { useWorkspaceStore } from '@/store/workspace.store';

// ❌ Bad - Circular dependency
// utils/formatter.ts
import { DataTable } from '@/components/DataTable'; // Utils shouldn't import components
```

### 4. Event System for Decoupling

```typescript
// utils/event-bus.ts
type EventMap = {
  'component:update': { id: string; data: any };
  'workspace:save': { workspaceId: string };
  'config:change': { configId: string };
};

class EventBus {
  private listeners = new Map<keyof EventMap, Set<Function>>();
  
  on<K extends keyof EventMap>(
    event: K,
    callback: (data: EventMap[K]) => void
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export const eventBus = new EventBus();
```

## Avoiding Infinite Loops

### 1. useEffect Dependencies

```typescript
// ❌ Bad - Infinite loop
useEffect(() => {
  const newValue = calculateValue(props.data);
  setValue(newValue); // This changes value, which triggers effect again
}, [value]); // value is in dependencies

// ✅ Good - Stable dependencies
useEffect(() => {
  const newValue = calculateValue(props.data);
  setValue(newValue);
}, [props.data]); // Only depends on props, not state
```

### 2. Update Guards with Refs

```typescript
// hooks/useUpdateGuard.ts
export function useUpdateGuard() {
  const lastUpdateRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  
  const canUpdate = (minInterval = 100) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    if (timeSinceLastUpdate < minInterval) {
      updateCountRef.current++;
      
      // Prevent update storm
      if (updateCountRef.current > 10) {
        console.warn('Update storm detected, throttling updates');
        return false;
      }
      return false;
    }
    
    lastUpdateRef.current = now;
    updateCountRef.current = 0;
    return true;
  };
  
  return { canUpdate };
}

// Usage in component
function DataTable() {
  const { canUpdate } = useUpdateGuard();
  
  const handleDataChange = (newData: any) => {
    if (!canUpdate()) return;
    
    // Safe to update
    updateData(newData);
  };
}
```

### 3. Debounced Updates

```typescript
// hooks/useDebouncedCallback.ts
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  maxWait?: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallRef = useRef<number>(0);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Set up max wait if specified
    if (maxWait && now - lastCallRef.current > maxWait) {
      callback(...args);
      lastCallRef.current = now;
      return;
    }
    
    // Set up debounced call
    timeoutRef.current = setTimeout(() => {
      callback(...args);
      lastCallRef.current = Date.now();
    }, delay);
    
    // Set up max wait timeout if not already set
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        callback(...args);
        lastCallRef.current = Date.now();
        maxTimeoutRef.current = undefined;
      }, maxWait);
    }
  }, [callback, delay, maxWait]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, []);
  
  return debouncedCallback;
}
```

### 4. State Update Patterns

```typescript
// ❌ Bad - Multiple setState calls can cause loops
const handleUpdate = (data: any) => {
  setLoading(true);
  setData(data);
  setError(null);
  setLoading(false); // Multiple renders
};

// ✅ Good - Single state update
const [state, setState] = useState({
  loading: false,
  data: null,
  error: null
});

const handleUpdate = (data: any) => {
  setState({
    loading: false,
    data,
    error: null
  }); // Single render
};
```

## UI Components with shadcn

### Component Structure

```typescript
// components/ui/base-dialog.tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export { Dialog, DialogTrigger, DialogPortal, DialogOverlay }
```

### Custom shadcn Components

```typescript
// components/ui/multi-select.tsx
import * as React from "react"
import { Check, X, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  
  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selected.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {selected.map((value) => (
                <Badge
                  variant="secondary"
                  key={value}
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(value)
                  }}
                >
                  {options.find((opt) => opt.value === value)?.label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => handleSelect(option.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

## Draggable Dialog Implementation

### Requirements
- Non-modal (doesn't block background interaction)
- Transparent overlay
- Draggable by header
- Doesn't close on outside click
- Remembers position

### Implementation

```typescript
// components/ui/draggable-dialog.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { X, Maximize2, Minimize2 } from "lucide-react"

interface DraggableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  minWidth?: number
  minHeight?: number
  className?: string
  showMaximize?: boolean
  onPositionChange?: (position: { x: number; y: number }) => void
}

export function DraggableDialog({
  open,
  onOpenChange,
  title,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 300 },
  minWidth = 300,
  minHeight = 200,
  className,
  showMaximize = true,
  onPositionChange,
}: DraggableDialogProps) {
  const [position, setPosition] = React.useState(defaultPosition)
  const [size, setSize] = React.useState(defaultSize)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
  const dialogRef = React.useRef<HTMLDivElement>(null)
  
  // Restore position/size before maximizing
  const preMaximizeState = React.useRef({ position, size })
  
  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return
    
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }
  
  React.useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Keep dialog within viewport
      const maxX = window.innerWidth - (size.width || defaultSize.width)
      const maxY = window.innerHeight - (size.height || defaultSize.height)
      
      const boundedPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      }
      
      setPosition(boundedPosition)
      onPositionChange?.(boundedPosition)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, size, defaultSize.width, defaultSize.height, onPositionChange])
  
  // Handle maximize/restore
  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore
      setPosition(preMaximizeState.current.position)
      setSize(preMaximizeState.current.size)
      setIsMaximized(false)
    } else {
      // Maximize
      preMaximizeState.current = { position, size }
      setPosition({ x: 0, y: 0 })
      setSize({ width: window.innerWidth, height: window.innerHeight })
      setIsMaximized(true)
    }
  }
  
  // Handle resize
  const handleResize = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = size.width
    const startHeight = size.height
    
    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = startWidth
      let newHeight = startHeight
      
      if (direction.includes('right')) {
        newWidth = startWidth + (e.clientX - startX)
      }
      if (direction.includes('bottom')) {
        newHeight = startHeight + (e.clientY - startY)
      }
      
      setSize({
        width: Math.max(minWidth, newWidth),
        height: Math.max(minHeight, newHeight),
      })
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  if (!open) return null
  
  return (
    <>
      {/* Transparent overlay that doesn't block interactions */}
      <div 
        className="fixed inset-0 z-40 bg-transparent pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          "fixed z-50 bg-background border rounded-lg shadow-lg flex flex-col",
          isDragging && "cursor-move select-none",
          isMaximized && "transition-all duration-200",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b cursor-move"
          onMouseDown={handleMouseDown}
        >
          <h3 className="font-semibold text-lg select-none">{title}</h3>
          <div className="flex items-center gap-1">
            {showMaximize && (
              <button
                onClick={toggleMaximize}
                className="p-1 rounded-sm hover:bg-accent"
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-sm hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
        
        {/* Resize handles */}
        {!isMaximized && (
          <>
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20"
              onMouseDown={(e) => handleResize(e, 'right')}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/20"
              onMouseDown={(e) => handleResize(e, 'bottom')}
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
              onMouseDown={(e) => handleResize(e, 'bottom-right')}
            />
          </>
        )}
      </div>
    </>
  )
}
```

### Usage Example

```typescript
// components/SettingsDialog.tsx
import { DraggableDialog } from '@/components/ui/draggable-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [position, setPosition] = React.useState({ x: 200, y: 100 })
  
  // Save position to localStorage
  const handlePositionChange = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition)
    localStorage.setItem('settings-dialog-position', JSON.stringify(newPosition))
  }
  
  // Load saved position
  React.useEffect(() => {
    const saved = localStorage.getItem('settings-dialog-position')
    if (saved) {
      setPosition(JSON.parse(saved))
    }
  }, [])
  
  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      defaultPosition={position}
      defaultSize={{ width: 600, height: 500 }}
      onPositionChange={handlePositionChange}
    >
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          {/* General settings */}
        </TabsContent>
        <TabsContent value="appearance">
          {/* Appearance settings */}
        </TabsContent>
        <TabsContent value="advanced">
          {/* Advanced settings */}
        </TabsContent>
      </Tabs>
    </DraggableDialog>
  )
}
```

## Performance Optimization

### 1. Component Memoization

```typescript
// components/ExpensiveComponent.tsx
import React from 'react'

interface Props {
  data: any[]
  onUpdate: (id: string, value: any) => void
}

export const ExpensiveComponent = React.memo(({ data, onUpdate }: Props) => {
  // Component implementation
  return <div>...</div>
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, index) => item.id === nextProps.data[index]?.id)
  )
})
```

### 2. Virtual Scrolling

```typescript
// components/VirtualList.tsx
import { VariableSizeList as List } from 'react-window'

export function VirtualList({ items, itemHeight = 50 }: VirtualListProps) {
  const getItemSize = (index: number) => {
    // Variable heights if needed
    return items[index].height || itemHeight
  }
  
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {/* Render item */}
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

### 3. Lazy Loading

```typescript
// routes/index.tsx
import { lazy, Suspense } from 'react'

const Workspace = lazy(() => import('@/components/workspace/Workspace'))
const Settings = lazy(() => import('@/components/settings/Settings'))

export function Routes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/workspace" component={Workspace} />
        <Route path="/settings" component={Settings} />
      </Switch>
    </Suspense>
  )
}
```

## Complete Code Examples

### Example 1: Complete DataTable with All Features

```typescript
// components/DataTable.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { useWorkspaceStore } from '@/store/workspace.store'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { useUpdateGuard } from '@/hooks/useUpdateGuard'
import { ProfileManager } from '@/components/ProfileManager'
import { DraggableDialog } from '@/components/ui/draggable-dialog'
import type { ComponentAPI } from '@/types/component-api'

export const DataTable = forwardRef<ComponentAPI, DataTableProps>(
  ({ id, onReady, onSettingsChange }, ref) => {
    const gridRef = useRef<AgGridReact>(null)
    const [isReady, setIsReady] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const { canUpdate } = useUpdateGuard()
    
    // Debounced settings change
    const debouncedSettingsChange = useDebouncedCallback(
      (settings: any) => {
        onSettingsChange?.(settings)
      },
      500,
      2000 // Max wait 2 seconds
    )
    
    // Get current settings
    const getCurrentSettings = useCallback(() => {
      if (!gridRef.current?.api) return {}
      
      return {
        columnState: gridRef.current.api.getColumnState(),
        filterModel: gridRef.current.api.getFilterModel(),
        sortModel: gridRef.current.api.getSortModel(),
      }
    }, [])
    
    // Apply settings with guard
    const applySettings = useCallback((settings: any) => {
      if (!gridRef.current?.api || !canUpdate()) return
      
      requestAnimationFrame(() => {
        if (settings.columnState) {
          gridRef.current!.api.applyColumnState({ 
            state: settings.columnState,
            applyOrder: true 
          })
        }
        
        if (settings.filterModel) {
          gridRef.current!.api.setFilterModel(settings.filterModel)
        }
      })
    }, [canUpdate])
    
    // Expose API
    useImperativeHandle(ref, () => ({
      getId: () => id,
      getType: () => 'DataTable',
      getCurrentSettings,
      applySettings,
      isDirty: () => false, // Implement dirty tracking
      isReady: () => isReady,
    }), [id, isReady, getCurrentSettings, applySettings])
    
    // Handle grid changes
    const handleGridChange = useCallback(() => {
      const settings = getCurrentSettings()
      debouncedSettingsChange(settings)
    }, [getCurrentSettings, debouncedSettingsChange])
    
    return (
      <>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-2 border-b">
            <h3 className="font-semibold">Data Table</h3>
            <div className="flex items-center gap-2">
              <ProfileManager
                componentId={id}
                componentType="DataTable"
                currentSettings={getCurrentSettings()}
                onSettingsChange={applySettings}
              />
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowSettings(true)}
              >
                Settings
              </Button>
            </div>
          </div>
          
          <div className="flex-1">
            <AgGridReact
              ref={gridRef}
              onGridReady={() => setIsReady(true)}
              onColumnMoved={handleGridChange}
              onColumnResized={handleGridChange}
              onFilterChanged={handleGridChange}
              onSortChanged={handleGridChange}
            />
          </div>
        </div>
        
        <DraggableDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          title="Table Settings"
          defaultSize={{ width: 500, height: 400 }}
        >
          {/* Settings content */}
        </DraggableDialog>
      </>
    )
  }
)
```

### Example 2: Auto-Save with Conflict Resolution

```typescript
// hooks/useAutoSaveWithConflictResolution.ts
export function useAutoSaveWithConflictResolution(
  saveFunction: () => Promise<void>,
  options: AutoSaveOptions = {}
) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const saveQueueRef = useRef<SaveRequest[]>([])
  const lastSaveVersionRef = useRef<string>('')
  
  const performSave = useCallback(async () => {
    setSaveState('saving')
    
    try {
      // Get current version
      const currentVersion = await getCurrentVersion()
      
      // Check for conflicts
      if (currentVersion !== lastSaveVersionRef.current && lastSaveVersionRef.current) {
        // Conflict detected
        const conflicts = await detectConflicts()
        if (conflicts.length > 0) {
          setConflicts(conflicts)
          setSaveState('conflict')
          return
        }
      }
      
      // Perform save
      await saveFunction()
      lastSaveVersionRef.current = await getCurrentVersion()
      setSaveState('saved')
      
      // Clear save state after delay
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (error) {
      setSaveState('error')
      console.error('Save failed:', error)
    }
  }, [saveFunction])
  
  const resolveConflicts = useCallback(async (resolution: 'mine' | 'theirs' | 'merge') => {
    // Implement conflict resolution
    setConflicts([])
    setSaveState('idle')
    
    if (resolution === 'mine') {
      await performSave()
    }
  }, [performSave])
  
  return {
    saveState,
    conflicts,
    performSave,
    resolveConflicts,
  }
}
```

## Summary

This architecture provides:

1. **Simple State Management**: Zustand with clear patterns
2. **No Circular Dependencies**: Clear hierarchy and import rules
3. **No Infinite Loops**: Guards, debouncing, and proper effect dependencies
4. **Modern UI**: All components built with shadcn
5. **Draggable Dialogs**: Non-modal with transparent overlays
6. **Performance**: Optimized rendering and state updates
7. **Type Safety**: Full TypeScript coverage

The key is maintaining simplicity while ensuring robustness. Every abstraction should have a clear purpose and measurable benefit.