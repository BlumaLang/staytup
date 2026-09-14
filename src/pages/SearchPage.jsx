import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { Search, X, Play, User, Disc3, ListMusic } from 'lucide-react';

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

export default function SearchPage() {
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [recentPlayed, setRecentPlayed] = useState([]);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('staytup_search_played');
      if (saved) setRecentPlayed(JSON.parse(saved));
    } catch (e) {}
  }, []);

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

    setRecentPlayed((prev) => {
      const filtered = prev.filter(
        (t) => (t.videoId || t.id) !== (normalized.videoId || normalized.id)
      );
      const updated = [normalized, ...filtered].slice(0, 15);
      try {
        localStorage.setItem('staytup_search_played', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleSelectSuggestion = (item) => {
    if (typeof item === 'string') {
      handleSearch(item);
      return;
    }

    if (item.type === 'artist') {
      const artistIdentifier = item.id || item.title || item.name;
      navigate(`/artist/${encodeURIComponent(artistIdentifier)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'album') {
      navigate(`/album/${encodeURIComponent(item.id)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'playlist') {
      navigate(`/playlist/${encodeURIComponent(item.id)}`);
      setSuggestions([]);
      return;
    }

    if (item.type === 'song') {
      handlePlayFromSearch(item, [item]);
      setSuggestions([]);
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
          setResults((prev) => ({
            ...(prev || {}),
            albums: albumData.albums,
          }));
        }
      } catch (e) {
        console.warn('Could not fetch albums tab:', e);
      } finally {
        setIsLoading(false);
      }
    } else if (
      tabId === 'playlists' &&
      query.trim() &&
      (!results?.playlists || results.playlists.length <= 8)
    ) {
      setIsLoading(true);
      try {
        const playlistData = await api.search(query.trim(), 'playlists', 0, 30);
        if (playlistData?.playlists && Array.isArray(playlistData.playlists)) {
          setResults((prev) => ({
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

  const songSuggestions = suggestions.filter((s) => typeof s === 'object' && s.type === 'song');
  const albumSuggestions = suggestions.filter((s) => typeof s === 'object' && s.type === 'album');
  const playlistSuggestions = suggestions.filter(
    (s) => typeof s === 'object' && s.type === 'playlist'
  );
  const artistSuggestions = suggestions.filter(
    (s) => typeof s === 'object' && s.type === 'artist'
  );

  const topTrack = results?.tracks?.[0] || null;
  const otherTracks = results?.tracks?.slice(1) || [];

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Search Header Bar (Sticky) */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-4 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 max-w-xl relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-[#8E8E93]" />
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
              placeholder="What do you want to play?"
              className="w-full pl-11 pr-10 py-2.5 bg-[#141416] border border-[#26262A] focus:border-white/40 focus:bg-[#18181C] rounded-full text-white placeholder-[#8E8E93] text-sm sm:text-base focus:outline-none transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setResults(null);
                }}
                className="absolute right-3.5 text-[#8E8E93] hover:text-white p-1 cursor-pointer"
                aria-label="Clear text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => handleSearch()}
            className="text-xs sm:text-sm font-bold text-black bg-white hover:bg-gray-200 px-5 py-2.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-md"
          >
            Search
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full">
        {/* 1. Live Autocomplete Suggestions */}
        {!isLoading && !results && query.trim().length > 0 && (
          <div className="space-y-6">
            {isSuggesting && suggestions.length === 0 && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 p-2 bg-[#121214] border border-[#1C1C20] rounded-xl animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-[#24242A] rounded w-2/5" />
                      <div className="h-3 bg-[#1C1C20] rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Song Suggestions */}
            {songSuggestions.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-white mb-2.5">Songs</h3>
                <div className="space-y-1">
                  {songSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-song-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center justify-between py-2 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <img
                          src={get500x500Image(item.image)}
                          alt={item.title}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1">
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

            {/* Artist Suggestions */}
            {artistSuggestions.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-white mb-2.5">Artists</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {artistSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-artist-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="p-3 bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group"
                    >
                      <img
                        src={get500x500Image(item.image)}
                        alt={item.title || item.name}
                        className="w-12 h-12 rounded-full object-cover bg-black flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                          {item.title || item.name}
                        </p>
                        <p className="text-xs text-[#8E8E93]">Artist</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Album Suggestions */}
            {albumSuggestions.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-white mb-2.5">Albums</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {albumSuggestions.map((item, idx) => (
                    <div
                      key={`sugg-album-${item.id || idx}`}
                      onClick={() => handleSelectSuggestion(item)}
                      className="flex items-center gap-3 p-2.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 rounded-xl cursor-pointer transition-all group"
                    >
                      <img
                        src={get500x500Image(item.image)}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover bg-black flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1">
                          {item.artist || 'Album'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-[#8E8E93]">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Searching Staytup Music...</p>
          </div>
        )}

        {/* 3. Full Search Results View */}
        {!isLoading && results && (
          <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'songs', label: 'Songs' },
                { id: 'artists', label: 'Artists' },
                { id: 'albums', label: 'Albums' },
                { id: 'playlists', label: 'Playlists' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[#18181B] text-[#8E8E93] hover:text-white hover:bg-[#27272A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: ALL */}
            {activeTab === 'all' && (
              <div className="space-y-8">
                {/* Top Result + Songs list side-by-side or stacked */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {topTrack && (
                    <div className="lg:col-span-2">
                      <h3 className="text-lg font-bold text-white mb-3">Top Result</h3>
                      <div
                        onClick={() => handlePlayFromSearch(topTrack, results?.tracks)}
                        className="p-5 rounded-2xl bg-[#141416] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer group flex flex-col justify-between h-[240px]"
                      >
                        <img
                          src={get500x500Image(topTrack.image || topTrack.thumbnail)}
                          alt={topTrack.title}
                          className="w-24 h-24 rounded-xl object-cover shadow-lg border border-white/10"
                        />
                        <div>
                          <h4 className="text-xl font-bold text-white line-clamp-1 group-hover:text-white">
                            {topTrack.title}
                          </h4>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-1">
                            {topTrack.artist} • <span className="text-white font-semibold">Song</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {otherTracks.length > 0 && (
                    <div className={topTrack ? 'lg:col-span-3' : 'lg:col-span-5'}>
                      <h3 className="text-lg font-bold text-white mb-3">Songs</h3>
                      <div className="space-y-1">
                        {otherTracks.slice(0, 5).map((track, i) => (
                          <div
                            key={track.videoId || track.id || i}
                            onClick={() => handlePlayFromSearch(track, results?.tracks)}
                            className="flex items-center justify-between py-2 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                              <img
                                src={get500x500Image(track.thumbnail || track.image)}
                                alt={track.title}
                                className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                              />
                              <div className="min-w-0 text-left">
                                <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                                  {track.title}
                                </p>
                                <p className="text-xs text-[#8E8E93] line-clamp-1">{track.artist}</p>
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
                </div>

                {/* Artists Row */}
                {results?.artists && results.artists.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Artists</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {results.artists.slice(0, 5).map((artist, idx) => (
                        <div
                          key={artist.id || idx}
                          onClick={() =>
                            navigate(`/artist/${encodeURIComponent(artist.id || artist.name)}`)
                          }
                          className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer text-center group"
                        >
                          <img
                            src={get500x500Image(artist.image || artist.thumbnail)}
                            alt={artist.name}
                            className="w-24 h-24 rounded-full mx-auto object-cover mb-3 group-hover:scale-105 transition-transform"
                          />
                          <p className="font-bold text-sm text-white truncate group-hover:text-white">
                            {artist.name}
                          </p>
                          <p className="text-xs text-[#8E8E93] mt-0.5">Artist</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Albums Row */}
                {results?.albums && results.albums.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Albums</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {results.albums.slice(0, 5).map((album, idx) => (
                        <div
                          key={album.id || idx}
                          onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
                          className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer group"
                        >
                          <img
                            src={get500x500Image(album.image || album.thumbnail)}
                            alt={album.title || album.name}
                            className="w-full aspect-square rounded-xl object-cover mb-3 group-hover:scale-105 transition-transform"
                          />
                          <p className="font-bold text-sm text-white truncate group-hover:text-white">
                            {album.title || album.name}
                          </p>
                          <p className="text-xs text-[#8E8E93] truncate mt-0.5">
                            {album.artist || 'Album'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: SONGS */}
            {activeTab === 'songs' && results?.tracks && (
              <div className="space-y-1">
                {results.tracks.map((track, i) => (
                  <div
                    key={track.videoId || track.id || i}
                    onClick={() => handlePlayFromSearch(track, results.tracks)}
                    className="flex items-center justify-between py-2.5 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <span className="w-5 text-center text-xs font-mono text-[#8E8E93] group-hover:hidden">
                        {i + 1}
                      </span>
                      <Play className="w-4 h-4 text-white hidden group-hover:block ml-0.5" />
                      <img
                        src={get500x500Image(track.thumbnail || track.image)}
                        alt={track.title}
                        className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                          {track.title}
                        </p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#8E8E93]">
                      {track.duration_formatted || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: ARTISTS */}
            {activeTab === 'artists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(results?.artists || []).map((artist, idx) => (
                  <div
                    key={artist.id || idx}
                    onClick={() =>
                      navigate(`/artist/${encodeURIComponent(artist.id || artist.name)}`)
                    }
                    className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer text-center group"
                  >
                    <img
                      src={get500x500Image(artist.image || artist.thumbnail)}
                      alt={artist.name}
                      className="w-28 h-28 rounded-full mx-auto object-cover mb-3 group-hover:scale-105 transition-transform"
                    />
                    <p className="font-bold text-sm text-white truncate group-hover:text-white">
                      {artist.name}
                    </p>
                    <p className="text-xs text-[#8E8E93] mt-0.5">Artist</p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: ALBUMS */}
            {activeTab === 'albums' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(results?.albums || []).map((album, idx) => (
                  <div
                    key={album.id || idx}
                    onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
                    className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <img
                      src={get500x500Image(album.image || album.thumbnail)}
                      alt={album.title || album.name}
                      className="w-full aspect-square rounded-xl object-cover mb-3 group-hover:scale-105 transition-transform"
                    />
                    <p className="font-bold text-sm text-white truncate group-hover:text-white">
                      {album.title || album.name}
                    </p>
                    <p className="text-xs text-[#8E8E93] truncate mt-0.5">
                      {album.artist || 'Album'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: PLAYLISTS */}
            {activeTab === 'playlists' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(results?.playlists || []).map((playlist, idx) => (
                  <div
                    key={playlist.id || idx}
                    onClick={() => navigate(`/playlist/${encodeURIComponent(playlist.id)}`)}
                    className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer group"
                  >
                    <img
                      src={get500x500Image(playlist.image || playlist.thumbnail)}
                      alt={playlist.title || playlist.name}
                      className="w-full aspect-square rounded-xl object-cover mb-3 group-hover:scale-105 transition-transform"
                    />
                    <p className="font-bold text-sm text-white truncate group-hover:text-white">
                      {playlist.title || playlist.name}
                    </p>
                    <p className="text-xs text-[#8E8E93] truncate mt-0.5">
                      {playlist.artist || 'Curated Playlist'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Default View (Empty state) */}
        {!isLoading && !results && !query.trim() && (
          <div className="space-y-8 pb-10">
            {/* Recent Searches */}
            {recentPlayed.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-lg font-bold text-white">Recent Searches</h3>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {recentPlayed.slice(0, 6).map((track, i) => (
                    <div
                      key={track.videoId || track.id || i}
                      onClick={() => handlePlayFromSearch(track, recentPlayed)}
                      className="flex items-center justify-between p-2.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 rounded-xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <img
                          src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                          alt={track.title}
                          className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {track.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1">{track.artist}</p>
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
              <h3 className="text-lg font-bold text-white mb-3 px-1">Trending Searches</h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="px-4 py-2 rounded-full bg-[#141416] hover:bg-white hover:text-black border border-[#222226] text-xs font-semibold text-white/90 transition-all active:scale-95 cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Browse Categories & Genres */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3 px-1">Browse All</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {BROWSE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.label}
                    onClick={() => handleSearch(cat.query)}
                    className="p-5 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 flex flex-col justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <h4 className="font-bold text-base text-white group-hover:text-white tracking-tight">
                        {cat.label}
                      </h4>
                      <p className="text-xs text-[#8E8E93] mt-1">{cat.desc}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#8E8E93] group-hover:text-white mt-6 transition-colors">
                      Explore →
                    </span>
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
