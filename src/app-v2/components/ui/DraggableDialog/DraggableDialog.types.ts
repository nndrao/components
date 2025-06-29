/**
 * DraggableDialog Types
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DraggableDialogProps {
  /**
   * Controls dialog visibility
   */
  open: boolean;
  
  /**
   * Callback when dialog should close
   */
  onOpenChange: (open: boolean) => void;
  
  /**
   * Dialog title
   */
  title: string;
  
  /**
   * Dialog content
   */
  children: React.ReactNode;
  
  /**
   * Default position (defaults to center)
   */
  defaultPosition?: Position;
  
  /**
   * Default size
   */
  defaultSize?: Size;
  
  /**
   * Minimum width
   */
  minWidth?: number;
  
  /**
   * Minimum height
   */
  minHeight?: number;
  
  /**
   * Maximum width
   */
  maxWidth?: number;
  
  /**
   * Maximum height
   */
  maxHeight?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Show maximize/minimize button
   */
  showMaximize?: boolean;
  
  /**
   * Allow resizing
   */
  resizable?: boolean;
  
  /**
   * Callback when position changes
   */
  onPositionChange?: (position: Position) => void;
  
  /**
   * Callback when size changes
   */
  onSizeChange?: (size: Size) => void;
  
  /**
   * Z-index for the dialog
   */
  zIndex?: number;
  
  /**
   * Additional header content
   */
  headerExtra?: React.ReactNode;
  
  /**
   * Footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Persist position and size to localStorage
   */
  persistId?: string;
  
  /**
   * Disable dragging
   */
  disableDrag?: boolean;
  
  /**
   * Custom close button
   */
  closeButton?: React.ReactNode;
}

export interface DraggableDialogHandle {
  /**
   * Reset to default position
   */
  resetPosition: () => void;
  
  /**
   * Reset to default size
   */
  resetSize: () => void;
  
  /**
   * Center the dialog
   */
  center: () => void;
  
  /**
   * Get current position
   */
  getPosition: () => Position;
  
  /**
   * Get current size
   */
  getSize: () => Size;
  
  /**
   * Set position programmatically
   */
  setPosition: (position: Position) => void;
  
  /**
   * Set size programmatically
   */
  setSize: (size: Size) => void;
}