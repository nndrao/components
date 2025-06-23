import './App.css';
import { AppContainer } from '@/components/agv1/app-container/AppContainer';
import './utils/test-indexeddb'; // Add IndexedDB test utility to window
import './utils/debug-persistence'; // Add persistence debug utility to window
import './utils/test-persistence'; // Add comprehensive persistence test to window

function App() {
  return (
    <AppContainer 
      config={{
        defaultLayout: undefined,
        maxComponents: 10,
        autoSaveInterval: 30000,
        enablePersistence: true,
        storageAdapter: 'local'
      }}
    />
  );
}

export default App;