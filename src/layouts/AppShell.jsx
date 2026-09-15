import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { DesktopRightPanel } from '../components/DesktopRightPanel';
import { UserAvatar } from '../components/UserAvatar';
import { BottomNav } from '../components/BottomNav';
import { Miniplayer } from '../components/Miniplayer';
import { FullPlayerView } from '../components/FullPlayerView';
import { QueueModal } from '../components/QueueModal';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { LyricsDrawer } from '../components/LyricsDrawer';
import { LoginModal } from '../components/LoginModal';
import { usePlayer } from '../context/PlayerContext';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Users,
  User,
  Heart,
  X,
  PanelRight,
  Disc3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTrack, likedTrackIds, toggleLike } = usePlayer();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [showNowPlayingSide, setShowNowPlayingSide] = useState(true);

  const searchParams = new URLSearchParams(location.search);
  const urlQuery = searchParams.get('q') || '';
  const [topSearchQuery, setTopSearchQuery] = useState(urlQuery);

  useEffect(() => {
    if (location.pathname === '/search') {
      setTopSearchQuery(urlQuery);
    } else {
      setTopSearchQuery('');
    }
  }, [location.pathname, urlQuery]);

  // Map route pathname to active nav item
  const getActiveView = () => {
    const path = location.pathname;
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/library')) return 'library';
    if (path.startsWith('/blend')) return 'blend';
    if (path.startsWith('/profile') || path.startsWith('/settings')) return 'profile';
    return 'home';
  };

  const handleNavClick = (view) => {
    switch (view) {
      case 'home':
        navigate('/');
        break;
      case 'search':
        navigate('/search');
        break;
      case 'library':
        navigate('/library');
        break;
      case 'blend':
        navigate('/blend');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        navigate('/');
    }
  };

  const hasTrack = !!currentTrack;
  const videoId = String(currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id || '');
  const isLiked = likedTrackIds.has(videoId);

  const hideMobileHeader = location.pathname.startsWith('/search');

  const isSubpage =
    location.pathname.startsWith('/playlist') ||
    location.pathname.startsWith('/album') ||
    location.pathname.startsWith('/artist') ||
    location.pathname.startsWith('/song') ||
    location.pathname.startsWith('/track') ||
    location.pathname.startsWith('/user') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.includes('/invite');

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      {/* Mobile Top Header (< 1024px) */}
      {!hideMobileHeader && (
        <header className="flex lg:hidden items-center justify-between px-4 py-2.5 bg-black border-b border-white/5 z-40 flex-shrink-0 select-none">
          {isSubpage ? (
            <div className="flex items-center gap-2.5 select-none">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-full bg-[#141416] hover:bg-[#222226] border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer active:scale-95 flex-shrink-0 shadow-sm"
                title="Go back"
                aria-label="Go back"
              >
                <ChevronLeft className="w-4.5 h-4.5 stroke-[2.4]" />
              </button>
              <span
                className="font-black text-xl tracking-tight text-white cursor-pointer"
                onClick={() => navigate('/')}
              >
                Staytup
              </span>
            </div>
          ) : (
            <div
              className="flex items-center cursor-pointer select-none"
              onClick={() => navigate('/')}
            >
              <span className="font-black text-xl tracking-tight text-white">
                {location.pathname.startsWith('/library')
                  ? 'My Library'
                  : location.pathname.startsWith('/blend')
                  ? 'Blend'
                  : location.pathname.startsWith('/profile')
                  ? 'Profile'
                  : 'Staytup'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/blend')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                location.pathname.startsWith('/blend')
                  ? 'bg-white/15 text-white'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
              title="Blend"
            >
              <Disc3 className="w-4.5 h-4.5" />
            </button>

            {/* Mobile Header Profile Button */}
            <button
              onClick={() => navigate('/profile')}
              className={`flex items-center justify-center rounded-full p-0.5 transition-all cursor-pointer ${
                location.pathname === '/profile'
                  ? 'ring-2 ring-emerald-400 scale-105'
                  : 'ring-1 ring-white/20 hover:ring-white/50'
              }`}
              title="Profile"
            >
              <UserAvatar user={user} size="xs" className="w-7 h-7 text-[10px]" />
            </button>
          </div>
        </header>
      )}

      {/* Top Application Bar (Desktop ≥ 1024px) — Spotify Navigation Header */}
      <header className="hidden lg:flex items-center justify-between px-5 py-2.5 bg-black z-40 flex-shrink-0">
        {/* Left: History navigation */}
        <div className="flex items-center gap-2 w-[220px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-[#141416] border border-white/15 hover:border-white/35 hover:bg-[#222226] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full bg-[#141416] border border-white/15 hover:border-white/35 hover:bg-[#222226] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Go forward"
            aria-label="Go forward"
          >
            <ChevronRight className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Center: Home Button + Universal Search Bar */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
              location.pathname === '/'
                ? 'bg-white text-black shadow-md'
                : 'bg-[#18181B] text-[#8E8E93] hover:text-white hover:bg-[#222226]'
            }`}
            title="Home"
          >
            <Home className="w-5 h-5" />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = topSearchQuery.trim();
              if (q) {
                navigate(`/search?q=${encodeURIComponent(q)}`);
              }
            }}
            className="flex-1 relative flex items-center"
          >
            <Search className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
            <input
              id="universal-search-input"
              type="text"
              value={topSearchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setTopSearchQuery(val);
                if (location.pathname === '/search') {
                  navigate(val ? `/search?q=${encodeURIComponent(val)}` : '/search', { replace: true });
                }
              }}
              onFocus={() => {
                if (location.pathname !== '/search') {
                  navigate(topSearchQuery ? `/search?q=${encodeURIComponent(topSearchQuery)}` : '/search');
                }
              }}
              placeholder="What do you want to play?"
              className="w-full pl-10 pr-9 py-2.5 bg-[#18181B] hover:bg-[#222226] focus:bg-[#222226] border border-transparent hover:border-white/10 focus:border-white/30 rounded-full text-xs sm:text-sm text-white placeholder-[#8E8E93] transition-all shadow-inner focus:outline-none"
            />
            {topSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setTopSearchQuery('');
                  if (location.pathname === '/search') {
                    navigate('/search', { replace: true });
                  }
                }}
                className="absolute right-3 text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Right: Social, Now Playing Panel Toggle, & Profile shortcuts */}
        <div className="flex items-center justify-end gap-2.5 w-[220px]">
          <button
            onClick={() => navigate('/blend')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              location.pathname.startsWith('/blend')
                ? 'bg-white/15 text-white'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
            title="Blend"
          >
            <Disc3 className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setShowNowPlayingSide((prev) => !prev)}
            className={`w-9 h-9 rounded-full hidden xl:flex items-center justify-center transition-colors cursor-pointer ${
              showNowPlayingSide
                ? 'bg-white/15 text-white'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
            title={showNowPlayingSide ? 'Hide Right Panel' : 'Show Right Panel (Now Playing & Queue)'}
          >
            <PanelRight className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#18181B] hover:bg-[#222226] border border-white/5 transition-colors cursor-pointer"
            title="Profile"
          >
            <UserAvatar user={user} size="xs" className="w-6 h-6" />
            <span className="text-xs font-semibold text-white max-w-[80px] truncate">
              {user?.username || 'Profile'}
            </span>
          </button>
        </div>
      </header>

      {/* Body: Sidebar + Main Content View + Desktop Right Panel (Spotify 3-Pane Layout) */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden relative min-w-0 lg:px-2 lg:pb-2 lg:pt-1.5 lg:gap-2 bg-black">
        {/* Desktop Sidebar (visible on lg+) */}
        <DesktopSidebar
          activeView={getActiveView()}
          setActiveView={handleNavClick}
          onOpenProfile={() => navigate('/profile')}
          onOpenBlend={() => navigate('/blend')}
        />

        {/* Routed Page Content Area (Center Pane) */}
        <main
          className={`flex-1 w-full h-full relative overflow-y-auto bg-black lg:rounded-xl lg:bg-[#121212] lg:border lg:border-white/[0.06] shadow-2xl min-w-0 ${
            hasTrack ? 'pb-32 sm:pb-36 lg:pb-6 no-scrollbar' : 'pb-20 lg:pb-6 no-scrollbar'
          }`}
        >
          <Outlet />
        </main>

        {/* Spotify Desktop Right Panel: Now Playing (top) + Queue List (bottom) */}
        {showNowPlayingSide && (
          <div className="hidden xl:flex h-full lg:rounded-xl lg:overflow-hidden lg:border lg:border-white/[0.06] shadow-2xl flex-shrink-0">
            <DesktopRightPanel onClose={() => setShowNowPlayingSide(false)} />
          </div>
        )}
      </div>

      {/* Global Synchronized Lyrics Drawer (Portaled to document.body) */}
      <LyricsDrawer />

      {/* Global Playback Queue Sheet */}
      <QueueModal />

      {/* Global Sleep Timer Sheet */}
      <SleepTimerModal />

      {/* Global Login / Edit Profile Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Persistent Miniplayer */}
      <Miniplayer
        onExpand={() => setIsFullPlayerOpen(true)}
        showNowPlayingSide={showNowPlayingSide}
        onToggleNowPlayingSide={() => setShowNowPlayingSide((prev) => !prev)}
      />

      {/* Full Player Overlay */}
      <FullPlayerView isOpen={isFullPlayerOpen} onClose={() => setIsFullPlayerOpen(false)} />

      {/* Bottom Navigation Bar — mobile only */}
      <BottomNav
        activeView={getActiveView()}
        setActiveView={handleNavClick}
        onOpenProfile={() => navigate('/profile')}
      />
    </div>
  );
};

export default AppShell;
