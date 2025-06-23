/**
 * BaseDialog Component
 * 
 * This is the standard dialog component for the application.
 * All dialogs should use this component to ensure consistent styling and behavior.
 * 
 * Features:
 * - Draggable by header
 * - Transparent overlay
 * - Scrollable content
 * - Consistent theming with the application
 * - Responsive positioning
 */

import * as React from 'react';
import { DndContext, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BaseDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  width?: number;
  height?: number;
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export const BaseDialog = React.forwardRef<HTMLDivElement, BaseDialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      footer,
      className,
      contentClassName,
      width = 400,
      height = 700,
      defaultPosition,
      onPositionChange,
    },
    ref
  ) => {
    const [position, setPosition] = React.useState(() => {
      if (defaultPosition) return defaultPosition;
      
      // Center the dialog by default
      return {
        x: (window.innerWidth - width) / 2,
        y: (window.innerHeight - height) / 2,
      };
    });

    const dialogRef = React.useRef<HTMLDivElement | null>(null);

    const handleDragEnd = (event: DragEndEvent) => {
      const { delta } = event;
      const newPosition = {
        x: position.x + delta.x,
        y: position.y + delta.y,
      };

      // Constrain within viewport
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - height;

      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));

      setPosition(newPosition);
      onPositionChange?.(newPosition);
    };

    const DraggableContent = () => {
      const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: 'draggable-dialog',
      });

      const style = {
        position: 'fixed' as const,
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : 'transform 0.2s',
        left: position.x,
        top: position.y,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 50,
      };

      return (
        <Card 
          ref={(node) => {
            setNodeRef(node);
            if (node && dialogRef.current !== node) {
              dialogRef.current = node;
            }
            if (ref) {
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref && 'current' in ref) {
                (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
              }
            }
          }}
          className={cn(
            "flex flex-col shadow-lg",
            className
          )}
          style={style}
        >
          {/* Header - Fixed height with drag handle */}
          <CardHeader 
            className="shrink-0 cursor-move select-none pb-3"
            {...listeners}
            {...attributes}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                {title && <CardTitle className="text-lg">{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
              </div>
              {onOpenChange && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 -mt-1 -mr-2"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Content - Scrollable */}
          <ScrollArea className="flex-1 px-6">
            <div className={cn("pb-6", contentClassName)}>
              {children}
            </div>
          </ScrollArea>

          {/* Footer - Fixed height */}
          {footer && (
            <CardFooter className="shrink-0 border-t p-6">
              {footer}
            </CardFooter>
          )}
        </Card>
      );
    };

    if (!open) return null;

    return (
      <>
        {/* Transparent overlay - blocks interaction with content behind */}
        <div 
          className="fixed inset-0 z-40" 
          style={{ backgroundColor: 'transparent' }}
          onClick={(e) => {
            // Prevent closing when clicking overlay
            e.stopPropagation();
          }}
        />
        
        {/* Dialog with drag context */}
        <DndContext onDragEnd={handleDragEnd}>
          <DraggableContent />
        </DndContext>
      </>
    );
  }
);

BaseDialog.displayName = 'BaseDialog';

// Export convenience components that match the Card pattern
export const BaseDialogHeader = CardHeader;
export const BaseDialogTitle = CardTitle;
export const BaseDialogDescription = CardDescription;
export const BaseDialogContent = CardContent;
export const BaseDialogFooter = CardFooter;