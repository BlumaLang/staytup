import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
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
  Heart,
  Music2,
} from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { ArtistLinks } from '../components/ArtistLinks';
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

  const queryParam = searchParams.get('q') || '';
  const [query, setQuery] = useState(queryParam);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'songs' | 'artists' | 'albums' | 'playlists'
  const [isLoading, setIsLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState(() => getRecentActivity(12));
  const debounceTimerRef = useRef(null);

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

  const topResult = results?.tracks?.[0] || null;
  const otherTracks = results?.tracks?.slice(1) || [];
  const artists = results?.artists || [];
  const albums = results?.albums || [];
  const playlists = results?.playlists || [];
  const people = results?.people || [];

  const isCurrentPlaying = (item) => {
    const activeId = currentTrack?.videoId || currentTrack?.id;
    const itemId = item?.videoId || item?.id;
    return isPlaying && activeId && itemId && String(activeId) === String(itemId);
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Mobile-Only Search Input Bar (Hidden on desktop since Desktop Header handles search) */}
      <div className="lg:hidden sticky top-0 z-20 px-4 py-3 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="What do you want to play?"
            className="w-full pl-10 pr-9 py-2.5 bg-[#18181B] border border-[#27272A] rounded-full text-sm text-white placeholder-[#8E8E93] focus:outline-none focus:border-white/40"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 text-[#8E8E93] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full max-w-7xl mx-auto">
        {/* Filter Tabs (When results or search query is active) */}
        {query.trim().length > 0 && results && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
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
                  {/* Top Result Card */}
                  {topResult && (
                    <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
                      <h2 className="text-xl font-bold text-white mb-3">Top result</h2>
                      <div
                        onClick={() => {
                          recordRecentActivity({
                            type: 'song',
                            id: topResult.videoId || topResult.id,
                            title: topResult.title,
                            subtitle: topResult.artist,
                            image: topResult.image || topResult.thumbnail,
                          });
                          playTrack(topResult, [topResult, ...otherTracks]);
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

                        <div className="mt-4">
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
                            playTrack(topResult, [topResult, ...otherTracks]);
                          }}
                          className="w-12 h-12 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all opacity-0 group-hover:opacity-100 absolute bottom-5 right-5 cursor-pointer"
                          title="Play"
                        >
                          {isCurrentPlaying(topResult) ? (
                            <Pause className="w-5 h-5 fill-black" />
                          ) : (
                            <Play className="w-5 h-5 fill-black ml-0.5" />
                          )}
                        </button>
                      </div>
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
                              playTrack(track, [track, ...otherTracks]);
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

                            <div className="flex items-center gap-3 text-xs text-[#8E8E93] flex-shrink-0">
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {artists.slice(0, 6).map((artist, idx) => {
                        const name = artist.name || artist.title;
                        return (
                          <div
                            key={artist.id || idx}
                            onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                            className="p-3.5 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group flex flex-col items-center text-center select-none"
                          >
                            <div className="relative mb-3">
                              <ArtistAvatar
                                name={name}
                                image={artist.image}
                                size="2xl"
                                className="w-24 h-24 sm:w-28 sm:h-28 shadow-xl group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute right-1 bottom-1 w-9 h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                                <Play className="w-4 h-4 fill-black ml-0.5" />
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-white truncate w-full group-hover:underline">{name}</h4>
                            <p className="text-xs text-[#8E8E93] mt-0.5 font-medium">Artist</p>
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
                            <span className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                              Profile
                            </span>
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
                        playTrack(track, results?.tracks);
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

                      <div className="flex items-center gap-3 text-xs text-[#8E8E93] flex-shrink-0">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                      className="p-3.5 rounded-2xl hover:bg-white/[0.06] transition-all cursor-pointer group flex flex-col items-center text-center select-none"
                    >
                      <div className="relative mb-3">
                        <ArtistAvatar
                          name={name}
                          image={artist.image}
                          size="2xl"
                          className="w-24 h-24 sm:w-28 sm:h-28 shadow-xl group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute right-1 bottom-1 w-9 h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate w-full group-hover:underline">{name}</h4>
                      <p className="text-xs text-[#8E8E93] mt-0.5 font-medium">Artist</p>
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
                      <span className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Profile
                      </span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                        className="p-3 bg-[#18181B] hover:bg-[#222226] border border-white/5 rounded-2xl cursor-pointer group transition-all relative flex flex-col justify-between"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentActivity(act.type, act.id);
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black text-[#8E8E93] hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Remove from recent"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2.5 bg-black flex-shrink-0">
                          {isArtist ? (
                            <ArtistAvatar name={act.title} image={act.image} size="xl" className="w-full h-full !rounded-none" />
                          ) : isUser ? (
                            <UserAvatar user={{ displayName: act.title, avatar: act.image }} size="xl" className="w-full h-full !rounded-none" />
                          ) : act.image ? (
                            <img src={get500x500Image(act.image)} alt={act.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#242426] flex items-center justify-center text-[#8E8E93]">
                              <Music2 className="w-6 h-6" />
                            </div>
                          )}
                          {isSong && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-white">
                            {act.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[#A1A1AA]">
                              {act.type}
                            </span>
                            {act.subtitle && (
                              <p className="text-[10px] text-[#8E8E93] truncate">
                                {act.subtitle}
                              </p>
                            )}
                          </div>
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
    </div>
  );
}
