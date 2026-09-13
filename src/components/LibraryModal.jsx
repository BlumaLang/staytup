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
} from 'lucide-react';
import { PlaylistSheet } from './PlaylistSheet';
import { ArtistSheet } from './ArtistSheet';
import { getCommunityListeningHistoryFromFirebase } from '../services/firebase';

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

  const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';

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
      api.getHistory(userId)
        .then(res => {
          if (isMounted) {
            const rawRecent = res?.recent || [];
            const seen = new Set();
            const uniqueRecent = rawRecent.filter(track => {
              const id = track?.videoId || track?.video_id || track?.id;
              if (!id || seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            setHistory(uniqueRecent);
            setHistoryStats(res?.stats || null);
          }
        })
        .catch(e => console.warn(e))
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200">
      {/* Header — Matching Lyrics Modal Spacing */}
      <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Your Library</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1C1C1E] px-6 bg-black overflow-x-auto no-scrollbar">
        {[
          { id: 'favorites', label: 'Favorites', icon: Heart },
          { id: 'artists', label: 'Artists', icon: Users },
          { id: 'playlists', label: 'Playlists', icon: ListMusic },
          { id: 'community', label: 'Community', icon: Radio },
          { id: 'history', label: 'History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedPlaylistTracks(null);
              }}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-[#8E8E93] hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8E8E93]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8E8E93]">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading library...</p>
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
          <div className="space-y-8">
            {/* Staytup Community Top Tracks Section */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                      Staytup Community Top Tracks
                    </span>
                    <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 whitespace-nowrap">
                      Live Trending
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8E93] mt-0.5 truncate">
                    Most played and loved tracks across the Staytup community.
                  </p>
                </div>
                {communityTopTracks.length > 0 && (
                  <button
                    onClick={() => {
                      playTrack(communityTopTracks[0], communityTopTracks);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-gray-100 text-black text-xs font-bold shadow-md transition-all active:scale-95 flex-shrink-0 whitespace-nowrap cursor-pointer"
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
                <div className="divide-y divide-[#1C1C1E]/60">
                  {communityTopTracks.map((track, idx) => (
                    <div
                      key={track.videoId || track.video_id || track.id || idx}
                      onClick={() => {
                        playTrack(track, communityTopTracks);
                        onClose();
                      }}
                      className="py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <span className="w-4 text-center text-xs font-mono text-[#8E8E93] group-hover:text-white flex-shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={get500x500Image(track.thumbnail || track.image || track.artwork_url)}
                          alt={track.title}
                          className="w-12 h-12 rounded-xl object-cover bg-black flex-shrink-0 border border-[#2C2C2E]"
                        />
                        <div className="min-w-0 text-left">
                          <h4 className="font-semibold text-sm text-white group-hover:text-white line-clamp-1">
                            {track.title}
                          </h4>
                          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                            {track.artist || track.subtitle || 'Unknown Artist'}
                          </p>
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

            {/* Other Public Mixtapes & Stations (if any) */}
            {otherCommunityPlaylists.length > 0 && (
              <div>
                <div className="mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                    Community Mixtapes & Stations
                  </span>
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Curated mixes and shared playlists from the community.
                  </p>
                </div>

                <div className="divide-y divide-[#1C1C1E]/60">
                  {otherCommunityPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => {
                        if (pl.tracks?.length > 0) {
                          playTrack(pl.tracks[0], pl.tracks);
                          onClose();
                        }
                      }}
                      className="py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-all flex items-center justify-between group"
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
                      <div className="w-8 h-8 rounded-full text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] flex items-center justify-center flex-shrink-0 transition-colors">
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
