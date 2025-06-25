/**
 * DataSourceStatisticsPanel Component
 * 
 * Displays real-time statistics for a data source.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  Database,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataSourceStatistics } from './types';
import { formatDistanceToNow } from 'date-fns';

interface DataSourceStatisticsPanelProps {
  /**
   * Data source ID
   */
  dataSourceId: string;
  
  /**
   * Statistics data
   */
  statistics?: DataSourceStatistics;
  
  /**
   * Additional class name
   */
  className?: string;
}

export function DataSourceStatisticsPanel({
  dataSourceId,
  statistics: propStatistics,
  className,
}: DataSourceStatisticsPanelProps) {
  // Mock statistics for demo - in real app, this would come from context/provider
  const [statistics, setStatistics] = useState<DataSourceStatistics>(
    propStatistics || {
      messagesReceived: 0,
      messagesPerSecond: 0,
      bytesReceived: 0,
      errors: 0,
    }
  );

  // Simulate real-time updates for demo
  useEffect(() => {
    if (!propStatistics) {
      const interval = setInterval(() => {
        setStatistics(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + Math.floor(Math.random() * 10),
          messagesPerSecond: Math.random() * 5,
          bytesReceived: prev.bytesReceived + Math.floor(Math.random() * 1000),
          lastMessageAt: Date.now(),
        }));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [propStatistics]);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.messagesReceived.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.messagesPerSecond.toFixed(1)}/s
            </div>
            <p className="text-xs text-muted-foreground">Messages per second</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Data Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(statistics.bytesReceived)}
            </div>
            <p className="text-xs text-muted-foreground">Total transferred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.errors}
            </div>
            <p className="text-xs text-muted-foreground">Total errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Connection Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.connectedAt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Connected</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(statistics.connectedAt, { addSuffix: true })}
                </span>
              </div>
            )}
            
            {statistics.lastMessageAt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Last Message</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(statistics.lastMessageAt, { addSuffix: true })}
                </span>
              </div>
            )}
            
            {statistics.disconnectedAt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                  <span className="text-sm">Disconnected</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(statistics.disconnectedAt, { addSuffix: true })}
                </span>
              </div>
            )}
            
            {statistics.lastError && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Last Error</span>
                </div>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {statistics.lastError}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Message Rate</span>
                <span className="text-sm font-medium">
                  {statistics.messagesPerSecond.toFixed(1)} msg/s
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((statistics.messagesPerSecond / 10) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Data Throughput</span>
                <span className="text-sm font-medium">
                  {formatBytes(statistics.bytesReceived / (statistics.messagesReceived || 1))}/msg
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (statistics.bytesReceived / (statistics.messagesReceived * 1000) || 0) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium">
                  {((statistics.errors / (statistics.messagesReceived || 1)) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    statistics.errors > 0 ? "bg-red-500" : "bg-green-500"
                  )}
                  style={{
                    width: `${Math.min(
                      (statistics.errors / (statistics.messagesReceived || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}