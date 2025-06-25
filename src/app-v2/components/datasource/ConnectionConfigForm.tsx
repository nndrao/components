/**
 * ConnectionConfigForm Component
 * 
 * Form for configuring data source connections.
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Play } from 'lucide-react';
import { DataProviderType } from '../../providers/data/data-provider.types';
import { ConnectionFormValues, ConnectionTestResult } from './types';

interface ConnectionConfigFormProps {
  /**
   * Form values
   */
  values: ConnectionFormValues;
  
  /**
   * Update form values
   */
  onChange: (values: ConnectionFormValues) => void;
  
  /**
   * Data source name
   */
  name: string;
  
  /**
   * Update name
   */
  onNameChange: (name: string) => void;
  
  /**
   * Data source description
   */
  description: string;
  
  /**
   * Update description
   */
  onDescriptionChange: (description: string) => void;
  
  /**
   * Key column
   */
  keyColumn: string;
  
  /**
   * Update key column
   */
  onKeyColumnChange: (keyColumn: string) => void;
  
  /**
   * Available field paths for key column
   */
  availableFields?: string[];
  
  /**
   * Test connection callback
   */
  onTest?: () => Promise<ConnectionTestResult>;
  
  /**
   * Form disabled state
   */
  disabled?: boolean;
}

export function ConnectionConfigForm({
  values,
  onChange,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  keyColumn,
  onKeyColumnChange,
  availableFields = [],
  onTest,
  disabled = false,
}: ConnectionConfigFormProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Update a specific field
  const updateField = <K extends keyof ConnectionFormValues>(
    field: K,
    value: ConnectionFormValues[K]
  ) => {
    onChange({ ...values, [field]: value });
  };

  // Update nested settings
  const updateSetting = (key: string, value: any) => {
    onChange({
      ...values,
      settings: {
        ...values.settings,
        [key]: value,
      },
    });
  };

  // Test connection
  const handleTest = async () => {
    if (!onTest) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Info - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ds-name" className="text-xs">Name *</Label>
          <Input
            id="ds-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="My Data Source"
            className="h-7 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-description" className="text-xs">Description</Label>
          <Input
            id="ds-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description"
            className="h-7 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Connection Settings - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="provider-type" className="text-xs">Provider Type</Label>
          <Select
            value={values.type}
            onValueChange={(value) => updateField('type', value as DataProviderType)}
            disabled={disabled}
          >
            <SelectTrigger id="provider-type" className="h-7 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DataProviderType.WebSocket}>WebSocket</SelectItem>
              <SelectItem value={DataProviderType.REST}>REST API</SelectItem>
              <SelectItem value={DataProviderType.Polling}>Polling</SelectItem>
              <SelectItem value={DataProviderType.SSE}>Server-Sent Events</SelectItem>
              <SelectItem value={DataProviderType.Static}>Static/Mock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="key-column" className="text-xs">Key Column</Label>
          {availableFields.length > 0 ? (
            <Select
              value={keyColumn || '__none__'}
              onValueChange={(value) => onKeyColumnChange(value === '__none__' ? '' : value)}
              disabled={disabled}
            >
              <SelectTrigger id="key-column" className="h-7 text-sm">
                <SelectValue placeholder="Select key column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="key-column"
              value={keyColumn}
              onChange={(e) => onKeyColumnChange(e.target.value)}
              placeholder="e.g., id, positionId"
              className="h-7 text-sm"
              disabled={disabled}
            />
          )}
        </div>
      </div>

      {/* Connection URL - full width */}
      <div className="space-y-1.5">
        <Label htmlFor="url" className="text-xs">
          {values.type === DataProviderType.WebSocket ? 'WebSocket URL' : 'Endpoint URL'}
        </Label>
        <Input
          id="url"
          type="url"
          value={values.url}
          onChange={(e) => updateField('url', e.target.value)}
          placeholder={
            values.type === DataProviderType.WebSocket
              ? 'ws://localhost:8080/ws'
              : 'https://api.example.com/data'
          }
          className="h-7 text-sm"
          disabled={disabled}
        />
      </div>

      {/* STOMP WebSocket settings */}
      {values.type === DataProviderType.WebSocket && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data-type" className="text-xs">Data Type</Label>
              <Select
                value={values.settings?.dataType || 'positions'}
                onValueChange={(value) => updateSetting('dataType', value)}
                disabled={disabled}
              >
                <SelectTrigger id="data-type" className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positions">Positions</SelectItem>
                  <SelectItem value="trades">Trades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message-rate" className="text-xs">Update Rate (msg/sec)</Label>
              <Input
                id="message-rate"
                type="number"
                value={values.settings?.messageRate || 1000}
                onChange={(e) => updateSetting('messageRate', parseInt(e.target.value) || 1000)}
                placeholder="1000"
                className="h-7 text-sm"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-size" className="text-xs">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                value={values.settings?.batchSize || ''}
                onChange={(e) => updateSetting('batchSize', parseInt(e.target.value) || undefined)}
                placeholder="Auto (rate/10)"
                className="h-7 text-sm"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trigger-format" className="text-xs">Trigger Format</Label>
              <Select
                value={values.settings?.triggerFormat || 'text'}
                onValueChange={(value) => updateSetting('triggerFormat', value)}
                disabled={disabled}
              >
                <SelectTrigger id="trigger-format" className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="listener-topic" className="text-xs">Listener Topic</Label>
              <Input
                id="listener-topic"
                value={values.settings?.listenerTopic || ''}
                onChange={(e) => updateSetting('listenerTopic', e.target.value)}
                placeholder="/topic/positions"
                className="h-7 text-sm"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trigger-destination" className="text-xs">Trigger Destination</Label>
              <Input
                id="trigger-destination"
                value={values.settings?.triggerDestination || ''}
                onChange={(e) => updateSetting('triggerDestination', e.target.value)}
                placeholder="/app/trigger"
                className="h-7 text-sm"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trigger-message" className="text-xs">Trigger Message</Label>
            <Textarea
              id="trigger-message"
              value={values.settings?.triggerMessage || ''}
              onChange={(e) => {
                updateSetting('triggerMessage', e.target.value);
                // Validate JSON format
                if (values.settings?.triggerFormat === 'json' && e.target.value) {
                  try {
                    JSON.parse(e.target.value);
                    setJsonError(null);
                  } catch (err) {
                    setJsonError('Invalid JSON format');
                  }
                } else {
                  setJsonError(null);
                }
              }}
              placeholder={values.settings?.triggerFormat === 'json' 
                ? '{"action": "subscribe", "symbols": ["AAPL", "GOOGL"]}'
                : 'START_FEED'
              }
              rows={3}
              className="font-mono text-xs h-16"
              disabled={disabled}
            />
            {jsonError && values.settings?.triggerFormat === 'json' && (
              <p className="text-[10px] text-destructive">{jsonError}</p>
            )}
          </div>

        </>
      )}

      {(values.type === DataProviderType.REST || values.type === DataProviderType.Polling) && (
        <>
          <div className="space-y-2">
            <Label htmlFor="http-method">HTTP Method</Label>
            <Select
              value={values.settings?.method || 'GET'}
              onValueChange={(value) => updateSetting('method', value)}
              disabled={disabled}
            >
              <SelectTrigger id="http-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {values.type === DataProviderType.Polling && (
            <div className="space-y-2">
              <Label htmlFor="polling-interval">Polling Interval (ms)</Label>
              <Input
                id="polling-interval"
                type="number"
                value={values.settings?.pollingInterval || 5000}
                onChange={(e) => updateSetting('pollingInterval', parseInt(e.target.value))}
                min={1000}
                step={1000}
                disabled={disabled}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="data-path">Data Path (Optional)</Label>
            <Input
              id="data-path"
              value={values.settings?.dataPath || ''}
              onChange={(e) => updateSetting('dataPath', e.target.value)}
              placeholder="data.items"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              JSON path to extract data from response (e.g., "data.items")
            </p>
          </div>
        </>
      )}

      {/* Advanced Settings */}
      <Accordion type="single" collapsible>
        <AccordionItem value="auth">
          <AccordionTrigger>Authentication</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-type">Type</Label>
                <Select
                  value={values.auth?.type || 'none'}
                  onValueChange={(value) => 
                    onChange({
                      ...values,
                      auth: { ...values.auth, type: value as any },
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger id="auth-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="apikey">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {values.auth?.type === 'bearer' && (
                <div className="space-y-2">
                  <Label htmlFor="auth-token">Bearer Token</Label>
                  <Input
                    id="auth-token"
                    type="password"
                    value={values.auth.credentials?.token || ''}
                    onChange={(e) =>
                      onChange({
                        ...values,
                        auth: {
                          ...values.auth!,
                          credentials: {
                            ...values.auth!.credentials,
                            token: e.target.value,
                          },
                        },
                      })
                    }
                    disabled={disabled}
                  />
                </div>
              )}

              {values.auth?.type === 'apikey' && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={values.auth.credentials?.apiKey || ''}
                    onChange={(e) =>
                      onChange({
                        ...values,
                        auth: {
                          ...values.auth!,
                          credentials: {
                            ...values.auth!.credentials,
                            apiKey: e.target.value,
                          },
                        },
                      })
                    }
                    disabled={disabled}
                  />
                </div>
              )}

              {values.auth?.type === 'basic' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="auth-username">Username</Label>
                    <Input
                      id="auth-username"
                      value={values.auth.credentials?.username || ''}
                      onChange={(e) =>
                        onChange({
                          ...values,
                          auth: {
                            ...values.auth!,
                            credentials: {
                              ...values.auth!.credentials,
                              username: e.target.value,
                            },
                          },
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-password">Password</Label>
                    <Input
                      id="auth-password"
                      type="password"
                      value={values.auth.credentials?.password || ''}
                      onChange={(e) =>
                        onChange({
                          ...values,
                          auth: {
                            ...values.auth!,
                            credentials: {
                              ...values.auth!.credentials,
                              password: e.target.value,
                            },
                          },
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="connection">
          <AccordionTrigger>Connection Settings</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={values.timeout || 30000}
                  onChange={(e) => updateField('timeout', parseInt(e.target.value))}
                  min={1000}
                  step={1000}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-reconnect"
                  checked={values.autoReconnect ?? true}
                  onCheckedChange={(checked) => updateField('autoReconnect', checked)}
                  disabled={disabled}
                />
                <Label htmlFor="auto-reconnect">Auto-reconnect on disconnect</Label>
              </div>

              {values.autoReconnect && (
                <div className="space-y-2">
                  <Label htmlFor="reconnect-interval">Reconnect Interval (ms)</Label>
                  <Input
                    id="reconnect-interval"
                    type="number"
                    value={values.reconnectInterval || 5000}
                    onChange={(e) => updateField('reconnectInterval', parseInt(e.target.value))}
                    min={1000}
                    step={1000}
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="transform">
          <AccordionTrigger>Data Transform</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parser">Parser</Label>
                <Select
                  value={values.settings?.parser || 'json'}
                  onValueChange={(value) => updateSetting('parser', value)}
                  disabled={disabled}
                >
                  <SelectTrigger id="parser">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="text">Plain Text</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="input-transform">Input Transform (JavaScript)</Label>
                <Textarea
                  id="input-transform"
                  value={values.settings?.inputTransform || ''}
                  onChange={(e) => updateSetting('inputTransform', e.target.value)}
                  placeholder="// Transform incoming data&#10;// data = incoming data&#10;return data;"
                  rows={4}
                  className="font-mono text-sm"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-transform">Output Transform (JavaScript)</Label>
                <Textarea
                  id="output-transform"
                  value={values.settings?.outputTransform || ''}
                  onChange={(e) => updateSetting('outputTransform', e.target.value)}
                  placeholder="// Transform outgoing messages&#10;// data = message to send&#10;return data;"
                  rows={4}
                  className="font-mono text-sm"
                  disabled={disabled}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Test Connection */}
      {onTest && (
        <div className="space-y-3">
          <Button
            onClick={handleTest}
            disabled={!values.url || testing || disabled}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {testResult.success
                  ? testResult.message || 'Connection successful!'
                  : testResult.error || 'Connection failed'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}