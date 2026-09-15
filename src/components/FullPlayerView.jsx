import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { MarqueeText } from './MarqueeText';
import { ArtistLinks } from './ArtistLinks';
import confetti from 'canvas-confetti';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  MoreHorizontal,
  Mic2,
  ListMusic,
  Moon,
  Shuffle,
  Repeat,
  Repeat1,
  Share2,
  Sparkles,
  Check,
} from 'lucide-react';
import { SongDetailsModal } from './SongDetailsModal';
import { PlaylistSheet } from './PlaylistSheet';
import { getSongUrl, shareContent } from '../utils/canonicalUrl';

export const FullPlayerView = ({ isOpen, onClose }) => {
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
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    isMuted,
    toggleMute,
    isLoadingStream,
    setIsLyricsDrawerOpen,
    setIsQueueModalOpen,
    setIsSleepTimerModalOpen,
    sleepTimerMode,
    sleepTimerRemaining,
    lyrics,
    queue,
    jumpToIndex,
  } = usePlayer();

  const [desktopSideTab, setDesktopSideTab] = useState('lyrics'); // 'lyrics' | 'queue'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  if (!isOpen || !currentTrack) return null;

  const videoId = String(currentTrack.videoId || currentTrack.video_id || currentTrack.id || '');
  const isLiked = likedTrackIds.has(videoId);
  const highResImage = get500x500Image(currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url);

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
          particleCount: 38,
          spread: 70,
          startVelocity: 24,
          origin: { x, y },
          colors: ['#22C55E', '#10B981', '#4ADE80', '#A7F3D0', '#FFFFFF', '#FACC15'],
          ticks: 180,
          gravity: 1.15,
          scalar: 0.85,
          disableForReducedMotion: true,
        });
      } catch (err) {}
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const url = getSongUrl(currentTrack);
    const result = await shareContent({
      title: `${currentTrack.title} - ${currentTrack.artist}`,
      text: `Listen to "${currentTrack.title}" by ${currentTrack.artist} on Staytup Music!`,
      url,
    });
    if (result.success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  const formatTimerBadge = () => {
    if (!sleepTimerMode) return null;
    if (sleepTimerMode === 'end_of_track') return 'End of Track';
    const m = Math.floor(sleepTimerRemaining / 60);
    const s = sleepTimerRemaining % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl text-white select-none overflow-hidden animate-in fade-in duration-200 lg:p-6">
      {/* Dynamic Blurred Artwork Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src={highResImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover blur-3xl scale-125 opacity-35 transition-opacity duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
      </div>

      {/* Main Player Card Container */}
      <div className="relative z-10 w-full h-full lg:max-w-5xl lg:max-h-[86vh] lg:rounded-3xl lg:border lg:border-white/10 lg:shadow-2xl lg:bg-[#121214]/90 lg:backdrop-blur-2xl flex flex-col justify-between overflow-hidden">
        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-4 sm:pt-6 pb-2 border-b border-white/5">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Minimize Player"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="flex-1 text-center px-4 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#8E8E93]">Playing From</p>
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              {currentTrack.album || currentTrack.playlist || 'Staytup Feed'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Quality Badge (Hidden on very small screens) */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Lossless 320kbps</span>
            </div>

            {/* Sleep Timer badge */}
            <button
              onClick={() => setIsSleepTimerModalOpen(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                sleepTimerMode
                  ? 'bg-indigo-600 text-white animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-[#8E8E93] hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Moon className={`w-4.5 h-4.5 ${sleepTimerMode ? 'fill-current' : ''}`} />
            </button>

            {/* Details / Options */}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE LAYOUT (< 1024px)                                                 */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-between px-6 sm:px-8 py-3 lg:hidden overflow-y-auto no-scrollbar">
          {/* Center Section: Large Artwork */}
          <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#121212] shadow-2xl border border-white/10 my-auto">
            <img
              src={highResImage}
              alt={currentTrack.title}
              onError={(e) => {
                e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
              }}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isLoadingStream ? 'opacity-40' : 'opacity-100'
              }`}
            />
            {isLoadingStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Track Info & Like */}
          <div className="w-full max-w-sm mx-auto mt-4 mb-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 pr-2">
                <div className="overflow-hidden mb-1">
                  {currentTrack.title?.length > 22 ? (
                    <MarqueeText
                      text={currentTrack.title}
                      className="text-xl font-extrabold text-white tracking-tight"
                    />
                  ) : (
                    <h2 className="text-xl font-extrabold text-white line-clamp-1 tracking-tight">
                      {currentTrack.title}
                    </h2>
                  )}
                </div>
                <div className="mt-0.5">
                  <ArtistLinks
                    track={currentTrack}
                    className="text-sm text-[#8E8E93]"
                    maxDisplay={3}
                    showAvatars={false}
                  />
                </div>
              </div>

              <button
                onClick={handleLikeClick}
                className="p-2.5 flex items-center justify-center transition-all active:scale-90 cursor-pointer text-[#8E8E93] hover:text-white"
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart
                  className={`w-7 h-7 transition-transform duration-200 ${
                    isLiked
                      ? 'fill-[#1ED760] text-[#1ED760] stroke-[#1ED760] scale-110'
                      : 'stroke-white'
                  }`}
                />
              </button>
            </div>

            {/* Timeline Scrubber */}
            <div className="w-full mt-3 mb-2">
              <div className="relative flex items-center py-2 group">
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
                  className="w-full h-1.5 group-hover:h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all"
                  style={{
                    background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs font-medium tabular-nums text-[#8E8E93]">
                <span>{formatTime(activeTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
            <div className="flex items-center justify-between px-2 mb-4">
              {/* Shuffle Button */}
              <button
                onClick={toggleShuffle}
                className={`relative p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${
                  isShuffle ? 'text-[#1ED760]' : 'text-[#8E8E93] hover:text-white'
                }`}
                title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
              >
                <Shuffle className="w-5 h-5" />
                {isShuffle && (
                  <span className="w-1 h-1 rounded-full bg-[#1ED760] absolute bottom-1 left-1/2 -translate-x-1/2" />
                )}
              </button>

              {/* Previous Track */}
              <button
                onClick={prevTrack}
                className="text-white/85 hover:text-white transition-all active:scale-90 cursor-pointer p-1"
                title="Previous"
              >
                <SkipBack className="w-7 h-7 fill-current" />
              </button>

              {/* Play / Pause Main Button */}
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all cursor-pointer shadow-2xl"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoadingStream ? (
                  <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 fill-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black ml-1" />
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={nextTrack}
                className="text-white/85 hover:text-white transition-all active:scale-90 cursor-pointer p-1"
                title="Next"
              >
                <SkipForward className="w-7 h-7 fill-current" />
              </button>

              {/* Repeat Button */}
              <button
                onClick={toggleRepeat}
                className={`relative p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${
                  repeatMode !== 'off' ? 'text-[#1ED760]' : 'text-[#8E8E93] hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
                {repeatMode !== 'off' && (
                  <span className="w-1 h-1 rounded-full bg-[#1ED760] absolute bottom-1 left-1/2 -translate-x-1/2" />
                )}
              </button>
            </div>

            {/* Bottom Actions Row (Lyrics, Share, Queue) — NO MUTE BUTTON */}
            <div className="flex items-center justify-between text-[#8E8E93] pt-2 border-t border-white/10">
              <button
                onClick={() => setIsLyricsDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer"
              >
                <Mic2 className="w-4 h-4" />
                <span>Lyrics</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer"
                title="Share track"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setIsQueueModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer"
              >
                <ListMusic className="w-4 h-4" />
                <span>Queue</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* UNIQUE DESKTOP STUDIO 2-COLUMN LAYOUT (≥ 1024px)                          */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex flex-1 p-6 xl:p-8 gap-8 xl:gap-10 min-h-0 overflow-hidden">
          {/* Left Column: Artwork, Title, Scrubber, Controls */}
          <div className="w-[380px] xl:w-[420px] flex flex-col justify-between flex-shrink-0">
            {/* Artwork with ambient shadow */}
            <div className="relative w-72 h-72 xl:w-80 xl:h-80 mx-auto rounded-2xl overflow-hidden bg-[#121212] shadow-2xl border border-white/10 group flex-shrink-0">
              <img
                src={highResImage}
                alt={currentTrack.title}
                onError={(e) => {
                  e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isLoadingStream ? 'opacity-40' : 'opacity-100'
                }`}
              />
              {isLoadingStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl xl:text-2xl font-black text-white line-clamp-1 tracking-tight">
                    {currentTrack.title}
                  </h2>
                  <div className="mt-1">
                    <ArtistLinks
                      track={currentTrack}
                      className="text-sm text-[#8E8E93]"
                      maxDisplay={3}
                      showAvatars={false}
                    />
                  </div>
                </div>

                <button
                  onClick={handleLikeClick}
                  className="p-2.5 flex items-center justify-center transition-all active:scale-90 cursor-pointer text-[#8E8E93] hover:text-white flex-shrink-0"
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart
                    className={`w-6 h-6 transition-transform duration-200 ${
                      isLiked
                        ? 'fill-[#1ED760] text-[#1ED760] stroke-[#1ED760] scale-110'
                        : 'stroke-white'
                    }`}
                  />
                </button>
              </div>

              {/* Scrubber Slider */}
              <div className="w-full mt-4 mb-2">
                <div className="relative flex items-center py-2 group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={1}
                    value={activeTime}
                    onMouseDown={() => setIsScrubbing(true)}
                    onChange={(e) => setScrubTime(parseFloat(e.target.value))}
                    onMouseUp={(e) => {
                      seek(parseFloat(e.target.value));
                      setIsScrubbing(false);
                    }}
                    className="w-full h-1.5 group-hover:h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all"
                    style={{
                      background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold tabular-nums text-[#8E8E93]">
                  <span>{formatTime(activeTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls Row */}
              <div className="flex items-center justify-center gap-6 mt-2">
                {/* Shuffle Button */}
                <button
                  onClick={toggleShuffle}
                  className={`relative p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${
                    isShuffle ? 'text-[#1ED760]' : 'text-[#8E8E93] hover:text-white'
                  }`}
                  title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <Shuffle className="w-5 h-5" />
                  {isShuffle && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ED760] absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                  )}
                </button>

                {/* Prev */}
                <button
                  onClick={prevTrack}
                  className="text-white/80 hover:text-white transition-all active:scale-90 cursor-pointer p-1"
                  title="Previous"
                >
                  <SkipBack className="w-7 h-7 fill-current" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all cursor-pointer shadow-2xl"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoadingStream ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6 fill-black" />
                  ) : (
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={nextTrack}
                  className="text-white/80 hover:text-white transition-all active:scale-90 cursor-pointer p-1"
                  title="Next"
                >
                  <SkipForward className="w-7 h-7 fill-current" />
                </button>

                {/* Repeat Button */}
                <button
                  onClick={toggleRepeat}
                  className={`relative p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${
                    repeatMode !== 'off' ? 'text-[#1ED760]' : 'text-[#8E8E93] hover:text-white'
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5" />
                  )}
                  {repeatMode !== 'off' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ED760] absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Sidekick Studio Panel (Live Synced Lyrics & Queue) */}
          <div className="flex-1 min-w-[320px] h-full flex flex-col bg-white/[0.03] border border-white/10 rounded-3xl p-5 overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDesktopSideTab('lyrics')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    desktopSideTab === 'lyrics'
                      ? 'bg-white text-black shadow-md'
                      : 'bg-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span>Synced Lyrics</span>
                </button>

                <button
                  onClick={() => setDesktopSideTab('queue')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    desktopSideTab === 'queue'
                      ? 'bg-white text-black shadow-md'
                      : 'bg-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Up Next ({queue.length})</span>
                </button>
              </div>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                title="Share track"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 min-h-0">
              {desktopSideTab === 'lyrics' ? (
                /* 1. Live Synced Lyrics View */
                lyrics?.is_synced && lyrics?.synced_lyrics?.length > 0 ? (
                  <div className="space-y-4 py-2">
                    {lyrics.synced_lyrics.map((line, idx) => {
                      const isActive =
                        currentTime >= line.time &&
                        (idx === lyrics.synced_lyrics.length - 1 ||
                          currentTime < lyrics.synced_lyrics[idx + 1].time);
                      const isPast =
                        idx < lyrics.synced_lyrics.length - 1 &&
                        currentTime >= lyrics.synced_lyrics[idx + 1].time;

                      return (
                        <p
                          key={idx}
                          onClick={() => seek(line.time)}
                          className={`text-base xl:text-lg font-bold transition-all duration-300 cursor-pointer rounded-lg px-3 py-1.5 hover:bg-white/5 select-none ${
                            isActive
                              ? 'text-white text-xl xl:text-2xl scale-[1.02] origin-left drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                              : isPast
                              ? 'text-white/40 hover:text-white/70'
                              : 'text-white/40 hover:text-white/70'
                          }`}
                        >
                          {line.text}
                        </p>
                      );
                    })}
                  </div>
                ) : lyrics?.plain_lyrics ? (
                  <div className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed px-2 font-medium">
                    {lyrics.plain_lyrics}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8E8E93]">
                    <Sparkles className="w-10 h-10 text-white/20 mb-3" />
                    <p className="text-base font-bold text-white mb-1">Sing along with your heart</p>
                    <p className="text-xs text-[#8E8E93] max-w-xs">
                      Synchronized lyrics are not available for this song, but you can switch to the queue to explore upcoming music.
                    </p>
                    <button
                      onClick={() => setDesktopSideTab('queue')}
                      className="mt-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      View Upcoming Queue
                    </button>
                  </div>
                )
              ) : (
                /* 2. Up Next Queue View */
                <div className="space-y-1.5">
                  {queue.map((t, idx) => {
                    const isCurrent = idx === (queue.indexOf(currentTrack) !== -1 ? queue.indexOf(currentTrack) : 0);
                    return (
                      <div
                        key={t.videoId || t.id || idx}
                        onClick={() => jumpToIndex(idx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-white/15 border border-white/15 text-white'
                            : 'hover:bg-white/5 text-[#8E8E93] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={get500x500Image(t.image || t.thumbnail)}
                            alt={t.title}
                            className="w-10 h-10 rounded-lg object-cover bg-black flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${isCurrent ? 'text-[#1ED760]' : 'text-white'}`}>
                              {t.title}
                            </p>
                            <p className="text-xs text-[#8E8E93] truncate mt-0.5">{t.artist}</p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#1ED760] font-bold px-2 py-0.5 rounded-full bg-[#1ED760]/10 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1ED760] animate-ping" />
                            <span>Playing</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8E8E93] tabular-nums flex-shrink-0">
                            {formatTime(t.duration || t.duration_seconds)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Options & Sheet Modals */}
      <SongDetailsModal
        track={currentTrack}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        isLiked={isLiked}
        onToggleLike={() => toggleLike(currentTrack)}
        onViewLyrics={() => setIsLyricsDrawerOpen(true)}
        onAddToPlaylist={() => setShowPlaylistSheet(true)}
        onViewArtist={() => {}}
        onOpenQueue={() => setIsQueueModalOpen(true)}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onShare={handleShare}
        isCopied={isCopied}
      />

      <PlaylistSheet
        track={currentTrack}
        isOpen={showPlaylistSheet}
        onClose={() => setShowPlaylistSheet(false)}
      />
    </div>
  );
};

export default FullPlayerView;
