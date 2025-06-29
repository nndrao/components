import React from 'react';
import { Workspace } from './components/workspace/Workspace';
import { Sidebar } from './components/workspace/Sidebar';
import { WorkspaceLoader } from './components/workspace/WorkspaceLoader';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { DataSourceProvider } from './contexts/DataSourceContext';
import { SharedWorkerProvider } from './contexts/SharedWorkerContext';
import { Toaster } from '@/components/ui/toaster';
import { useAutoSaveWorkspace } from './hooks/useAutoSaveWorkspace';
import './styles/app.css';

function AppContent() {
  const { settings } = useSettings();
  
  // Enable auto-save based on settings
  useAutoSaveWorkspace(settings.autoSave, settings.autoSaveInterval);
  
  return (
    <SharedWorkerProvider enabled={settings.useSharedWorker}>
      <DataSourceProvider>
        <WorkspaceLoader />
        <div className="h-screen flex bg-background">
          <Sidebar />
          
          <main className="flex-1 overflow-hidden bg-background">
            <Workspace />
          </main>
          
          <Toaster />
        </div>
      </DataSourceProvider>
    </SharedWorkerProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  );
}