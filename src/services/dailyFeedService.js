import { api } from '../api/endpoints.js';
import { saveDailyFeedToFirebase, getDailyFeedFromFirebase } from './firebase.js';

/**
 * Returns today's date string in YYYY-MM-DD local timezone
 */
export const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Checks if the feed has expired (new day after 12:00 AM midnight)
 */
export const hasDailyFeedExpired = (storedDate) => {
  if (!storedDate) return true;
  return storedDate !== getTodayKey();
};

/**
 * Extracts a unique set of user favorite, followed, and currently listened artist names
 */
export const getFavoriteAndFollowedArtists = (user) => {
  const artistSet = new Set();

  // 1. From recently listened artists in localStorage / history
  try {
    const recentListening = JSON.parse(localStorage.getItem('staytup_recent_artists') || '[]');
    recentListening.forEach(a => {
      if (typeof a === 'string' && a.trim()) artistSet.add(a.trim());
      else if (a?.name) artistSet.add(a.name.trim());
    });
  } catch (e) {}

  // 2. From localStorage followed artists
  try {
    const followed = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
    followed.forEach(a => {
      if (typeof a === 'string' && a.trim()) artistSet.add(a.trim());
      else if (a?.name) artistSet.add(a.name.trim());
    });
  } catch (e) {}

  // 3. From user profile / onboarding favorite artists
  if (user?.favoriteArtists && Array.isArray(user.favoriteArtists)) {
    user.favoriteArtists.forEach(a => {
      if (typeof a === 'string' && a.trim()) artistSet.add(a.trim());
      else if (a?.name) artistSet.add(a.name.trim());
    });
  }

  // Fallbacks if user hasn't selected enough artists
  if (artistSet.size === 0) {
    artistSet.add('Arijit Singh');
    artistSet.add('Shreya Ghoshal');
    artistSet.add('Pritam');
  }

  return Array.from(artistSet);
};

/**
 * Fisher-Yates array shuffle helper
 */
export const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Synthesize and generate today's 12 AM daily personalized feed / queue
 */
export const generateDailyPersonalizedFeed = async (user, isForce = false) => {
  const todayKey = getTodayKey();
  const storageKey = `staytup_daily_feed_${todayKey}`;
  const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';

  // 1. Check local cache first (if not forced refresh)
  if (!isForce) {
    try {
      const cached = localStorage.getItem(storageKey);
      const cachedDate = localStorage.getItem('staytup_daily_feed_date');
      if (cached && cachedDate === todayKey) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { tracks: shuffleArray(parsed), date: todayKey, isNewDay: false };
        }
      }
    } catch (e) {}

    // 2. Check Firebase Realtime Database for today's feed
    try {
      const firebaseFeed = await getDailyFeedFromFirebase(userId, todayKey);
      if (firebaseFeed && firebaseFeed.length > 0) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(firebaseFeed));
          localStorage.setItem('staytup_daily_feed_date', todayKey);
        } catch (e) {}
        return { tracks: shuffleArray(firebaseFeed), date: todayKey, isNewDay: false };
      }
    } catch (e) {}
  }

  // 3. Generate fresh daily blend based on listening & followed artists!
  const artists = getFavoriteAndFollowedArtists(user);
  const selectedArtists = shuffleArray(artists).slice(0, 6);
  const userLang = user?.languages?.[0] || 'hindi';

  const collectedTracks = [];
  const trackIdSet = new Set();

  const addUniqueTracks = (trackList) => {
    if (!Array.isArray(trackList)) return;
    trackList.forEach(t => {
      if (!t || t.type === 'album' || t.type === 'playlist') return;
      const vid = t.videoId || t.video_id || t.id;
      if (vid && !trackIdSet.has(vid)) {
        trackIdSet.add(vid);
        collectedTracks.push(t);
      }
    });
  };

  try {
    // 3a. Parallel fetch across all followed & listening artists using artist-page API (no dupes)
    const artistPromises = selectedArtists.map(async (artistName) => {
      try {
        // Step 1: resolve artist name → artist ID (much more accurate than keyword search)
        const artistRes = await api.searchArtists(artistName, 1);
        const artistId = artistRes?.artists?.[0]?.id;
        if (artistId) {
          const songsRes = await api.getArtistSongs(artistId, 1, 10);
          const tracks = (songsRes?.tracks || songsRes?.results || []).slice(0, 5);
          if (tracks.length > 0) return tracks;
        }
        // Fallback: plain text search if artist ID not found
        const fallbackRes = await api.search(artistName, 'songs', 0, 10);
        return (fallbackRes?.tracks || fallbackRes?.results || []).slice(0, 5);
      } catch {
        return [];
      }
    });

    // 3b. Add trending hits in user language
    const trendingPromise = api.search(`lang:${userLang} hits`, 'songs', 0, 15)
      .then(res => (res?.tracks || res?.results || []).slice(0, 8))
      .catch(() => []);

    const [artistResults, trendingTracks] = await Promise.all([
      Promise.all(artistPromises),
      trendingPromise
    ]);

    // Interleave songs from different artists so no single artist monopolizes consecutive slots
    const maxTracksPerArtist = Math.max(...artistResults.map(r => r.length), 0);
    for (let round = 0; round < maxTracksPerArtist; round++) {
      for (const artistTracks of artistResults) {
        if (artistTracks[round]) {
          addUniqueTracks([artistTracks[round]]);
        }
      }
    }

    // Add trending tracks
    addUniqueTracks(trendingTracks);

    // 3c. Fallback if not enough tracks
    if (collectedTracks.length < 10) {
      const fallback = await api.getHomeFeed(userId, true).catch(() => null);
      if (fallback?.sections) {
        fallback.sections.forEach(sec => {
          if (Array.isArray(sec.items)) addUniqueTracks(sec.items);
        });
      }
    }

    // 4. Fully shuffle all tracks across artists for exciting queue discovery
    const finalizedDailyTracks = shuffleArray(collectedTracks);

    // 5. Persist today's daily mix in localStorage and Firebase
    try {
      localStorage.setItem(storageKey, JSON.stringify(finalizedDailyTracks));
      localStorage.setItem('staytup_daily_feed_date', todayKey);
      // Clean up previous day cached feeds to keep storage light
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - 1);
      const prevKey = `staytup_daily_feed_${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      localStorage.removeItem(prevKey);
    } catch (e) {}

    // Async sync to Firebase Realtime Database
    saveDailyFeedToFirebase(userId, todayKey, finalizedDailyTracks);

    return { tracks: finalizedDailyTracks, date: todayKey, isNewDay: true };
  } catch (err) {
    console.error('Failed to generate daily feed:', err);
    return { tracks: [], date: todayKey, isNewDay: false };
  }
};

/**
 * Dynamically replenishes infinite scrolling queue based on artist blend
 */
export const replenishInfiniteDailyQueue = async (user, currentQueueLength = 0) => {
  const artists = getFavoriteAndFollowedArtists(user);
  const randomArtist = artists[Math.floor(Math.random() * artists.length)] || 'Arijit Singh';
  const offset = currentQueueLength + Math.floor(Math.random() * 10);

  try {
    // Resolve artist name → ID for accurate curated songs (no keyword-search dupes)
    const artistRes = await api.searchArtists(randomArtist, 1).catch(() => null);
    const artistId = artistRes?.artists?.[0]?.id;
    if (artistId) {
      const page = Math.floor(offset / 10) + 1;
      const res = await api.getArtistSongs(artistId, page, 15);
      return res?.tracks || res?.results || [];
    }
    // Fallback: plain name search
    const res = await api.search(randomArtist, 'songs', offset, 15);
    return res?.tracks || res?.results || [];
  } catch (e) {
    return [];
  }
};
