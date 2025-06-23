import React, { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Loader2, 
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionStatus as ConnectionStatusType } from '@/types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  dataSourceName?: string;
  statistics?: {
    messagesReceived?: number;
    messagesSent?: number;
    lastUpdateTime?: Date;
    updateRate?: number;
    uptime?: number;
    errors?: number;
  };
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    animate: false
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    animate: false
  },
  error: {
    icon: AlertTriangle,
    label: 'Error',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    animate: true
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    animate: true
  }
};

export const ConnectionStatusIndicator: React.FC<ConnectionStatusProps> = ({
  status,
  dataSourceName,
  statistics,
  onConnect,
  onDisconnect,
  onReconnect,
  className,
  showDetails = true,
  size = 'md'
}) => {
  const config = statusConfig[status] || statusConfig.disconnected;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  const statusIndicator = (
    <div 
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border',
        config.bgColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      <Icon 
        className={cn(
          iconSizes[size],
          config.color,
          config.animate && 'animate-pulse'
        )}
      />
      <span className={cn('font-medium', config.color)}>
        {config.label}
      </span>
      {dataSourceName && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-muted-foreground">
            {dataSourceName}
          </span>
        </>
      )}
    </div>
  );
  
  if (!showDetails) {
    return statusIndicator;
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent"
        >
          {statusIndicator}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Connection Status</h4>
            <div className={cn(
              'inline-flex items-center gap-2 text-sm',
              config.color
            )}>
              <Icon className={cn('h-4 w-4', config.animate && 'animate-pulse')} />
              <span className="font-medium">{config.label}</span>
            </div>
          </div>
          
          {dataSourceName && (
            <div>
              <p className="text-sm text-muted-foreground">Data Source</p>
              <p className="text-sm font-medium">{dataSourceName}</p>
            </div>
          )}
          
          {statistics && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {statistics.messagesReceived !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingDown className="h-3 w-3" />
                      Messages In
                    </div>
                    <p className="text-sm font-medium">
                      {formatNumber(statistics.messagesReceived)}
                    </p>
                  </div>
                )}
                
                {statistics.messagesSent !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Messages Out
                    </div>
                    <p className="text-sm font-medium">
                      {formatNumber(statistics.messagesSent)}
                    </p>
                  </div>
                )}
                
                {statistics.uptime !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Uptime
                    </div>
                    <p className="text-sm font-medium">
                      {formatUptime(statistics.uptime)}
                    </p>
                  </div>
                )}
                
                {statistics.errors !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      Errors
                    </div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      {statistics.errors}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          
          {(onConnect || onDisconnect || onReconnect) && (
            <>
              <Separator />
              <div className="flex gap-2">
                {status === 'disconnected' && onConnect && (
                  <Button size="sm" onClick={onConnect} className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
                
                {status === 'connected' && onDisconnect && (
                  <Button size="sm" variant="destructive" onClick={onDisconnect} className="flex-1">
                    <XCircle className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                )}
                
                {(status === 'error' || status === 'disconnected') && onReconnect && (
                  <Button size="sm" variant="outline" onClick={onReconnect} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reconnect
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Export with original name for backward compatibility
export const ConnectionStatus = ConnectionStatusIndicator;