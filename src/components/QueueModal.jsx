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

  const getTrackArtwork = (t) => {
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

  const moveQueueItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= queue.length || fromIndex === toIndex) return;
    setQueue((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated;
    });
  };

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
      {/* Top Header — Clean, Cardless */}
      <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] bg-black z-10 flex-shrink-0">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Playback Queue
          </h2>

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
    </div>

      {/* Main Full-Width Scrollable Queue */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 no-scrollbar max-w-4xl mx-auto w-full space-y-6 pb-6">
        {/* 1. Now Playing Section — Styled same as next songs rows */}
        {nowPlaying && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-1">
              Now Playing
            </h3>
            <div className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl transition-colors group">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-5 flex items-end justify-center gap-[2px] h-3.5 flex-shrink-0">
                  <span className={`w-[2.5px] bg-white rounded-full ${isPlaying ? 'animate-music-bar-1' : 'h-1'}`} />
                  <span className={`w-[2.5px] bg-white rounded-full ${isPlaying ? 'animate-music-bar-2' : 'h-2.5'}`} />
                  <span className={`w-[2.5px] bg-white rounded-full ${isPlaying ? 'animate-music-bar-3' : 'h-3.5'}`} />
                </div>

                <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5 relative">
                  <img
                    src={getTrackArtwork(nowPlaying)}
                    alt={nowPlaying.title}
                    onError={(e) => {
                      e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 text-left">
                  <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                    {nowPlaying.title}
                  </p>
                  <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                    {nowPlaying.artist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {nowPlaying.duration > 0 && (
                  <span className="text-xs text-[#8E8E93] font-mono hidden sm:inline-block mr-1">
                    {formatDuration(nowPlaying.duration)}
                  </span>
                )}

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-black" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Up Next List — Edge-to-Edge Clean Rows */}
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

                const isFirstUpNext = relativeIdx === 0;
                const isLastUpNext = relativeIdx === upNextTracks.length - 1;

                return (
                  <div
                    key={`${trackId}-${absoluteIdx}`}
                    onClick={() => jumpToIndex(absoluteIdx)}
                    className="flex items-center justify-between py-3 px-1 sm:px-2 hover:bg-[#121212] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="w-5 text-center text-xs font-bold text-[#8E8E93] group-hover:text-white flex-shrink-0">
                        {relativeIdx + 1}
                      </span>
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5 relative">
                        <img
                          src={getTrackArtwork(track)}
                          alt={track.title}
                          onError={(e) => {
                            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                          {track.title}
                        </p>
                        <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {track.duration > 0 && (
                        <span className="text-xs text-[#8E8E93] font-mono hidden sm:inline-block mr-2">
                          {formatDuration(track.duration)}
                        </span>
                      )}

                      {/* Up Arrow for reordering */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQueueItem(absoluteIdx, absoluteIdx - 1);
                        }}
                        disabled={isFirstUpNext}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        title="Move track up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      {/* Down Arrow for reordering */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveQueueItem(absoluteIdx, absoluteIdx + 1);
                        }}
                        disabled={isLastUpNext}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        title="Move track down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* X Button for delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(absoluteIdx);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
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
