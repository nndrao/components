import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AGV1Provider } from '../providers';
import { DataTable, createDataTable } from '../datatable';
import type { IDataTableComponent, IDataSource, DataTableConfig } from '@/types/agv1/component.interfaces';
import type { ColDef } from 'ag-grid-community';

// Sample data
const generateSampleData = (count: number) => {
  const products = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Tool Z'];
  const categories = ['Electronics', 'Hardware', 'Software', 'Accessories'];
  const statuses = ['Active', 'Pending', 'Discontinued'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    product: products[Math.floor(Math.random() * products.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    price: Math.round(Math.random() * 1000 * 100) / 100,
    quantity: Math.floor(Math.random() * 100),
    revenue: Math.round(Math.random() * 10000 * 100) / 100,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    discount: Math.random() * 0.5,
    rating: Math.random() * 5,
    inStock: Math.random() > 0.3,
  }));
};

// Mock data source
class MockDataSource implements IDataSource {
  id = 'mock-data-source';
  name = 'Mock Product Data';
  type = 'static' as const;
  status = 'connected' as const;
  
  private data: any[] = [];
  private subscribers: ((data: any[]) => void)[] = [];
  
  constructor(initialData: any[]) {
    this.data = initialData;
  }
  
  async connect(): Promise<void> {
    // Mock connection
    return Promise.resolve();
  }
  
  async disconnect(): Promise<void> {
    // Mock disconnection
    return Promise.resolve();
  }
  
  subscribe(callback: (data: any[]) => void): () => void {
    this.subscribers.push(callback);
    // Send initial data
    callback(this.data);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  async getData(): Promise<any[]> {
    return Promise.resolve(this.data);
  }
  
  // Method to update data (for demo purposes)
  updateData(newData: any[]) {
    this.data = newData;
    this.subscribers.forEach(callback => callback(this.data));
  }
}

const DataTableDemoContent: React.FC = () => {
  const dataTableRef = useRef<IDataTableComponent>(null);
  const [dataSource] = useState(() => new MockDataSource(generateSampleData(100)));
  const [isConnected, setIsConnected] = useState(false);
  
  // Column definitions
  const columns: ColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      pinned: 'left',
      lockVisible: true,
    },
    { 
      field: 'product', 
      headerName: 'Product Name',
      width: 150,
    },
    { 
      field: 'category', 
      headerName: 'Category',
      width: 120,
    },
    { 
      field: 'price', 
      headerName: 'Price',
      width: 100,
      cellDataType: 'number',
    },
    { 
      field: 'quantity', 
      headerName: 'Quantity',
      width: 100,
      cellDataType: 'number',
    },
    { 
      field: 'revenue', 
      headerName: 'Revenue',
      width: 120,
      cellDataType: 'number',
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 120,
    },
    { 
      field: 'lastUpdated', 
      headerName: 'Last Updated',
      width: 150,
    },
    { 
      field: 'discount', 
      headerName: 'Discount',
      width: 100,
      cellDataType: 'number',
    },
    { 
      field: 'rating', 
      headerName: 'Rating',
      width: 100,
      cellDataType: 'number',
    },
    { 
      field: 'inStock', 
      headerName: 'In Stock',
      width: 100,
      cellDataType: 'boolean',
    },
  ];
  
  const initialConfig: Partial<DataTableConfig> = {
    columns,
    enableSorting: true,
    enableFiltering: true,
    rowSelection: 'multiple',
    pagination: {
      enabled: true,
      pageSize: 20,
      pageSizes: [10, 20, 50, 100],
    },
    theme: 'quartz',
  };
  
  // Connect data source on mount
  useEffect(() => {
    if (dataTableRef.current && !isConnected) {
      dataTableRef.current.setDataSource(dataSource);
      setIsConnected(true);
    }
  }, [dataSource, isConnected]);
  
  const handleRefreshData = () => {
    // Generate new data
    dataSource.updateData(generateSampleData(100));
  };
  
  const handleExportConfig = () => {
    if (dataTableRef.current) {
      const config = dataTableRef.current.getConfiguration();
      const state = dataTableRef.current.getState();
      console.log('Configuration:', config);
      console.log('State:', state);
      
      // Download as JSON
      const blob = new Blob([JSON.stringify({ config, state }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datatable-config.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DataTable Demo</CardTitle>
              <CardDescription>
                Example of the AGV1 DataTable component with formatting support
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">100 rows</Badge>
              <Badge variant="secondary">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="mb-4 px-6 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshData}>
              Generate New Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportConfig}>
              Export Configuration
            </Button>
          </div>
          
          <div className="h-[600px]">
            <DataTable
              ref={dataTableRef}
              instanceId="demo-datatable"
              initialConfig={initialConfig}
              onStateChange={(state) => {
                console.log('State changed:', state);
              }}
              onConfigChange={(config) => {
                console.log('Config changed:', config);
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Column Formatting</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Right-click on any column header to open the context menu</li>
              <li>Select "Format Column" to open the formatting dialog</li>
              <li>Configure number formats, text alignment, colors, and more</li>
              <li>Add status indicators like progress bars, ratings, or traffic lights</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Column Management</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click the "Columns" button in the toolbar to manage column visibility</li>
              <li>Drag column headers to reorder them</li>
              <li>Resize columns by dragging the column borders</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Data Operations</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click column headers to sort data</li>
              <li>Use the filter icon in column headers to filter data</li>
              <li>Select rows using checkboxes (when enabled)</li>
              <li>Export data in CSV or JSON format using the Export button</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Sample Formatting Ideas</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Price:</strong> Format as currency with $ symbol</li>
              <li><strong>Discount:</strong> Format as percentage with conditional colors</li>
              <li><strong>Rating:</strong> Display as star rating (Status Indicators tab)</li>
              <li><strong>Revenue:</strong> Add data bars to visualize values</li>
              <li><strong>Status:</strong> Use traffic lights or conditional formatting</li>
              <li><strong>In Stock:</strong> Format boolean as Yes/No or use icons</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DataTableDemo: React.FC = () => {
  return (
    <AGV1Provider appId="datatable-demo">
      <DataTableDemoContent />
    </AGV1Provider>
  );
};