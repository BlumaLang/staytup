import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { get500x500Image } from '../utils/media';
import { ArtistLinks } from '../components/ArtistLinks';
import {
  Heart,
  Play,
  Pause,
  Shuffle,
  ArrowDownCircle,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  MoreHorizontal,
  Share2,
  ListPlus,
  Disc3,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { PlaylistSheet } from '../components/PlaylistSheet';

// Spotify Signature Genre & Mood Filter Pills
const MOOD_PILLS = [
  'All',
  'Melancholy',
  'Love',
  'Fast',
  'Romantic',
  'Sad',
  'Hip Hop',
  'Mellow',
  'Soothing',
  'Energetic',
  'Quiet',
  'Soft',
];

// Helper to compute realistic relative date
const getRelativeDateAdded = (track, index) => {
  if (track.addedAt || track.timestamp) {
    const diff = Date.now() - (track.addedAt || track.timestamp);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= 6) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks <= 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  // Deterministic order-based fallback (most recently added at top)
  if (index === 0) return 'Today';
  if (index <= 2) return 'Yesterday';
  if (index <= 5) return '3 days ago';
  if (index <= 12) return '2 weeks ago';
  if (index <= 24) return '3 weeks ago';
  if (index <= 40) return '4 weeks ago';
  return '2 months ago';
};

// Parse duration to seconds
const parseDurationSeconds = (d) => {
  if (typeof d === 'number') return d;
  if (!d || typeof d !== 'string') return 180;
  const parts = d.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 180;
};

// Filter keywords mapping
const MOOD_KEYWORDS = {
  melancholy: ['sad', 'dard', 'judai', 'tanhai', 'broken', 'cry', 'alone', 'tears', 'slow', 'dark'],
  love: ['love', 'ishq', 'dil', 'pyaar', 'humsafar', 'mohabbat', 'jaan', 'forever', 'heart', 'pehla'],
  fast: ['fast', 'upbeat', 'dance', 'party', 'bhangra', 'dhol', 'speed', 'bass', 'remix', 'high'],
  romantic: ['romantic', 'romance', 'ishq', 'pyaar', 'dil', 'love', 'sanware', 'tere', 'saath'],
  sad: ['sad', 'dard', 'rona', 'judai', 'bewafa', 'chhod', 'tanha', 'broken', 'lost', 'tears'],
  'hip hop': ['hip hop', 'rap', 'flow', 'bars', 'aujla', 'moose', 'badshah', 'ikky', 'trap', 'drill'],
  mellow: ['mellow', 'soft', 'cozy', 'chill', 'lofi', 'acoustic', 'slow', 'gentle', 'calm'],
  soothing: ['soothing', 'peace', 'sleep', 'relax', 'healing', 'soul', 'breathe', 'serene'],
  energetic: ['energetic', 'pump', 'gym', 'energy', 'banger', 'hype', 'loud', 'power', 'drop'],
  quiet: ['quiet', 'silent', 'whisper', 'night', 'piano', 'calm', 'gentle', 'minimal'],
  soft: ['soft', 'slowed', 'reverb', 'acoustic', 'unplugged', 'sweet', 'warm'],
};

export default function LikedSongsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    likedTrackIds,
    toggleLike,
    isShuffle,
    setIsShuffle,
  } = usePlayer();

  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMood, setActiveMood] = useState('All');
  const [inPlaylistSearch, setInPlaylistSearch] = useState('');
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'title', 'artist', 'album', 'duration'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(() => {
    return localStorage.getItem('staytup_liked_downloaded') === 'true';
  });

  // Track context actions & modals
  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState(null);
  const [selectedPlaylistTrack, setSelectedPlaylistTrack] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState([]);
  const [isAddSearching, setIsAddSearching] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const pillsContainerRef = useRef(null);

  const userId = user?.id || user?.uid || localStorage.getItem('staytup_user_id') || '';

  // Load Liked Songs with immediate local storage fast-render
  useEffect(() => {
    let isMounted = true;

    // 1. Instantly load cached favorites from localStorage to prevent empty flash
    try {
      const cachedTracks = JSON.parse(localStorage.getItem('staytup_favorites_tracks') || '[]');
      if (cachedTracks.length > 0) {
        setFavorites(cachedTracks);
        setIsLoading(false);
      }
    } catch (e) {}

    // 2. Fetch fresh favorites from backend
    api
      .getFavorites(userId)
      .then((res) => {
        if (isMounted) {
          const raw = Array.isArray(res) ? res : res?.favorites || [];
          const seen = new Set();
          const unique = raw.filter((track) => {
            const id = track?.videoId || track?.video_id || track?.id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });

          if (unique.length > 0) {
            setFavorites(unique);
            try {
              localStorage.setItem('staytup_favorites_tracks', JSON.stringify(unique.slice(0, 100)));
            } catch (e) {}
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[LikedSongs] Load favorites err:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, likedTrackIds.size]);

  // Keep favorites in sync when likedTrackIds changes
  useEffect(() => {
    setFavorites((prev) => {
      if (prev.length === 0) return prev;
      return prev.filter((t) => {
        const vid = String(t.videoId || t.video_id || t.id || '');
        return likedTrackIds.has(vid);
      });
    });
  }, [likedTrackIds]);

  // Calculate total duration (e.g. "11 hr 49 min" or "45 min")
  const totalDurationFormatted = useMemo(() => {
    if (!favorites || favorites.length === 0) return '0 min';
    const totalSeconds = favorites.reduce((acc, t) => acc + parseDurationSeconds(t.duration || t.duration_formatted), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes || 1} min`;
  }, [favorites]);

  // Filter & Sort tracks
  const displayedTracks = useMemo(() => {
    let list = [...favorites];

    // 1. Text Search Filter
    if (inPlaylistSearch.trim()) {
      const q = inPlaylistSearch.toLowerCase().trim();
      list = list.filter((t) => {
        const title = (t.title || '').toLowerCase();
        const artist = (t.artist || t.author || '').toLowerCase();
        const album = (t.album || '').toLowerCase();
        return title.includes(q) || artist.includes(q) || album.includes(q);
      });
    }

    // 2. Mood Pill Filter
    if (activeMood !== 'All') {
      const moodKey = activeMood.toLowerCase();
      const keywords = MOOD_KEYWORDS[moodKey] || [moodKey];
      const filtered = list.filter((t) => {
        const text = `${t.title || ''} ${t.artist || ''} ${t.album || ''} ${t.genre || ''}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw));
      });
      if (filtered.length > 0) {
        list = filtered;
      }
    }

    // 3. Sorting
    if (sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'artist') {
      list.sort((a, b) => (a.artist || a.author || '').localeCompare(b.artist || b.author || ''));
    } else if (sortBy === 'album') {
      list.sort((a, b) => (a.album || '').localeCompare(b.album || ''));
    } else if (sortBy === 'duration') {
      list.sort(
        (a, b) =>
          parseDurationSeconds(b.duration || b.duration_formatted) -
          parseDurationSeconds(a.duration || a.duration_formatted)
      );
    }

    return list;
  }, [favorites, inPlaylistSearch, activeMood, sortBy]);

  // Check if any favorite is currently playing
  const isFavoritesPlaying = useMemo(() => {
    if (!isPlaying || !currentTrack) return false;
    const currentId = String(currentTrack.videoId || currentTrack.video_id || currentTrack.id || '');
    return favorites.some((f) => String(f.videoId || f.video_id || f.id || '') === currentId);
  }, [isPlaying, currentTrack, favorites]);

  // Handle Play/Pause
  const handleTogglePlayLiked = () => {
    if (displayedTracks.length === 0) return;
    if (isFavoritesPlaying) {
      togglePlay();
    } else {
      playTrack(displayedTracks[0], displayedTracks);
    }
  };

  // Handle Shuffle
  const handleShuffleLiked = () => {
    if (displayedTracks.length === 0) return;
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);
    const shuffled = [...displayedTracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  // Handle Download toggle
  const handleToggleDownload = () => {
    const next = !isDownloaded;
    setIsDownloaded(next);
    localStorage.setItem('staytup_liked_downloaded', String(next));
  };

  // Live search for "Add songs" modal
  useEffect(() => {
    if (!showAddSongsModal || !addSearchQuery.trim()) {
      setAddSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAddSearching(true);
      try {
        const res = await api.search(addSearchQuery.trim(), 'songs', 0, 15);
        const tracks = res?.tracks || res?.results || [];
        setAddSearchResults(tracks);
      } catch (err) {
        console.warn('Add songs search error:', err);
      } finally {
        setIsAddSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addSearchQuery, showAddSongsModal]);

  // Scroll pills horizontally
  const scrollPills = (dir) => {
    if (pillsContainerRef.current) {
      pillsContainerRef.current.scrollBy({
        left: dir === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none bg-black">
      {/* ========================================================================= */}
      {/* 1. MOBILE HEADER & HERO (Matching media_1789491501564.jpg)                 */}
      {/* ========================================================================= */}
      <div className="lg:hidden relative w-full bg-gradient-to-b from-[#3a228f] via-[#1c1248]/80 to-black pt-2 pb-3 px-4 flex flex-col">
        {/* Top Back Navigation Arrow */}
        <div className="flex items-center justify-between py-1 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-transform active:scale-95 cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Large Title & Song Count */}
        <div className="mb-4">
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            Liked Songs
          </h1>
          <p className="text-xs text-[#B3B3B3] font-medium mt-1">
            {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
          </p>
        </div>

        {/* Action Row (Overlapping Art + Download on Left | Shuffle + Green Play on Right) */}
        <div className="flex items-center justify-between">
          {/* Left: Overlapping Artwork Fan & Download Button */}
          <div className="flex items-center gap-3.5">
            {/* Overlapping Album Covers Fan */}
            <div className="relative w-11 h-10 flex items-center">
              {favorites[1] ? (
                <img
                  src={get500x500Image(favorites[1].thumbnail || favorites[1].image || favorites[1].artwork_url)}
                  alt="art-bg"
                  className="w-8 h-8 rounded object-cover shadow-md transform -rotate-6 border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-indigo-700/60 shadow-md transform -rotate-6 border border-white/10" />
              )}
              {favorites[0] ? (
                <img
                  src={get500x500Image(favorites[0].thumbnail || favorites[0].image || favorites[0].artwork_url)}
                  alt="art-top"
                  className="w-8 h-8 rounded object-cover shadow-lg transform rotate-6 -ml-4 border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-[#450af5] flex items-center justify-center shadow-lg transform rotate-6 -ml-4 border border-white/10">
                  <Heart className="w-4 h-4 fill-white text-white" />
                </div>
              )}
            </div>

            {/* Download Icon Button */}
            <button
              onClick={handleToggleDownload}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isDownloaded
                  ? 'border-[#1ED760] text-[#1ED760] bg-[#1ED760]/10'
                  : 'border-white/25 text-[#A7A7A7] hover:text-white'
              }`}
              title={isDownloaded ? 'Downloaded' : 'Download for offline'}
            >
              {isDownloaded ? <CheckCircle2 className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: Shuffle Toggle + Big Circular Spotify Green Play Button */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={handleShuffleLiked}
              className={`p-1.5 transition-colors cursor-pointer ${
                isShuffle ? 'text-[#1ED760]' : 'text-[#A7A7A7] hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle enabled' : 'Enable shuffle'}
            >
              <Shuffle className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={handleTogglePlayLiked}
              disabled={displayedTracks.length === 0}
              className="w-13 h-13 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={isFavoritesPlaying ? 'Pause' : 'Play'}
            >
              {isFavoritesPlaying ? (
                <Pause className="w-6 h-6 fill-black text-black" />
              ) : (
                <Play className="w-6 h-6 fill-black text-black ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP HERO BANNER (Matching media_1789491550472.png)                  */}
      {/* ========================================================================= */}
      <div className="hidden lg:block relative w-full bg-gradient-to-b from-[#5038a0] via-[#241757]/80 to-[#121212] px-8 pt-8 pb-6">
        <div className="flex items-end gap-6 max-w-7xl mx-auto">
          {/* Large Heart Cover Art (Square with signature Spotify gradient) */}
          <div className="w-52 h-52 xl:w-56 xl:h-56 rounded-lg bg-gradient-to-br from-[#450af5] via-[#8e8ee5] to-[#c4efd9] flex items-center justify-center shadow-2xl flex-shrink-0 relative overflow-hidden group">
            <Heart className="w-24 h-24 fill-white text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]" />
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 pb-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-white/90">
              Playlist
            </span>
            <h1 className="text-5xl xl:text-7xl font-black text-white tracking-tight leading-none mt-2 mb-4 drop-shadow-md">
              Liked Songs
            </h1>

            <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
              <span className="font-bold text-white hover:underline cursor-pointer">
                {user?.displayName || user?.username || 'Staytup Listener'}
              </span>
              <span>•</span>
              <span className="text-white font-semibold">
                {favorites.length} {favorites.length === 1 ? 'song' : 'songs'}
              </span>
              {favorites.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#B3B3B3]">{totalDurationFormatted}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DESKTOP ACTION BAR (Matching media_1789491550472.png)                   */}
      {/* ========================================================================= */}
      <div className="hidden lg:block w-full bg-[#121212] px-8 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Play, Shuffle, Download, Options */}
          <div className="flex items-center gap-5">
            {/* Big Green Play Button */}
            <button
              onClick={handleTogglePlayLiked}
              disabled={displayedTracks.length === 0}
              className="w-14 h-14 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={isFavoritesPlaying ? 'Pause' : 'Play'}
            >
              {isFavoritesPlaying ? (
                <Pause className="w-7 h-7 fill-black text-black" />
              ) : (
                <Play className="w-7 h-7 fill-black text-black ml-1" />
              )}
            </button>

            {/* Shuffle Button */}
            <button
              onClick={handleShuffleLiked}
              className={`p-2 transition-all cursor-pointer hover:scale-105 ${
                isShuffle ? 'text-[#1ED760]' : 'text-[#B3B3B3] hover:text-white'
              }`}
              title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            >
              <Shuffle className="w-7 h-7 stroke-[2]" />
            </button>

            {/* Download Button */}
            <button
              onClick={handleToggleDownload}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isDownloaded
                  ? 'border-[#1ED760] text-[#1ED760] bg-[#1ED760]/10'
                  : 'border-white/20 text-[#B3B3B3] hover:text-white hover:border-white/40'
              }`}
              title={isDownloaded ? 'Downloaded' : 'Download collection'}
            >
              {isDownloaded ? <CheckCircle2 className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
            </button>

            {/* Share / Toast Button */}
            <button
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({
                      title: 'Liked Songs on Staytup',
                      text: `Check out my Liked Songs on Staytup!`,
                      url: window.location.href,
                    });
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopiedToast(true);
                    setTimeout(() => setCopiedToast(false), 2000);
                  }
                } catch (e) {}
              }}
              className="p-2 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
              title="Share collection"
            >
              <Share2 className="w-5 h-5" />
            </button>
            {copiedToast && (
              <span className="text-xs text-[#1ED760] font-semibold animate-fade-in">Copied link!</span>
            )}
          </div>

          {/* Right: Search Inside Playlist & Sort Dropdown */}
          <div className="flex items-center gap-3">
            {/* Search Toggle */}
            <div className="relative flex items-center">
              {showDesktopSearch ? (
                <div className="flex items-center bg-[#282828] rounded-full px-3 py-1.5 border border-white/10 w-52 transition-all">
                  <Search className="w-4 h-4 text-[#B3B3B3] mr-2 flex-shrink-0" />
                  <input
                    type="text"
                    value={inPlaylistSearch}
                    onChange={(e) => setInPlaylistSearch(e.target.value)}
                    placeholder="Search in playlist"
                    autoFocus
                    className="w-full bg-transparent text-xs text-white placeholder-[#8E8E93] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setInPlaylistSearch('');
                      setShowDesktopSearch(false);
                    }}
                    className="text-[#B3B3B3] hover:text-white ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDesktopSearch(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#B3B3B3] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Search in Liked Songs"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-semibold text-[#B3B3B3] hover:text-white py-1.5 px-3 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                title="Sort options"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="capitalize">
                  {sortBy === 'recent'
                    ? 'Recently added'
                    : sortBy === 'title'
                    ? 'Title'
                    : sortBy === 'artist'
                    ? 'Artist'
                    : sortBy === 'album'
                    ? 'Album'
                    : 'Duration'}
                </span>
              </button>

              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-[#282828] border border-white/10 rounded-xl shadow-2xl p-1.5 z-40 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] px-2.5 py-1">
                    Sort by
                  </p>
                  {[
                    { id: 'recent', label: 'Recently added' },
                    { id: 'title', label: 'Title' },
                    { id: 'artist', label: 'Artist' },
                    { id: 'album', label: 'Album' },
                    { id: 'duration', label: 'Duration' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        sortBy === opt.id
                          ? 'bg-white/15 text-[#1ED760] font-bold'
                          : 'text-[#E0E0E0] hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MOOD & GENRE FILTER PILLS (Matching both screenshots)                   */}
      {/* ========================================================================= */}
      <div className="px-4 lg:px-8 py-2.5 bg-black lg:bg-[#121212] border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto relative flex items-center">
          {/* Scrollable Pills Row */}
          <div
            ref={pillsContainerRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1 pr-8 lg:pr-0"
          >
            {MOOD_PILLS.map((pill) => {
              const isActive = activeMood === pill;
              return (
                <button
                  key={pill}
                  onClick={() => setActiveMood(pill)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 flex-shrink-0 ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-[#242424] text-white hover:bg-[#323232] border border-white/[0.04]'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* Desktop Right Chevron Scroll Button */}
          <button
            onClick={() => scrollPills('right')}
            className="hidden lg:flex w-8 h-8 rounded-full bg-[#242424] hover:bg-[#323232] items-center justify-center text-white shadow-lg transition-transform active:scale-95 ml-2 flex-shrink-0"
            title="Scroll filters"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. "ADD SONGS" ROW (Matching mobile media_1789491501564.jpg)               */}
      {/* ========================================================================= */}
      <div className="px-4 lg:px-8 pt-3 pb-2 bg-black lg:bg-[#121212]">
        <div className="max-w-7xl mx-auto">
          <div
            onClick={() => setShowAddSongsModal(true)}
            className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-lg bg-[#222222] group-hover:bg-[#2e2e2e] border border-white/5 flex items-center justify-center text-white transition-colors shadow-sm flex-shrink-0">
              <Plus className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white group-hover:text-white tracking-tight">
                Add songs
              </p>
              <p className="text-xs text-[#8E8E93]">
                Search and save tracks to your Liked collection
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. TRACK LIST (Mobile Rows & Desktop Table)                                */}
      {/* ========================================================================= */}
      <div className="flex-1 px-3 sm:px-8 py-2 w-full max-w-7xl mx-auto">
        {isLoading && favorites.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#8E8E93]">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Loading your Liked Songs...</p>
          </div>
        ) : displayedTracks.length === 0 ? (
          <div className="py-16 sm:py-24 text-center text-[#8E8E93] max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-[#8E8E93]" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {inPlaylistSearch ? 'No matches found' : 'No liked songs yet'}
            </h3>
            <p className="text-xs text-[#8E8E93] mt-1 mb-5">
              {inPlaylistSearch
                ? `No songs in your Liked Songs match "${inPlaylistSearch}".`
                : 'Tap the heart icon on any song to save it directly to your Liked collection.'}
            </p>
            <button
              onClick={() => setShowAddSongsModal(true)}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-md"
            >
              Add songs now
            </button>
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table Header (hidden on mobile, matching media_1789491550472.png) */}
            <div className="hidden lg:grid grid-cols-12 text-xs uppercase font-semibold tracking-wider text-[#B3B3B3] pb-2.5 px-4 border-b border-white/[0.08] select-none">
              <div className="col-span-1 text-left pl-2">#</div>
              <div className="col-span-5">Title</div>
              <div className="col-span-3">Album</div>
              <div className="col-span-2">Date added</div>
              <div className="col-span-1 flex justify-end pr-3">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Track Rows */}
            <div className="divide-y divide-transparent mt-1 space-y-0.5">
              {displayedTracks.map((track, idx) => {
                const vid = String(track.videoId || track.video_id || track.id || '');
                const isCurrent =
                  (currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id) === vid;
                const isCurrentPlaying = isCurrent && isPlaying;
                const relativeDate = getRelativeDateAdded(track, idx);

                return (
                  <div
                    key={vid || idx}
                    onClick={() => playTrack(track, displayedTracks)}
                    className={`flex lg:grid lg:grid-cols-12 items-center justify-between py-2 px-2.5 lg:px-4 rounded-xl cursor-pointer transition-colors group select-none ${
                      isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Desktop Col 1: Index Number / Play Hover Icon / Animated Equalizer */}
                    <div className="hidden lg:flex lg:col-span-1 items-center text-xs font-medium tabular-nums pl-2">
                      {isCurrentPlaying ? (
                        <div className="flex items-end gap-[2px] h-3.5">
                          <span className="w-1 h-3.5 bg-[#1ED760] animate-pulse rounded-full" />
                          <span className="w-1 h-2 bg-[#1ED760] animate-pulse rounded-full delay-75" />
                          <span className="w-1 h-3 bg-[#1ED760] animate-pulse rounded-full delay-150" />
                        </div>
                      ) : (
                        <>
                          <span
                            className={`group-hover:hidden ${
                              isCurrent ? 'text-[#1ED760] font-bold' : 'text-[#B3B3B3]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <Play className="w-4 h-4 text-white fill-white hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    {/* Col 2: Artwork + Title + Artist */}
                    <div className="flex-1 lg:col-span-5 flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="relative w-11 h-11 lg:w-10 lg:h-10 rounded-md overflow-hidden bg-[#222] flex-shrink-0 shadow-sm">
                        <img
                          src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                          alt={track.title}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-full h-full object-cover"
                        />
                        {isCurrentPlaying && (
                          <div className="lg:hidden absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="flex items-end gap-[2px] h-3">
                              <span className="w-0.5 h-3 bg-[#1ED760] animate-pulse rounded-full" />
                              <span className="w-0.5 h-2 bg-[#1ED760] animate-pulse rounded-full delay-75" />
                              <span className="w-0.5 h-2.5 bg-[#1ED760] animate-pulse rounded-full delay-150" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 text-left flex-1">
                        <p
                          className={`font-semibold text-sm line-clamp-1 tracking-tight ${
                            isCurrent ? 'text-[#1ED760]' : 'text-white group-hover:text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <ArtistLinks
                            track={track}
                            className="text-xs text-[#A7A7A7] hover:text-white transition-colors"
                            maxDisplay={2}
                            showAvatars={false}
                          />
                        </div>
                      </div>

                      {/* Desktop Green Liked Heart Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="hidden lg:block ml-2 text-[#1ED760] hover:scale-110 transition-transform cursor-pointer"
                        title="Remove from Liked Songs"
                      >
                        <Heart className="w-4 h-4 fill-[#1ED760] text-[#1ED760]" />
                      </button>
                    </div>

                    {/* Desktop Col 3: Album Name */}
                    <div
                      onClick={(e) => {
                        if (track.album_id || track.album) {
                          e.stopPropagation();
                          navigate(`/album/${encodeURIComponent(track.album_id || track.album)}`);
                        }
                      }}
                      className="hidden lg:block lg:col-span-3 text-xs text-[#B3B3B3] truncate pr-4 hover:text-white hover:underline cursor-pointer"
                    >
                      {track.album || track.subtitle || track.title}
                    </div>

                    {/* Desktop Col 4: Date Added */}
                    <div className="hidden lg:block lg:col-span-2 text-xs text-[#B3B3B3] truncate">
                      {relativeDate}
                    </div>

                    {/* Col 5: Duration & Action Menu */}
                    <div className="flex lg:col-span-1 items-center justify-end gap-2 text-xs font-medium tabular-nums text-[#B3B3B3] flex-shrink-0">
                      {/* Mobile 3-Dots Menu Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackForMenu(track);
                        }}
                        className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-[#A7A7A7] hover:text-white active:scale-95 cursor-pointer"
                        title="More options"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {/* Desktop Duration */}
                      <span className="hidden lg:inline text-right pr-2">
                        {track.duration_formatted || track.duration || '3:30'}
                      </span>

                      {/* Desktop Hover 3-Dots */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackForMenu(track);
                        }}
                        className="hidden lg:flex w-7 h-7 rounded-full items-center justify-center text-[#B3B3B3] hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="More options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 7. "ADD SONGS" QUICK SEARCH MODAL                                         */}
      {/* ========================================================================= */}
      {showAddSongsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#18181A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#450af5] flex items-center justify-center shadow-md">
                  <Heart className="w-4 h-4 fill-white text-white" />
                </div>
                <h3 className="text-base font-bold text-white">Add to Liked Songs</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddSongsModal(false);
                  setAddSearchQuery('');
                  setAddSearchResults([]);
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-3 bg-[#121214] border-b border-white/5">
              <div className="flex items-center bg-[#242426] rounded-xl px-3 py-2.5 border border-white/10">
                <Search className="w-4 h-4 text-[#8E8E93] mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  placeholder="Search songs, artists, or albums..."
                  autoFocus
                  className="w-full bg-transparent text-sm text-white placeholder-[#8E8E93] focus:outline-none"
                />
                {addSearchQuery && (
                  <button
                    onClick={() => setAddSearchQuery('')}
                    className="text-[#8E8E93] hover:text-white ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-white/[0.04] space-y-1">
              {isAddSearching ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#8E8E93]">
                  <div className="w-6 h-6 border-2 border-[#1ED760] border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs">Searching Staytup catalog...</p>
                </div>
              ) : addSearchResults.length > 0 ? (
                addSearchResults.map((track, i) => {
                  const tid = String(track.videoId || track.video_id || track.id || '');
                  const isTrackLiked = likedTrackIds.has(tid);

                  return (
                    <div
                      key={tid || i}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3 flex-1">
                        <img
                          src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                          alt={track.title}
                          className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                          <p className="text-xs text-[#8E8E93] truncate">{track.artist || track.author}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          toggleLike(track);
                          if (!isTrackLiked) {
                            setFavorites((prev) => [track, ...prev]);
                          }
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isTrackLiked
                            ? 'bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/30'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        title={isTrackLiked ? 'Liked' : 'Add to Liked'}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isTrackLiked ? 'fill-[#1ED760] text-[#1ED760]' : 'stroke-current'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })
              ) : addSearchQuery.trim() ? (
                <div className="py-10 text-center text-[#8E8E93] text-xs">
                  No matching tracks found for "{addSearchQuery}".
                </div>
              ) : (
                <div className="py-10 text-center text-[#8E8E93] text-xs">
                  Type a song name to discover and add tracks to your Liked Songs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TRACK CONTEXT MENU BOTTOM SHEET / MODAL                                 */}
      {/* ========================================================================= */}
      {selectedTrackForMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedTrackForMenu(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#18181A] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up space-y-4"
          >
            {/* Track Info Header */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-white/10">
              <img
                src={get500x500Image(
                  selectedTrackForMenu.thumbnail ||
                    selectedTrackForMenu.image ||
                    selectedTrackForMenu.artwork_url
                )}
                alt={selectedTrackForMenu.title}
                className="w-12 h-12 rounded-lg object-cover shadow-md"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{selectedTrackForMenu.title}</h4>
                <p className="text-xs text-[#8E8E93] truncate">
                  {selectedTrackForMenu.artist || selectedTrackForMenu.author}
                </p>
              </div>
            </div>

            {/* Menu Options */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  playTrack(selectedTrackForMenu, displayedTracks);
                  setSelectedTrackForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play track</span>
              </button>

              <button
                onClick={() => {
                  toggleLike(selectedTrackForMenu);
                  setSelectedTrackForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <Heart className="w-4 h-4 fill-[#1ED760] text-[#1ED760]" />
                <span>Remove from Liked Songs</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPlaylistTrack(selectedTrackForMenu);
                  setShowPlaylistModal(true);
                  setSelectedTrackForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <ListPlus className="w-4 h-4" />
                <span>Add to playlist</span>
              </button>

              {selectedTrackForMenu.album && (
                <button
                  onClick={() => {
                    navigate(`/album/${encodeURIComponent(selectedTrackForMenu.album_id || selectedTrackForMenu.album)}`);
                    setSelectedTrackForMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <Disc3 className="w-4 h-4" />
                  <span>View album</span>
                </button>
              )}

              <button
                onClick={async () => {
                  try {
                    const shareUrl = `${window.location.origin}/song/${
                      selectedTrackForMenu.videoId || selectedTrackForMenu.id
                    }`;
                    if (navigator.share) {
                      await navigator.share({
                        title: selectedTrackForMenu.title,
                        text: `Listen to ${selectedTrackForMenu.title} on Staytup!`,
                        url: shareUrl,
                      });
                    } else {
                      await navigator.clipboard.writeText(shareUrl);
                    }
                  } catch (e) {}
                  setSelectedTrackForMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share song</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Select Sheet */}
      {showPlaylistModal && selectedPlaylistTrack && (
        <PlaylistSheet
          isOpen={showPlaylistModal}
          onClose={() => {
            setShowPlaylistModal(false);
            setSelectedPlaylistTrack(null);
          }}
          track={selectedPlaylistTrack}
        />
      )}
    </div>
  );
}
