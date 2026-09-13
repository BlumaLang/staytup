import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/endpoints';
import { useAuth } from './AuthContext';
import { get500x500Image } from '../utils/media';
import { recordTrackHistoryToFirebase, syncFavoritesToFirebase } from '../services/firebase';

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

  // Active track
  const currentTrack = queue[currentIndex] || null;

  // Keep refs in sync for handlers without stale closures
  const currentIndexRef = useRef(currentIndex);
  const queueRef = useRef(queue);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Fetch lyrics when track changes
  const fetchLyrics = useCallback(async (track) => {
    if (!track) {
      setLyrics(null);
      return;
    }
    setIsLoadingLyrics(true);
    try {
      const vid = track.videoId || track.video_id || track.id || '';
      const data = await api.getLyrics(track.title, track.artist || '', vid);
      setLyrics(data);
    } catch (e) {
      setLyrics({ has_lyrics: false, is_synced: false, synced_lyrics: [], plain_lyrics: '' });
    } finally {
      setIsLoadingLyrics(false);
    }
  }, []);

  // Play a track with stream resolution
  const loadAndPlayTrack = useCallback(async (track, autoPlay = true) => {
    if (!track) return;
    const videoId = track.videoId || track.video_id || track.id;
    if (!videoId) return;

    setStreamError(null);
    setIsLoadingStream(true);
    fetchLyrics(track);

    const audio = audioRef.current;
    audio.pause();
    setCurrentTime(0);

    try {
      let streamUrl = streamCache.current.get(videoId);
      if (!streamUrl) {
        const res = await api.getStreamUrl(videoId);
        streamUrl = res.stream_url || res.url || res.streamUrl;
        if (streamUrl) {
          streamCache.current.set(videoId, streamUrl);
        }
      }

      if (!streamUrl) {
        throw new Error('No stream URL available');
      }

      audio.src = streamUrl;
      audio.load();

      if (autoPlay) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (playErr) {
          console.warn('Autoplay prevented by browser:', playErr);
          setIsPlaying(false);
        }
      }
    } catch (err) {
      console.error('Failed to load stream:', err);
      setStreamError('Failed to load audio stream');
      setIsPlaying(false);
    } finally {
      setIsLoadingStream(false);
    }
  }, [fetchLyrics]);

  // Set new track or queue
  const playTrack = useCallback((track, newQueue = null) => {
    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(
        t => (t.videoId || t.video_id || t.id) === (track.videoId || track.video_id || track.id)
      );
      const targetIdx = idx !== -1 ? idx : 0;
      setCurrentIndex(targetIdx);
      loadAndPlayTrack(newQueue[targetIdx], true);
    } else {
      setQueue([track]);
      setCurrentIndex(0);
      loadAndPlayTrack(track, true);
    }
  }, [loadAndPlayTrack]);

  // Change index in current queue (Doom scroll snap)
  const jumpToIndex = useCallback((index) => {
    const q = queueRef.current;
    if (index >= 0 && index < q.length) {
      setCurrentIndex(index);
      loadAndPlayTrack(q[index], true);
    }
  }, [loadAndPlayTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio.paused) {
      audio.play().catch(e => console.warn(e));
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((timeInSeconds) => {
    const audio = audioRef.current;
    audio.currentTime = timeInSeconds;
    setCurrentTime(timeInSeconds);
  }, []);

  const nextTrack = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const nextIdx = (currentIndexRef.current + 1) % q.length;
    setCurrentIndex(nextIdx);
    loadAndPlayTrack(q[nextIdx], true);
  }, [loadAndPlayTrack]);

  const prevTrack = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const prevIdx = (currentIndexRef.current - 1 + q.length) % q.length;
    setCurrentIndex(prevIdx);
    loadAndPlayTrack(q[prevIdx], true);
  }, [loadAndPlayTrack]);

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

  // Load user favorites on start/user change
  useEffect(() => {
    const userId = user?.id || localStorage.getItem('staytup_user_id');
    if (!userId) return;
    api.getFavorites(userId)
      .then(res => {
        if (res && Array.isArray(res.favorites)) {
          const ids = new Set(res.favorites.map(t => String(t.videoId || t.video_id || t.id)));
          setLikedTrackIds(ids);
        }
      })
      .catch(err => console.warn('Could not fetch favorites:', err));
  }, [user?.id]);

  // Handle HTML5 Audio events
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Record play to history once 5 seconds played
      if (currentTrack && audio.currentTime > 5) {
        const trackId = currentTrack.videoId || currentTrack.video_id || currentTrack.id;
        if (trackId && !playRecordedRef.current.has(trackId)) {
          playRecordedRef.current.add(trackId);
          const effectiveUserId = user?.id || localStorage.getItem('staytup_user_id') || 'explorer_' + Math.random().toString(36).substring(2, 8);
          if (effectiveUserId) {
            // Local PHP backend record
            api.recordPlay({
              user_id: effectiveUserId,
              videoId: trackId,
              title: currentTrack.title,
              artist: currentTrack.artist || '',
              album: currentTrack.album || '',
              thumbnail: currentTrack.thumbnail || currentTrack.image || '',
              duration: currentTrack.duration || Math.round(audio.duration || 0),
            }).catch(e => console.warn('Record play error:', e));

            // Realtime Firebase Community & User History record
            recordTrackHistoryToFirebase(effectiveUserId, currentTrack);

            // Record artist into recent listening artists list for Queue personalization
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
        playTrack,
        jumpToIndex,
        togglePlay,
        seek,
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

