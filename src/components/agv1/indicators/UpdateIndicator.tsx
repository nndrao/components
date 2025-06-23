import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UpdateType } from '@/types';

interface UpdateIndicatorProps {
  type: UpdateType;
  visible: boolean;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const updateConfig = {
  insert: {
    color: 'bg-green-500',
    icon: '+',
    label: 'New',
  },
  update: {
    color: 'bg-blue-500',
    icon: '↻',
    label: 'Updated',
  },
  delete: {
    color: 'bg-red-500',
    icon: '−',
    label: 'Deleted',
  },
  snapshot: {
    color: 'bg-purple-500',
    icon: '⟳',
    label: 'Snapshot',
  },
  clear: {
    color: 'bg-gray-500',
    icon: '×',
    label: 'Cleared',
  },
};

const positionClasses = {
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({
  type,
  visible,
  duration = 1000,
  position = 'top-right',
  size = 'sm',
  className,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const config = updateConfig[type];

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [visible, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute rounded-full flex items-center justify-center text-white font-bold shadow-lg',
            config.color,
            positionClasses[position],
            sizeClasses[size],
            className
          )}
        >
          {config.icon}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface UpdatePulseProps {
  active: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UpdatePulse: React.FC<UpdatePulseProps> = ({
  active,
  color = 'blue',
  size = 'sm',
  className,
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  if (!active) return null;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full',
          colorClasses[color],
          sizeClasses[size]
        )}
      />
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-ping',
          colorClasses[color],
          'opacity-75'
        )}
      />
    </div>
  );
};

interface UpdateStreamIndicatorProps {
  updatesPerSecond: number;
  className?: string;
}

export const UpdateStreamIndicator: React.FC<UpdateStreamIndicatorProps> = ({
  updatesPerSecond,
  className,
}) => {
  const getIntensity = () => {
    if (updatesPerSecond === 0) return 'idle';
    if (updatesPerSecond < 5) return 'low';
    if (updatesPerSecond < 20) return 'medium';
    return 'high';
  };

  const intensity = getIntensity();

  const intensityConfig = {
    idle: {
      color: 'text-muted-foreground',
      bars: 1,
      animated: false,
      badgeVariant: 'secondary' as const,
    },
    low: {
      color: 'text-green-600 dark:text-green-400',
      bars: 2,
      animated: true,
      badgeVariant: 'secondary' as const,
    },
    medium: {
      color: 'text-yellow-600 dark:text-yellow-400',
      bars: 3,
      animated: true,
      badgeVariant: 'secondary' as const,
    },
    high: {
      color: 'text-red-600 dark:text-red-400',
      bars: 4,
      animated: true,
      badgeVariant: 'destructive' as const,
    },
  };

  const config = intensityConfig[intensity];

  return (
    <Badge variant={config.badgeVariant} className={cn('flex items-center gap-1.5 px-2 py-1', className)}>
      <div className="flex items-end gap-0.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 bg-current transition-all duration-300',
              i < config.bars ? config.color : 'text-muted-foreground/30',
              config.animated && i < config.bars && 'animate-pulse',
              i === 0 && 'h-2',
              i === 1 && 'h-3',
              i === 2 && 'h-4',
              i === 3 && 'h-5'
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium', config.color)}>
        {updatesPerSecond}/s
      </span>
    </Badge>
  );
};