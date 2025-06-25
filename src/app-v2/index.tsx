import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// This can be used to mount the v2 app
export function mountAppV2(element: HTMLElement) {
  const root = ReactDOM.createRoot(element);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return root;
}

export { App as AppV2 } from './App';