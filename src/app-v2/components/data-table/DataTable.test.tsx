import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';
import { useAppStore } from '../../store';

// Mock AG-Grid React component
vi.mock('ag-grid-react', () => ({
  AgGridReact: vi.fn(({ onGridReady }: { onGridReady?: (event: any) => void }) => {
    // Simulate grid ready event
    setTimeout(() => {
      onGridReady?.({
        api: {
          applyColumnState: vi.fn(),
          getColumnState: vi.fn().mockReturnValue([]),
          getFilterModel: vi.fn().mockReturnValue({}),
          setFilterModel: vi.fn(),
        },
      });
    }, 0);
    return <div data-testid="ag-grid-mock">AG Grid Mock</div>;
  }),
}));

// Mock Theme Context
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('DataTable', () => {
  const mockComponentId = 'test-component-123';

  beforeEach(() => {
    // Reset store and add a test component
    useAppStore.setState({
      components: new Map([
        [mockComponentId, {
          id: mockComponentId,
          type: 'data-table',
          title: 'Test Table',
          config: {},
        }],
      ]),
      profiles: new Map([
        [mockComponentId, [{
          id: 'profile-1',
          name: 'Default',
          config: {},
          createdAt: Date.now(),
        }]],
      ]),
      activeProfiles: new Map([
        [mockComponentId, 'profile-1'],
      ]),
      layout: null,
      isClearing: false,
    });

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === `datatable-toolbar-${mockComponentId}`) {
        return 'true';
      }
      return null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  it('should render the data table component', () => {
    render(<DataTable id={mockComponentId} />);
    
    expect(screen.getByTestId('ag-grid-mock')).toBeInTheDocument();
  });

  it('should display the component title', () => {
    render(<DataTable id={mockComponentId} />);
    
    expect(screen.getByText('Test Table')).toBeInTheDocument();
  });

  it('should render profile bar', () => {
    render(<DataTable id={mockComponentId} />);
    
    // Profile bar should show the active profile
    expect(screen.getByRole('button', { name: /Default/i })).toBeInTheDocument();
  });

  it('should render with toolbar expanded by default', () => {
    render(<DataTable id={mockComponentId} />);
    
    // Find the toolbar container by its classes
    const toolbar = screen.getByText('Test Table').closest('.border-b');
    expect(toolbar).toHaveClass('h-12');
  });

  it('should render null if component not found', () => {
    const { container } = render(<DataTable id="non-existent-id" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should apply theme mode to document body', () => {
    render(<DataTable id={mockComponentId} />);
    
    expect(document.body.dataset.agThemeMode).toBe('light');
  });
});