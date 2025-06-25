# Property Grid Design Language - Usage Guide

## Overview

This guide demonstrates how to implement the Property Grid Design Language in your application. The design language provides a consistent, accessible, and beautiful way to create configuration interfaces using shadcn/ui components.

## Quick Start

### 1. Import the Components

```tsx
import {
  PropertyGrid,
  PropertySection,
  ToggleField,
  NumberField,
  SelectField,
  TextField,
  ActionButtonGroup
} from '@/components/ui/property-grid';
```

### 2. Import the CSS (if needed)

```tsx
import '@/styles/property-grid.css';
```

### 3. Basic Implementation

```tsx
export function BasicPropertyGrid() {
  const [settings, setSettings] = useState({
    enabled: true,
    maxItems: 10,
    theme: 'dark'
  });

  return (
    <PropertyGrid title="Basic Settings">
      <ToggleField
        label="Enable Feature"
        checked={settings.enabled}
        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
      />
      
      <NumberField
        label="Max Items"
        value={settings.maxItems}
        onChange={(value) => setSettings(prev => ({ ...prev, maxItems: value }))}
        min={1}
        max={100}
      />
      
      <SelectField
        label="Theme"
        value={settings.theme}
        onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' }
        ]}
      />
    </PropertyGrid>
  );
}
```

## Component Reference

### PropertyGrid

The main container component that provides the overall structure.

```tsx
interface PropertyGridProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  onClose?: () => void;
  searchable?: boolean;
  onSearch?: (value: string) => void;
}
```

**Example:**
```tsx
<PropertyGrid 
  title="Grid Configuration"
  searchable={true}
  onSearch={(value) => console.log('Search:', value)}
  onClose={() => setOpen(false)}
  actions={
    <ActionButtonGroup
      onReset={() => resetSettings()}
      onSave={() => saveSettings()}
      onApply={() => applySettings()}
    />
  }
>
  {/* Property fields */}
</PropertyGrid>
```

### PropertySection

Groups related properties into collapsible sections.

```tsx
interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  className?: string;
}
```

**Example:**
```tsx
<PropertySection 
  title="Performance Settings" 
  icon={<Zap className="h-4 w-4" />}
  defaultExpanded={true}
>
  <NumberField label="Buffer Size" value={buffer} onChange={setBuffer} />
  <ToggleField label="Enable Cache" checked={cache} onCheckedChange={setCache} />
</PropertySection>
```

### ToggleField

A toggle switch with label and description.

```tsx
interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}
```

**Example:**
```tsx
<ToggleField
  label="Enable Notifications"
  description="Receive alerts when important events occur"
  checked={notifications}
  onCheckedChange={setNotifications}
  required={true}
/>
```

### NumberField

A number input with increment/decrement buttons.

```tsx
interface NumberFieldProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}
```

**Example:**
```tsx
<NumberField
  label="Connection Timeout"
  description="Timeout in seconds for network connections"
  value={timeout}
  onChange={setTimeout}
  min={1}
  max={300}
  step={5}
/>
```

### SelectField

A dropdown select with options.

```tsx
interface SelectFieldProps {
  label: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}
```

**Example:**
```tsx
<SelectField
  label="Log Level"
  description="Choose the minimum level for log messages"
  value={logLevel}
  onValueChange={setLogLevel}
  options={[
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warning' },
    { value: 'error', label: 'Error' }
  ]}
  placeholder="Select log level..."
/>
```

### TextField

A text input field.

```tsx
interface TextFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  type?: "text" | "email" | "url" | "password";
  className?: string;
}
```

**Example:**
```tsx
<TextField
  label="API Endpoint"
  description="Base URL for API requests"
  value={apiUrl}
  onChange={setApiUrl}
  type="url"
  placeholder="https://api.example.com"
  required={true}
/>
```

### ActionButtonGroup

A group of action buttons (Reset, Save, Apply).

```tsx
interface ActionButtonGroupProps {
  onReset?: () => void;
  onSave?: () => void;
  onApply?: () => void;
  resetLabel?: string;
  saveLabel?: string;
  applyLabel?: string;
  isLoading?: boolean;
  className?: string;
}
```

**Example:**
```tsx
<ActionButtonGroup
  onReset={() => setSettings(defaultSettings)}
  onSave={handleSave}
  onApply={handleApply}
  resetLabel="Reset to Defaults"
  saveLabel="Save Configuration"
  applyLabel="Apply Changes"
  isLoading={isSaving}
/>
```

## Advanced Patterns

### 1. Conditional Fields

Show/hide fields based on other field values:

```tsx
export function ConditionalFields() {
  const [enableAdvanced, setEnableAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState({
    timeout: 30,
    retries: 3
  });

  return (
    <PropertyGrid title="Network Settings">
      <ToggleField
        label="Enable Advanced Settings"
        checked={enableAdvanced}
        onCheckedChange={setEnableAdvanced}
      />
      
      {enableAdvanced && (
        <PropertySection title="Advanced" defaultExpanded={true}>
          <NumberField
            label="Timeout"
            value={advancedSettings.timeout}
            onChange={(value) => setAdvancedSettings(prev => ({ ...prev, timeout: value }))}
            min={1}
            max={300}
          />
          
          <NumberField
            label="Retry Attempts"
            value={advancedSettings.retries}
            onChange={(value) => setAdvancedSettings(prev => ({ ...prev, retries: value }))}
            min={0}
            max={10}
          />
        </PropertySection>
      )}
    </PropertyGrid>
  );
}
```

### 2. Dynamic Options

Generate select options dynamically:

```tsx
export function DynamicOptions() {
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');

  const categories = [
    { value: 'ui', label: 'User Interface' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security' }
  ];

  const subcategories = useMemo(() => {
    const subcategoryMap = {
      ui: [
        { value: 'theme', label: 'Theme' },
        { value: 'layout', label: 'Layout' }
      ],
      performance: [
        { value: 'caching', label: 'Caching' },
        { value: 'optimization', label: 'Optimization' }
      ],
      security: [
        { value: 'authentication', label: 'Authentication' },
        { value: 'encryption', label: 'Encryption' }
      ]
    };
    return subcategoryMap[category] || [];
  }, [category]);

  useEffect(() => {
    // Reset subcategory when category changes
    setSubcategory('');
  }, [category]);

  return (
    <PropertyGrid title="Category Settings">
      <SelectField
        label="Category"
        value={category}
        onValueChange={setCategory}
        options={categories}
        placeholder="Select category..."
      />
      
      {category && (
        <SelectField
          label="Subcategory"
          value={subcategory}
          onValueChange={setSubcategory}
          options={subcategories}
          placeholder="Select subcategory..."
        />
      )}
    </PropertyGrid>
  );
}
```

### 3. Validation and Error Handling

Add validation to your property fields:

```tsx
export function ValidatedFields() {
  const [email, setEmail] = useState('');
  const [port, setPort] = useState(8080);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors(prev => {
        const { email, ...rest } = prev;
        return rest;
      });
    }
  };

  const validatePort = (value: number) => {
    if (value < 1 || value > 65535) {
      setErrors(prev => ({ ...prev, port: 'Port must be between 1 and 65535' }));
    } else {
      setErrors(prev => {
        const { port, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <PropertyGrid title="Server Configuration">
      <div className="space-y-4">
        <TextField
          label="Email Address"
          value={email}
          onChange={(value) => {
            setEmail(value);
            validateEmail(value);
          }}
          type="email"
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>
      
      <div className="space-y-4">
        <NumberField
          label="Port"
          value={port}
          onChange={(value) => {
            setPort(value);
            validatePort(value);
          }}
          min={1}
          max={65535}
          className={errors.port ? 'border-destructive' : ''}
        />
        {errors.port && (
          <p className="text-sm text-destructive">{errors.port}</p>
        )}
      </div>
    </PropertyGrid>
  );
}
```

### 4. Search and Filtering

Implement search functionality:

```tsx
export function SearchablePropertyGrid() {
  const [searchTerm, setSearchTerm] = useState('');
  const [settings] = useState([
    { key: 'enableNotifications', label: 'Enable Notifications', type: 'toggle' },
    { key: 'maxConnections', label: 'Max Connections', type: 'number' },
    { key: 'serverUrl', label: 'Server URL', type: 'text' },
    { key: 'logLevel', label: 'Log Level', type: 'select' }
  ]);

  const filteredSettings = useMemo(() => {
    if (!searchTerm) return settings;
    return settings.filter(setting =>
      setting.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [settings, searchTerm]);

  return (
    <PropertyGrid 
      title="All Settings"
      searchable={true}
      onSearch={setSearchTerm}
    >
      {filteredSettings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No settings match your search
        </div>
      ) : (
        filteredSettings.map((setting) => (
          <div key={setting.key}>
            {/* Render appropriate field based on setting.type */}
            {setting.type === 'toggle' && (
              <ToggleField
                label={setting.label}
                checked={true}
                onCheckedChange={() => {}}
              />
            )}
            {/* Add other field types as needed */}
          </div>
        ))
      )}
    </PropertyGrid>
  );
}
```

### 5. Async Operations

Handle async operations with loading states:

```tsx
export function AsyncPropertyGrid() {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <PropertyGrid 
      title="Remote Settings"
      actions={
        <ActionButtonGroup
          onSave={saveSettings}
          isLoading={isSaving}
        />
      }
    >
      {/* Your property fields */}
    </PropertyGrid>
  );
}
```

## Best Practices

### 1. Grouping and Organization

- Group related settings into logical sections
- Use descriptive icons for sections
- Keep section titles concise but descriptive
- Order sections by importance or frequency of use

### 2. Field Labels and Descriptions

- Use clear, concise labels
- Provide helpful descriptions for complex settings
- Be consistent with terminology
- Use sentence case for labels

### 3. Default Values and Validation

- Provide sensible default values
- Validate inputs and show clear error messages
- Use appropriate input constraints (min/max, required)
- Consider the user experience when validation fails

### 4. Responsive Design

- Test your property grids on different screen sizes
- Consider mobile-first design principles
- Use the responsive grid system appropriately
- Ensure touch targets are appropriately sized

### 5. Accessibility

- Use proper ARIA labels and descriptions
- Ensure keyboard navigation works correctly
- Maintain proper color contrast ratios
- Support screen readers with semantic markup

### 6. Performance

- Use React.memo for expensive components
- Implement proper debouncing for search
- Consider virtualization for large property lists
- Minimize re-renders with proper state management

## Theme Integration

The property grid design language integrates seamlessly with shadcn/ui themes:

### Dark Theme Example

```tsx
export function ThemedPropertyGrid() {
  return (
    <div className="dark"> {/* or data-theme="dark" */}
      <PropertyGrid title="Dark Theme Example">
        {/* Your property fields */}
      </PropertyGrid>
    </div>
  );
}
```

### Custom Theme Variables

You can override the default theme variables:

```css
:root {
  --pg-background: hsl(240 10% 3.9%);
  --pg-foreground: hsl(0 0% 98%);
  --pg-muted: hsl(240 3.7% 15.9%);
  --pg-muted-foreground: hsl(240 5% 64.9%);
  --pg-border: hsl(240 3.7% 15.9%);
}
```

## Common Patterns Summary

1. **Basic Configuration**: Simple settings with toggles, numbers, and selects
2. **Advanced Settings**: Conditional fields and complex validation
3. **Multi-step Configuration**: Wizard-like interfaces using sections
4. **Real-time Settings**: Live preview of changes
5. **Bulk Operations**: Mass editing of multiple items
6. **Import/Export**: Loading and saving configuration files

This design language provides a solid foundation for building consistent, accessible, and beautiful property grid interfaces throughout your application. 