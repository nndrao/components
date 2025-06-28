import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  PanelRightClose, 
  PanelRightOpen 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataSourceSelector } from './DataSourceSelector';
import { ProfileBar } from './ProfileBar';
import { ConnectionStatus } from '../../providers/data/data-provider.types';

interface DataTableToolbarProps {
  componentId: string;
  dataSourceId: string | null;
  onDataSourceChange: (id: string | null) => void;
  connectionStatus?: ConnectionStatus;
  loading: boolean;
  snapshotReceived: boolean;
  rowCount: number;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  sideBarVisible: boolean;
  onSaveProfile: () => boolean;
}

export function DataTableToolbar({
  componentId,
  dataSourceId,
  onDataSourceChange,
  connectionStatus,
  loading,
  snapshotReceived,
  rowCount,
  onRefresh,
  onToggleSidebar,
  sideBarVisible,
  onSaveProfile
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        {dataSourceId && (
          <Badge 
            variant={snapshotReceived ? "default" : "secondary"} 
            className="text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {snapshotReceived ? 'Refreshing...' : 'Waiting for snapshot...'}
              </>
            ) : snapshotReceived ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Live ({rowCount} rows)
              </>
            ) : (
              'Connecting...'
            )}
          </Badge>
        )}
        
        <DataSourceSelector 
          value={dataSourceId}
          onChange={onDataSourceChange}
        />
        
        {dataSourceId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 px-2"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 px-2"
          title={sideBarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          {sideBarVisible ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </Button>
        
        <ProfileBar 
          componentId={componentId} 
          onSaveState={onSaveProfile} 
        />
      </div>
    </div>
  );
}