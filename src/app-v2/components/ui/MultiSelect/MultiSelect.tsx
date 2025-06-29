/**
 * MultiSelect Component
 * 
 * A multi-select dropdown component built with shadcn UI patterns.
 * Supports search, grouping, and custom rendering.
 */

import React, { useState, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Check, X, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { MultiSelectProps, MultiSelectHandle, Option } from './MultiSelect.types';

const sizeClasses = {
  sm: 'h-8 text-xs',
  default: 'h-10',
  lg: 'h-12 text-lg',
};

export const MultiSelect = forwardRef<MultiSelectHandle, MultiSelectProps>(
  (
    {
      options,
      value = [],
      onChange,
      placeholder = 'Select items...',
      searchPlaceholder = 'Search...',
      maxItems,
      minItems = 0,
      disabled = false,
      className,
      searchable = true,
      clearable = true,
      emptyMessage = 'No items found.',
      loading = false,
      loadingMessage = 'Loading...',
      groupBy,
      sortOptions,
      renderSelected,
      renderOption,
      showCount = false,
      maxHeight = 300,
      size = 'default',
      variant = 'outline',
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    
    // Filter and sort options
    const processedOptions = useMemo(() => {
      let filtered = options;
      
      // Filter by search
      if (search && searchable) {
        filtered = options.filter(
          (option) =>
            option.label.toLowerCase().includes(search.toLowerCase()) ||
            option.value.toLowerCase().includes(search.toLowerCase()) ||
            option.description?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Sort if provided
      if (sortOptions) {
        filtered = [...filtered].sort(sortOptions);
      }
      
      return filtered;
    }, [options, search, searchable, sortOptions]);
    
    // Group options if groupBy is provided
    const groupedOptions = useMemo(() => {
      if (!groupBy) return { '': processedOptions };
      
      return processedOptions.reduce((groups, option) => {
        const group = groupBy(option);
        if (!groups[group]) groups[group] = [];
        groups[group].push(option);
        return groups;
      }, {} as Record<string, Option[]>);
    }, [processedOptions, groupBy]);
    
    // Get selected options
    const selectedOptions = useMemo(
      () => options.filter((option) => value.includes(option.value)),
      [options, value]
    );
    
    // Handle selection toggle
    const handleSelect = useCallback(
      (optionValue: string) => {
        const newValue = value.includes(optionValue)
          ? value.filter((v) => v !== optionValue)
          : [...value, optionValue];
        
        // Check constraints
        if (maxItems && newValue.length > maxItems) return;
        if (newValue.length < minItems) return;
        
        onChange(newValue);
      },
      [value, onChange, maxItems, minItems]
    );
    
    // Handle remove
    const handleRemove = useCallback(
      (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (value.length <= minItems) return;
        onChange(value.filter((v) => v !== optionValue));
      },
      [value, onChange, minItems]
    );
    
    // Clear all selections
    const handleClear = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (minItems > 0) {
          onChange([]);
        } else {
          onChange([]);
        }
      },
      [onChange, minItems]
    );
    
    // Select all
    const handleSelectAll = useCallback(() => {
      const allValues = options
        .filter((opt) => !opt.disabled)
        .map((opt) => opt.value);
      
      if (maxItems && allValues.length > maxItems) {
        onChange(allValues.slice(0, maxItems));
      } else {
        onChange(allValues);
      }
    }, [options, onChange, maxItems]);
    
    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        clear: handleClear,
        selectAll: handleSelectAll,
        focus: () => triggerRef.current?.focus(),
        open: () => setOpen(true),
        close: () => setOpen(false),
      }),
      [handleClear, handleSelectAll]
    );
    
    // Render trigger content
    const renderTriggerContent = () => {
      if (loading) {
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">{loadingMessage}</span>
          </div>
        );
      }
      
      if (selectedOptions.length === 0) {
        return <span className="text-muted-foreground">{placeholder}</span>;
      }
      
      if (showCount && selectedOptions.length > 2) {
        return (
          <span>
            {selectedOptions.length} {selectedOptions.length === 1 ? 'item' : 'items'} selected
          </span>
        );
      }
      
      return (
        <div className="flex gap-1 flex-wrap">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="mr-1"
              onClick={(e) => handleRemove(option.value, e)}
            >
              {renderSelected ? renderSelected(option) : option.label}
              {!disabled && (
                <X className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive" />
              )}
            </Badge>
          ))}
        </div>
      );
    };
    
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant={variant}
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              'w-full justify-between',
              sizeClasses[size],
              className
            )}
          >
            {renderTriggerContent()}
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {clearable && selectedOptions.length > 0 && !disabled && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            {searchable && (
              <CommandInput
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={setSearch}
              />
            )}
            <CommandList style={{ maxHeight: `${maxHeight}px` }}>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <CommandGroup key={group} heading={group || undefined}>
                  {groupOptions.map((option) => {
                    const isSelected = value.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        onSelect={() => handleSelect(option.value)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {renderOption ? (
                          renderOption(option, isSelected)
                        ) : (
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {option.icon}
                              <span>{option.label}</span>
                            </div>
                            {option.description && (
                              <p className="text-xs text-muted-foreground">
                                {option.description}
                              </p>
                            )}
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';