import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { Search, X, Play, User, ArrowLeft, Disc3, ListMusic } from 'lucide-react';
import { ArtistSheet } from './ArtistSheet';
import { AlbumSheet } from './AlbumSheet';

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
  { label: 'Bollywood', query: 'bollywood hits', desc: 'Trending & Classics' },
  { label: 'Punjabi', query: 'punjabi hits', desc: 'Hustle & Pop' },
  { label: 'Romantic', query: 'romantic hindi', desc: 'Love & Soul' },
  { label: 'Lo-Fi & Chill', query: 'chill lofi hindi', desc: 'Slowed & Acoustic' },
  { label: 'Party & Dance', query: 'party hindi songs', desc: 'Club & Festival' },
  { label: 'Indie Pop', query: 'indian indie pop', desc: 'Fresh Discovery' },
];

export const SearchModal = ({ isOpen, onClose }) => {
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [recentPlayed, setRecentPlayed] = useState([]);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSuggestions([]);
    setIsSuggesting(false);
    setResults(null);
    try {
      const saved = localStorage.getItem('staytup_search_played');
      if (saved) setRecentPlayed(JSON.parse(saved));
    } catch (e) {}
  }, [isOpen]);

  // Autocomplete live suggestion query
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    setIsSuggesting(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      api.getSuggestions(query)
        .then(res => {
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

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setQuery(q);
    setSuggestions([]);
    setIsSuggesting(false);
    setIsLoading(true);

    try {
      const data = await api.search(q, 'all', 0, 30);
      if (data?.tracks && Array.isArray(data.tracks)) {
        const seen = new Set();
        data.tracks = data.tracks.filter((t) => {
          const id = t.videoId || t.video_id || t.id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      }
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayFromSearch = (track, trackList = null) => {
    const normalized = {
      id: track.id || track.videoId || track.video_id,
      videoId: track.videoId || track.video_id || track.id,
      video_id: track.videoId || track.video_id || track.id,
      title: track.title,
      artist: track.artist || track.extra || 'Unknown Artist',
      album: track.album || '',
      image: track.image || track.thumbnail || track.artwork_url,
      thumbnail: track.thumbnail || track.image || track.artwork_url,
      artwork_url: track.artwork_url || track.image || track.thumbnail,
      duration: track.duration || track.duration_seconds || 0,
      duration_seconds: track.duration_seconds || track.duration || 0,
    };

    playTrack(normalized, trackList || [normalized]);

    setRecentPlayed(prev => {
      const filtered = prev.filter(t => (t.videoId || t.id) !== (normalized.videoId || normalized.id));
      const updated = [normalized, ...filtered].slice(0, 15);
      try {
        localStorage.setItem('staytup_search_played', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    onClose();
  };

  const handlePlayAlbumDirect = async (album, e) => {
    if (e) e.stopPropagation();
    try {
      setIsLoading(true);
      const res = await api.getAlbum(album.id);
      const albumTracks = res?.tracks || res?.album?.tracks || [];
      if (albumTracks.length > 0) {
        playTrack(albumTracks[0], albumTracks);
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Direct album play failed, opening sheet:', err);
    } finally {
      setIsLoading(false);
    }
    setSelectedAlbum(album);
  };

  const handlePlayPlaylistDirect = async (playlist, e) => {
    if (e) e.stopPropagation();
    try {
      setIsLoading(true);
      const res = await api.getPlaylist(playlist.id);
      const playlistTracks = res?.tracks || res?.playlist?.tracks || [];
      if (playlistTracks.length > 0) {
        playTrack(playlistTracks[0], playlistTracks);
        onClose();
        return;
      }
    } catch (err) {
      console.warn('Direct playlist play failed, opening sheet:', err);
    } finally {
      setIsLoading(false);
    }
    setSelectedAlbum({
      ...playlist,
      type: 'playlist',
      isPlaylist: true,
    });
  };

  const handleSelectSuggestion = (item) => {
    if (typeof item === 'string') {
      handleSearch(item);
      return;
    }

    if (item.type === 'artist') {
      setSelectedArtist({ name: item.title || item.name, id: item.id });
      setSuggestions([]);
      return;
    }

    if (item.type === 'album') {
      setSelectedAlbum({
        id: item.id,
        title: item.title || item.name,
        name: item.title || item.name,
        artist: item.artist,
        image: item.image,
        thumbnail: item.thumbnail,
        year: item.year,
        type: 'album',
      });
      setSuggestions([]);
      return;
    }

    if (item.type === 'playlist') {
      setSelectedAlbum({
        id: item.id,
        title: item.title || item.name,
        name: item.title || item.name,
        artist: item.artist || 'Playlist',
        image: item.image,
        thumbnail: item.thumbnail,
        type: 'playlist',
        isPlaylist: true,
      });
      setSuggestions([]);
      return;
    }

    if (item.type === 'song') {
      handlePlayFromSearch(item, [item]);
      return;
    }

    handleSearch(item.title || item.name || query);
  };

  const handleTabChange = async (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'albums' && query.trim() && (!results?.albums || results.albums.length <= 8)) {
      setIsLoading(true);
      try {
        const albumData = await api.search(query.trim(), 'albums', 0, 30);
        if (albumData?.albums && Array.isArray(albumData.albums)) {
          setResults(prev => ({
            ...(prev || {}),
            albums: albumData.albums,
          }));
        }
      } catch (e) {
        console.warn('Could not fetch albums tab:', e);
      } finally {
        setIsLoading(false);
      }
    } else if (tabId === 'playlists' && query.trim() && (!results?.playlists || results.playlists.length <= 8)) {
      setIsLoading(true);
      try {
        const playlistData = await api.search(query.trim(), 'playlists', 0, 30);
        if (playlistData?.playlists && Array.isArray(playlistData.playlists)) {
          setResults(prev => ({
            ...(prev || {}),
            playlists: playlistData.playlists,
          }));
        }
      } catch (e) {
        console.warn('Could not fetch playlists tab:', e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  const songSuggestions = suggestions.filter(s => typeof s === 'object' && s.type === 'song');
  const albumSuggestions = suggestions.filter(s => typeof s === 'object' && s.type === 'album');
  const playlistSuggestions = suggestions.filter(s => typeof s === 'object' && s.type === 'playlist');
  const artistSuggestions = suggestions.filter(s => typeof s === 'object' && s.type === 'artist');

  const topTrack = results?.tracks?.[0] || null;
  const otherTracks = results?.tracks?.slice(1) || [];

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-10 md:h-full md:w-full flex flex-col bg-black text-white animate-in fade-in duration-150 select-none overflow-hidden">
      {/* Search Header Bar — Lifted Up to the Very Top */}
      <div className="px-3.5 sm:px-8 pt-2 sm:pt-3 pb-2.5 sm:pb-3 border-b border-[#1C1C1E] bg-black/95 backdrop-blur-md z-20 flex-shrink-0">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-2.5 sm:gap-3">
          {/* Back button — circle pill matching all other pages */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#141416] hover:bg-[#1C1C1E] border border-[#26262A] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0 cursor-pointer md:hidden"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3.5 sm:left-4 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (results) setResults(null);
              }}
              onFocus={() => {
                if (results && !query.trim()) {
                  setResults(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Search songs, artists, albums..."
              autoFocus
              className="w-full pl-10 sm:pl-11 pr-10 py-2 sm:py-2.5 bg-[#141416] border border-[#26262A] focus:border-white/40 focus:bg-[#18181C] rounded-full text-white placeholder-[#8E8E93] text-sm focus:outline-none transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setResults(null);
                }}
                className="absolute right-3 text-[#8E8E93] hover:text-white p-1"
                aria-label="Clear text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => handleSearch()}
            className="text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-4 py-2 sm:py-2.5 rounded-full transition-colors hidden sm:block flex-shrink-0 cursor-pointer"
          >
            Search
          </button>
        </div>
      </div>

      {/* Main Container — Padded for Zero Dead Space */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-3 sm:pt-4 pb-24 sm:pb-12 no-scrollbar max-w-3xl mx-auto w-full">
        {/* 1. Live Autocomplete Suggestions / Typing View */}
        {!isLoading && !results && query.trim().length > 0 && (
          <div className="space-y-5">
            {/* Loading Suggestions Shimmer */}
            {isSuggesting && suggestions.length === 0 && (
              <div>
                <div className="h-4 bg-[#1E1E22] rounded w-20 mb-2.5 px-1 animate-pulse" />
                <div className="space-y-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3.5 p-2 bg-[#121214] border border-[#1C1C20] rounded-xl animate-pulse">
                      <div className="w-12 h-12 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-[#24242A] rounded w-2/5" />
                        <div className="h-3 bg-[#1C1C20] rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty Suggestions Notice */}
            {!isSuggesting && suggestions.length === 0 && (
              <div className="py-12 text-center text-[#8E8E93]">
                <Search className="w-8 h-8 mx-auto mb-2 text-[#48484A]" />
                <p className="text-sm font-medium text-white/80">Press Enter to search for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-[#8E8E93] mt-1">Explore songs, artists, albums, and playlists</p>
              </div>
            )}

            {/* Song Suggestions */}
            {songSuggestions.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Songs
                </h3>
                <div className="space-y-1">
                  {songSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-song-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center justify-between py-2.5 px-2.5 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1C1C1E] flex-shrink-0 border border-white/5 relative">
                          <img
                            src={get500x500Image(item.image)}
                            alt={item.title}
                            onError={(e) => {
                              e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            {item.artist || item.extra || 'Song'}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white text-[#8E8E93] group-hover:text-black flex items-center justify-center flex-shrink-0 transition-colors">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Album Suggestions */}
            {albumSuggestions.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Albums
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {albumSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-album-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center justify-between p-2.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 rounded-xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5 relative">
                          <img
                            src={get500x500Image(item.image)}
                            alt={item.title}
                            onError={(e) => {
                              e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            {item.artist || 'Album'}{item.year ? ` • ${item.year}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#8E8E93] group-hover:text-white px-2 py-1 rounded-md flex-shrink-0">
                        Album
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playlist Suggestions */}
            {playlistSuggestions.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Playlists
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {playlistSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-playlist-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center justify-between p-2.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 rounded-xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5 relative">
                          <img
                            src={get500x500Image(item.image)}
                            alt={item.title}
                            onError={(e) => {
                              e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            {item.artist || 'Playlist'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#8E8E93] group-hover:text-white px-2 py-1 rounded-md flex-shrink-0">
                        Playlist
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artist Suggestions */}
            {artistSuggestions.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Artists
                </h3>
                <div className="space-y-1">
                  {artistSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-artist-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center justify-between py-2.5 px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1C1C1E] flex-shrink-0 border border-white/5">
                          {item.image && !item.image.includes('default') ? (
                            <img
                              src={get500x500Image(item.image)}
                              alt={item.title}
                              onError={(e) => {
                                e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8E8E93]">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            Artist
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Skeleton Loading State — Aligned with Results View Layout */}
        {isLoading && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
            {/* Filter Tabs Skeleton */}
            <div className="flex items-center gap-2 pb-0 overflow-x-auto no-scrollbar">
              {['All', 'Songs', 'Artists', 'Albums', 'Playlists'].map((label, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                    idx === 0
                      ? 'bg-white/10 text-white/50 border-white/20'
                      : 'bg-[#121212] border-[#2C2C2E] text-white/30'
                  } animate-pulse`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Top Match Skeleton */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                Top Match
              </h3>
              <div className="w-full bg-[#121214] border border-[#1E1E22] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 animate-pulse">
                <div className="w-full sm:w-32 aspect-square rounded-xl bg-[#1C1C20] flex-shrink-0" />
                <div className="flex-1 w-full space-y-2.5">
                  <div className="h-3 bg-[#24242A] rounded w-16" />
                  <div className="h-5 bg-[#24242A] rounded w-3/5" />
                  <div className="h-3.5 bg-[#1C1C20] rounded w-2/5" />
                  <div className="h-8 bg-[#1C1C20] rounded-full w-28 mt-2" />
                </div>
              </div>
            </div>

            {/* Albums Skeleton Grid */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                Albums
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 bg-[#121214] border border-[#1C1C20] rounded-2xl animate-pulse">
                    <div className="w-full aspect-square bg-[#1C1C20] rounded-xl mb-3" />
                    <div className="h-3.5 bg-[#24242A] rounded w-3/4 mb-1.5" />
                    <div className="h-3 bg-[#1C1C20] rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Songs Skeleton List */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                Songs
              </h3>
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3.5 p-2 bg-[#121214] border border-[#1C1C20] rounded-xl animate-pulse">
                    <div className="w-13 h-13 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-[#24242A] rounded w-2/5" />
                      <div className="h-3 bg-[#1C1C20] rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Search Results */}
        {!isLoading && results && (
          <div className="space-y-4 sm:space-y-5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 pb-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All' },
                { id: 'tracks', label: `Songs (${results.tracks?.length || 0})` },
                { id: 'artists', label: `Artists (${results.artists?.length || 0})` },
                { id: 'albums', label: `Albums (${results.albums?.length || 0})` },
                { id: 'playlists', label: `Playlists (${results.playlists?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-black font-bold'
                      : 'bg-[#121212] border border-[#2C2C2E] text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TOP RESULT HERO CARD */}
            {(activeTab === 'all' || activeTab === 'tracks') && topTrack && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Top Match
                </h3>
                <div
                  onClick={() => handlePlayFromSearch(topTrack, results.tracks)}
                  className="w-full bg-[#121214] hover:bg-[#18181A] border border-[#242426] hover:border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 cursor-pointer group transition-all"
                >
                  <div className="w-full sm:w-32 aspect-square rounded-xl overflow-hidden bg-black flex-shrink-0 relative shadow-md">
                    <img
                      src={get500x500Image(topTrack.thumbnail || topTrack.image || topTrack.artwork_url)}
                      alt={topTrack.title}
                      onError={(e) => {
                        e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#8E8E93] px-2 py-0.5 rounded-md mb-1.5">
                      Song
                    </span>
                    <h4 className="font-bold text-lg sm:text-xl text-white line-clamp-1 group-hover:text-white">
                      {topTrack.title}
                    </h4>
                    <p className="text-sm text-[#8E8E93] line-clamp-1 mt-1">
                      {topTrack.artist}
                    </p>
                    {topTrack.album && (
                      <p className="text-xs text-[#8E8E93]/70 line-clamp-1 mt-0.5">
                        {topTrack.album}
                      </p>
                    )}

                    <div className="mt-3.5 flex items-center justify-center sm:justify-start gap-3">
                      <button
                        type="button"
                        className="px-5 py-2 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ALBUMS SECTION — ON TOP AS REQUESTED */}
            {(activeTab === 'all' || activeTab === 'albums') && results.albums?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Albums {activeTab !== 'all' ? `(${results.albums.length})` : ''}
                  </h3>
                  {activeTab === 'all' && results.albums.length > 4 && (
                    <button
                      onClick={() => handleTabChange('albums')}
                      className="text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                    >
                      See All →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {(activeTab === 'all' ? results.albums.slice(0, 8) : results.albums).map((album, idx) => (
                    <div
                      key={album.id || idx}
                      onClick={() => setSelectedAlbum(album)}
                      className="cursor-pointer p-3 sm:p-3.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#202024] hover:border-white/20 rounded-2xl transition-all group flex flex-col justify-between text-left"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-black relative mb-3 shadow-md">
                        <img
                          src={get500x500Image(album.image || album.thumbnail)}
                          alt={album.title || album.name}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div
                          onClick={(e) => handlePlayAlbumDirect(album, e)}
                          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          title="Play Album"
                        >
                          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-white line-clamp-1 group-hover:text-white block">
                          {album.title || album.name}
                        </span>
                        <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5 font-medium">
                          {album.artist || 'Album'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E93]/70 mt-1">
                          {album.year && <span>{album.year}</span>}
                          {album.year && (album.song_count || album.track_count) > 0 && <span>•</span>}
                          {(album.song_count || album.track_count) > 0 && (
                            <span>{album.song_count || album.track_count} tracks</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARTISTS SECTION */}
            {(activeTab === 'all' || activeTab === 'artists') && results.artists?.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Artists
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {results.artists.map((artist, idx) => (
                    <div
                      key={artist.id || idx}
                      onClick={() => setSelectedArtist({ name: artist.name || artist.title, id: artist.id })}
                      className="cursor-pointer flex flex-col items-center text-center group transition-transform active:scale-95"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2 bg-[#121212] group-hover:ring-2 group-hover:ring-white transition-all flex-shrink-0">
                        <img
                          src={get500x500Image(artist.image || artist.thumbnail)}
                          alt={artist.name || artist.title}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-bold text-xs text-white line-clamp-1 group-hover:text-white">
                        {artist.name || artist.title}
                      </span>
                      <span className="text-[11px] text-[#8E8E93] mt-0.5">Artist</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SONGS LIST — NO SEPARATORS (CLEAN CARDS) */}
            {(activeTab === 'all' || activeTab === 'tracks') && otherTracks.length > 0 && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                  Songs
                </h3>
                <div className="space-y-1">
                  {otherTracks.map((track, i) => (
                    <div
                      key={track.videoId || track.id || i}
                      onClick={() => handlePlayFromSearch(track, results.tracks)}
                      className="flex items-center justify-between py-2.5 px-3 hover:bg-[#141416] rounded-2xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5 relative">
                          <img
                            src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                            alt={track.title}
                            onError={(e) => {
                              e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm sm:text-base text-white line-clamp-1 group-hover:text-white">
                            {track.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-white text-[#8E8E93] group-hover:text-black flex items-center justify-center flex-shrink-0 transition-colors shadow-sm">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PLAYLISTS SECTION */}
            {(activeTab === 'all' || activeTab === 'playlists') && results.playlists?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Playlists {activeTab !== 'all' ? `(${results.playlists.length})` : ''}
                  </h3>
                  {activeTab === 'all' && results.playlists.length > 4 && (
                    <button
                      onClick={() => handleTabChange('playlists')}
                      className="text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                    >
                      See All →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {(activeTab === 'all' ? results.playlists.slice(0, 8) : results.playlists).map((playlist, idx) => (
                    <div
                      key={playlist.id || idx}
                      onClick={() => setSelectedAlbum({
                        ...playlist,
                        type: 'playlist',
                        isPlaylist: true,
                      })}
                      className="cursor-pointer p-3 sm:p-3.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#202024] hover:border-white/20 rounded-2xl transition-all group flex flex-col justify-between text-left"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-black relative mb-3 shadow-md">
                        <img
                          src={get500x500Image(playlist.image || playlist.thumbnail)}
                          alt={playlist.title || playlist.name}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div
                          onClick={(e) => handlePlayPlaylistDirect(playlist, e)}
                          className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          title="Play Playlist"
                        >
                          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-white line-clamp-1 group-hover:text-white block">
                          {playlist.title || playlist.name}
                        </span>
                        <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5 font-medium">
                          {playlist.artist || 'Playlist'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E93]/70 mt-1">
                          {(playlist.song_count || playlist.track_count) > 0 ? (
                            <span>{playlist.song_count || playlist.track_count} tracks</span>
                          ) : (
                            <span>Playlist</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Default View (Empty search state) */}
        {!isLoading && !results && !query.trim() && (
          <div className="space-y-5 pb-10">
            {/* Recent Searches (if any) */}
            {recentPlayed.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Recent Searches
                  </h3>
                  <button
                    onClick={() => {
                      localStorage.removeItem('staytup_search_played');
                      setRecentPlayed([]);
                    }}
                    className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {recentPlayed.slice(0, 6).map((track, i) => (
                    <div
                      key={track.videoId || track.id || i}
                      onClick={() => handlePlayFromSearch(track, recentPlayed)}
                      className="flex items-center justify-between py-2 px-2.5 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <img
                          src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                          alt={track.title}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">{track.title}</p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">{track.artist}</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white text-[#8E8E93] group-hover:text-black flex items-center justify-center flex-shrink-0 transition-colors">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Quick Search Chips */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                Trending Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="px-3.5 py-1.5 rounded-full bg-[#121214] hover:bg-white hover:text-black border border-[#222226] text-xs font-medium text-white/90 transition-all active:scale-95 cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Browse Categories & Genres — Clean, Minimal, Dark (No Loud Gradients) */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 px-1">
                Browse Categories
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {BROWSE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.label}
                    onClick={() => handleSearch(cat.query)}
                    className="p-4 sm:p-5 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 flex flex-col justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-white tracking-tight">
                        {cat.label}
                      </h4>
                      <p className="text-xs text-[#8E8E93] mt-1">
                        {cat.desc}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#8E8E93] group-hover:text-white mt-4 flex items-center gap-1 transition-colors">
                      <span>Explore</span>
                      <i className="fi fi-rr-angle-small-right text-xs inline-flex items-center"></i>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Artist Sheet */}
      {selectedArtist && (
        <ArtistSheet
          artistName={typeof selectedArtist === 'object' ? selectedArtist.name : selectedArtist}
          artistId={typeof selectedArtist === 'object' ? selectedArtist.id : null}
          isOpen={!!selectedArtist}
          onClose={() => setSelectedArtist(null)}
        />
      )}

      {/* Album / Playlist Sheet */}
      {selectedAlbum && (
        <AlbumSheet
          albumId={selectedAlbum.id}
          albumName={selectedAlbum.title || selectedAlbum.name}
          initialData={selectedAlbum}
          isPlaylist={selectedAlbum.type === 'playlist' || selectedAlbum.isPlaylist}
          isOpen={!!selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
        />
      )}
    </div>
  );
};
