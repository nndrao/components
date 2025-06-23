# Enterprise Dialog Design Language

## Overview
This design language establishes patterns and principles for creating sophisticated, professional dialog boxes that handle complex forms in enterprise applications. It emphasizes visual hierarchy, consistency, and user efficiency.

## Core Principles

### 1. Visual Hierarchy
- **Clear information architecture** with distinct sections
- **Progressive disclosure** to manage complexity
- **Consistent focal points** to guide user attention
- **Meaningful whitespace** to reduce cognitive load

### 2. Professional Aesthetics
- **Refined typography** with clear type scales
- **Subtle depth** using shadows and borders
- **Muted color palette** with purposeful accents
- **Precision alignment** creating visual harmony

### 3. Functional Efficiency
- **Logical grouping** of related fields
- **Smart defaults** to reduce input effort
- **Inline validation** for immediate feedback
- **Keyboard navigation** for power users

## Design Tokens

### Spacing System
```scss
// Base unit: 4px
$spacing-unit: 0.25rem;

// Spacing scale
$spacing: (
  0: 0,
  1: $spacing-unit,      // 4px
  2: $spacing-unit * 2,  // 8px
  3: $spacing-unit * 3,  // 12px
  4: $spacing-unit * 4,  // 16px
  5: $spacing-unit * 5,  // 20px
  6: $spacing-unit * 6,  // 24px
  8: $spacing-unit * 8,  // 32px
  10: $spacing-unit * 10, // 40px
  12: $spacing-unit * 12, // 48px
  16: $spacing-unit * 16, // 64px
);
```

### Typography Scale
```scss
// Type scale
$type-scale: (
  xs: 0.75rem,    // 12px - Labels, hints
  sm: 0.875rem,   // 14px - Body text, inputs
  base: 1rem,     // 16px - Default
  lg: 1.125rem,   // 18px - Section headers
  xl: 1.25rem,    // 20px - Dialog titles
  2xl: 1.5rem,    // 24px - Page headers
);

// Font weights
$font-weights: (
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
);

// Line heights
$line-heights: (
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
);
```

### Color System
```scss
// Enterprise color palette
$colors: (
  // Backgrounds
  dialog-bg: hsl(0, 0%, 100%),
  section-bg: hsl(210, 20%, 98%),
  input-bg: hsl(0, 0%, 100%),
  
  // Borders
  border-default: hsl(214, 32%, 91%),
  border-focus: hsl(215, 20%, 65%),
  border-error: hsl(0, 84%, 60%),
  
  // Text
  text-primary: hsl(222, 47%, 11%),
  text-secondary: hsl(215, 20%, 65%),
  text-muted: hsl(215, 16%, 47%),
  
  // Accents
  accent-primary: hsl(215, 50%, 50%),
  accent-success: hsl(142, 76%, 36%),
  accent-warning: hsl(38, 92%, 50%),
  accent-error: hsl(0, 84%, 60%),
);
```

## Component Patterns

### Dialog Structure

```tsx
// Standard dialog layout
<Dialog>
  <DialogHeader>
    <DialogTitle />
    <DialogDescription />
  </DialogHeader>
  
  <DialogBody>
    <DialogSection>
      <SectionHeader />
      <SectionContent />
    </DialogSection>
  </DialogBody>
  
  <DialogFooter>
    <DialogActions />
  </DialogFooter>
</Dialog>
```

### Form Layouts

#### 1. Single Column Layout
Best for: Simple forms, mobile-first designs
```
┌─────────────────────────┐
│ Field Label             │
│ [Input Field          ] │
│                         │
│ Field Label             │
│ [Input Field          ] │
└─────────────────────────┘
```

#### 2. Two Column Layout
Best for: Medium complexity forms
```
┌───────────────┬─────────────────┐
│ Field Label   │ Field Label     │
│ [Input      ] │ [Input        ] │
│               │                 │
│ Field Label   │ Field Label     │
│ [Input      ] │ [Input        ] │
└───────────────┴─────────────────┘
```

#### 3. Section-Based Layout
Best for: Complex forms with multiple contexts
```
┌─────────────────────────────────┐
│ ▼ Section Title                 │
│ ┌─────────────────────────────┐ │
│ │ Field Group 1               │ │
│ │ [Input] [Input] [Input]     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ▼ Section Title                 │
│ ┌─────────────────────────────┐ │
│ │ Field Group 2               │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Input Field Specifications

#### Standard Input Field
```scss
.input-field {
  // Dimensions
  height: 40px;
  padding: 0 12px;
  
  // Typography
  font-size: 14px;
  line-height: 1.5;
  
  // Borders
  border: 1px solid $border-default;
  border-radius: 6px;
  
  // States
  &:hover {
    border-color: $border-focus;
  }
  
  &:focus {
    outline: none;
    border-color: $accent-primary;
    box-shadow: 0 0 0 3px rgba($accent-primary, 0.1);
  }
  
  &:disabled {
    background: $section-bg;
    cursor: not-allowed;
  }
}
```

#### Field Label
```scss
.field-label {
  display: block;
  margin-bottom: 6px;
  
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  
  // Required indicator
  &.required::after {
    content: " *";
    color: $accent-error;
  }
}
```

#### Help Text
```scss
.help-text {
  margin-top: 4px;
  font-size: 12px;
  color: $text-muted;
}
```

### Button Hierarchy

```scss
// Primary action - Most important
.btn-primary {
  background: $accent-primary;
  color: white;
  min-width: 100px;
  height: 36px;
  padding: 0 16px;
  font-weight: 500;
}

// Secondary action
.btn-secondary {
  background: transparent;
  border: 1px solid $border-default;
  color: $text-primary;
}

// Tertiary action
.btn-tertiary {
  background: transparent;
  color: $text-secondary;
  text-decoration: underline;
}
```

## Layout Patterns

### Form Section Component
```tsx
interface FormSectionProps {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  collapsible = false,
  defaultExpanded = true,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="form-section">
      <div className="section-header" onClick={() => collapsible && setIsExpanded(!isExpanded)}>
        {collapsible && <ChevronIcon className={isExpanded ? 'expanded' : ''} />}
        <div>
          <h3 className="section-title">{title}</h3>
          {description && <p className="section-description">{description}</p>}
        </div>
      </div>
      {isExpanded && <div className="section-content">{children}</div>}
    </div>
  );
};
```

### Field Group Component
```tsx
interface FieldGroupProps {
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const FieldGroup: React.FC<FieldGroupProps> = ({
  columns = 1,
  gap = 'md',
  children
}) => {
  return (
    <div 
      className={`field-group columns-${columns} gap-${gap}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gap === 'sm' ? '12px' : gap === 'md' ? '16px' : '24px'
      }}
    >
      {children}
    </div>
  );
};
```

## Responsive Behavior

### Breakpoints
```scss
$breakpoints: (
  sm: 640px,   // Mobile
  md: 768px,   // Tablet
  lg: 1024px,  // Desktop
  xl: 1280px,  // Large desktop
);
```

### Dialog Sizing
```scss
.dialog {
  // Mobile first
  width: 100%;
  max-width: calc(100vw - 32px);
  
  @media (min-width: $breakpoint-md) {
    width: auto;
    min-width: 600px;
    max-width: 900px;
  }
  
  @media (min-width: $breakpoint-lg) {
    min-width: 700px;
    max-width: 1200px;
  }
}
```

## Interaction Patterns

### Tab Navigation
- Support keyboard navigation between sections
- Clear focus indicators
- Logical tab order

### Validation
- Real-time validation for critical fields
- Batch validation on section completion
- Clear error messaging
- Success indicators

### Loading States
- Skeleton screens for data loading
- Progress indicators for multi-step processes
- Disabled states during submission

## Accessibility Guidelines

### ARIA Labels
```tsx
<div role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-description">
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-description">Dialog description</p>
</div>
```

### Focus Management
- Auto-focus first interactive element
- Trap focus within dialog
- Return focus on close

### Color Contrast
- Minimum WCAG AA compliance
- 4.5:1 for normal text
- 3:1 for large text

## Implementation Examples

### Complex Form Dialog
```tsx
<Dialog className="enterprise-dialog">
  <DialogHeader className="dialog-header">
    <DialogTitle>Configure Data Source</DialogTitle>
    <DialogDescription>
      Set up your data connection and field mappings
    </DialogDescription>
  </DialogHeader>
  
  <DialogBody className="dialog-body">
    <Tabs defaultValue="connection">
      <TabsList className="dialog-tabs">
        <TabsTrigger value="connection">Connection</TabsTrigger>
        <TabsTrigger value="fields">Fields & Columns</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      
      <TabsContent value="connection">
        <FormSection title="Basic Configuration">
          <FieldGroup columns={2}>
            <Field label="Name" required>
              <Input placeholder="Enter datasource name" />
            </Field>
            <Field label="Type">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="websocket">WebSocket</SelectItem>
                  <SelectItem value="rest">REST API</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </FormSection>
        
        <FormSection title="Connection Details">
          <FieldGroup>
            <Field label="URL" required>
              <Input type="url" placeholder="https://api.example.com" />
            </Field>
            <Field label="Authentication">
              <RadioGroup>
                <RadioGroupItem value="none" label="None" />
                <RadioGroupItem value="basic" label="Basic Auth" />
                <RadioGroupItem value="oauth" label="OAuth 2.0" />
              </RadioGroup>
            </Field>
          </FieldGroup>
        </FormSection>
      </TabsContent>
    </Tabs>
  </DialogBody>
  
  <DialogFooter className="dialog-footer">
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save Configuration</Button>
  </DialogFooter>
</Dialog>
```

## Best Practices

### Do's
- ✓ Group related fields together
- ✓ Use consistent spacing throughout
- ✓ Provide clear labels and help text
- ✓ Show field requirements upfront
- ✓ Use progressive disclosure for complex forms
- ✓ Maintain visual hierarchy with typography
- ✓ Test with real data to ensure layouts work

### Don'ts
- ✗ Don't overcrowd sections
- ✗ Don't use more than 3 columns on desktop
- ✗ Don't hide critical information
- ✗ Don't use inconsistent field sizes
- ✗ Don't forget loading and error states
- ✗ Don't neglect keyboard navigation

## Component Library Integration

This design language is built to work seamlessly with:
- **shadcn/ui** components
- **Radix UI** primitives
- **Tailwind CSS** utilities
- **React Hook Form** for form management
- **Zod** for validation schemas