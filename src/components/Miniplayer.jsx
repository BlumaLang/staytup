import React, { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { MarqueeText } from './MarqueeText';
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
  ChevronUp,
} from 'lucide-react';

export const Miniplayer = ({ onExpand }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    seekTo,
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

  if (!currentTrack) return null;

  const videoId = String(currentTrack.videoId || currentTrack.video_id || currentTrack.id || '');
  const isLiked = likedTrackIds.has(videoId);
  const artwork = get500x500Image(currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url);

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

  const handleScrubberChange = (e) => {
    const val = parseFloat(e.target.value);
    setScrubTime(val);
  };

  const handleScrubberCommit = (e) => {
    const val = parseFloat(e.target.value);
    seek(val);
    setIsScrubbing(false);
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
      {/* MOBILE & TABLET COMPACT MINIPLAYER (< 1024px)                             */}
      {/* Docked directly above BottomNav                                           */}
      {/* ========================================================================= */}
      <div
        onClick={onExpand}
        className="lg:hidden fixed bottom-[58px] left-2 right-2 z-40 bg-[#141416]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform select-none"
      >
        {/* Top Slim Progress Bar */}
        <div className="w-full h-[2.5px] bg-white/10 relative overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-3 py-2 gap-3">
          {/* Left: Artwork + Title & Artist */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={artwork}
              alt={currentTrack.title}
              onError={(e) => {
                e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
              }}
              className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0 border border-white/10"
            />
            <div className="min-w-0 flex-1 pr-1">
              <div className="overflow-hidden">
                {currentTrack.title?.length > 22 ? (
                  <MarqueeText
                    text={currentTrack.title}
                    className="text-xs sm:text-sm font-bold text-white tracking-tight"
                  />
                ) : (
                  <p className="text-xs sm:text-sm font-bold text-white line-clamp-1 tracking-tight">
                    {currentTrack.title}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-[#8E8E93] line-clamp-1 mt-0.5">
                {currentTrack.artist || 'Unknown Artist'}
              </p>
            </div>
          </div>

          {/* Right: Controls (Like, Play/Pause, Expand Chevron) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Like button */}
            <button
              onClick={handleLikeClick}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-4.5 h-4.5 transition-transform duration-200 ${
                  isLiked
                    ? 'fill-[#22C55E] text-[#22C55E] stroke-[#22C55E] scale-110'
                    : 'stroke-white'
                }`}
              />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-md"
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
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP FULL-WIDTH BOTTOM MINIPLAYER (≥ 1024px)                           */}
      {/* Spotify-style ~90px persistent bar below sidebar & content               */}
      {/* ========================================================================= */}
      <div
        className="hidden lg:flex fixed bottom-0 left-0 right-0 h-[88px] z-50 bg-[#0A0A0C] border-t border-[#1C1C1E] px-5 items-center justify-between select-none"
      >
        {/* Left Section: Track Info & Like (~30% width) */}
        <div className="flex items-center gap-3.5 w-[30%] min-w-[200px] max-w-[360px]">
          <div
            onClick={onExpand}
            className="relative w-14 h-14 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10 cursor-pointer group"
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
            <div className="overflow-hidden">
              {currentTrack.title?.length > 25 ? (
                <MarqueeText
                  text={currentTrack.title}
                  className="text-sm font-bold text-white tracking-tight"
                />
              ) : (
                <p className="text-sm font-bold text-white line-clamp-1 tracking-tight">
                  {currentTrack.title}
                </p>
              )}
            </div>
            <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5 hover:text-white transition-colors cursor-pointer">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>

          <button
            onClick={handleLikeClick}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer flex-shrink-0"
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

        {/* Center Section: Playback Controls & Progress Bar (~40% width) */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-xl px-4">
          {/* Controls row */}
          <div className="flex items-center gap-5 mb-1.5">
            <button
              onClick={prevTrack}
              className="text-[#8E8E93] hover:text-white transition-colors active:scale-95 cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-4.5 h-4.5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 text-black flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
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

            <button
              onClick={nextTrack}
              className="text-[#8E8E93] hover:text-white transition-colors active:scale-95 cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-4.5 h-4.5 fill-current" />
            </button>
          </div>

          {/* Scrubber timeline */}
          <div className="w-full flex items-center gap-2 text-[11px] font-mono text-[#8E8E93]">
            <span className="w-9 text-right">{formatTime(activeTime)}</span>
            <div className="flex-1 relative flex items-center group py-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={1}
                value={activeTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={handleScrubberChange}
                onMouseUp={handleScrubberCommit}
                onTouchEnd={handleScrubberCommit}
                className="w-full h-1 group-hover:h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all"
                style={{
                  background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                }}
              />
            </div>
            <span className="w-9">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Volume & Quick Actions (~30% width) */}
        <div className="flex items-center justify-end gap-3 w-[30%] min-w-[200px] text-[#8E8E93]">
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

          {/* Volume slider */}
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
              className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all group-hover:h-1.5"
              style={{
                background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>

          {/* Expand Full Player View */}
          <button
            onClick={onExpand}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-1"
            title="Full Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Miniplayer;
