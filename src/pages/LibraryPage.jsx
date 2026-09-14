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
  Plus,
  X,
  Users,
  Shuffle,
  Music2,
} from 'lucide-react';
import {
  getCommunityListeningHistoryFromFirebase,
  getUserHistoryFromFirebase,
} from '../services/firebase';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'favorites';

  const { user } = useAuth();
  const { playTrack, likedTrackIds } = usePlayer();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [community, setCommunity] = useState([]);
  const [communityTracks, setCommunityTracks] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [suggestedArtists, setSuggestedArtists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
      api
        .getPopularArtists('hindi,punjabi,english,tamil', 24)
        .then((res) => {
          if (isMounted) {
            setSuggestedArtists(res?.artists || res?.results || []);
          }
        })
        .catch((e) => console.warn(e))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
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
      <div className="sticky top-0 z-20 px-4 sm:px-8 pt-5 pb-3 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Library</h1>

          {/* Circle Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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
              <div className="space-y-6">
                {/* Spotify-Style Hero Banner for Liked Songs */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4f22b3] via-[#2d1264] to-[#121214] p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl border border-white/10">
                  <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-[#501fe0] via-[#855bf0] to-[#c3ecdc] flex items-center justify-center shadow-2xl shadow-indigo-900/60 flex-shrink-0">
                    <Heart className="w-14 h-14 sm:w-20 sm:h-20 text-white fill-white drop-shadow-md" />
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-300">
                      Playlist
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-1 mb-2 truncate">
                      Liked Songs
                    </h1>
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-[#D1D5DB] flex-wrap">
                      <span className="font-bold text-white">
                        {user?.username || 'Staytup Listener'}
                      </span>
                      <span>•</span>
                      <span>{favorites.length} {favorites.length === 1 ? 'song' : 'songs'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                {favorites.length > 0 && (
                  <div className="flex items-center gap-4 py-1">
                    <button
                      onClick={() => playTrack(favorites[0], favorites)}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-xl shadow-emerald-600/30 transition-all cursor-pointer"
                      title="Play All"
                    >
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    </button>
                  </div>
                )}

                {favorites.length === 0 ? (
                  <div className="py-16 text-center text-[#8E8E93]">
                    <Heart className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No liked songs yet</h3>
                    <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
                      Songs you love will appear here. Tap the heart button while listening!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {favorites.map((track, i) => (
                      <div
                        key={track.videoId || track.id || i}
                        onClick={() => playTrack(track, favorites)}
                        className="flex items-center justify-between py-2 px-3 hover:bg-white/[0.08] rounded-xl cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-3">
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
                    <h2 className="text-lg font-bold text-white mb-4">Followed Artists</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {followedArtists.map((artist, idx) => {
                        const name = typeof artist === 'string' ? artist : artist.name;
                        const img = typeof artist === 'object' ? artist.image : null;
                        return (
                          <div
                            key={idx}
                            onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                            className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer text-center group"
                          >
                            <img
                              src={get500x500Image(img)}
                              alt={name}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto object-cover mb-3 group-hover:scale-105 transition-transform"
                            />
                            <p className="font-bold text-xs sm:text-sm text-white truncate">
                              {name}
                            </p>
                            <p className="text-[11px] text-[#8E8E93] mt-0.5">Artist</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {suggestedArtists.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-white mb-4">Popular Artists</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {suggestedArtists.map((artist, idx) => (
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
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto object-cover mb-3 group-hover:scale-105 transition-transform"
                          />
                          <p className="font-bold text-xs sm:text-sm text-white truncate">
                            {artist.name}
                          </p>
                          <p className="text-[11px] text-[#8E8E93] mt-0.5">Artist</p>
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
                          <span className="w-5 text-center text-xs font-mono text-[#8E8E93]">
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
                            <p className="text-xs text-[#8E8E93] line-clamp-1">{track.artist}</p>
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
    </div>
  );
}
