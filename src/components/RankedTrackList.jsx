import React from 'react';
import { Play, Pause, Heart, Sparkles, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { get500x500Image } from '../utils/media';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
      <div className="bg-[#121214] border border-[#222226] rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-36 h-4 bg-white/10 rounded animate-pulse" />
              <div className="w-24 h-3 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 py-2.5 px-3 rounded-2xl bg-white/[0.02]">
              <div className="w-5 h-4 bg-white/5 rounded animate-pulse" />
              <div className="w-11 h-11 rounded-xl bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="w-32 h-3.5 bg-white/10 rounded animate-pulse" />
                <div className="w-20 h-2.5 bg-white/5 rounded animate-pulse" />
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
    <div className="bg-[#121214] hover:border-white/15 border border-[#222226] rounded-3xl p-5 sm:p-6 select-none transition-colors flex flex-col justify-between shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0 shadow-inner`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-none">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handlePlayAll}
          className="px-3 py-1 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          title="Play Top 5"
        >
          <Play className="w-3 h-3 fill-current ml-0.5" />
          <span>Play All</span>
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
              className={`flex items-center justify-between py-2.5 px-2.5 sm:px-3 rounded-2xl cursor-pointer transition-all duration-150 group ${
                isCurrent ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
              }`}
            >
              {/* Left Zone: Rank Number + Artwork + Titles */}
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
                <span
                  className={`w-5 text-center text-xs font-mono font-bold flex-shrink-0 ${
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
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black flex-shrink-0 shadow-md">
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
                <div className="min-w-0">
                  <p
                    className={`font-bold text-xs sm:text-sm line-clamp-1 transition-colors ${
                      isCurrent ? 'text-[#22C55E]' : 'text-white group-hover:text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  <p
                    onClick={(e) => {
                      e.stopPropagation();
                      if (track.artist) {
                        navigate(`/artist/${encodeURIComponent(track.artist)}`);
                      }
                    }}
                    className="text-[11px] text-[#8E8E93] hover:text-white hover:underline truncate mt-0.5"
                  >
                    {track.artist || 'Unknown Artist'}
                  </p>
                </div>
              </div>

              {/* Right Zone: Like Button + Duration */}
              <div className="flex items-center gap-2.5 text-xs text-[#8E8E93] flex-shrink-0">
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
                      className={`w-3.5 h-3.5 ${
                        isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                      }`}
                    />
                  </button>
                )}
                <span className="font-mono text-[11px] text-[#8E8E93] hidden sm:inline">
                  {formatDuration(track.duration || track.duration_seconds)}
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
