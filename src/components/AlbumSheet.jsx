import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { X, Play, Shuffle, Heart, Disc3, Clock } from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AlbumSheet = ({ albumId, albumName, initialData, isPlaylist = false, isOpen, onClose }) => {
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();
  const [album, setAlbum] = useState(initialData || null);
  const [tracks, setTracks] = useState(initialData?.tracks || []);
  const [isLoading, setIsLoading] = useState(false);

  const isPlaylistType = isPlaylist || album?.type === 'playlist' || initialData?.type === 'playlist';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const loadAlbumData = async () => {
      try {
        let fetchedAlbum = null;
        const isPl = isPlaylist || initialData?.type === 'playlist';

        if (albumId) {
          try {
            const res = isPl ? await api.getPlaylist(albumId) : await api.getAlbum(albumId);
            if (res && (res.tracks || res.album || res.playlist)) {
              fetchedAlbum = res.album || res.playlist || res;
              if (Array.isArray(res.tracks)) {
                fetchedAlbum.tracks = res.tracks;
              }
            }
          } catch (fetchErr) {
            console.warn('Direct fetch error:', fetchErr);
          }
        }

        // Fallback: If no tracks from direct ID, search by query name
        const q = albumName || fetchedAlbum?.title || fetchedAlbum?.name;
        if ((!fetchedAlbum?.tracks || fetchedAlbum.tracks.length === 0) && q) {
          const searchType = isPl ? 'playlists' : 'songs';
          const searchRes = await api.search(isPl ? q : `album:"${q}"`, searchType, 0, 30);
          const searchedTracks = searchRes?.tracks || searchRes?.results || [];
          if (searchedTracks.length > 0) {
            if (!fetchedAlbum) {
              fetchedAlbum = {
                id: albumId || searchedTracks[0].albumId || 'collection_' + Math.random().toString(36).substr(2, 9),
                title: q,
                name: q,
                artist: searchedTracks[0].artist || (isPl ? 'Playlist' : ''),
                image: searchedTracks[0].image || searchedTracks[0].thumbnail,
                thumbnail: searchedTracks[0].thumbnail || searchedTracks[0].image,
                year: searchedTracks[0].year || '',
                song_count: searchedTracks.length,
                type: isPl ? 'playlist' : 'album',
              };
            }
            fetchedAlbum.tracks = searchedTracks;
          }
        }

        if (isMounted && fetchedAlbum) {
          setAlbum(fetchedAlbum);
          setTracks(fetchedAlbum.tracks || []);
        }
      } catch (err) {
        console.warn('Failed to load collection details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAlbumData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, albumId, albumName, isPlaylist, initialData?.type]);

  if (!isOpen) return null;

  const albumTitle = album?.title || album?.name || albumName || (isPlaylistType ? 'Playlist' : 'Album');
  const albumArtist = album?.artist || album?.description || (tracks[0]?.artist) || (isPlaylistType ? 'Curated Playlist' : 'Various Artists');
  const albumImage = get500x500Image(album?.image || album?.thumbnail || tracks[0]?.image || tracks[0]?.thumbnail);
  const albumYear = album?.year || tracks[0]?.year || '';
  const trackCount = tracks.length || album?.song_count || album?.track_count || 0;

  const handlePlayAlbum = (startIndex = 0) => {
    if (tracks.length === 0) return;
    playTrack(tracks[startIndex], tracks);
  };

  const handleShuffleAlbum = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col bg-black text-white animate-in slide-in-from-bottom duration-300 select-none overflow-hidden">
      {/* Blurred Album Artwork Background — Exactly like Home page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src={albumImage}
          alt=""
          aria-hidden="true"
          onError={(e) => {
            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
          }}
          className="w-full h-full object-cover blur-3xl scale-125 opacity-35 transition-opacity duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85 pointer-events-none" />
      </div>

      {/* Floating Top Header Bar — Gradient moves through the header seamlessly, matching Home page */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 pt-3 sm:pt-4 pb-3 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/70 via-black/20 to-transparent">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 shadow-lg">
          <span className="text-xs font-bold text-white tracking-wide">
            {isPlaylistType ? 'Playlist' : 'Album'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto w-8 h-8 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-xl border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 pt-14 sm:pt-16 pb-28 no-scrollbar max-w-2xl mx-auto w-full">
        {/* Album Hero Artwork & Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6 pt-2 pb-6 text-center sm:text-left">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl bg-[#121214] border border-white/10 flex-shrink-0 relative group">
            <img
              src={albumImage}
              alt={albumTitle}
              onError={(e) => {
                e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/80 px-2.5 py-0.5 rounded-full mb-2">
              {isPlaylistType ? 'Playlist' : 'Album'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight line-clamp-2 leading-tight">
              {albumTitle}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-[#8E8E93] mt-1 line-clamp-1">
              {albumArtist}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-[#8E8E93]/80 mt-2 font-medium">
              {albumYear && <span>{albumYear}</span>}
              {albumYear && trackCount > 0 && <span>•</span>}
              {trackCount > 0 && <span>{trackCount} {trackCount === 1 ? 'Song' : 'Songs'}</span>}
            </div>
          </div>
        </div>

        {/* Action Controls: Play & Shuffle */}
        <div className="flex items-center gap-3 py-2 mb-4">
          <button
            onClick={() => handlePlayAlbum(0)}
            disabled={tracks.length === 0}
            className="flex-1 py-3 px-6 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>{isPlaylistType ? 'Play Playlist' : 'Play Album'}</span>
          </button>
          <button
            onClick={handleShuffleAlbum}
            disabled={tracks.length === 0}
            className="py-3 px-5 rounded-full bg-[#161618] hover:bg-[#202024] border border-[#2A2A2E] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>

        {/* Tracklist */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-2 text-xs font-bold uppercase tracking-wider text-[#8E8E93] border-b border-[#1C1C1E]">
            <div className="flex items-center gap-3">
              <span className="w-5 text-center">#</span>
              <span>Title</span>
            </div>
            <div className="flex items-center gap-6 mr-2">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          {isLoading && tracks.length === 0 ? (
            <div className="space-y-2 py-2 animate-in fade-in duration-150">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-2 bg-[#121214] rounded-xl animate-pulse">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-5 h-3 bg-[#1C1C20] rounded flex-shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-xs">
                      <div className="h-3.5 bg-[#24242A] rounded w-3/4" />
                      <div className="h-3 bg-[#1C1C20] rounded w-1/2" />
                    </div>
                  </div>
                  <div className="w-10 h-3 bg-[#1C1C20] rounded flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-12 text-center text-[#8E8E93] text-xs">
              No tracks found for this album.
            </div>
          ) : (
            <div className="divide-y divide-[#18181A]">
              {tracks.map((track, i) => {
                const trackId = String(track.videoId || track.video_id || track.id || '');
                const currentPlayingId = String(currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id || '');
                const isCurrentPlaying = currentPlayingId === trackId;
                const isLiked = likedTrackIds.has(trackId);

                return (
                  <div
                    key={trackId || i}
                    onClick={() => handlePlayAlbum(i)}
                    className={`flex items-center justify-between py-2.5 px-2 rounded-xl cursor-pointer transition-colors group ${
                      isCurrentPlaying ? 'bg-white/10' : 'hover:bg-[#121214]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="w-5 text-center text-xs font-bold text-[#8E8E93] flex-shrink-0 group-hover:text-white">
                        {isCurrentPlaying && isPlaying ? (
                          <span className="text-[#2563EB] animate-pulse">▶</span>
                        ) : (
                          i + 1
                        )}
                      </span>

                      <div className="min-w-0 text-left">
                        <p className={`font-semibold text-sm line-clamp-1 ${
                          isCurrentPlaying ? 'text-[#2563EB]' : 'text-white group-hover:text-white'
                        }`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                        title={isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isLiked
                              ? 'fill-[#22C55E] stroke-[#22C55E]'
                              : 'stroke-[#8E8E93] hover:stroke-white'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-mono text-[#8E8E93] min-w-[36px] text-right">
                        {formatDuration(track.duration || track.duration_seconds)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
