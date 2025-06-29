/**
 * SharedWorker Message Types and Interfaces
 * 
 * Defines the communication protocol between main thread and SharedWorker
 */

import { ConnectionStatus, DataProviderConfig, DataProviderTrigger } from '../providers/data/data-provider.types';

/**
 * Message types for worker communication
 */
export enum WorkerMessageType {
  // Connection management
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  
  // Subscription management
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  
  // Data flow
  DATA = 'DATA',
  SNAPSHOT = 'SNAPSHOT',
  TRIGGER = 'TRIGGER',
  
  // Status and metadata
  STATUS = 'STATUS',
  ERROR = 'ERROR',
  SNAPSHOT_COMPLETE = 'SNAPSHOT_COMPLETE',
  
  // Heartbeat
  PING = 'PING',
  PONG = 'PONG',
}

/**
 * Base message structure
 */
export interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  timestamp?: number;
}

/**
 * Connection message payload
 */
export interface ConnectionPayload {
  providerId: string;
  config: DataProviderConfig;
  subscriberId: string;
}

/**
 * Subscription message payload
 */
export interface SubscriptionPayload {
  providerId: string;
  subscriberId: string;
}

/**
 * Data message payload
 */
export interface DataPayload {
  providerId: string;
  data: any;
}

/**
 * Snapshot message payload
 */
export interface SnapshotPayload {
  providerId: string;
  data: any[];
  metadata?: {
    isPartial: boolean;
    totalReceived: number;
  };
}

/**
 * Trigger message payload
 */
export interface TriggerPayload {
  providerId: string;
  trigger: DataProviderTrigger;
}

/**
 * Status message payload
 */
export interface StatusPayload {
  providerId: string;
  status: ConnectionStatus;
  metadata?: any;
}

/**
 * Error message payload
 */
export interface ErrorPayload {
  providerId: string;
  error: string;
  code?: string;
}

/**
 * Worker port information
 */
export interface WorkerPort {
  port: MessagePort;
  subscriberIds: Set<string>;
  lastActivity: number;
}

/**
 * Provider subscription tracking
 */
export interface ProviderSubscription {
  providerId: string;
  subscriberIds: Set<string>;
  config: DataProviderConfig;
}

/**
 * Message with specific payload types
 */
export type TypedWorkerMessage = 
  | (WorkerMessage & { type: WorkerMessageType.CONNECT; payload: ConnectionPayload })
  | (WorkerMessage & { type: WorkerMessageType.DISCONNECT; payload: SubscriptionPayload })
  | (WorkerMessage & { type: WorkerMessageType.SUBSCRIBE; payload: SubscriptionPayload })
  | (WorkerMessage & { type: WorkerMessageType.UNSUBSCRIBE; payload: SubscriptionPayload })
  | (WorkerMessage & { type: WorkerMessageType.DATA; payload: DataPayload })
  | (WorkerMessage & { type: WorkerMessageType.SNAPSHOT; payload: SnapshotPayload })
  | (WorkerMessage & { type: WorkerMessageType.TRIGGER; payload: TriggerPayload })
  | (WorkerMessage & { type: WorkerMessageType.STATUS; payload: StatusPayload })
  | (WorkerMessage & { type: WorkerMessageType.ERROR; payload: ErrorPayload })
  | (WorkerMessage & { type: WorkerMessageType.CONNECTED; payload?: { providerId: string } })
  | (WorkerMessage & { type: WorkerMessageType.DISCONNECTED; payload?: { providerId: string; reason?: string } })
  | (WorkerMessage & { type: WorkerMessageType.SNAPSHOT_COMPLETE; payload: { providerId: string } })
  | (WorkerMessage & { type: WorkerMessageType.PING })
  | (WorkerMessage & { type: WorkerMessageType.PONG });

/**
 * Worker-side provider state
 */
export interface WorkerProviderState {
  id: string;
  config: DataProviderConfig;
  status: ConnectionStatus;
  subscribers: Set<string>;
  snapshotCache?: any[];
  lastActivity: number;
}