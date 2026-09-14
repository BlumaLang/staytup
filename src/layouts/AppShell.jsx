import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DesktopSidebar } from '../components/DesktopSidebar';
import { BottomNav } from '../components/BottomNav';
import { Miniplayer } from '../components/Miniplayer';
import { FullPlayerView } from '../components/FullPlayerView';
import { QueueModal } from '../components/QueueModal';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { LyricsDrawer } from '../components/LyricsDrawer';
import { LoginModal } from '../components/LoginModal';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Users,
  User,
  Heart,
  X,
  Sparkles,
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

  // Map route pathname to active nav item
  const getActiveView = () => {
    const path = location.pathname;
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

  const hasTrack = !!currentTrack;
  const videoId = String(currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id || '');
  const isLiked = likedTrackIds.has(videoId);

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      {/* Top Application Bar (Desktop ≥ 1024px) — Spotify Navigation Header */}
      <header className="hidden lg:flex items-center justify-between px-5 py-2.5 bg-[#08080A] border-b border-[#1C1C1E] z-40 flex-shrink-0">
        {/* Left: History navigation */}
        <div className="flex items-center gap-2 w-[220px]">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
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

          <div
            onClick={() => navigate('/search')}
            className="flex-1 relative flex items-center cursor-pointer"
          >
            <Search className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              readOnly
              onClick={() => navigate('/search')}
              placeholder="What do you want to play?"
              className="w-full pl-10 pr-4 py-2.5 bg-[#18181B] hover:bg-[#222226] border border-transparent hover:border-white/10 focus:border-white/30 rounded-full text-xs sm:text-sm text-white placeholder-[#8E8E93] cursor-pointer transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Right: Social & Profile shortcuts */}
        <div className="flex items-center justify-end gap-3 w-[220px]">
          <button
            onClick={() => navigate('/friends')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              location.pathname === '/friends'
                ? 'bg-white/15 text-white'
                : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
            }`}
            title="Friends & Social"
          >
            <Users className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#18181B] hover:bg-[#222226] border border-white/5 transition-colors cursor-pointer"
            title="Profile"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-black flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  onError={(e) => {
                    e.target.src = './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg';
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-[#8E8E93]" />
              )}
            </div>
            <span className="text-xs font-semibold text-white max-w-[80px] truncate">
              {user?.username || 'Profile'}
            </span>
          </button>
        </div>
      </header>

      {/* Body: Sidebar + Main Content View + Optional Right Panel */}
      <div className="flex-1 flex w-full h-full overflow-hidden relative min-w-0">
        {/* Desktop Sidebar (visible on lg+) */}
        <DesktopSidebar
          activeView={getActiveView()}
          setActiveView={handleNavClick}
          onOpenProfile={() => navigate('/profile')}
          onOpenFriends={() => navigate('/friends')}
        />

        {/* Routed Page Content Area */}
        <main
          className={`flex-1 w-full h-full relative overflow-y-auto ${
            hasTrack ? 'pb-36 lg:pb-28 no-scrollbar' : 'pb-20 lg:pb-6 no-scrollbar'
          }`}
        >
          <Outlet />
        </main>

        {/* Spotify Desktop Right Panel: Now Playing & About Artist (xl: screens) */}
        {hasTrack && showNowPlayingSide && (
          <aside className="hidden 2xl:flex flex-col w-[320px] bg-[#0A0A0C] border-l border-[#1C1C1E] h-full flex-shrink-0 p-5 overflow-y-auto no-scrollbar select-none z-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight truncate pr-2">
                {currentTrack.title}
              </h3>
              <button
                onClick={() => setShowNowPlayingSide(false)}
                className="text-[#8E8E93] hover:text-white transition-colors"
                title="Hide panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large Cover Art */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-4 bg-black">
              <img
                src={get500x500Image(
                  currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url
                )}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Track Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="min-w-0 flex-1 pr-2">
                <h4 className="text-base font-bold text-white line-clamp-1">{currentTrack.title}</h4>
                <p
                  onClick={() =>
                    navigate(`/artist/${encodeURIComponent(currentTrack.artist || '')}`)
                  }
                  className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer line-clamp-1 mt-0.5"
                >
                  {currentTrack.artist || 'Unknown Artist'}
                </p>
              </div>
              <button
                onClick={() => toggleLike(currentTrack)}
                className="text-[#8E8E93] hover:text-white transition-colors flex-shrink-0"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                  }`}
                />
              </button>
            </div>

            {/* About the Artist Card */}
            <div className="p-4 rounded-2xl bg-[#141416] border border-[#222226] space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                About the artist
              </h5>
              <div
                onClick={() =>
                  navigate(`/artist/${encodeURIComponent(currentTrack.artist || '')}`)
                }
                className="cursor-pointer group"
              >
                <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {currentTrack.artist}
                </p>
                <p className="text-xs text-[#8E8E93] line-clamp-3 mt-1 leading-relaxed">
                  Discover more tracks, popular hits, and curated albums from this artist on Staytup.
                </p>
              </div>
            </div>
          </aside>
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
