import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  Heart,
  ListMusic,
  History,
  Play,
  Pause,
  Plus,
  X,
  Users,
  Shuffle,
  Music2,
  Clock,
  Share2,
  MoreHorizontal,
  ListPlus,
  Check,
  Download,
} from 'lucide-react';
import {
  getCommunityListeningHistoryFromFirebase,
  getUserHistoryFromFirebase,
} from '../services/firebase';
import { ArtistLinks } from '../components/ArtistLinks';
import { ArtistAvatar } from '../components/ArtistAvatar';
import { PlaylistSheet } from '../components/PlaylistSheet';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'favorites';

  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, togglePlay, likedTrackIds, toggleLike } = usePlayer();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [community, setCommunity] = useState([]);
  const [communityTracks, setCommunityTracks] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [suggestedArtists, setSuggestedArtists] = useState([]);
  const [popularArtists, setPopularArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [selectedPlaylistTrack, setSelectedPlaylistTrack] = useState(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const userId = user?.id || user?.uid || localStorage.getItem('staytup_user_id') || 'guest_user';

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const loadFollowedArtists = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      const userFavs = user?.favoriteArtists || [];
      const combined = [...stored];
      userFavs.forEach((name) => {
        if (
          typeof name === 'string' &&
          !combined.some((a) =>
            typeof a === 'string'
              ? a.toLowerCase() === name.toLowerCase()
              : a.name?.toLowerCase() === name.toLowerCase()
          )
        ) {
          combined.push({ name, image: '', id: '' });
        }
      });
      setFollowedArtists(combined);

      const missing = combined
        .map((a) => (typeof a === 'string' ? a : !a.image ? a.name : null))
        .filter(Boolean);
      if (missing.length > 0) {
        api
          .getBatchArtistImages(missing)
          .then((res) => {
            if (res?.images && Object.keys(res.images).length > 0) {
              setFollowedArtists((prev) =>
                prev.map((a) => {
                  const n = typeof a === 'string' ? a : a.name;
                  if (res.images[n]) {
                    return typeof a === 'string'
                      ? { name: n, image: res.images[n], id: n }
                      : { ...a, image: res.images[n] };
                  }
                  return a;
                })
              );
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      setFollowedArtists([]);
    }
  };

  useEffect(() => {
    loadFollowedArtists();
    const handleUpdate = () => loadFollowedArtists();
    window.addEventListener('staytup_followed_artists_updated', handleUpdate);
    return () => window.removeEventListener('staytup_followed_artists_updated', handleUpdate);
  }, [user?.favoriteArtists]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (activeTab === 'favorites') {
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
            setFavorites(unique);
          }
        })
        .catch((e) => console.warn(e))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else if (activeTab === 'playlists') {
      api
        .getPlaylists(userId)
        .then((res) => {
          if (isMounted) setPlaylists(Array.isArray(res) ? res : res?.playlists || []);
        })
        .catch((e) => console.warn(e))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else if (activeTab === 'community') {
      Promise.all([
        api.getPublicPlaylists().catch(() => []),
        getCommunityListeningHistoryFromFirebase().catch(() => []),
      ])
        .then(([publicPls, cTracks]) => {
          if (isMounted) {
            setCommunity(Array.isArray(publicPls) ? publicPls : []);
            setCommunityTracks(Array.isArray(cTracks) ? cTracks : []);
          }
        })
        .catch((e) => console.warn(e))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else if (activeTab === 'history') {
      const loadHistory = async () => {
        let historyTracks = [];
        let stats = null;

        try {
          const res = await api.getHistory(userId);
          if (res?.recent && Array.isArray(res.recent) && res.recent.length > 0) {
            historyTracks = res.recent;
            stats = res.stats || null;
          }
        } catch (e) {}

        if (historyTracks.length === 0) {
          try {
            const fbHistory = await getUserHistoryFromFirebase(userId);
            if (fbHistory && fbHistory.length > 0) historyTracks = fbHistory;
          } catch (e) {}
        }

        if (historyTracks.length === 0) {
          try {
            const localHist = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
            if (localHist.length > 0) historyTracks = localHist;
          } catch (e) {}
        }

        if (isMounted) {
          const seen = new Set();
          const unique = historyTracks.filter((track) => {
            const id = track?.videoId || track?.video_id || track?.id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          setHistory(unique);
          setHistoryStats(stats || (unique.length > 0 ? { streamCount: unique.length } : null));
          setIsLoading(false);
        }
      };

      loadHistory();
    } else if (activeTab === 'artists') {
      const loadArtistsData = async () => {
        try {
          const toKey = (val) =>
            (typeof val === 'string' ? val : val?.name || '')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .trim();

          // 1. Comprehensive set of followed artists to avoid repeating them anywhere
          const storedFollowed = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
          const userFavs = user?.favoriteArtists || [];
          const allFollowed = [...followedArtists, ...storedFollowed, ...userFavs];
          const followedSet = new Set(allFollowed.map(toKey).filter(Boolean));

          // 2. Extract played / listened artists from recent activity, history, and favorites
          const playedMap = new Map();
          try {
            const recent = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
            recent.forEach((t) => {
              const artistStr = t?.artist || t?.author || '';
              if (artistStr) {
                artistStr.split(/[,&/]|(?:\s+feat\.?\s+)|\s+ft\.?\s+/i).forEach((part) => {
                  const clean = part.trim();
                  const key = toKey(clean);
                  if (clean && key && !followedSet.has(key) && !playedMap.has(key)) {
                    playedMap.set(key, {
                      name: clean,
                      image: t.thumbnail || t.image || '',
                      id: clean,
                    });
                  }
                });
              }
            });
          } catch (e) {}

          try {
            const favRes = await api.getFavorites(userId).catch(() => []);
            const favList = Array.isArray(favRes) ? favRes : favRes?.favorites || [];
            favList.forEach((t) => {
              const artistStr = t?.artist || t?.author || '';
              if (artistStr) {
                artistStr.split(/[,&/]|(?:\s+feat\.?\s+)|\s+ft\.?\s+/i).forEach((part) => {
                  const clean = part.trim();
                  const key = toKey(clean);
                  if (clean && key && !followedSet.has(key) && !playedMap.has(key)) {
                    playedMap.set(key, {
                      name: clean,
                      image: t.thumbnail || t.image || '',
                      id: clean,
                    });
                  }
                });
              }
            });
          } catch (e) {}

          const playedList = Array.from(playedMap.values()).slice(0, 16);
          if (isMounted) {
            setSuggestedArtists(playedList);
          }

          // 3. Fetch app popular artists (based on all user activity)
          const popRes = await api.getPopularArtists('hindi,punjabi,english,tamil', 36).catch(() => ({}));
          const allPop = popRes?.artists || popRes?.results || [];
          const seenPopKeys = new Set();
          const uniquePop = allPop.filter((a) => {
            const key = toKey(a.name || a.title);
            if (!key || followedSet.has(key) || playedMap.has(key) || seenPopKeys.has(key)) {
              return false;
            }
            seenPopKeys.add(key);
            return true;
          });

          if (isMounted) {
            setPopularArtists(uniquePop.slice(0, 18));
          }
        } catch (e) {
          console.warn(e);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      loadArtistsData();
    }

    return () => {
      isMounted = false;
    };
  }, [activeTab, userId, likedTrackIds.size]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setIsCreating(true);
    try {
      const res = await api.createPlaylist({
        user_id: userId,
        name: newPlaylistName.trim(),
        description: 'Created in Staytup',
        tracks: [],
      });
      if (res?.playlist) {
        setPlaylists((prev) => [res.playlist, ...prev]);
        setNewPlaylistName('');
        setShowNewPlaylistModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Header & Tabs */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-2.5 sm:pt-5 sm:pb-3 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <h1 className="hidden sm:block text-2xl sm:text-3xl font-extrabold tracking-tight">My Library</h1>

          {/* Circle Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-1">
            {[
              { id: 'favorites', label: 'Favorites' },
              { id: 'playlists', label: 'Playlists' },
              { id: 'artists', label: 'Artists' },
              { id: 'community', label: 'Community' },
              { id: 'history', label: 'History' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full max-w-7xl mx-auto">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#8E8E93]">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Loading your library...</p>
          </div>
        ) : (
          <>
            {/* TAB: FAVORITES */}
            {activeTab === 'favorites' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Liked Songs Flat Header (Matching media_1789477833587.png) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 pt-2 pb-4 select-none">
                  {/* Square Heart Artwork */}
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-[#450af5] via-[#6e3aff] to-[#9b72cf] flex items-center justify-center shadow-2xl shadow-indigo-950/50 flex-shrink-0 border border-white/10">
                    <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-white fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      Playlist
                    </span>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mt-1 mb-2">
                      Liked Songs
                    </h1>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-neutral-400 font-medium mb-4">
                      <span className="font-semibold text-white">
                        {user?.displayName || user?.username || 'Staytup Listener'}
                      </span>
                      <span>•</span>
                      <span>{favorites.length} {favorites.length === 1 ? 'song' : 'songs'}</span>
                    </div>

                    {/* Pill Action Buttons */}
                    {favorites.length > 0 && (
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                        {/* Play / Pause Pill */}
                        <button
                          onClick={() => {
                            const isFavPlaying = isPlaying && favorites.some(
                              (f) => String(f.videoId || f.id) === String(currentTrack?.videoId || currentTrack?.id)
                            );
                            if (isFavPlaying) {
                              togglePlay();
                            } else {
                              playTrack(favorites[0], favorites);
                            }
                          }}
                          className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                          title={isPlaying && favorites.some((f) => String(f.videoId || f.id) === String(currentTrack?.videoId || currentTrack?.id)) ? 'Pause' : 'Play Liked Songs'}
                        >
                          {isPlaying && favorites.some((f) => String(f.videoId || f.id) === String(currentTrack?.videoId || currentTrack?.id)) ? (
                            <>
                              <Pause className="w-4 h-4 fill-black text-black" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                              <span>Play</span>
                            </>
                          )}
                        </button>

                        {/* Shuffle Pill */}
                        <button
                          onClick={() => {
                            setIsShuffle((prev) => !prev);
                            const shuffled = [...favorites].sort(() => Math.random() - 0.5);
                            playTrack(shuffled[0], shuffled);
                          }}
                          className={`px-4 py-2.5 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer border active:scale-95 ${
                            isShuffle
                              ? 'bg-[#1ED760]/20 text-[#1ED760] border-[#1ED760]/40'
                              : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                          }`}
                          title="Shuffle Liked Songs"
                        >
                          <Shuffle className="w-4 h-4" />
                          <span>Shuffle</span>
                        </button>

                        {/* Share Pill */}
                        <button
                          onClick={async () => {
                            try {
                              if (navigator.share) {
                                await navigator.share({
                                  title: 'Liked Songs on Staytup',
                                  text: `Listen to my Liked Songs collection on Staytup!`,
                                  url: window.location.href,
                                });
                              } else {
                                await navigator.clipboard.writeText(window.location.href);
                                setCopiedToast(true);
                                setTimeout(() => setCopiedToast(false), 2000);
                              }
                            } catch (e) {}
                          }}
                          className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer border border-white/10 active:scale-95"
                          title="Share Liked Songs"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{copiedToast ? 'Copied!' : 'Share'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {favorites.length === 0 ? (
                  <div className="py-16 sm:py-20 text-center text-[#8E8E93]">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-[#8E8E93]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1">Songs you like will appear here</h3>
                    <p className="text-xs text-[#8E8E93] max-w-sm mx-auto mt-1">
                      Save songs by tapping the heart icon anywhere in Staytup to build your favorite music library.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Desktop Table Header (hidden on mobile) */}
                    <div className="hidden sm:grid grid-cols-12 text-xs uppercase font-semibold tracking-wider text-[#8E8E93] pb-2.5 px-3 border-b border-white/[0.08] select-none">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-7">Title</div>
                      <div className="col-span-3">Album</div>
                      <div className="col-span-1 flex justify-end pr-2">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Track Rows (Responsive: clean row layout on mobile, table columns on desktop) */}
                    <div className="divide-y divide-white/[0.03] mt-1">
                      {favorites.map((track, i) => {
                        const vid = String(track.videoId || track.video_id || track.id || '');
                        const isCurrent = (currentTrack?.videoId || currentTrack?.id) === vid;
                        const isCurrentPlaying = isCurrent && isPlaying;
                        const isLiked = likedTrackIds.has(vid);

                        return (
                          <div
                            key={vid || i}
                            onClick={() => playTrack(track, favorites)}
                            className={`flex sm:grid sm:grid-cols-12 items-center justify-between py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl cursor-pointer transition-colors group select-none ${
                              isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                            }`}
                          >
                            {/* Desktop Index / Play Icon */}
                            <div className="hidden sm:flex sm:col-span-1 items-center justify-center">
                              {isCurrentPlaying ? (
                                <div className="flex items-end gap-[2px] h-3.5">
                                  <span className="w-1 h-3.5 bg-[#1ED760] animate-pulse rounded-full" />
                                  <span className="w-1 h-2 bg-[#1ED760] animate-pulse rounded-full delay-75" />
                                  <span className="w-1 h-3 bg-[#1ED760] animate-pulse rounded-full delay-150" />
                                </div>
                              ) : (
                                <>
                                  <span className={`text-xs font-medium tabular-nums ${isCurrent ? 'text-[#1ED760]' : 'text-[#8E8E93]'} group-hover:hidden`}>
                                    {i + 1}
                                  </span>
                                  <Play className="w-4 h-4 text-white fill-white hidden group-hover:block ml-0.5" />
                                </>
                              )}
                            </div>

                            {/* Artwork + Title & Artists */}
                            <div className="flex-1 sm:col-span-7 flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2 sm:pr-3">
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-black flex-shrink-0 shadow-sm">
                                <img
                                  src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                                  alt={track.title}
                                  onError={(e) => {
                                    e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                                  }}
                                  className="w-full h-full object-cover"
                                />
                                {isCurrentPlaying && (
                                  <div className="sm:hidden absolute inset-0 bg-black/40 flex items-center justify-center">
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
                                  className={`font-semibold text-xs sm:text-sm line-clamp-1 tracking-tight ${
                                    isCurrent ? 'text-[#1ED760]' : 'text-white group-hover:text-white'
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                                  <ArtistLinks
                                    track={track}
                                    className="text-[11px] sm:text-xs text-[#8E8E93] hover:text-white"
                                    maxDisplay={2}
                                    showAvatars={false}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Album Name (Desktop only) */}
                            <div className="hidden sm:block sm:col-span-3 text-xs text-[#8E8E93] truncate pr-3 font-normal">
                              {track.album || track.subtitle || 'Single'}
                            </div>

                            {/* Actions & Duration */}
                            <div className="flex sm:col-span-1 items-center justify-end gap-2.5 sm:gap-3 text-xs font-medium tabular-nums text-[#8E8E93] flex-shrink-0">
                              {/* Add to Playlist button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPlaylistTrack(track);
                                  setShowPlaylistSheet(true);
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-white/10 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer"
                                title="Add to Playlist"
                              >
                                <ListPlus className="w-4 h-4" />
                              </button>

                              {/* Heart Toggle */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(track);
                                }}
                                className="text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                                title={isLiked ? 'Unlike' : 'Like'}
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    isLiked ? 'fill-[#1ED760] text-[#1ED760] stroke-[#1ED760]' : 'stroke-current'
                                  }`}
                                />
                              </button>

                              <span className="hidden sm:inline w-10 text-right">
                                {track.duration_formatted || track.duration || ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PLAYLISTS */}
            {activeTab === 'playlists' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Your Playlists</h2>
                    <p className="text-xs text-[#8E8E93]">{playlists.length} playlists</p>
                  </div>
                  <button
                    onClick={() => setShowNewPlaylistModal(true)}
                    className="px-4 py-2 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Playlist</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                  {/* Create Playlist Card */}
                  <div
                    onClick={() => setShowNewPlaylistModal(true)}
                    className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-dashed border-[#28282C] hover:border-white/40 transition-all cursor-pointer flex flex-col items-center justify-center text-center aspect-square group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white text-[#8E8E93] group-hover:text-black flex items-center justify-center mb-3 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-xs text-white">Create Playlist</p>
                  </div>

                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => navigate(`/playlist/${encodeURIComponent(pl.id)}`)}
                      className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer group"
                    >
                      <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-[#24242A] to-[#121214] flex items-center justify-center mb-3 overflow-hidden border border-white/5">
                        {pl.image ? (
                          <img
                            src={get500x500Image(pl.image)}
                            alt={pl.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <ListMusic className="w-10 h-10 text-[#8E8E93] group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <p className="font-bold text-sm text-white truncate group-hover:text-white">
                        {pl.name}
                      </p>
                      <p className="text-xs text-[#8E8E93] truncate mt-0.5">
                        {pl.tracks?.length || pl.song_count || 0} songs
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ARTISTS */}
            {activeTab === 'artists' && (
              <div className="space-y-8">
                {followedArtists.length > 0 && (
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white mb-3">Followed Artists</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                      {followedArtists.map((artist, idx) => {
                        const name = typeof artist === 'string' ? artist : artist.name;
                        const img = typeof artist === 'object' ? artist.image : null;
                        return (
                          <div
                            key={idx}
                            onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                            className="group cursor-pointer flex flex-col items-center text-center select-none py-2 px-1 hover:opacity-90 transition-opacity"
                          >
                            <div className="relative mb-2">
                              <ArtistAvatar
                                name={name}
                                image={img}
                                size="lg"
                                className="w-16 h-16 sm:w-20 sm:h-20 shadow-md group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                                <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                              </div>
                            </div>
                            <p className="font-semibold text-xs sm:text-sm text-white truncate w-full group-hover:text-emerald-400 transition-colors mt-0.5">
                              {name}
                            </p>
                            <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Artist</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUGGESTED FOR YOU (BASED ON PLAYED & SIMILAR ARTISTS) */}
                {suggestedArtists.length > 0 && (
                  <div>
                    <div className="mb-3">
                      <h2 className="text-base sm:text-lg font-bold text-white">Suggested for You</h2>
                      <p className="text-xs text-[#8E8E93] mt-0.5">Based on artists you've listened to and loved</p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                      {suggestedArtists.map((artist, idx) => (
                        <div
                          key={artist.id || idx}
                          onClick={() =>
                            navigate(`/artist/${encodeURIComponent(artist.id || artist.name)}`)
                          }
                          className="group cursor-pointer flex flex-col items-center text-center select-none py-2 px-1 hover:opacity-90 transition-opacity"
                        >
                          <div className="relative mb-2">
                            <ArtistAvatar
                              name={artist.name}
                              image={artist.image || artist.thumbnail}
                              size="lg"
                              className="w-16 h-16 sm:w-20 sm:h-20 shadow-md group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                              <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                            </div>
                          </div>
                          <p className="font-semibold text-xs sm:text-sm text-white truncate w-full group-hover:text-emerald-400 transition-colors mt-0.5">
                            {artist.name}
                          </p>
                          <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Artist</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* POPULAR ARTISTS (GLOBAL / APP TRENDING, ZERO DUPLICATES) */}
                {popularArtists.length > 0 && (
                  <div>
                    <div className="mb-3">
                      <h2 className="text-base sm:text-lg font-bold text-white">Popular Artists</h2>
                      <p className="text-xs text-[#8E8E93] mt-0.5">Top trending artists across Staytup</p>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                      {popularArtists.map((artist, idx) => (
                        <div
                          key={artist.id || idx}
                          onClick={() =>
                            navigate(`/artist/${encodeURIComponent(artist.id || artist.name)}`)
                          }
                          className="group cursor-pointer flex flex-col items-center text-center select-none py-2 px-1 hover:opacity-90 transition-opacity"
                        >
                          <div className="relative mb-2">
                            <ArtistAvatar
                              name={artist.name}
                              image={artist.image || artist.thumbnail}
                              size="lg"
                              className="w-16 h-16 sm:w-20 sm:h-20 shadow-md group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                              <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                            </div>
                          </div>
                          <p className="font-semibold text-xs sm:text-sm text-white truncate w-full group-hover:text-emerald-400 transition-colors mt-0.5">
                            {artist.name}
                          </p>
                          <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">Artist</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: COMMUNITY */}
            {activeTab === 'community' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Community Activity</h2>
                  <p className="text-xs text-[#8E8E93]">Tracks currently trending across listeners</p>
                </div>

                {communityTracks.length > 0 && (
                  <div className="space-y-1">
                    {communityTracks.slice(0, 15).map((track, i) => (
                      <div
                        key={track.videoId || track.id || i}
                        onClick={() => playTrack(track, communityTracks)}
                        className="flex items-center justify-between py-2 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-3">
                          <span className="w-5 text-center text-xs font-medium tabular-nums text-[#8E8E93]">
                            {i + 1}
                          </span>
                          <img
                            src={get500x500Image(track.thumbnail || track.image)}
                            alt={track.title}
                            className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                          />
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                              {track.title}
                            </p>
                            <div className="mt-0.5">
                              <ArtistLinks
                                track={track}
                                className="text-xs text-[#8E8E93]"
                                maxDisplay={2}
                                showAvatars={false}
                              />
                            </div>
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Listening History</h2>
                    {historyStats?.streamCount && (
                      <p className="text-xs text-[#8E8E93]">{historyStats.streamCount} streams</p>
                    )}
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={() => playTrack(history[0], history)}
                      className="px-4 py-2 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Replay All</span>
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="py-16 text-center text-[#8E8E93]">
                    <History className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No history recorded yet</h3>
                    <p className="text-xs text-[#8E8E93]">Your recently played songs will show up here.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {history.map((track, i) => (
                      <div
                        key={track.videoId || track.id || i}
                        onClick={() => playTrack(track, history)}
                        className="flex items-center justify-between py-2 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-3">
                          <img
                            src={get500x500Image(track.thumbnail || track.image)}
                            alt={track.title}
                            className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                          />
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                              {track.title}
                            </p>
                            <div className="mt-0.5">
                              <ArtistLinks
                                track={track}
                                className="text-xs text-[#8E8E93]"
                                maxDisplay={2}
                                showAvatars={false}
                              />
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-medium tabular-nums text-[#8E8E93]">
                          {track.duration_formatted || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Playlist Modal Dialog */}
      {showNewPlaylistModal && (
        <div
          onClick={() => setShowNewPlaylistModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#141416] border border-[#26262A] rounded-2xl p-6 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Create New Playlist</h3>
              <button
                onClick={() => setShowNewPlaylistModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                autoFocus
                className="w-full px-4 py-3 bg-black border border-[#2C2C2E] focus:border-white rounded-xl text-white placeholder-[#8E8E93] text-sm focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#8E8E93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim() || isCreating}
                  className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add To Playlist Sheet */}
      <PlaylistSheet
        track={selectedPlaylistTrack}
        isOpen={showPlaylistSheet}
        onClose={() => {
          setShowPlaylistSheet(false);
          setSelectedPlaylistTrack(null);
        }}
      />
    </div>
  );
}
