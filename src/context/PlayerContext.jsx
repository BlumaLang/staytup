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

  // Player state with localStorage persistence for session survival across navigation/refresh
  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('staytup_active_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('staytup_active_index');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(null);

  // Sync active queue & index to localStorage
  useEffect(() => {
    try {
      if (queue.length > 0) {
        localStorage.setItem('staytup_active_queue', JSON.stringify(queue.slice(0, 50)));
        localStorage.setItem('staytup_active_index', String(currentIndex));
      }
    } catch (e) {}
  }, [queue, currentIndex]);

  // Favorites state with instant localStorage cache hydration
  const [likedTrackIds, setLikedTrackIds] = useState(() => {
    try {
      const saved = localStorage.getItem('staytup_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {}
    return new Set();
  });

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

  // Shuffle and Repeat Playback Modes
  const [isShuffle, setIsShuffle] = useState(() => {
    try {
      return localStorage.getItem('staytup_player_shuffle') === 'true';
    } catch {
      return false;
    }
  });
  const [repeatMode, setRepeatMode] = useState(() => {
    try {
      return localStorage.getItem('staytup_player_repeat') || 'off'; // 'off' | 'all' | 'one'
    } catch {
      return 'off';
    }
  });

  const isShuffleRef = useRef(isShuffle);
  const repeatModeRef = useRef(repeatMode);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('staytup_player_shuffle', String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      try {
        localStorage.setItem('staytup_player_repeat', next);
      } catch {}
      return next;
    });
  }, []);

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

  // Prefetch stream URL for seamless zero-latency track switching
  const prefetchNextTrackStream = useCallback((track) => {
    if (!track) return;
    const rawId = track.videoId || track.video_id || track.id;
    if (!rawId) return;
    const videoId = String(rawId).replace(/^saavn_/, '');
    if (!videoId || streamCache.current.has(videoId)) return;

    api.getStreamUrl(videoId).then((res) => {
      const url = res?.stream_url || res?.url || res?.streamUrl;
      if (url) {
        streamCache.current.set(videoId, url);
      }
    }).catch(() => {});
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

      // Seamlessly switch audio source without breaking media session pipeline on mobile/lock-screen
      if (audio.src !== streamUrl) {
        audio.src = streamUrl;
      }
      audio.currentTime = 0;

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

      // Proactively prefetch next track in queue for instantaneous background transition
      const q = queueRef.current;
      const curIdx = currentIndexRef.current;
      const nextCandidate = q[curIdx + 1] || (repeatModeRef.current === 'all' ? q[0] : null);
      if (nextCandidate) {
        prefetchNextTrackStream(nextCandidate);
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
  }, [fetchLyrics, prefetchNextTrackStream]);

  // Intelligent queue replenishment
  const isReplenishingRef = useRef(false);

  const replenishQueue = useCallback(async (customSeedTrack = null, count = 10) => {
    if (isReplenishingRef.current) return 0;
    isReplenishingRef.current = true;
    try {
      const effectiveTrack = customSeedTrack || queueRef.current[currentIndexRef.current] || currentTrack;
      if (!effectiveTrack) return 0;
      const newRecs = await generateIntelligentQueue({
        currentTrack: effectiveTrack,
        currentQueue: queueRef.current,
        user,
        limit: count,
      });
      if (newRecs && newRecs.length > 0) {
        setQueue(prev => deduplicateTracks([...prev, ...newRecs]));
        return newRecs.length;
      }
    } catch (err) {
      console.warn('Queue replenishment error:', err);
    } finally {
      isReplenishingRef.current = false;
    }
    return 0;
  }, [currentTrack, user]);

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

  const nextTrack = useCallback(async () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    const curIdx = currentIndexRef.current;

    // 1. Shuffle mode: jump to a random index
    if (isShuffleRef.current && q.length > 1) {
      let randIdx = Math.floor(Math.random() * q.length);
      if (randIdx === curIdx) {
        randIdx = (curIdx + 1) % q.length;
      }
      jumpToIndex(randIdx);
      if (q.length < 10) {
        replenishQueue(q[randIdx], 10);
      }
      return;
    }

    // 2. Sequential next track in queue
    if (curIdx < q.length - 1) {
      jumpToIndex(curIdx + 1);
      if (curIdx + 2 >= q.length) {
        replenishQueue(q[curIdx + 1], 10);
      }
      return;
    }

    // 3. End of queue: replenish intelligent recommendations or loop so audio never halts
    if (q.length > 0) {
      const current = q[curIdx] || currentTrack;
      await replenishQueue(current, 10);
      const updatedQueue = queueRef.current;
      if (updatedQueue.length > curIdx + 1) {
        jumpToIndex(curIdx + 1);
      } else if (updatedQueue.length > 0) {
        jumpToIndex(0);
      }
    }
  }, [jumpToIndex, replenishQueue, currentTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) {
      if (currentTrack) {
        loadAndPlayTrack(currentTrack, true);
      }
      return;
    }

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
  }, [isPlaying, currentTrack, loadAndPlayTrack]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    // If more than 3 seconds played, rewind to 0:00 (standard UX across Spotify & iOS/Android lock screens)
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const curIdx = currentIndexRef.current;
    if (curIdx > 0) {
      jumpToIndex(curIdx - 1);
    } else if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
  }, [jumpToIndex]);

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

  // Stable refs for background / lock-screen action handlers
  const nextTrackRef = useRef(nextTrack);
  const prevTrackRef = useRef(prevTrack);
  const seekRef = useRef(seek);

  useEffect(() => { nextTrackRef.current = nextTrack; }, [nextTrack]);
  useEffect(() => { prevTrackRef.current = prevTrack; }, [prevTrack]);
  useEffect(() => { seekRef.current = seek; }, [seek]);

  // Lock-screen scrubber & timeline sync (iOS 15+, Android Chrome, macOS Control Center)
  const updateMediaSessionPosition = useCallback(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, audio.duration),
          playbackRate: audio.playbackRate || 1,
          position: Math.min(Math.max(0, audio.currentTime), audio.duration),
        });
      } catch (e) {}
    }
  }, []);

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
      updateMediaSessionPosition();

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
          }
        }
      }

      // Record listening history once when song reaches 30s or 50%
      if (!hasRecordedHistory && currentTrack && audio.duration > 0) {
        const percent = audio.currentTime / audio.duration;
        if (audio.currentTime >= 30 || percent >= 0.5) {
          hasRecordedHistory = true;

          const trackId = currentTrack.videoId || currentTrack.video_id || currentTrack.id;
          if (trackId) {
            // 1. Record in DB history if logged in
            if (user?.id) {
              api.recordHistory(trackId, user.id, Math.floor(audio.currentTime)).catch(() => {});
            }

            // 2. Increment global play count for popularity metrics
            api.incrementPlayCount(trackId).catch(() => {});

            // 3. Dispatch global play event and record recent activity
            try {
              const artistName = currentTrack.artist || 'Unknown Artist';
              window.dispatchEvent(new CustomEvent('track_played', {
                detail: { track: currentTrack, timestamp: Date.now() }
              }));
              recordRecentActivity({
                type: 'song',
                id: trackId,
                title: currentTrack.title || 'Unknown Title',
                subtitle: artistName,
                artist: artistName,
                artists: currentTrack.artists || [],
                image: currentTrack.thumbnail || currentTrack.image || '',
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
        updateMediaSessionPosition();
      }
    };

    const handleEnded = () => {
      if (sleepTimerEndOfTrackRef.current) {
        sleepTimerEndOfTrackRef.current = false;
        setSleepTimerMode(null);
        setSleepTimerRemaining(0);
        const a = audioRef.current;
        if (a) a.pause();
        setIsPlaying(false);
        return;
      }

      // Repeat One: replay the current track from 0:00
      if (repeatModeRef.current === 'one') {
        const a = audioRef.current;
        if (a) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
        return;
      }

      nextTrackRef.current();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.warn('HTML5 Audio playback error event:', e);
      setIsPlaying(false);
    };
    const handleWaiting = () => {
      // Audio buffering, keep playing state intact
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, [currentTrack, user?.id, updateMediaSessionPosition]);

  // Register System MediaSession Action Handlers once (iOS Lock Screen, Android Notification, Bluetooth Car)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = audioRef.current;
        if (audio) {
          audio.play().catch(() => {});
          setIsPlaying(true);
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          setIsPlaying(false);
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          seekRef.current(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        const audio = audioRef.current;
        if (audio) {
          seekRef.current(Math.max(0, audio.currentTime - skip));
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        const audio = audioRef.current;
        if (audio) {
          seekRef.current(Math.min(audio.duration || 0, audio.currentTime + skip));
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        const audio = audioRef.current;
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
        }
      });
    } catch (e) {
      console.warn('MediaSession initialization error:', e);
    }
  }, []);

  // Sync Metadata with System MediaSession (Artwork, Title, Artist, Album)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    const hdArtwork = get500x500Image(
      currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url
    );

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Staytup Track',
        artist: currentTrack.artist || 'Staytup Artist',
        album: currentTrack.album || currentTrack.artist || 'Staytup Music',
        artwork: [
          { src: hdArtwork, sizes: '96x96', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '128x128', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '192x192', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '256x256', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '384x384', type: 'image/jpeg' },
          { src: hdArtwork, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (e) {
      console.warn('MediaSession metadata error:', e);
    }
  }, [currentTrack]);

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
    const willBeLiked = !isCurrentlyLiked;

    // Optimistic toggle
    setLikedTrackIds(prev => {
      const next = new Set(prev);
      if (willBeLiked) {
        next.add(videoId);
      } else {
        next.delete(videoId);
      }
      try {
        localStorage.setItem('staytup_favorites', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });

    // Update local cache of favorite track objects
    try {
      const cachedFavs = JSON.parse(localStorage.getItem('staytup_favorites_tracks') || '[]');
      let updatedFavs;
      if (willBeLiked) {
        updatedFavs = [track, ...cachedFavs.filter(t => (t.videoId || t.video_id || t.id) !== videoId)];
      } else {
        updatedFavs = cachedFavs.filter(t => (t.videoId || t.video_id || t.id) !== videoId);
      }
      localStorage.setItem('staytup_favorites_tracks', JSON.stringify(updatedFavs.slice(0, 100)));
    } catch (e) {}

    const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';

    // Firebase realtime sync
    try {
      const currentIds = Array.from(likedTrackIds);
      const targetIds = willBeLiked ? [...currentIds, videoId] : currentIds.filter(id => id !== videoId);
      syncFavoritesToFirebase(userId, targetIds);
    } catch (e) {}

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
          try {
            localStorage.setItem('staytup_favorites', JSON.stringify(Array.from(next)));
          } catch (e) {}
          return next;
        });
      }
    } catch (e) {
      console.warn('Failed to toggle favorite on server, rolling back:', e);
      // Rollback on failure
      setLikedTrackIds(prev => {
        const rollback = new Set(prev);
        if (isCurrentlyLiked) rollback.add(videoId);
        else rollback.delete(videoId);
        try {
          localStorage.setItem('staytup_favorites', JSON.stringify(Array.from(rollback)));
        } catch (err) {}
        return rollback;
      });
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
        isShuffle,
        toggleShuffle,
        repeatMode,
        toggleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

