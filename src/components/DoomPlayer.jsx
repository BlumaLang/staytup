import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/endpoints';
import { SongCard } from './SongCard';
import { Music2, RefreshCw, Moon, ListMusic } from 'lucide-react';
import {
  generateDailyPersonalizedFeed,
  hasDailyFeedExpired,
  replenishInfiniteDailyQueue,
  shuffleArray,
} from '../services/dailyFeedService';

export const DoomPlayer = ({ onOpenLibrary }) => {
  const {
    queue,
    setQueue,
    currentIndex,
    jumpToIndex,
    playTrack,
    isPlaying,
    sleepTimerMode,
    sleepTimerRemaining,
    setIsSleepTimerModalOpen,
    setIsQueueModalOpen,
  } = usePlayer();
  const { user } = useAuth();
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);

  const isUserScrollingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const pendingIndexRef = useRef(currentIndex);

  const queueLengthRef = useRef(queue.length);
  useEffect(() => { queueLengthRef.current = queue.length; }, [queue.length]);

  // Initial feed loader & Daily 12 AM mix: Always shuffles totally on new app open
  const loadFeedTracks = useCallback(async (isRefresh = false) => {
    setIsLoadingFeed(true);
    try {
      const dailyResult = await generateDailyPersonalizedFeed(user, isRefresh);
      let tracks = dailyResult?.tracks || [];

      if (tracks.length === 0) {
        const homeData = await api.getHomeFeed(user?.id, isRefresh);
        if (homeData && Array.isArray(homeData.sections)) {
          for (const sec of homeData.sections) {
            if (sec.type === 'songs' && Array.isArray(sec.items)) {
              tracks.push(...sec.items);
            } else if (sec.id === 'trending_now' && Array.isArray(sec.items)) {
              tracks.push(...sec.items);
            }
          }
        }
      }

      if (tracks.length === 0) {
        const query = user?.languages?.length ? `lang:${user.languages[0]}` : 'trending';
        const searchRes = await api.search(query, 'songs', 0, 30);
        tracks = searchRes.tracks || searchRes.results || [];
      }

      const seen = new Set();
      const unique = tracks.filter(t => {
        if (!t || t.type === 'album' || t.type === 'playlist') return false;
        const id = t.videoId || t.video_id || t.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      if (unique.length > 0) {
        const shuffledQueue = shuffleArray(unique);
        if (isRefresh || queueLengthRef.current === 0 || dailyResult?.isNewDay) {
          playTrack(shuffledQueue[0], shuffledQueue);
        } else {
          setQueue(prev => [...prev, ...shuffledQueue]);
        }
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [user, setQueue, playTrack]);

  useEffect(() => {
    if (queue.length === 0) {
      loadFeedTracks();
    }
    // Only run when queue transitions from non-empty to empty (e.g., after clear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length === 0]);

  // Midnight 12:00 AM check: refresh the feed when passing midnight
  useEffect(() => {
    const checkMidnight = () => {
      const storedDate = localStorage.getItem('staytup_daily_feed_date');
      if (hasDailyFeedExpired(storedDate)) {
        loadFeedTracks(true);
      }
    };

    const interval = setInterval(checkMidnight, 60000);
    window.addEventListener('focus', checkMidnight);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkMidnight);
    };
  }, [loadFeedTracks]);

  // Handle scroll events with exact height-based snap detection
  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    isUserScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce track switch until scroll settles into snap
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      const container = containerRef.current;
      if (!container) return;

      const h = container.clientHeight;
      if (!h) return;
      const targetIdx = Math.round(container.scrollTop / h);

      if (targetIdx >= 0 && targetIdx < queue.length && targetIdx !== currentIndex) {
        jumpToIndex(targetIdx);
      }
    }, 100);
  }, [queue.length, currentIndex, jumpToIndex]);

  // Precise IntersectionObserver for snap detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute('data-index'), 10);
            if (!isNaN(idx) && idx >= 0 && idx < queue.length && idx !== currentIndex) {
              jumpToIndex(idx);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.7,
      }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [queue.length, currentIndex, jumpToIndex]);

  // Programmatic scroll (only when not actively touched/scrolled by user)
  useEffect(() => {
    if (isUserScrollingRef.current) return;
    const container = containerRef.current;
    if (container) {
      const h = container.clientHeight;
      if (!h) return;
      const targetTop = currentIndex * h;
      if (Math.abs(container.scrollTop - targetTop) > 6) {
        isProgrammaticScrollRef.current = true;
        container.scrollTo({
          top: targetTop,
          behavior: 'instant',
        });
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 100);
      }
    }
  }, [currentIndex]);

  // Infinite daily queue replenishment
  useEffect(() => {
    if (currentIndex >= queue.length - 3 && !isLoadingFeed && queue.length > 0) {
      setIsLoadingFeed(true);
      replenishInfiniteDailyQueue(user, queue.length)
        .then(newSongs => {
          if (newSongs && newSongs.length > 0) {
            const seen = new Set(queue.map(s => s.videoId || s.video_id || s.id));
            const unique = newSongs.filter(s => {
              const id = s.videoId || s.video_id || s.id;
              return id && !seen.has(id);
            });
            if (unique.length > 0) {
              setQueue(prev => [...prev, ...unique]);
            }
          }
        })
        .catch(err => console.warn(err))
        .finally(() => setIsLoadingFeed(false));
    }
  }, [currentIndex, queue, isLoadingFeed, user, setQueue]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Late Night Vibes';
  };

  const formatTimerBadge = () => {
    if (sleepTimerMode === 'end_of_track') return 'End of song';
    if (sleepTimerMode === 'time') {
      const mins = Math.ceil(sleepTimerRemaining / 60);
      return `${mins}m left`;
    }
    return null;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Unique Home Header Overlay */}
      {queue.length > 0 && !isLoadingFeed && (
        <div className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 flex items-center justify-between pointer-events-none">
          {/* Dynamic Greeting & Live Animated Equalizer Waveform */}
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 shadow-lg group">
            {/* Animated 4-bar equalizer wave */}
            <div className="flex items-end gap-[3px] h-3.5 w-4 pb-0.5">
              <span className={`w-[2.5px] bg-white rounded-full transition-all ${isPlaying ? 'animate-music-bar-1' : 'h-1'}`} />
              <span className={`w-[2.5px] bg-white rounded-full transition-all ${isPlaying ? 'animate-music-bar-2' : 'h-2'}`} />
              <span className={`w-[2.5px] bg-white rounded-full transition-all ${isPlaying ? 'animate-music-bar-3' : 'h-3'}`} />
              <span className={`w-[2.5px] bg-white rounded-full transition-all ${isPlaying ? 'animate-music-bar-4' : 'h-1.5'}`} />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide">
              {getGreeting()}
            </span>
          </div>

          {/* Right side: Playback + Sleep Timer buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Playback queue shortcut button */}
            <button
              onClick={() => setIsQueueModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-xl border border-white/10 text-[#8E8E93] hover:text-white text-xs font-semibold transition-all active:scale-95 shadow-lg cursor-pointer"
              title="Playback Queue"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Playback</span>
            </button>

            {/* Sleep Timer Trigger with live countdown badge */}
            <button
              onClick={() => setIsSleepTimerModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border text-xs font-semibold transition-all active:scale-95 shadow-lg cursor-pointer ${
                sleepTimerMode
                  ? 'bg-indigo-600/90 border-indigo-400 text-white shadow-indigo-500/20 animate-pulse'
                  : 'bg-black/45 hover:bg-black/70 border-white/10 text-[#8E8E93] hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Moon className={`w-3.5 h-3.5 ${sleepTimerMode ? 'fill-current' : ''}`} />
              <span>{formatTimerBadge() || 'Timer'}</span>
            </button>
          </div>
        </div>
      )}

      {isLoadingFeed && queue.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center text-[#8E8E93]">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide text-white">Curating your sound feed...</p>
          <p className="text-xs text-[#8E8E93] mt-1">Preparing high-fidelity stream</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-[#8E8E93]">
          <Music2 className="w-16 h-16 text-[#2C2C2E] mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No tracks found</h3>
          <p className="text-xs text-[#8E8E93] max-w-xs mb-6">
            Unable to load songs right now. Try refreshing your feed.
          </p>
          <button
            onClick={() => loadFeedTracks(true)}
            className="px-6 py-3 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-sm flex items-center gap-2 transition-transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-black" />
            <span>Refresh Feed</span>
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onTouchStart={() => { isUserScrollingRef.current = true; }}
          onTouchEnd={() => {
            setTimeout(() => { isUserScrollingRef.current = false; }, 150);
          }}
          className="h-full w-full overflow-y-scroll snap-feed no-scrollbar"
        >
          {queue.map((track, idx) => (
            <div
              key={`${track.videoId || track.video_id || track.id}-${idx}`}
              ref={(el) => (cardRefs.current[idx] = el)}
              data-index={idx}
              className="h-full w-full snap-card"
            >
              <SongCard track={track} isActive={idx === currentIndex} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoomPlayer;
