import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { LoginPage } from './components/LoginPage';
import { Onboarding } from './components/Onboarding';
import AppShell from './layouts/AppShell';

// Routed Pages
import HomePage from './pages/HomePage';
import ForYouPage from './pages/ForYouPage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import ArtistPage from './pages/ArtistPage';
import AlbumPage from './pages/AlbumPage';
import PlaylistPage from './pages/PlaylistPage';
import FriendsPage from './pages/FriendsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const { user, isOnboarded, isLoadingAuth } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // 1. Splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Login Page with Google & Phone Number (if not logged in)
  if (!user && !isLoadingAuth) {
    return <LoginPage onComplete={() => {}} />;
  }

  // 3. Initial Onboarding Flow (Language & Artists selection)
  if (!isOnboarded) {
    return <Onboarding onComplete={() => {}} />;
  }

  // Determine dynamic base URL for Apache subpath (/staytup) or Vite root (/)
  const basename = window.location.pathname.startsWith('/staytup') ? '/staytup' : '/';

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/foryou" element={<ForYouPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
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
