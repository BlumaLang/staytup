/**
 * Staytup Recent Activity Service
 * Manages entity-aware recent user activity (songs played, albums opened, artists visited, profiles viewed).
 * Explicitly replaces raw search query typing history with meaningful interactions.
 */

const STORAGE_KEY = 'staytup_recent_activity_v1';
const listeners = new Set();

function getStoredItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Backfill song artist if missing from historical entries
    let cachedHistory = null;
    return parsed.map((item) => {
      if (item.type === 'song' && (!item.subtitle || item.subtitle === 'Song' || !item.artist)) {
        if (!cachedHistory) {
          try {
            cachedHistory = JSON.parse(localStorage.getItem('staytup_recently_played') || '[]');
          } catch (e) {
            cachedHistory = [];
          }
        }
        const match = cachedHistory.find(
          (t) => String(t.videoId || t.video_id || t.id) === String(item.id)
        );
        if (match && (match.artist || match.artists)) {
          const artistName =
            match.artist ||
            (Array.isArray(match.artists) && match.artists.length > 0
              ? match.artists.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean).join(', ')
              : '');
          return {
            ...item,
            subtitle: artistName || item.subtitle,
            artist: artistName || item.artist,
          };
        }
      }
      return item;
    });
  } catch (e) {
    return [];
  }
}

function saveItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
  listeners.forEach((fn) => fn(items));
}

/**
 * Record a meaningful user action (playing a song, opening an album, visiting an artist or user profile).
 * @param {Object} entry
 * @param {'song'|'album'|'artist'|'playlist'|'user'} entry.type
 * @param {string} entry.id
 * @param {string} entry.title
 * @param {string} [entry.subtitle]
 * @param {string} [entry.image]
 * @param {Object} [entry.extra]
 */
export function recordRecentActivity({ type, id, title, subtitle = '', artist = '', artists = [], image = '', extra = {} }) {
  if (!type || !id || !title) return;

  const cleanId = String(id).trim();
  const cleanTitle = String(title).trim();
  if (!cleanId || !cleanTitle) return;

  const current = getStoredItems();
  
  // Collapse repeated plays / visits of the same entity
  const filtered = current.filter((item) => !(item.type === type && String(item.id) === cleanId));

  const resolvedArtist =
    artist ||
    subtitle ||
    (Array.isArray(artists) && artists.length > 0
      ? artists.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean).join(', ')
      : '');

  const newEntry = {
    type,
    id: cleanId,
    title: cleanTitle,
    subtitle: String(resolvedArtist || subtitle || '').trim(),
    artist: String(resolvedArtist || '').trim(),
    artists: Array.isArray(artists) ? artists : [],
    image: image || '',
    extra: extra || {},
    timestamp: Date.now(),
  };

  // Keep top 30 meaningful items
  const updated = [newEntry, ...filtered].slice(0, 30);
  saveItems(updated);
}

/**
 * Get recent activity items, optionally filtered by type.
 * @param {number} [limit=20]
 * @param {string} [filterType]
 */
export function getRecentActivity(limit = 20, filterType = null) {
  const items = getStoredItems();
  if (!filterType) return items.slice(0, limit);
  return items.filter((i) => i.type === filterType).slice(0, limit);
}

/**
 * Remove a specific item from recent activity.
 * @param {string} type
 * @param {string} id
 */
export function removeRecentActivity(type, id) {
  const cleanId = String(id).trim();
  const current = getStoredItems();
  const updated = current.filter((item) => !(item.type === type && String(item.id) === cleanId));
  saveItems(updated);
}

/**
 * Clear all recent activity.
 */
export function clearRecentActivity() {
  saveItems([]);
}

/**
 * Subscribe to recent activity changes.
 */
export function subscribeToRecentActivity(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
