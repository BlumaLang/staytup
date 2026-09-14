import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  Play,
  Pause,
  Heart,
  Check,
  UserPlus,
  ArrowLeft,
  Share2,
  BadgeCheck,
  Disc3,
} from 'lucide-react';
import { getArtistUrl, shareContent } from '../utils/canonicalUrl';
import { ArtistAvatar } from '../components/ArtistAvatar';

const formatDuration = (val) => {
  if (!val) return '3:20';
  if (typeof val === 'string' && val.includes(':')) return val;
  const num = parseInt(val, 10);
  if (isNaN(num)) return '3:20';
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Deterministic play count generator for realistic Spotify-like stream metrics
const getTrackPlays = (trackId, index) => {
  let hash = 0;
  const str = String(trackId || `track_${index}`);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const base = Math.abs(hash) % 80000000 + 5000000;
  return base.toLocaleString();
};

export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();

  const [info, setInfo] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersOffset, setFollowersOffset] = useState(0);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [discographyTab, setDiscographyTab] = useState('all'); // 'all' | 'albums' | 'singles'

  const artistIdentifier = decodeURIComponent(id || '');

  const handleShare = async () => {
    const url = getArtistUrl(displayName || artistIdentifier);
    const result = await shareContent({
      title: `${displayName} - Artist Profile`,
      text: `Listen to "${displayName}" on Staytup Music!`,
      url,
    });
    if (result.success) {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  useEffect(() => {
    if (!artistIdentifier) return;

    let isMounted = true;
    setIsLoading(true);
    setIsBioExpanded(false);
    setShowAllTracks(false);

    const cleanArtistName = artistIdentifier.split(',')[0].split('&')[0].trim();

    Promise.allSettled([
      api.getArtistInfo(artistIdentifier),
      api.search(`artist:"${cleanArtistName}"`, 'songs', 0, 30),
      api.search(`artist:"${cleanArtistName}"`, 'albums', 0, 16),
    ]).then(([infoRes, songsRes, albumsRes]) => {
      if (!isMounted) return;

      let fetchedInfo = null;
      if (infoRes.status === 'fulfilled' && infoRes.value) {
        fetchedInfo = infoRes.value;
      }

      let rawSongs = [];
      if (songsRes.status === 'fulfilled' && songsRes.value) {
        rawSongs = songsRes.value.tracks || songsRes.value.results || [];
      }

      if (fetchedInfo?.top_songs && Array.isArray(fetchedInfo.top_songs)) {
        rawSongs = [...rawSongs, ...fetchedInfo.top_songs];
      }

      // Deduplicate songs by videoId / id
      const seen = new Set();
      const uniqueSongs = [];
      for (const s of rawSongs) {
        const sid = s.videoId || s.video_id || s.id;
        if (sid && !seen.has(sid)) {
          seen.add(sid);
          uniqueSongs.push(s);
        }
      }

      if (albumsRes.status === 'fulfilled' && albumsRes.value?.albums) {
        if (!fetchedInfo) fetchedInfo = {};
        if (!fetchedInfo.albums) fetchedInfo.albums = albumsRes.value.albums;
      }

      setInfo(fetchedInfo);
      setSongs(uniqueSongs);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [artistIdentifier]);

  const artistData = info?.artist || {};
  const displayName = artistData.name || artistIdentifier || 'Artist Profile';
  const displayImage = artistData.image || artistData.thumbnail || '';

  // Check initial follow status
  useEffect(() => {
    if (!displayName) return;
    try {
      const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      const userFavs = user?.favoriteArtists || [];
      const isFav =
        stored.some((a) =>
          typeof a === 'string'
            ? a.toLowerCase() === displayName.toLowerCase()
            : a.name?.toLowerCase() === displayName.toLowerCase()
        ) ||
        userFavs.some(
          (fav) => typeof fav === 'string' && fav.toLowerCase() === displayName.toLowerCase()
        );
      setIsFollowing(isFav);
      setFollowersOffset(0);
    } catch (e) {
      setIsFollowing(false);
    }
  }, [displayName, user?.favoriteArtists]);

  const toggleFollow = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      let updated;
      if (isFollowing) {
        updated = stored.filter((a) =>
          typeof a === 'string'
            ? a.toLowerCase() !== displayName.toLowerCase()
            : a.name?.toLowerCase() !== displayName.toLowerCase()
        );
        setIsFollowing(false);
        setFollowersOffset((prev) => prev - 1);
      } else {
        const item = {
          name: displayName,
          id: artistData.id || artistIdentifier,
          image: displayImage,
          followedAt: Date.now(),
        };
        updated = [
          item,
          ...stored.filter((a) =>
            typeof a === 'string'
              ? a.toLowerCase() !== displayName.toLowerCase()
              : a.name?.toLowerCase() !== displayName.toLowerCase()
          ),
        ];
        setIsFollowing(true);
        setFollowersOffset((prev) => prev + 1);
      }
      localStorage.setItem('staytup_followed_artists', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('staytup_followed_artists_updated', { detail: updated }));
    } catch (e) {
      console.warn('Follow error:', e);
    }
  };

  const rawFollowers = parseInt(
    artistData.follower_count || artistData.fan_count || artistData.monthly_listeners || 0,
    10
  );
  let baseDisplayCount = '35,420,119';
  if (rawFollowers > 0) {
    const finalCount = Math.max(0, rawFollowers + followersOffset);
    baseDisplayCount = finalCount.toLocaleString();
  } else {
    if (displayName.toLowerCase().includes('arijit'))
      baseDisplayCount = isFollowing ? '38,489,120' : '38,412,890';
    else if (displayName.toLowerCase().includes('karan'))
      baseDisplayCount = isFollowing ? '18,290,410' : '18,245,100';
    else if (displayName.toLowerCase().includes('shreya'))
      baseDisplayCount = isFollowing ? '32,150,000' : '32,110,400';
    else if (displayName.toLowerCase().includes('diljit'))
      baseDisplayCount = isFollowing ? '25,640,120' : '25,600,000';
    else baseDisplayCount = isFollowing ? '15,220,000' : '15,190,000';
  }

  // Parse bio
  let parsedBio = '';
  if (artistData.bio) {
    if (typeof artistData.bio === 'string' && artistData.bio.startsWith('[')) {
      try {
        const arr = JSON.parse(artistData.bio);
        if (Array.isArray(arr)) {
          parsedBio = arr.map((item) => item.text || item.title || '').filter(Boolean).join('\n\n');
        }
      } catch (e) {
        parsedBio = artistData.bio;
      }
    } else if (Array.isArray(artistData.bio)) {
      parsedBio = artistData.bio
        .map((item) => (typeof item === 'object' ? item.text || '' : item))
        .filter(Boolean)
        .join('\n\n');
    } else {
      parsedBio = String(artistData.bio);
    }
  }

  if (!parsedBio || parsedBio.trim().length === 0) {
    if (displayName.toLowerCase().includes('arijit')) {
      parsedBio =
        "Arijit Singh is an internationally acclaimed Indian playback singer and music composer. Widely regarded as one of the most versatile vocalists in modern Indian music, he has delivered iconic chartbusters across Hindi, Bengali, and global cinema.";
    } else if (displayName.toLowerCase().includes('karan')) {
      parsedBio =
        "Karan Aujla is a globally renowned Indian singer, rapper, and songwriter known for defining modern Punjabi music. With chart-topping hits like '52 Bars', 'Softly', and 'Winning Speech', he commands tens of millions of monthly listeners worldwide.";
    } else {
      parsedBio = `${displayName} is one of the most streamed artists on Staytup Music. Explore their top hits, official albums, and discography below.`;
    }
  }

  const handlePlayArtist = (startIndex = 0) => {
    if (songs.length === 0) return;
    playTrack(songs[startIndex], songs);
  };

  const isCurrentArtistPlaying =
    isPlaying &&
    songs.some((s) => (currentTrack?.videoId || currentTrack?.id) === (s.videoId || s.id));

  // Discography filtering
  const rawAlbums = info?.albums || [];
  const filteredAlbums = rawAlbums.filter((album) => {
    if (discographyTab === 'albums') {
      const type = (album.type || '').toLowerCase();
      return type === 'album' || !type.includes('single');
    }
    if (discographyTab === 'singles') {
      const type = (album.type || '').toLowerCase();
      return type.includes('single') || type.includes('ep');
    }
    return true;
  });

  const displayedSongs = showAllTracks ? songs.slice(0, 10) : songs.slice(0, 5);

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none bg-[#121212]">
      {/* Mobile-Only Floating Back Button (Desktop has global top-bar buttons) */}
      <button
        onClick={() => navigate(-1)}
        className="lg:hidden absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white cursor-pointer transition-all active:scale-95 shadow-lg"
        title="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center text-[#8E8E93]">
          <div className="w-10 h-10 border-2 border-[#1ED760] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Loading artist profile...</p>
        </div>
      ) : (
        <div className="flex-1 w-full">
          {/* ========================================================================= */}
          {/* SPOTIFY IMMERSIVE FULL-BLEED PHOTOGRAPHIC HERO BANNER                      */}
          {/* ========================================================================= */}
          <div className="relative w-full h-72 sm:h-80 md:h-[340px] lg:h-[380px] overflow-hidden flex flex-col justify-end p-6 sm:p-8 md:p-10 bg-[#181818]">
            {/* Background Artist Photography */}
            <div className="absolute inset-0 z-0">
              {displayImage ? (
                <img
                  src={get500x500Image(displayImage)}
                  alt={displayName}
                  className="w-full h-full object-cover object-top opacity-50 scale-105 filter brightness-90"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-[#282828] to-[#121212]" />
              )}
              {/* Spotify Gradient Overlay Fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
            </div>

            {/* Bottom Content within Hero */}
            <div className="relative z-10 space-y-2 max-w-4xl">
              {/* Verified Badge */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white tracking-wide">
                <BadgeCheck className="w-5 h-5 fill-[#3D91F4] text-white flex-shrink-0" />
                <span>Verified Artist</span>
              </div>

              {/* Massive Artist Name */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                {displayName}
              </h1>

              {/* Monthly Listeners */}
              <p className="text-xs sm:text-sm text-white/90 font-medium drop-shadow pt-1">
                {baseDisplayCount} monthly listeners
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SPOTIFY ACTION CONTROLS ROW (Big Green Play Button, Follow, Share)        */}
          {/* ========================================================================= */}
          <div className="px-6 sm:px-10 py-5 flex items-center gap-6 bg-gradient-to-b from-[#121212] to-[#121212]">
            {/* Iconic Green Play Button */}
            <button
              onClick={() => handlePlayArtist(0)}
              disabled={songs.length === 0}
              className="w-14 h-14 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all cursor-pointer disabled:opacity-50 flex-shrink-0"
              title={isCurrentArtistPlaying ? 'Pause' : 'Play'}
            >
              {isCurrentArtistPlaying ? (
                <Pause className="w-6 h-6 fill-black" />
              ) : (
                <Play className="w-6 h-6 fill-black ml-1" />
              )}
            </button>

            {/* Follow Button */}
            <button
              onClick={toggleFollow}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer hover:scale-105 ${
                isFollowing
                  ? 'border-white/40 text-white hover:border-white bg-transparent'
                  : 'border-white/30 text-white hover:border-white bg-transparent'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            {/* Share / More Button */}
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
              title="Share Artist"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* MAIN ARTIST CONTENT (Popular Songs, Discography, About)                    */}
          {/* ========================================================================= */}
          <div className="px-6 sm:px-10 pb-16 space-y-12">
            {/* 1. Popular Tracks Section */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Popular</h2>

              {songs.length === 0 ? (
                <p className="text-xs text-[#8E8E93]">No popular tracks available.</p>
              ) : (
                <div className="space-y-0.5">
                  {displayedSongs.map((track, i) => {
                    const vid = String(track.videoId || track.video_id || track.id || '');
                    const isLiked = likedTrackIds.has(vid);
                    const isTrackCurrent =
                      (currentTrack?.videoId || currentTrack?.id) === vid;
                    const isTrackPlaying = isTrackCurrent && isPlaying;
                    const plays = getTrackPlays(vid, i);

                    return (
                      <div
                        key={vid || i}
                        onClick={() => handlePlayArtist(i)}
                        className={`flex items-center justify-between py-2 px-3 sm:px-4 rounded-lg cursor-pointer transition-colors group ${
                          isTrackCurrent ? 'bg-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Index / Play Button / Equalizer */}
                        <div className="flex items-center gap-4 min-w-0 pr-4 flex-1">
                          <div className="w-5 flex items-center justify-center flex-shrink-0">
                            {isTrackPlaying ? (
                              <div className="flex items-end gap-0.5 h-3.5">
                                <span className="w-0.5 h-full bg-[#1ED760] animate-pulse" />
                                <span className="w-0.5 h-2/3 bg-[#1ED760] animate-pulse delay-75" />
                                <span className="w-0.5 h-4/5 bg-[#1ED760] animate-pulse delay-150" />
                              </div>
                            ) : (
                              <>
                                <span
                                  className={`text-sm font-mono group-hover:hidden ${
                                    isTrackCurrent ? 'text-[#1ED760] font-bold' : 'text-[#B3B3B3]'
                                  }`}
                                >
                                  {i + 1}
                                </span>
                                <Play className="w-4 h-4 text-white hidden group-hover:block fill-white ml-0.5" />
                              </>
                            )}
                          </div>

                          {/* Song Thumbnail */}
                          <img
                            src={get500x500Image(track.thumbnail || track.image)}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover bg-black flex-shrink-0 shadow-sm"
                          />

                          {/* Title & Artist */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold text-sm truncate leading-tight ${
                                isTrackCurrent ? 'text-[#1ED760]' : 'text-white'
                              }`}
                            >
                              {track.title}
                            </p>
                            <p className="text-xs text-[#B3B3B3] truncate mt-0.5">
                              {track.artist || displayName}
                            </p>
                          </div>
                        </div>

                        {/* Stream / Plays Count (Hidden on mobile) */}
                        <div className="hidden md:block w-36 text-right text-xs text-[#B3B3B3] font-mono pr-6">
                          {plays}
                        </div>

                        {/* Right: Heart + Duration */}
                        <div className="flex items-center gap-3 text-xs text-[#B3B3B3] flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track);
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white transition-colors cursor-pointer"
                            title={isLiked ? 'Unlike' : 'Like'}
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isLiked ? 'fill-[#1ED760] text-[#1ED760]' : 'stroke-current'
                              }`}
                            />
                          </button>
                          <span className="font-mono w-10 text-right">
                            {formatDuration(track.duration || track.duration_formatted)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* See more / Show less Button */}
                  {songs.length > 5 && (
                    <button
                      onClick={() => setShowAllTracks((prev) => !prev)}
                      className="mt-2 px-3 py-1.5 text-xs font-bold text-[#B3B3B3] hover:text-white transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      {showAllTracks ? 'Show less' : 'See more'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 2. DISCOGRAPHY SECTION (Spotify Clean Cards + Filter Pills)               */}
            {/* ========================================================================= */}
            {rawAlbums.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-white">Discography</h2>

                  {/* Discography Filter Pills */}
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'all', label: 'Popular releases' },
                      { id: 'albums', label: 'Albums' },
                      { id: 'singles', label: 'Singles and EPs' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDiscographyTab(tab.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                          discographyTab === tab.id
                            ? 'bg-white text-black'
                            : 'bg-[#282828] text-white hover:bg-[#333333]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spotify Album Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredAlbums.map((album, idx) => (
                    <div
                      key={album.id || idx}
                      onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
                      className="p-3.5 rounded-lg bg-[#181818]/60 hover:bg-[#282828] transition-all duration-300 group cursor-pointer relative flex flex-col justify-between select-none"
                    >
                      {/* Album Cover Art Container */}
                      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-black shadow-md mb-3">
                        <img
                          src={get500x500Image(album.image || album.thumbnail)}
                          alt={album.title || album.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Floating Green Play Button on Hover */}
                        <div className="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200">
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </div>
                      </div>

                      {/* Album Title & Year */}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate leading-tight group-hover:text-white">
                          {album.title || album.name}
                        </p>
                        <p className="text-xs text-[#A7A7A7] mt-1 font-medium">
                          {album.year || '2024'} • {album.type || 'Album'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. ABOUT THE ARTIST SECTION (Spotify Visual Bio Card)                     */}
            {/* ========================================================================= */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">About</h2>
              <div
                onClick={() => setIsBioExpanded((prev) => !prev)}
                className="relative rounded-2xl overflow-hidden h-72 sm:h-80 md:h-96 group cursor-pointer p-6 sm:p-10 flex flex-col justify-end bg-[#181818] border border-white/5 transition-all shadow-xl"
              >
                {/* Background Artwork */}
                <div className="absolute inset-0 z-0">
                  {displayImage ? (
                    <img
                      src={get500x500Image(displayImage)}
                      alt={displayName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-75"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                </div>

                {/* Card Content */}
                <div className="relative z-10 space-y-2 max-w-2xl">
                  <span className="text-sm font-bold text-white tracking-wide block">
                    {baseDisplayCount} monthly listeners
                  </span>
                  <p
                    className={`text-sm text-[#CCCCCC] leading-relaxed transition-all ${
                      isBioExpanded ? '' : 'line-clamp-3'
                    }`}
                  >
                    {parsedBio}
                  </p>
                  <span className="text-xs font-bold text-white/80 group-hover:text-white underline block pt-1">
                    {isBioExpanded ? 'Show less' : 'Read more'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#1ED760] text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Artist link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
