/**
 * UI Components Example
 * 
 * Demonstrates the usage of DraggableDialog, MultiSelect, and BaseDialog components.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DraggableDialog, DraggableDialogHandle } from '../components/ui/DraggableDialog';
import { MultiSelect, Option } from '../components/ui/MultiSelect';
import { BaseDialog } from '../components/ui/BaseDialog';
import { Settings, Users, FileText, Palette, Code, Database } from 'lucide-react';

// Sample data for MultiSelect
const TECH_OPTIONS: Option[] = [
  { value: 'react', label: 'React', description: 'A JavaScript library for building user interfaces', icon: <Code className="h-4 w-4" /> },
  { value: 'typescript', label: 'TypeScript', description: 'JavaScript with syntax for types', icon: <Code className="h-4 w-4" /> },
  { value: 'tailwind', label: 'Tailwind CSS', description: 'A utility-first CSS framework', icon: <Palette className="h-4 w-4" /> },
  { value: 'nodejs', label: 'Node.js', description: 'JavaScript runtime built on Chrome\'s V8', icon: <Code className="h-4 w-4" /> },
  { value: 'postgresql', label: 'PostgreSQL', description: 'Open source relational database', icon: <Database className="h-4 w-4" /> },
  { value: 'mongodb', label: 'MongoDB', description: 'Document-oriented database', icon: <Database className="h-4 w-4" /> },
];

const USER_OPTIONS: Option[] = [
  { value: 'john', label: 'John Doe', description: 'john@example.com' },
  { value: 'jane', label: 'Jane Smith', description: 'jane@example.com' },
  { value: 'bob', label: 'Bob Johnson', description: 'bob@example.com' },
  { value: 'alice', label: 'Alice Williams', description: 'alice@example.com' },
  { value: 'charlie', label: 'Charlie Brown', description: 'charlie@example.com' },
];

export default function UIComponentsExample() {
  // DraggableDialog states
  const [draggableOpen, setDraggableOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const draggableRef = useRef<DraggableDialogHandle>(null);
  
  // BaseDialog states
  const [baseDialogOpen, setBaseDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // MultiSelect states
  const [selectedTech, setSelectedTech] = useState<string[]>(['react', 'typescript']);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
  });
  
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">UI Components Example</h1>
        <p className="text-muted-foreground">
          Demonstration of DraggableDialog, MultiSelect, and BaseDialog components
        </p>
      </div>
      
      {/* Component Demos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* DraggableDialog Demo */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">DraggableDialog</h2>
          <p className="text-sm text-muted-foreground">
            Non-modal dialog that can be dragged and resized
          </p>
          <div className="space-y-2">
            <Button onClick={() => setDraggableOpen(true)} className="w-full">
              Open Draggable Dialog
            </Button>
            <Button 
              onClick={() => setSettingsOpen(true)} 
              variant="outline" 
              className="w-full"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings Dialog
            </Button>
          </div>
        </div>
        
        {/* MultiSelect Demo */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">MultiSelect</h2>
          <p className="text-sm text-muted-foreground">
            Multi-select dropdown with search and grouping
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Technologies</label>
              <MultiSelect
                options={TECH_OPTIONS}
                value={selectedTech}
                onChange={setSelectedTech}
                placeholder="Select technologies..."
                maxItems={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Team Members</label>
              <MultiSelect
                options={USER_OPTIONS}
                value={selectedUsers}
                onChange={setSelectedUsers}
                placeholder="Select team members..."
                showCount
              />
            </div>
          </div>
        </div>
        
        {/* BaseDialog Demo */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold">BaseDialog</h2>
          <p className="text-sm text-muted-foreground">
            Standard modal dialog with animations
          </p>
          <div className="space-y-2">
            <Button onClick={() => setBaseDialogOpen(true)} className="w-full">
              Open Form Dialog
            </Button>
            <Button 
              onClick={() => setConfirmDialogOpen(true)} 
              variant="destructive" 
              className="w-full"
            >
              Confirmation Dialog
            </Button>
          </div>
        </div>
      </div>
      
      {/* Current Selection Display */}
      <div className="p-6 border rounded-lg bg-muted/50">
        <h3 className="font-semibold mb-4">Current Selections</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Selected Technologies:</span>{' '}
            {selectedTech.length > 0 ? selectedTech.join(', ') : 'None'}
          </div>
          <div>
            <span className="font-medium">Selected Users:</span>{' '}
            {selectedUsers.length > 0 ? selectedUsers.join(', ') : 'None'}
          </div>
        </div>
      </div>
      
      {/* DraggableDialog Example */}
      <DraggableDialog
        ref={draggableRef}
        open={draggableOpen}
        onOpenChange={setDraggableOpen}
        title="Draggable Dialog Example"
        defaultSize={{ width: 500, height: 400 }}
        persistId="example-draggable"
        headerExtra={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => draggableRef.current?.center()}
          >
            Center
          </Button>
        }
        footer={
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => draggableRef.current?.resetPosition()}>
              Reset Position
            </Button>
            <Button onClick={() => setDraggableOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p>
            This is a draggable dialog that doesn't close when clicking outside.
            It has a transparent overlay and remembers its position.
          </p>
          <div className="space-y-2">
            <h4 className="font-medium">Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Drag from the header to move</li>
              <li>Resize from edges and corners</li>
              <li>Maximize/minimize support</li>
              <li>Position persistence</li>
              <li>Transparent overlay</li>
            </ul>
          </div>
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm">
              Try dragging this dialog around and resizing it. The position will be saved
              to localStorage with the key "example-draggable".
            </p>
          </div>
        </div>
      </DraggableDialog>
      
      {/* Settings DraggableDialog */}
      <DraggableDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Settings"
        defaultSize={{ width: 600, height: 500 }}
        persistId="settings-dialog"
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">General Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Theme</label>
                <MultiSelect
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ]}
                  value={['system']}
                  onChange={() => {}}
                  maxItems={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Language</label>
                <MultiSelect
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                  ]}
                  value={['en']}
                  onChange={() => {}}
                  maxItems={1}
                />
              </div>
            </div>
          </div>
        </div>
      </DraggableDialog>
      
      {/* BaseDialog Form Example */}
      <BaseDialog
        open={baseDialogOpen}
        onOpenChange={setBaseDialogOpen}
        title="Create New Project"
        description="Fill out the form below to create a new project."
        width="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setBaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              console.log('Form data:', formData);
              setBaseDialogOpen(false);
            }}>
              Create Project
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Project Name</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded-md"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border rounded-md"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter project description"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Technologies</label>
            <MultiSelect
              options={TECH_OPTIONS}
              value={selectedTech}
              onChange={setSelectedTech}
              placeholder="Select technologies..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Team Members</label>
            <MultiSelect
              options={USER_OPTIONS}
              value={selectedUsers}
              onChange={setSelectedUsers}
              placeholder="Assign team members..."
            />
          </div>
        </div>
      </BaseDialog>
      
      {/* Confirmation Dialog */}
      <BaseDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete your account and remove your data from our servers."
        width="sm"
        animation="scale"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              console.log('Confirmed!');
              setConfirmDialogOpen(false);
            }}>
              Delete Account
            </Button>
          </>
        }
      >
        {/* Empty content for confirmation dialog */}
        <div />
      </BaseDialog>
    </div>
  );
}