import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { get500x500Image } from '../utils/media';
import { replenishInfiniteDailyQueue } from '../services/dailyFeedService';
import {
  X,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const QueueModal = () => {
  const {
    queue,
    setQueue,
    currentIndex,
    currentTrack,
    isPlaying,
    togglePlay,
    jumpToIndex,
    nextTrack,
    prevTrack,
    removeFromQueue,
    clearQueue,
    isQueueModalOpen,
    setIsQueueModalOpen,
  } = usePlayer();

  const { user } = useAuth();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  if (!isQueueModalOpen) return null;

  const nowPlaying = currentTrack || queue[currentIndex] || null;
  const upNextTracks = queue.slice(currentIndex + 1);

  const handleLoadMoreToQueue = async () => {
    setIsLoadingMore(true);
    try {
      const moreTracks = await replenishInfiniteDailyQueue(user, queue.length);
      if (moreTracks.length > 0) {
        setQueue((prev) => [...prev, ...moreTracks]);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const formatDuration = (secs) => {
    if (!secs || isNaN(secs)) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col bg-black text-white animate-in slide-in-from-bottom duration-300 select-none overflow-hidden">
      {/* Top Header — Clean, Cardless, X Close Icon (No drum/music icon) */}
      <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center justify-between bg-black z-10 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Playback Queue
          </h2>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            {queue.length} Tracks in Queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <button
              onClick={clearQueue}
              className="px-3 py-1.5 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setIsQueueModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Full-Width Scrollable Queue (No bounded cards, No bottom safe-area padding) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 no-scrollbar w-full space-y-6 pb-4">
        {/* 1. Now Playing Section — Clean Cardless Row with Up/Down Track Change Controls */}
        {nowPlaying && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-1">
              Now Playing
            </h3>
            <div className="flex items-center justify-between py-2.5 px-2 rounded-xl bg-white/[0.04] transition-colors">
              <div className="flex items-center gap-3.5 min-w-0 pr-2">
                <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black flex-shrink-0">
                  <img
                    src={get500x500Image(
                      nowPlaying.thumbnail ||
                        nowPlaying.image ||
                        nowPlaying.artwork_url
                    )}
                    alt={nowPlaying.title}
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                      <div className="w-1 h-3.5 bg-white animate-pulse" />
                      <div className="w-1 h-5 bg-white animate-pulse delay-75" />
                      <div className="w-1 h-2.5 bg-white animate-pulse delay-150" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 text-left">
                  <h4 className="font-bold text-sm sm:text-base text-white line-clamp-1">
                    {nowPlaying.title}
                  </h4>
                  <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                    {nowPlaying.artist}
                  </p>
                </div>
              </div>

              {/* Up Arrow, Play/Pause, Down Arrow Track Changers */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={prevTrack}
                  disabled={currentIndex <= 0}
                  className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] disabled:opacity-25 disabled:hover:bg-[#121212] flex items-center justify-center text-white transition-colors"
                  title="Previous track"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={nextTrack}
                  disabled={currentIndex >= queue.length - 1}
                  className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] disabled:opacity-25 disabled:hover:bg-[#121212] flex items-center justify-center text-white transition-colors"
                  title="Next track"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Up Next List — Edge-to-Edge Clean Rows (No Cards) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
              Up Next ({upNextTracks.length})
            </h3>
            <span className="text-[11px] text-[#8E8E93]">Doom-Scroll Queue</span>
          </div>

          {upNextTracks.length === 0 ? (
            <div className="py-10 text-center text-[#8E8E93]">
              <p className="text-sm font-semibold text-white mb-1">Queue is empty</p>
              <p className="text-xs mb-4">Tap below to load recommendations into your queue.</p>
              <button
                onClick={handleLoadMoreToQueue}
                className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs inline-flex items-center gap-2 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Recommendations</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#1C1C1E]/60">
              {upNextTracks.map((track, relativeIdx) => {
                const absoluteIdx = currentIndex + 1 + relativeIdx;
                const trackId =
                  track.videoId || track.video_id || track.id || absoluteIdx;

                return (
                  <div
                    key={`${trackId}-${absoluteIdx}`}
                    onClick={() => jumpToIndex(absoluteIdx)}
                    className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <span className="w-5 text-center text-xs font-bold text-[#8E8E93] group-hover:text-white flex-shrink-0">
                        {relativeIdx + 1}
                      </span>
                      <img
                        src={get500x500Image(
                          track.thumbnail ||
                            track.image ||
                            track.artwork_url
                        )}
                        alt={track.title}
                        className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0"
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

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.duration > 0 && (
                        <span className="text-xs text-[#8E8E93] font-mono hidden sm:inline-block mr-1">
                          {formatDuration(track.duration)}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(absoluteIdx);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Load More Trigger Button */}
              <div className="pt-4 text-center">
                <button
                  onClick={handleLoadMoreToQueue}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] hover:border-white/40 text-xs font-semibold text-white inline-flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles
                    className={`w-3.5 h-3.5 ${
                      isLoadingMore ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {isLoadingMore ? 'Adding tracks...' : 'Add More to Queue'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
