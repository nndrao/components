/**
 * Dummy Data Source
 * 
 * Provides sample data for components when no real datasource is configured.
 * This helps with development and testing by showing realistic data in grids.
 */

import { DataUpdate, UpdateType } from '@/types/agv1/datasource.types';
import { IDataSource } from '@/types/agv1/component.interfaces';
import { EventEmitter } from '../websocket/EventEmitter';
import { ColDef } from 'ag-grid-community';

export interface DummyDataConfig {
  recordCount?: number;
  updateInterval?: number; // milliseconds, 0 = no updates
  dataType?: 'products' | 'trades' | 'orders' | 'positions';
}

export class DummyDataSource extends EventEmitter implements IDataSource {
  id: string;
  name: string;
  type: 'dummy' = 'dummy';
  private data: any[] = [];
  private columnDefs: ColDef[] = [];
  private updateTimer?: NodeJS.Timeout;
  private config: DummyDataConfig;
  private subscribers: ((data: any) => void)[] = [];
  
  constructor(id: string = 'dummy-ds', name: string = 'Dummy Data Source', config: DummyDataConfig = {}) {
    super();
    this.id = id;
    this.name = name;
    this.config = {
      recordCount: 100,
      updateInterval: 0,
      dataType: 'products',
      ...config
    };
    
    this.generateInitialData();
    
    if (this.config.updateInterval && this.config.updateInterval > 0) {
      this.startUpdates();
    }
  }
  
  private generateInitialData(): void {
    this.data = [];
    
    switch (this.config.dataType) {
      case 'products':
        this.generateProductData();
        break;
      case 'trades':
        this.generateTradeData();
        break;
      case 'orders':
        this.generateOrderData();
        break;
      case 'positions':
        this.generatePositionData();
        break;
      default:
        this.generateProductData();
    }
  }
  
  private generateProductData(): void {
    const products = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones', 'Webcam', 'Desk', 'Chair', 'Cable', 'Hub'];
    const brands = ['TechCorp', 'Digital Pro', 'Smart Devices', 'Future Tech', 'Innovate Inc'];
    const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Pending'];
    
    // Define columns for product data
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 80, filter: 'agNumberColumnFilter' },
      { field: 'product', headerName: 'Product', width: 150 },
      { field: 'brand', headerName: 'Brand', width: 150 },
      { 
        field: 'price', 
        headerName: 'Price', 
        width: 100, 
        filter: 'agNumberColumnFilter', 
        valueFormatter: (params: any) => params.value ? `$${params.value.toLocaleString()}` : '' 
      },
      { field: 'quantity', headerName: 'Quantity', width: 100, filter: 'agNumberColumnFilter' },
      { 
        field: 'status', 
        headerName: 'Status', 
        width: 120, 
        cellClassRules: {
          'text-green-600': (params: any) => params.value === 'In Stock',
          'text-yellow-600': (params: any) => params.value === 'Low Stock',
          'text-red-600': (params: any) => params.value === 'Out of Stock',
          'text-blue-600': (params: any) => params.value === 'Pending'
        }
      },
      { 
        field: 'revenue', 
        headerName: 'Revenue', 
        width: 120, 
        filter: 'agNumberColumnFilter', 
        valueFormatter: (params: any) => params.value ? `$${params.value.toLocaleString()}` : '' 
      },
      { 
        field: 'profit', 
        headerName: 'Profit', 
        width: 120, 
        filter: 'agNumberColumnFilter', 
        valueFormatter: (params: any) => params.value ? `$${params.value.toLocaleString()}` : '' 
      },
      { 
        field: 'margin', 
        headerName: 'Margin %', 
        width: 100, 
        filter: 'agNumberColumnFilter', 
        valueFormatter: (params: any) => params.value ? `${(params.value * 100).toFixed(1)}%` : '' 
      },
      { 
        field: 'lastUpdated', 
        headerName: 'Last Updated', 
        width: 180, 
        valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '' 
      }
    ];
    
    console.log('DummyDataSource: Generating', this.config.recordCount, 'product records');
    
    for (let i = 1; i <= this.config.recordCount!; i++) {
      this.data.push({
        id: i,
        product: products[Math.floor(Math.random() * products.length)],
        brand: brands[Math.floor(Math.random() * brands.length)],
        price: Math.floor(Math.random() * 2000) + 100,
        quantity: Math.floor(Math.random() * 100) + 1,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        revenue: Math.floor(Math.random() * 50000) + 1000,
        profit: Math.floor(Math.random() * 10000) + 100,
        margin: (Math.random() * 0.5 + 0.1).toFixed(2)
      });
    }
  }
  
  private generateTradeData(): void {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];
    const sides = ['Buy', 'Sell'];
    const statuses = ['Filled', 'Partial', 'Pending', 'Cancelled'];
    
    // Define columns for trade data
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 60, hide: true },
      { field: 'tradeId', headerName: 'Trade ID', width: 120 },
      { field: 'symbol', headerName: 'Symbol', width: 100 },
      { 
        field: 'side', 
        headerName: 'Side', 
        width: 80,
        cellClassRules: {
          'text-green-600': (params: any) => params.value === 'Buy',
          'text-red-600': (params: any) => params.value === 'Sell'
        }
      },
      { field: 'quantity', headerName: 'Quantity', width: 100, filter: 'agNumberColumnFilter' },
      { 
        field: 'price', 
        headerName: 'Price', 
        width: 100, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toFixed(2)}` : ''
      },
      { 
        field: 'value', 
        headerName: 'Value', 
        width: 120, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toLocaleString()}` : ''
      },
      { field: 'status', headerName: 'Status', width: 100 },
      { 
        field: 'timestamp', 
        headerName: 'Timestamp', 
        width: 180, 
        valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleString() : '' 
      },
      { field: 'venue', headerName: 'Venue', width: 100 }
    ];
    
    console.log('DummyDataSource: Generating', this.config.recordCount, 'trade records');
    
    for (let i = 1; i <= this.config.recordCount!; i++) {
      const quantity = Math.floor(Math.random() * 1000) + 100;
      const price = Math.random() * 500 + 50;
      
      this.data.push({
        id: i,
        tradeId: `TRD${String(i).padStart(6, '0')}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        side: sides[Math.floor(Math.random() * sides.length)],
        quantity: quantity,
        price: price.toFixed(2),
        value: (quantity * price).toFixed(2),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
        venue: ['NYSE', 'NASDAQ', 'BATS'][Math.floor(Math.random() * 3)]
      });
    }
  }
  
  private generateOrderData(): void {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];
    const sides = ['Buy', 'Sell'];
    const types = ['Market', 'Limit', 'Stop', 'Stop Limit'];
    const statuses = ['New', 'Working', 'Filled', 'Partial Fill', 'Cancelled', 'Rejected'];
    
    // Define columns for order data
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 60, hide: true },
      { field: 'orderId', headerName: 'Order ID', width: 120 },
      { field: 'symbol', headerName: 'Symbol', width: 100 },
      { 
        field: 'side', 
        headerName: 'Side', 
        width: 80,
        cellClassRules: {
          'text-green-600': (params: any) => params.value === 'Buy',
          'text-red-600': (params: any) => params.value === 'Sell'
        }
      },
      { field: 'orderType', headerName: 'Type', width: 100 },
      { field: 'quantity', headerName: 'Quantity', width: 100, filter: 'agNumberColumnFilter' },
      { 
        field: 'price', 
        headerName: 'Price', 
        width: 100, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toFixed(2)}` : ''
      },
      { field: 'filledQty', headerName: 'Filled', width: 100, filter: 'agNumberColumnFilter' },
      { 
        field: 'status', 
        headerName: 'Status', 
        width: 120,
        cellClassRules: {
          'text-green-600': (params: any) => params.value === 'Filled',
          'text-yellow-600': (params: any) => params.value === 'Working' || params.value === 'Partial Fill',
          'text-red-600': (params: any) => params.value === 'Cancelled' || params.value === 'Rejected',
          'text-blue-600': (params: any) => params.value === 'New'
        }
      },
      { 
        field: 'createdAt', 
        headerName: 'Created', 
        width: 180, 
        valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleString() : '' 
      }
    ];
    
    console.log('DummyDataSource: Generating', this.config.recordCount, 'order records');
    
    for (let i = 1; i <= this.config.recordCount!; i++) {
      this.data.push({
        id: i,
        orderId: `ORD${String(i).padStart(6, '0')}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        side: sides[Math.floor(Math.random() * sides.length)],
        orderType: types[Math.floor(Math.random() * types.length)],
        quantity: Math.floor(Math.random() * 1000) + 100,
        price: (Math.random() * 500 + 50).toFixed(2),
        filledQty: Math.floor(Math.random() * 500),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()
      });
    }
  }
  
  private generatePositionData(): void {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];
    const accounts = ['ACC001', 'ACC002', 'ACC003', 'ACC004', 'ACC005'];
    
    // Define columns for position data
    this.columnDefs = [
      { field: 'id', headerName: 'ID', width: 60, hide: true },
      { field: 'symbol', headerName: 'Symbol', width: 100 },
      { field: 'account', headerName: 'Account', width: 100 },
      { 
        field: 'quantity', 
        headerName: 'Quantity', 
        width: 100, 
        filter: 'agNumberColumnFilter',
        cellClassRules: {
          'text-green-600': (params: any) => params.value > 0,
          'text-red-600': (params: any) => params.value < 0
        }
      },
      { 
        field: 'avgPrice', 
        headerName: 'Avg Price', 
        width: 100, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toFixed(2)}` : ''
      },
      { 
        field: 'currentPrice', 
        headerName: 'Current Price', 
        width: 120, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toFixed(2)}` : ''
      },
      { 
        field: 'marketValue', 
        headerName: 'Market Value', 
        width: 120, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toLocaleString()}` : ''
      },
      { 
        field: 'pnl', 
        headerName: 'P&L', 
        width: 120, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `$${parseFloat(params.value).toLocaleString()}` : '',
        cellClassRules: {
          'text-green-600': (params: any) => parseFloat(params.value) > 0,
          'text-red-600': (params: any) => parseFloat(params.value) < 0
        }
      },
      { 
        field: 'pnlPercent', 
        headerName: 'P&L %', 
        width: 100, 
        filter: 'agNumberColumnFilter',
        valueFormatter: (params: any) => params.value ? `${parseFloat(params.value).toFixed(2)}%` : '',
        cellClassRules: {
          'text-green-600': (params: any) => parseFloat(params.value) > 0,
          'text-red-600': (params: any) => parseFloat(params.value) < 0
        }
      },
      { 
        field: 'lastUpdate', 
        headerName: 'Last Update', 
        width: 180, 
        valueFormatter: (params: any) => params.value ? new Date(params.value).toLocaleString() : '' 
      }
    ];
    
    console.log('DummyDataSource: Generating', this.config.recordCount, 'position records');
    
    for (let i = 1; i <= this.config.recordCount!; i++) {
      const quantity = Math.floor(Math.random() * 10000) - 5000;
      const avgPrice = Math.random() * 500 + 50;
      const currentPrice = avgPrice * (1 + (Math.random() - 0.5) * 0.2);
      const pnl = quantity * (currentPrice - avgPrice);
      
      this.data.push({
        id: i,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        account: accounts[Math.floor(Math.random() * accounts.length)],
        quantity: quantity,
        avgPrice: avgPrice.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        marketValue: (quantity * currentPrice).toFixed(2),
        pnl: pnl.toFixed(2),
        pnlPercent: ((pnl / (quantity * avgPrice)) * 100).toFixed(2),
        lastUpdate: new Date().toISOString()
      });
    }
  }
  
  private startUpdates(): void {
    this.updateTimer = setInterval(() => {
      // Update random records
      const updateCount = Math.floor(Math.random() * 5) + 1;
      const updates: DataUpdate[] = [];
      
      for (let i = 0; i < updateCount; i++) {
        const index = Math.floor(Math.random() * this.data.length);
        const record = this.data[index];
        
        // Update based on data type
        switch (this.config.dataType) {
          case 'products':
            record.quantity = Math.floor(Math.random() * 100) + 1;
            record.lastUpdated = new Date().toISOString();
            break;
          case 'trades':
            // Trades don't typically update
            continue;
          case 'orders':
            if (record.status === 'Working' || record.status === 'Partial Fill') {
              record.filledQty = Math.min(record.quantity, record.filledQty + Math.floor(Math.random() * 100));
              if (record.filledQty >= record.quantity) {
                record.status = 'Filled';
              }
            }
            break;
          case 'positions':
            const currentPrice = parseFloat(record.currentPrice);
            const newPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
            record.currentPrice = newPrice.toFixed(2);
            record.marketValue = (record.quantity * newPrice).toFixed(2);
            const avgPrice = parseFloat(record.avgPrice);
            const pnl = record.quantity * (newPrice - avgPrice);
            record.pnl = pnl.toFixed(2);
            record.pnlPercent = ((pnl / (record.quantity * avgPrice)) * 100).toFixed(2);
            record.lastUpdate = new Date().toISOString();
            break;
        }
        
        updates.push({
          type: 'update' as UpdateType,
          key: record.id,
          data: { ...record },
          timestamp: new Date().toISOString()
        });
      }
      
      // Notify subscribers of batch update
      this.notifySubscribers({
        type: 'update',
        data: updates,
        metadata: { isBatch: true }
      });
    }, this.config.updateInterval);
  }
  
  // IDataSource implementation
  async connect(): Promise<void> {
    // Already connected
    return Promise.resolve();
  }
  
  async disconnect(): Promise<void> {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    return Promise.resolve();
  }
  
  async getData(): Promise<any[]> {
    return [...this.data];
  }
  
  subscribe(callback: (data: any) => void): () => void {
    this.subscribers.push(callback);
    
    // Send initial data with schema
    console.log('DummyDataSource: Sending initial data to subscriber, count:', this.data.length);
    callback({
      type: 'initial',
      data: [...this.data],
      schema: {
        columns: this.columnDefs,
        keyColumn: 'id'
      }
    });
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  private notifySubscribers(data: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }
  
  // Additional methods
  getStatistics(): any {
    return {
      totalRecords: this.data.length,
      dataType: this.config.dataType,
      updateInterval: this.config.updateInterval,
      isUpdating: !!this.updateTimer
    };
  }
  
  get status(): 'connected' | 'disconnected' | 'error' | 'connecting' {
    return 'connected';
  }
  
  // Get column definitions
  getColumns(): ColDef[] {
    return [...this.columnDefs];
  }
}

// Factory function for creating dummy datasources
export function createDummyDataSource(type: DummyDataConfig['dataType'] = 'products', updateInterval = 0): DummyDataSource {
  const id = `dummy-${type}-${Date.now()}`;
  const name = `Dummy ${type.charAt(0).toUpperCase() + type.slice(1)} Data`;
  return new DummyDataSource(id, name, {
    dataType: type,
    updateInterval,
    recordCount: 100
  });
}