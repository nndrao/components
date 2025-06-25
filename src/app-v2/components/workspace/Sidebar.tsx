import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Plus, Save, FolderOpen, Trash2, Moon, Sun, Pin, PinOff, ChevronRight, Database } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useDataSource } from '../../contexts/DataSourceContext';
import { DataSourceButton } from '../datasource';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WorkspaceManager } from '../../services/workspace-manager';
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

export function Sidebar() {
  const { addComponent, saveWorkspace, loadWorkspace, clearWorkspace } = useAppStore();
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
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned');
    return saved === 'true';
  });
  const [isExpanded, setIsExpanded] = useState(isPinned);
  
  const handleAddTable = () => {
    addComponent('data-table');
  };
  
  const handleSave = async () => {
    try {
      await WorkspaceManager.saveToLocalStorage();
      toast({
        title: "Success",
        description: "Workspace and data sources saved successfully!",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save workspace",
        variant: "destructive",
      });
    }
  };
  
  const handleLoad = async () => {
    try {
      const loaded = await WorkspaceManager.loadFromLocalStorage();
      if (loaded) {
        toast({
          title: "Success",
          description: "Workspace and data sources loaded successfully!",
        });
      } else {
        toast({
          title: "Info",
          description: "No saved workspace found",
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: "Error",
        description: "Failed to load workspace",
        variant: "destructive",
      });
    }
  };
  
  const handleClear = async () => {
    try {
      localStorage.removeItem('workspace-v2');
      await WorkspaceManager.clearWorkspace();
      toast({
        title: "Info",
        description: "Workspace and data sources cleared",
      });
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        title: "Error",
        description: "Failed to clear workspace",
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
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative h-full">
        {/* Expand pill - only show when collapsed */}
        {!shouldExpand && (
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full p-3 cursor-pointer transition-all hover:bg-primary/20 hover:border-primary/30 shadow-lg"
            onMouseEnter={handleMouseEnter}
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
        )}
        
        {/* Sidebar */}
        <div
          className={cn(
            "h-full bg-card border-r flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
            shouldExpand ? "w-56" : "w-0 border-0"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Pin button */}
          <div className="flex items-center justify-end p-2 border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={togglePin}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isPinned ? "Unpin sidebar" : "Pin sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Main actions */}
          <div className="flex-1 p-2 space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddTable}
                  className="w-full justify-start"
                  size={shouldExpand ? "default" : "icon"}
                >
                  <Plus className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                  {shouldExpand && "Add Table"}
                </Button>
              </TooltipTrigger>
              {!shouldExpand && (
                <TooltipContent side="right">Add Table</TooltipContent>
              )}
            </Tooltip>
            
            <DataSourceButton
              text={shouldExpand ? "Data Sources" : undefined}
              variant="outline"
              size={shouldExpand ? "default" : "icon"}
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
            
            <Separator />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="w-full justify-start"
                  size={shouldExpand ? "default" : "icon"}
                >
                  <Save className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                  {shouldExpand && "Save"}
                </Button>
              </TooltipTrigger>
              {!shouldExpand && (
                <TooltipContent side="right">Save workspace</TooltipContent>
              )}
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLoad}
                  variant="outline"
                  className="w-full justify-start"
                  size={shouldExpand ? "default" : "icon"}
                >
                  <FolderOpen className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                  {shouldExpand && "Load"}
                </Button>
              </TooltipTrigger>
              {!shouldExpand && (
                <TooltipContent side="right">Load workspace</TooltipContent>
              )}
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowClearDialog(true)}
                  variant="destructive"
                  className="w-full justify-start"
                  size={shouldExpand ? "default" : "icon"}
                >
                  <Trash2 className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                  {shouldExpand && "Clear"}
                </Button>
              </TooltipTrigger>
              {!shouldExpand && (
                <TooltipContent side="right">Clear workspace</TooltipContent>
              )}
            </Tooltip>
          </div>
          
          {/* Theme toggle at bottom */}
          <div className="p-2 border-t">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleTheme}
                  variant="ghost"
                  className="w-full justify-start"
                  size={shouldExpand ? "default" : "icon"}
                >
                  {theme === 'light' ? (
                    <Moon className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                  ) : (
                    <Sun className={cn("h-4 w-4", shouldExpand && "mr-2")} />
                  )}
                  {shouldExpand && (theme === 'light' ? 'Dark Mode' : 'Light Mode')}
                </Button>
              </TooltipTrigger>
              {!shouldExpand && (
                <TooltipContent side="right">
                  Switch to {theme === 'light' ? 'dark' : 'light'} mode
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
        
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Workspace</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all components and their configurations. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}