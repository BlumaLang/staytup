import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { createOrGetBlend } from '../services/blendService';
import { get500x500Image } from '../utils/media';
import { ArtistAvatar } from '../components/ArtistAvatar';
import {
  Search,
  X,
  Play,
  Pause,
  Users,
  Disc3,
  ListMusic,
  ListPlus,
  Check,
  Heart,
  Music2,
} from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { ArtistLinks } from '../components/ArtistLinks';
import { PlaylistSheet } from '../components/PlaylistSheet';
import {
  getRecentActivity,
  recordRecentActivity,
  removeRecentActivity,
  clearRecentActivity,
  subscribeToRecentActivity,
} from '../services/recentActivityService';

const TRENDING_TAGS = [
  'Arijit Singh',
  'Romantic Hits',
  'Diljit Dosanjh',
  'Punjabi Hits',
  'Chill Lo-Fi',
  'Bollywood 2024',
  'Karan Aujla',
  'Shreya Ghoshal',
  'Pritam',
  'Party Bangers',
];

const BROWSE_CATEGORIES = [
  {
    label: 'Bollywood Hits',
    query: 'bollywood hits',
    color: 'from-[#E13300] to-[#8C1F00]',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Punjabi Hits',
    query: 'punjabi hits',
    color: 'from-[#1E3264] to-[#121F3E]',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Romantic Hits',
    query: 'romantic hindi songs',
    color: 'from-[#E91429] to-[#8F0D19]',
    image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Chill Lo-Fi',
    query: 'chill lofi hindi',
    color: 'from-[#503750] to-[#2E1F2E]',
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Party & Dance',
    query: 'party hindi songs',
    color: 'from-[#8D67AB] to-[#553C68]',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Indie Pop',
    query: 'indian indie pop',
    color: 'from-[#BA5D07] to-[#6E3604]',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Devotional',
    query: 'devotional songs hindi',
    color: 'from-[#D84000] to-[#7E2500]',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Hip-Hop & Rap',
    query: 'indian hip hop rap',
    color: 'from-[#BC5900] to-[#6D3400]',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Workout Energy',
    query: 'workout gym hindi songs',
    color: 'from-[#283EA7] to-[#16225C]',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: '90s Nostalgia',
    query: '90s bollywood superhits',
    color: 'from-[#0D73EC] to-[#074288]',
    image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Soulful Ghazals',
    query: 'ghazals jagjit singh',
    color: 'from-[#477D95] to-[#294856]',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Acoustic Unplugged',
    query: 'acoustic unplugged hindi',
    color: 'from-[#148A08] to-[#0B4E04]',
    image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&auto=format&fit=crop&q=80',
  },
];

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();
  const { user } = useAuth();

  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'songs' | 'artists' | 'albums' | 'playlists'
  const [isLoading, setIsLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState(() => getRecentActivity(12));
  const [playlistTrack, setPlaylistTrack] = useState(null);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const debounceTimerRef = useRef(null);

  const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';

  // Load user playlists to check which songs are in playlists
  const loadUserPlaylists = () => {
    if (!userId) return;
    api.getPlaylists(userId)
      .then(res => {
        const list = Array.isArray(res) ? res : res?.playlists || [];
        setUserPlaylists(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUserPlaylists();
  }, [userId, showPlaylistSheet]);

  // Check if a given track ID is in any user playlist
  const isTrackInPlaylist = (trackId) => {
    if (!trackId || !Array.isArray(userPlaylists)) return false;
    const cleanId = String(trackId);
    return userPlaylists.some(pl =>
      Array.isArray(pl.tracks) && pl.tracks.some(t => {
        const tid = String(t.videoId || t.video_id || t.id || '');
        return tid && tid === cleanId;
      })
    );
  };

  // Subscribe to real entity-based recent activity
  useEffect(() => {
    return subscribeToRecentActivity((items) => {
      setRecentActivities(items.slice(0, 12));
    });
  }, []);

  // Sync with URL search params
  useEffect(() => {
    setQuery(queryParam);
    if (queryParam.trim()) {
      executeSearch(queryParam);
    } else {
      setResults(null);
    }
  }, [queryParam]);

  // Autocomplete live suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    setIsSuggesting(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      api
        .getSuggestions(query)
        .then((res) => {
          if (Array.isArray(res.suggestions)) {
            setSuggestions(res.suggestions);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsSuggesting(false);
        });
    }, 180);

    return () => clearTimeout(debounceTimerRef.current);
  }, [query]);

  const executeSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setSuggestions([]);
    setIsSuggesting(false);
    setIsLoading(true);

    try {
      const [musicRes, usersRes] = await Promise.allSettled([
        api.search(q, 'all', 0, 30),
        api.searchUsers(q, 12),
      ]);

      const data = musicRes.status === 'fulfilled' ? musicRes.value : {};
      const usersData = usersRes.status === 'fulfilled' ? usersRes.value : {};
      const people = usersData?.users || [];

      if (data?.tracks && Array.isArray(data.tracks)) {
        const seen = new Set();
        data.tracks = data.tracks.filter((t) => {
          const id = t.videoId || t.video_id || t.id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      }
      if (data?.artists && Array.isArray(data.artists)) {
        const seenArtists = new Set();
        data.artists = data.artists.filter((a) => {
          const name = a.name || a.title || '';
          const key = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          if (!key || seenArtists.has(key)) return false;
          seenArtists.add(key);
          return true;
        });
      }
      setResults({
        ...data,
        people,
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (val) => {
    setQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
      setResults(null);
    }
  };

  const handleSelectSuggestion = (item) => {
    if (typeof item === 'string') {
      handleQueryChange(item);
      return;
    }

    if (item.type === 'user') {
      recordRecentActivity({
        type: 'user',
        id: item.id,
        title: item.displayName || item.username,
        subtitle: `@${item.username}`,
        image: item.avatar,
      });
      navigate(`/user/${encodeURIComponent(item.id)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'artist') {
      const artistIdentifier = item.id || item.title || item.name;
      recordRecentActivity({
        type: 'artist',
        id: artistIdentifier,
        title: item.title || item.name,
        subtitle: 'Artist',
        image: item.image,
      });
      navigate(`/artist/${encodeURIComponent(artistIdentifier)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'album') {
      recordRecentActivity({
        type: 'album',
        id: item.id,
        title: item.title || item.name,
        subtitle: item.artist || 'Album',
        image: item.image,
      });
      navigate(`/album/${encodeURIComponent(item.id)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'playlist') {
      recordRecentActivity({
        type: 'playlist',
        id: item.id,
        title: item.title || item.name,
        subtitle: 'Playlist',
        image: item.image,
      });
      navigate(`/playlist/${encodeURIComponent(item.id)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'song') {
      const normalized = {
        ...item,
        videoId: item.id || item.videoId,
        id: item.id || item.videoId,
      };
      recordRecentActivity({
        type: 'song',
        id: normalized.videoId,
        title: normalized.title,
        subtitle: normalized.artist,
        image: normalized.image || normalized.thumbnail,
      });
      playTrack(normalized, [normalized]);
      setSuggestions([]);
      return;
    }

    handleQueryChange(item.title || item.name || query);
  };

  const artists = results?.artists || [];
  const albums = results?.albums || [];
  const playlists = results?.playlists || [];
  const people = results?.people || [];

  // Smart Top Result: Determine whether an artist or a song best matches the search query
  const qClean = query.trim().toLowerCase();
  const matchedArtist = artists.find((a) => {
    const aName = (a.name || a.title || '').toLowerCase();
    return aName === qClean || (qClean.length >= 3 && aName.startsWith(qClean));
  });

  const isArtistTop = Boolean(matchedArtist);
  const topResult = matchedArtist ? matchedArtist : (results?.tracks?.[0] || null);
  const otherTracks = isArtistTop ? (results?.tracks || []) : (results?.tracks?.slice(1) || []);

  const isPlayingArtist =
    isPlaying &&
    currentTrack &&
    results?.tracks?.some(
      (t) => String(t.videoId || t.id) === String(currentTrack.videoId || currentTrack.id)
    );

  const handlePlayArtist = async (e, artist) => {
    e.stopPropagation();
    const aName = artist?.name || artist?.title;
    if (results?.tracks && results.tracks.length > 0) {
      playTrack(results.tracks[0], results.tracks);
      return;
    }
    if (aName) {
      try {
        const res = await api.getArtist(aName);
        if (res?.tracks && res.tracks.length > 0) {
          playTrack(res.tracks[0], res.tracks);
        }
      } catch (err) {
        console.warn('Play artist error:', err);
      }
    }
  };

  const isCurrentPlaying = (item) => {
    const activeId = currentTrack?.videoId || currentTrack?.id;
    const itemId = item?.videoId || item?.id;
    return isPlaying && activeId && itemId && String(activeId) === String(itemId);
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Mobile-Only Spotify Sticky Search Header (< 1024px) */}
      <div className="lg:hidden sticky top-0 z-30 bg-black/95 backdrop-blur-xl px-4 pt-3 pb-2.5 border-b border-white/5">
        {/* Top Header Row: "Search" Title + Blend and Profile buttons (Matching media_1789481603346.png) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-white">Search</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/blend')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              title="Blend"
            >
              <Disc3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-center rounded-full p-0.5 ring-1 ring-white/20 hover:ring-white/50 transition-all cursor-pointer"
              title="Profile"
            >
              <UserAvatar user={user} size="xs" className="w-7 h-7 text-[10px]" />
            </button>
          </div>
        </div>

        {/* Search Input Bar (Rounded Spotify dark pill bg-[#242424]) */}
        <div className="relative flex items-center w-full mt-3">
          <Search className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full pl-10 pr-9 py-2.5 bg-[#242424] hover:bg-[#2b2b2b] focus:bg-[#242424] rounded-full text-sm text-white placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-white/30 border-0 transition-colors"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 text-[#8E8E93] hover:text-white p-1 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sticky Filter Chips directly under search bar on Mobile (Matching media_1789481603346.png) */}
        {query.trim().length > 0 && results && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'songs', label: `Songs (${results?.tracks?.length || 0})` },
              { id: 'artists', label: `Artists (${artists.length})` },
              { id: 'albums', label: `Albums (${albums.length})` },
              { id: 'playlists', label: `Playlists (${playlists.length})` },
              { id: 'people', label: `People (${people.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[#242424] text-white hover:bg-[#2d2d2d]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full max-w-7xl mx-auto">
        {/* Desktop Filter Tabs (Only visible on desktop) */}
        {query.trim().length > 0 && results && (
          <div className="hidden lg:flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'songs', label: `Songs (${results?.tracks?.length || 0})` },
              { id: 'artists', label: `Artists (${artists.length})` },
              { id: 'albums', label: `Albums (${albums.length})` },
              { id: 'playlists', label: `Playlists (${playlists.length})` },
              { id: 'people', label: `People (${people.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[#18181A] text-[#8E8E93] hover:text-white hover:bg-[#222226] border border-[#28282C]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 1. Loading Skeleton */}
        {isLoading && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 h-56 bg-[#18181B] rounded-2xl" />
              <div className="lg:col-span-7 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-[#18181B] rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. Live Autocomplete Suggestions (while typing without full submit) */}
        {!isLoading && !results && query.trim().length > 0 && (
          <div className="space-y-4 max-w-2xl">
            {suggestions.map((item, idx) => {
              const title = typeof item === 'string' ? item : item.title || item.name;
              const type = typeof item === 'object' ? item.type : 'search';
              const img = typeof item === 'object' ? item.image : null;

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className="flex items-center justify-between p-3 bg-[#121214] hover:bg-[#18181C] border border-[#202024] rounded-2xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {img ? (
                      <img
                        src={get500x500Image(img)}
                        alt={title}
                        className="w-10 h-10 rounded-lg object-cover bg-black flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#202024] flex items-center justify-center text-[#8E8E93] flex-shrink-0">
                        <Search className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-white truncate">
                        {title}
                      </p>
                      <p className="text-xs text-[#8E8E93] capitalize mt-0.5">{type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#8E8E93] group-hover:text-white transition-colors">
                    ↵
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Search Results: Spotify-Style Rich Sections */}
        {!isLoading && results && (
          <div className="space-y-8">
            {/* TAB: ALL — Split Layout (Top Result + Songs) */}
            {activeTab === 'all' && (
              <>
                {/* Top Result + Songs Side by Side on Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Result Card (Entity-Aware: Artist or Song) */}
                  {topResult && (
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
                      <h2 className="text-xl font-bold text-white mb-3">Top result</h2>
                      {isArtistTop ? (
                        <div
                          onClick={() => {
                            const aName = topResult.name || topResult.title;
                            recordRecentActivity({
                              type: 'artist',
                              id: aName,
                              title: aName,
                              subtitle: 'Artist',
                              image: topResult.image,
                            });
                            navigate(`/artist/${encodeURIComponent(aName)}`);
                          }}
                          className="flex-1 bg-[#181818]/80 hover:bg-[#242424] p-5 rounded-2xl transition-all group relative cursor-pointer flex flex-col justify-between shadow-xl"
                        >
                          <div className="relative">
                            <ArtistAvatar
                              name={topResult.name || topResult.title}
                              image={topResult.image}
                              size="xl"
                              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-lg"
                            />
                          </div>

                          <div className="mt-4 pr-16">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-white line-clamp-1 tracking-tight">
                              {topResult.name || topResult.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2.5 py-1 rounded-full bg-[#121212] text-[#1ED760] text-[11px] font-bold uppercase tracking-wider">
                                Artist
                              </span>
                            </div>
                          </div>

                          {/* Action Button (Spotify Circular Green Play/Pause Button) */}
                          <button
                            onClick={(e) => handlePlayArtist(e, topResult)}
                            className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all absolute bottom-5 right-5 flex-shrink-0 cursor-pointer"
                            title="Play"
                          >
                            {isPlayingArtist ? (
                              <Pause className="w-5 h-5 fill-black" />
                            ) : (
                              <Play className="w-5 h-5 fill-black ml-0.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            recordRecentActivity({
                              type: 'song',
                              id: topResult.videoId || topResult.id,
                              title: topResult.title,
                              subtitle: topResult.artist,
                              image: topResult.image || topResult.thumbnail,
                            });
                            playTrack(topResult);
                          }}
                          className="flex-1 bg-[#181818]/80 hover:bg-[#242424] p-5 rounded-2xl transition-all group relative cursor-pointer flex flex-col justify-between shadow-xl"
                        >
                          <div className="relative">
                            <img
                              src={get500x500Image(topResult.image || topResult.thumbnail)}
                              alt={topResult.title}
                              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover bg-black shadow-lg"
                            />
                          </div>

                          <div className="mt-4 pr-16">
                            <h3 className="text-2xl font-extrabold text-white line-clamp-1 tracking-tight">
                              {topResult.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-bold uppercase tracking-wider text-white">
                                Song
                              </span>
                              <ArtistLinks
                                track={topResult}
                                linkClassName="text-xs text-[#8E8E93] hover:text-white transition-colors"
                              />
                            </div>
                          </div>

                          {/* Floating circular green Play button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              recordRecentActivity({
                                type: 'song',
                                id: topResult.videoId || topResult.id,
                                title: topResult.title,
                                subtitle: topResult.artist,
                                image: topResult.image || topResult.thumbnail,
                              });
                              playTrack(topResult);
                            }}
                            className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 absolute bottom-5 right-5 cursor-pointer flex-shrink-0"
                            title="Play"
                          >
                            {isCurrentPlaying(topResult) ? (
                              <Pause className="w-5 h-5 fill-black" />
                            ) : (
                              <Play className="w-5 h-5 fill-black ml-0.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Songs List */}
                  <div className={`${topResult ? 'lg:col-span-7 xl:col-span-8' : 'col-span-12'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xl font-bold text-white">Songs</h2>
                      {otherTracks.length > 4 && (
                        <button
                          onClick={() => setActiveTab('songs')}
                          className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                        >
                          Show all
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {otherTracks.slice(0, 4).map((track, i) => {
                        const isPlayingThis = isCurrentPlaying(track);
                        const isLiked = likedTrackIds.has(String(track.videoId || track.id));

                        return (
                          <div
                            key={track.videoId || track.id || i}
                            onClick={() => {
                              recordRecentActivity({
                                type: 'song',
                                id: track.videoId || track.id,
                                title: track.title,
                                subtitle: track.artist,
                                image: track.thumbnail || track.image,
                              });
                              playTrack(track);
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#18181B] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 pr-3">
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                                <img
                                  src={get500x500Image(track.thumbnail || track.image)}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isPlayingThis ? (
                                    <Pause className="w-4 h-4 text-white fill-white" />
                                  ) : (
                                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                  )}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-semibold line-clamp-1 ${
                                    isPlayingThis ? 'text-[#22C55E]' : 'text-white'
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <div className="mt-0.5">
                                  <ArtistLinks
                                    track={track}
                                    linkClassName="text-xs text-[#8E8E93] hover:text-white transition-colors"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 text-xs text-[#8E8E93] flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlaylistTrack(track);
                                  setShowPlaylistSheet(true);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  isTrackInPlaylist(track.videoId || track.id)
                                    ? 'text-[#22C55E] bg-[#22C55E]/10 hover:bg-[#22C55E]/20'
                                    : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
                                }`}
                                title={isTrackInPlaylist(track.videoId || track.id) ? 'Added to Playlist' : 'Add to Playlist'}
                              >
                                {isTrackInPlaylist(track.videoId || track.id) ? (
                                  <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                                ) : (
                                  <ListPlus className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(track);
                                }}
                                className="text-[#8E8E93] hover:text-white transition-colors"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                                  }`}
                                />
                              </button>
                              <span className="text-xs font-medium tabular-nums">
                                {formatDuration(track.duration || track.duration_seconds)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Artists Section */}
                {artists.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Artists</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                      {artists.slice(0, 8).map((artist, idx) => {
                        const name = artist.name || artist.title;
                        return (
                          <div
                            key={artist.id || idx}
                            onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                            className="group cursor-pointer flex flex-col items-center text-center select-none py-2 px-1 hover:opacity-90 transition-opacity"
                          >
                            <div className="relative mb-2">
                              <ArtistAvatar
                                name={name}
                                image={artist.image}
                                size="lg"
                                className="w-16 h-16 sm:w-20 sm:h-20 shadow-md group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                                <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                              </div>
                            </div>
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate w-full group-hover:text-emerald-400 transition-colors mt-0.5">{name}</h4>
                            <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Artist</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Albums Section */}
                {albums.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {albums.slice(0, 6).map((album, idx) => {
                        const title = album.title || album.name;
                        const artist = album.artist || album.primary_artists;
                        return (
                          <div
                            key={album.id || idx}
                            onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
                            className="p-3 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group select-none"
                          >
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-[#1C1C1E] shadow-md flex items-center justify-center">
                              <img
                                src={get500x500Image(album.image || album.thumbnail)}
                                alt={title}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                                <Play className="w-4 h-4 fill-black ml-0.5" />
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
                            <p className="text-xs text-[#8E8E93] truncate mt-0.5 font-medium">
                              {album.year ? `${album.year} • ` : ''}
                              {artist || 'Album'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Playlists Section */}
                {playlists.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {playlists.slice(0, 6).map((pl, idx) => {
                        const title = pl.title || pl.name;
                        return (
                          <div
                            key={pl.id || idx}
                            onClick={() => {
                              recordRecentActivity({
                                type: 'playlist',
                                id: pl.id,
                                title: title,
                                subtitle: 'Playlist',
                                image: pl.image,
                              });
                              navigate(`/playlist/${encodeURIComponent(pl.id)}`);
                            }}
                            className="p-3 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group select-none"
                          >
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-[#1C1C1E] shadow-md flex items-center justify-center">
                              <img
                                src={get500x500Image(pl.image)}
                                alt={title}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                                <Play className="w-4 h-4 fill-black ml-0.5" />
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
                            <p className="text-xs text-[#8E8E93] truncate mt-0.5 font-medium">
                              By Staytup
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* People / Friends Section */}
                {people.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white">People</h2>
                      {people.length > 6 && (
                        <button
                          onClick={() => setActiveTab('people')}
                          className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {people.slice(0, 6).map((person, idx) => {
                        const name = person.displayName || person.username;
                        return (
                          <div
                            key={person.id || idx}
                            onClick={() => {
                              recordRecentActivity({
                                type: 'user',
                                id: person.id,
                                title: name,
                                subtitle: `@${person.username}`,
                                image: person.avatar,
                              });
                              navigate(`/user/${encodeURIComponent(person.id)}`);
                            }}
                            className="p-3.5 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group flex flex-col items-center text-center select-none"
                          >
                            <UserAvatar
                              user={person}
                              size="xl"
                              className="mb-3 shadow-md group-hover:scale-105 transition-transform"
                            />
                            <h4 className="text-sm font-bold text-white truncate w-full group-hover:text-white">
                              {name}
                            </h4>
                            <p className="text-xs text-[#8E8E93] truncate w-full mt-0.5">
                              @{person.username}
                            </p>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const b = await createOrGetBlend(user, [person]);
                                if (b?.id) navigate(`/blend/${b.id}`);
                              }}
                              className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Disc3 className="w-3 h-3" />
                              <span>Invite to Blend</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB: SONGS ONLY */}
            {activeTab === 'songs' && (
              <div className="space-y-1">
                {(results?.tracks || []).map((track, i) => {
                  const isPlayingThis = isCurrentPlaying(track);
                  const isLiked = likedTrackIds.has(String(track.videoId || track.id));

                  return (
                    <div
                      key={track.videoId || track.id || i}
                      onClick={() => {
                        recordRecentActivity({
                          type: 'song',
                          id: track.videoId || track.id,
                          title: track.title,
                          subtitle: track.artist,
                          image: track.thumbnail || track.image,
                        });
                        playTrack(track);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#18181B] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <span className="w-6 text-center text-xs font-medium tabular-nums text-[#8E8E93] group-hover:hidden">
                          {i + 1}
                        </span>
                        <Play className="w-4 h-4 text-white fill-white hidden group-hover:block ml-1 mr-1" />
                        <img
                          src={get500x500Image(track.thumbnail || track.image)}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-semibold line-clamp-1 ${
                              isPlayingThis ? 'text-[#22C55E]' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>
                          <div className="mt-0.5">
                            <ArtistLinks
                              track={track}
                              linkClassName="text-xs text-[#8E8E93] hover:text-white transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-[#8E8E93] flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistTrack(track);
                            setShowPlaylistSheet(true);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isTrackInPlaylist(track.videoId || track.id)
                              ? 'text-[#22C55E] bg-[#22C55E]/10 hover:bg-[#22C55E]/20'
                              : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
                          }`}
                          title={isTrackInPlaylist(track.videoId || track.id) ? 'Added to Playlist' : 'Add to Playlist'}
                        >
                          {isTrackInPlaylist(track.videoId || track.id) ? (
                            <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                          ) : (
                            <ListPlus className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className="text-[#8E8E93] hover:text-white transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                            }`}
                          />
                        </button>
                        <span className="text-xs font-medium tabular-nums">
                          {formatDuration(track.duration || track.duration_seconds)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: ARTISTS ONLY */}
            {activeTab === 'artists' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                {artists.map((artist, idx) => {
                  const name = artist.name || artist.title;
                  return (
                    <div
                      key={artist.id || idx}
                      onClick={() => {
                        recordRecentActivity({
                          type: 'artist',
                          id: name,
                          title: name,
                          subtitle: 'Artist',
                          image: artist.image,
                        });
                        navigate(`/artist/${encodeURIComponent(name)}`);
                      }}
                      className="group cursor-pointer flex flex-col items-center text-center select-none py-2 px-1 hover:opacity-90 transition-opacity"
                    >
                      <div className="relative mb-2">
                        <ArtistAvatar
                          name={name}
                          image={artist.image}
                          size="lg"
                          className="w-16 h-16 sm:w-20 sm:h-20 shadow-md group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                          <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                        </div>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate w-full group-hover:text-emerald-400 transition-colors mt-0.5">{name}</h4>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Artist</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: ALBUMS ONLY */}
            {activeTab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {albums.map((album, idx) => {
                  const title = album.title || album.name;
                  const artist = album.artist || album.primary_artists;
                  return (
                    <div
                      key={album.id || idx}
                      onClick={() => {
                        recordRecentActivity({
                          type: 'album',
                          id: album.id,
                          title: title,
                          subtitle: artist || 'Album',
                          image: album.image || album.thumbnail,
                        });
                        navigate(`/album/${encodeURIComponent(album.id)}`);
                      }}
                      className="p-3 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group select-none"
                    >
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-[#1C1C1E] shadow-md flex items-center justify-center">
                        <img
                          src={get500x500Image(album.image || album.thumbnail)}
                          alt={title}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{title}</h4>
                      <p className="text-xs text-[#8E8E93] truncate mt-0.5 font-medium">
                        {album.year ? `${album.year} • ` : ''}
                        {artist || 'Album'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: PLAYLISTS ONLY */}
            {activeTab === 'playlists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {playlists.map((pl, idx) => {
                  const title = pl.title || pl.name;
                  return (
                    <div
                      key={pl.id || idx}
                      onClick={() => {
                        recordRecentActivity({
                          type: 'playlist',
                          id: pl.id,
                          title: title,
                          subtitle: 'Playlist',
                          image: pl.image,
                        });
                        navigate(`/playlist/${encodeURIComponent(pl.id)}`);
                      }}
                      className="p-3 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group select-none"
                    >
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-[#1C1C1E] shadow-md flex items-center justify-center">
                        <img
                          src={get500x500Image(pl.image)}
                          alt={title}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-2 bottom-2 w-9 h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{title}</h4>
                      <p className="text-xs text-[#8E8E93] truncate mt-0.5 font-medium">By Staytup</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: PEOPLE ONLY */}
            {activeTab === 'people' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {people.map((person, idx) => {
                  const name = person.displayName || person.username;
                  return (
                    <div
                      key={person.id || idx}
                      onClick={() => {
                        recordRecentActivity({
                          type: 'user',
                          id: person.id,
                          title: name,
                          subtitle: `@${person.username}`,
                          image: person.avatar,
                        });
                        navigate(`/user/${encodeURIComponent(person.id)}`);
                      }}
                      className="p-3.5 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group flex flex-col items-center text-center select-none"
                    >
                      <UserAvatar
                        user={person}
                        size="xl"
                        className="mb-3 shadow-md group-hover:scale-105 transition-transform"
                      />
                      <h4 className="text-sm font-bold text-white truncate w-full group-hover:text-white">
                        {name}
                      </h4>
                      <p className="text-xs text-[#8E8E93] truncate w-full mt-0.5">
                        @{person.username}
                      </p>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const b = await createOrGetBlend(user, [person]);
                          if (b?.id) navigate(`/blend/${b.id}`);
                        }}
                        className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/25 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Disc3 className="w-3 h-3" />
                        <span>Invite to Blend</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. Empty State: Entity-Aware Recent Activity + "Browse All" Category Grid */}
        {!isLoading && !results && query.trim().length === 0 && (
          <div className="space-y-8">
            {/* Recent Activity (Meaningful interactions with real artwork) */}
            {recentActivities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-white">Recent Activity</h3>
                  <button
                    onClick={clearRecentActivity}
                    className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1">
                  {recentActivities.map((act) => {
                    const isSong = act.type === 'song';
                    const isArtist = act.type === 'artist';
                    const isUser = act.type === 'user';
                    const isAlbum = act.type === 'album';

                    return (
                      <div
                        key={`${act.type}-${act.id}`}
                        onClick={() => {
                          if (isSong) {
                            const trackObj = {
                              id: act.id,
                              videoId: act.id,
                              title: act.title,
                              artist: act.subtitle,
                              image: act.image,
                              thumbnail: act.image,
                            };
                            playTrack(trackObj, [trackObj]);
                          } else if (isArtist) {
                            navigate(`/artist/${encodeURIComponent(act.id)}`);
                          } else if (isAlbum) {
                            navigate(`/album/${encodeURIComponent(act.id)}`);
                          } else if (isUser) {
                            navigate(`/user/${encodeURIComponent(act.id)}`);
                          } else if (act.type === 'playlist') {
                            navigate(`/playlist/${encodeURIComponent(act.id)}`);
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[#18181B] cursor-pointer group transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          {/* Thumbnail / Avatar */}
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 flex items-center justify-center">
                            {isArtist ? (
                              <ArtistAvatar name={act.title} image={act.image} size="sm" className="w-full h-full rounded-full" />
                            ) : isUser ? (
                              <UserAvatar user={{ displayName: act.title, avatar: act.image }} size="sm" className="w-full h-full rounded-full" />
                            ) : act.image ? (
                              <img src={get500x500Image(act.image)} alt={act.title} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <div className="w-full h-full bg-[#242426] flex items-center justify-center text-[#8E8E93] rounded-lg">
                                <Music2 className="w-4 h-4" />
                              </div>
                            )}
                            {isSong && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-white truncate leading-tight group-hover:text-emerald-400 transition-colors">
                              {act.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#8E8E93]">
                              <span className="capitalize font-normal text-[#8E8E93]">
                                {act.type}
                              </span>
                              {(act.subtitle || act.artist) && (
                                <>
                                  <span className="text-[10px] text-[#71717A]">•</span>
                                  <p className="truncate font-normal text-[#A1A1AA]">
                                    {act.subtitle || act.artist}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side actions: Add to Playlist + Remove item button */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isSong && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const trackObj = {
                                  id: act.id,
                                  videoId: act.id,
                                  title: act.title,
                                  artist: act.subtitle,
                                  image: act.image,
                                  thumbnail: act.image,
                                };
                                setPlaylistTrack(trackObj);
                                setShowPlaylistSheet(true);
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                isTrackInPlaylist(act.id)
                                  ? 'text-[#22C55E] bg-[#22C55E]/10 hover:bg-[#22C55E]/20'
                                  : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
                              }`}
                              title={isTrackInPlaylist(act.id) ? 'Added to Playlist' : 'Add to Playlist'}
                            >
                              {isTrackInPlaylist(act.id) ? (
                                <Check className="w-4 h-4 stroke-[2.8]" />
                              ) : (
                                <ListPlus className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Remove item button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentActivity(act.type, act.id);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-white/10 text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trending Tags */}
            <div>
              <h3 className="text-base font-bold text-white mb-3">Trending Right Now</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {TRENDING_TAGS.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => handleQueryChange(tag)}
                    className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-[#D4D4D8] hover:text-white transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Browse All Genres / Categories */}
            <div>
              <h2 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
                Browse all
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5 sm:gap-4">
                {BROWSE_CATEGORIES.map((cat, i) => (
                  <div
                    key={i}
                    onClick={() => handleQueryChange(cat.query)}
                    className={`relative aspect-[16/10] min-h-[96px] sm:min-h-[112px] rounded-xl p-3 sm:p-3.5 bg-gradient-to-br ${cat.color} overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:brightness-105 active:scale-[0.98] transition-all duration-200 group select-none flex flex-col justify-between`}
                  >
                    <h3 className="relative z-10 text-sm sm:text-base font-extrabold text-white leading-snug tracking-tight max-w-[65%] break-words">
                      {cat.label}
                    </h3>
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.label}
                        loading="lazy"
                        className="absolute -right-2 -bottom-2 w-16 h-16 sm:w-18 sm:h-18 rounded-md object-cover shadow-[-2px_4px_12px_rgba(0,0,0,0.45)] rotate-[25deg] group-hover:rotate-[20deg] group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                      />
                    ) : (
                      <div className="absolute -right-1 -bottom-1 w-12 h-12 rounded-md bg-black/20 flex items-center justify-center rotate-[25deg] opacity-60">
                        <Music2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Playlist Sheet for adding songs from search or recent activity */}
      <PlaylistSheet
        track={playlistTrack}
        isOpen={showPlaylistSheet}
        onClose={() => {
          setShowPlaylistSheet(false);
          setPlaylistTrack(null);
          loadUserPlaylists();
        }}
      />
    </div>
  );
}
