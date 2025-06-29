/**
 * DataSourceList Component
 * 
 * List view for managing data sources.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Play,
  Square,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { ConnectionStatus } from '../../providers/data/data-provider.types';
import { DataSourceConfig } from './types';
import { formatDistanceToNow } from 'date-fns';

interface DataSourceListProps {
  /**
   * List of data sources
   */
  dataSources: DataSourceConfig[];
  
  /**
   * Connection status map
   */
  connectionStatus: Map<string, ConnectionStatus>;
  
  /**
   * Create new data source
   */
  onCreate: () => void;
  
  /**
   * Edit data source
   */
  onEdit: (dataSource: DataSourceConfig) => void;
  
  /**
   * Delete data source
   */
  onDelete: (dataSource: DataSourceConfig) => void;
  
  /**
   * Duplicate data source
   */
  onDuplicate: (dataSource: DataSourceConfig) => void;
  
  /**
   * Connect to data source
   */
  onConnect: (dataSource: DataSourceConfig) => void;
  
  /**
   * Disconnect from data source
   */
  onDisconnect: (dataSource: DataSourceConfig) => void;
}

export function DataSourceList({
  dataSources,
  connectionStatus,
  onCreate,
  onEdit,
  onDelete,
  onDuplicate,
  onConnect,
  onDisconnect,
}: DataSourceListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data sources
  const filteredDataSources = dataSources.filter(ds =>
    ds.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status badge
  const getStatusBadge = (dataSourceId: string) => {
    const status = connectionStatus.get(dataSourceId) || ConnectionStatus.Disconnected;
    
    switch (status) {
      case ConnectionStatus.Connected:
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case ConnectionStatus.Connecting:
        return <Badge variant="secondary">Connecting...</Badge>;
      case ConnectionStatus.Reconnecting:
        return <Badge variant="secondary">Reconnecting...</Badge>;
      case ConnectionStatus.Error:
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  // Get provider type badge
  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      websocket: 'WebSocket',
      rest: 'REST',
      polling: 'Polling',
      sse: 'SSE',
      static: 'Static',
    };
    
    return (
      <Badge variant="secondary" className="font-mono text-xs">
        {typeMap[type] || type.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>
              Manage your data connections and configurations
            </CardDescription>
          </div>
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Data Source
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search data sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDataSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No data sources found' : 'No data sources created yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDataSources.map((dataSource) => {
                  const status = connectionStatus.get(dataSource.id) || ConnectionStatus.Disconnected;
                  const isConnected = status === ConnectionStatus.Connected;
                  
                  return (
                    <TableRow key={dataSource.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dataSource.displayName}</div>
                          {dataSource.description && (
                            <div className="text-sm text-muted-foreground">
                              {dataSource.description}
                            </div>
                          )}
                          {dataSource.autoStart && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Auto-start
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(dataSource.type)}</TableCell>
                      <TableCell>{getStatusBadge(dataSource.id)}</TableCell>
                      <TableCell>
                        {dataSource.inferredFields?.length || 0} fields
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(dataSource.createdAt || 0, { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(dataSource.updatedAt || 0, { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isConnected ? (
                              <DropdownMenuItem onClick={() => onDisconnect(dataSource)}>
                                <Square className="mr-2 h-4 w-4" />
                                Disconnect
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => onConnect(dataSource)}>
                                <Play className="mr-2 h-4 w-4" />
                                Connect
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem onClick={() => onEdit(dataSource)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => onDuplicate(dataSource)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => onDelete(dataSource)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}