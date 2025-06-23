import { EventEmitter } from '../websocket/EventEmitter';
import type { WebSocketManager } from '../websocket/WebSocketManager';

export interface UserPresence {
  userId: string;
  userName: string;
  avatar?: string;
  color: string;
  status: 'active' | 'idle' | 'away';
  lastActivity: Date;
  currentLocation?: {
    componentId?: string;
    viewId?: string;
    selection?: any;
  };
  cursor?: {
    x: number;
    y: number;
    componentId: string;
  };
}

export interface CollaborativeActivity {
  id: string;
  userId: string;
  userName: string;
  type: 'view' | 'edit' | 'create' | 'delete' | 'share' | 'comment';
  target: {
    type: 'component' | 'profile' | 'datasource' | 'column' | 'cell';
    id: string;
    name?: string;
  };
  description: string;
  timestamp: Date;
  metadata?: any;
}

export interface CollaborationRoom {
  id: string;
  name: string;
  type: 'workspace' | 'component' | 'profile';
  participants: Map<string, UserPresence>;
  activities: CollaborativeActivity[];
  createdAt: Date;
}

export interface CollaborationConfig {
  userId: string;
  userName: string;
  avatar?: string;
  color?: string;
  websocketConnectionId: string;
  presenceTopic: string;
  activityTopic: string;
  cursorTopic: string;
}

/**
 * Collaboration Service
 * 
 * Manages real-time collaboration features including presence,
 * activity tracking, and shared cursors.
 */
export class CollaborationService extends EventEmitter {
  private config: CollaborationConfig;
  private wsManager: WebSocketManager;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private currentUser: UserPresence;
  private presenceUpdateInterval?: NodeJS.Timeout;
  private idleTimeout?: NodeJS.Timeout;
  private subscriptions: Map<string, string> = new Map();

  constructor(config: CollaborationConfig, wsManager: WebSocketManager) {
    super();
    this.config = config;
    this.wsManager = wsManager;
    
    // Initialize current user
    this.currentUser = {
      userId: config.userId,
      userName: config.userName,
      avatar: config.avatar,
      color: config.color || this.generateUserColor(config.userId),
      status: 'active',
      lastActivity: new Date(),
    };

    this.initialize();
  }

  private initialize(): void {
    // Subscribe to presence updates
    try {
      const presenceSub = this.wsManager.subscribe(
        this.config.websocketConnectionId,
        this.config.presenceTopic,
        this.handlePresenceUpdate.bind(this)
      );
      this.subscriptions.set('presence', presenceSub);

      // Subscribe to activity updates
      const activitySub = this.wsManager.subscribe(
        this.config.websocketConnectionId,
        this.config.activityTopic,
        this.handleActivityUpdate.bind(this)
      );
      this.subscriptions.set('activity', activitySub);

      // Subscribe to cursor updates
      const cursorSub = this.wsManager.subscribe(
        this.config.websocketConnectionId,
        this.config.cursorTopic,
        this.handleCursorUpdate.bind(this)
      );
      this.subscriptions.set('cursor', cursorSub);
    } catch (error) {
      console.error('Failed to initialize collaboration subscriptions:', error);
    }

    // Start presence updates
    this.startPresenceUpdates();
    
    // Set up idle detection
    this.setupIdleDetection();
  }

  /**
   * Join a collaboration room
   */
  public async joinRoom(
    roomId: string,
    roomName: string,
    roomType: CollaborationRoom['type']
  ): Promise<void> {
    if (this.rooms.has(roomId)) {
      return;
    }

    const room: CollaborationRoom = {
      id: roomId,
      name: roomName,
      type: roomType,
      participants: new Map(),
      activities: [],
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);

    // Announce presence
    this.broadcastPresence(roomId);

    // Subscribe to room-specific topics
    const roomPresenceSub = this.wsManager.subscribe(
      this.config.websocketConnectionId,
      `${this.config.presenceTopic}/${roomId}`,
      (data) => this.handleRoomPresenceUpdate(roomId, data)
    );
    this.subscriptions.set(`room-presence-${roomId}`, roomPresenceSub);

    this.emit('roomJoined', { roomId, room });
  }

  /**
   * Leave a collaboration room
   */
  public async leaveRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Announce departure
    this.broadcastPresence(roomId, 'leave');

    // Unsubscribe from room topics
    const roomPresenceSub = this.subscriptions.get(`room-presence-${roomId}`);
    if (roomPresenceSub) {
      this.wsManager.unsubscribe(this.config.websocketConnectionId, roomPresenceSub);
      this.subscriptions.delete(`room-presence-${roomId}`);
    }

    this.rooms.delete(roomId);
    this.emit('roomLeft', { roomId });
  }

  /**
   * Update current user's location
   */
  public updateLocation(location: UserPresence['currentLocation']): void {
    this.currentUser.currentLocation = location;
    this.currentUser.lastActivity = new Date();
    this.setUserStatus('active');
    
    // Broadcast to relevant rooms
    this.rooms.forEach((room, roomId) => {
      if (this.shouldBroadcastToRoom(room, location)) {
        this.broadcastPresence(roomId);
      }
    });
  }

  /**
   * Update cursor position
   */
  public updateCursor(cursor: UserPresence['cursor']): void {
    this.currentUser.cursor = cursor;
    this.currentUser.lastActivity = new Date();
    
    // Throttle cursor updates
    this.throttledCursorBroadcast();
  }

  /**
   * Log an activity
   */
  public logActivity(
    type: CollaborativeActivity['type'],
    target: CollaborativeActivity['target'],
    description: string,
    metadata?: any
  ): void {
    const activity: CollaborativeActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUser.userId,
      userName: this.currentUser.userName,
      type,
      target,
      description,
      timestamp: new Date(),
      metadata,
    };

    // Add to relevant rooms
    this.rooms.forEach((room) => {
      if (this.shouldLogActivityInRoom(room, target)) {
        room.activities.push(activity);
        
        // Keep only recent activities
        if (room.activities.length > 100) {
          room.activities = room.activities.slice(-50);
        }
      }
    });

    // Broadcast activity
    this.broadcastActivity(activity);
    this.emit('activityLogged', activity);
  }

  /**
   * Get participants in a room
   */
  public getRoomParticipants(roomId: string): UserPresence[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }
    
    return Array.from(room.participants.values());
  }

  /**
   * Get recent activities in a room
   */
  public getRoomActivities(roomId: string, limit = 20): CollaborativeActivity[] {
    const room = this.rooms.get(roomId);
    if (!room) {
      return [];
    }
    
    return room.activities.slice(-limit);
  }

  /**
   * Get user by ID
   */
  public getUser(userId: string): UserPresence | undefined {
    for (const room of this.rooms.values()) {
      const user = room.participants.get(userId);
      if (user) {
        return user;
      }
    }
    return undefined;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): UserPresence {
    return { ...this.currentUser };
  }

  /**
   * Set user status
   */
  public setUserStatus(status: UserPresence['status']): void {
    if (this.currentUser.status !== status) {
      this.currentUser.status = status;
      this.broadcastPresenceToAll();
    }
  }

  private handlePresenceUpdate(data: any): void {
    const presence = data as UserPresence;
    
    // Update user in all rooms they're in
    this.rooms.forEach((room) => {
      if (data.action === 'leave') {
        room.participants.delete(presence.userId);
        this.emit('userLeft', { roomId: room.id, user: presence });
      } else {
        const existingUser = room.participants.get(presence.userId);
        room.participants.set(presence.userId, presence);
        
        if (!existingUser) {
          this.emit('userJoined', { roomId: room.id, user: presence });
        } else {
          this.emit('userUpdated', { roomId: room.id, user: presence });
        }
      }
    });
  }

  private handleRoomPresenceUpdate(roomId: string, data: any): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const presence = data as UserPresence;
    
    if (data.action === 'leave') {
      room.participants.delete(presence.userId);
      this.emit('userLeft', { roomId, user: presence });
    } else {
      const existingUser = room.participants.get(presence.userId);
      room.participants.set(presence.userId, presence);
      
      if (!existingUser) {
        this.emit('userJoined', { roomId, user: presence });
      } else {
        this.emit('userUpdated', { roomId, user: presence });
      }
    }
  }

  private handleActivityUpdate(data: any): void {
    const activity = data as CollaborativeActivity;
    
    // Don't process our own activities
    if (activity.userId === this.currentUser.userId) {
      return;
    }
    
    // Add to relevant rooms
    this.rooms.forEach((room) => {
      if (this.shouldLogActivityInRoom(room, activity.target)) {
        room.activities.push(activity);
        
        // Keep only recent activities
        if (room.activities.length > 100) {
          room.activities = room.activities.slice(-50);
        }
        
        this.emit('activityReceived', { roomId: room.id, activity });
      }
    });
  }

  private handleCursorUpdate(data: any): void {
    const { userId, cursor } = data;
    
    // Don't process our own cursor
    if (userId === this.currentUser.userId) {
      return;
    }
    
    // Update user's cursor in all rooms
    this.rooms.forEach((room) => {
      const user = room.participants.get(userId);
      if (user) {
        user.cursor = cursor;
        this.emit('cursorUpdated', { roomId: room.id, userId, cursor });
      }
    });
  }

  private broadcastPresence(roomId: string, action?: string): void {
    const presence = {
      ...this.currentUser,
      action: action || 'update',
    };

    this.wsManager.publish(
      this.config.websocketConnectionId,
      `${this.config.presenceTopic}/${roomId}`,
      presence
    );
  }

  private broadcastPresenceToAll(): void {
    this.rooms.forEach((_, roomId) => {
      this.broadcastPresence(roomId);
    });
  }

  private broadcastActivity(activity: CollaborativeActivity): void {
    this.wsManager.publish(
      this.config.websocketConnectionId,
      this.config.activityTopic,
      activity
    );
  }

  private throttledCursorBroadcast = this.throttle(() => {
    if (this.currentUser.cursor) {
      this.wsManager.publish(
        this.config.websocketConnectionId,
        this.config.cursorTopic,
        {
          userId: this.currentUser.userId,
          cursor: this.currentUser.cursor,
        }
      );
    }
  }, 50);

  private startPresenceUpdates(): void {
    // Send presence updates every 30 seconds
    this.presenceUpdateInterval = setInterval(() => {
      this.broadcastPresenceToAll();
    }, 30000);

    // Initial broadcast
    this.broadcastPresenceToAll();
  }

  private setupIdleDetection(): void {
    const resetIdleTimer = () => {
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout);
      }

      // Set to idle after 5 minutes of inactivity
      this.idleTimeout = setTimeout(() => {
        this.setUserStatus('idle');
      }, 5 * 60 * 1000);
    };

    // Reset timer on activity
    this.on('activityLogged', resetIdleTimer);
    resetIdleTimer();
  }

  private shouldBroadcastToRoom(
    room: CollaborationRoom,
    location?: UserPresence['currentLocation']
  ): boolean {
    if (room.type === 'workspace') {
      return true;
    }
    
    if (room.type === 'component' && location?.componentId === room.id) {
      return true;
    }
    
    if (room.type === 'profile' && location?.viewId === room.id) {
      return true;
    }
    
    return false;
  }

  private shouldLogActivityInRoom(
    room: CollaborationRoom,
    target: CollaborativeActivity['target']
  ): boolean {
    if (room.type === 'workspace') {
      return true;
    }
    
    if (room.type === 'component' && target.type === 'component' && target.id === room.id) {
      return true;
    }
    
    if (room.type === 'profile' && target.type === 'profile' && target.id === room.id) {
      return true;
    }
    
    return false;
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  private throttle(func: Function, delay: number): Function {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return (...args: any[]) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Clean up
   */
  public dispose(): void {
    // Clear intervals
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
    }
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    // Leave all rooms
    this.rooms.forEach((_, roomId) => {
      this.broadcastPresence(roomId, 'leave');
    });

    // Unsubscribe from all topics
    this.subscriptions.forEach((subId, key) => {
      try {
        this.wsManager.unsubscribe(this.config.websocketConnectionId, subId);
      } catch (error) {
        console.error(`Failed to unsubscribe from ${key}:`, error);
      }
    });

    // Clear all
    this.rooms.clear();
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}