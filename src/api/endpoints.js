import { apiRequest } from './client';

export const api = {
  // System
  getHealth: () => apiRequest('/health'),

  // Home & Feed
  getHomeFeed: (userId, force = false) => 
    apiRequest(`/home?${userId ? `user_id=${encodeURIComponent(userId)}&` : ''}${force ? 'force=true' : ''}`),
  
  getPersonalizedFeed: (userId) => 
    apiRequest(`/feed/personalized?user_id=${encodeURIComponent(userId)}`),

  // Search & Discovery
  search: (query, type = 'songs', offset = 0, limit = 40) =>
    apiRequest(`/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}&offset=${offset}&limit=${limit}`),
  
  getSuggestions: (query) =>
    apiRequest(`/suggestions?q=${encodeURIComponent(query)}`),

  getTrending: () =>
    apiRequest('/trending'),

  // Playback & Stream
  getStreamUrl: (videoId) =>
    apiRequest(`/stream/${encodeURIComponent(videoId)}`),

  getTrack: (videoId) =>
    apiRequest(`/track/${encodeURIComponent(videoId)}`),

  getLyrics: (title, artist = '', videoId = '') =>
    apiRequest(`/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&video_id=${encodeURIComponent(videoId)}`),

  // Artists
  getPopularArtists: (lang = 'hindi', limit = 24) =>
    apiRequest(`/artists/popular?lang=${encodeURIComponent(lang)}&limit=${limit}`),

  searchArtists: (query, limit = 10) =>
    apiRequest(`/artists/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getBatchArtistImages: (artists) =>
    apiRequest('/artists/batch-images', { method: 'POST', body: { artists } }),

  getArtistSongs: (artistId, page = 1, limit = 30) =>
    apiRequest(`/artist/${encodeURIComponent(artistId)}/songs?page=${page}&limit=${limit}`),

  getArtistInfo: (artistId) =>
    apiRequest(`/artist/${encodeURIComponent(artistId)}/info`),

  getArtistRelated: (artistId) =>
    apiRequest(`/artist/${encodeURIComponent(artistId)}/related`),

  // Album
  getAlbum: (albumId) =>
    apiRequest(`/album/${encodeURIComponent(albumId)}`),

  // User Profile & Onboarding
  onboardUser: (data) =>
    apiRequest('/user/onboard', { method: 'POST', body: data }),

  getUserProfile: (userId) =>
    apiRequest(`/user/profile?user_id=${encodeURIComponent(userId)}`),

  // Play History & Analytics
  recordPlay: (data) =>
    apiRequest('/play/record', { method: 'POST', body: data }),

  getHistory: (userId) =>
    apiRequest(`/history?user_id=${encodeURIComponent(userId)}`),

  // Favorites
  toggleFavorite: (data) =>
    apiRequest('/favorites/toggle', { method: 'POST', body: data }),

  getFavorites: (userId) =>
    apiRequest(`/favorites?user_id=${encodeURIComponent(userId)}`),

  // Playlists
  getPlaylists: (userId) =>
    apiRequest(`/playlists?user_id=${encodeURIComponent(userId)}`),

  getPublicPlaylists: () =>
    apiRequest('/playlists/public'),

  getPlaylistDetail: (playlistId, userId = '') =>
    apiRequest(`/playlists/${encodeURIComponent(playlistId)}${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),

  createPlaylist: (data) =>
    apiRequest('/playlists/create', { method: 'POST', body: data }),

  addTrackToPlaylist: (playlistId, userId, track) =>
    apiRequest(`/playlists/${encodeURIComponent(playlistId)}/tracks?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: { track }
    }),

  removeTrackFromPlaylist: (playlistId, videoId, userId) =>
    apiRequest(`/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(videoId)}?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    }),
};
