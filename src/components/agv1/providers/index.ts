/**
 * AGV1 Providers
 * 
 * Central export for all AGV1 context providers
 */

// Main provider that combines everything
export {
  AGV1Provider,
  useAGV1,
  withAGV1,
  AGV1ErrorBoundary,
  AGV1ProviderWithErrorBoundary
} from './AGV1Provider';
export type { AGV1ProviderProps } from './AGV1Provider';

// Services provider
export {
  ServicesProvider,
  useServices,
  useService,
  useServiceRegistry,
  withServices
} from './ServicesProvider';
export type { ServicesProviderProps } from './ServicesProvider';

// App container provider
export {
  AppContainerProvider,
  useAppContainer,
  useComponentRef,
  useCreateComponent,
  useRegisterComponentFactory
} from './AppContainerProvider';
export type { 
  AppContainerProviderProps,
  ComponentInstance 
} from './AppContainerProvider';

// Re-export types for convenience
export type { AGV1Services } from '@/types';