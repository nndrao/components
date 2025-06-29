/**
 * MultiSelect Types
 */

export interface Option {
  label: string;
  value: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

export interface MultiSelectProps {
  /**
   * Available options
   */
  options: Option[];
  
  /**
   * Selected values
   */
  value: string[];
  
  /**
   * Callback when selection changes
   */
  onChange: (value: string[]) => void;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Search placeholder
   */
  searchPlaceholder?: string;
  
  /**
   * Maximum number of items that can be selected
   */
  maxItems?: number;
  
  /**
   * Minimum number of items that must be selected
   */
  minItems?: number;
  
  /**
   * Disable the select
   */
  disabled?: boolean;
  
  /**
   * Additional class names
   */
  className?: string;
  
  /**
   * Show search input
   */
  searchable?: boolean;
  
  /**
   * Allow clearing all selections
   */
  clearable?: boolean;
  
  /**
   * Custom empty state message
   */
  emptyMessage?: string;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Loading message
   */
  loadingMessage?: string;
  
  /**
   * Group options by a key
   */
  groupBy?: (option: Option) => string;
  
  /**
   * Sort options
   */
  sortOptions?: (a: Option, b: Option) => number;
  
  /**
   * Custom render for selected items
   */
  renderSelected?: (option: Option) => React.ReactNode;
  
  /**
   * Custom render for options
   */
  renderOption?: (option: Option, isSelected: boolean) => React.ReactNode;
  
  /**
   * Show selected count instead of badges when collapsed
   */
  showCount?: boolean;
  
  /**
   * Maximum height for the dropdown
   */
  maxHeight?: number;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'default' | 'lg';
  
  /**
   * Variant
   */
  variant?: 'default' | 'outline' | 'ghost';
}

export interface MultiSelectHandle {
  /**
   * Clear all selections
   */
  clear: () => void;
  
  /**
   * Select all options
   */
  selectAll: () => void;
  
  /**
   * Focus the select
   */
  focus: () => void;
  
  /**
   * Open the dropdown
   */
  open: () => void;
  
  /**
   * Close the dropdown
   */
  close: () => void;
}