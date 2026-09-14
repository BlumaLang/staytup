import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  serverTimestamp,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD-mRppofIyLkhgTs7o2nQjrrSru9fAzwY",
  authDomain: "staytupnow.firebaseapp.com",
  databaseURL: "https://staytupnow-default-rtdb.firebaseio.com",
  projectId: "staytupnow",
  storageBucket: "staytupnow.firebasestorage.app",
  messagingSenderId: "587558849306",
  appId: "1:587558849306:web:32f77a9805636af31bfaa3",
  measurementId: "G-EQ0GJYR33L"
};

// Safe initialization
let app;
let auth;
let database;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
} catch (e) {
  console.warn('Firebase initialization error:', e);
}

export { app, auth, database };

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google Popup via Firebase
 */
export const signInWithGoogle = async () => {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Firebase Google Sign-In error:', err);
    throw err;
  }
};

/**
 * Sign out from Firebase
 */
export const signOutFirebase = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
};

/**
 * Listen for Firebase Auth State Changes
 */
export const onFirebaseAuthStateChanged = (callback) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

/**
 * Check if a user is currently authenticated
 */
export const ensureFirebaseAuth = async () => {
  if (!auth) return null;
  return auth.currentUser || null;
};

/**
 * Save / update user profile in Realtime Database
 */
export const saveUserProfileToFirebase = async (userId, profileData) => {
  if (!database || !userId) return;
  try {
    const userRef = ref(database, `users/${userId}/profile`);
    await update(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firebase profile sync error:', err);
  }
};

/**
 * Fetch user profile from Firebase
 */
export const getUserProfileFromFirebase = async (userId) => {
  if (!database || !userId) return null;
  try {
    const snapshot = await get(ref(database, `users/${userId}/profile`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (err) {
    console.warn('Firebase get profile error:', err);
    return null;
  }
};

/**
 * Record track play to user listening history in Firebase
 */
export const recordTrackHistoryToFirebase = async (userId, track) => {
  if (!database || !userId || !track) return;
  try {
    const trackId = track.videoId || track.video_id || track.id;
    if (!trackId) return;

    const historyRef = ref(database, `users/${userId}/history/${trackId}`);
    const trackPayload = {
      videoId: String(trackId),
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || '',
      image: track.image || track.thumbnail || track.artwork_url || '',
      playedAt: Date.now(),
    };
    await set(historyRef, trackPayload);

    // Also record into public global Community History in Firebase
    const communityTrackRef = ref(database, `community/history/${trackId}`);
    await set(communityTrackRef, {
      ...trackPayload,
      lastPlayedBy: userId,
      lastPlayedAt: Date.now(),
    });

    // Also update current live presence status
    const presenceRef = ref(database, `presence/${userId}`);
    await set(presenceRef, {
      status: 'Listening now',
      trackTitle: track.title || '',
      trackArtist: track.artist || '',
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('Firebase history record error:', err);
  }
};

/**
 * Fetch specific user's listening history from Firebase
 */
export const getUserHistoryFromFirebase = async (userId) => {
  if (!database || !userId) return [];
  try {
    const snapshot = await get(ref(database, `users/${userId}/history`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const tracks = Object.values(data);
      tracks.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
      return tracks;
    }
  } catch (err) {
    console.warn('Firebase get user history error:', err);
  }
  return [];
};

/**
 * Fetch global community listened songs aggregated across all users from Firebase
 */
export const getCommunityListeningHistoryFromFirebase = async () => {
  if (!database) return [];
  try {
    const snapshot = await get(ref(database, 'community/history'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const tracks = Object.values(data);
      // Sort newest first
      tracks.sort((a, b) => (b.lastPlayedAt || b.playedAt || 0) - (a.lastPlayedAt || a.playedAt || 0));
      return tracks;
    }
    // Also check all users history if community/history is empty
    const usersSnapshot = await get(ref(database, 'users'));
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      const allTracks = [];
      const seen = new Set();
      Object.values(users).forEach(u => {
        if (u.history) {
          Object.values(u.history).forEach(h => {
            const sid = h.videoId || h.id;
            if (sid && !seen.has(sid)) {
              seen.add(sid);
              allTracks.push(h);
            }
          });
        }
      });
      allTracks.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
      return allTracks;
    }
    return [];
  } catch (err) {
    console.warn('Firebase get community history error:', err);
    return [];
  }
};

/**
 * Sync followed artists to Firebase
 */
export const syncFollowedArtistsToFirebase = async (userId, followedList) => {
  if (!database || !userId || !Array.isArray(followedList)) return;
  try {
    const artistsRef = ref(database, `users/${userId}/followedArtists`);
    await set(artistsRef, followedList);
  } catch (err) {
    console.warn('Firebase followed artists sync error:', err);
  }
};

/**
 * Sync favorites to Firebase
 */
export const syncFavoritesToFirebase = async (userId, favoritesList) => {
  if (!database || !userId || !Array.isArray(favoritesList)) return;
  try {
    const favsRef = ref(database, `users/${userId}/favorites`);
    await set(favsRef, favoritesList);
  } catch (err) {
    console.warn('Firebase favorites sync error:', err);
  }
};

/**
 * Save Daily 12 AM Feed to Firebase
 */
export const saveDailyFeedToFirebase = async (userId, dateStr, tracks) => {
  if (!database || !userId || !dateStr || !Array.isArray(tracks)) return;
  try {
    const feedRef = ref(database, `users/${userId}/dailyFeeds/${dateStr}`);
    await set(feedRef, {
      date: dateStr,
      generatedAt: Date.now(),
      tracks: tracks.slice(0, 50),
    });
  } catch (err) {
    console.warn('Firebase save daily feed error:', err);
  }
};

/**
 * Retrieve Daily Feed for a specific date from Firebase
 */
export const getDailyFeedFromFirebase = async (userId, dateStr) => {
  if (!database || !userId || !dateStr) return null;
  try {
    const snapshot = await get(ref(database, `users/${userId}/dailyFeeds/${dateStr}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Array.isArray(data.tracks) ? data.tracks : null;
    }
    return null;
  } catch (err) {
    console.warn('Firebase get daily feed error:', err);
    return null;
  }
};

/**
 * Sync Friends & Blends in Firebase
 */
export const syncFriendBlendToFirebase = async (userId, friendId, blendTracks) => {
  if (!database || !userId || !friendId) return;
  try {
    const blendId = [userId, friendId].sort().join('_');
    const blendRef = ref(database, `blends/${blendId}`);
    await set(blendRef, {
      users: [userId, friendId],
      updatedAt: Date.now(),
      tracks: blendTracks,
    });
  } catch (err) {
    console.warn('Firebase friend blend sync error:', err);
  }
};
