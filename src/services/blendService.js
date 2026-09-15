import { api } from '../api/endpoints';
import { getAppBaseUrl } from '../utils/canonicalUrl';

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
 * Get a specific blend by ID (checks memory/localStorage, then falls back to backend)
 */
export async function getBlendById(blendId) {
  if (!blendId) return null;
  const blends = getStoredBlends();
  if (blends[blendId]) {
    return blends[blendId];
  }
  try {
    const res = await api.getBlend(blendId);
    if (res?.blend) {
      saveBlend(res.blend);
      return res.blend;
    }
  } catch (e) {}
  return null;
}

/**
 * Save a blend to local storage and sync with backend
 */
export function saveBlend(blend) {
  if (!blend?.id) return;
  try {
    const blends = getStoredBlends();
    const updated = {
      ...blend,
      updatedAt: Date.now(),
    };
    blends[blend.id] = updated;
    localStorage.setItem(BLENDS_STORAGE_KEY, JSON.stringify(blends));
    window.dispatchEvent(new CustomEvent('staytup_blends_updated', { detail: updated }));

    // Async sync to backend
    api.saveBlend(updated).catch(() => {});
  } catch (e) {}
}

/**
 * Calculate genuine music compatibility score between two listening profiles
 */
export function calculateCompatibilityScore(
  user1Favs = [],
  user2Favs = [],
  user1History = [],
  user2History = []
) {
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
  // 65 base + up to 22 from artist overlap + up to 13 from exact song overlap
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
 * Generate pairwise comparisons and mixes for any pair of members
 */
export function generatePairMix(userA, userB, historyA = [], historyB = [], favsA = [], favsB = []) {
  const { score, sharedArtistCount, sharedSongCount } = calculateCompatibilityScore(
    favsA,
    favsB,
    historyA,
    historyB
  );

  const bothLove = [];
  const freshForA = [];
  const freshForB = [];
  const seenIds = new Set();

  const idSetA = new Set(historyA.map((t) => String(t.videoId || t.video_id || t.id)));
  const idSetB = new Set(historyB.map((t) => String(t.videoId || t.video_id || t.id)));

  historyB.forEach((track) => {
    const id = String(track.videoId || track.video_id || track.id || '');
    if (id && idSetA.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      bothLove.push(track);
    }
  });

  historyB.forEach((track) => {
    const id = String(track.videoId || track.video_id || track.id || '');
    if (id && !idSetA.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      freshForA.push(track);
    }
  });

  historyA.forEach((track) => {
    const id = String(track.videoId || track.video_id || track.id || '');
    if (id && !idSetB.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      freshForB.push(track);
    }
  });

  const pairKey = [String(userA.id), String(userB.id)].sort().join(':');

  return {
    pairKey,
    userA: { id: userA.id, name: userA.displayName || userA.name || userA.username, avatar: userA.avatar || '' },
    userB: { id: userB.id, name: userB.displayName || userB.name || userB.username, avatar: userB.avatar || '' },
    matchScore: score,
    sharedArtistCount,
    sharedSongCount,
    bothLoveTracks: bothLove.slice(0, 10),
    freshForUser1Tracks: freshForA.slice(0, 10),
    freshForUser2Tracks: freshForB.slice(0, 10),
  };
}

/**
 * Get personalized relative pair mixes for the current viewing user
 * If current user is A, pairs are returned relative to A: (A + B), (A + C), etc.
 */
export function getRelativePairs(currentUser, blend) {
  if (!blend || !blend.members || blend.members.length < 2) return [];
  const currentId = String(currentUser?.id || '');
  const pairs = blend.pairs || [];

  return pairs
    .filter((p) => String(p.userA.id) === currentId || String(p.userB.id) === currentId)
    .map((p) => {
      const isA = String(p.userA.id) === currentId;
      const partner = isA ? p.userB : p.userA;
      return {
        ...p,
        partner,
        relativeTitle: `You + ${partner.name}`,
        relativeFreshForYou: isA ? p.freshForUser1Tracks : p.freshForUser2Tracks,
        relativeFreshForPartner: isA ? p.freshForUser2Tracks : p.freshForUser1Tracks,
      };
    });
}

/**
 * Create or generate a multi-user Blend
 */
export async function createOrGetBlend(currentUser, otherMembers = [], userHistory = [], userFavs = []) {
  if (!currentUser?.id) return null;

  const allMembers = [
    {
      id: currentUser.id,
      name: currentUser.displayName || currentUser.username || 'You',
      username: currentUser.username || '',
      avatar: currentUser.avatar || '',
      joinedAt: Date.now(),
    },
  ];

  const others = Array.isArray(otherMembers) ? otherMembers : [otherMembers];
  others.forEach((m) => {
    if (m && m.id && String(m.id) !== String(currentUser.id)) {
      allMembers.push({
        id: m.id,
        name: m.name || m.displayName || m.username || 'Member',
        username: m.username || '',
        avatar: m.avatar || '',
        joinedAt: Date.now(),
      });
    }
  });

  const sortedMemberIds = allMembers.map((m) => String(m.id)).sort();
  const blendId = `blend_${sortedMemberIds.join('_')}`;

  // Check existing blend
  const existing = await getBlendById(blendId);
  if (existing && existing.tracks?.length > 0) {
    return existing;
  }

  // Generate deterministic pairs
  const pairs = [];
  let totalScore = 0;
  let pairCount = 0;

  for (let i = 0; i < allMembers.length; i++) {
    for (let j = i + 1; j < allMembers.length; j++) {
      const pair = generatePairMix(allMembers[i], allMembers[j], userHistory, [], userFavs, []);
      pairs.push(pair);
      totalScore += pair.matchScore;
      pairCount++;
    }
  }

  const overallScore = pairCount > 0 ? Math.round(totalScore / pairCount) : 85;

  // Build Everyone's Mix
  let combinedTracks = [];
  const seenIds = new Set();

  userHistory.slice(0, 15).forEach((t) => {
    const id = String(t.videoId || t.video_id || t.id || '');
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      combinedTracks.push(t);
    }
  });

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

  const title =
    allMembers.length === 2
      ? `${allMembers[0].name} + ${allMembers[1].name}`
      : `${allMembers[0].name} & Friends (${allMembers.length})`;

  const blendData = {
    id: blendId,
    title,
    description: `A shared daily mix blending taste across ${allMembers.length} music lovers.`,
    members: allMembers,
    matchScore: overallScore,
    pairs,
    tracks: combinedTracks,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveBlend(blendData);
  return blendData;
}

/**
 * Generate a shareable invite link for a Blend
 */
export async function createBlendInvite(blendId, inviter) {
  const baseUrl = getAppBaseUrl();
  try {
    const res = await api.generateBlendInvite(blendId, inviter);
    if (res?.token) {
      return {
        token: res.token,
        inviteUrl: `${baseUrl}/blend/invite/${res.token}`,
      };
    }
  } catch (e) {}

  // Fallback client token
  const fallbackToken = 'bld_' + Math.random().toString(36).substring(2, 10);
  return {
    token: fallbackToken,
    inviteUrl: `${baseUrl}/blend/invite/${fallbackToken}`,
  };
}

/**
 * Resolve an invite token and join the Blend
 */
export async function joinBlendWithToken(token, user, userHistory = [], userFavs = []) {
  if (!token || !user?.id) return null;
  try {
    const res = await api.joinBlendInvite(token, user);
    if (res?.blend) {
      saveBlend(res.blend);
      return res.blend;
    }
  } catch (e) {}

  // Fallback local join
  const blends = getStoredBlends();
  for (const bId of Object.keys(blends)) {
    const b = blends[bId];
    if (b) {
      const exists = b.members?.some((m) => String(m.id) === String(user.id));
      if (!exists) {
        b.members = [...(b.members || []), { id: user.id, name: user.displayName || user.username, avatar: user.avatar || '' }];
        saveBlend(b);
        return b;
      }
      return b;
    }
  }

  return null;
}

/**
 * Delete or Leave a blend completely
 */
export function removeBlend(blendId) {
  if (!blendId) return;
  try {
    const blends = getStoredBlends();
    delete blends[blendId];
    localStorage.setItem(BLENDS_STORAGE_KEY, JSON.stringify(blends));
    window.dispatchEvent(new CustomEvent('staytup_blends_updated', { detail: { id: blendId, removed: true } }));
  } catch (e) {}
}

/**
 * Remove a specific member from a blend (or leave blend)
 */
export function removeMemberFromBlend(blendId, memberId) {
  if (!blendId || !memberId) return null;
  try {
    const blends = getStoredBlends();
    const blend = blends[blendId];
    if (!blend) return null;
    blend.members = (blend.members || []).filter((m) => String(m.id) !== String(memberId));
    if (blend.members.length === 0) {
      delete blends[blendId];
    } else {
      blends[blendId] = blend;
    }
    localStorage.setItem(BLENDS_STORAGE_KEY, JSON.stringify(blends));
    window.dispatchEvent(new CustomEvent('staytup_blends_updated', { detail: blend }));
    return blend;
  } catch (e) {
    return null;
  }
}
