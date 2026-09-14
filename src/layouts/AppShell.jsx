import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { BottomNav } from '../components/BottomNav';
import { QueueModal } from '../components/QueueModal';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { LyricsDrawer } from '../components/LyricsDrawer';
import { LoginModal } from '../components/LoginModal';

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Map route pathname to active nav item
  const getActiveView = () => {
    const path = location.pathname;
    if (path.startsWith('/foryou')) return 'foryou';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/library')) return 'library';
    if (path.startsWith('/friends')) return 'friends';
    if (path.startsWith('/profile')) return 'profile';
    return 'home';
  };

  const handleNavClick = (view) => {
    switch (view) {
      case 'home':
        navigate('/');
        break;
      case 'foryou':
        navigate('/foryou');
        break;
      case 'search':
        navigate('/search');
        break;
      case 'library':
        navigate('/library');
        break;
      case 'friends':
        navigate('/friends');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        navigate('/');
    }
  };

  const isForYou = location.pathname === '/foryou';

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden flex font-sans select-none">
      {/* Desktop Sidebar (visible on md+) */}
      <DesktopSidebar
        activeView={getActiveView()}
        setActiveView={handleNavClick}
        onOpenProfile={() => navigate('/profile')}
        onOpenFriends={() => navigate('/friends')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* Routed Page Content */}
        <main className={`flex-1 w-full h-full relative overflow-y-auto ${isForYou ? 'overflow-hidden p-0' : 'pb-24 md:pb-24 no-scrollbar'}`}>
          <Outlet />
        </main>

        {/* Global Synchronized Lyrics Drawer */}
        <LyricsDrawer />

        {/* Global Playback Queue Sheet */}
        <QueueModal />

        {/* Global Sleep Timer Sheet */}
        <SleepTimerModal />

        {/* Global Login / Edit Profile Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />

        {/* Bottom Navigation Bar — mobile only */}
        <BottomNav
          activeView={getActiveView()}
          setActiveView={handleNavClick}
          onOpenProfile={() => navigate('/profile')}
          onOpenFriends={() => navigate('/friends')}
        />
      </div>
    </div>
  );
};

export default AppShell;
