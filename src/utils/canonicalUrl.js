/**
 * Canonical URL & Deep Linking Utilities for Staytup Music
 * Ensures consistent routing, sharing, notification navigation, and PWA deep linking
 */

export const getAppBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const isStaytupSubpath = window.location.pathname.startsWith('/staytup');
  return isStaytupSubpath ? `${origin}/staytup` : origin;
};

export const getSongUrl = (songOrId) => {
  if (!songOrId) return `${getAppBaseUrl()}/`;
  const id =
    typeof songOrId === 'string'
      ? songOrId
      : songOrId.videoId || songOrId.video_id || songOrId.id || '';
  return `${getAppBaseUrl()}/song/${encodeURIComponent(id)}`;
};

export const getAlbumUrl = (albumOrId) => {
  if (!albumOrId) return `${getAppBaseUrl()}/`;
  const id =
    typeof albumOrId === 'string'
      ? albumOrId
      : albumOrId.id || albumOrId.albumId || albumOrId.name || '';
  return `${getAppBaseUrl()}/album/${encodeURIComponent(id)}`;
};

export const getArtistUrl = (artistOrId) => {
  if (!artistOrId) return `${getAppBaseUrl()}/`;
  const id =
    typeof artistOrId === 'string'
      ? artistOrId
      : artistOrId.name || artistOrId.id || '';
  return `${getAppBaseUrl()}/artist/${encodeURIComponent(id)}`;
};

export const getPlaylistUrl = (playlistOrId) => {
  if (!playlistOrId) return `${getAppBaseUrl()}/`;
  const id =
    typeof playlistOrId === 'string'
      ? playlistOrId
      : playlistOrId.id || playlistOrId.playlistId || playlistOrId.name || '';
  return `${getAppBaseUrl()}/playlist/${encodeURIComponent(id)}`;
};

export const getUserUrl = (userOrId) => {
  if (!userOrId) return `${getAppBaseUrl()}/blend`;
  const id = typeof userOrId === 'string' ? userOrId : userOrId.id || userOrId.username || '';
  return `${getAppBaseUrl()}/user/${encodeURIComponent(id)}`;
};

export const getBlendUrl = (blendOrId) => {
  if (!blendOrId) return `${getAppBaseUrl()}/blend`;
  const id = typeof blendOrId === 'string' ? blendOrId : blendOrId.id || '';
  return `${getAppBaseUrl()}/blend/${encodeURIComponent(id)}`;
};

/**
 * Native Web Share API with clipboard fallback
 */
export const shareContent = async ({ title, text, url }) => {
  const shareData = {
    title: title || 'Staytup Music',
    text: text || 'Listen on Staytup Music',
    url: url || (typeof window !== 'undefined' ? window.location.href : ''),
  };

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'share', url: shareData.url };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, aborted: true };
      }
    }
  }

  // Fallback to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      return { success: true, method: 'clipboard', url: shareData.url };
    }
  } catch (err) {}

  // Older fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = shareData.url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return { success: true, method: 'clipboard', url: shareData.url };
  } catch (err) {
    return { success: false, error: err };
  }
};

export default {
  getAppBaseUrl,
  getSongUrl,
  getAlbumUrl,
  getArtistUrl,
  getPlaylistUrl,
  getUserUrl,
  getBlendUrl,
  shareContent,
};
