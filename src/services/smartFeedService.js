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

/**
 * Load and curate the smart home feed dynamically
 */
export const loadSmartFeed = async (user = null) => {
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

  // Step F: Jump Back In (User's recently played or listening history, fallback to trending)
  let jumpBackIn = [];
  try {
    const recents = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
    if (Array.isArray(recents) && recents.length > 0) {
      jumpBackIn = recents.slice(0, 10);
    } else if (Array.isArray(userHistory) && userHistory.length > 0) {
      jumpBackIn = userHistory.slice(0, 10);
    }
  } catch (e) {}

  if (jumpBackIn.length === 0 && Array.isArray(rawTrending) && rawTrending.length > 4) {
    jumpBackIn = rawTrending.slice(4, 12);
  }

  // Step G: Curated Popular Artists
  const popularArtists = [
    { name: 'Arijit Singh', id: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' },
    { name: 'Karan Aujla', id: 'Karan Aujla', image: '' },
    { name: 'Diljit Dosanjh', id: 'Diljit Dosanjh', image: '' },
    { name: 'Shreya Ghoshal', id: 'Shreya Ghoshal', image: '' },
    { name: 'Pritam', id: 'Pritam', image: '' },
    { name: 'AP Dhillon', id: 'AP Dhillon', image: '' },
    { name: 'Sidhu Moose Wala', id: 'Sidhu Moose Wala', image: '' },
    { name: 'Badshah', id: 'Badshah', image: '' },
    { name: 'Anuv Jain', id: 'Anuv Jain', image: '' },
    { name: 'Atif Aslam', id: 'Atif Aslam', image: '' },
  ];

  // Step H: Curated Mood & Vibe Playlists
  const moodMixes = [
    { id: 'mood_lofi', title: 'Chill & Lo-Fi', subtitle: 'Slowed beats & cozy acoustics', image: 'https://c.saavncdn.com/editorial/ChillLoFi_20241010120522_500x500.jpg', query: 'chill lofi hindi' },
    { id: 'mood_punjabi', title: 'Punjabi Hits', subtitle: 'Hustle, drip & high-energy beats', image: 'https://c.saavncdn.com/editorial/PunjabiHits2024_20241009101737_500x500.jpg', query: 'punjabi hits 2026' },
    { id: 'mood_romantic', title: 'Romantic Melodies', subtitle: 'Soulful love songs for the heart', image: 'https://c.saavncdn.com/editorial/RomanticMelodies_20241010120649_500x500.jpg', query: 'romantic hindi hits' },
    { id: 'mood_retro', title: 'Bollywood Classics', subtitle: 'Golden 90s & 2000s timeless hits', image: 'https://c.saavncdn.com/editorial/BollywoodClassics_20241010120523_500x500.jpg', query: '90s bollywood hits' },
    { id: 'mood_party', title: 'Club & Dance Bangers', subtitle: 'Nonstop party & festival drops', image: 'https://c.saavncdn.com/editorial/ClubAndDance_20241010120524_500x500.jpg', query: 'party hindi dance songs' },
    { id: 'mood_indie', title: 'Indie Pop Discovery', subtitle: 'Fresh acoustic voices & stories', image: 'https://c.saavncdn.com/editorial/IndiePop_20241010120525_500x500.jpg', query: 'indian indie pop' },
  ];

  // Step I: Today's Biggest Hits (Curated tracks from trending)
  const todaysHits = Array.isArray(rawTrending) && rawTrending.length > 0 ? rawTrending.slice(0, 10) : [];

  return {
    trendingOnApp: trendingOnApp.length > 0 ? trendingOnApp : null,
    newReleases: newReleases.length > 0 ? newReleases : null,
    popularRightNow: popularRightNow.length > 0 ? popularRightNow : null,
    popularAlbums: popularAlbums.length > 0 ? popularAlbums : null,
    popularPlaylists: popularPlaylists.length > 0 ? popularPlaylists : null,
    jumpBackIn: jumpBackIn.length > 0 ? jumpBackIn : null,
    popularArtists,
    moodMixes,
    todaysHits: todaysHits.length > 0 ? todaysHits : null,
  };
};
