/**
 * BaseDialog Types
 */

export interface BaseDialogProps {
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
  title?: string;
  
  /**
   * Dialog description
   */
  description?: string;
  
  /**
   * Dialog content
   */
  children: React.ReactNode;
  
  /**
   * Footer content (buttons, etc.)
   */
  footer?: React.ReactNode;
  
  /**
   * Dialog width
   */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * Additional class names
   */
  className?: string;
  
  /**
   * Close on overlay click
   */
  closeOnOverlayClick?: boolean;
  
  /**
   * Close on escape key
   */
  closeOnEsc?: boolean;
  
  /**
   * Show close button
   */
  showCloseButton?: boolean;
  
  /**
   * Prevent body scroll when open
   */
  preventBodyScroll?: boolean;
  
  /**
   * Animation variant
   */
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  
  /**
   * Position
   */
  position?: 'center' | 'top' | 'bottom';
  
  /**
   * Custom overlay className
   */
  overlayClassName?: string;
  
  /**
   * Custom content className
   */
  contentClassName?: string;
  
  /**
   * Header content (replaces title/description)
   */
  header?: React.ReactNode;
}