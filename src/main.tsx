import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import AuthProvider from '@/context/AuthContext';  // <-- Import your AuthProvider
import './index.css';

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Create a loading component that will be shown while the app is initializing
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

// Wait for DOM to be ready before rendering
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('Failed to find the root element');
    return;
  }

  const root = createRoot(container);
  
  // Initial render with loading state
  root.render(
    <StrictMode>
      <LoadingFallback />
    </StrictMode>
  );
  
  // After a small delay, render the app wrapped with AuthProvider
  setTimeout(() => {
    root.render(
      <StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StrictMode>
    );
  }, 100);
});
