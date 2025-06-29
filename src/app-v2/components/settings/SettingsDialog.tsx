import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { CompleteExportImport } from '@/app-v2/components/config/CompleteExportImport';
import { useSettings } from '@/app-v2/contexts/SettingsContext';
import { Settings, FileDown, Palette, Wrench } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { settings, updateSettings } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application preferences and configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="export-import" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Export/Import
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(80vh-200px)]">
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure general application behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-save">Auto Save</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically save your work at regular intervals
                      </p>
                    </div>
                    <Switch
                      id="auto-save"
                      checked={settings.autoSave}
                      onCheckedChange={(checked) => updateSettings({ autoSave: checked })}
                    />
                  </div>

                  {settings.autoSave && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="auto-save-interval">Auto Save Interval (seconds)</Label>
                      <Input
                        id="auto-save-interval"
                        type="number"
                        value={settings.autoSaveInterval}
                        onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) || 30 })}
                        min={10}
                        max={300}
                        className="w-32"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-load">Auto Load Last Workspace</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically load your last workspace on startup
                      </p>
                    </div>
                    <Switch
                      id="auto-load"
                      checked={settings.autoLoadWorkspace}
                      onCheckedChange={(checked) => updateSettings({ autoLoadWorkspace: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="welcome-message">Show Welcome Message</Label>
                      <p className="text-sm text-muted-foreground">
                        Display welcome message for new users
                      </p>
                    </div>
                    <Switch
                      id="welcome-message"
                      checked={settings.showWelcomeMessage}
                      onCheckedChange={(checked) => updateSettings({ showWelcomeMessage: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize the look and feel of the application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Theme settings will be available in a future update
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export-import" className="space-y-4">
              <CompleteExportImport />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Advanced configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Developer Options</Label>
                    <p className="text-sm text-muted-foreground">
                      Advanced settings will be available in a future update
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};