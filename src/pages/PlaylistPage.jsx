import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  Play,
  Shuffle,
  Heart,
  Clock,
  ArrowLeft,
  ListMusic,
} from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const playlistId = decodeURIComponent(id || '');

  useEffect(() => {
    if (!playlistId) return;

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        let fetchedPlaylist = null;
        try {
          const res = await api.getPlaylist(playlistId);
          if (res && (res.tracks || res.playlist)) {
            fetchedPlaylist = res.playlist || res;
            if (Array.isArray(res.tracks)) {
              fetchedPlaylist.tracks = res.tracks;
            }
          }
        } catch (err) {
          console.warn('Direct playlist fetch error:', err);
        }

        // Fallback: search playlists if direct ID returned no tracks
        if (!fetchedPlaylist?.tracks || fetchedPlaylist.tracks.length === 0) {
          const searchRes = await api.search(playlistId, 'playlists', 0, 30);
          const searchedTracks = searchRes?.tracks || searchRes?.results || [];
          if (searchedTracks.length > 0) {
            fetchedPlaylist = {
              id: playlistId,
              title: playlistId,
              name: playlistId,
              artist: 'Curated Playlist',
              image: searchedTracks[0].image || searchedTracks[0].thumbnail,
              tracks: searchedTracks,
            };
          }
        }

        if (isMounted && fetchedPlaylist) {
          setPlaylist(fetchedPlaylist);
          setTracks(fetchedPlaylist.tracks || []);
        }
      } catch (e) {
        console.warn('Failed to load playlist:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  const playlistTitle = playlist?.title || playlist?.name || playlistId || 'Playlist';
  const playlistImage = get500x500Image(playlist?.image || playlist?.thumbnail || tracks[0]?.image);

  const handlePlayPlaylist = (startIndex = 0) => {
    if (tracks.length === 0) return;
    playTrack(tracks[startIndex], tracks);
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Top Bar with Back Button */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
          {playlistTitle}
        </span>
        <div className="w-16" />
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#8E8E93]">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Loading playlist...</p>
        </div>
      ) : (
        <div className="flex-1 w-full px-4 sm:px-8 py-6 space-y-8">
          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-[#1C1C1E]">
            <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl bg-gradient-to-br from-[#24242A] to-[#121214] flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl flex-shrink-0">
              {playlistImage ? (
                <img
                  src={playlistImage}
                  alt={playlistTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ListMusic className="w-16 h-16 text-[#8E8E93]" />
              )}
            </div>
            <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                Playlist
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white line-clamp-2">
                {playlistTitle}
              </h1>
              <p className="text-sm text-[#8E8E93]">
                Curated on Staytup • {tracks.length} songs
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                <button
                  onClick={() => handlePlayPlaylist(0)}
                  disabled={tracks.length === 0}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Play</span>
                </button>
                <button
                  onClick={handleShufflePlay}
                  disabled={tracks.length === 0}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tracks Table */}
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#8E8E93] pb-2 px-3 border-b border-[#1C1C1E]">
              <div className="flex items-center gap-4">
                <span className="w-5 text-center">#</span>
                <span>Title</span>
              </div>
              <Clock className="w-4 h-4" />
            </div>

            <div className="divide-y divide-[#1C1C1E]/40 mt-1">
              {tracks.map((track, i) => {
                const vid = String(track.videoId || track.video_id || track.id || '');
                const isCurrent = (currentTrack?.videoId || currentTrack?.id) === vid;
                const isLiked = likedTrackIds.has(vid);

                return (
                  <div
                    key={vid || i}
                    onClick={() => handlePlayPlaylist(i)}
                    className="flex items-center justify-between py-3 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-3">
                      <span className="w-5 text-center text-xs font-mono text-[#8E8E93] group-hover:hidden">
                        {isCurrent && isPlaying ? (
                          <span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block animate-pulse" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <Play className="w-4 h-4 text-white hidden group-hover:block ml-0.5" />
                      <div className="min-w-0 text-left">
                        <p
                          className={`font-semibold text-sm line-clamp-1 group-hover:text-white ${
                            isCurrent ? 'text-[#22C55E]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-[#8E8E93]">
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
                      <span>{formatDuration(track.duration || track.duration_seconds)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
