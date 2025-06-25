/**
 * REST Data Provider
 * 
 * Implements data provider using REST API with polling support.
 */

import { BaseDataProvider } from './BaseDataProvider';
import {
  DataProviderConfig,
  ConnectionStatus,
  DataProviderTrigger,
  DataProviderMessage,
} from './data-provider.types';

interface RestProviderSettings {
  /**
   * HTTP method for requests
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  
  /**
   * Polling interval in ms (0 = no polling)
   */
  pollingInterval?: number;
  
  /**
   * Request body template
   */
  bodyTemplate?: any;
  
  /**
   * Query parameters
   */
  queryParams?: Record<string, string>;
  
  /**
   * Response data path (e.g., "data.items")
   */
  dataPath?: string;
}

export class RestDataProvider extends BaseDataProvider {
  private pollingTimer?: NodeJS.Timeout;
  private abortController?: AbortController;

  constructor(config: DataProviderConfig) {
    super(config);
  }

  /**
   * Connect to REST endpoint
   */
  async connect(): Promise<void> {
    if (this.state.status === ConnectionStatus.Connected) {
      return;
    }

    this.updateStatus(ConnectionStatus.Connecting);

    try {
      // Test connection with initial request
      await this.fetchData();
      
      this.handleConnect();
      
      // Start polling if configured
      const settings = this.config.settings as RestProviderSettings;
      if (settings?.pollingInterval && settings.pollingInterval > 0) {
        this.startPolling(settings.pollingInterval);
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from REST endpoint
   */
  async disconnect(): Promise<void> {
    // Stop polling
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    // Abort any pending requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }

    this.updateStatus(ConnectionStatus.Disconnected);
  }

  /**
   * Send message implementation
   */
  protected async sendImpl(message: string | ArrayBuffer): Promise<void> {
    // For REST, sending means making a request with the message
    const settings = this.config.settings as RestProviderSettings;
    const method = settings?.method || 'POST';

    // Parse message to get request body
    let body: any;
    if (typeof message === 'string') {
      try {
        body = JSON.parse(message);
      } catch {
        body = { message };
      }
    } else {
      throw new Error('Binary data not supported by REST provider');
    }

    // Apply body template if configured
    if (settings?.bodyTemplate) {
      body = this.applyTemplate(settings.bodyTemplate, body);
    }

    // Make request
    await this.makeRequest(method, body);
  }

  /**
   * Override send to support trigger-based requests
   */
  async send(trigger: DataProviderTrigger): Promise<void> {
    if (this.state.status !== ConnectionStatus.Connected) {
      throw new Error('Provider is not connected');
    }

    try {
      const settings = this.config.settings as RestProviderSettings;
      const method = settings?.method || 'POST';

      // Format trigger for request
      let requestBody: any;
      
      if (typeof trigger === 'string') {
        // Plain string - try to parse or wrap
        try {
          requestBody = JSON.parse(trigger);
        } catch {
          requestBody = { trigger };
        }
      } else {
        // Already an object
        requestBody = trigger;
      }

      // Apply body template if configured
      if (settings?.bodyTemplate) {
        requestBody = this.applyTemplate(settings.bodyTemplate, requestBody);
      }

      // Make request and handle response
      const response = await this.makeRequest(method, requestBody);
      
      // Emit the response as data
      if (response) {
        this.handleData(response);
      }

      // Emit event
      this.emit('messageSent', trigger);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Fetch data from endpoint
   */
  private async fetchData(): Promise<void> {
    const settings = this.config.settings as RestProviderSettings;
    const method = settings?.method || 'GET';
    
    try {
      const data = await this.makeRequest(method);
      if (data !== null) {
        this.handleData(data);
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(method: string, body?: any): Promise<any> {
    const settings = this.config.settings as RestProviderSettings;
    
    // Build URL with query params
    let url = this.config.connection.url;
    if (settings?.queryParams) {
      const params = new URLSearchParams(settings.queryParams);
      url += `?${params.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.connection.headers,
    };

    // Add auth headers
    if (this.config.connection.auth) {
      switch (this.config.connection.auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${this.config.connection.auth.credentials?.token}`;
          break;
        case 'apikey':
          headers['X-API-Key'] = this.config.connection.auth.credentials?.apiKey || '';
          break;
        case 'basic':
          const username = this.config.connection.auth.credentials?.username || '';
          const password = this.config.connection.auth.credentials?.password || '';
          headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
          break;
      }
    }

    // Create abort controller
    this.abortController = new AbortController();

    // Make request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Extract data using path if configured
    if (settings?.dataPath && typeof data === 'object') {
      data = this.getValueByPath(data, settings.dataPath);
    }

    return data;
  }

  /**
   * Start polling
   */
  private startPolling(interval: number): void {
    this.pollingTimer = setInterval(() => {
      if (this.state.status === ConnectionStatus.Connected) {
        this.fetchData();
      }
    }, interval);
  }

  /**
   * Apply template to data
   */
  private applyTemplate(template: any, data: any): any {
    if (typeof template === 'string') {
      // Simple string replacement
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    } else if (typeof template === 'object') {
      // Deep merge
      const result: any = {};
      for (const key in template) {
        if (typeof template[key] === 'string' && template[key].startsWith('{{')) {
          // Template variable
          const varName = template[key].slice(2, -2);
          result[key] = data[varName] || template[key];
        } else if (typeof template[key] === 'object') {
          // Recursive
          result[key] = this.applyTemplate(template[key], data);
        } else {
          result[key] = template[key];
        }
      }
      return { ...result, ...data };
    }
    return data;
  }

  /**
   * Get value by dot notation path
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }
}