import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { ComponentType } from '../../types';

interface ComponentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentType: ComponentType;
  onConfirm: (id: string, title: string) => void;
}

export function ComponentCreateDialog({
  open,
  onOpenChange,
  componentType,
  onConfirm,
}: ComponentCreateDialogProps) {
  const components = useAppStore((state) => state.components);
  const [customId, setCustomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [idError, setIdError] = useState('');
  const [isValidId, setIsValidId] = useState(true);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCustomId('');
      setDisplayName('New DataTable');
      setIdError('');
      setIsValidId(true);
    }
  }, [open]);

  // Validate ID uniqueness and format
  useEffect(() => {
    if (!customId) {
      setIdError('');
      setIsValidId(true);
      return;
    }

    // Check ID format (alphanumeric, hyphens, underscores)
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    if (!idPattern.test(customId)) {
      setIdError('ID can only contain letters, numbers, hyphens, and underscores');
      setIsValidId(false);
      return;
    }

    // Check uniqueness
    if (components.has(customId)) {
      setIdError('This ID already exists');
      setIsValidId(false);
      return;
    }

    setIdError('');
    setIsValidId(true);
  }, [customId, components]);

  const handleConfirm = () => {
    let finalId = customId.trim();
    
    // If no custom ID provided, let the system generate one
    if (!finalId) {
      finalId = ''; // Empty string signals system should generate
    } else if (!isValidId) {
      // Make the ID unique by appending a suffix
      let suffix = 2;
      let uniqueId = finalId;
      while (components.has(uniqueId)) {
        uniqueId = `${finalId}-${suffix}`;
        suffix++;
      }
      finalId = uniqueId;
    }

    onConfirm(finalId, displayName.trim() || 'New DataTable');
    onOpenChange(false);
  };

  const typeLabel = componentType === ComponentType.DataTable ? 'DataTable' : componentType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New {typeLabel}</DialogTitle>
          <DialogDescription>
            Customize your component with a unique ID and display name.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="component-id">
              Component ID <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="component-id"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="e.g., main-table, user-data"
                className={idError ? 'pr-10' : ''}
              />
              {customId && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {isValidId ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              )}
            </div>
            {idError && (
              <p className="text-sm text-destructive">{idError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to use auto-generated ID
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., User Data Table"
            />
            <p className="text-xs text-muted-foreground">
              This will appear in the tab header
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Create {typeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}