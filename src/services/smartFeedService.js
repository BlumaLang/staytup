import { api } from '../api/endpoints.js';
import { getCommunityListeningHistoryFromFirebase } from './firebase.js';

/**
 * Extracts and parses release date and age in days
 * Checks item metadata or Saavn CDN image timestamp patterns (YYYYMMDD)
 */
export const parseReleaseDate = (item) => {
  if (!item) return { dateStr: '', daysAgo: 999, badge: 'New Release' };

  let dateObj = null;

  // 1. Try explicit release_date string (e.g. "2026-09-04" or "2026-09-04 11:11:23")
  const rawDate = item.release_date || item.more_info?.release_date;
  if (rawDate && typeof rawDate === 'string') {
    const match = rawDate.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
      dateObj = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    }
  }

  // 2. Try parsing CDN image filename timestamp (e.g. "...-2026-20260904111123-500x500.jpg")
  if (!dateObj) {
    const imgUrl = item.image || item.thumbnail || item.artwork_url || '';
    const imgMatch = imgUrl.match(/[-_](\d{4})(\d{2})(\d{2})\d{0,6}[-_]/);
    if (imgMatch) {
      const year = parseInt(imgMatch[1], 10);
      const month = parseInt(imgMatch[2], 10) - 1;
      const day = parseInt(imgMatch[3], 10);
      if (year >= 2020 && year <= 2030 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        dateObj = new Date(year, month, day);
      }
    }
  }

  // 3. Fallback to year if present
  const year = parseInt(item.year || item.more_info?.year || 0, 10);
  if (!dateObj && year >= 2020) {
    const currentYear = new Date().getFullYear();
    if (year === currentYear) {
      return {
        dateStr: String(year),
        daysAgo: 45,
        badge: item.type === 'album' ? '2026 Album' : '2026 Single',
      };
    }
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    const now = Date.now();
    const diffMs = now - dateObj.getTime();
    const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    let badge = 'New Release';
    if (daysAgo === 0) badge = 'Released Today';
    else if (daysAgo === 1) badge = 'Yesterday';
    else if (daysAgo <= 7) badge = `${daysAgo}d ago`;
    else if (daysAgo <= 14) badge = '1w ago';
    else if (daysAgo <= 30) badge = `${Math.ceil(daysAgo / 7)}w ago`;
    else if (daysAgo <= 90) badge = `${Math.floor(daysAgo / 30)}mo ago`;
    else badge = dateObj.getFullYear() ? String(dateObj.getFullYear()) : 'Fresh';

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');

    return {
      dateStr: `${y}-${m}-${d}`,
      daysAgo,
      badge,
    };
  }

  return {
    dateStr: '',
    daysAgo: 999,
    badge: item.type === 'album' ? 'New Album' : 'New Release',
  };
};

/**
 * Calculates in-app trending songs based on real listening activity in Firebase & local play events.
 * Weights:
 * - Played in last 24h: 3x weight
 * - Played in last 7 days: 2x weight
 * - Older plays: 1x weight
 * - User liked: +2 weight
 */
export const calculateAppTrending = (
  communityHistory = [],
  userHistory = [],
  likedIds = new Set(),
  globalTrending = [],
  seenIds = new Set(),
  limit = 5
) => {
  const scores = new Map();
  const trackMap = new Map();
  const now = Date.now();

  const processTrack = (track, timestamp) => {
    if (!track) return;
    const vid = String(track.videoId || track.video_id || track.id || '');
    if (!vid) return;

    if (!trackMap.has(vid)) {
      trackMap.set(vid, {
        ...track,
        videoId: vid,
        video_id: vid,
        id: track.id || vid,
      });
    }

    let weight = 1;
    if (timestamp) {
      const ageHours = (now - timestamp) / (1000 * 60 * 60);
      if (ageHours <= 24) weight = 3;
      else if (ageHours <= 168) weight = 2; // 7 days
    }

    if (likedIds.has(vid)) {
      weight += 2;
    }

    scores.set(vid, (scores.get(vid) || 0) + weight);
  };

  // 1. Process community plays from Firebase
  if (Array.isArray(communityHistory)) {
    communityHistory.forEach((item) => {
      processTrack(item, item.lastPlayedAt || item.playedAt);
    });
  }

  // 2. Process local user search/history plays
  if (Array.isArray(userHistory)) {
    userHistory.forEach((item) => {
      processTrack(item, item.playedAt || item.timestamp);
    });
  }

  // Sort app-played tracks by aggregated activity score
  const rankedFromApp = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([vid, score]) => ({
      ...trackMap.get(vid),
      appActivityScore: score,
      badge: 'Trending on Staytup',
    }));

  const results = [];

  // Pick top items from app ranking
  for (const track of rankedFromApp) {
    const vid = track.videoId || track.id;
    if (!seenIds.has(vid)) {
      seenIds.add(vid);
      results.push(track);
      if (results.length >= limit) break;
    }
  }

  // If app activity has fewer than limit, backfill with high-velocity tracks from global trending
  if (results.length < limit && Array.isArray(globalTrending)) {
    for (const track of globalTrending) {
      const vid = String(track.videoId || track.video_id || track.id || '');
      if (vid && !seenIds.has(vid)) {
        seenIds.add(vid);
        results.push({
          ...track,
          badge: 'Trending Now',
        });
        if (results.length >= limit) break;
      }
    }
  }

  // Assign 1-indexed formatted rank numbers
  return results.slice(0, limit).map((track, i) => ({
    ...track,
    rank: String(i + 1).padStart(2, '0'),
  }));
};

/**
 * Filters and prioritizes fresh music released in the last 30 days.
 * 0–7 days: Very high priority
 * 8–14 days: High priority
 * 15–30 days: Medium priority
 * 31–90 days: Lower priority
 */
export const filterAndRankNewReleases = (rawItems = [], seenIds = new Set(), limit = 8) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const candidates = [];

  for (const item of rawItems) {
    const vid = String(item.videoId || item.video_id || item.id || '');
    if (!vid || seenIds.has(vid)) continue;

    const { dateStr, daysAgo, badge } = parseReleaseDate(item);

    // Compute freshness score
    let freshnessScore = 10;
    if (daysAgo <= 7) freshnessScore = 100;
    else if (daysAgo <= 14) freshnessScore = 80;
    else if (daysAgo <= 30) freshnessScore = 60;
    else if (daysAgo <= 90) freshnessScore = 30;

    candidates.push({
      item: {
        ...item,
        releaseDate: dateStr,
        releaseBadge: badge,
      },
      vid,
      freshnessScore,
      daysAgo,
    });
  }

  // Sort primarily by freshness score descending, then by exact daysAgo ascending
  candidates.sort((a, b) => {
    if (b.freshnessScore !== a.freshnessScore) {
      return b.freshnessScore - a.freshnessScore;
    }
    return a.daysAgo - b.daysAgo;
  });

  const selected = [];
  for (const cand of candidates) {
    if (!seenIds.has(cand.vid)) {
      seenIds.add(cand.vid);
      selected.push(cand.item);
      if (selected.length >= limit) break;
    }
  }

  return selected;
};

/**
 * Extracts popular chart songs, strictly excluding songs already surfaced in seenIds.
 */
export const getPopularRightNow = (globalTrending = [], seenIds = new Set(), limit = 5) => {
  if (!Array.isArray(globalTrending)) return [];

  const results = [];

  for (const track of globalTrending) {
    const vid = String(track.videoId || track.video_id || track.id || '');
    if (!vid || seenIds.has(vid)) continue;

    seenIds.add(vid);
    results.push({
      ...track,
      badge: `#${results.length + 1} on Charts`,
      rank: String(results.length + 1).padStart(2, '0'),
    });

    if (results.length >= limit) break;
  }

  return results;
};

/**
 * Extracts popular albums, avoiding duplicates.
 */
export const getPopularAlbums = (rawAlbums = [], seenIds = new Set(), limit = 8) => {
  if (!Array.isArray(rawAlbums)) return [];

  const results = [];
  const seenAlbumTitles = new Set();

  for (const album of rawAlbums) {
    const aid = String(album.id || album.albumId || '');
    const titleNorm = (album.title || album.name || '').toLowerCase().trim();
    if (!aid || seenIds.has(aid) || seenAlbumTitles.has(titleNorm)) continue;

    seenIds.add(aid);
    seenAlbumTitles.add(titleNorm);
    results.push(album);

    if (results.length >= limit) break;
  }

  return results;
};

/**
 * Extracts popular playlists.
 */
export const getPopularPlaylists = (rawPlaylists = [], limit = 8) => {
  if (!Array.isArray(rawPlaylists)) return [];

  const results = [];
  const seenTitles = new Set();

  for (const p of rawPlaylists) {
    const titleNorm = (p.title || p.name || '').toLowerCase().trim();
    if (seenTitles.has(titleNorm)) continue;

    seenTitles.add(titleNorm);
    results.push(p);

    if (results.length >= limit) break;
  }

  return results;
};


// ============================================================================
// IN-MEMORY & STORAGE FEED CACHE
// ============================================================================
let memorySmartFeedCache = null;
let memorySmartFeedTimestamp = 0;
let inflightFeedPromise = null;
const FEED_CACHE_KEY = 'staytup_cached_smart_feed';
const FEED_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

/**
 * Retrieve cached feed immediately from memory or persistent storage.
 * Enables 0ms instantaneous Home page rendering without loading flash.
 */
export const getCachedSmartFeed = () => {
  if (memorySmartFeedCache) return memorySmartFeedCache;

  try {
    const raw = sessionStorage.getItem(FEED_CACHE_KEY) || localStorage.getItem(FEED_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.feed) {
        memorySmartFeedCache = parsed.feed;
        memorySmartFeedTimestamp = parsed.timestamp || 0;
        return memorySmartFeedCache;
      }
    }
  } catch (e) {}

  return null;
};

/**
 * Check if the cached smart feed is still fresh within TTL
 */
export const isSmartFeedFresh = () => {
  if (!memorySmartFeedCache) {
    getCachedSmartFeed();
  }
  return !!memorySmartFeedCache && Date.now() - memorySmartFeedTimestamp < FEED_CACHE_TTL_MS;
};

/**
 * Invalidate cached feed (e.g. on user logout or manual pull-to-refresh)
 */
export const clearSmartFeedCache = () => {
  memorySmartFeedCache = null;
  memorySmartFeedTimestamp = 0;
  inflightFeedPromise = null;
  try {
    sessionStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_KEY);
  } catch (e) {}
};

/**
 * Load and curate the smart home feed dynamically with caching & in-flight deduplication
 */
export const loadSmartFeed = async (user = null, forceRefresh = false) => {
  // 1. If fresh cache exists and not forced, return cached feed instantly
  if (!forceRefresh && isSmartFeedFresh() && memorySmartFeedCache) {
    return memorySmartFeedCache;
  }

  // 2. If a fetch is already in flight, reuse the promise to prevent duplicate API requests
  if (inflightFeedPromise) {
    return inflightFeedPromise;
  }

  inflightFeedPromise = (async () => {
    try {
      const userId = user?.id || localStorage.getItem('staytup_user_id') || '';

  // 1. Fetch data concurrently
  const [homeRes, communityRes, playlistsRes, albumsRes] = await Promise.allSettled([
    api.getHomeFeed(userId),
    getCommunityListeningHistoryFromFirebase(),
    api.search('trending hits 2026', 'playlists', 0, 10),
    api.search('top albums 2026', 'albums', 0, 10),
  ]);

  const homeData = homeRes.status === 'fulfilled' ? homeRes.value : null;
  const communityHistory = communityRes.status === 'fulfilled' ? communityRes.value : [];
  const searchPlaylists = playlistsRes.status === 'fulfilled' ? playlistsRes.value?.playlists || playlistsRes.value?.results || [] : [];
  const searchAlbums = albumsRes.status === 'fulfilled' ? albumsRes.value?.albums || albumsRes.value?.results || [] : [];

  // 2. Read local user play data
  let userHistory = [];
  let userFavorites = new Set();
  try {
    userHistory = JSON.parse(localStorage.getItem('staytup_search_played') || '[]');
  } catch (e) {}
  try {
    const favs = JSON.parse(localStorage.getItem('staytup_favorites') || '[]');
    userFavorites = new Set(favs.map((f) => String(f.videoId || f.id || '')));
  } catch (e) {}

  const rawTrending = homeData?.trending || [];
  const rawNewReleases = homeData?.newReleases || [];

  // Combine raw albums from home feed & search
  const combinedAlbums = [
    ...rawNewReleases.filter((i) => i.type === 'album'),
    ...searchAlbums,
  ];

  // Global deduplication Set
  const seenIds = new Set();

  // 3. Smart pipeline execution:
  // Step A: Trending on This App (Top 5)
  const trendingOnApp = calculateAppTrending(
    communityHistory,
    userHistory,
    userFavorites,
    rawTrending,
    seenIds,
    5
  );

  // Step B: New Releases (5–8 fresh items)
  const newReleases = filterAndRankNewReleases(rawNewReleases, seenIds, 8);

  // Step C: Popular Right Now (Top 5 chart hits, deduplicated against Trending on App & New Releases)
  const popularRightNow = getPopularRightNow(rawTrending, seenIds, 5);

  // Step D: Popular Albums (5–8 items)
  const popularAlbums = getPopularAlbums(combinedAlbums, seenIds, 8);

  // Step E: Popular Playlists (5–8 items)
  const popularPlaylists = getPopularPlaylists(searchPlaylists, 8);

  // Step F: Jump Back In (Strictly genuine user recently played, no fake filler)
  let jumpBackIn = [];
  try {
    const recents = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
    if (Array.isArray(recents) && recents.length > 0) {
      jumpBackIn = recents.slice(0, 10);
    } else if (Array.isArray(userHistory) && userHistory.length > 0) {
      jumpBackIn = userHistory.slice(0, 10);
    }
  } catch (e) {}

  // Step G: Curated Trending Artists with Real Batch Images
  const popularArtistNames = [
    'Arijit Singh',
    'Karan Aujla',
    'Diljit Dosanjh',
    'Shreya Ghoshal',
    'Pritam',
    'AP Dhillon',
    'Sidhu Moose Wala',
    'Badshah',
    'Anuv Jain',
    'Atif Aslam',
  ];

  let popularArtists = popularArtistNames.map((name) => ({
    name,
    id: name,
    image: '',
  }));

  try {
    const imageRes = await api.getBatchArtistImages(popularArtistNames).catch(() => null);
    if (imageRes?.images) {
      popularArtists = popularArtists.map((a) => ({
        ...a,
        image: imageRes.images[a.name] || '',
      }));
    }
  } catch (e) {}

  // Step H: "Because You Listen To [Top Artist]" (Intelligent Personalization)
  let becauseYouListenTo = null;
  try {
    // Extract top listened artist from recents or favorites
    const artistPlayCounts = new Map();
    const candidateTracks = [...jumpBackIn, ...Array.from(userFavorites)];
    candidateTracks.forEach((t) => {
      const aStr = typeof t === 'object' ? t.artist || t.author || '' : '';
      if (aStr) {
        aStr.split(/[,&/]|(?:\s+feat\.?\s+)|\s+ft\.?\s+/i).forEach((part) => {
          const clean = part.trim();
          if (clean && clean.length > 2 && clean.toLowerCase() !== 'various artists') {
            artistPlayCounts.set(clean, (artistPlayCounts.get(clean) || 0) + 1);
          }
        });
      }
    });

    const sortedArtists = Array.from(artistPlayCounts.entries()).sort((a, b) => b[1] - a[1]);
    const topArtistName = sortedArtists[0]?.[0];

    if (topArtistName) {
      const topArtistRes = await api.search(`artist:"${topArtistName}"`, 'songs', 0, 10).catch(() => null);
      const tracks = (topArtistRes?.tracks || topArtistRes?.results || []).filter((t) => {
        const tid = t.videoId || t.video_id || t.id;
        return tid && !seenIds.has(tid);
      });
      if (tracks.length >= 3) {
        tracks.forEach((t) => seenIds.add(t.videoId || t.id));
        becauseYouListenTo = {
          artistName: topArtistName,
          tracks: tracks.slice(0, 8),
        };
      }
    }
  } catch (e) {}

  // Step I: "From Artists You Follow" (Strictly real followed artists)
  let fromFollowedArtists = null;
  try {
    const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
    if (Array.isArray(stored) && stored.length > 0) {
      // Pick a followed artist
      const randomFollowed = stored[Math.floor(Math.random() * stored.length)];
      const faName = typeof randomFollowed === 'string' ? randomFollowed : randomFollowed?.name;
      if (faName) {
        const faRes = await api.search(`artist:"${faName}"`, 'songs', 0, 10).catch(() => null);
        const faTracks = (faRes?.tracks || faRes?.results || []).filter((t) => {
          const tid = t.videoId || t.video_id || t.id;
          return tid && !seenIds.has(tid);
        });
        if (faTracks.length >= 2) {
          faTracks.forEach((t) => seenIds.add(t.videoId || t.id));
          fromFollowedArtists = {
            artistName: faName,
            artistImage: typeof randomFollowed === 'object' ? randomFollowed.image : '',
            tracks: faTracks.slice(0, 8),
          };
        }
      }
    }
  } catch (e) {}

  // Step J: Curated Mood & Vibe Playlists
  const moodMixes = [
    { id: 'mood_lofi', title: 'Chill & Lo-Fi', subtitle: 'Slowed beats & cozy acoustics', image: 'https://i.pinimg.com/736x/81/72/26/817226cbcea560a00430ec74c97c9358.jpg', query: 'chill lofi hindi' },
    { id: 'mood_punjabi', title: 'Punjabi Hits', subtitle: 'Hustle, drip & high-energy beats', image: 'https://i.pinimg.com/1200x/b0/99/60/b09960b3cc975e1f0a85ec3e423ff35b.jpg', query: 'punjabi hits 2026' },
    { id: 'mood_romantic', title: 'Romantic Melodies', subtitle: 'Soulful love songs for the heart', image: 'https://i.pinimg.com/736x/fe/81/a9/fe81a9e69e2a9f402463582cf0ddae93.jpg', query: 'romantic hindi hits' },
    { id: 'mood_retro', title: 'Bollywood Classics', subtitle: 'Golden 90s & 2000s timeless hits', image: 'https://i.pinimg.com/736x/24/22/f6/2422f6c3694bbc2c7bcb2def37dca470.jpg', query: '90s bollywood hits' },
    { id: 'mood_party', title: 'Club & Dance Bangers', subtitle: 'Nonstop party & festival drops', image: 'https://i.pinimg.com/736x/df/a0/93/dfa093f4376b1402f8a9b09ae9223405.jpg', query: 'party hindi dance songs' },
    { id: 'mood_indie', title: 'Indie Pop Discovery', subtitle: 'Fresh acoustic voices & stories', image: 'https://i.pinimg.com/736x/e7/b3/1f/e7b31fb612f78536804721cedbe6ca07.jpg', query: 'indian indie pop' },
  ];

  // Step K: Today's Biggest Hits (Curated tracks from trending)
  const todaysHits = Array.isArray(rawTrending) && rawTrending.length > 0 ? rawTrending.slice(0, 10) : [];

      const result = {
        trendingOnApp: trendingOnApp.length > 0 ? trendingOnApp : null,
        newReleases: newReleases.length > 0 ? newReleases : null,
        popularRightNow: popularRightNow.length > 0 ? popularRightNow : null,
        popularAlbums: popularAlbums.length > 0 ? popularAlbums : null,
        popularPlaylists: popularPlaylists.length > 0 ? popularPlaylists : null,
        jumpBackIn: jumpBackIn.length > 0 ? jumpBackIn : null,
        becauseYouListenTo,
        fromFollowedArtists,
        popularArtists,
        moodMixes,
        todaysHits: todaysHits.length > 0 ? todaysHits : null,
      };

      // Update in-memory and persistent storage caches
      memorySmartFeedCache = result;
      memorySmartFeedTimestamp = Date.now();
      try {
        const payload = JSON.stringify({ feed: result, timestamp: memorySmartFeedTimestamp });
        sessionStorage.setItem(FEED_CACHE_KEY, payload);
        localStorage.setItem(FEED_CACHE_KEY, payload);
      } catch (e) {}

      return result;
    } finally {
      inflightFeedPromise = null;
    }
  })();

  return inflightFeedPromise;
};
