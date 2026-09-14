import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  Play,
  Heart,
  Check,
  UserPlus,
  ArrowLeft,
  Sparkles,
  Disc3,
  Users,
} from 'lucide-react';

export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, likedTrackIds, toggleLike } = usePlayer();

  const [info, setInfo] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersOffset, setFollowersOffset] = useState(0);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const artistIdentifier = decodeURIComponent(id || '');

  useEffect(() => {
    if (!artistIdentifier) return;

    let isMounted = true;
    setIsLoading(true);
    setIsBioExpanded(false);

    const cleanArtistName = artistIdentifier.split(',')[0].split('&')[0].trim();

    Promise.allSettled([
      api.getArtistInfo(artistIdentifier),
      api.search(`artist:"${cleanArtistName}"`, 'songs', 0, 30),
      api.search(`artist:"${cleanArtistName}"`, 'albums', 0, 10),
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
  const displayImage =
    artistData.image ||
    artistData.thumbnail ||
    'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg';

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
  let baseDisplayCount = '35M+';
  if (rawFollowers > 0) {
    const finalCount = Math.max(0, rawFollowers + followersOffset);
    if (finalCount >= 1000000) {
      baseDisplayCount = (finalCount / 1000000).toFixed(1) + 'M';
    } else if (finalCount >= 1000) {
      baseDisplayCount = (finalCount / 1000).toFixed(1) + 'K';
    } else {
      baseDisplayCount = finalCount.toLocaleString();
    }
  } else {
    if (displayName.toLowerCase().includes('arijit'))
      baseDisplayCount = isFollowing ? '38.4M+' : '38.4M';
    else if (displayName.toLowerCase().includes('shreya'))
      baseDisplayCount = isFollowing ? '32.1M+' : '32.1M';
    else if (displayName.toLowerCase().includes('diljit'))
      baseDisplayCount = isFollowing ? '25.6M+' : '25.6M';
    else baseDisplayCount = isFollowing ? '15.2M+' : '15.1M';
  }

  const handlePlayArtist = (startIndex = 0) => {
    if (songs.length === 0) return;
    playTrack(songs[startIndex], songs);
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Top Bar with Back Button */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{displayName}</span>
        <div className="w-16" />
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#8E8E93]">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Loading artist profile...</p>
        </div>
      ) : (
        <div className="flex-1 w-full">
          {/* Hero Banner with Dynamic Artwork */}
          <div className="relative w-full h-72 sm:h-96 overflow-hidden flex items-end px-6 sm:px-10 pb-8 bg-gradient-to-b from-[#1E1E24] to-black">
            <div className="absolute inset-0 z-0">
              <img
                src={get500x500Image(displayImage)}
                alt={displayName}
                className="w-full h-full object-cover blur-md opacity-35 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-6 w-full">
              <img
                src={get500x500Image(displayImage)}
                alt={displayName}
                className="w-32 h-32 sm:w-44 sm:h-44 rounded-full object-cover shadow-2xl border-2 border-white/20 flex-shrink-0"
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
                    Verified Artist
                  </span>
                  <span className="text-xs text-[#8E8E93]">{baseDisplayCount} monthly listeners</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  {displayName}
                </h1>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handlePlayArtist(0)}
                    disabled={songs.length === 0}
                    className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-xl disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play</span>
                  </button>

                  <button
                    onClick={toggleFollow}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border cursor-pointer ${
                      isFollowing
                        ? 'bg-transparent border-white/40 text-white hover:border-white'
                        : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                    }`}
                  >
                    {isFollowing ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-[#22C55E]" />
                        <span>Following</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Artist Content (Top Songs, Discography, About) */}
          <div className="px-6 sm:px-10 py-8 space-y-10">
            {/* Top Songs */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Popular Tracks</h2>
              {songs.length === 0 ? (
                <p className="text-xs text-[#8E8E93]">No tracks found for this artist.</p>
              ) : (
                <div className="space-y-1">
                  {songs.slice(0, 10).map((track, i) => {
                    const vid = String(track.videoId || track.video_id || track.id || '');
                    const isLiked = likedTrackIds.has(vid);
                    return (
                      <div
                        key={vid || i}
                        onClick={() => handlePlayArtist(i)}
                        className="flex items-center justify-between py-2.5 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0 pr-3">
                          <span className="w-5 text-center text-xs font-mono text-[#8E8E93] group-hover:hidden">
                            {i + 1}
                          </span>
                          <Play className="w-4 h-4 text-white hidden group-hover:block ml-0.5" />
                          <img
                            src={get500x500Image(track.thumbnail || track.image)}
                            alt={track.title}
                            className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
                          />
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1 group-hover:text-white">
                              {track.title}
                            </p>
                            <p className="text-xs text-[#8E8E93] line-clamp-1">{track.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono text-[#8E8E93]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(track);
                            }}
                            className="text-[#8E8E93] hover:text-white transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 ${
                                isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                              }`}
                            />
                          </button>
                          <span>{track.duration_formatted || ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discography / Albums */}
            {info?.albums && info.albums.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">Discography</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                  {info.albums.map((album, idx) => (
                    <div
                      key={album.id || idx}
                      onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
                      className="p-4 rounded-2xl bg-[#121214] hover:bg-[#1A1A1E] border border-[#222226] hover:border-white/20 transition-all cursor-pointer group"
                    >
                      <img
                        src={get500x500Image(album.image || album.thumbnail)}
                        alt={album.title || album.name}
                        className="w-full aspect-square rounded-xl object-cover mb-3 group-hover:scale-105 transition-transform"
                      />
                      <p className="font-bold text-sm text-white truncate group-hover:text-white">
                        {album.title || album.name}
                      </p>
                      <p className="text-xs text-[#8E8E93] mt-0.5">{album.year || 'Album'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
