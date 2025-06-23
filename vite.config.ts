import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          
          // UI components
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-vendor';
          }
          
          // Charts
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'chart-vendor';
          }
          
          // AG-Grid
          if (id.includes('node_modules/ag-grid-')) {
            return 'ag-grid';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'date-vendor';
          }
          
          // Lucide icons
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons-vendor';
          }
          
          // Storage services
          if (id.includes('src/services/storage/')) {
            return 'storage-services';
          }
          
          // Data source services
          if (id.includes('src/services/datasource/') || id.includes('src/services/websocket/')) {
            return 'datasource-services';
          }
          
          // Component dialogs
          if (id.includes('src/components/agv1/dialogs/')) {
            return 'component-dialogs';
          }
          
          // UI components
          if (id.includes('src/components/ui/') || id.includes('src/components/ui-components/')) {
            return 'ui-components';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000, // Increase warning limit to 2MB for AG-Grid
  },
});
