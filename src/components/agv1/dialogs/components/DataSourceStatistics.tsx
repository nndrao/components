/**
 * DataSource Statistics Component
 * 
 * Displays real-time statistics for active data sources including
 * message rates, connection status, and data volume metrics.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Clock, TrendingUp, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSourceStats {
  messagesReceived: number;
  messagesPerSecond: number;
  totalRows: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  lastUpdateTime?: string;
  snapshotStartTime?: number;
  snapshotEndTime?: number;
  snapshotDuration?: number;
  connectionUptime?: number;
  reconnectCount: number;
  droppedMessages: number;
  isReceivingSnapshot: boolean;
  error?: string;
}

interface DataSourceStatisticsProps {
  stats: DataSourceStats | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  datasourceName: string;
  className?: string;
}

export const DataSourceStatistics: React.FC<DataSourceStatisticsProps> = ({
  stats,
  connectionStatus,
  datasourceName,
  className
}) => {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-500 text-white">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Disconnected</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 text-white">Connecting...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  if (!stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {getConnectionIcon()}
              {datasourceName}
            </CardTitle>
            {getConnectionBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No statistics available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getConnectionIcon()}
            {datasourceName}
          </CardTitle>
          {getConnectionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Info */}
        {connectionStatus === 'connected' && stats.connectionUptime && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-medium">{formatDuration(stats.connectionUptime)}</span>
          </div>
        )}
        
        {stats.reconnectCount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reconnects</span>
            <span className="font-medium">{stats.reconnectCount}</span>
          </div>
        )}

        {/* Snapshot Status */}
        {stats.isReceivingSnapshot && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-sm font-medium">Receiving Snapshot...</span>
            </div>
          </div>
        )}
        
        {stats.snapshotDuration && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Snapshot completed in {formatDuration(stats.snapshotDuration)}</span>
            </div>
          </div>
        )}

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>Messages</span>
            </div>
            <p className="text-2xl font-semibold">{formatNumber(stats.messagesReceived)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Rate</span>
            </div>
            <p className="text-2xl font-semibold">{stats.messagesPerSecond.toFixed(1)}/s</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>Total Rows</span>
            </div>
            <p className="text-2xl font-semibold">{formatNumber(stats.totalRows)}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last Update</span>
            </div>
            <p className="text-sm font-medium">
              {stats.lastUpdateTime 
                ? new Date(stats.lastUpdateTime).toLocaleTimeString()
                : 'N/A'
              }
            </p>
          </div>
        </div>

        {/* Operation Counts */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Operations</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Inserts</p>
              <p className="font-medium text-sm">{formatNumber(stats.insertCount)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Updates</p>
              <p className="font-medium text-sm">{formatNumber(stats.updateCount)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Deletes</p>
              <p className="font-medium text-sm">{formatNumber(stats.deleteCount)}</p>
            </div>
          </div>
        </div>

        {/* Dropped Messages Warning */}
        {stats.droppedMessages > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{stats.droppedMessages} messages dropped</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {stats.error && (
          <div className="bg-destructive/10 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <span className="text-sm">{stats.error}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};