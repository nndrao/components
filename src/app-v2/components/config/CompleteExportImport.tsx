import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Database, HardDrive, Info } from 'lucide-react';
import { completeExportImportService, CompleteImportOptions, CompleteImportResult, CompleteExportData } from '@/app-v2/services/complete-export-import.service';
import { useToast } from '@/hooks/use-toast';

export const CompleteExportImport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CompleteImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<CompleteExportData | null>(null);
  const [dataStats, setDataStats] = useState<Awaited<ReturnType<typeof completeExportImportService.getDataStatistics>> | null>(null);
  
  // Import options
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [includeIndexedDB, setIncludeIndexedDB] = useState(true);
  const [includeLocalStorage, setIncludeLocalStorage] = useState(true);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load data statistics on mount
  useEffect(() => {
    loadDataStatistics();
  }, []);

  const loadDataStatistics = async () => {
    try {
      const stats = await completeExportImportService.getDataStatistics();
      setDataStats(stats);
    } catch (error) {
      console.error('Failed to load data statistics:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await completeExportImportService.exportComplete();
      await completeExportImportService.downloadCompleteExport(exportData);
      
      toast({
        title: 'Export Successful',
        description: `Exported ${exportData.metadata.totalConfigs} configurations and ${exportData.metadata.totalLocalStorageKeys} settings`,
      });

      // Reload statistics
      await loadDataStatistics();
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
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
      const data = JSON.parse(text) as CompleteExportData;
      setImportData(data);
    } catch {
      toast({
        title: 'Invalid File',
        description: 'The selected file is not a valid export file',
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
      const options: CompleteImportOptions = {
        overwrite: overwriteExisting,
        includeIndexedDB,
        includeLocalStorage,
        clearBeforeImport,
      };

      const result = await completeExportImportService.importComplete(importData, options);
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: `Imported ${result.imported.indexedDBRecords} configurations and ${result.imported.localStorageKeys} settings`,
        });
      } else {
        toast({
          title: 'Import Completed with Errors',
          description: 'Some items could not be imported. Check the results below.',
          variant: 'destructive',
        });
      }

      // Reload statistics
      await loadDataStatistics();
      
      // Reload the page after a short delay to apply all imported settings
      if (result.success && result.imported.localStorageKeys > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import data',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Data Export/Import</CardTitle>
        <CardDescription>
          Export or import all application data including configurations, workspaces, and settings
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
              {dataStats && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Current Data Summary:</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span className="font-medium">IndexedDB:</span>
                          </p>
                          <ul className="ml-6 space-y-1">
                            {Object.entries(dataStats.indexedDB).map(([db, stores]) => (
                              <li key={db}>
                                {Object.entries(stores).map(([store, count]) => (
                                  <span key={store}>{count} configurations</span>
                                ))}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            <span className="font-medium">Local Storage:</span>
                          </p>
                          <ul className="ml-6 space-y-1">
                            <li>{dataStats.localStorage.totalKeys} keys</li>
                            <li>{formatBytes(dataStats.localStorage.totalSize)}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This will export all your application data including:
                </p>
                <ul className="ml-4 space-y-1 text-sm text-muted-foreground">
                  <li>• All workspaces and their layouts</li>
                  <li>• Component configurations (tables, charts, filters)</li>
                  <li>• Data source connections</li>
                  <li>• User preferences and settings</li>
                  <li>• UI state (sidebar, toolbar positions)</li>
                </ul>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={isExporting}
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
                    Export All Data
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <Alert className="border-warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Importing data will modify your current application state. 
                  Make sure to export your current data first if you want to preserve it.
                </AlertDescription>
              </Alert>

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
                  <CheckCircle2 className="h-4 w-4" />
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
                    <p>Exported by: {importData.metadata.exportedBy || 'Unknown'}</p>
                    <div className="mt-2">
                      <p className="font-medium">Data to import:</p>
                      <ul className="ml-4 space-y-1">
                        <li>• Configurations: {importData.metadata.totalConfigs}</li>
                        <li>• Settings keys: {importData.metadata.totalLocalStorageKeys}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-indexeddb"
                        checked={includeIndexedDB}
                        onCheckedChange={(checked) => setIncludeIndexedDB(checked as boolean)}
                      />
                      <Label htmlFor="include-indexeddb">
                        Import configurations (workspaces, components, data sources)
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-localstorage"
                        checked={includeLocalStorage}
                        onCheckedChange={(checked) => setIncludeLocalStorage(checked as boolean)}
                      />
                      <Label htmlFor="include-localstorage">
                        Import application settings and UI state
                      </Label>
                    </div>

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
                        id="clear-before"
                        checked={clearBeforeImport}
                        onCheckedChange={(checked) => setClearBeforeImport(checked as boolean)}
                      />
                      <Label htmlFor="clear-before" className="text-destructive">
                        Clear all existing data before import (destructive)
                      </Label>
                    </div>
                  </div>

                  <Button 
                    onClick={handleImport} 
                    disabled={isImporting || (!includeIndexedDB && !includeLocalStorage)}
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
                        Import Data
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
                      <div className="space-y-1 text-sm">
                        <p>• Configurations imported: {importResult.imported.indexedDBRecords}</p>
                        <p>• Settings imported: {importResult.imported.localStorageKeys}</p>
                      </div>
                      
                      {importResult.warnings.length > 0 && (
                        <>
                          <p className="font-medium mt-2">Warnings:</p>
                          <ul className="ml-4 space-y-1 text-sm text-warning">
                            {importResult.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      
                      {importResult.errors.length > 0 && (
                        <>
                          <p className="font-medium mt-2">Errors:</p>
                          <ul className="ml-4 space-y-1 text-sm text-destructive">
                            {importResult.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {importResult.success && importResult.imported.localStorageKeys > 0 && (
                        <Alert className="mt-2">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            The page will reload shortly to apply all imported settings...
                          </AlertDescription>
                        </Alert>
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