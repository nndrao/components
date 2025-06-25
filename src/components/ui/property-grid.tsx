import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  X, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Save, 
  Check 
} from "lucide-react";

// Property Grid Container
interface PropertyGridProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  onClose?: () => void;
  searchable?: boolean;
  onSearch?: (value: string) => void;
}

export function PropertyGrid({ 
  title, 
  children, 
  className, 
  actions, 
  onClose,
  searchable = true,
  onSearch 
}: PropertyGridProps) {
  const [searchValue, setSearchValue] = React.useState("");

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <div className={cn("bg-card border rounded-lg shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              className="pl-9 bg-muted border-0"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}
      
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

// Property Section (Collapsible)
interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function PropertySection({ 
  title, 
  children, 
  defaultExpanded = true,
  icon,
  className 
}: PropertySectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Collapsible defaultOpen={defaultExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors [&[data-state=open]>svg]:rotate-180">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Property Field Base Layout
interface PropertyFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function PropertyField({ 
  label, 
  description, 
  children, 
  required,
  className 
}: PropertyFieldProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 items-start", className)}>
      <div className="space-y-1">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
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

// Toggle Switch Field
interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ToggleField({ 
  label, 
  description, 
  checked, 
  onCheckedChange,
  required = false,
  disabled = false,
  className 
}: ToggleFieldProps) {
  return (
    <PropertyField 
      label={label} 
      description={description} 
      required={required}
      className={className}
    >
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </PropertyField>
  );
}

// Number Input Field
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

export function NumberField({ 
  label, 
  description, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1,
  required = false,
  disabled = false,
  className 
}: NumberFieldProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = value + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = value - step;
    if (min === undefined || newValue >= min) {
      onChange(newValue);
    }
  };

  return (
    <PropertyField 
      label={label} 
      description={description} 
      required={required}
      className={className}
    >
      <div className="flex items-center gap-2 w-full">
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="flex-1"
        />
        <div className="flex flex-col">
          <Button
            variant="outline"
            size="sm"
            className="h-5 w-8 p-0 rounded-t-md rounded-b-none border-b-0"
            onClick={handleIncrement}
            disabled={disabled || (max !== undefined && value >= max)}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-5 w-8 p-0 rounded-b-md rounded-t-none"
            onClick={handleDecrement}
            disabled={disabled || (min !== undefined && value <= min)}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </PropertyField>
  );
}

// Select Field
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

export function SelectField({ 
  label, 
  description, 
  value, 
  onValueChange, 
  options, 
  placeholder = "Select an option...",
  required = false,
  disabled = false,
  className 
}: SelectFieldProps) {
  return (
    <PropertyField 
      label={label} 
      description={description} 
      required={required}
      className={className}
    >
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </PropertyField>
  );
}

// Text Input Field
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

export function TextField({ 
  label, 
  description, 
  value, 
  onChange, 
  placeholder,
  required = false,
  disabled = false,
  type = "text",
  className 
}: TextFieldProps) {
  return (
    <PropertyField 
      label={label} 
      description={description} 
      required={required}
      className={className}
    >
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
    </PropertyField>
  );
}

// Action Button Group
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

export function ActionButtonGroup({
  onReset,
  onSave,
  onApply,
  resetLabel = "Reset",
  saveLabel = "Save",
  applyLabel = "Apply",
  isLoading = false,
  className
}: ActionButtonGroupProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
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

// Loading Spinner
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };
  
  return (
    <div className={cn(
      "animate-spin rounded-full border-2 border-current border-t-transparent", 
      sizeClasses[size],
      className
    )}>
      <span className="sr-only">Loading...</span>
    </div>
  );
} 