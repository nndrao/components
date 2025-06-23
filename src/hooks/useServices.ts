/**
 * useServices Hook
 * 
 * Provides access to AGV1 services from the ServicesContext
 */

import { useContext } from 'react';
import { ServicesContext } from '@/components/agv1/providers/ServicesProvider';
import type { AGV1Services } from '@/types';

/**
 * Hook to access AGV1 services
 * @returns AGV1Services or null if not within ServicesProvider
 */
export function useServices(): AGV1Services | null {
  const services = useContext(ServicesContext);
  
  if (!services) {
    console.warn('useServices must be used within ServicesProvider');
  }
  
  return services;
}

/**
 * Hook to access AGV1 services with required check
 * @throws Error if not within ServicesProvider
 * @returns AGV1Services
 */
export function useServicesRequired(): AGV1Services {
  const services = useContext(ServicesContext);
  
  if (!services) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  
  return services;
}