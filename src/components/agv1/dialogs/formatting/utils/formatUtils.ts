import type { ColumnFormat, ExtendedNumberFormat, ExtendedCurrencyFormat, ExtendedDateFormat } from '@/types/agv1/common.types';

export function formatCellValue(value: string | number | Date | boolean | null | undefined, format: ColumnFormat): string {
  if (value == null) return '';
  
  // Handle different data types
  switch (format.dataType) {
    case 'number':
      return formatNumber(value, format.numberFormat);
    case 'currency':
      return formatCurrency(value, format.currencyFormat);
    case 'percentage':
      return formatPercentage(value, format.numberFormat);
    case 'date':
    case 'datetime':
      return formatDate(value, format.dateFormat);
    case 'boolean':
      return formatBoolean(value);
    case 'custom':
      return formatCustom(value, format.customTemplate);
    default:
      return formatText(value, format);
  }
}

function formatNumber(value: string | number | Date | boolean | null | undefined, format?: ExtendedNumberFormat): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  const decimals = format?.decimals ?? 2;
  const thousandsSeparator = format?.thousandsSeparator ?? true;
  const negativeFormat = format?.negativeFormat || 'minus';
  const prefix = format?.prefix || '';
  const suffix = format?.suffix || '';
  const showZero = format?.showZero ?? true;
  
  if (num === 0 && !showZero) return '';
  
  let formatted = Math.abs(num).toFixed(decimals);
  
  if (thousandsSeparator) {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  if (num < 0) {
    switch (negativeFormat) {
      case 'parentheses':
        formatted = `(${formatted})`;
        break;
      case 'red':
      case 'redParentheses':
        formatted = negativeFormat === 'redParentheses' ? `(${formatted})` : `-${formatted}`;
        break;
      default:
        formatted = `-${formatted}`;
    }
  }
  
  return `${prefix}${formatted}${suffix}`;
}

function formatCurrency(value: string | number | Date | boolean | null | undefined, format?: ExtendedCurrencyFormat): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  const currency = format?.currency || 'USD';
  const display = format?.currencyDisplay || 'symbol';
  const minDecimals = format?.minimumFractionDigits ?? 2;
  const maxDecimals = format?.maximumFractionDigits ?? 2;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: display,
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    }).format(num);
  } catch {
    return formatNumber(value, { decimals: 2, thousandsSeparator: true });
  }
}

function formatPercentage(value: string | number | Date | boolean | null | undefined, format?: ExtendedNumberFormat): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  const percentageMode = format?.percentageMode || 'decimal';
  const displayValue = percentageMode === 'decimal' ? num * 100 : num;
  
  return formatNumber(displayValue, {
    ...format,
    suffix: '%',
  });
}

function formatDate(value: string | number | Date | boolean | null | undefined, format?: ExtendedDateFormat): string {
  let date: Date;
  
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else {
    return String(value);
  }
  
  if (isNaN(date.getTime())) return String(value);
  
  const formatPattern = format?.format || 'MM/dd/yyyy';
  
  // Simple date formatting (can be enhanced with a library like date-fns)
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const replacements: Record<string, string> = {
    'yyyy': date.getFullYear().toString(),
    'yy': date.getFullYear().toString().slice(-2),
    'MM': pad(date.getMonth() + 1),
    'M': (date.getMonth() + 1).toString(),
    'dd': pad(date.getDate()),
    'd': date.getDate().toString(),
    'HH': pad(date.getHours()),
    'H': date.getHours().toString(),
    'mm': pad(date.getMinutes()),
    'm': date.getMinutes().toString(),
    'ss': pad(date.getSeconds()),
    's': date.getSeconds().toString(),
  };
  
  let formatted = formatPattern;
  Object.entries(replacements).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(key, 'g'), value);
  });
  
  return formatted;
}

function formatBoolean(value: string | number | Date | boolean | null | undefined): string {
  return value ? 'Yes' : 'No';
}

function formatCustom(value: string | number | Date | boolean | null | undefined, template?: string): string {
  if (!template) return String(value);
  
  return template.replace(/\$\{value\}/g, String(value));
}

function formatText(value: string | number | Date | boolean | null | undefined, format: ColumnFormat): string {
  let text = String(value);
  
  if (format.trimWhitespace) {
    text = text.trim();
  }
  
  if (format.displayFormat === 'link' && isValidUrl(text)) {
    return text; // The actual link rendering is handled by the cell renderer
  }
  
  if (format.displayFormat === 'email' && isValidEmail(text)) {
    return text; // The actual email rendering is handled by the cell renderer
  }
  
  if (format.displayFormat === 'phone') {
    return formatPhoneNumber(text);
  }
  
  return text;
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

function formatPhoneNumber(text: string): string {
  // Remove all non-digits
  const digits = text.replace(/\D/g, '');
  
  // Format US phone numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return text;
}

export function getDefaultFormatForDataType(dataType: string): Partial<ColumnFormat> {
  switch (dataType) {
    case 'number':
      return {
        dataType: 'number',
        numberFormat: {
          type: 'number',
          decimals: 2,
          thousandsSeparator: true,
          negativeFormat: 'minus',
        },
        textAlignment: 'right',
      };
    case 'currency':
      return {
        dataType: 'currency',
        currencyFormat: {
          currency: 'USD',
          currencyDisplay: 'symbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
        textAlignment: 'right',
      };
    case 'percentage':
      return {
        dataType: 'percentage',
        numberFormat: {
          type: 'percentage',
          decimals: 2,
          thousandsSeparator: true,
          negativeFormat: 'minus',
        },
        textAlignment: 'right',
      };
    case 'date':
      return {
        dataType: 'date',
        dateFormat: {
          format: 'MM/dd/yyyy',
          timezone: 'local',
        },
        textAlignment: 'left',
      };
    case 'datetime':
      return {
        dataType: 'datetime',
        dateFormat: {
          format: 'MM/dd/yyyy HH:mm:ss',
          timezone: 'local',
        },
        textAlignment: 'left',
      };
    case 'boolean':
      return {
        dataType: 'boolean',
        textAlignment: 'center',
      };
    default:
      return {
        dataType: 'string',
        textAlignment: 'left',
      };
  }
}