/**
 * Staytup Intelligent Queue & Recommendation Service
 * Builds recommendations from real user listening history, favorites, current artist continuity, and fresh music.
 * Strict deduplication by stable song ID (never by title alone).
 */

import { api } from '../api/endpoints';

/**
 * Returns stable unique song identifier, stripping source prefixes
 */
export function getTrackId(track) {
  if (!track) return '';
  const raw = track.videoId || track.video_id || track.id;
  if (!raw) return '';
  return String(raw).replace(/^saavn_/, '').trim();
}

/**
 * Deduplicates tracks against an existing queue or set of seen IDs
 */
export function deduplicateTracks(existingQueue = [], candidates = []) {
  const seenIds = new Set();

  existingQueue.forEach((t) => {
    const id = getTrackId(t);
    if (id) seenIds.add(id);
  });

  const unique = [];
  candidates.forEach((t) => {
    if (!t) return;
    const id = getTrackId(t);
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      unique.push(t);
    }
  });

  return unique;
}

/**
 * Extracts list of artist names from track or artist string
 */
export function extractArtistNames(trackOrArtist) {
  if (!trackOrArtist) return [];
  if (Array.isArray(trackOrArtist)) {
    return trackOrArtist
      .map((a) => (typeof a === 'string' ? a : a?.name || ''))
      .filter(Boolean);
  }
  const str =
    typeof trackOrArtist === 'object'
      ? trackOrArtist.artist || trackOrArtist.artists || ''
      : String(trackOrArtist);

  if (Array.isArray(str)) {
    return str.map((a) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean);
  }

  return String(str)
    .split(/[,/&|;]|(?:\s+feat\.?\s+)|\s+ft\.?\s+|\s+with\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== 'various artists');
}

/**
 * Generates intelligent queue recommendations based on current track and user music preferences
 * @param {Object} params
 * @param {Object} params.currentTrack
 * @param {Array} params.currentQueue
 * @param {Object} [params.user]
 * @param {number} [params.limit=15]
 */
export async function generateIntelligentQueue({
  currentTrack,
  currentQueue = [],
  user = null,
  limit = 15,
}) {
  const candidates = [];
  const artists = extractArtistNames(currentTrack);
  const primaryArtist = artists[0] || '';
  const userLang = user?.languages?.[0] || 'hindi';

  // 1. Fetch tracks from the primary artist (continuity)
  const artistPromise = (async () => {
    if (!primaryArtist) return [];
    try {
      // First try resolving artist to artist ID for exact songs
      const artistRes = await api.searchArtists(primaryArtist, 1).catch(() => null);
      const artistId = artistRes?.artists?.[0]?.id;
      if (artistId) {
        const page = Math.floor(Math.random() * 2) + 1;
        const res = await api.getArtistSongs(artistId, page, 10).catch(() => null);
        return res?.tracks || res?.results || [];
      }
      const searchRes = await api.search(primaryArtist, 'songs', 0, 10).catch(() => null);
      return searchRes?.tracks || searchRes?.results || [];
    } catch {
      return [];
    }
  })();

  // 2. Fetch user's actual favorite & recently played tracks (preference affinity)
  const userAffinityPromise = (async () => {
    const list = [];
    try {
      // Check saved favorites in localStorage
      const favRaw = localStorage.getItem('staytup_favorites_tracks');
      if (favRaw) {
        const favs = JSON.parse(favRaw);
        if (Array.isArray(favs) && favs.length > 0) {
          list.push(...favs.slice(0, 10));
        }
      }
      // Check recently played in localStorage
      const recRaw = localStorage.getItem('staytup_recently_played');
      if (recRaw) {
        const recs = JSON.parse(recRaw);
        if (Array.isArray(recs) && recs.length > 0) {
          list.push(...recs.slice(0, 10));
        }
      }
    } catch {}
    return list;
  })();

  // 3. Fetch fresh trending songs in user's language (discovery)
  const trendingPromise = (async () => {
    try {
      const res = await api.search(`lang:${userLang} hits`, 'songs', 0, 15).catch(() => null);
      return res?.tracks || res?.results || [];
    } catch {
      return [];
    }
  })();

  const [artistTracks, userTracks, trendingTracks] = await Promise.all([
    artistPromise,
    userAffinityPromise,
    trendingPromise,
  ]);

  // Interleave the results: Artist (40%), User Affinity (30%), Trending (30%)
  const maxLoops = Math.max(artistTracks.length, userTracks.length, trendingTracks.length);
  for (let i = 0; i < maxLoops; i++) {
    if (artistTracks[i]) candidates.push(artistTracks[i]);
    if (artistTracks[i + 1]) candidates.push(artistTracks[i + 1]);
    if (userTracks[i]) candidates.push(userTracks[i]);
    if (trendingTracks[i]) candidates.push(trendingTracks[i]);
  }

  // Deduplicate against existing queue
  const uniqueRecommendations = deduplicateTracks(currentQueue, candidates);

  // If we still need more tracks, fetch suggestions using current song title
  if (uniqueRecommendations.length < limit && currentTrack?.title) {
    try {
      const moreRes = await api.search(`${currentTrack.title} radio`, 'songs', 0, 10).catch(() => null);
      const extraTracks = moreRes?.tracks || moreRes?.results || [];
      const extraUnique = deduplicateTracks([...currentQueue, ...uniqueRecommendations], extraTracks);
      uniqueRecommendations.push(...extraUnique);
    } catch {}
  }

  return uniqueRecommendations.slice(0, limit);
}
