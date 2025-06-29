/**
 * DraggableDialog Component
 * 
 * A non-modal dialog that can be dragged and resized with a transparent overlay.
 * Does not close when clicking outside and remembers position.
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableDialogProps, DraggableDialogHandle, Position, Size } from './DraggableDialog.types';

const DEFAULT_SIZE: Size = { width: 400, height: 300 };
const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MIN_HEIGHT = 150;

export const DraggableDialog = forwardRef<DraggableDialogHandle, DraggableDialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      children,
      defaultPosition,
      defaultSize = DEFAULT_SIZE,
      minWidth = DEFAULT_MIN_WIDTH,
      minHeight = DEFAULT_MIN_HEIGHT,
      maxWidth,
      maxHeight,
      className,
      showMaximize = true,
      resizable = true,
      onPositionChange,
      onSizeChange,
      zIndex = 50,
      headerExtra,
      footer,
      persistId,
      disableDrag = false,
      closeButton,
    },
    ref
  ) => {
    // Calculate default position (center of viewport)
    const getDefaultPosition = useCallback((): Position => {
      if (defaultPosition) return defaultPosition;
      
      const x = Math.max(0, (window.innerWidth - defaultSize.width) / 2);
      const y = Math.max(0, (window.innerHeight - defaultSize.height) / 2);
      return { x, y };
    }, [defaultPosition, defaultSize.width, defaultSize.height]);
    
    // State
    const [position, setPosition] = useState<Position>(getDefaultPosition);
    const [size, setSize] = useState<Size>(defaultSize);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });
    
    // Refs
    const dialogRef = useRef<HTMLDivElement>(null);
    const preMaximizeState = useRef({ position, size });
    
    // Load persisted state
    useEffect(() => {
      if (!persistId || !open) return;
      
      const saved = localStorage.getItem(`dialog-${persistId}`);
      if (saved) {
        try {
          const { position: savedPos, size: savedSize } = JSON.parse(saved);
          if (savedPos) setPosition(savedPos);
          if (savedSize) setSize(savedSize);
        } catch (e) {
          console.error('Failed to load dialog state:', e);
        }
      }
    }, [persistId, open]);
    
    // Save state when it changes
    useEffect(() => {
      if (!persistId || !open) return;
      
      const saveState = () => {
        localStorage.setItem(
          `dialog-${persistId}`,
          JSON.stringify({ position, size })
        );
      };
      
      const timer = setTimeout(saveState, 500);
      return () => clearTimeout(timer);
    }, [persistId, position, size, open]);
    
    // Handle dragging
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (isMaximized || disableDrag) return;
        
        // Only start drag if clicking on the header (not buttons)
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
        
        e.preventDefault();
      },
      [isMaximized, disableDrag, position]
    );
    
    // Handle resize
    const handleResizeMouseDown = useCallback(
      (e: React.MouseEvent, direction: string) => {
        if (!resizable || isMaximized) return;
        
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
          width: size.width,
          height: size.height,
          x: e.clientX,
          y: e.clientY,
        });
        
        // Store resize direction in dataset
        if (dialogRef.current) {
          dialogRef.current.dataset.resizeDirection = direction;
        }
      },
      [resizable, isMaximized, size]
    );
    
    // Mouse move handler
    useEffect(() => {
      if (!isDragging && !isResizing) return;
      
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const newX = e.clientX - dragStart.x;
          const newY = e.clientY - dragStart.y;
          
          // Keep dialog within viewport
          const maxX = window.innerWidth - size.width;
          const maxY = window.innerHeight - size.height;
          
          const boundedPosition: Position = {
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
          };
          
          setPosition(boundedPosition);
          onPositionChange?.(boundedPosition);
        } else if (isResizing && dialogRef.current) {
          const direction = dialogRef.current.dataset.resizeDirection || '';
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;
          
          if (direction.includes('right')) {
            newWidth = resizeStart.width + (e.clientX - resizeStart.x);
          }
          if (direction.includes('left')) {
            newWidth = resizeStart.width - (e.clientX - resizeStart.x);
          }
          if (direction.includes('bottom')) {
            newHeight = resizeStart.height + (e.clientY - resizeStart.y);
          }
          if (direction.includes('top')) {
            newHeight = resizeStart.height - (e.clientY - resizeStart.y);
          }
          
          // Apply constraints
          newWidth = Math.max(minWidth, newWidth);
          newHeight = Math.max(minHeight, newHeight);
          
          if (maxWidth) newWidth = Math.min(maxWidth, newWidth);
          if (maxHeight) newHeight = Math.min(maxHeight, newHeight);
          
          const newSize: Size = { width: newWidth, height: newHeight };
          setSize(newSize);
          onSizeChange?.(newSize);
        }
      };
      
      const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        if (dialogRef.current) {
          delete dialogRef.current.dataset.resizeDirection;
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, isResizing, dragStart, resizeStart, size, minWidth, minHeight, maxWidth, maxHeight, onPositionChange, onSizeChange]);
    
    // Toggle maximize
    const toggleMaximize = useCallback(() => {
      if (isMaximized) {
        // Restore
        setPosition(preMaximizeState.current.position);
        setSize(preMaximizeState.current.size);
        setIsMaximized(false);
      } else {
        // Maximize
        preMaximizeState.current = { position, size };
        setPosition({ x: 0, y: 0 });
        setSize({ width: window.innerWidth, height: window.innerHeight });
        setIsMaximized(true);
      }
    }, [isMaximized, position, size]);
    
    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        resetPosition: () => setPosition(getDefaultPosition()),
        resetSize: () => setSize(defaultSize),
        center: () => {
          const x = Math.max(0, (window.innerWidth - size.width) / 2);
          const y = Math.max(0, (window.innerHeight - size.height) / 2);
          setPosition({ x, y });
        },
        getPosition: () => position,
        getSize: () => size,
        setPosition,
        setSize,
      }),
      [getDefaultPosition, defaultSize, position, size]
    );
    
    if (!open) return null;
    
    return (
      <>
        {/* Transparent overlay - does not block interactions */}
        <div
          className="fixed inset-0 bg-transparent"
          style={{ zIndex: zIndex - 1 }}
          aria-hidden="true"
        />
        
        {/* Dialog */}
        <div
          ref={dialogRef}
          className={cn(
            'fixed bg-background border rounded-lg shadow-lg flex flex-col',
            isDragging && 'cursor-move select-none',
            isResizing && 'select-none',
            isMaximized && 'transition-all duration-200 rounded-none',
            className
          )}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            zIndex,
          }}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between px-4 py-3 border-b',
              !disableDrag && 'cursor-move'
            )}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2 flex-1">
              {!disableDrag && (
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="font-semibold text-lg select-none">{title}</h3>
            </div>
            
            <div className="flex items-center gap-1">
              {headerExtra}
              
              {showMaximize && (
                <button
                  onClick={toggleMaximize}
                  className="p-1.5 rounded-sm hover:bg-accent transition-colors"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              )}
              
              {closeButton || (
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1.5 rounded-sm hover:bg-accent transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="border-t px-4 py-3">
              {footer}
            </div>
          )}
          
          {/* Resize handles */}
          {resizable && !isMaximized && (
            <>
              {/* Edges */}
              <div
                className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20"
                onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/20"
                onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
              />
              <div
                className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20"
                onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
              />
              <div
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/20"
                onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
              />
              
              {/* Corners */}
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
              />
              <div
                className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
              />
              <div
                className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
              />
              <div
                className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
              />
            </>
          )}
        </div>
      </>
    );
  }
);

DraggableDialog.displayName = 'DraggableDialog';