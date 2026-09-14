import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { get500x500Image } from '../utils/media';
import { replenishInfiniteDailyQueue } from '../services/dailyFeedService';
import { ArtistAvatar } from './ArtistAvatar';
import { ArtistLinks } from './ArtistLinks';
import {
  X,
  Heart,
  Play,
  Pause,
  Music2,
  Trash2,
  ListMusic,
  ChevronRight,
} from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const DesktopRightPanel = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentTrack,
    queue,
    setQueue,
    currentIndex,
    isPlaying,
    togglePlay,
    jumpToIndex,
    removeFromQueue,
    clearQueue,
    likedTrackIds,
    toggleLike,
    setIsQueueModalOpen,
    replenishQueue,
  } = usePlayer();

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const videoId = String(currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id || '');
  const isLiked = likedTrackIds.has(videoId);
  const upNextTracks = queue.slice(currentIndex + 1);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      if (replenishQueue && currentTrack) {
        await replenishQueue(currentTrack, 10);
      } else {
        const moreTracks = await replenishInfiniteDailyQueue(user, queue.length);
        if (moreTracks.length > 0) {
          setQueue((prev) => [...prev, ...moreTracks]);
        }
      }
    } catch (e) {
      console.warn('Could not replenish queue:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Artwork helper
  const getArtwork = (t) => {
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

  const scrollContainerRef = useRef(null);
  const trackId = currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id;

  // Auto-scroll to top whenever a new track is selected so artwork is immediately visible
  useEffect(() => {
    if (trackId && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [trackId]);

  return (
    <aside className="w-[300px] xl:w-[330px] 2xl:w-[360px] h-full bg-[#121212] flex flex-col flex-shrink-0 select-none z-20 overflow-hidden">
      {/* Panel Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#121212]/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Music2 className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white truncate">
            Now Playing & Queue
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div ref={scrollContainerRef} className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
        {/* ========================================================================= */}
        {/* TOP SECTION: CURRENTLY PLAYING MUSIC                                       */}
        {/* ========================================================================= */}
        {currentTrack ? (
          <div className="p-4 border-b border-white/5 flex-shrink-0">
            {/* Large Album Artwork */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 group mb-3.5">
              <img
                src={getArtwork(currentTrack)}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Ambient Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

              {/* Live Animated Playing Equalizer Pill */}
              {isPlaying && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-full bg-[#22C55E] rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                    <span className="w-0.5 h-2/3 bg-[#22C55E] rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.2s]" />
                    <span className="w-0.5 h-4/5 bg-[#22C55E] rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.4s]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#22C55E] tracking-tight uppercase">
                    Playing
                  </span>
                </div>
              )}

              {/* Quick Play/Pause overlay button */}
              <button
                onClick={togglePlay}
                className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-[#22C55E] hover:bg-[#20ba58] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-105 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
            </div>

            {/* Track Title, Artist, & Like Button */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white truncate tracking-tight">
                  {currentTrack.title}
                </h4>
                <div className="mt-1">
                  <ArtistLinks
                    track={currentTrack}
                    className="text-xs text-[#8E8E93]"
                    maxDisplay={2}
                    showAvatars={false}
                  />
                </div>
              </div>

              <button
                onClick={() => toggleLike(currentTrack)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                title={isLiked ? 'Remove from favorites' : 'Save to favorites'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                  }`}
                />
              </button>
            </div>

            {/* About Artist Card */}
            {currentTrack.artist && (
              <div
                onClick={() =>
                  navigate(`/artist/${encodeURIComponent(currentTrack.artist || '')}`)
                }
                className="p-3 rounded-xl bg-[#151518] hover:bg-[#1B1B1F] border border-white/5 cursor-pointer transition-colors group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <ArtistAvatar
                    name={currentTrack.artist}
                    size="sm"
                    className="w-9 h-9 border border-white/10 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] block">
                      Artist
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate block mt-0.5">
                      {currentTrack.artist}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <Music2 className="w-7 h-7 text-[#8E8E93]" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">No track playing</h4>
            <p className="text-xs text-[#8E8E93] max-w-[200px]">
              Select a song from Home, Search, or Library to start listening.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: PLAYBACK QUEUE LIST ("Next in Queue")                     */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col min-h-0 p-4">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-[#8E8E93]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Next in Queue
              </h4>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-[#8E8E93]">
                {upNextTracks.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {upNextTracks.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-[11px] font-semibold text-[#8E8E93] hover:text-white transition-colors cursor-pointer px-1.5 py-0.5"
                  title="Clear upcoming queue"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsQueueModalOpen(true)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer px-1.5 py-0.5"
                title="Open expanded queue view"
              >
                Full view
              </button>
            </div>
          </div>

          {/* Up Next List */}
          {upNextTracks.length > 0 ? (
            <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1 pr-1">
              {upNextTracks.map((track, i) => {
                const targetIndex = currentIndex + 1 + i;
                const trackArtwork = getArtwork(track);

                return (
                  <div
                    key={track.videoId || track.id || i}
                    onClick={() => jumpToIndex(targetIndex)}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#141417] hover:bg-[#1A1A1E] border border-white/[0.03] hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Thumbnail with hover play icon */}
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black flex-shrink-0">
                        <img
                          src={trackArtwork}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Track Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-white">
                          {track.title}
                        </p>
                        <div className="mt-0.5">
                          <ArtistLinks
                            track={track}
                            className="text-[10px] text-[#8E8E93]"
                            maxDisplay={2}
                            showAvatars={false}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions on hover & duration */}
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {track.duration > 0 && (
                        <span className="text-[10px] text-[#8E8E93] group-hover:hidden">
                          {formatDuration(track.duration)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(targetIndex);
                        }}
                        className="w-6 h-6 rounded-md hover:bg-white/10 hidden group-hover:flex items-center justify-center text-[#8E8E93] hover:text-rose-400 transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full py-2 mt-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-bold text-[#8E8E93] hover:text-white transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <span>{isLoadingMore ? 'Loading suggestions...' : 'Add recommended tracks'}</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <ListMusic className="w-8 h-8 text-[#3A3A3C] mb-2" />
              <p className="text-xs font-bold text-[#8E8E93] mb-1">Queue is empty</p>
              <p className="text-[11px] text-[#636366] mb-3 max-w-[180px]">
                Add more songs or generate automatic suggestions.
              </p>
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-bold transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-md"
              >
                <span>{isLoadingMore ? 'Loading...' : 'Autoplay Suggestions'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DesktopRightPanel;
