import React, { useState, useEffect } from 'react';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  Heart,
  ListMusic,
  History,
  Radio,
  Play,
  Plus,
  X,
  FolderPlus,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { PlaylistSheet } from './PlaylistSheet';
import { ArtistSheet } from './ArtistSheet';
import { getCommunityListeningHistoryFromFirebase, getUserHistoryFromFirebase } from '../services/firebase';

export const LibraryModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { playTrack, likedTrackIds } = usePlayer();
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [community, setCommunity] = useState([]);
  const [communityTracks, setCommunityTracks] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [suggestedArtists, setSuggestedArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState(null);

  const userId = user?.id || user?.uid || localStorage.getItem('staytup_user_id') || 'guest_user';

  const loadFollowedArtists = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      const userFavs = user?.favoriteArtists || [];
      const combined = [...stored];
      userFavs.forEach(name => {
        if (typeof name === 'string' && !combined.some(a => (typeof a === 'string' ? a.toLowerCase() === name.toLowerCase() : a.name?.toLowerCase() === name.toLowerCase()))) {
          combined.push({ name, image: '', id: '' });
        }
      });
      setFollowedArtists(combined);

      // Hydrate missing images for followed artists
      const missing = combined
        .map(a => (typeof a === 'string' ? a : !a.image ? a.name : null))
        .filter(Boolean);
      if (missing.length > 0) {
        api.getBatchArtistImages(missing).then(res => {
          if (res?.images && Object.keys(res.images).length > 0) {
            setFollowedArtists(prev =>
              prev.map(a => {
                const n = typeof a === 'string' ? a : a.name;
                if (res.images[n]) {
                  return typeof a === 'string' ? { name: n, image: res.images[n], id: n } : { ...a, image: res.images[n] };
                }
                return a;
              })
            );
          }
        }).catch(() => {});
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
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    if (activeTab === 'favorites') {
      api.getFavorites(userId)
        .then(res => {
          if (isMounted) {
            const raw = Array.isArray(res) ? res : (res?.favorites || []);
            const seen = new Set();
            const unique = raw.filter(track => {
              const id = track?.videoId || track?.video_id || track?.id;
              if (!id || seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            setFavorites(unique);
          }
        })
        .catch(e => console.warn(e))
        .finally(() => { if (isMounted) setIsLoading(false); });
    } else if (activeTab === 'playlists') {
      api.getPlaylists(userId)
        .then(res => {
          if (isMounted) setPlaylists(Array.isArray(res) ? res : res?.playlists || []);
        })
        .catch(e => console.warn(e))
        .finally(() => { if (isMounted) setIsLoading(false); });
    } else if (activeTab === 'community') {
      Promise.all([
        api.getPublicPlaylists().catch(() => []),
        getCommunityListeningHistoryFromFirebase().catch(() => [])
      ])
        .then(([publicPls, cTracks]) => {
          if (isMounted) {
            setCommunity(Array.isArray(publicPls) ? publicPls : []);
            setCommunityTracks(Array.isArray(cTracks) ? cTracks : []);
          }
        })
        .catch(e => console.warn(e))
        .finally(() => { if (isMounted) setIsLoading(false); });
    } else if (activeTab === 'history') {
      const loadHistory = async () => {
        let historyTracks = [];
        let stats = null;

        // 1. Try PHP backend
        try {
          const res = await api.getHistory(userId);
          if (res?.recent && Array.isArray(res.recent) && res.recent.length > 0) {
            historyTracks = res.recent;
            stats = res.stats || null;
          }
        } catch (e) {
          console.warn('API getHistory error:', e);
        }

        // 2. Try Firebase Realtime Database
        if (historyTracks.length === 0) {
          try {
            const fbHistory = await getUserHistoryFromFirebase(userId);
            if (fbHistory && fbHistory.length > 0) {
              historyTracks = fbHistory;
            }
          } catch (e) {}
        }

        // 3. Fallback to LocalStorage
        if (historyTracks.length === 0) {
          try {
            const localHist = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
            if (localHist.length > 0) {
              historyTracks = localHist;
            }
          } catch (e) {}
        }

        if (isMounted) {
          const seen = new Set();
          const unique = historyTracks.filter(track => {
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
      api.getPopularArtists('hindi,punjabi,english,tamil', 24)
        .then(res => {
          if (isMounted) {
            const list = res?.artists || res?.results || [];
            setSuggestedArtists(list);
          }
        })
        .catch(e => console.warn('Could not load popular artists:', e))
        .finally(() => { if (isMounted) setIsLoading(false); });
    }

    return () => { isMounted = false; };
  }, [isOpen, activeTab, userId, likedTrackIds.size]);

  // Extract Staytup Community Top Tracks (deduplicated by videoId / id)
  const communityTopPl = Array.isArray(community)
    ? community.find(
        (pl) =>
          pl.id === 'public_pl_community_top' ||
          pl.name?.toLowerCase().includes('community top')
      )
    : null;

  const rawTopTracks =
    communityTopPl?.tracks && communityTopPl.tracks.length > 0
      ? communityTopPl.tracks
      : communityTracks || [];

  const seenCommunityTracks = new Set();
  const communityTopTracks = rawTopTracks.filter((track) => {
    const id = track?.videoId || track?.video_id || track?.id;
    if (!id || seenCommunityTracks.has(id)) return false;
    seenCommunityTracks.add(id);
    return true;
  });

  const otherCommunityPlaylists = (Array.isArray(community) ? community : []).filter(
    (pl) =>
      pl.id !== 'public_pl_community_top' &&
      !pl.name?.toLowerCase().includes('community top')
  );

  // History deduplicated: ensure no song appears twice
  const seenHistoryRender = new Set();
  const displayHistory = history.filter((track) => {
    const id = track?.videoId || track?.video_id || track?.id;
    if (!id || seenHistoryRender.has(id)) return false;
    seenHistoryRender.add(id);
    return true;
  });

  const getCommunityTrackArtwork = (t) => {
    const candidate = [t?.image, t?.thumbnail, t?.artwork_url].find(
      (url) => typeof url === 'string' && url.trim().length > 0 && !url.includes('unsplash.com')
    );
    if (candidate) return get500x500Image(candidate);
    const vid = t?.videoId || t?.video_id || t?.id;
    if (vid && String(vid).length === 11) {
      return `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    }
    return './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 md:absolute md:inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200">
      {/* Header — Close button on left */}
      <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex-shrink-0 bg-black">
        <div className="w-full max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white flex-shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold tracking-tight flex-1">Your Library</h2>
        </div>
      </div>

      {/* Navigation Tabs — Spotify Circle Pill Buttons (No Icons) */}
      <div className="px-4 sm:px-8 pt-2.5 pb-1 bg-black overflow-x-auto no-scrollbar flex-shrink-0">
        <div className="w-full max-w-5xl mx-auto flex items-center gap-2">
          {[
            { id: 'favorites', label: 'Favorites' },
            { id: 'artists', label: 'Artists' },
            { id: 'playlists', label: 'Playlists' },
            { id: 'community', label: 'Community' },
            { id: 'history', label: 'History' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (activeTab !== tab.id) {
                    setIsLoading(true);
                    setActiveTab(tab.id);
                    setSelectedPlaylistTracks(null);
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-[#18181A] hover:bg-[#222226] text-[#8E8E93] hover:text-white border border-[#28282C]'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-3 pb-12 no-scrollbar">
        <div className="w-full max-w-5xl mx-auto">
        {isLoading ? (
          <div className="animate-in fade-in duration-200">
            {/* Favorites Tab Skeleton */}
            {activeTab === 'favorites' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-[#24242A] rounded-md w-32 animate-pulse" />
                  <div className="h-8 bg-[#24242A] rounded-full w-28 animate-pulse" />
                </div>
                <div className="divide-y divide-[#1C1C1E]/60">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3 px-1 sm:px-2 animate-pulse">
                      <div className="flex items-center gap-3.5 min-w-0 pr-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3.5 bg-[#24242A] rounded-md w-3/5" />
                          <div className="h-3 bg-[#1C1C20] rounded-md w-2/5" />
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#1C1C20] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Playlists Tab Skeleton */}
            {activeTab === 'playlists' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-[#24242A] rounded-md w-44 animate-pulse" />
                  <div className="h-8 bg-[#24242A] rounded-full w-20 animate-pulse" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="w-full aspect-square rounded-2xl bg-[#1C1C20] mb-2.5" />
                      <div className="h-3.5 bg-[#24242A] rounded-md w-3/4 mb-1.5" />
                      <div className="h-3 bg-[#1C1C20] rounded-md w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artists Tab Skeleton */}
            {activeTab === 'artists' && (
              <div className="space-y-8">
                <div>
                  <div className="h-4 bg-[#24242A] rounded-md w-36 mb-4 animate-pulse" />
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1C1C20]" />
                        <div className="h-3 bg-[#24242A] rounded-md w-16" />
                        <div className="h-2.5 bg-[#1C1C20] rounded-md w-12" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-[#24242A] rounded-md w-36 animate-pulse" />
                    <div className="h-3 bg-[#1C1C20] rounded-md w-28 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1C1C20]" />
                        <div className="h-3 bg-[#24242A] rounded-md w-16" />
                        <div className="h-2.5 bg-[#1C1C20] rounded-md w-12" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Community Tab Skeleton */}
            {activeTab === 'community' && (
              <div className="space-y-7">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="h-5 bg-[#24242A] rounded-md w-40 animate-pulse" />
                      <div className="h-4 bg-[#24242A] rounded-full w-12 animate-pulse" />
                    </div>
                    <div className="h-7 bg-[#24242A] rounded-full w-24 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="py-2.5 px-3 rounded-2xl flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3.5 min-w-0 pr-3 flex-1">
                          <div className="w-4 h-4 bg-[#24242A] rounded flex-shrink-0" />
                          <div className="w-12 h-12 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3.5 bg-[#24242A] rounded-md w-3/5" />
                            <div className="h-3 bg-[#1C1C20] rounded-md w-2/5" />
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#1C1C20] flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-[#24242A] rounded-md w-48 mb-3 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="p-3.5 bg-[#121214] border border-[#1E1E22] rounded-2xl flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                          <div className="w-12 h-12 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="h-3.5 bg-[#24242A] rounded-md w-3/4" />
                            <div className="h-3 bg-[#1C1C20] rounded-md w-1/2" />
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#1C1C20] flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* History Tab Skeleton */}
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-[#24242A] rounded-md w-36 animate-pulse" />
                  <div className="h-4 bg-[#24242A] rounded-md w-28 animate-pulse" />
                </div>
                <div className="divide-y divide-[#1C1C1E]/60">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3 px-1 sm:px-2 animate-pulse">
                      <div className="flex items-center gap-3.5 min-w-0 pr-3 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-[#1C1C20] flex-shrink-0" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3.5 bg-[#24242A] rounded-md w-3/5" />
                          <div className="h-3 bg-[#1C1C20] rounded-md w-2/5" />
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#1C1C20] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : selectedPlaylistTracks ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedPlaylistTracks(null)}
                className="text-xs font-semibold text-[#8E8E93] hover:text-white"
              >
                ← Back to Playlists
              </button>
              <span className="text-xs text-[#8E8E93]">
                {selectedPlaylistTracks.tracks?.length || 0} tracks
              </span>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#1C1C1E] overflow-hidden flex items-center justify-center">
                {selectedPlaylistTracks.cover_url ? (
                  <img
                    src={get500x500Image(selectedPlaylistTracks.cover_url)}
                    alt={selectedPlaylistTracks.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ListMusic className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedPlaylistTracks.name}</h3>
                <p className="text-xs text-[#8E8E93] mt-1 line-clamp-2">
                  {selectedPlaylistTracks.description || 'Custom playlist'}
                </p>
                {selectedPlaylistTracks.tracks?.length > 0 && (
                  <button
                    onClick={() => {
                      playTrack(selectedPlaylistTracks.tracks[0], selectedPlaylistTracks.tracks);
                      onClose();
                    }}
                    className="mt-3 px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200"
                  >
                    <Play className="w-3 h-3 fill-black" />
                    <span>Play All</span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-[#1C1C1E]/60">
              {selectedPlaylistTracks.tracks?.map((track, idx) => (
                <div
                  key={track.videoId || track.id || idx}
                  onClick={() => {
                    playTrack(track, selectedPlaylistTracks.tracks);
                    onClose();
                  }}
                  className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <img
                      src={get500x500Image(track.thumbnail || track.image)}
                      alt={track.title}
                      className="w-12 h-12 rounded-xl object-cover bg-black flex-shrink-0"
                    />
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-sm text-white line-clamp-1">{track.title}</p>
                      <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">{track.artist}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] flex items-center justify-center transition-colors">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'favorites' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                {favorites.length} Liked Tracks
              </span>
              {favorites.length > 0 && (
                <button
                  onClick={() => {
                    playTrack(favorites[0], favorites);
                    onClose();
                  }}
                  className="px-4 py-1.5 rounded-full bg-white hover:bg-gray-200 text-black text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Play Liked</span>
                </button>
              )}
            </div>

            {favorites.length === 0 ? (
              <div className="py-20 text-center text-[#8E8E93]">
                <Heart className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                <h4 className="text-white font-bold text-base mb-1">No favorites yet</h4>
                <p className="text-xs">Tap the heart icon on any song while doom scrolling.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1C1C1E]/60">
                {favorites.map((track, idx) => (
                  <div
                    key={track.videoId || track.id || idx}
                    onClick={() => {
                      playTrack(track, favorites);
                      onClose();
                    }}
                    className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <img
                        src={get500x500Image(track.thumbnail || track.image)}
                        alt={track.title}
                        className="w-12 h-12 rounded-xl object-cover bg-black flex-shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-sm text-white line-clamp-1">{track.title}</p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">{track.artist}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] flex items-center justify-center transition-colors">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'artists' ? (
          <div className="space-y-8">
            {/* 1. Followed Artists Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                  Followed Artists ({followedArtists.length})
                </span>
              </div>

              {followedArtists.length === 0 ? (
                <div className="py-8 text-center text-[#8E8E93] border border-dashed border-[#2C2C2E] rounded-2xl p-6">
                  <Users className="w-10 h-10 text-[#3C3C3E] mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm mb-1">No artists followed yet</p>
                  <p className="text-xs text-[#8E8E93]">
                    Follow your favorite artists below or from search to easily access them anytime.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {followedArtists.map((artist, idx) => {
                    const name = typeof artist === 'string' ? artist : artist.name;
                    const image = typeof artist === 'object' ? artist.image : '';
                    const id = typeof artist === 'object' ? artist.id : '';

                    return (
                      <div
                        key={id || name || idx}
                        onClick={() => setSelectedArtist({ name, id })}
                        className="cursor-pointer flex flex-col items-center text-center transition-transform active:scale-95 group"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2 bg-[#1C1C1E] group-hover:ring-2 group-hover:ring-white transition-all flex-shrink-0">
                          {image ? (
                            <img
                              src={get500x500Image(image)}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-[#1C1C1E]">
                              <Users className="w-7 h-7 text-[#8E8E93]" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-xs text-white line-clamp-1 group-hover:text-white">
                          {name}
                        </span>
                        <span className="text-[11px] text-[#8E8E93] mt-0.5">
                          Following
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Suggested Artists Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                  Suggested Artists
                </span>
                <span className="text-[11px] text-[#8E8E93]">Popular & Trending</span>
              </div>

              {suggestedArtists.length === 0 ? (
                <div className="py-6 text-center text-[#8E8E93] text-xs">
                  Loading suggestions...
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {suggestedArtists.map((artist, idx) => {
                    const name = artist.name || artist.title || '';
                    const image = artist.image || artist.thumbnail || '';
                    const id = artist.id || name;
                    const isFollowed = followedArtists.some(fa =>
                      (typeof fa === 'string' ? fa.toLowerCase() === name.toLowerCase() : fa.name?.toLowerCase() === name.toLowerCase())
                    );

                    return (
                      <div
                        key={id || idx}
                        onClick={() => setSelectedArtist({ name, id })}
                        className="cursor-pointer flex flex-col items-center text-center transition-transform active:scale-95 group"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-2 bg-[#1C1C1E] group-hover:ring-2 group-hover:ring-white transition-all flex-shrink-0">
                          {image ? (
                            <img
                              src={get500x500Image(image)}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-[#1C1C1E]">
                              <Users className="w-7 h-7 text-[#8E8E93]" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-xs text-white line-clamp-1 group-hover:text-white">
                          {name}
                        </span>
                        <span className={`text-[11px] mt-0.5 ${isFollowed ? 'text-[#8E8E93]' : 'text-white/70'}`}>
                          {isFollowed ? 'Following' : 'Artist'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'playlists' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                Your Created Playlists
              </span>
              <button
                onClick={() => setShowNewPlaylistModal(true)}
                className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-gray-200 text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {playlists.length === 0 ? (
              <div className="py-20 text-center text-[#8E8E93]">
                <FolderPlus className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                <h4 className="text-white font-bold text-base mb-1">Create your first playlist</h4>
                <p className="text-xs max-w-xs mx-auto mb-4">
                  Group your favorite jams together into custom mixtapes.
                </p>
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="px-4 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200"
                >
                  Create Playlist
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPlaylistTracks(pl)}
                    className="cursor-pointer transition-transform active:scale-95 group"
                  >
                    <div className="aspect-square rounded-2xl bg-[#1C1C1E] mb-2 overflow-hidden flex items-center justify-center text-[#8E8E93] group-hover:ring-2 group-hover:ring-white transition-all">
                      {pl.cover_url ? (
                        <img src={get500x500Image(pl.cover_url)} alt={pl.name} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-white">{pl.name}</h4>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">
                      {pl.track_count || pl.tracks?.length || 0} tracks
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'community' ? (
          <div className="space-y-7">
            {/* Staytup Community Top Tracks Section */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Staytup Community
                  </h3>
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    Live
                  </span>
                </div>
                {communityTopTracks.length > 0 && (
                  <button
                    onClick={() => {
                      playTrack(communityTopTracks[0], communityTopTracks);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-200 text-black text-xs font-bold shadow-md transition-all active:scale-95 flex-shrink-0 cursor-pointer"
                    title="Play All Community Tracks"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Play All</span>
                  </button>
                )}
              </div>

              {communityTopTracks.length === 0 ? (
                <div className="py-12 text-center text-[#8E8E93] text-xs">
                  <Radio className="w-8 h-8 text-[#2C2C2E] mx-auto mb-2" />
                  No community tracks recorded yet. Play any song to broadcast to the community!
                </div>
              ) : (
                <div className="space-y-1">
                  {communityTopTracks.map((track, idx) => (
                    <div
                      key={track.videoId || track.video_id || track.id || idx}
                      onClick={() => {
                        playTrack(track, communityTopTracks);
                        onClose();
                      }}
                      className="py-2 px-2 sm:px-2.5 hover:bg-[#1C1C1E] active:bg-[#2C2C2E] rounded-2xl cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <span
                          className={`w-4 text-center text-xs font-bold tabular-nums flex-shrink-0 ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                              ? 'text-slate-300'
                              : idx === 2
                              ? 'text-amber-600'
                              : 'text-[#8E8E93]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1C1C1E] flex-shrink-0 border border-[#2C2C2E] relative group-hover:border-white/20 transition-colors">
                          <img
                            src={getCommunityTrackArtwork(track)}
                            alt={track.title}
                            onError={(e) => {
                              e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-semibold text-sm text-white group-hover:text-white line-clamp-1">
                            {track.title}
                          </h4>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5 font-medium">
                            {track.artist || track.subtitle || 'Staytup Community'}
                          </p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white text-[#8E8E93] group-hover:text-black flex items-center justify-center flex-shrink-0 transition-all shadow-sm">
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Other Public Mixtapes & Stations (if any) */}
            {otherCommunityPlaylists.length > 0 && (
              <div>
                <div className="mb-3 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                    Community Mixtapes & Stations
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {otherCommunityPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => {
                        if (pl.tracks?.length > 0) {
                          playTrack(pl.tracks[0], pl.tracks);
                          onClose();
                        }
                      }}
                      className="p-3.5 bg-[#121214] hover:bg-[#1A1A1E] border border-[#1E1E22] hover:border-white/15 rounded-2xl cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <div className="w-12 h-12 rounded-xl bg-[#1C1C1E] overflow-hidden flex items-center justify-center text-[#8E8E93] flex-shrink-0">
                          {pl.cover_url ? (
                            <img src={get500x500Image(pl.cover_url)} alt={pl.name} className="w-full h-full object-cover" />
                          ) : (
                            <Radio className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-semibold text-sm text-white group-hover:text-white line-clamp-1">{pl.name}</h4>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">{pl.description}</p>
                          <span className="text-[11px] text-[#8E8E93] font-medium mt-0.5 inline-block">
                            {pl.track_count || pl.tracks?.length || 0} Tracks
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white text-[#8E8E93] group-hover:text-black flex items-center justify-center flex-shrink-0 transition-colors">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                Recently Played
              </span>
              {historyStats && (
                <span className="text-xs font-semibold text-white">
                  {historyStats.streamCount || 0} Total Streams
                </span>
              )}
            </div>

            {displayHistory.length === 0 ? (
              <div className="py-20 text-center text-[#8E8E93]">
                <History className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                <h4 className="text-white font-bold text-base mb-1">No playback history</h4>
                <p className="text-xs">Songs you listen to will appear here automatically.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1C1C1E]/60">
                {displayHistory.map((track, idx) => (
                  <div
                    key={track.videoId || track.video_id || track.id || idx}
                    onClick={() => {
                      playTrack(track, displayHistory);
                      onClose();
                    }}
                    className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <img
                        src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                        alt={track.title}
                        className="w-12 h-12 rounded-xl object-cover bg-black flex-shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">{track.title}</p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">{track.artist}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] flex items-center justify-center flex-shrink-0 transition-colors">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      <PlaylistSheet
        isOpen={showNewPlaylistModal}
        onClose={() => setShowNewPlaylistModal(false)}
      />

      {/* Artist Sheet */}
      {selectedArtist && (
        <ArtistSheet
          artistName={selectedArtist.name}
          artistId={selectedArtist.id}
          isOpen={!!selectedArtist}
          onClose={() => setSelectedArtist(null)}
        />
      )}
    </div>
  );
};
