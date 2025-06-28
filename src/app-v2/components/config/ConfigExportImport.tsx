import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { configExportImportService, ImportOptions, ImportResult, ExportData } from '@/app-v2/services/config-export-import.service';
import { useToast } from '@/hooks/use-toast';

export const ConfigExportImport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ExportData | null>(null);
  
  // Export options
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  
  // Import options
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [includeSettings, setIncludeSettings] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const configTypes = [
    { value: 'Workspace', label: 'Workspaces' },
    { value: 'DataTable', label: 'Data Tables' },
    { value: 'Chart', label: 'Charts' },
    { value: 'Filter', label: 'Filters' },
    { value: 'Layout', label: 'Layouts' },
    { value: 'DataSource', label: 'Data Sources' },
    { value: 'Profile', label: 'Profiles' },
    { value: 'Template', label: 'Templates' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let exportData: ExportData;
      
      if (exportScope === 'all') {
        exportData = await configExportImportService.exportAll();
      } else {
        const types = Array.from(selectedTypes);
        exportData = await configExportImportService.exportByType(types);
      }
      
      await configExportImportService.downloadExport(exportData);
      
      toast({
        title: 'Export Successful',
        description: 'Configuration exported successfully',
      });
    } catch {
      toast({
        title: 'Export Failed',
        description: 'Failed to export configuration',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      setImportData(data);
    } catch {
      toast({
        title: 'Invalid File',
        description: 'The selected file is not a valid configuration export',
        variant: 'destructive',
      });
      setSelectedFile(null);
      setImportData(null);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    setIsImporting(true);
    try {
      const options: ImportOptions = {
        overwrite: overwriteExisting,
        includeSettings,
      };

      const result = await configExportImportService.importData(importData, options);
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: 'Configuration imported successfully',
        });
      } else {
        toast({
          title: 'Import Completed with Errors',
          description: 'Some items could not be imported. Check the results below.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Import Failed',
        description: 'Failed to import configuration',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleTypeToggle = (type: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration Export/Import</CardTitle>
        <CardDescription>
          Export or import your application configuration including workspaces, components, profiles, and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <RadioGroup value={exportScope} onValueChange={(value: 'all' | 'selected') => setExportScope(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="export-all" />
                  <Label htmlFor="export-all">Export all configurations</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="export-selected" />
                  <Label htmlFor="export-selected">Export selected types only</Label>
                </div>
              </RadioGroup>

              {exportScope === 'selected' && (
                <div className="space-y-2 ml-6">
                  {configTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`export-${type.value}`}
                        checked={selectedTypes.has(type.value)}
                        onCheckedChange={() => handleTypeToggle(type.value)}
                      />
                      <Label htmlFor={`export-${type.value}`}>{type.label}</Label>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={handleExport} 
                disabled={isExporting || (exportScope === 'selected' && selectedTypes.size === 0)}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Configuration
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
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
                  <Upload className="mr-2 h-4 w-4" />
                  Select Export File
                </Button>
              </div>

              {selectedFile && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Selected: {selectedFile.name}
                  </AlertDescription>
                </Alert>
              )}

              {importData && (
                <>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Export version: {importData.version}</p>
                    <p>Export date: {new Date(importData.exportDate).toLocaleString()}</p>
                    <p>Items to import:</p>
                    <ul className="ml-4 space-y-1">
                      <li>• Workspaces: {importData.configs.workspaces.length}</li>
                      <li>• Components: {importData.configs.components.length}</li>
                      <li>• Profiles: {importData.configs.profiles.length}</li>
                      <li>• Data Sources: {importData.configs.dataSources.length}</li>
                      <li>• Templates: {importData.configs.templates.length}</li>
                      <li>• Other: {importData.configs.other.length}</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwrite"
                        checked={overwriteExisting}
                        onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
                      />
                      <Label htmlFor="overwrite">
                        Overwrite existing configurations
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-settings"
                        checked={includeSettings}
                        onCheckedChange={(checked) => setIncludeSettings(checked as boolean)}
                      />
                      <Label htmlFor="include-settings">
                        Import application settings
                      </Label>
                    </div>
                  </div>

                  <Button 
                    onClick={handleImport} 
                    disabled={isImporting}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Configuration
                      </>
                    )}
                  </Button>
                </>
              )}

              {importResult && (
                <Alert className={importResult.success ? '' : 'border-destructive'}>
                  {importResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">
                        {importResult.success ? 'Import completed successfully' : 'Import completed with errors'}
                      </p>
                      <p>Imported items:</p>
                      <ul className="ml-4 space-y-1 text-sm">
                        <li>• Workspaces: {importResult.imported.workspaces}</li>
                        <li>• Components: {importResult.imported.components}</li>
                        <li>• Profiles: {importResult.imported.profiles}</li>
                        <li>• Data Sources: {importResult.imported.dataSources}</li>
                        <li>• Templates: {importResult.imported.templates}</li>
                        <li>• Other: {importResult.imported.other}</li>
                        <li>• Settings: {importResult.imported.settings ? 'Yes' : 'No'}</li>
                      </ul>
                      {importResult.errors.length > 0 && (
                        <>
                          <p>Errors:</p>
                          <ul className="ml-4 space-y-1 text-sm text-destructive">
                            {importResult.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};