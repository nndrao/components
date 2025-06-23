import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export const DraggableDialog: React.FC<DraggableDialogProps> = ({
  open,
  onOpenChange,
  title,
  className,
  children,
  width = 600,
  height = 400,
  minWidth = 300,
  minHeight = 200,
  defaultPosition,
  onPositionChange,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(defaultPosition || { x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevSize, setPrevSize] = useState({ width, height, x: position.x, y: position.y });

  useEffect(() => {
    if (!open) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (dialogRef.current?.offsetWidth || width);
      const maxY = window.innerHeight - (dialogRef.current?.offsetHeight || height);
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({ x: constrainedX, y: constrainedY });
      onPositionChange?.({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, width, height, onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current?.contains(e.target as Node)) return;
    
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMaximize = () => {
    if (!isMaximized) {
      setPrevSize({
        width: dialogRef.current?.offsetWidth || width,
        height: dialogRef.current?.offsetHeight || height,
        x: position.x,
        y: position.y,
      });
      setPosition({ x: 0, y: 0 });
    } else {
      setPosition({ x: prevSize.x, y: prevSize.y });
    }
    setIsMaximized(!isMaximized);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          "fixed z-50 bg-background border rounded-lg shadow-lg overflow-hidden",
          isDragging && "cursor-move select-none",
          isMinimized && "h-auto",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: isMaximized ? '100vw' : `${width}px`,
          height: isMaximized ? '100vh' : isMinimized ? 'auto' : `${height}px`,
          minWidth: `${minWidth}px`,
          minHeight: isMinimized ? 'auto' : `${minHeight}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between h-12 px-4 bg-muted border-b cursor-move"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-muted-foreground/30" />
            <span className="font-medium text-sm">{title}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-1 hover:bg-accent rounded"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1 hover:bg-accent rounded"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Square className="h-3 w-3" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-accent rounded"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        {!isMinimized && (
          <div className="flex flex-col h-[calc(100%-3rem)]">
            {children}
          </div>
        )}
      </div>
    </>
  );
};