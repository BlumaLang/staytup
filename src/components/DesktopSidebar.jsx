import React, { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Library,
  Users,
  User,
  Settings,
  Music2,
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Sparkles,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';

export const DesktopSidebar = ({ activeView, setActiveView, onOpenProfile, onOpenFriends }) => {
  const { user } = useAuth();
  const { likedTrackIds } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('staytup_sidebar_collapsed') === 'true';
  });
  const [libraryFilter, setLibraryFilter] = useState('all'); // 'all' | 'playlists' | 'artists'
  const [followedArtists, setFollowedArtists] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('staytup_sidebar_collapsed', String(next));
  };

  // Load followed artists
  useEffect(() => {
    const loadArtists = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
        const userFavs = user?.favoriteArtists || [];
        const combined = [...stored];
        userFavs.forEach((name) => {
          if (
            typeof name === 'string' &&
            !combined.some((a) => (typeof a === 'string' ? a : a.name) === name)
          ) {
            combined.push({ name, image: '', id: name });
          }
        });
        setFollowedArtists(combined.slice(0, 10));
      } catch (e) {}
    };
    loadArtists();
    window.addEventListener('staytup_followed_artists_updated', loadArtists);
    return () => window.removeEventListener('staytup_followed_artists_updated', loadArtists);
  }, [user]);

  // Load user playlists
  useEffect(() => {
    const loadPlaylists = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('staytup_playlists') || '[]');
        if (Array.isArray(stored)) {
          setPlaylists(stored);
        }
      } catch (e) {}
    };
    loadPlaylists();
    window.addEventListener('staytup_playlists_updated', loadPlaylists);
    return () => window.removeEventListener('staytup_playlists_updated', loadPlaylists);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'search', label: 'Search', icon: Search, path: '/search' },
    { id: 'friends', label: 'Friends & Social', icon: Users, path: '/friends' },
  ];

  const currentPath = location.pathname;
  const isFavoritesActive = currentPath === '/library' && location.search.includes('tab=favorites');

  return (
    <aside
      className={`hidden lg:flex flex-col h-full bg-[#09090B] border-r border-[#1C1C1F] flex-shrink-0 select-none relative z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[76px]' : 'w-[260px] xl:w-[280px]'
      }`}
    >
      {/* Top Brand Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div
          onClick={() => {
            setActiveView('home');
            navigate('/');
          }}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
          title="Staytup Music"
        >
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-md flex-shrink-0">
            <Music2 className="w-5 h-5 text-black" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-white block truncate leading-none">
                Staytup
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#22C55E] block mt-0.5">
                Music
              </span>
            </div>
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer flex-shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Navigation Box (Spotify Style Rounded Card) */}
      <div className="mx-2.5 bg-[#121215] border border-[#202024] rounded-2xl p-1.5 space-y-1 shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeView === item.id ||
            (item.id === 'home' && currentPath === '/') ||
            (item.id === 'search' && currentPath.startsWith('/search')) ||
            (item.id === 'friends' && currentPath.startsWith('/friends'));

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                navigate(item.path);
              }}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-white/12 text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* "Your Library" Card (Fills remaining height) */}
      <div className="flex-1 mx-2.5 mt-2.5 mb-3 bg-[#121215] border border-[#202024] rounded-2xl p-2 flex flex-col min-h-0 overflow-hidden shadow-sm">
        {/* Library Header */}
        <div className="flex items-center justify-between px-1.5 py-1 mb-1">
          <button
            onClick={() => {
              setActiveView('library');
              navigate('/library');
            }}
            title="Your Library"
            className={`flex items-center gap-2.5 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer group ${
              isCollapsed ? 'mx-auto justify-center' : ''
            }`}
          >
            <Library className="w-5 h-5 flex-shrink-0 group-hover:text-white" />
            {!isCollapsed && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] group-hover:text-white">
                Your Library
              </span>
            )}
          </button>

          {!isCollapsed && (
            <button
              onClick={() => navigate('/library?tab=playlists')}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              title="Add or view playlists"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips (When Expanded) */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 px-1 py-1.5 border-b border-white/5 mb-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'playlists', label: 'Playlists' },
              { id: 'artists', label: 'Artists' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setLibraryFilter(chip.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  libraryFilter === chip.id
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/5 text-[#A1A1AA] hover:text-white hover:bg-white/10'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Library List */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
          {/* Pinned: Liked Songs (Shown in 'all' and 'playlists') */}
          {(libraryFilter === 'all' || libraryFilter === 'playlists') && (
            <div
              onClick={() => navigate('/library?tab=favorites')}
              title={isCollapsed ? `Liked Songs (${likedTrackIds.size})` : undefined}
              className={`flex items-center rounded-xl transition-all cursor-pointer group ${
                isCollapsed ? 'justify-center p-2' : 'gap-3 px-2.5 py-2'
              } ${
                isFavoritesActive
                  ? 'bg-white/12 text-white'
                  : 'hover:bg-white/5 text-white'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    Liked Songs
                  </p>
                  <p className="text-[10px] text-[#8E8E93] truncate mt-0.5">
                    Playlist • {likedTrackIds.size} {likedTrackIds.size === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* User Custom Playlists */}
          {(libraryFilter === 'all' || libraryFilter === 'playlists') &&
            playlists.map((pl, idx) => {
              const plId = pl.id || pl._id || idx;
              const isPlActive = currentPath === `/playlist/${plId}`;
              const trackCount = pl.tracks?.length || pl.count || 0;

              return (
                <div
                  key={plId}
                  onClick={() => navigate(`/playlist/${plId}`)}
                  title={isCollapsed ? pl.name : undefined}
                  className={`flex items-center rounded-xl transition-all cursor-pointer group ${
                    isCollapsed ? 'justify-center p-2' : 'gap-3 px-2.5 py-2'
                  } ${
                    isPlActive ? 'bg-white/12 text-white' : 'hover:bg-white/5 text-white'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#202025] flex items-center justify-center flex-shrink-0 border border-white/5 overflow-hidden">
                    {pl.image ? (
                      <img src={pl.image} alt={pl.name} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate leading-tight">
                        {pl.name}
                      </p>
                      <p className="text-[10px] text-[#8E8E93] truncate mt-0.5">
                        Playlist • {trackCount} {trackCount === 1 ? 'song' : 'songs'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Followed Artists */}
          {(libraryFilter === 'all' || libraryFilter === 'artists') &&
            followedArtists.map((artist, idx) => {
              const name = typeof artist === 'string' ? artist : artist.name;
              const img = typeof artist === 'object' ? artist.image : null;
              const isArtistActive = currentPath === `/artist/${encodeURIComponent(name)}`;

              return (
                <div
                  key={idx}
                  onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                  title={isCollapsed ? name : undefined}
                  className={`flex items-center rounded-xl transition-all cursor-pointer group ${
                    isCollapsed ? 'justify-center p-2' : 'gap-3 px-2.5 py-2'
                  } ${
                    isArtistActive ? 'bg-white/12 text-white' : 'hover:bg-white/5 text-white'
                  }`}
                >
                  <img
                    src={get500x500Image(img)}
                    alt={name}
                    onError={(e) => {
                      e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97-BlN4ymNU.png';
                    }}
                    className="w-9 h-9 rounded-full object-cover bg-black flex-shrink-0 border border-white/10 shadow-sm"
                  />
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate leading-tight">
                        {name}
                      </p>
                      <p className="text-[10px] text-[#8E8E93] truncate mt-0.5">Artist</p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
