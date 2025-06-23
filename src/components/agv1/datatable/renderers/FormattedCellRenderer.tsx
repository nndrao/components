import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';
import { cn } from '@/lib/utils';
import { Star, TrendingUp, TrendingDown, Minus, ExternalLink, Mail } from 'lucide-react';
import type { ColumnFormat, ConditionalRule } from '@/types/agv1/common.types';
import { formatCellValue } from '../../dialogs/formatting/utils/formatUtils';

export interface FormattedCellRendererParams extends ICellRendererParams {
  format?: ColumnFormat;
}

export const FormattedCellRenderer: React.FC<FormattedCellRendererParams> = (params) => {
  const { value, format } = params;
  
  if (value == null) return null;
  
  const formattedValue = formatCellValue(value, format || {});
  const cellStyle = getCellStyle(value, format);
  const indicator = getStatusIndicator(value, format);
  
  // Handle special display formats
  if (format?.displayFormat === 'link' && isValidUrl(formattedValue)) {
    return (
      <a
        href={formattedValue}
        target={format.linkTarget || '_blank'}
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
        style={cellStyle}
      >
        {formattedValue}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  
  if (format?.displayFormat === 'email' && isValidEmail(formattedValue)) {
    return (
      <a
        href={`mailto:${formattedValue}`}
        className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
        style={cellStyle}
      >
        {formattedValue}
        <Mail className="h-3 w-3" />
      </a>
    );
  }
  
  // Handle status indicators
  if (indicator) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2",
          format?.wordWrap && "flex-wrap"
        )}
        style={{
          ...cellStyle,
          textAlign: format?.textAlignment || 'left',
          textTransform: format?.textTransform,
        }}
      >
        {format?.statusIndicator?.position !== 'right' && indicator}
        {format?.statusIndicator?.showText !== false && (
          <span>{formattedValue}</span>
        )}
        {format?.statusIndicator?.position === 'right' && indicator}
      </div>
    );
  }
  
  // Handle conditional formatting with data bars
  const conditionalDataBar = getConditionalDataBar(value, format);
  if (conditionalDataBar) {
    return (
      <div className="relative w-full h-full flex items-center">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: conditionalDataBar.color,
            width: `${conditionalDataBar.percentage}%`,
          }}
        />
        <span className="relative z-10 px-2" style={cellStyle}>
          {formattedValue}
        </span>
      </div>
    );
  }
  
  // Default rendering
  return (
    <div
      className={cn(
        format?.wordWrap && "whitespace-pre-wrap break-words",
        !format?.wordWrap && format?.textOverflow === 'ellipsis' && "truncate",
        !format?.wordWrap && format?.textOverflow === 'clip' && "overflow-hidden"
      )}
      style={{
        ...cellStyle,
        textAlign: format?.textAlignment || 'left',
        textTransform: format?.textTransform,
        maxHeight: format?.maxLines ? `${format.maxLines * 1.5}em` : undefined,
        lineHeight: format?.cellStyle?.lineHeight || 1.5,
      }}
    >
      {formattedValue}
    </div>
  );
};

function getCellStyle(value: string | number | Date | boolean | null | undefined, format?: ColumnFormat): React.CSSProperties {
  const style: React.CSSProperties = {};
  
  if (!format) return style;
  
  // Apply base cell style
  if (format.cellStyle) {
    if (format.cellStyle.backgroundColor) {
      style.backgroundColor = format.cellStyle.backgroundColor;
    }
    if (format.cellStyle.textColor) {
      style.color = format.cellStyle.textColor;
    }
    if (format.cellStyle.fontWeight) {
      style.fontWeight = format.cellStyle.fontWeight;
    }
    if (format.cellStyle.fontSize) {
      style.fontSize = `${format.cellStyle.fontSize}px`;
    }
    if (format.cellStyle.fontFamily) {
      style.fontFamily = format.cellStyle.fontFamily;
    }
  }
  
  // Apply conditional formatting
  if (format.conditionalFormats) {
    for (const rule of format.conditionalFormats) {
      if (!rule.enabled) continue;
      
      if (evaluateCondition(value, rule) && rule.formatType === 'cellStyle' && rule.style) {
        Object.assign(style, rule.style);
        break; // Apply only the first matching rule
      }
    }
  }
  
  // Handle negative number formatting
  if (typeof value === 'number' && value < 0) {
    const negativeFormat = format.numberFormat?.negativeFormat;
    if (negativeFormat === 'red' || negativeFormat === 'redParentheses') {
      style.color = '#EF4444';
    }
  }
  
  return style;
}

function getStatusIndicator(value: string | number | Date | boolean | null | undefined, format?: ColumnFormat): React.ReactNode {
  if (!format?.statusIndicator || format.statusIndicator.type === 'none') {
    return null;
  }
  
  switch (format.statusIndicator.type) {
    case 'icon':
      return getIconIndicator(value, format);
    case 'progressBar':
      return getProgressBar(value, format);
    case 'rating':
      return getRating(value, format);
    case 'trafficLight':
      return getTrafficLight(value, format);
    default:
      return null;
  }
}

function getIconIndicator(value: string | number | Date | boolean | null | undefined, format: ColumnFormat): React.ReactNode {
  const iconSet = format.statusIndicator?.iconSet || 'status';
  
  if (iconSet === 'trend') {
    if (typeof value === 'number') {
      if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  }
  
  // Default status icons
  if (value === true || value === 'success' || value === 'complete') {
    return <div className="w-4 h-4 rounded-full bg-green-500" />;
  }
  if (value === false || value === 'error' || value === 'failed') {
    return <div className="w-4 h-4 rounded-full bg-red-500" />;
  }
  
  return <div className="w-4 h-4 rounded-full bg-gray-500" />;
}

function getProgressBar(value: string | number | Date | boolean | null | undefined, format: ColumnFormat): React.ReactNode {
  const numValue = typeof value === 'number' ? value : 0;
  const percentage = Math.min(Math.max(numValue, 0), 100);
  const height = format.progressBar?.height || 8;
  const showPercentage = format.progressBar?.showPercentage ?? true;
  const style = format.progressBar?.style || 'default';
  
  const barColorClass = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    gradient: 'bg-gradient-to-r from-blue-500 to-purple-500',
  }[style];
  
  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ height: `${height}px` }}>
        <div
          className={cn(barColorClass, format.progressBar?.animated && 'transition-all duration-300')}
          style={{ width: `${percentage}%`, height: '100%' }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
      )}
    </div>
  );
}

function getRating(value: string | number | Date | boolean | null | undefined, format: ColumnFormat): React.ReactNode {
  const numValue = typeof value === 'number' ? value : 0;
  const maxRating = format.rating?.maxRating || 5;
  const rating = Math.min(Math.max(numValue, 0), maxRating);
  const allowHalf = format.rating?.allowHalf || false;
  const filledColor = format.rating?.filledColor || '#FFC107';
  const emptyColor = '#E5E7EB';
  
  const stars = [];
  for (let i = 1; i <= maxRating; i++) {
    const filled = i <= rating;
    const halfFilled = allowHalf && i === Math.ceil(rating) && rating % 1 !== 0;
    
    stars.push(
      <Star
        key={i}
        className="h-4 w-4"
        fill={filled ? filledColor : halfFilled ? filledColor : emptyColor}
        color={filled || halfFilled ? filledColor : emptyColor}
        style={{ opacity: halfFilled ? 0.5 : 1 }}
      />
    );
  }
  
  return <div className="flex gap-0.5">{stars}</div>;
}

function getTrafficLight(value: string | number | Date | boolean | null | undefined, format: ColumnFormat): React.ReactNode {
  const shape = format.trafficLight?.shape || 'circle';
  const size = format.trafficLight?.size || 20;
  const colors = format.trafficLight?.colors || {
    red: '#EF4444',
    yellow: '#EAB308',
    green: '#10B981',
  };
  
  let color = colors.yellow;
  if (typeof value === 'number') {
    if (value >= 80) color = colors.green;
    else if (value <= 20) color = colors.red;
  } else if (typeof value === 'boolean') {
    color = value ? colors.green : colors.red;
  } else if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (['good', 'success', 'complete', 'high'].includes(lowerValue)) {
      color = colors.green;
    } else if (['bad', 'error', 'failed', 'low'].includes(lowerValue)) {
      color = colors.red;
    }
  }
  
  return (
    <div
      className={shape === 'circle' ? 'rounded-full' : 'rounded'}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
      }}
    />
  );
}

function getConditionalDataBar(value: string | number | Date | boolean | null | undefined, format?: ColumnFormat): { color: string; percentage: number } | null {
  if (!format?.conditionalFormats) return null;
  
  for (const rule of format.conditionalFormats) {
    if (!rule.enabled || rule.formatType !== 'dataBar') continue;
    
    if (evaluateCondition(value, rule)) {
      const numValue = typeof value === 'number' ? value : 0;
      const percentage = Math.min(Math.max(numValue, 0), 100);
      return {
        color: rule.dataBar?.color || '#3B82F6',
        percentage,
      };
    }
  }
  
  return null;
}

function evaluateCondition(value: string | number | Date | boolean | null | undefined, rule: ConditionalRule): boolean {
  const { operator, value: ruleValue, value2 } = rule;
  
  switch (operator) {
    case 'equals':
      return value == ruleValue;
    case 'notEquals':
      return value != ruleValue;
    case 'greaterThan':
      return Number(value) > Number(ruleValue);
    case 'greaterThanOrEqual':
      return Number(value) >= Number(ruleValue);
    case 'lessThan':
      return Number(value) < Number(ruleValue);
    case 'lessThanOrEqual':
      return Number(value) <= Number(ruleValue);
    case 'contains':
      return String(value).includes(String(ruleValue));
    case 'notContains':
      return !String(value).includes(String(ruleValue));
    case 'startsWith':
      return String(value).startsWith(String(ruleValue));
    case 'endsWith':
      return String(value).endsWith(String(ruleValue));
    case 'between':
      return Number(value) >= Number(ruleValue) && Number(value) <= Number(value2);
    case 'notBetween':
      return Number(value) < Number(ruleValue) || Number(value) > Number(value2);
    case 'empty':
      return value == null || value === '';
    case 'notEmpty':
      return value != null && value !== '';
    default:
      return false;
  }
}

function isValidUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(text: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(text);
}