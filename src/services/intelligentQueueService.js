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
 * Generates intelligent queue recommendations based on current track and user music preferences.
 * Incorporates:
 * 1. Primary artist continuity (authentic artist tracks via resolved ID)
 * 2. Followed artists releases (from staytup_followed_artists)
 * 3. User affinity (history & favorites)
 * 4. Provider trending chart hits
 * Strict deduplication by canonical track ID (never repeats current track or queue tracks).
 *
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
  if (!currentTrack) return [];

  const candidates = [];
  const artists = extractArtistNames(currentTrack);
  const primaryArtist = artists[0] || '';
  const userLang = user?.languages?.[0] || 'hindi';
  const currentTrackId = getTrackId(currentTrack);

  // 1. Fetch tracks from primary artist (continuity)
  const artistPromise = (async () => {
    if (!primaryArtist) return [];
    try {
      const artistRes = await api.searchArtists(primaryArtist, 1).catch(() => null);
      const artistId = artistRes?.artists?.[0]?.id;
      if (artistId) {
        const page = Math.floor(Math.random() * 2) + 1;
        const res = await api.getArtistSongs(artistId, page, 12).catch(() => null);
        const songs = res?.tracks || res?.results || [];
        if (songs.length > 0) return songs;
      }
      const searchRes = await api.search(`artist:"${primaryArtist}"`, 'songs', 0, 12).catch(() => null);
      return searchRes?.tracks || searchRes?.results || [];
    } catch {
      return [];
    }
  })();

  // 2. Fetch tracks from followed artists
  const followedArtistsPromise = (async () => {
    try {
      const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      if (!Array.isArray(stored) || stored.length === 0) return [];
      // Pick up to 2 followed artists at random to discover variety
      const shuffled = [...stored].sort(() => Math.random() - 0.5).slice(0, 2);
      const results = [];
      for (const fa of shuffled) {
        const name = typeof fa === 'string' ? fa : fa?.name;
        if (!name || name.toLowerCase() === primaryArtist.toLowerCase()) continue;
        const res = await api.search(`artist:"${name}"`, 'songs', 0, 6).catch(() => null);
        const tracks = res?.tracks || res?.results || [];
        results.push(...tracks);
      }
      return results;
    } catch {
      return [];
    }
  })();

  // 3. Fetch user's actual favorite & recently played tracks (affinity)
  const userAffinityPromise = (async () => {
    const list = [];
    try {
      const favRaw = localStorage.getItem('staytup_favorites_tracks');
      if (favRaw) {
        const favs = JSON.parse(favRaw);
        if (Array.isArray(favs) && favs.length > 0) {
          list.push(...favs.slice(0, 8));
        }
      }
      const recRaw = localStorage.getItem('staytup_recently_played');
      if (recRaw) {
        const recs = JSON.parse(recRaw);
        if (Array.isArray(recs) && recs.length > 0) {
          list.push(...recs.slice(0, 8));
        }
      }
    } catch {}
    return list;
  })();

  // 4. Fetch fresh trending songs in user's language (discovery)
  const trendingPromise = (async () => {
    try {
      const res = await api.getTrending().catch(() => null);
      const trending = res?.trending || res?.results || [];
      if (Array.isArray(trending) && trending.length > 0) {
        return trending.slice(0, 10);
      }
      const searchRes = await api.search(`lang:${userLang} hits`, 'songs', 0, 10).catch(() => null);
      return searchRes?.tracks || searchRes?.results || [];
    } catch {
      return [];
    }
  })();

  const [artistTracks, followedTracks, userTracks, trendingTracks] = await Promise.all([
    artistPromise,
    followedArtistsPromise,
    userAffinityPromise,
    trendingPromise,
  ]);

  // Interleave the results with proper weighting
  const maxLoops = Math.max(
    artistTracks.length,
    followedTracks.length,
    userTracks.length,
    trendingTracks.length
  );

  for (let i = 0; i < maxLoops; i++) {
    if (artistTracks[i]) candidates.push(artistTracks[i]);
    if (artistTracks[i + 1]) candidates.push(artistTracks[i + 1]);
    if (followedTracks[i]) candidates.push(followedTracks[i]);
    if (userTracks[i]) candidates.push(userTracks[i]);
    if (trendingTracks[i]) candidates.push(trendingTracks[i]);
  }

  // Deduplicate against existing queue AND current playing track
  const queueWithCurrent = currentTrackId
    ? [...currentQueue, { id: currentTrackId, videoId: currentTrackId }]
    : currentQueue;

  const uniqueRecommendations = deduplicateTracks(queueWithCurrent, candidates);

  // Normalize candidate tracks to have valid videoId and artwork
  const normalized = uniqueRecommendations.map((t) => ({
    ...t,
    videoId: t.videoId || t.video_id || t.id,
    video_id: t.videoId || t.video_id || t.id,
    id: t.id || t.videoId || t.video_id,
    thumbnail: t.thumbnail || t.image || t.artwork_url || '',
    image: t.image || t.thumbnail || t.artwork_url || '',
  }));

  return normalized.slice(0, limit);
}
