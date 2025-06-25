/**
 * MultiSelect Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiSelect } from './MultiSelect';
import { Option } from './MultiSelect.types';

const mockOptions: Option[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('MultiSelect', () => {
  it('should render with placeholder', () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={[]}
        onChange={onChange}
        placeholder="Select items..."
      />
    );
    
    expect(screen.getByText('Select items...')).toBeInTheDocument();
  });
  
  it('should display selected items', () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={['option1', 'option2']}
        onChange={onChange}
      />
    );
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });
  
  it('should open dropdown when clicked', async () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={[]}
        onChange={onChange}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });
  
  it('should call onChange when option is selected', async () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={[]}
        onChange={onChange}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const option = screen.getByText('Option 1');
      fireEvent.click(option);
    });
    
    expect(onChange).toHaveBeenCalledWith(['option1']);
  });
  
  it('should respect maxItems constraint', async () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={['option1', 'option2']}
        onChange={onChange}
        maxItems={2}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const option = screen.getByText('Option 3');
      fireEvent.click(option);
    });
    
    // Should not be called because max items is 2
    expect(onChange).not.toHaveBeenCalled();
  });
  
  it('should show count when showCount is true', () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={['option1', 'option2', 'option3']}
        onChange={onChange}
        showCount={true}
      />
    );
    
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  });
  
  it('should be disabled when disabled prop is true', () => {
    const onChange = vi.fn();
    
    render(
      <MultiSelect
        options={mockOptions}
        value={[]}
        onChange={onChange}
        disabled={true}
      />
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });
});