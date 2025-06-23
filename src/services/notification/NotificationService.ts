/**
 * Notification Service
 * 
 * Manages user notifications with support for different types,
 * durations, actions, and stacking. Integrates with UI toast
 * components for display.
 */

import { 
  INotificationService, 
  Notification, 
  NotificationOptions 
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Notification position on screen
 */
export type NotificationPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right'
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

/**
 * Extended notification with internal properties
 */
interface InternalNotification extends Notification {
  id: string;
  timestamp: number;
  timer?: NodeJS.Timeout;
}

/**
 * Notification event types
 */
export type NotificationEventType = 
  | 'show' 
  | 'hide' 
  | 'click' 
  | 'action-click';

/**
 * Notification event
 */
export interface NotificationEvent {
  type: NotificationEventType;
  notification: Notification;
}

/**
 * Notification event listener
 */
export type NotificationEventListener = (event: NotificationEvent) => void;

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  position?: NotificationPosition;
  maxNotifications?: number;
  defaultDuration?: number;
  stackNotifications?: boolean;
  playSound?: boolean;
  persistOnHover?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: NotificationServiceConfig = {
  position: 'top-right',
  maxNotifications: 5,
  defaultDuration: 5000,
  stackNotifications: true,
  playSound: false,
  persistOnHover: true
};

/**
 * Notification service implementation
 */
export class NotificationService implements INotificationService {
  private notifications: Map<string, InternalNotification> = new Map();
  private eventListeners: NotificationEventListener[] = [];
  private config: NotificationServiceConfig;
  private notificationQueue: InternalNotification[] = [];
  private soundEnabled = true;

  constructor(config?: Partial<NotificationServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Show a notification
   */
  show(notification: Notification): void {
    const id = notification.id || uuidv4();
    
    const internalNotification: InternalNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };
    
    // Check if we need to queue or stack
    if (this.notifications.size >= this.config.maxNotifications!) {
      if (this.config.stackNotifications) {
        this.notificationQueue.push(internalNotification);
        return;
      } else {
        // Remove oldest notification
        this.removeOldestNotification();
      }
    }
    
    // Add to active notifications
    this.notifications.set(id, internalNotification);
    
    // Set auto-hide timer
    if (notification.duration !== 0) {
      const duration = notification.duration || this.config.defaultDuration!;
      internalNotification.timer = setTimeout(() => {
        this.clear(id);
      }, duration);
    }
    
    // Play sound if enabled
    if (this.config.playSound && this.soundEnabled) {
      this.playNotificationSound(notification.type);
    }
    
    // Emit show event
    this.emitEvent({
      type: 'show',
      notification: internalNotification
    });
  }

  /**
   * Show success notification
   */
  success(message: string, options?: NotificationOptions): void {
    this.show({
      type: 'success',
      title: 'Success',
      message,
      duration: options?.duration,
      action: options?.action
    });
  }

  /**
   * Show error notification
   */
  error(message: string, options?: NotificationOptions): void {
    this.show({
      type: 'error',
      title: 'Error',
      message,
      duration: options?.duration || 0, // Errors don't auto-hide by default
      action: options?.action
    });
  }

  /**
   * Show warning notification
   */
  warning(message: string, options?: NotificationOptions): void {
    this.show({
      type: 'warning',
      title: 'Warning',
      message,
      duration: options?.duration,
      action: options?.action
    });
  }

  /**
   * Show info notification
   */
  info(message: string, options?: NotificationOptions): void {
    this.show({
      type: 'info',
      title: 'Info',
      message,
      duration: options?.duration,
      action: options?.action
    });
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    // Clear all timers
    this.notifications.forEach(notification => {
      if (notification.timer) {
        clearTimeout(notification.timer);
      }
    });
    
    // Clear notifications
    const notifications = Array.from(this.notifications.values());
    this.notifications.clear();
    
    // Emit hide events
    notifications.forEach(notification => {
      this.emitEvent({
        type: 'hide',
        notification
      });
    });
    
    // Process queue
    this.processQueue();
  }

  /**
   * Clear a specific notification
   */
  clear(id: string): void {
    const notification = this.notifications.get(id);
    
    if (!notification) {
      return;
    }
    
    // Clear timer
    if (notification.timer) {
      clearTimeout(notification.timer);
    }
    
    // Remove from map
    this.notifications.delete(id);
    
    // Emit hide event
    this.emitEvent({
      type: 'hide',
      notification
    });
    
    // Process queue
    this.processQueue();
  }

  /**
   * Get all active notifications
   */
  getActiveNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(({ timer, timestamp, ...notification }) => notification);
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | null {
    const notification = this.notifications.get(id);
    
    if (!notification) {
      return null;
    }
    
    const { timer, timestamp, ...publicNotification } = notification;
    return publicNotification;
  }

  /**
   * Handle notification click
   */
  handleClick(id: string): void {
    const notification = this.notifications.get(id);
    
    if (notification) {
      this.emitEvent({
        type: 'click',
        notification
      });
    }
  }

  /**
   * Handle action click
   */
  handleActionClick(id: string): void {
    const notification = this.notifications.get(id);
    
    if (notification && notification.action) {
      notification.action.onClick();
      
      this.emitEvent({
        type: 'action-click',
        notification
      });
      
      // Clear notification after action
      this.clear(id);
    }
  }

  /**
   * Pause auto-hide timer
   */
  pauseAutoHide(id: string): void {
    const notification = this.notifications.get(id);
    
    if (notification && notification.timer) {
      clearTimeout(notification.timer);
      notification.timer = undefined;
    }
  }

  /**
   * Resume auto-hide timer
   */
  resumeAutoHide(id: string): void {
    const notification = this.notifications.get(id);
    
    if (notification && notification.duration && notification.duration !== 0) {
      // Calculate remaining time
      const elapsed = Date.now() - notification.timestamp;
      const remaining = Math.max(0, notification.duration - elapsed);
      
      if (remaining > 0) {
        notification.timer = setTimeout(() => {
          this.clear(id);
        }, remaining);
      } else {
        this.clear(id);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable/disable sound
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: NotificationEventListener): () => void {
    this.eventListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get notification statistics
   */
  getStatistics(): {
    active: number;
    queued: number;
    totalShown: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {
      success: 0,
      error: 0,
      warning: 0,
      info: 0
    };
    
    this.notifications.forEach(notification => {
      byType[notification.type]++;
    });
    
    return {
      active: this.notifications.size,
      queued: this.notificationQueue.length,
      totalShown: 0, // Would need to track this
      byType
    };
  }

  /**
   * Process notification queue
   */
  private processQueue(): void {
    while (
      this.notificationQueue.length > 0 && 
      this.notifications.size < this.config.maxNotifications!
    ) {
      const notification = this.notificationQueue.shift()!;
      this.show(notification);
    }
  }

  /**
   * Remove oldest notification
   */
  private removeOldestNotification(): void {
    let oldestId: string | null = null;
    let oldestTimestamp = Infinity;
    
    this.notifications.forEach((notification, id) => {
      if (notification.timestamp < oldestTimestamp) {
        oldestTimestamp = notification.timestamp;
        oldestId = id;
      }
    });
    
    if (oldestId) {
      this.clear(oldestId);
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(type: Notification['type']): void {
    // In a real implementation, this would play actual sounds
    // For now, we'll just use the Web Audio API if available
    try {
      if (typeof window === 'undefined' || !window.AudioContext) {
        return;
      }
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different types
      switch (type) {
        case 'success':
          oscillator.frequency.value = 800;
          break;
        case 'error':
          oscillator.frequency.value = 300;
          break;
        case 'warning':
          oscillator.frequency.value = 500;
          break;
        case 'info':
          oscillator.frequency.value = 600;
          break;
      }
      
      gainNode.gain.value = 0.1;
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Ignore sound errors
    }
  }

  /**
   * Emit notification event
   */
  private emitEvent(event: NotificationEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in notification event listener:', error);
      }
    });
  }

  /**
   * Create notification groups for stacking
   */
  getNotificationGroups(): Map<string, Notification[]> {
    const groups = new Map<string, Notification[]>();
    
    this.notifications.forEach(notification => {
      const key = `${notification.type}-${notification.title}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key)!.push(notification);
    });
    
    return groups;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.clearAll();
    this.eventListeners = [];
    this.notificationQueue = [];
  }
}