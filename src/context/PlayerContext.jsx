import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/endpoints';
import { useAuth } from './AuthContext';
import { get500x500Image } from '../utils/media';
import { recordTrackHistoryToFirebase, syncFavoritesToFirebase } from '../services/firebase';
import { generateIntelligentQueue, getTrackId, deduplicateTracks } from '../services/intelligentQueueService';
import { recordRecentActivity } from '../services/recentActivityService';

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
  const { user } = useAuth();
  const audioRef = useRef(new Audio());
  const streamCache = useRef(new Map());
  const playRecordedRef = useRef(new Set());

  // Player state
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);

  // Favorites state
  const [likedTrackIds, setLikedTrackIds] = useState(new Set());

  // Lyrics state
  const [lyrics, setLyrics] = useState(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isLyricsDrawerOpen, setIsLyricsDrawerOpen] = useState(false);

  // Queue Modal state
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  // Sleep Timer state
  const [sleepTimerMode, setSleepTimerMode] = useState(null); // 'time' | 'end_of_track' | null
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0); // in seconds
  const [isSleepTimerModalOpen, setIsSleepTimerModalOpen] = useState(false);
  const sleepTimerEndOfTrackRef = useRef(false);

  // Active track
  const currentTrack = queue[currentIndex] || null;

  // Keep refs in sync for handlers without stale closures
  const currentIndexRef = useRef(currentIndex);
  const queueRef = useRef(queue);
  const activeTrackLoadIdRef = useRef(0);
  const activeLyricsLoadIdRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Fetch lyrics when track changes with request cancellation
  const fetchLyrics = useCallback(async (track, loadId) => {
    if (!track) {
      setLyrics(null);
      return;
    }
    setIsLoadingLyrics(true);
    try {
      const vid = track.videoId || track.video_id || track.id || '';
      const data = await api.getLyrics(track.title, track.artist || '', vid);
      if (loadId === activeLyricsLoadIdRef.current) {
        setLyrics(data);
      }
    } catch (e) {
      if (loadId === activeLyricsLoadIdRef.current) {
        setLyrics({ has_lyrics: false, is_synced: false, synced_lyrics: [], plain_lyrics: '' });
      }
    } finally {
      if (loadId === activeLyricsLoadIdRef.current) {
        setIsLoadingLyrics(false);
      }
    }
  }, []);

  // Play a track with stream resolution and strict race condition prevention
  const loadAndPlayTrack = useCallback(async (track, autoPlay = true) => {
    if (!track) return;
    const rawId = track.videoId || track.video_id || track.id;
    if (!rawId) return;
    const videoId = String(rawId).replace(/^saavn_/, '');
    if (!videoId) return;

    // Increment request ID so any in-flight requests for older songs are immediately cancelled
    const currentLoadId = ++activeTrackLoadIdRef.current;
    activeLyricsLoadIdRef.current = currentLoadId;

    setStreamError(null);
    setIsLoadingStream(true);
    fetchLyrics(track, currentLoadId);

    const audio = audioRef.current;
    // Stop and clear previous audio immediately to prevent playing wrong song
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setCurrentTime(0);

    try {
      let streamUrl = streamCache.current.get(videoId);
      if (!streamUrl) {
        const res = await api.getStreamUrl(videoId);
        // CRITICAL CHECK: if user has swiped to another track, discard this stream!
        if (currentLoadId !== activeTrackLoadIdRef.current) {
          return;
        }
        streamUrl = res?.stream_url || res?.url || res?.streamUrl;
        if (streamUrl) {
          streamCache.current.set(videoId, streamUrl);
        }
      }

      // Check again after cache lookup
      if (currentLoadId !== activeTrackLoadIdRef.current) {
        return;
      }

      if (!streamUrl) {
        throw new Error('No stream URL available');
      }

      audio.src = streamUrl;
      audio.load();

      if (autoPlay) {
        try {
          await audio.play();
          if (currentLoadId === activeTrackLoadIdRef.current) {
            setIsPlaying(true);
          }
        } catch (playErr) {
          if (currentLoadId === activeTrackLoadIdRef.current) {
            setIsPlaying(false);
            const resumeOnFirstInteraction = () => {
              if (currentLoadId === activeTrackLoadIdRef.current) {
                audio.play().then(() => {
                  setIsPlaying(true);
                }).catch(() => {});
              }
            };
            window.addEventListener('click', resumeOnFirstInteraction, { once: true });
            window.addEventListener('touchstart', resumeOnFirstInteraction, { once: true });
            window.addEventListener('keydown', resumeOnFirstInteraction, { once: true });
          }
        }
      }
    } catch (err) {
      if (currentLoadId === activeTrackLoadIdRef.current) {
        console.error('Failed to load stream for track:', track.title, err);
        setStreamError('Failed to load audio stream');
        setIsPlaying(false);
      }
    } finally {
      if (currentLoadId === activeTrackLoadIdRef.current) {
        setIsLoadingStream(false);
      }
    }
  }, [fetchLyrics]);

  // Intelligent queue replenishment
  const isReplenishingRef = useRef(false);

  const replenishQueue = useCallback(async (customSeedTrack = null, count = 10) => {
    if (isReplenishingRef.current) return;
    isReplenishingRef.current = true;
    try {
      const effectiveTrack = customSeedTrack || queueRef.current[currentIndexRef.current] || currentTrack;
      if (!effectiveTrack) return;
      const newRecs = await generateIntelligentQueue(effectiveTrack, queueRef.current, count);
      if (newRecs && newRecs.length > 0) {
        setQueue(prev => deduplicateTracks([...prev, ...newRecs]));
      }
    } catch (err) {
      console.warn('Queue replenishment error:', err);
    } finally {
      isReplenishingRef.current = false;
    }
  }, [currentTrack]);

  // Set new track or queue
  const playTrack = useCallback((track, newQueue = null) => {
    if (!track) return;
    if (newQueue && newQueue.length > 0) {
      queueRef.current = newQueue;
      setQueue(newQueue);
      const idx = newQueue.findIndex(
        t => (t.videoId || t.video_id || t.id) === (track.videoId || track.video_id || track.id)
      );
      const targetIdx = idx !== -1 ? idx : 0;
      setCurrentIndex(targetIdx);
      loadAndPlayTrack(newQueue[targetIdx], true);
      // Auto-replenish if queue is very short
      if (newQueue.length <= 2) {
        replenishQueue(newQueue[targetIdx], 10);
      }
    } else {
      queueRef.current = [track];
      setQueue([track]);
      setCurrentIndex(0);
      loadAndPlayTrack(track, true);
      // Automatically generate recommendations in the background so queue never halts
      replenishQueue(track, 10);
    }
  }, [loadAndPlayTrack, replenishQueue]);

  // Change index in current queue (Doom scroll snap)
  const jumpToIndex = useCallback((index) => {
    const q = queueRef.current;
    if (index >= 0 && index < q.length) {
      setCurrentIndex(index);
      loadAndPlayTrack(q[index], true);
      // If approaching end of queue, replenish preemptively
      if (index >= q.length - 2) {
        replenishQueue(q[index], 10);
      }
    }
  }, [loadAndPlayTrack, replenishQueue]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Playback resume blocked:', err);
      });
    }
  }, [isPlaying]);

  const nextTrack = useCallback(() => {
    const q = queueRef.current;
    if (currentIndex < q.length - 1) {
      jumpToIndex(currentIndex + 1);
      if (currentIndex + 2 >= q.length) {
        replenishQueue(q[currentIndex + 1], 10);
      }
    } else if (q.length > 0) {
      // Reached end of queue: replenish and jump to next
      replenishQueue(q[currentIndex], 10).then(() => {
        if (queueRef.current.length > currentIndex + 1) {
          jumpToIndex(currentIndex + 1);
        }
      });
    }
  }, [currentIndex, jumpToIndex, replenishQueue]);

  const prevTrack = useCallback(() => {
    if (currentIndex > 0) {
      jumpToIndex(currentIndex - 1);
    }
  }, [currentIndex, jumpToIndex]);

  const seek = useCallback((timeInSeconds) => {
    const audio = audioRef.current;
    if (audio && !isNaN(timeInSeconds)) {
      audio.currentTime = timeInSeconds;
      setCurrentTime(timeInSeconds);
    }
  }, []);
  const seekTo = seek;

  const setVolume = useCallback((val) => {
    const audio = audioRef.current;
    audio.volume = val;
    setVolumeState(val);
    if (val > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }, [isMuted]);

  // Fetch user favorites on load
  useEffect(() => {
    const userId = user?.id || user?.uid || localStorage.getItem('staytup_user_id') || 'guest_user';
    api.getFavorites(userId)
      .then(res => {
        const tracks = Array.isArray(res) ? res : res.favorites || [];
        const ids = new Set(tracks.map(t => t.videoId || t.video_id || t.id).filter(Boolean));
        setLikedTrackIds(ids);
      })
      .catch(err => console.warn('Could not fetch favorites:', err));
  }, [user?.id, user?.uid]);

  // Handle HTML5 Audio events
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Record play to history once 1 second played
      if (currentTrack && audio.currentTime > 1) {
        const trackId = currentTrack.videoId || currentTrack.video_id || currentTrack.id;
        if (trackId && !playRecordedRef.current.has(trackId)) {
          playRecordedRef.current.add(trackId);
          let effectiveUserId = user?.id || user?.uid || localStorage.getItem('staytup_user_id');
          if (!effectiveUserId) {
            effectiveUserId = 'user_' + Math.random().toString(36).substring(2, 10);
            try { localStorage.setItem('staytup_user_id', effectiveUserId); } catch(e){}
          }
          if (effectiveUserId) {
            // 1. Local PHP backend record
            api.recordPlay({
              user_id: effectiveUserId,
              videoId: trackId,
              title: currentTrack.title,
              artist: currentTrack.artist || '',
              album: currentTrack.album || '',
              thumbnail: currentTrack.thumbnail || currentTrack.image || '',
              duration: currentTrack.duration || Math.round(audio.duration || 0),
            }).catch(e => console.warn('Record play error:', e));

            // 2. Realtime Firebase Community & User History record
            recordTrackHistoryToFirebase(effectiveUserId, currentTrack);

            // 3. Record entity-aware recent activity for search & library
            try {
              recordRecentActivity({
                type: 'song',
                id: trackId,
                videoId: trackId,
                title: currentTrack.title,
                artist: currentTrack.artist || '',
                artists: currentTrack.artists || [],
                image: currentTrack.thumbnail || currentTrack.image || '',
                thumbnail: currentTrack.thumbnail || currentTrack.image || '',
              });
            } catch (e) {}

            // 4. LocalStorage persistence for instant offline & zero-latency history
            try {
              const savedHistory = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
              const filtered = savedHistory.filter(t => {
                const tid = t?.videoId || t?.video_id || t?.id;
                return tid !== trackId;
              });
              localStorage.setItem('staytup_recently_played', JSON.stringify([currentTrack, ...filtered].slice(0, 50)));
            } catch (e) {}

            // 5. Record artist into recent listening artists list for Queue personalization
            if (currentTrack.artist) {
              try {
                const recent = JSON.parse(localStorage.getItem('staytup_recent_artists') || '[]');
                const artists = currentTrack.artist
                  .split(/[,/&|;]|(?:\s+feat\.?\s+)|\s+ft\.?\s+/i)
                  .map(a => a.trim())
                  .filter(a => a.length > 0 && a.toLowerCase() !== 'various artists');
                const combined = Array.from(new Set([...artists, ...recent])).slice(0, 15);
                localStorage.setItem('staytup_recent_artists', JSON.stringify(combined));
              } catch (e) {}
            }
          }
        }
      }
    };

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (sleepTimerEndOfTrackRef.current) {
        sleepTimerEndOfTrackRef.current = false;
        setSleepTimerMode(null);
        setSleepTimerRemaining(0);
        const audio = audioRef.current;
        if (audio) audio.pause();
        setIsPlaying(false);
        return;
      }
      nextTrack();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentTrack, user?.id, nextTrack]);

  // Sync with System MediaSession (Notification Panel, Control Center, Lock Screen)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const hdArtwork = get500x500Image(
      currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url
    );

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Staytup Track',
        artist: currentTrack.artist || 'Staytup Artist',
        album: currentTrack.album || 'Staytup Music',
        artwork: [
          { src: hdArtwork, sizes: '96x96', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '128x128', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '192x192', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '256x256', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '384x384', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '500x500', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        audio.play().catch(() => {});
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = audioRef.current;
        audio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seek(details.seekTime);
        }
      });
    } catch (e) {
      console.warn('MediaSession initialization error:', e);
    }
  }, [currentTrack, nextTrack, prevTrack, seek]);

  // Update MediaSession playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [isPlaying]);

  // Sync lyrics highlighting with current time
  useEffect(() => {
    if (!lyrics || !lyrics.is_synced || !Array.isArray(lyrics.synced_lyrics)) {
      setActiveLyricIndex(-1);
      return;
    }

    const lines = lyrics.synced_lyrics;
    let found = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        found = i;
      } else {
        break;
      }
    }
    setActiveLyricIndex(found);
  }, [currentTime, lyrics]);

  // Toggle favorite / like track
  const toggleLike = useCallback(async (track) => {
    if (!track) return;
    const rawId = track.videoId || track.video_id || track.id;
    if (!rawId) return;
    const videoId = String(rawId);

    const isCurrentlyLiked = likedTrackIds.has(videoId);
    // Optimistic toggle
    let updatedFavoritesArray = [];
    setLikedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      updatedFavoritesArray = Array.from(next);
      return next;
    });

    const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';

    // Firebase realtime sync
    syncFavoritesToFirebase(userId, updatedFavoritesArray);

    try {
      const res = await api.toggleFavorite({
        user_id: userId,
        videoId: videoId,
        title: track.title,
        artist: track.artist || '',
        album: track.album || '',
        thumbnail: track.thumbnail || track.image || '',
        duration: track.duration || 0,
      });

      if (res && typeof res.favorited === 'boolean') {
        setLikedTrackIds(prev => {
          const next = new Set(prev);
          if (res.favorited) next.add(videoId);
          else next.delete(videoId);
          return next;
        });
      }
    } catch (e) {
      console.warn('Failed to toggle favorite on server:', e);
    }
  }, [likedTrackIds, user?.id]);

  // Queue manipulation handlers
  const removeFromQueue = useCallback((indexToRemove) => {
    setQueue(prev => {
      if (indexToRemove < 0 || indexToRemove >= prev.length) return prev;
      const nextQueue = prev.filter((_, idx) => idx !== indexToRemove);
      if (indexToRemove < currentIndex) {
        setCurrentIndex(c => Math.max(0, c - 1));
      } else if (indexToRemove === currentIndex && nextQueue.length > 0) {
        const nextIdx = Math.min(currentIndex, nextQueue.length - 1);
        setCurrentIndex(nextIdx);
        loadAndPlayTrack(nextQueue[nextIdx], isPlaying);
      }
      return nextQueue;
    });
  }, [currentIndex, isPlaying, loadAndPlayTrack]);

  const addToQueueNext = useCallback((track) => {
    if (!track) return;
    setQueue(prev => {
      const next = [...prev];
      next.splice(currentIndex + 1, 0, track);
      return next;
    });
  }, [currentIndex]);

  const reorderQueue = useCallback((fromIndex, toIndex) => {
    setQueue(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setCurrentIndex(0);
    }
  }, [currentTrack]);

  // Sleep Timer countdown interval
  useEffect(() => {
    if (sleepTimerMode !== 'time' || sleepTimerRemaining <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const audio = audioRef.current;
          if (audio) {
            audio.pause();
          }
          setIsPlaying(false);
          setSleepTimerMode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerMode, sleepTimerRemaining]);

  const setSleepTimer = useCallback((value) => {
    if (value === 'end_of_track') {
      setSleepTimerMode('end_of_track');
      setSleepTimerRemaining(0);
      sleepTimerEndOfTrackRef.current = true;
    } else if (typeof value === 'number' && value > 0) {
      setSleepTimerMode('time');
      setSleepTimerRemaining(Math.round(value * 60));
      sleepTimerEndOfTrackRef.current = false;
    }
  }, []);

  const cancelSleepTimer = useCallback(() => {
    setSleepTimerMode(null);
    setSleepTimerRemaining(0);
    sleepTimerEndOfTrackRef.current = false;
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        setQueue,
        currentIndex,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isLoadingStream,
        streamError,
        likedTrackIds,
        lyrics,
        isLoadingLyrics,
        activeLyricIndex,
        isLyricsDrawerOpen,
        setIsLyricsDrawerOpen,
        isQueueModalOpen,
        setIsQueueModalOpen,
        sleepTimerMode,
        sleepTimerRemaining,
        isSleepTimerModalOpen,
        setIsSleepTimerModalOpen,
        setSleepTimer,
        cancelSleepTimer,
        playTrack,
        jumpToIndex,
        togglePlay,
        seek,
        seekTo,
        nextTrack,
        prevTrack,
        setVolume,
        toggleMute,
        toggleLike,
        fetchLyrics,
        removeFromQueue,
        addToQueueNext,
        reorderQueue,
        clearQueue,
        replenishQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

