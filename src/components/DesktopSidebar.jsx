import React, { useState, useEffect } from 'react';
import { Home, Search, Library, Users, User, Settings, Music2, Heart, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';

export const DesktopSidebar = ({ activeView, setActiveView, onOpenProfile, onOpenFriends }) => {
  const { user } = useAuth();
  const { likedTrackIds } = usePlayer();
  const navigate = useNavigate();
  const [followedArtists, setFollowedArtists] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      setFollowedArtists(stored.slice(0, 8));
    } catch (e) {}
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'search', label: 'Search', icon: Search, path: '/search' },
    { id: 'library', label: 'My Library', icon: Library, path: '/library' },
    { id: 'friends', label: 'Friends', icon: Users, path: '/friends' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[240px] xl:w-[260px] bg-[#0A0A0A] border-r border-[#1C1C1E] h-full flex-shrink-0 select-none relative z-30">
      {/* Brand Logo */}
      <div
        onClick={() => {
          setActiveView('home');
          navigate('/');
        }}
        className="px-5 pt-5 pb-4 flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-md">
          <Music2 className="w-4.5 h-4.5 text-black" />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-white">Staytup</span>
      </div>

      {/* Primary Navigation */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                navigate(item.path);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-3 border-t border-[#1C1C1E]" />

      {/* Quick Pinned Section (Spotify Style) */}
      <div className="flex-1 px-3 overflow-y-auto no-scrollbar space-y-1">
        <div className="flex items-center justify-between px-3 py-1 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
            Playlists &amp; Mixes
          </span>
          <button
            onClick={() => navigate('/library?tab=playlists')}
            className="text-[#8E8E93] hover:text-white transition-colors"
            title="Add Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Liked Songs Quick Link */}
        <div
          onClick={() => navigate('/library?tab=favorites')}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white group-hover:text-white truncate">
              Liked Songs
            </p>
            <p className="text-[10px] text-[#8E8E93] truncate">
              {likedTrackIds.size} {likedTrackIds.size === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>

        {/* Followed Artists Shortcuts */}
        {followedArtists.map((artist, idx) => {
          const name = typeof artist === 'string' ? artist : artist.name;
          const img = typeof artist === 'object' ? artist.image : null;
          return (
            <div
              key={idx}
              onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <img
                src={get500x500Image(img)}
                alt={name}
                onError={(e) => {
                  e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                }}
                className="w-8 h-8 rounded-full object-cover bg-black flex-shrink-0 border border-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white group-hover:text-white truncate">
                  {name}
                </p>
                <p className="text-[10px] text-[#8E8E93] truncate">Artist</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile Section at Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-[#1C1C1E] mt-auto">
        <button
          onClick={onOpenProfile}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group cursor-pointer ${
            activeView === 'profile' ? 'bg-white/10 text-white' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
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
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-4 h-4 text-[#8E8E93]" />
              </div>
            )}
          </div>
          <div className="min-w-0 text-left flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user?.username || user?.displayName || 'Staytup Listener'}
            </p>
            <p className="text-[10px] text-[#8E8E93] truncate">Member</p>
          </div>
          <Settings className="w-4 h-4 text-[#8E8E93] group-hover:text-white flex-shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
