/**
 * Basic AGV1 Example
 * 
 * Simple example to test that AGV1Provider is working correctly
 */

import React from 'react';
import { AGV1Provider, useService } from '../providers';

/**
 * Test component that uses services
 */
const TestServicesComponent: React.FC = () => {
  const notificationService = useService('notification');
  
  React.useEffect(() => {
    notificationService.success('AGV1 Services initialized successfully!');
  }, [notificationService]);
  
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">AGV1 Services Test</h2>
      <p className="text-muted-foreground">
        If you see a success notification, the services are working correctly.
      </p>
      <button
        onClick={() => notificationService.info('Test notification')}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Show Test Notification
      </button>
    </div>
  );
};

/**
 * Basic AGV1 Example
 */
export const BasicAGV1Example: React.FC = () => {
  return (
    <AGV1Provider
      userId="test-user"
      appId="test-app"
      storageMode="local"
      autoInitialize={true}
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold py-8">Basic AGV1 Example</h1>
          <TestServicesComponent />
        </div>
      </div>
    </AGV1Provider>
  );
};

export default BasicAGV1Example;