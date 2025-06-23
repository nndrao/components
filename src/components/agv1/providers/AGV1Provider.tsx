/**
 * AGV1 Provider
 * 
 * The main provider that combines all AGV1 providers into a single
 * component for easy application setup. This includes:
 * - ServicesProvider for dependency injection
 * - AppContainerProvider for component lifecycle management
 * - Future providers can be added here (ThemeProvider, etc.)
 */

import React from 'react';
import { ServicesProvider, ServicesProviderProps } from './ServicesProvider';
import { AppContainerProvider } from './AppContainerProvider';

/**
 * AGV1 provider props
 */
export interface AGV1ProviderProps extends ServicesProviderProps {
  /** Additional providers can be configured here */
  theme?: {
    defaultTheme?: 'light' | 'dark';
    storageKey?: string;
  };
}

/**
 * AGV1 Provider Component
 * 
 * This is the main provider that should wrap your entire AGV1 application.
 * It sets up all necessary context providers in the correct order.
 * 
 * @example
 * ```tsx
 * import { AGV1Provider } from '@/components/agv1/providers';
 * 
 * function App() {
 *   return (
 *     <AGV1Provider
 *       userId="user123"
 *       appId="myapp"
 *       storageMode="hybrid"
 *     >
 *       <YourAppContent />
 *     </AGV1Provider>
 *   );
 * }
 * ```
 */
export const AGV1Provider: React.FC<AGV1ProviderProps> = ({
  children,
  theme,
  ...servicesProps
}) => {
  return (
    <ServicesProvider {...servicesProps}>
      <AppContainerProvider>
        {/* Future providers can be nested here */}
        {/* For example: <ThemeProvider theme={theme}> */}
        {children}
      </AppContainerProvider>
    </ServicesProvider>
  );
};

/**
 * Hook to check if component is within AGV1Provider
 */
export const useAGV1 = () => {
  try {
    // Try to access both contexts to ensure we're properly wrapped
    const { useServices } = require('./ServicesProvider');
    const { useAppContainer } = require('./AppContainerProvider');
    
    const services = useServices();
    const appContainer = useAppContainer();
    
    return {
      services,
      appContainer,
      isWrapped: true
    };
  } catch (error) {
    return {
      services: null,
      appContainer: null,
      isWrapped: false
    };
  }
};

/**
 * Higher-order component that ensures a component is wrapped with AGV1Provider
 */
export function withAGV1<P extends object>(
  Component: React.ComponentType<P>,
  providerProps?: Partial<AGV1ProviderProps>
): React.ComponentType<P> {
  return (props: P) => {
    const { isWrapped } = useAGV1();
    
    if (isWrapped) {
      return <Component {...props} />;
    }
    
    // Provide default props if not wrapped
    const defaultProps: AGV1ProviderProps = {
      userId: 'default-user',
      appId: 'default-app',
      storageMode: 'local',
      autoInitialize: true,
      children: <Component {...props} />,
      ...providerProps
    };
    
    return <AGV1Provider {...defaultProps} />;
  };
}

/**
 * Error boundary specifically for AGV1 components
 */
export class AGV1ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AGV1 Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} />;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              AGV1 Component Error
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Combine AGV1Provider with error boundary
 */
export const AGV1ProviderWithErrorBoundary: React.FC<
  AGV1ProviderProps & { 
    errorFallback?: React.ComponentType<{ error: Error }> 
  }
> = ({ errorFallback, ...props }) => {
  return (
    <AGV1ErrorBoundary fallback={errorFallback}>
      <AGV1Provider {...props} />
    </AGV1ErrorBoundary>
  );
};