import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/endpoints';
import { SongCard } from './SongCard';
import { Music2, RefreshCw } from 'lucide-react';
import {
  generateDailyPersonalizedFeed,
  hasDailyFeedExpired,
  replenishInfiniteDailyQueue,
  shuffleArray,
} from '../services/dailyFeedService';

export const DoomPlayer = () => {
  const { queue, setQueue, currentIndex, jumpToIndex } = usePlayer();
  const { user } = useAuth();
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [pageOffset, setPageOffset] = useState(0);

  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const pendingIndexRef = useRef(currentIndex);

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
        const id = t.videoId || t.video_id || t.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      if (unique.length > 0) {
        // Totally shuffle songs every time user opens or refreshes app for fresh sonic UX
        const shuffledQueue = shuffleArray(unique);
        if (isRefresh || queue.length === 0 || dailyResult?.isNewDay) {
          setQueue(shuffledQueue);
          jumpToIndex(0);
        } else {
          setQueue(prev => [...prev, ...shuffledQueue]);
        }
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [user, setQueue, jumpToIndex, queue.length]);

  useEffect(() => {
    if (queue.length === 0) {
      loadFeedTracks();
    }
  }, [queue.length, loadFeedTracks]);

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

  // Handle scroll events with smooth settle detection
  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Debounce track switch until scroll settles into snap
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const cardHeight = container.clientHeight;
      if (cardHeight > 0) {
        const targetIndex = Math.round(scrollTop / cardHeight);
        if (targetIndex >= 0 && targetIndex < queue.length && targetIndex !== currentIndex) {
          jumpToIndex(targetIndex);
        }
      }
    }, 80);
  }, [queue.length, currentIndex, jumpToIndex]);

  // Programmatic scroll (only when not actively touched/scrolled by user)
  useEffect(() => {
    if (isUserScrollingRef.current) return;
    const targetCard = cardRefs.current[currentIndex];
    const container = containerRef.current;
    if (targetCard && container) {
      const targetTop = targetCard.offsetTop;
      if (Math.abs(container.scrollTop - targetTop) > 10) {
        container.scrollTo({
          top: targetTop,
          behavior: 'auto',
        });
      }
    }

    // Infinite daily queue replenishment
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

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
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
