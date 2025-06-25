# Property Grid Design Language

## Overview

This design language defines the visual and interaction patterns for the application's property grid and configuration interfaces. It's built on shadcn/ui components and follows modern dark theme design principles with consistent spacing, typography, and component styling.

## Core Design Principles

### 1. **Consistency**
- Uniform spacing and sizing across all components
- Consistent color usage and contrast ratios
- Standardized interaction patterns

### 2. **Hierarchy**
- Clear visual hierarchy through typography and spacing
- Grouped related controls with proper sectioning
- Logical information flow from general to specific

### 3. **Accessibility**
- High contrast ratios for text and interactive elements
- Proper focus indicators and keyboard navigation
- Screen reader friendly component structure

### 4. **Flexibility**
- Responsive design that works across different screen sizes
- Configurable themes (dark/light mode support)
- Modular component system

## Color System

### Primary Colors
```css
/* Dark Theme (Primary) */
--background: 222 84% 4.9%;           /* #0a0a0b - Main background */
--foreground: 210 40% 98%;            /* #fafafa - Primary text */
--card: 222 84% 4.9%;                 /* #0a0a0b - Card backgrounds */
--card-foreground: 210 40% 98%;       /* #fafafa - Card text */
--popover: 222 84% 4.9%;              /* #0a0a0b - Popover backgrounds */
--popover-foreground: 210 40% 98%;    /* #fafafa - Popover text */

/* UI Element Colors */
--primary: 210 40% 98%;               /* #fafafa - Primary buttons */
--primary-foreground: 222 84% 4.9%;  /* #0a0a0b - Primary button text */
--secondary: 217 32% 17%;             /* #2a2e3a - Secondary elements */
--secondary-foreground: 210 40% 98%; /* #fafafa - Secondary text */
--muted: 217 32% 17%;                 /* #2a2e3a - Muted backgrounds */
--muted-foreground: 215 20% 65%;     /* #a1a1aa - Muted text */
--accent: 217 32% 17%;                /* #2a2e3a - Accent elements */
--accent-foreground: 210 40% 98%;    /* #fafafa - Accent text */

/* State Colors */
--destructive: 0 62% 30%;             /* #991b1b - Error/delete */
--destructive-foreground: 210 40% 98%; /* #fafafa - Error text */
--border: 217 32% 17%;                /* #2a2e3a - Borders */
--input: 217 32% 17%;                 /* #2a2e3a - Input backgrounds */
--ring: 212 92% 45%;                  /* #2563eb - Focus rings */
```

### Interactive States
```css
/* Hover States */
--hover-opacity: 0.8;
--hover-scale: 1.02;

/* Active States */
--active-opacity: 0.9;
--active-scale: 0.98;

/* Focus States */
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
```

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale
```css
/* Headings */
.text-h1 { font-size: 2rem; font-weight: 700; line-height: 1.2; }      /* 32px */
.text-h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }    /* 24px */
.text-h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }   /* 20px */
.text-h4 { font-size: 1.125rem; font-weight: 500; line-height: 1.4; }  /* 18px */

/* Body Text */
.text-body-lg { font-size: 1rem; font-weight: 400; line-height: 1.5; }      /* 16px */
.text-body { font-size: 0.875rem; font-weight: 400; line-height: 1.5; }     /* 14px */
.text-body-sm { font-size: 0.75rem; font-weight: 400; line-height: 1.5; }   /* 12px */

/* Labels */
.text-label { font-size: 0.875rem; font-weight: 500; line-height: 1.4; }    /* 14px */
.text-label-sm { font-size: 0.75rem; font-weight: 500; line-height: 1.4; }  /* 12px */

/* Code/Monospace */
.text-code { font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.875rem; }
```

## Spacing System

### Base Unit: 4px
```css
/* Spacing Scale */
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-5: 1.25rem;   /* 20px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
--spacing-16: 4rem;     /* 64px */
```

### Component Spacing
```css
/* Internal Padding */
--padding-sm: var(--spacing-2);    /* 8px */
--padding-md: var(--spacing-4);    /* 16px */
--padding-lg: var(--spacing-6);    /* 24px */

/* Margins */
--margin-sm: var(--spacing-2);     /* 8px */
--margin-md: var(--spacing-4);     /* 16px */
--margin-lg: var(--spacing-6);     /* 24px */

/* Gaps */
--gap-sm: var(--spacing-2);        /* 8px */
--gap-md: var(--spacing-4);        /* 16px */
--gap-lg: var(--spacing-6);        /* 24px */
```

## Border Radius

```css
--radius-sm: 0.125rem;   /* 2px */
--radius-md: 0.25rem;    /* 4px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
```

## Component Patterns

### 1. Property Grid Container

```tsx
interface PropertyGridProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function PropertyGrid({ title, children, className, actions }: PropertyGridProps) {
  return (
    <div className={cn("bg-card border rounded-lg shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-h3 font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            className="pl-9 bg-muted border-0"
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-6">
        {children}
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/50">
          {actions}
        </div>
      )}
    </div>
  );
}
```

### 2. Property Section

```tsx
interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
}

export function PropertySection({ 
  title, 
  children, 
  defaultExpanded = true,
  icon 
}: PropertySectionProps) {
  return (
    <Collapsible defaultOpen={defaultExpanded}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-label font-medium">{title}</span>
        </div>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 3. Property Field

```tsx
interface PropertyFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
}

export function PropertyField({ 
  label, 
  description, 
  children, 
  required 
}: PropertyFieldProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      <div className="space-y-1">
        <Label className="text-label">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center min-h-[2.5rem]">
        {children}
      </div>
    </div>
  );
}
```

### 4. Toggle Switch Field

```tsx
interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ToggleField({ 
  label, 
  description, 
  checked, 
  onCheckedChange 
}: ToggleFieldProps) {
  return (
    <PropertyField label={label} description={description}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-primary"
      />
    </PropertyField>
  );
}
```

### 5. Number Input Field

```tsx
interface NumberFieldProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({ 
  label, 
  description, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1 
}: NumberFieldProps) {
  return (
    <PropertyField label={label} description={description}>
      <div className="flex items-center gap-2 w-full">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <div className="flex flex-col">
          <Button
            variant="outline"
            size="sm"
            className="h-5 w-8 p-0 rounded-t-md rounded-b-none border-b-0"
            onClick={() => onChange(value + step)}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 w-8 p-0 rounded-b-md rounded-t-none"
            onClick={() => onChange(value - step)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </PropertyField>
  );
}
```

### 6. Select Field

```tsx
interface SelectFieldProps {
  label: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SelectField({ 
  label, 
  description, 
  value, 
  onValueChange, 
  options, 
  placeholder 
}: SelectFieldProps) {
  return (
    <PropertyField label={label} description={description}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PropertyField>
  );
}
```

### 7. Action Button Group

```tsx
interface ActionButtonGroupProps {
  onReset?: () => void;
  onSave?: () => void;
  onApply?: () => void;
  resetLabel?: string;
  saveLabel?: string;
  applyLabel?: string;
  isLoading?: boolean;
}

export function ActionButtonGroup({
  onReset,
  onSave,
  onApply,
  resetLabel = "Reset",
  saveLabel = "Save",
  applyLabel = "Apply",
  isLoading = false
}: ActionButtonGroupProps) {
  return (
    <div className="flex items-center gap-2">
      {onReset && (
        <Button
          variant="outline"
          onClick={onReset}
          disabled={isLoading}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      )}
      
      {onSave && (
        <Button
          variant="outline"
          onClick={onSave}
          disabled={isLoading}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saveLabel}
        </Button>
      )}
      
      {onApply && (
        <Button
          onClick={onApply}
          disabled={isLoading}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Check className="h-4 w-4" />
          {applyLabel}
        </Button>
      )}
    </div>
  );
}
```

## Layout Patterns

### 1. Grid Layout System

```tsx
// 12-column grid system
const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  12: 'grid-cols-12'
};

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

### 2. Flexbox Layouts

```tsx
// Horizontal layout with gap
<div className="flex items-center gap-4">
  {/* Content */}
</div>

// Vertical layout with gap
<div className="flex flex-col gap-4">
  {/* Content */}
</div>

// Space between layout
<div className="flex items-center justify-between">
  {/* Content */}
</div>
```

### 3. Container Patterns

```tsx
// Standard container
<div className="container mx-auto px-4">
  {/* Content */}
</div>

// Card container
<div className="bg-card border rounded-lg p-6">
  {/* Content */}
</div>

// Section container
<section className="py-8">
  <div className="container mx-auto px-4">
    {/* Content */}
  </div>
</section>
```

## Interaction Patterns

### 1. Hover Effects

```css
/* Subtle hover for clickable elements */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Color transitions */
.hover-fade {
  transition: opacity 0.2s ease;
}

.hover-fade:hover {
  opacity: 0.8;
}
```

### 2. Focus States

```css
/* Custom focus ring */
.focus-ring {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring));
}

/* Focus within containers */
.focus-within-ring:focus-within {
  box-shadow: 0 0 0 2px hsl(var(--ring));
}
```

### 3. Loading States

```tsx
// Loading spinner component
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };
  
  return (
    <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", sizeClasses[size])}>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
```

## Responsive Design

### Breakpoints
```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Responsive Utilities
```tsx
// Hide/show based on screen size
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>

// Responsive padding/margin
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>
```

## Animation Guidelines

### 1. Timing Functions
```css
/* Smooth transitions */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Bounce effect */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 2. Duration Scale
```css
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
```

### 3. Common Animations
```tsx
// Fade in/out
<div className="animate-in fade-in duration-300">
  {/* Content */}
</div>

// Slide in from bottom
<div className="animate-in slide-in-from-bottom-4 duration-300">
  {/* Content */}
</div>

// Scale in
<div className="animate-in zoom-in-95 duration-200">
  {/* Content */}
</div>
```

## Accessibility Standards

### 1. Color Contrast
- Minimum 4.5:1 ratio for normal text
- Minimum 3:1 ratio for large text
- Minimum 3:1 ratio for interactive elements

### 2. Keyboard Navigation
```tsx
// Focus trap for modals
import { FocusTrap } from '@/components/ui/focus-trap';

<FocusTrap>
  <div className="modal">
    {/* Modal content */}
  </div>
</FocusTrap>
```

### 3. Screen Reader Support
```tsx
// Proper labeling
<Label htmlFor="email">Email Address</Label>
<Input id="email" aria-describedby="email-help" />
<p id="email-help" className="sr-only">
  We'll never share your email with anyone else.
</p>

// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {status}
</div>
```

## Implementation Example

```tsx
import React, { useState } from 'react';
import {
  PropertyGrid,
  PropertySection,
  ToggleField,
  NumberField,
  SelectField,
  ActionButtonGroup
} from '@/components/ui/property-grid';

export function GridOptionsPanel() {
  const [settings, setSettings] = useState({
    rowBuffer: 10,
    disableRowVirtualisation: false,
    disableColumnVirtualisation: false,
    animateRows: true,
    enablePagination: false,
    pageSize: 100
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <PropertyGrid 
      title="Grid Options"
      actions={
        <ActionButtonGroup
          onReset={() => setSettings(defaultSettings)}
          onSave={() => console.log('Save settings')}
          onApply={() => console.log('Apply settings')}
        />
      }
    >
      <PropertySection title="Appearance & Layout" icon={<Layout className="h-4 w-4" />}>
        {/* Section content */}
      </PropertySection>
      
      <PropertySection title="Performance" icon={<Zap className="h-4 w-4" />}>
        <NumberField
          label="Row Buffer"
          description="Number of rows to render outside the visible area"
          value={settings.rowBuffer}
          onChange={(value) => handleSettingChange('rowBuffer', value)}
          min={0}
          max={100}
        />
        
        <ToggleField
          label="Disable Row Virtualisation"
          description="Turn off row virtualisation for better performance with small datasets"
          checked={settings.disableRowVirtualisation}
          onCheckedChange={(checked) => handleSettingChange('disableRowVirtualisation', checked)}
        />
        
        <ToggleField
          label="Animate Rows"
          description="Enable smooth animations when rows are added, removed, or moved"
          checked={settings.animateRows}
          onCheckedChange={(checked) => handleSettingChange('animateRows', checked)}
        />
      </PropertySection>
      
      <PropertySection title="Behavior" icon={<Settings className="h-4 w-4" />}>
        <ToggleField
          label="Enable Pagination"
          description="Split data into pages for better performance"
          checked={settings.enablePagination}
          onCheckedChange={(checked) => handleSettingChange('enablePagination', checked)}
        />
        
        <NumberField
          label="Page Size"
          description="Number of rows per page"
          value={settings.pageSize}
          onChange={(value) => handleSettingChange('pageSize', value)}
          min={10}
          max={1000}
          step={10}
        />
      </PropertySection>
    </PropertyGrid>
  );
}
```

This design language provides a comprehensive foundation for building consistent, accessible, and beautiful property grid interfaces using shadcn/ui components. 