import React from 'react';
import { Play, Pause, Heart, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { get500x500Image } from '../utils/media';
import { ArtistLinks } from './ArtistLinks';

const formatDuration = (val) => {
  if (!val) return '3:24';
  if (typeof val === 'string' && val.includes(':')) return val;
  const num = parseInt(val, 10);
  if (isNaN(num)) return '3:24';
  const m = Math.floor(num / 60);
  const s = Math.floor(num % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const RankedTrackList = ({
  title,
  subtitle,
  icon: Icon = Flame,
  iconColor = 'text-amber-400',
  iconBg = 'bg-amber-400/10',
  tracks = [],
  onPlayTrack,
  currentTrack,
  isPlaying,
  likedTrackIds = new Set(),
  toggleLike,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-[#181818]/60 border border-white/[0.05] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between pb-2">
          <div className="space-y-2">
            <div className="w-36 h-5 bg-white/10 rounded animate-pulse" />
            <div className="w-28 h-3 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 py-2 px-2.5 rounded-xl bg-white/[0.02]">
              <div className="w-4 h-4 bg-white/5 rounded animate-pulse" />
              <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="w-28 h-3.5 bg-white/10 rounded animate-pulse" />
                <div className="w-16 h-2.5 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return null;
  }

  const handlePlayAll = () => {
    if (tracks.length > 0 && onPlayTrack) {
      onPlayTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="bg-[#161619] sm:bg-[#181818]/60 hover:bg-[#1E1E22] border border-white/[0.05] hover:border-white/10 rounded-2xl p-3.5 sm:p-5 select-none transition-all flex flex-col justify-between shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-2.5 sm:pb-3 mb-1">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[#8E8E93] mt-0.5 leading-normal line-clamp-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={handlePlayAll}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#22C55E] hover:bg-[#1fba57] active:scale-95 text-black flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer flex-shrink-0"
          title={`Play all ${title}`}
        >
          <Play className="w-4 h-4 fill-black ml-0.5" />
        </button>
      </div>

      {/* Ranked Track Items */}
      <div className="divide-y divide-white/[0.03]">
        {tracks.map((track, i) => {
          const vid = String(track.videoId || track.video_id || track.id || '');
          const isCurrent = (currentTrack?.videoId || currentTrack?.id) === vid;
          const isCurrentPlaying = isCurrent && isPlaying;
          const isLiked = likedTrackIds.has(vid);

          return (
            <div
              key={vid || i}
              onClick={() => onPlayTrack && onPlayTrack(track, tracks)}
              className={`flex items-center justify-between py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-150 group active:scale-[0.99] ${
                isCurrent ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
              }`}
            >
              {/* Left Zone: Rank Number + Artwork + Titles */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-2 flex-1">
                <span
                  className={`w-4 sm:w-5 text-center text-xs font-semibold tabular-nums flex-shrink-0 ${
                    isCurrent ? 'text-[#22C55E]' : 'text-[#8E8E93] group-hover:text-white'
                  }`}
                >
                  {isCurrentPlaying ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  ) : (
                    track.rank || String(i + 1).padStart(2, '0')
                  )}
                </span>

                {/* Thumbnail with Hover Play Button */}
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden bg-black flex-shrink-0 shadow-md">
                  <img
                    src={get500x500Image(track.image || track.thumbnail || track.artwork_url)}
                    alt={track.title}
                    onError={(e) => {
                      e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div
                    className={`absolute inset-0 bg-black/40 items-center justify-center transition-opacity ${
                      isCurrentPlaying ? 'flex' : 'hidden group-hover:flex'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <Pause className="w-4 h-4 text-[#22C55E] fill-[#22C55E]" />
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Title & Artist */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold text-xs sm:text-sm line-clamp-1 transition-colors leading-snug ${
                      isCurrent ? 'text-[#22C55E]' : 'text-white group-hover:text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  <div className="mt-0.5 line-clamp-1">
                    <ArtistLinks
                      track={track}
                      className="text-[11px] text-[#8E8E93]"
                      maxDisplay={3}
                      showAvatars={false}
                    />
                  </div>
                </div>
              </div>

              {/* Right Zone: Like Button + Duration */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs text-[#8E8E93] flex-shrink-0">
                {toggleLike && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(track);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? 'fill-[#1ED760] text-[#1ED760]' : 'stroke-white/70 hover:stroke-white'
                      }`}
                    />
                  </button>
                )}
                <span className="font-medium tabular-nums text-[11px] text-[#8E8E93] hidden sm:inline">
                  {formatDuration(track.duration || track.duration_formatted || track.duration_seconds)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RankedTrackList;
