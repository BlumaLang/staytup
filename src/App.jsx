import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { LoginPage } from './components/LoginPage';
import { Onboarding } from './components/Onboarding';
import AppShell from './layouts/AppShell';

// Routed Pages
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import SongPage from './pages/SongPage';
import ArtistPage from './pages/ArtistPage';
import AlbumPage from './pages/AlbumPage';
import PlaylistPage from './pages/PlaylistPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';

// Inner component to handle service worker notification navigation
function NotificationNavigationHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data?.type === 'NAVIGATE' && event.data?.url) {
          try {
            const urlObj = new URL(event.data.url, window.location.origin);
            const path = urlObj.pathname.replace(/^\/staytup/, '') || '/';
            navigate(path);
          } catch (e) {
            console.warn('Notification navigation error:', e);
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [navigate]);

  return null;
}

export default function App() {
  const { user, isOnboarded, isLoadingAuth } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Check if current URL is a shared deep link
  const currentPath = window.location.pathname;
  const isDeepLink =
    currentPath.includes('/song/') ||
    currentPath.includes('/track/') ||
    currentPath.includes('/album/') ||
    currentPath.includes('/artist/') ||
    currentPath.includes('/playlist/');

  // 1. Splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Login Page with Google & Phone Number (if not logged in and not accessing a shared deep link)
  if (!user && !isLoadingAuth && !isDeepLink) {
    return <LoginPage onComplete={() => {}} />;
  }

  // 3. Initial Onboarding Flow (Language & Artists selection, unless accessing deep link)
  if (!isOnboarded && !isDeepLink) {
    return <Onboarding onComplete={() => {}} />;
  }

  // Determine dynamic base URL for Apache subpath (/staytup) or Vite root (/)
  const basename = window.location.pathname.startsWith('/staytup') ? '/staytup' : '/';

  return (
    <BrowserRouter basename={basename}>
      <NotificationNavigationHandler />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/song/:id" element={<SongPage />} />
          <Route path="/track/:id" element={<SongPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
