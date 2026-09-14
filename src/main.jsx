import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </AuthProvider>
  </React.StrictMode>,
);

import { updateService } from './services/updateService';

// Initialize Service Worker and PWA Auto-Update engine
updateService.init();
