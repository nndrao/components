/**
 * BaseDialog Component
 * 
 * A standard dialog component using shadcn UI patterns.
 * Provides consistent styling and behavior for modal dialogs.
 */

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseDialogProps } from './BaseDialog.types';

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

const animationClasses = {
  fade: {
    overlay: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    content: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  },
  slide: {
    overlay: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    content: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
  },
  scale: {
    overlay: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    content: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  },
  none: {
    overlay: '',
    content: '',
  },
};

const positionClasses = {
  center: 'items-center justify-center',
  top: 'items-start justify-center pt-20',
  bottom: 'items-end justify-center pb-20',
};

export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'md',
  className,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  preventBodyScroll = true,
  animation = 'slide',
  position = 'center',
  overlayClassName,
  contentClassName,
  header,
}: BaseDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
            animationClasses[animation].overlay,
            overlayClassName
          )}
          onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 flex',
            positionClasses[position],
            className
          )}
          onEscapeKeyDown={closeOnEsc ? undefined : (e) => e.preventDefault()}
          onPointerDownOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
          onInteractOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={cn(
              'relative bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
              widthClasses[width],
              animationClasses[animation].content,
              contentClassName
            )}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header */}
            {(header || title || description) && (
              <div className="mb-4">
                {header || (
                  <>
                    {title && (
                      <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                        {title}
                      </DialogPrimitive.Title>
                    )}
                    {description && (
                      <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1.5">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Close button */}
            {showCloseButton && (
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
            
            {/* Content */}
            <div className="relative">
              {children}
            </div>
            
            {/* Footer */}
            {footer && (
              <div className="mt-6 flex justify-end space-x-2">
                {footer}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}