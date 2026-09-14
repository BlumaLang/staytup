import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  Music2,
  ChevronDown,
} from 'lucide-react';

export const LyricsDrawer = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    likedTrackIds,
    toggleLike,
    lyrics,
    isLoadingLyrics,
    activeLyricIndex,
    isLyricsDrawerOpen,
    setIsLyricsDrawerOpen,
  } = usePlayer();

  const scrollContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  // Auto-scroll to keep active lyric centered in view
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex]);

  if (!isLyricsDrawerOpen || !currentTrack) return null;

  const videoId = String(currentTrack.videoId || currentTrack.video_id || currentTrack.id || '');
  const isLiked = likedTrackIds.has(videoId);
  const artwork = get500x500Image(currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url);

  const hasSyncedLyrics =
    lyrics?.is_synced && Array.isArray(lyrics?.synced_lyrics) && lyrics.synced_lyrics.length > 0;
  const hasPlainLyrics = !hasSyncedLyrics && lyrics?.plain_lyrics && lyrics.plain_lyrics.trim().length > 0;

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] w-full h-[100dvh] flex flex-col bg-[#08080A] text-white select-none overflow-hidden animate-in fade-in duration-300">
      {/* Dynamic Blurred Artwork Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <img
          src={artwork}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover blur-3xl scale-125 opacity-30"
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <button
          onClick={() => setIsLyricsDrawerOpen(false)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Close Lyrics"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 min-w-0 max-w-lg text-center">
          <img
            src={artwork}
            alt={currentTrack.title}
            className="w-10 h-10 rounded-lg object-cover bg-black flex-shrink-0 border border-white/10 shadow-md"
          />
          <div className="min-w-0 text-left">
            <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-[#8E8E93] line-clamp-1">{currentTrack.artist}</p>
          </div>
        </div>

        <button
          onClick={() => toggleLike(currentTrack)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            className={`w-5 h-5 ${
              isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-white'
            }`}
          />
        </button>
      </div>

      {/* Center Lyrics Flow (Full Viewport Scrollable Area) */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-12 md:px-20 py-10 no-scrollbar space-y-8 sm:space-y-10 max-w-4xl mx-auto w-full"
      >
        {isLoadingLyrics ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8E8E93]">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-base font-semibold text-white">Syncing lyrics with the rhythm...</p>
          </div>
        ) : hasSyncedLyrics ? (
          lyrics.synced_lyrics.map((line, idx) => {
            const isActive = idx === activeLyricIndex;
            const isPast = idx < activeLyricIndex;

            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seek(line.time)}
                className={`cursor-pointer transition-all duration-300 text-left font-extrabold select-none leading-relaxed tracking-tight ${
                  isActive
                    ? 'text-3xl sm:text-4xl md:text-5xl text-white scale-102 origin-left drop-shadow-[0_0_24px_rgba(255,255,255,0.4)]'
                    : isPast
                    ? 'text-xl sm:text-2xl md:text-3xl text-white/35 hover:text-white/80'
                    : 'text-xl sm:text-2xl md:text-3xl text-white/60 hover:text-white'
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : hasPlainLyrics ? (
          <div className="space-y-6 text-left">
            {lyrics.plain_lyrics.split('\n').map((line, idx) => (
              <p
                key={idx}
                className="text-lg sm:text-2xl text-white font-semibold leading-relaxed"
              >
                {line || <span className="inline-block h-4" />}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#8E8E93]">
            <Music2 className="w-16 h-16 mb-4 text-[#2C2C2E]" />
            <h4 className="text-xl font-bold text-white mb-2">No lyrics available</h4>
            <p className="text-sm text-[#8E8E93] max-w-sm text-center">
              Enjoy the instrumental and pure melody of this song.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Floating Scrubber & Playback Dock */}
      <div className="relative z-10 px-6 py-4 bg-black/80 backdrop-blur-xl border-t border-white/10 max-w-2xl mx-auto w-full mb-4 rounded-3xl shadow-2xl">
        <div className="w-full flex items-center gap-3 text-xs font-medium tabular-nums text-[#8E8E93] mb-2">
          <span>{formatTime(currentTime)}</span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              seek(ratio * duration);
            }}
            className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
          >
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={prevTrack}
            className="text-[#8E8E93] hover:text-white transition-colors"
            title="Previous"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>
          <button
            onClick={nextTrack}
            className="text-[#8E8E93] hover:text-white transition-colors"
            title="Next"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LyricsDrawer;
