import { api } from '../api/endpoints';

// In-memory runtime cache
const memoryCache = new Map();
const pendingRequests = new Set();
const listeners = new Set();

const STORAGE_KEY = 'staytup_artist_images_v2';

// Load stored cache from localStorage on startup
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim().length > 0) {
        memoryCache.set(normalizeKey(k), v);
      }
    });
  }
} catch (e) {}

function normalizeKey(key) {
  if (!key) return '';
  return String(key).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function persistCache() {
  try {
    const obj = {};
    memoryCache.forEach((v, k) => {
      obj[k] = v;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

const GRADIENTS = [
  'from-violet-600 to-indigo-900',
  'from-emerald-600 to-teal-900',
  'from-rose-600 to-pink-900',
  'from-amber-600 to-orange-900',
  'from-cyan-600 to-blue-900',
  'from-fuchsia-600 to-purple-900',
  'from-indigo-600 to-slate-900',
  'from-teal-600 to-emerald-950',
];

/**
 * Extracts first meaningful uppercase letter (skips 'The ', digits, special chars)
 */
export function getArtistInitial(name) {
  if (!name || typeof name !== 'string') return 'A';
  let clean = name.trim();
  if (clean.toLowerCase().startsWith('the ')) {
    clean = clean.slice(4).trim();
  }
  const match = clean.match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : (clean.charAt(0).toUpperCase() || 'A');
}

/**
 * Returns a deterministic gradient class string based on name hash
 */
export function getArtistGradient(name) {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

/**
 * Synchronously get cached artist image URL if available
 */
export function getStoredArtistImage(nameOrId) {
  if (!nameOrId) return null;
  const key = normalizeKey(nameOrId);
  return memoryCache.get(key) || null;
}

// Batch queue for batch resolution
let batchQueue = [];
let batchTimeout = null;

function processBatchQueue() {
  if (batchQueue.length === 0) return;
  const queueToProcess = [...new Set(batchQueue)];
  batchQueue = [];

  api
    .getBatchArtistImages(queueToProcess)
    .then((res) => {
      if (res?.images && typeof res.images === 'object') {
        let hasNew = false;
        Object.entries(res.images).forEach(([artistName, imgUrl]) => {
          if (imgUrl && typeof imgUrl === 'string' && !imgUrl.includes('default')) {
            const key = normalizeKey(artistName);
            memoryCache.set(key, imgUrl);
            hasNew = true;
            // Notify subscribers
            listeners.forEach((cb) => cb(key, imgUrl));
          }
        });
        if (hasNew) {
          persistCache();
        }
      }
    })
    .catch((err) => {
      console.warn('Artist batch image resolution error:', err);
    })
    .finally(() => {
      queueToProcess.forEach((k) => pendingRequests.delete(normalizeKey(k)));
    });
}

/**
 * Asynchronously queue an artist image resolution without blocking UI
 */
export function resolveArtistImage(nameOrId) {
  if (!nameOrId) return;
  const key = normalizeKey(nameOrId);
  if (memoryCache.has(key)) return;
  if (pendingRequests.has(key)) return;

  pendingRequests.add(key);
  batchQueue.push(nameOrId);

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(processBatchQueue, 80);
}

/**
 * Subscribe to artist image resolution events
 */
export function subscribeToArtistImages(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Save manual artist image override
 */
export function setArtistImage(nameOrId, imageUrl) {
  if (!nameOrId || !imageUrl) return;
  const key = normalizeKey(nameOrId);
  memoryCache.set(key, imageUrl);
  persistCache();
  listeners.forEach((cb) => cb(key, imageUrl));
}
