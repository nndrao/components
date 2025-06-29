/**
 * ProfileImportExport Component
 * 
 * Handles importing and exporting profile configurations.
 * Supports JSON format and validation of imported data.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Upload,
  FileJson,
  AlertCircle,
  Check,
  X,
  Copy,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useConfigStore } from '../../stores/config.store';
import { Config } from '../../services/config';
import { isConfig } from '../../services/config/config.types';
import { generateConfigId } from '../../utils/config.utils';

interface ProfileImportExportProps {
  /**
   * Component type for filtering profiles
   */
  componentType: string;
  /**
   * Whether dialog is open
   */
  open: boolean;
  /**
   * Callback when dialog closes
   */
  onClose: () => void;
  /**
   * Initial mode (import or export)
   */
  mode?: 'import' | 'export';
  /**
   * Profiles to export (for export mode)
   */
  profilesToExport?: Config[];
  /**
   * Callback after successful import
   */
  onImportComplete?: (profiles: Config[]) => void;
}

interface ImportValidationResult {
  valid: boolean;
  profiles: Config[];
  errors: string[];
  warnings: string[];
}

export function ProfileImportExport({
  componentType,
  open,
  onClose,
  mode = 'export',
  profilesToExport = [],
  onImportComplete,
}: ProfileImportExportProps) {
  const { saveMany } = useConfigStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [activeTab, setActiveTab] = useState(mode);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(
    profilesToExport.map((p) => p.configId)
  );
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate export JSON
  const generateExportJson = useCallback(() => {
    const profiles = profilesToExport.filter((p) => selectedProfiles.includes(p.configId));
    
    // Clean up profiles for export
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      componentType,
      profiles: profiles.map((profile) => ({
        ...profile,
        // Remove system fields that will be regenerated
        configId: undefined,
        createdBy: undefined,
        updatedBy: undefined,
        creationTime: undefined,
        lastUpdated: undefined,
        // Preserve everything else
      })),
    };

    setExportText(JSON.stringify(exportData, null, 2));
  }, [profilesToExport, selectedProfiles, componentType]);

  // Validate import data
  const validateImport = useCallback((text: string): ImportValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const profiles: Config[] = [];

    try {
      const data = JSON.parse(text);

      // Check version
      if (!data.version) {
        errors.push('Missing version field in import data');
      }

      // Check component type
      if (data.componentType && data.componentType !== componentType) {
        warnings.push(
          `Import data is for component type "${data.componentType}" but current component is "${componentType}"`
        );
      }

      // Validate profiles
      if (!Array.isArray(data.profiles)) {
        errors.push('Import data must contain a "profiles" array');
      } else {
        data.profiles.forEach((profile: any, index: number) => {
          // Check required fields
          if (!profile.name) {
            errors.push(`Profile ${index + 1}: Missing required field "name"`);
          }
          if (!profile.settings) {
            errors.push(`Profile ${index + 1}: Missing required field "settings"`);
          }

          // Create new profile with generated IDs
          const newProfile: Config = {
            configId: generateConfigId(componentType),
            appId: 'app',
            userId: 'current-user',
            componentType: `${componentType}.Profile`,
            name: profile.name || `Imported Profile ${index + 1}`,
            settings: profile.settings || {},
            description: profile.description,
            tags: profile.tags,
            icon: profile.icon,
            color: profile.color,
            isPublic: profile.isPublic,
            isTemplate: profile.isTemplate,
            sharedWith: profile.sharedWith,
            permissions: profile.permissions,
            createdBy: 'current-user',
            creationTime: Date.now(),
          };

          // Validate as Config object
          if (isConfig(newProfile)) {
            profiles.push(newProfile);
          } else {
            errors.push(`Profile ${index + 1}: Invalid profile structure`);
          }
        });
      }
    } catch (error) {
      errors.push(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      profiles,
      errors,
      warnings,
    };
  }, [componentType]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
      const result = validateImport(text);
      setValidation(result);
    };
    reader.readAsText(file);
  }, [validateImport]);

  // Handle text change
  const handleImportTextChange = useCallback((text: string) => {
    setImportText(text);
    if (text.trim()) {
      const result = validateImport(text);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [validateImport]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!validation || !validation.valid) return;

    setImporting(true);
    try {
      await saveMany(validation.profiles);
      onImportComplete?.(validation.profiles);
      onClose();
    } catch (error) {
      // Error handling is done in the store
    } finally {
      setImporting(false);
    }
  }, [validation, saveMany, onImportComplete, onClose]);

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [exportText]);

  // Handle download
  const handleDownload = useCallback(() => {
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentType}-profiles-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportText, componentType]);

  // Toggle profile selection
  const toggleProfileSelection = useCallback((profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  }, []);

  // Select/deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedProfiles.length === profilesToExport.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(profilesToExport.map((p) => p.configId));
    }
  }, [selectedProfiles, profilesToExport]);

  // Initialize export text when tab changes
  React.useEffect(() => {
    if (activeTab === 'export' && selectedProfiles.length > 0) {
      generateExportJson();
    }
  }, [activeTab, generateExportJson, selectedProfiles]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import/Export Profiles</DialogTitle>
          <DialogDescription>
            Import profiles from a JSON file or export selected profiles for sharing and backup.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="mr-2 h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              {/* File upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Select JSON File
                </Button>
              </div>

              {/* Text input */}
              <div className="space-y-2">
                <Label>Or paste JSON data directly:</Label>
                <Textarea
                  value={importText}
                  onChange={(e) => handleImportTextChange(e.target.value)}
                  placeholder='{"version": "1.0", "profiles": [...]}'
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              {/* Validation results */}
              {validation && (
                <div className="space-y-2">
                  {validation.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Validation Errors</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2">
                          {validation.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {validation.warnings.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Warnings</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2">
                          {validation.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {validation.valid && validation.profiles.length > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Ready to Import</AlertTitle>
                      <AlertDescription>
                        {validation.profiles.length} profile{validation.profiles.length > 1 ? 's' : ''}{' '}
                        will be imported.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            {profilesToExport.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>No profiles available to export.</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Profile selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select profiles to export:</Label>
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedProfiles.length === profilesToExport.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>
                  <ScrollArea className="h-48 rounded-md border p-4">
                    <div className="space-y-2">
                      {profilesToExport.map((profile) => (
                        <div key={profile.configId} className="flex items-center space-x-2">
                          <Checkbox
                            id={profile.configId}
                            checked={selectedProfiles.includes(profile.configId)}
                            onCheckedChange={() => toggleProfileSelection(profile.configId)}
                          />
                          <label
                            htmlFor={profile.configId}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{profile.name}</div>
                            {profile.settings?.description && (
                              <div className="text-xs text-muted-foreground">
                                {profile.settings.description}
                              </div>
                            )}
                          </label>
                          <div className="flex gap-1">
                            {profile.isGlobal && (
                              <Badge variant="secondary" className="text-xs">
                                Global
                              </Badge>
                            )}
                            {profile.isTemplate && (
                              <Badge variant="secondary" className="text-xs">
                                Template
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Export preview */}
                {selectedProfiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Export Preview:</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="text-xs"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={exportText}
                      readOnly
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === 'import' ? (
            <Button
              onClick={handleImport}
              disabled={!validation?.valid || importing}
            >
              {importing ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Profiles
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDownload}
              disabled={selectedProfiles.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}