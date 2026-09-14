import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/endpoints';
import {
  auth,
  ensureFirebaseAuth,
  signInWithGoogle,
  signOutFirebase,
  onFirebaseAuthStateChanged,
  saveUserProfileToFirebase,
  getUserProfileFromFirebase,
  syncFollowedArtistsToFirebase,
} from '../services/firebase';

export const MEMOJI_AVATARS = [
  './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg',
  './assets/memoji/pastel_1.d57d94d04291feeb4724fbbf06e9b7c8.jpg',
  './assets/memoji/pastel_2.f6cf7b7dd0222efabda5af3c4269179f.jpg',
  './assets/memoji/pastel_3.c5c23128aa993ca5f773a81c95c458aa.jpg',
  './assets/memoji/pastel_4.04fe7f3a2c6803af847315b3c8b1fd32.jpg',
  './assets/memoji/pastel_5.63e3300213cc824b903c47e2aaea739f.jpg',
  './assets/memoji/pastel_6.e14d34d3ea5f241aa9454db37fc7771e.jpg',
  './assets/memoji/pastel_7.06030ab5b8a6ba5b3232fb8e1ce912a1.jpg',
  './assets/memoji/pastel_8.8dfdaedc8e20d68ef0e6aa4749dedc2b.jpg',
  './assets/memoji/pastel_9.b1261f5a80059ba3c06e7a0cb0333d69.jpg',
];

/**
 * Clear all cached user data across the application
 */
export const clearAllUserData = () => {
  try {
    localStorage.removeItem('staytup_user');
    localStorage.removeItem('staytup_user_id');
    localStorage.removeItem('staytup_onboarded');
    localStorage.removeItem('staytup_contact_no');
    localStorage.removeItem('staytup_favorites');
    localStorage.removeItem('staytup_followed_artists');
    localStorage.removeItem('staytup_recently_played');
    localStorage.removeItem('staytup_playlists');
    localStorage.removeItem('staytup_playlist_folders');
    localStorage.removeItem('staytup_saved_albums');
    localStorage.removeItem('staytup_friends');
    localStorage.removeItem('staytup_friend_requests');
    localStorage.removeItem('staytup_blend_requests');
  } catch (e) {}
};

/**
 * Verify whether a user is an unauthenticated guest / mock session
 */
export const isGuestUser = (u) => {
  if (!u) return true;
  const uid = String(u.id || u.uid || '');
  return (
    uid === 'guest_user' ||
    uid.startsWith('user_') ||
    !u.email ||
    u.isGuest === true ||
    u.username === 'Music Explorer'
  );
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // If guest data exists in storage, purge immediately on boot
  const [user, setUser] = useState(() => {
    const savedId = localStorage.getItem('staytup_user_id');
    if (savedId === 'guest_user' || (savedId && savedId.startsWith('user_'))) {
      clearAllUserData();
      return null;
    }
    const saved = localStorage.getItem('staytup_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isGuestUser(parsed)) {
          clearAllUserData();
          return null;
        }
        return parsed;
      } catch (e) {
        clearAllUserData();
        return null;
      }
    }
    return null;
  });

  const [isOnboarded, setIsOnboarded] = useState(() => {
    const saved = localStorage.getItem('staytup_user');
    if (!saved) return false;
    try {
      if (isGuestUser(JSON.parse(saved))) return false;
    } catch (_) {
      return false;
    }
    return localStorage.getItem('staytup_onboarded') === 'true';
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Synchronize with Firebase Auth state on mount
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onFirebaseAuthStateChanged(async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser && firebaseUser.email) {
        try {
          const uid = firebaseUser.uid;
          localStorage.setItem('staytup_user_id', uid);

          // Retrieve user profile from Firebase Realtime Database
          let remoteProfile = await getUserProfileFromFirebase(uid);

          // Fallback to local API profile if not found in RTDB
          if (!remoteProfile) {
            try {
              remoteProfile = await api.getUserProfile(uid);
            } catch (_) {}
          }

          const resolvedUser = {
            id: uid,
            uid: uid,
            username: remoteProfile?.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staytup Listener',
            displayName: remoteProfile?.displayName || firebaseUser.displayName || 'Staytup Listener',
            email: firebaseUser.email || remoteProfile?.email || '',
            avatar: remoteProfile?.avatar || firebaseUser.photoURL || MEMOJI_AVATARS[0],
            avatarIndex: remoteProfile?.avatarIndex ?? 0,
            languages: remoteProfile?.languages || ['hindi', 'english'],
            favoriteArtists: remoteProfile?.favoriteArtists || [],
            phone: remoteProfile?.phone || localStorage.getItem('staytup_contact_no') || '',
          };

          if (isMounted) {
            setUser(resolvedUser);
            localStorage.setItem('staytup_user', JSON.stringify(resolvedUser));

            const hasCompletedOnboarding =
              resolvedUser.languages &&
              resolvedUser.languages.length > 0 &&
              resolvedUser.favoriteArtists &&
              resolvedUser.favoriteArtists.length >= 3;

            if (hasCompletedOnboarding || localStorage.getItem('staytup_onboarded') === 'true') {
              setIsOnboarded(true);
              localStorage.setItem('staytup_onboarded', 'true');
            }
          }

          // Background sync with Firebase & backend
          saveUserProfileToFirebase(uid, resolvedUser).catch(() => {});
          api.onboardUser({
            user_id: uid,
            username: resolvedUser.username,
            languages: resolvedUser.languages,
            favoriteArtists: resolvedUser.favoriteArtists,
          }).catch(() => {});
        } catch (err) {
          console.warn('Error hydrating user from Firebase:', err);
        }
      } else {
        // No valid Firebase user session -> log out guest and purge storage completely
        clearAllUserData();
        if (isMounted) {
          setUser(null);
          setIsOnboarded(false);
        }
      }

      if (isMounted) {
        setIsLoadingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  /**
   * Initiate Google Sign-In with Firebase
   * Returns authenticated user profile before finalization (allows optional contact prompt in UI)
   */
  const loginWithGoogle = async () => {
    const firebaseUser = await signInWithGoogle();
    const uid = firebaseUser.uid;

    // Fetch existing profile if available
    let existingProfile = null;
    try {
      existingProfile = await getUserProfileFromFirebase(uid);
    } catch (_) {}

    const profile = {
      id: uid,
      uid: uid,
      username: existingProfile?.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staytup Listener',
      displayName: existingProfile?.displayName || firebaseUser.displayName || 'Staytup Listener',
      email: firebaseUser.email || '',
      avatar: existingProfile?.avatar || firebaseUser.photoURL || MEMOJI_AVATARS[0],
      avatarIndex: existingProfile?.avatarIndex ?? 0,
      languages: existingProfile?.languages || ['hindi', 'english'],
      favoriteArtists: existingProfile?.favoriteArtists || [],
      phone: existingProfile?.phone || localStorage.getItem('staytup_contact_no') || '',
    };

    return { firebaseUser, profile, existingProfile };
  };

  /**
   * Finalize Login: Save profile to Firebase & state, complete sign in
   */
  const finalizeGoogleLogin = async (profile, contactNo = '') => {
    const uid = profile.id || profile.uid;
    const finalProfile = {
      ...profile,
      phone: contactNo ? contactNo : (profile.phone || ''),
    };

    setUser(finalProfile);
    localStorage.setItem('staytup_user', JSON.stringify(finalProfile));
    localStorage.setItem('staytup_user_id', uid);

    if (contactNo) {
      localStorage.setItem('staytup_contact_no', contactNo);
    }

    const hasOnboardingData =
      finalProfile.languages?.length > 0 &&
      finalProfile.favoriteArtists?.length >= 3;

    if (hasOnboardingData) {
      setIsOnboarded(true);
      localStorage.setItem('staytup_onboarded', 'true');
    }

    // Sync to Firebase RTDB and backend
    saveUserProfileToFirebase(uid, finalProfile).catch(() => {});
    api.onboardUser({
      user_id: uid,
      username: finalProfile.username,
      languages: finalProfile.languages,
      favoriteArtists: finalProfile.favoriteArtists,
    }).catch(() => {});

    return finalProfile;
  };

  /**
   * Update Profile Details (Used in Edit Profile modal)
   */
  const login = async (username, avatarIndex = 0) => {
    let currentUserId = user?.id || localStorage.getItem('staytup_user_id');
    if (!currentUserId || isGuestUser(user)) {
      return null;
    }

    const avatarUrl = MEMOJI_AVATARS[avatarIndex] || MEMOJI_AVATARS[0];
    const updated = {
      ...(user || {}),
      id: currentUserId,
      username: username.trim() || user?.username || 'Staytup Listener',
      displayName: username.trim() || user?.displayName || 'Staytup Listener',
      avatar: avatarUrl,
      avatarIndex,
    };

    setUser(updated);
    localStorage.setItem('staytup_user', JSON.stringify(updated));

    // Sync with Firebase & local backend
    saveUserProfileToFirebase(currentUserId, updated).catch(() => {});
    try {
      await api.onboardUser({
        user_id: currentUserId,
        username: updated.username,
        languages: updated.languages || ['hindi', 'english'],
        favoriteArtists: updated.favoriteArtists || [],
      });
    } catch (err) {
      console.warn('Failed to sync profile to server:', err);
    }

    return updated;
  };

  const completeOnboarding = async (languages, favoriteArtists) => {
    let currentUserId = user?.id || localStorage.getItem('staytup_user_id');
    if (!currentUserId || isGuestUser(user)) return;

    const updatedUser = {
      ...(user || {}),
      id: currentUserId,
      languages,
      favoriteArtists,
    };

    setUser(updatedUser);
    setIsOnboarded(true);
    localStorage.setItem('staytup_user', JSON.stringify(updatedUser));
    localStorage.setItem('staytup_onboarded', 'true');

    // Sync with Firebase Realtime Database
    saveUserProfileToFirebase(currentUserId, updatedUser).catch(() => {});
    if (Array.isArray(favoriteArtists)) {
      syncFollowedArtistsToFirebase(currentUserId, favoriteArtists).catch(() => {});
    }

    try {
      await api.onboardUser({
        user_id: currentUserId,
        username: updatedUser.username,
        languages,
        favoriteArtists,
      });
    } catch (err) {
      console.warn('Onboarding sync failed:', err);
    }
  };

  const logout = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
    clearAllUserData();
    setUser(null);
    setIsOnboarded(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isOnboarded,
        isLoadingAuth,
        login,
        loginWithGoogle,
        finalizeGoogleLogin,
        completeOnboarding,
        logout,
        MEMOJI_AVATARS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
