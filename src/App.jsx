import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { LoginPage } from './components/LoginPage';
import { Onboarding } from './components/Onboarding';
import { ProfileModal } from './components/ProfileModal';
import { LoginModal } from './components/LoginModal';
import { FriendsModal } from './components/FriendsModal';
import { DoomPlayer } from './components/DoomPlayer';
import { SearchModal } from './components/SearchModal';
import { LibraryModal } from './components/LibraryModal';
import { LyricsDrawer } from './components/LyricsDrawer';
import { QueueModal } from './components/QueueModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { BottomNav } from './components/BottomNav';
import { DesktopSidebar } from './components/DesktopSidebar';

export default function App() {
  const { user, isOnboarded, isLoadingAuth } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeView, setActiveView] = useState('feed'); // 'feed' | 'search' | 'library'
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

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
    return <Onboarding onComplete={() => setActiveView('feed')} />;
  }

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden flex font-sans select-none">
      {/* Desktop Sidebar — hidden on mobile, visible on md+ */}
      <DesktopSidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenFriends={() => setShowFriendsModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* Main Fullscreen Doom-Scrolling Feed */}
        <main className={`flex-1 w-full h-full relative overflow-hidden ${activeView !== 'feed' ? 'hidden' : 'block'}`}>
          <DoomPlayer onOpenLibrary={() => setActiveView('library')} />
        </main>

        {/* Global Synchronized Lyrics Drawer */}
        <LyricsDrawer />

        {/* Global Fullscreen Playback Queue Modal */}
        <QueueModal />

        {/* Global Sleep Timer Modal */}
        <SleepTimerModal />

        {/* Search Overlay */}
        <SearchModal
          isOpen={activeView === 'search'}
          onClose={() => setActiveView('feed')}
        />

        {/* Library Overlay (Favorites, Playlists, Community, History) */}
        <LibraryModal
          isOpen={activeView === 'library'}
          onClose={() => setActiveView('feed')}
        />

        {/* Profile & Settings Modal */}
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onOpenEdit={() => setShowEditProfileModal(true)}
        />

        {/* Edit Profile (Avatar & Username) Modal */}
        <LoginModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
        />

        {/* Friends & Social Modal with Tabs (Friends, Requests, Blend) */}
        <FriendsModal
          isOpen={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
        />

        {/* Bottom Navigation Bar — mobile only */}
        <BottomNav
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenFriends={() => setShowFriendsModal(true)}
        />
      </div>
    </div>
  );
}
