import React, { useState, useCallback } from 'react';
import { ColDef } from 'ag-grid-community';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ColumnFormat } from '@/types/agv1/common.types';
import { GeneralTab } from './tabs/GeneralTab';
import { NumberFormatTab } from './tabs/NumberFormatTab';
import { TextFormatTab } from './tabs/TextFormatTab';
import { CellStyleTab } from './tabs/CellStyleTab';
import { StatusIndicatorsTab } from './tabs/StatusIndicatorsTab';
import { ConditionalFormattingTab } from './tabs/ConditionalFormattingTab';
import { TemplatesTab } from './tabs/TemplatesTab';
import { PreviewPanel } from './components/PreviewPanel';

interface ColumnFormattingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnDef: ColDef;
  currentFormat?: ColumnFormat;
  onApply: (format: ColumnFormat) => void;
  onCancel?: () => void;
}

const defaultFormat: ColumnFormat = {
  numberFormat: {
    type: 'number',
    decimals: 2,
    thousandsSeparator: true,
    negativeFormat: 'parentheses',
  },
  textAlignment: 'left',
  cellStyle: {
    backgroundColor: undefined,
    textColor: undefined,
    fontWeight: 'normal',
    fontSize: 14,
  },
  wordWrap: false,
  displayFormat: 'text',
};

export const ColumnFormattingDialog: React.FC<ColumnFormattingDialogProps> = ({
  open,
  onOpenChange,
  columnDef,
  currentFormat = defaultFormat,
  onApply,
  onCancel,
}) => {
  const [format, setFormat] = useState<ColumnFormat>(currentFormat);
  const [activeTab, setActiveTab] = useState('general');

  const handleApply = useCallback(() => {
    onApply(format);
    onOpenChange(false);
  }, [format, onApply, onOpenChange]);

  const handleCancel = useCallback(() => {
    setFormat(currentFormat);
    onCancel?.();
    onOpenChange(false);
  }, [currentFormat, onCancel, onOpenChange]);

  const updateFormat = useCallback((updates: Partial<ColumnFormat>) => {
    setFormat(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Format Column: {columnDef.headerName || columnDef.field}</DialogTitle>
          <DialogDescription>
            Configure formatting options for this column
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="vertical"
            className="flex flex-1"
          >
            <TabsList className="flex flex-col h-full w-48 rounded-none border-r p-2">
              <TabsTrigger value="general" className="w-full justify-start">
                General
              </TabsTrigger>
              <TabsTrigger value="number" className="w-full justify-start">
                Number Format
              </TabsTrigger>
              <TabsTrigger value="text" className="w-full justify-start">
                Text Format
              </TabsTrigger>
              <TabsTrigger value="style" className="w-full justify-start">
                Cell Style
              </TabsTrigger>
              <TabsTrigger value="indicators" className="w-full justify-start">
                Status Indicators
              </TabsTrigger>
              <TabsTrigger value="conditional" className="w-full justify-start">
                Conditional
              </TabsTrigger>
              <TabsTrigger value="templates" className="w-full justify-start">
                Templates
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="general" className="mt-0">
                    <GeneralTab
                      columnDef={columnDef}
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                  
                  <TabsContent value="number" className="mt-0">
                    <NumberFormatTab
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-0">
                    <TextFormatTab
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                  
                  <TabsContent value="style" className="mt-0">
                    <CellStyleTab
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                  
                  <TabsContent value="indicators" className="mt-0">
                    <StatusIndicatorsTab
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                  
                  <TabsContent value="conditional" className="mt-0">
                    <ConditionalFormattingTab
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                  
                  <TabsContent value="templates" className="mt-0">
                    <TemplatesTab
                      format={format}
                      onFormatChange={updateFormat}
                    />
                  </TabsContent>
                </div>
              </ScrollArea>
              
              <div className="flex-shrink-0 border-t bg-muted/50 p-4">
                <PreviewPanel format={format} />
              </div>
            </div>
          </Tabs>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};