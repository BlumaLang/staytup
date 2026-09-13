import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { Search, X, TrendingUp, Play, Clock, Sparkles, User, Disc, Music } from 'lucide-react';
import { ArtistSheet } from './ArtistSheet';

export const SearchModal = ({ isOpen, onClose }) => {
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [recentPlayed, setRecentPlayed] = useState([]);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // Auto clear text and previous search state on open for clean UX
    setQuery('');
    setSuggestions([]);
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
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      api.getSuggestions(query)
        .then(res => {
          if (Array.isArray(res.suggestions)) {
            setSuggestions(res.suggestions);
          }
        })
        .catch(() => {});
    }, 200);

    return () => clearTimeout(debounceTimerRef.current);
  }, [query]);

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setQuery(q);
    setSuggestions([]);
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

  const handleSelectSuggestion = (item) => {
    if (typeof item === 'string') {
      handleSearch(item);
      return;
    }

    if (item.type === 'artist') {
      setSelectedArtist({ name: item.title, id: item.id });
      setSuggestions([]);
      return;
    }

    if (item.type === 'song') {
      handleSearch(item.title);
      return;
    }

    handleSearch(item.title || item.name || query);
  };

  const handlePlayFromSearch = (track, trackList) => {
    playTrack(track, trackList);
    // Record to recently played from search
    setRecentPlayed(prev => {
      const filtered = prev.filter(t => (t.videoId || t.id) !== (track.videoId || track.id));
      const updated = [track, ...filtered].slice(0, 15);
      try {
        localStorage.setItem('staytup_search_played', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    onClose();
  };

  if (!isOpen) return null;

  const artistSuggestions = suggestions.filter(s => typeof s === 'object' && s.type === 'artist');
  const otherSuggestions = suggestions.filter(s => !(typeof s === 'object' && s.type === 'artist'));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200">
      {/* Top Search Header — Matching Lyrics Modal Spacing */}
      <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center gap-3">
        <div className="flex-1 relative flex items-center">
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
            placeholder="Search songs, artists, lyrics, mood..."
            autoFocus
            className="w-full pl-11 pr-10 py-2.5 bg-[#121212] border border-[#2C2C2E] rounded-full text-white placeholder-[#8E8E93] text-sm focus:outline-none focus:border-white transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setResults(null);
              }}
              className="absolute right-3.5 text-[#8E8E93] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-sm font-semibold text-[#8E8E93] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
        {/* Autocomplete Suggestions Dropdown with Artists & Songs — Clean Borderless List */}
        {suggestions.length > 0 && !results && (
          <div className="mb-6 space-y-6">
            {/* 1. Artist Suggestions */}
            {artistSuggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
                  Artists
                </h3>
                <div className="space-y-1">
                  {artistSuggestions.map((item, idx) => {
                    const title = item.title;
                    const image = item.image;
                    const extra = item.extra;
                    const hasValidImage = image && !image.includes('artist-default');

                    return (
                      <div
                        key={`artist-sugg-${item.id || idx}`}
                        onClick={() => handleSelectSuggestion(item)}
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors text-sm group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {hasValidImage ? (
                            <img
                              src={get500x500Image(image)}
                              alt={title}
                              className="w-11 h-11 rounded-full object-cover bg-black flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white flex-shrink-0">
                              <User className="w-5 h-5 text-[#8E8E93] group-hover:text-white" />
                            </div>
                          )}

                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                              {title}
                            </p>
                            <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                              {extra || 'Artist'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Songs & Queries Suggestions */}
            {otherSuggestions.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
                  Songs
                </h3>
                <div className="space-y-1">
                  {otherSuggestions.map((item, idx) => {
                    const isSong = typeof item === 'object' && item.type === 'song';
                    const title = typeof item === 'string' ? item : item.title;
                    const image = typeof item === 'object' ? item.image : '';
                    const extra = typeof item === 'object' ? item.extra : '';

                    return (
                      <div
                        key={`other-sugg-${idx}`}
                        onClick={() => handleSelectSuggestion(item)}
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors text-sm group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {image ? (
                            <img
                              src={get500x500Image(image)}
                              alt={title}
                              className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-[#1C1C1E] flex items-center justify-center text-[#8E8E93] flex-shrink-0">
                              <Search className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                              {title}
                            </p>
                            {extra && (
                              <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                                {extra}
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
          </div>
        )}

        {/* Results View */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8E8E93]">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Searching Staytup catalog...</p>
          </div>
        ) : results ? (
          <div className="space-y-7">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 pb-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All' },
                { id: 'tracks', label: 'Songs' },
                { id: 'artists', label: 'Artists' },
                { id: 'albums', label: 'Albums' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-black font-bold'
                      : 'bg-transparent text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Separate Section 1: Artists Results — Clean Circular List / Row, No Cards */}
            {(activeTab === 'all' || activeTab === 'artists') && results.artists?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-3 px-1">
                  Artists
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {results.artists.map((artist, idx) => (
                    <div
                      key={artist.id || idx}
                      onClick={() => setSelectedArtist({ name: artist.name || artist.title, id: artist.id })}
                      className="cursor-pointer flex flex-col items-center text-center group transition-transform active:scale-95"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2 bg-[#121212] group-hover:ring-2 group-hover:ring-white transition-all flex-shrink-0">
                        <img
                          src={get500x500Image(artist.image || artist.thumbnail)}
                          alt={artist.name}
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

            {/* Separate Section 2: Songs Results — Clean Edge-to-Edge List Rows, No Cards */}
            {(activeTab === 'all' || activeTab === 'tracks') && results.tracks?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
                  Songs ({results.tracks.length})
                </h3>
                <div className="divide-y divide-[#1C1C1E]/60">
                  {results.tracks.map((track, i) => (
                    <div
                      key={track.videoId || track.id || i}
                      onClick={() => handlePlayFromSearch(track, results.tracks)}
                      className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <img
                          src={get500x500Image(track.thumbnail || track.image)}
                          alt={track.title}
                          className="w-12 h-12 rounded-xl object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                            {track.title}
                          </p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] group-hover:text-white group-hover:bg-[#1C1C1E] flex-shrink-0 transition-colors">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Separate Section 3: Albums Results — Clean Borderless Row/Grid */}
            {(activeTab === 'all' || activeTab === 'albums') && results.albums?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-3 px-1">
                  Albums
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {results.albums.map((album, idx) => (
                    <div
                      key={album.id || idx}
                      onClick={() => handleSearch(`album:"${album.title || album.name}"`)}
                      className="cursor-pointer flex items-center gap-3 p-2 hover:bg-[#121212] rounded-xl transition-colors group"
                    >
                      <img
                        src={get500x500Image(album.image || album.thumbnail)}
                        alt={album.title}
                        className="w-14 h-14 rounded-xl object-cover bg-black flex-shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <span className="font-bold text-xs text-white line-clamp-1 group-hover:text-white">
                          {album.title || album.name}
                        </span>
                        <span className="text-[11px] text-[#8E8E93] mt-0.5 block">Album</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Recently Played from Search (if any) — Clean Borderless List */}
            {recentPlayed.length > 0 ? (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span>Recent Searches</span>
                  </h3>
                  <button
                    onClick={() => {
                      localStorage.removeItem('staytup_search_played');
                      setRecentPlayed([]);
                    }}
                    className="text-xs text-[#8E8E93] hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="divide-y divide-[#1C1C1E]/60">
                  {recentPlayed.slice(0, 8).map((track, i) => (
                    <div
                      key={track.videoId || track.id || i}
                      onClick={() => handlePlayFromSearch(track, recentPlayed)}
                      className="flex items-center justify-between py-2.5 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={get500x500Image(track.thumbnail || track.image)}
                          alt={track.title}
                          className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">{track.title}</p>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">{track.artist}</p>
                        </div>
                      </div>
                      <Play className="w-4 h-4 text-[#8E8E93] group-hover:text-white flex-shrink-0 mr-1 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-28 text-center text-[#8E8E93]">
                <Search className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                <h3 className="text-white font-bold text-base mb-1">Search Staytup Music</h3>
                <p className="text-xs max-w-xs mx-auto">Discover tracks, top artists, albums, and playlists.</p>
              </div>
            )}
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
    </div>
  );
};
