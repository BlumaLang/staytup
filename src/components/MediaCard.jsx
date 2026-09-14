import React from 'react';
import { Play } from 'lucide-react';
import { get500x500Image } from '../utils/media';
import { ArtistLinks } from './ArtistLinks';

export const MediaCard = ({
  image,
  title,
  subtitle,
  track,
  isRound = false,
  onPlay,
  onClick,
  badge,
}) => {
  const imgSrc = get500x500Image(image);

  return (
    <div
      onClick={onClick || onPlay}
      className="group p-3 sm:p-3.5 bg-[#181818]/60 hover:bg-[#282828] border border-transparent hover:border-white/5 rounded-xl cursor-pointer transition-all duration-300 flex flex-col justify-between select-none relative"
    >
      {/* Artwork Container */}
      <div
        className={`relative w-full aspect-square overflow-hidden bg-black mb-3 shadow-md ${
          isRound ? 'rounded-full' : 'rounded-lg'
        }`}
      >
        <img
          src={imgSrc}
          alt={title}
          onError={(e) => {
            e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover Play Button (for tracks/albums) */}
        {onPlay && !isRound && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10"
            title="Play"
          >
            <Play className="w-5 h-5 fill-black ml-0.5" />
          </button>
        )}

        {badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white">
            {badge}
          </span>
        )}
      </div>

      {/* Info Container */}
      <div className={`min-w-0 ${isRound ? 'text-center' : 'text-left'}`}>
        <p className="font-bold text-sm text-white line-clamp-1 group-hover:text-white tracking-tight">
          {title}
        </p>
        {track ? (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <ArtistLinks
              track={track}
              className="text-xs text-[#A7A7A7]"
              maxDisplay={2}
              showAvatars={false}
            />
          </div>
        ) : subtitle ? (
          <p className="text-xs text-[#A7A7A7] line-clamp-2 mt-1 font-medium leading-tight">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default MediaCard;
