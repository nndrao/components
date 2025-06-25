/**
 * DraggableDialog Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraggableDialog } from './DraggableDialog';

describe('DraggableDialog', () => {
  it('should render when open', () => {
    const onOpenChange = vi.fn();
    
    render(
      <DraggableDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </DraggableDialog>
    );
    
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog Content')).toBeInTheDocument();
  });
  
  it('should not render when closed', () => {
    const onOpenChange = vi.fn();
    
    render(
      <DraggableDialog
        open={false}
        onOpenChange={onOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </DraggableDialog>
    );
    
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
  });
  
  it('should call onOpenChange when close button is clicked', () => {
    const onOpenChange = vi.fn();
    
    render(
      <DraggableDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Test Dialog"
      >
        <div>Dialog Content</div>
      </DraggableDialog>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  
  it('should show maximize button when showMaximize is true', () => {
    const onOpenChange = vi.fn();
    
    render(
      <DraggableDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Test Dialog"
        showMaximize={true}
      >
        <div>Dialog Content</div>
      </DraggableDialog>
    );
    
    expect(screen.getByTitle('Maximize')).toBeInTheDocument();
  });
  
  it('should render footer content', () => {
    const onOpenChange = vi.fn();
    
    render(
      <DraggableDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Test Dialog"
        footer={<button>Footer Button</button>}
      >
        <div>Dialog Content</div>
      </DraggableDialog>
    );
    
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });
  
  it('should apply custom className', () => {
    const onOpenChange = vi.fn();
    
    const { container } = render(
      <DraggableDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Test Dialog"
        className="custom-class"
      >
        <div>Dialog Content</div>
      </DraggableDialog>
    );
    
    const dialog = container.querySelector('.custom-class');
    expect(dialog).toBeInTheDocument();
  });
});