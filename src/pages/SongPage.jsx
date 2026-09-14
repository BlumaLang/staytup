import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { getSongUrl, shareContent } from '../utils/canonicalUrl';
import {
  Play,
  Pause,
  Heart,
  Share2,
  Mic2,
  ArrowLeft,
  Disc3,
  Clock,
  Check,
  AlertCircle,
  Home,
  Music2,
} from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function SongPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playTrack,
    currentTrack,
    isPlaying,
    likedTrackIds,
    toggleLike,
    setIsLyricsDrawerOpen,
  } = usePlayer();

  const [track, setTrack] = useState(null);
  const [relatedTracks, setRelatedTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareToast, setShareToast] = useState(false);

  const songId = decodeURIComponent(id || '').replace(/^saavn_/, '');

  useEffect(() => {
    if (!songId) {
      setIsLoading(false);
      setError('Invalid song ID');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const resolveSong = async () => {
      try {
        // Attempt 1: Direct track fetch via API
        let fetched = null;
        try {
          fetched = await api.getTrack(songId);
        } catch (e) {}

        // Attempt 2: Search fallback if direct lookup failed
        if (!fetched || !fetched.title) {
          const searchRes = await api.search(songId, 'songs', 0, 5);
          const tracks = searchRes?.tracks || searchRes?.results || [];
          if (tracks.length > 0) {
            fetched = tracks[0];
          }
        }

        if (!isMounted) return;

        if (fetched && (fetched.title || fetched.name)) {
          setTrack(fetched);

          // Fetch more from same artist for related songs section
          const artistName = (fetched.artist || '').split(',')[0].split('&')[0].trim();
          if (artistName) {
            api.search(`artist:"${artistName}"`, 'songs', 0, 10).then((res) => {
              if (isMounted) {
                const list = res?.tracks || res?.results || [];
                const filtered = list.filter(
                  (t) => String(t.videoId || t.id) !== String(fetched.videoId || fetched.id)
                );
                setRelatedTracks(filtered.slice(0, 6));
              }
            }).catch(() => {});
          }
        } else {
          setError('Song not found');
        }
      } catch (err) {
        if (isMounted) setError('Failed to load song');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    resolveSong();

    return () => {
      isMounted = false;
    };
  }, [songId]);

  const handlePlay = () => {
    if (!track) return;
    const isCurrent = (currentTrack?.videoId || currentTrack?.id) === (track.videoId || track.id);
    if (isCurrent) {
      // Toggle play if already current
      playTrack(track, [track, ...relatedTracks]);
    } else {
      playTrack(track, [track, ...relatedTracks]);
    }
  };

  const handleShare = async () => {
    if (!track) return;
    const url = getSongUrl(track);
    const result = await shareContent({
      title: `${track.title} - ${track.artist}`,
      text: `Listen to "${track.title}" by ${track.artist} on Staytup Music!`,
      url,
    });

    if (result.success) {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const isCurrentPlaying =
    track &&
    isPlaying &&
    (currentTrack?.videoId || currentTrack?.id) === (track.videoId || track.id);

  const isLiked = track ? likedTrackIds.has(String(track.videoId || track.id)) : false;

  // 1. Loading State (Polished Skeleton)
  if (isLoading) {
    return (
      <div className="w-full min-h-full flex flex-col text-white select-none px-4 sm:px-8 py-6 space-y-8">
        <div className="w-24 h-8 bg-white/10 rounded-full animate-pulse" />
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-8 border-b border-white/5">
          <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-3xl bg-white/10 animate-pulse flex-shrink-0" />
          <div className="space-y-3 w-full max-w-md">
            <div className="w-20 h-4 bg-white/10 rounded animate-pulse" />
            <div className="w-64 h-8 bg-white/15 rounded animate-pulse" />
            <div className="w-40 h-4 bg-white/10 rounded animate-pulse" />
            <div className="w-32 h-10 bg-white/20 rounded-full animate-pulse mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Found / Error State (Polished Graceful View)
  if (error || !track) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center text-white px-4 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 text-[#8E8E93] shadow-xl">
          <Music2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Song Not Available</h2>
        <p className="text-xs sm:text-sm text-[#8E8E93] max-w-md mb-6 leading-relaxed">
          The song you requested could not be found. It may have been relocated or the link might be incomplete.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-200 text-black text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-lg flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Explore Home</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Resolved Song View
  const artwork = get500x500Image(track.image || track.thumbnail || track.artwork_url);

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Top Header Bar with Back Button */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
          {track.title}
        </span>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
          title="Share song"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Hero Section with Immersive Artwork Backdrop */}
      <div className="relative w-full overflow-hidden px-4 sm:px-8 py-8 sm:py-12 bg-gradient-to-b from-[#1E1E26] via-[#121216] to-black border-b border-white/5">
        {/* Blurred Background Glow */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={artwork}
            alt=""
            className="w-full h-full object-cover blur-3xl opacity-25 scale-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 w-full flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
          {/* Main Album Artwork */}
          <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 bg-black flex-shrink-0 group">
            <img
              src={artwork}
              alt={track.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {isCurrentPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[#22C55E] animate-ping" />
              </div>
            )}
          </div>

          {/* Metadata & Actions */}
          <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-white">
              Single • Track
            </span>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight line-clamp-2">
              {track.title}
            </h1>

            <p className="text-sm sm:text-base text-[#8E8E93]">
              <Link
                to={`/artist/${encodeURIComponent(track.artist || '')}`}
                className="font-bold text-white hover:text-gray-300 transition-colors"
              >
                {track.artist || 'Unknown Artist'}
              </Link>
              {track.album && (
                <>
                  {' • '}
                  <span className="text-[#8E8E93]">{track.album}</span>
                </>
              )}
              {track.duration ? ` • ${formatDuration(track.duration)}` : ''}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-3 flex-wrap">
              {/* Play / Pause Main Button */}
              <button
                onClick={handlePlay}
                className="px-7 py-3 rounded-full bg-[#22C55E] hover:bg-[#1eb054] text-black font-extrabold text-sm flex items-center gap-2.5 transition-transform active:scale-95 shadow-xl cursor-pointer"
              >
                {isCurrentPlaying ? (
                  <>
                    <Pause className="w-5 h-5 fill-black" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-black ml-0.5" />
                    <span>Play Song</span>
                  </>
                )}
              </button>

              {/* Like Button */}
              <button
                onClick={() => toggleLike(track)}
                className={`p-3 rounded-full border transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-white/15 border-[#22C55E] text-[#22C55E]'
                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                }`}
                title={isLiked ? 'Liked' : 'Like'}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#22C55E]' : 'stroke-current'}`} />
              </button>

              {/* Lyrics Button */}
              <button
                onClick={() => setIsLyricsDrawerOpen(true)}
                className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                title="View Lyrics"
              >
                <Mic2 className="w-4 h-4" />
                <span>Lyrics</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                title="Share canonical link"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Content: More from this artist */}
      {relatedTracks.length > 0 && (
        <div className="px-4 sm:px-8 py-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              More by {track.artist?.split(',')[0]}
            </h2>
            <Link
              to={`/artist/${encodeURIComponent(track.artist || '')}`}
              className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {relatedTracks.map((item, idx) => {
              const isItemPlaying =
                isPlaying &&
                (currentTrack?.videoId || currentTrack?.id) === (item.videoId || item.id);
              const isItemLiked = likedTrackIds.has(String(item.videoId || item.id));

              return (
                <div
                  key={item.videoId || item.id || idx}
                  onClick={() => playTrack(item, [item, ...relatedTracks])}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#121214] hover:bg-[#18181C] border border-[#222226] hover:border-white/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={get500x500Image(item.image || item.thumbnail)}
                      alt={item.title}
                      className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-bold line-clamp-1 ${
                          isItemPlaying ? 'text-[#22C55E]' : 'text-white group-hover:text-white'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#8E8E93] truncate">{item.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#8E8E93] flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(item);
                      }}
                      className="text-[#8E8E93] hover:text-white transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isItemLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                        }`}
                      />
                    </button>
                    <span className="font-mono text-[11px]">
                      {formatDuration(item.duration || item.duration_seconds)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast Notification for Copied Link */}
      {shareToast && (
        <div className="fixed bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#22C55E] text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
