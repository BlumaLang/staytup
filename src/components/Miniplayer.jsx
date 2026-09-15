import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { MarqueeText } from './MarqueeText';
import { ArtistLinks } from './ArtistLinks';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  Volume1,
  ListMusic,
  Mic2,
  Moon,
  Maximize2,
  Shuffle,
  Repeat,
  PanelRight,
  ChevronUp,
} from 'lucide-react';

export const Miniplayer = ({ onExpand, showNowPlayingSide, onToggleNowPlayingSide }) => {
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
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isLoadingStream,
    setIsLyricsDrawerOpen,
    setIsQueueModalOpen,
    setIsSleepTimerModalOpen,
    sleepTimerMode,
    sleepTimerRemaining,
  } = usePlayer();

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isRepeatOn, setIsRepeatOn] = useState(false);

  if (!currentTrack) return null;

  const videoId = String(currentTrack.videoId || currentTrack.video_id || currentTrack.id || '');
  const isLiked = likedTrackIds.has(videoId);
  const artwork = get500x500Image(
    currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url
  );

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  const handleLikeClick = (e) => {
    e.stopPropagation();
    const willLike = !isLiked;
    toggleLike(currentTrack);

    if (willLike) {
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
          particleCount: 36,
          spread: 65,
          startVelocity: 22,
          origin: { x, y },
          colors: ['#22C55E', '#10B981', '#4ADE80', '#A7F3D0', '#FFFFFF', '#FACC15'],
          ticks: 160,
          gravity: 1.15,
          scalar: 0.85,
          disableForReducedMotion: true,
        });
      } catch (err) {}
    }
  };

  const formatTimerBadge = () => {
    if (!sleepTimerMode) return null;
    if (sleepTimerMode === 'end_of_track') return 'End';
    const m = Math.floor(sleepTimerRemaining / 60);
    const s = sleepTimerRemaining % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MOBILE & TABLET COMPACT MINIPLAYER (< 1024px)                             */}
      {/* Integrated flush on top of BottomNav with solid dark surface              */}
      {/* ========================================================================= */}
      <div
        onClick={onExpand}
        className="lg:hidden fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 bg-[#121214] border-t border-white/[0.08] cursor-pointer select-none shadow-xl"
      >
        <div className="flex items-center justify-between px-3.5 pt-2 pb-2 gap-3 max-w-md mx-auto">
          {/* Left: Artwork + Title & Artist */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-white/10 shadow-sm">
              <img
                src={artwork}
                alt={currentTrack.title}
                onError={(e) => {
                  e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 pr-1 overflow-hidden">
              <p className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">
                {currentTrack.title}
              </p>
              <div className="mt-0.5 truncate overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <ArtistLinks
                  track={currentTrack}
                  className="text-[11px] text-[#A1A1AA] hover:text-white"
                  maxDisplay={2}
                  showAvatars={false}
                  singleLine={true}
                />
              </div>
            </div>
          </div>

          {/* Right: Like, Play/Pause */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleLikeClick}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer active:scale-90"
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-5 h-5 transition-transform duration-200 ${
                  isLiked
                    ? 'fill-[#1ED760] text-[#1ED760] stroke-[#1ED760] scale-110'
                    : 'stroke-white/80 hover:stroke-white'
                }`}
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoadingStream ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-black" />
              ) : (
                <Play className="w-4 h-4 fill-black ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Progress Line (Prominently visible above BottomNav across all mobile heights) */}
        <div className="w-full h-[3px] bg-white/20 relative overflow-hidden">
          <div
            className="h-full bg-[#1ED760] transition-all duration-150 shadow-[0_0_6px_rgba(30,215,96,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP FULL-WIDTH INTEGRATED BOTTOM PLAYER (≥ 1024px)                    */}
      {/* Exactly matches Spotify desktop layout                                   */}
      {/* ========================================================================= */}
      <footer className="hidden lg:flex relative h-[88px] w-full flex-shrink-0 z-40 bg-black border-t border-[#1C1C1E] px-4 items-center justify-between select-none">
        {/* Left Section: Track Artwork, Title, Artist, Liked Status (~30%) */}
        <div className="flex items-center gap-3.5 w-[30%] min-w-[220px] max-w-[360px]">
          <div
            onClick={onExpand}
            className="relative w-14 h-14 rounded-md overflow-hidden bg-black flex-shrink-0 border border-white/10 cursor-pointer group shadow-md"
          >
            <img
              src={artwork}
              alt={currentTrack.title}
              onError={(e) => {
                e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
              }}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ChevronUp className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p
              onClick={onExpand}
              className="text-sm font-semibold text-white hover:text-gray-200 transition-colors cursor-pointer line-clamp-1 tracking-tight"
            >
              {currentTrack.title}
            </p>
            <div className="mt-0.5">
              <ArtistLinks
                track={currentTrack}
                className="text-xs text-[#8E8E93]"
                maxDisplay={2}
                showAvatars={false}
              />
            </div>
          </div>

          <button
            onClick={handleLikeClick}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer flex-shrink-0"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              className={`w-4.5 h-4.5 transition-transform duration-200 ${
                isLiked
                  ? 'fill-[#22C55E] text-[#22C55E] stroke-[#22C55E] scale-110'
                  : 'stroke-white/70 hover:stroke-white'
              }`}
            />
          </button>
        </div>

        {/* Center Section: Playback Controls & Scrubber Slider (~40%) */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-2xl px-4">
          {/* Top Controls Row */}
          <div className="flex items-center gap-5 mb-1.5">
            <button
              onClick={() => setIsShuffleOn((prev) => !prev)}
              className={`transition-colors cursor-pointer ${
                isShuffleOn ? 'text-[#22C55E]' : 'text-[#8E8E93] hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prevTrack}
              className="text-[#8E8E93] hover:text-white transition-colors active:scale-95 cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-4.5 h-4.5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:scale-105 text-black flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoadingStream ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4.5 h-4.5 fill-black" />
              ) : (
                <Play className="w-4.5 h-4.5 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-[#8E8E93] hover:text-white transition-colors active:scale-95 cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-4.5 h-4.5 fill-current" />
            </button>

            <button
              onClick={() => setIsRepeatOn((prev) => !prev)}
              className={`transition-colors cursor-pointer ${
                isRepeatOn ? 'text-[#22C55E]' : 'text-[#8E8E93] hover:text-white'
              }`}
              title="Repeat"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber timeline */}
          <div className="w-full flex items-center gap-2.5 text-[11px] tabular-nums font-medium text-[#8E8E93]">
            <span className="w-8 text-right select-none">{formatTime(activeTime)}</span>
            <div className="flex-1 relative flex items-center group py-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={1}
                value={activeTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={(e) => setScrubTime(parseFloat(e.target.value))}
                onMouseUp={(e) => {
                  seek(parseFloat(e.target.value));
                  setIsScrubbing(false);
                }}
                onTouchEnd={(e) => {
                  seek(parseFloat(e.target.value));
                  setIsScrubbing(false);
                }}
                className="w-full h-1 group-hover:h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all"
                style={{
                  background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                }}
              />
            </div>
            <span className="w-8 select-none">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Volume & Feature Shortcuts (~30%) */}
        <div className="flex items-center justify-end gap-2.5 w-[30%] min-w-[220px] text-[#8E8E93]">
          {/* Synchronized Lyrics */}
          <button
            onClick={() => setIsLyricsDrawerOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue */}
          <button
            onClick={() => setIsQueueModalOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Sleep Timer */}
          <button
            onClick={() => setIsSleepTimerModalOpen(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              sleepTimerMode
                ? 'bg-indigo-600/90 text-white animate-pulse'
                : 'hover:text-white hover:bg-white/5'
            }`}
            title="Sleep Timer"
          >
            <Moon className={`w-3.5 h-3.5 ${sleepTimerMode ? 'fill-current' : ''}`} />
            {formatTimerBadge() && <span>{formatTimerBadge()}</span>}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 pl-1 group">
            <button
              onClick={toggleMute}
              className="hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 xl:w-24 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all group-hover:h-1.5"
              style={{
                background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>

          {/* Now Playing Side Panel Toggle (on xl+ screens) */}
          {onToggleNowPlayingSide && (
            <button
              onClick={onToggleNowPlayingSide}
              className={`w-8 h-8 rounded-full hidden xl:flex items-center justify-center transition-colors cursor-pointer ${
                showNowPlayingSide ? 'text-[#22C55E]' : 'hover:text-white hover:bg-white/5'
              }`}
              title="Now Playing & Queue Panel"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* Expand Full Player */}
          <button
            onClick={onExpand}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-0.5"
            title="Full Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
};

export default Miniplayer;
