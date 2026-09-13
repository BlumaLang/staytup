import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/endpoints';
import {
  ensureFirebaseAuth,
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

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('staytup_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isOnboarded, setIsOnboarded] = useState(() => {
    return localStorage.getItem('staytup_onboarded') === 'true';
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      let currentUserId = localStorage.getItem('staytup_user_id');
      if (!currentUserId) {
        currentUserId = 'user_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('staytup_user_id', currentUserId);
      }

      // Initialize Firebase Auth
      ensureFirebaseAuth().catch(() => {});

      if (user) {
        // Sync profile to Firebase
        saveUserProfileToFirebase(user.id || currentUserId, user).catch(() => {});

        try {
          const profile = await api.getUserProfile(user.id || currentUserId);
          if (profile && profile.username) {
            setUser(prev => ({
              ...prev,
              ...profile,
            }));
            if (profile.languages?.length > 0) {
              setIsOnboarded(true);
              localStorage.setItem('staytup_onboarded', 'true');
            }
          }
        } catch (err) {
          // If offline or first time, continue with local state
        }
      }
      setIsLoadingAuth(false);
    };

    initAuth();
  }, []);

  const login = async (username, avatarIndex = 0) => {
    let currentUserId = localStorage.getItem('staytup_user_id');
    if (!currentUserId) {
      currentUserId = 'user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('staytup_user_id', currentUserId);
    }

    const avatarUrl = MEMOJI_AVATARS[avatarIndex] || MEMOJI_AVATARS[0];
    const newUser = {
      id: currentUserId,
      username: username.trim() || 'Music Lover',
      displayName: username.trim() || 'Music Lover',
      avatar: avatarUrl,
      avatarIndex,
      languages: user?.languages || ['hindi', 'english'],
      favoriteArtists: user?.favoriteArtists || [],
    };

    setUser(newUser);
    localStorage.setItem('staytup_user', JSON.stringify(newUser));
    localStorage.setItem('staytup_user_id', newUser.id);

    // Sync with Firebase
    saveUserProfileToFirebase(newUser.id, newUser).catch(() => {});

    try {
      await api.onboardUser({
        user_id: newUser.id,
        username: newUser.username,
        languages: newUser.languages,
        favoriteArtists: newUser.favoriteArtists,
      });
    } catch (err) {
      console.warn('Failed to sync profile to server:', err);
    }

    return newUser;
  };

  const completeOnboarding = async (languages, favoriteArtists) => {
    let currentUserId = user?.id || localStorage.getItem('staytup_user_id');
    if (!currentUserId) {
      currentUserId = 'user_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('staytup_user_id', currentUserId);
    }

    const updatedUser = {
      ...(user || {
        id: currentUserId,
        username: 'Listener',
        displayName: 'Listener',
        avatar: MEMOJI_AVATARS[0],
      }),
      languages,
      favoriteArtists,
    };

    setUser(updatedUser);
    setIsOnboarded(true);
    localStorage.setItem('staytup_user', JSON.stringify(updatedUser));
    localStorage.setItem('staytup_onboarded', 'true');

    // Sync profile and favorite artists with Firebase Realtime Database
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

  const logout = () => {
    localStorage.removeItem('staytup_user');
    localStorage.removeItem('staytup_onboarded');
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
