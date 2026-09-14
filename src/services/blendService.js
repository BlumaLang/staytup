import { api } from '../api/endpoints';

const BLENDS_STORAGE_KEY = 'staytup_blends_v1';

/**
 * Get all stored blends from localStorage
 */
export function getStoredBlends() {
  try {
    const raw = localStorage.getItem(BLENDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Get a specific blend by ID
 */
export function getBlendById(blendId) {
  if (!blendId) return null;
  const blends = getStoredBlends();
  return blends[blendId] || null;
}

/**
 * Save a blend to storage
 */
export function saveBlend(blend) {
  if (!blend?.id) return;
  try {
    const blends = getStoredBlends();
    blends[blend.id] = {
      ...blend,
      updatedAt: Date.now(),
    };
    localStorage.setItem(BLENDS_STORAGE_KEY, JSON.stringify(blends));
  } catch (e) {}
}

/**
 * Calculate genuine music compatibility score between two listening profiles
 */
export function calculateCompatibilityScore(user1Favs = [], user2Favs = [], user1History = [], user2History = []) {
  // Extract artist sets
  const getArtists = (items) => {
    const set = new Set();
    items.forEach((item) => {
      const art = item?.artist || item?.primary_artists || '';
      if (art) {
        art.split(/[,&/]/).forEach((a) => {
          const clean = a.trim().toLowerCase();
          if (clean) set.add(clean);
        });
      }
    });
    return set;
  };

  const user1Artists = getArtists([...user1Favs, ...user1History]);
  const user2Artists = getArtists([...user2Favs, ...user2History]);

  // Extract song ID sets
  const getIds = (items) => {
    const set = new Set();
    items.forEach((item) => {
      const id = item?.videoId || item?.video_id || item?.id;
      if (id) set.add(String(id));
    });
    return set;
  };

  const user1SongIds = getIds([...user1Favs, ...user1History]);
  const user2SongIds = getIds([...user2Favs, ...user2History]);

  // Calculate overlapping artists
  let sharedArtistCount = 0;
  user1Artists.forEach((a) => {
    if (user2Artists.has(a)) sharedArtistCount++;
  });

  // Calculate overlapping songs
  let sharedSongCount = 0;
  user1SongIds.forEach((id) => {
    if (user2SongIds.has(id)) sharedSongCount++;
  });

  const totalArtists = Math.max(1, new Set([...user1Artists, ...user2Artists]).size);
  const artistRatio = sharedArtistCount / totalArtists;

  const totalSongs = Math.max(1, new Set([...user1SongIds, ...user2SongIds]).size);
  const songRatio = sharedSongCount / totalSongs;

  // Base score algorithm:
  // 60 base + up to 25 from artist overlap + up to 15 from exact song overlap
  let score = Math.round(65 + artistRatio * 22 + songRatio * 13);
  if (score > 98) score = 98;
  if (score < 62) score = 64;

  return {
    score,
    sharedArtistCount,
    sharedSongCount,
  };
}

/**
 * Create or generate a shared Blend playlist between currentUser and friend
 */
export async function createOrGetBlend(currentUser, friend, user1History = [], user2History = [], user1Favs = [], user2Favs = []) {
  if (!currentUser?.id || !friend?.id) return null;

  // Stable Blend ID based on sorted user IDs
  const sortedIds = [String(currentUser.id), String(friend.id)].sort();
  const blendId = `blend_${sortedIds[0]}_${sortedIds[1]}`;

  // Check existing blend
  const existing = getBlendById(blendId);
  if (existing && existing.tracks?.length > 0) {
    return existing;
  }

  // Calculate match score
  const { score, sharedArtistCount, sharedSongCount } = calculateCompatibilityScore(
    user1Favs,
    user2Favs,
    user1History,
    user2History
  );

  // Group songs into:
  // 1. Both love
  // 2. Fresh for user 1
  // 3. Fresh for friend
  const bothLove = [];
  const freshForUser1 = [];
  const freshForUser2 = [];
  const seenIds = new Set();

  const user1IdSet = new Set(user1History.map((t) => String(t.videoId || t.video_id || t.id)));
  const user2IdSet = new Set(user2History.map((t) => String(t.videoId || t.video_id || t.id)));

  // Tracks present in both profiles
  user2History.forEach((track) => {
    const id = String(track.videoId || track.video_id || track.id || '');
    if (id && user1IdSet.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      bothLove.push(track);
    }
  });

  // User 2 tracks fresh for User 1
  user2History.forEach((track) => {
    const id = String(track.videoId || track.video_id || track.id || '');
    if (id && !user1IdSet.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      freshForUser1.push(track);
    }
  });

  // User 1 tracks fresh for User 2
  user1History.forEach((track) => {
    const id = String(track.videoId || track.video_id || track.id || '');
    if (id && !user2IdSet.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      freshForUser2.push(track);
    }
  });

  // If there are too few tracks, supplement with trending songs from the platform
  let combinedTracks = [...bothLove, ...freshForUser1, ...freshForUser2];
  if (combinedTracks.length < 15) {
    try {
      const trending = await api.getTrending();
      const trendTracks = trending?.results || trending?.tracks || [];
      trendTracks.forEach((t) => {
        const tid = String(t.videoId || t.video_id || t.id || '');
        if (tid && !seenIds.has(tid) && combinedTracks.length < 25) {
          seenIds.add(tid);
          combinedTracks.push(t);
        }
      });
    } catch (e) {}
  }

  const blendData = {
    id: blendId,
    title: `${currentUser.displayName || currentUser.username} + ${friend.name || friend.username}`,
    description: `A personalized shared daily mix combining music taste between ${currentUser.displayName || currentUser.username} and ${friend.name || friend.username}.`,
    user1: {
      id: currentUser.id,
      name: currentUser.displayName || currentUser.username,
      avatar: currentUser.avatar || '',
    },
    user2: {
      id: friend.id,
      name: friend.name || friend.username || friend.displayName,
      avatar: friend.avatar || '',
    },
    matchScore: score,
    sharedArtistCount,
    sharedSongCount,
    bothLoveTracks: bothLove.slice(0, 10),
    freshForUser1Tracks: freshForUser1.slice(0, 10),
    freshForUser2Tracks: freshForUser2.slice(0, 10),
    tracks: combinedTracks,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveBlend(blendData);
  return blendData;
}
