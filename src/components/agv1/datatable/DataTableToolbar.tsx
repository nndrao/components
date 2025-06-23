import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Download,
  Settings,
  Eye,
  Filter,
  Columns,
  MoreVertical,
  FileDown,
  FileSpreadsheet,
  FileJson,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportFormat } from '@/types/agv1/component.interfaces';

export interface DataTableToolbarProps {
  onRefresh: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  onColumnSettings: () => void;
  onGridSettings?: () => void;
  selectedCount?: number;
  loading?: boolean;
  exportSettings?: {
    defaultFormat: ExportFormat;
    includeHeaders: boolean;
    fileName: string;
  };
  className?: string;
}

const exportFormats: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'csv', label: 'CSV', icon: <FileText className="h-4 w-4" /> },
  { value: 'excel', label: 'Excel', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { value: 'json', label: 'JSON', icon: <FileJson className="h-4 w-4" /> },
  { value: 'pdf', label: 'PDF', icon: <FileDown className="h-4 w-4" /> },
];

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  onRefresh,
  onExport,
  onColumnSettings,
  onGridSettings,
  selectedCount = 0,
  loading = false,
  // exportSettings,
  className,
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      setExportingFormat(format);
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error notification
    } finally {
      setExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        Refresh
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            className="gap-2"
          >
            <Download className={cn("h-4 w-4", exporting && "animate-pulse")} />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Export Format</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {exportFormats.map((format) => (
            <DropdownMenuItem
              key={format.value}
              onClick={() => handleExport(format.value)}
              disabled={exporting || (format.value === 'excel' || format.value === 'pdf')}
              className="gap-2"
            >
              {format.icon}
              <span>{format.label}</span>
              {exportingFormat === format.value && (
                <RefreshCw className="h-3 w-3 ml-auto animate-spin" />
              )}
              {(format.value === 'excel' || format.value === 'pdf') && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Pro
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={onColumnSettings}
        className="gap-2"
      >
        <Columns className="h-4 w-4" />
        Columns
      </Button>

      {onGridSettings && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGridSettings}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      )}

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        
        <Button variant="ghost" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {selectedCount > 0 && (
          <>
            <Badge variant="secondary">
              {selectedCount} selected
            </Badge>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onGridSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Table Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              Save View
            </DropdownMenuItem>
            <DropdownMenuItem>
              Reset View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Import Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};