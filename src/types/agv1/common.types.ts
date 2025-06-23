/**
 * Common Types for AGV1 React Components
 * 
 * This file contains shared types and enums used throughout the AGV1 system.
 */

/**
 * Theme options for the application
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * Density options for grid and UI components
 */
export type Density = 'compact' | 'normal' | 'comfortable';

/**
 * Common alignment options
 */
export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * Common status types
 */
export type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Grid line display options
 */
export type GridLines = 'none' | 'horizontal' | 'vertical' | 'both';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Time range presets
 */
export type TimeRange = 
  | 'last-hour'
  | 'last-24-hours'
  | 'last-7-days'
  | 'last-30-days'
  | 'last-90-days'
  | 'custom';

/**
 * Export options
 */
export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  includeHeaders: boolean;
  includeFilters: boolean;
  fileName?: string;
  selectedRowsOnly: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Filter operator types
 */
export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * Filter definition
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
  type?: 'text' | 'number' | 'date' | 'boolean';
}

/**
 * Sort definition
 */
export interface Sort {
  field: string;
  order: SortOrder;
}

/**
 * Color definition with optional opacity
 */
export interface Color {
  hex: string;
  rgb?: {
    r: number;
    g: number;
    b: number;
  };
  opacity?: number;
}

/**
 * Border style options
 */
export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';

/**
 * Border definition
 */
export interface Border {
  width: number;
  style: BorderStyle;
  color: string;
}

/**
 * Padding/Margin definition
 */
export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Font weight options
 */
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

/**
 * Font style options
 */
export type FontStyle = 'normal' | 'italic';

/**
 * Typography settings
 */
export interface Typography {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: HorizontalAlign;
  color?: string;
}

/**
 * Cell styling options
 */
export interface CellStyle {
  textColor?: string;
  backgroundColor?: string;
  font?: Typography;
  borders?: {
    top?: Border;
    right?: Border;
    bottom?: Border;
    left?: Border;
  };
  padding?: Spacing;
  alignment?: {
    horizontal?: HorizontalAlign;
    vertical?: VerticalAlign;
  };
}

/**
 * Number format options
 */
export interface NumberFormat {
  decimals?: number;
  thousandsSeparator?: boolean;
  prefix?: string;
  suffix?: string;
  negativeStyle?: 'minus' | 'parentheses' | 'red' | 'redParentheses';
}

/**
 * Currency format options
 */
export interface CurrencyFormat extends NumberFormat {
  symbol: string;
  symbolPosition: 'before' | 'after';
}

/**
 * Date format presets
 */
export type DateFormatPreset = 
  | 'short-date'      // MM/DD/YYYY
  | 'long-date'       // Month DD, YYYY
  | 'iso-date'        // YYYY-MM-DD
  | 'time'            // HH:MM:SS
  | 'datetime'        // MM/DD/YYYY HH:MM:SS
  | 'relative';       // 2 hours ago

/**
 * Date format options
 */
export interface DateFormat {
  preset?: DateFormatPreset;
  custom?: string;
  timezone?: string;
}

/**
 * Format template types
 */
export type FormatTemplateType = 
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'phone'
  | 'email'
  | 'status'
  | 'progress'
  | 'rating'
  | 'traffic-light'
  | 'custom';

/**
 * Status indicator configuration
 */
export interface StatusIndicator {
  value: string;
  label: string;
  color: string;
  icon?: string;
  backgroundColor?: string;
}

/**
 * Progress bar configuration
 */
export interface ProgressBarConfig {
  min: number;
  max: number;
  showValue: boolean;
  showPercentage: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
}

/**
 * Rating configuration
 */
export interface RatingConfig {
  max: number;
  icon: 'star' | 'heart' | 'circle';
  color: string;
  emptyColor: string;
  allowHalf: boolean;
}

/**
 * Traffic light configuration
 */
export interface TrafficLightConfig {
  thresholds: Array<{
    min: number;
    max: number;
    color: 'red' | 'yellow' | 'green';
  }>;
  shape: 'circle' | 'square';
  size: number;
}

/**
 * Data type options for columns
 */
export type DataType = 'string' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'boolean' | 'custom';

/**
 * Text alignment options
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Text transform options
 */
export type TextTransform = 'uppercase' | 'lowercase' | 'capitalize';

/**
 * Text overflow options
 */
export type TextOverflow = 'clip' | 'ellipsis' | 'visible';

/**
 * Comparison operators for conditional formatting
 */
export type ComparisonOperator = 
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'between'
  | 'notBetween'
  | 'empty'
  | 'notEmpty';

/**
 * Icon set types
 */
export type IconSet = 'status' | 'trend' | 'rating' | 'custom';

/**
 * Extended number format with additional options
 */
export interface ExtendedNumberFormat extends NumberFormat {
  type?: 'number' | 'percentage';
  negativeFormat?: 'minus' | 'parentheses' | 'red' | 'redParentheses';
  showZero?: boolean;
  percentageMode?: 'decimal' | 'whole';
  multiplyBy100?: boolean;
}

/**
 * Extended currency format
 */
export interface ExtendedCurrencyFormat {
  decimals?: number;
  thousandsSeparator?: boolean;
  prefix?: string;
  suffix?: string;
  negativeStyle?: 'minus' | 'parentheses' | 'red' | 'redParentheses';
  symbol?: string;
  symbolPosition?: 'before' | 'after';
  position?: 'before' | 'after';
  currency?: string;
  currencyDisplay?: 'symbol' | 'code' | 'name';
  minimumFractionDigits?: number;
  negativeFormat?: 'minus' | 'parentheses' | 'red' | 'redParentheses';
  maximumFractionDigits?: number;
}

/**
 * Extended date format
 */
export interface ExtendedDateFormat extends DateFormat {
  format?: string;
  timezone?: string;
  includeTime?: boolean;
}

/**
 * Cell style with additional properties
 */
export interface ExtendedCellStyle extends Omit<CellStyle, 'padding'> {
  fontWeight?: FontWeight | '300' | '500' | '600';
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: FontStyle;
  lineHeight?: number;
  borderStyle?: BorderStyle;
  borderWidth?: number;
  borderColor?: string;
  padding?: Spacing | { [key: string]: string };
  paddingHorizontal?: number;
  paddingVertical?: number;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  borders?: {
    [key: string]: {
      style?: string;
      width?: string;
      color?: string;
    };
  };
}

/**
 * Status indicator configuration
 */
export interface StatusIndicatorConfig {
  type?: 'none' | 'icon' | 'progressBar' | 'rating' | 'trafficLight';
  iconSet?: IconSet;
  showText?: boolean;
  position?: 'left' | 'right' | 'only';
  value?: string | number;
  label?: string;
  color?: string;
}

/**
 * Progress bar configuration
 */
export interface ProgressBar {
  min?: number;
  max?: number;
  showValue?: boolean;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: string;
  animated?: boolean;
}

/**
 * Rating configuration
 */
export interface Rating {
  maxRating?: number;
  icon?: 'star' | 'heart' | 'circle';
  size?: number;
  filledColor?: string;
  emptyColor?: string;
  allowHalf?: boolean;
}

/**
 * Traffic light configuration
 */
export interface TrafficLight {
  thresholds?: Array<{
    min: number;
    max: number;
    color: 'red' | 'yellow' | 'green';
  }>;
  shape?: 'circle' | 'square';
  size?: number;
  colors?: {
    red?: string;
    yellow?: string;
    green?: string;
  };
}

/**
 * Conditional formatting rule
 */
export interface ConditionalRule {
  id: string;
  operator: ComparisonOperator;
  value: string;
  value2?: string;
  formatType: 'cellStyle' | 'dataBar' | 'colorScale' | 'iconSet';
  style?: Partial<ExtendedCellStyle>;
  dataBar?: {
    color?: string;
    showValue?: boolean;
  };
  colorScale?: {
    minColor?: string;
    midColor?: string;
    maxColor?: string;
  };
  iconSet?: {
    type?: IconSet;
    icons?: string[];
  };
  priority: number;
  enabled: boolean;
}

/**
 * Conditional format (alias for ConditionalRule)
 */
export type ConditionalFormat = ConditionalRule;

/**
 * Column format configuration
 */
export interface ColumnFormat {
  dataType?: DataType;
  displayFormat?: 'text' | 'html' | 'markdown' | 'link' | 'email' | 'phone' | 'custom';
  linkTarget?: '_blank' | '_self' | '_parent' | '_top';
  customTemplate?: string;
  
  // Number formatting
  numberFormat?: ExtendedNumberFormat;
  currencyFormat?: ExtendedCurrencyFormat;
  dateFormat?: ExtendedDateFormat;
  
  // Text formatting
  textAlignment?: TextAlignment;
  textTransform?: TextTransform;
  textOverflow?: TextOverflow;
  wordWrap?: boolean;
  trimWhitespace?: boolean;
  preserveLineBreaks?: boolean;
  maxLines?: number;
  
  // Cell styling
  cellStyle?: ExtendedCellStyle;
  
  // Status indicators
  statusIndicator?: StatusIndicatorConfig;
  progressBar?: ProgressBar;
  rating?: Rating;
  trafficLight?: TrafficLight;
  
  // Conditional formatting
  conditionalFormats?: ConditionalFormat[];
  
  // Excel format string
  excelFormat?: string;
  
  // Filter options
  filterOptions?: {
    filterType?: 'text' | 'number' | 'date' | 'set' | 'custom';
    caseSensitive?: boolean;
    showBlanks?: boolean;
    applyButton?: boolean;
    clearButton?: boolean;
    enableQuickFilter?: boolean;
    quickFilterParser?: string;
    defaultFilter?: {
      operator: string;
      value: string;
    };
  };
  
  // Editor options
  editorOptions?: {
    editorType?: 'text' | 'number' | 'select' | 'date' | 'richtext' | 'none';
    editOnClick?: boolean;
    selectAllOnFocus?: boolean;
    stopEditingOnEnter?: boolean;
    useFormatter?: boolean;
    selectOptions?: string[];
    allowCustomValue?: boolean;
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
    pattern?: string;
    errorMessage?: string;
  };
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

/**
 * Error with additional context
 */
export interface AGV1Error extends Error {
  code?: string;
  context?: Record<string, any>;
  timestamp?: string;
  recoverable?: boolean;
}

/**
 * Loading state with progress
 */
export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  cancelable?: boolean;
  onCancel?: () => void;
}

/**
 * Dialog size presets
 */
export type DialogSize = 'small' | 'medium' | 'large' | 'fullscreen' | 'custom';

/**
 * Dialog position
 */
export interface DialogPosition {
  x: number;
  y: number;
}

/**
 * Panel position in layout
 */
export type PanelPosition = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'floating';

/**
 * Action definition for buttons and menus
 */
export interface Action {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  disabled?: boolean;
  hidden?: boolean;
  shortcut?: KeyboardShortcut;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
}

/**
 * Menu item definition
 */
export interface MenuItem extends Action {
  children?: MenuItem[];
  divider?: boolean;
  checked?: boolean;
  radio?: boolean;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Form field definition
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'color' | 'custom';
  value?: any;
  defaultValue?: any;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: ValidationRule[];
  options?: Array<{ label: string; value: any }>;
  onChange?: (value: any) => void;
}

/**
 * Tab definition
 */
export interface Tab {
  id: string;
  label: string;
  icon?: string;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

/**
 * Tree node structure
 */
export interface TreeNode<T = any> {
  id: string;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: string;
}