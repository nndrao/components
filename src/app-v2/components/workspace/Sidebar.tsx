import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { ComponentType } from '../../types';
import { 
  Plus, 
  Save, 
  FolderOpen, 
  Trash2, 
  Moon, 
  Sun, 
  Pin, 
  PinOff, 
  ChevronRight,
  ChevronLeft,
  Database,
  Settings,
  HelpCircle,
  Activity,
  Layers
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useDataSource } from '../../contexts/DataSourceContext';
import { DataSourceButton } from '../datasource';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WorkspaceManager } from '../../services/workspace-manager';
import { ComponentCreateDialog } from './ComponentCreateDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Sidebar() {
  const { addComponent, saveWorkspace, loadWorkspace, clearWorkspace, components } = useAppStore();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const {
    dataSources,
    connectionStatus,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    connectDataSource,
    disconnectDataSource,
  } = useDataSource();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned');
    return saved === 'true';
  });
  const [isExpanded, setIsExpanded] = useState(isPinned);
  
  const handleAddTable = () => {
    setShowCreateDialog(true);
  };
  
  const handleCreateComponent = (customId: string, customTitle: string) => {
    addComponent(ComponentType.DataTable, customId, customTitle);
  };
  
  const handleSave = async () => {
    try {
      await WorkspaceManager.saveToLocalStorage();
      toast({
        title: "Workspace Saved",
        description: "Your workspace has been saved successfully",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Unable to save workspace. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleLoad = async () => {
    try {
      const loaded = await WorkspaceManager.loadFromLocalStorage();
      if (loaded) {
        toast({
          title: "Workspace Loaded",
          description: "Your saved workspace has been restored",
        });
      } else {
        toast({
          title: "No Saved Workspace",
          description: "No saved workspace found to load",
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: "Load Failed",
        description: "Unable to load workspace. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleClear = async () => {
    try {
      localStorage.removeItem('workspace-v2');
      await WorkspaceManager.clearWorkspace();
      toast({
        title: "Workspace Cleared",
        description: "All components and data sources have been removed",
      });
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        title: "Clear Failed",
        description: "Unable to clear workspace. Please try again.",
        variant: "destructive",
      });
    }
    setShowClearDialog(false);
  };
  
  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsExpanded(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsExpanded(false);
    }
  };
  
  const togglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    setIsExpanded(newPinned);
    localStorage.setItem('sidebar-pinned', newPinned.toString());
  };
  
  const shouldExpand = isExpanded || isPinned;
  const componentCount = components.size;
  const dataSourceCount = dataSources.length;
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative h-full">
        {/* Sidebar */}
        <div
          className={cn(
            "h-full bg-gradient-to-b from-background via-background to-muted/20 border-r flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-xl",
            shouldExpand ? "w-64" : "w-16"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="p-3 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex items-center gap-2 transition-opacity duration-200",
                shouldExpand ? "opacity-100" : "opacity-0"
              )}>
                <Layers className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Workspace</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={togglePin}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-primary/10"
                  >
                    {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isPinned ? "Unpin sidebar" : "Pin sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Stats */}
          {shouldExpand && (
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{componentCount} Tables</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{dataSourceCount} Sources</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Main content */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {/* Primary Actions */}
              <div className="space-y-2">
                {shouldExpand && (
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">CREATE</p>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleAddTable}
                      className={cn(
                        "w-full transition-all duration-200",
                        shouldExpand ? "justify-start" : "justify-center",
                        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      )}
                      size={shouldExpand ? "default" : "icon"}
                    >
                      <Plus className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                      {shouldExpand && "New Table"}
                    </Button>
                  </TooltipTrigger>
                  {!shouldExpand && (
                    <TooltipContent side="right">Create new table</TooltipContent>
                  )}
                </Tooltip>
                
                <DataSourceButton
                  text={shouldExpand ? "Data Sources" : undefined}
                  variant="outline"
                  size={shouldExpand ? "default" : "icon"}
                  className={cn(
                    "w-full border-dashed",
                    shouldExpand ? "justify-start" : "justify-center"
                  )}
                  dataSources={dataSources}
                  connectionStatus={connectionStatus}
                  onSave={async (config) => {
                    if (dataSources.find(ds => ds.id === config.id)) {
                      await updateDataSource(config);
                    } else {
                      await createDataSource(config);
                    }
                  }}
                  onDelete={(config) => deleteDataSource(config.id)}
                  onConnect={(config) => connectDataSource(config.id)}
                  onDisconnect={(config) => disconnectDataSource(config.id)}
                >
                  {!shouldExpand && <Database className="h-4 w-4" />}
                </DataSourceButton>
              </div>
              
              <Separator className="my-3" />
              
              {/* Workspace Actions */}
              <div className="space-y-2">
                {shouldExpand && (
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">WORKSPACE</p>
                )}
                
                {!shouldExpand ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSave}
                        variant="ghost"
                        className="w-full justify-center"
                        size="icon"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Save workspace</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={handleSave}
                    variant="ghost"
                    className="w-full justify-start hover:bg-primary/10"
                    size="default"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Workspace
                  </Button>
                )}
                
                {!shouldExpand ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleLoad}
                        variant="ghost"
                        className="w-full justify-center"
                        size="icon"
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Load workspace</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={handleLoad}
                    variant="ghost"
                    className="w-full justify-start hover:bg-primary/10"
                    size="default"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Load Workspace
                  </Button>
                )}
                
                {!shouldExpand ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowClearDialog(true)}
                        variant="ghost"
                        className="w-full justify-center hover:bg-destructive/10 hover:text-destructive"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Clear workspace</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={() => setShowClearDialog(true)}
                    variant="ghost"
                    className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
                    size="default"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
          
          {/* Footer */}
          <div className="border-t p-3 space-y-2 bg-card/50 backdrop-blur-sm">
            {shouldExpand && (
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-primary/10"
                      size="sm"
                      disabled
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Coming soon</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-primary/10"
                      size="sm"
                      disabled
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help & Docs
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Coming soon</TooltipContent>
                </Tooltip>
              </div>
            )}
            
            <Separator className="my-2" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleTheme}
                  variant="ghost"
                  className={cn(
                    "w-full hover:bg-primary/10",
                    shouldExpand ? "justify-start" : "justify-center"
                  )}
                  size={shouldExpand ? "default" : "icon"}
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                      {shouldExpand && "Dark Mode"}
                    </>
                  ) : (
                    <>
                      <Sun className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                      {shouldExpand && "Light Mode"}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {!shouldExpand && (
                <TooltipContent side="right">
                  Switch to {theme === 'light' ? 'dark' : 'light'} mode
                </TooltipContent>
              )}
            </Tooltip>
          </div>
          
          {/* Collapse/Expand handle */}
          <div
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 z-20",
              "bg-primary rounded-full p-1 cursor-pointer shadow-lg",
              "transition-all duration-200 hover:scale-110",
              "border-2 border-background"
            )}
            onClick={() => setIsExpanded(!shouldExpand)}
          >
            {shouldExpand ? (
              <ChevronLeft className="h-3 w-3 text-primary-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-primary-foreground" />
            )}
          </div>
        </div>
        
        {/* Dialogs */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Workspace</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all {componentCount} tables and {dataSourceCount} data sources. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleClear}
                className="bg-destructive hover:bg-destructive/90"
              >
                Clear Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <ComponentCreateDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          componentType={ComponentType.DataTable}
          onConfirm={handleCreateComponent}
        />
      </div>
    </TooltipProvider>
  );
}