import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Import the enhanced admin panel component
const SapthalaAdminPanel = React.lazy(() => import('./SapthalaAdminPanel'));

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <React.Suspense fallback={<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px'}}>🔄 Loading SAPTHALA...</div>}>
      <SapthalaAdminPanel />
    </React.Suspense>
  </React.StrictMode>
);
