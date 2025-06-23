import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UserPresence } from '@/services/collaboration/CollaborationService';

interface PresenceAvatarsProps {
  users: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showCursors?: boolean;
  currentUserId?: string;
  className?: string;
  onUserClick?: (user: UserPresence) => void;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const statusColors = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  away: 'bg-gray-400',
};

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({
  users,
  maxVisible = 4,
  size = 'md',
  showStatus = true,
  showCursors = false,
  currentUserId,
  className,
  onUserClick,
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);
  
  // Filter out current user and sort by activity
  const otherUsers = users
    .filter(user => user.userId !== currentUserId)
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenUsers = otherUsers.slice(maxVisible);
  const hiddenCount = hiddenUsers.length;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getActivityText = (lastActivity: Date) => {
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const renderAvatar = (user: UserPresence, index: number) => (
    <motion.div
      key={user.userId}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
      style={{ marginLeft: index > 0 ? '-0.5rem' : 0 }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onUserClick?.(user)}
              className="relative focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
            >
              <Avatar
                className={cn(
                  sizeClasses[size],
                  'ring-2 ring-background cursor-pointer hover:ring-primary transition-all'
                )}
                style={{ borderColor: user.color }}
              >
                <AvatarImage src={user.avatar} alt={user.userName} />
                <AvatarFallback style={{ backgroundColor: user.color + '20', color: user.color }}>
                  {getInitials(user.userName)}
                </AvatarFallback>
              </Avatar>
              
              {showStatus && (
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background',
                    statusColors[user.status],
                    size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'
                  )}
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{user.userName}</p>
              <p className="text-xs text-muted-foreground">
                {getActivityText(user.lastActivity)}
              </p>
              {user.currentLocation?.componentId && (
                <p className="text-xs text-muted-foreground">
                  Viewing: {user.currentLocation.componentId}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );

  const renderUserList = () => (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm mb-3">Active Users ({otherUsers.length})</h4>
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {otherUsers.map((user) => (
            <button
              key={user.userId}
              onClick={() => {
                onUserClick?.(user);
                setShowAllUsers(false);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Avatar className="h-8 w-8" style={{ borderColor: user.color }}>
                <AvatarImage src={user.avatar} alt={user.userName} />
                <AvatarFallback style={{ backgroundColor: user.color + '20', color: user.color }}>
                  {getInitials(user.userName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {getActivityText(user.lastActivity)}
                </p>
              </div>
              
              <Badge variant="outline" className="text-xs">
                {user.status}
              </Badge>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center', className)}>
      <AnimatePresence>
        <div className="flex items-center">
          {visibleUsers.map((user, index) => renderAvatar(user, index))}
          
          {hiddenCount > 0 && (
            <Popover open={showAllUsers} onOpenChange={setShowAllUsers}>
              <PopoverTrigger asChild>
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: visibleUsers.length * 0.05 }}
                  className={cn(
                    'relative flex items-center justify-center rounded-full ring-2 ring-background bg-muted hover:bg-muted/80 transition-colors cursor-pointer',
                    sizeClasses[size]
                  )}
                  style={{ marginLeft: '-0.5rem' }}
                >
                  <span className="font-medium">+{hiddenCount}</span>
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                {renderUserList()}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </AnimatePresence>
      
      {showCursors && (
        <AnimatePresence>
          {otherUsers.map((user) => 
            user.cursor && (
              <motion.div
                key={`cursor-${user.userId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed pointer-events-none z-50"
                style={{
                  left: user.cursor.x,
                  top: user.cursor.y,
                  color: user.color,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="drop-shadow-lg"
                >
                  <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                </svg>
                <div
                  className="absolute top-5 left-5 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
                  style={{ backgroundColor: user.color }}
                >
                  {user.userName}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      )}
    </div>
  );
};