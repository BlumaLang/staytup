import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { MarqueeText } from './MarqueeText';
import { ArtistLinks } from './ArtistLinks';
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
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { SongDetailsModal } from './SongDetailsModal';
import { PlaylistSheet } from './PlaylistSheet';
import { getSongUrl, shareContent } from '../utils/canonicalUrl';

// Dynamic background theme palette generator matching Spotify's immersive canvas
const getTrackTheme = (track) => {
  if (!track) return { bg: '#421128', via: '#260917', to: '#0d0308' };
  const str = `${track.title || ''}-${track.artist || ''}-${track.album || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const themes = [
    { bg: '#5c1538', via: '#380c21', to: '#14040c' }, // Rich Berry Wine (Matching Spotify Screenshot)
    { bg: '#4c174f', via: '#2d0c2e', to: '#0e040f' }, // Deep Velvet Plum
    { bg: '#1c3b52', via: '#0f2231', to: '#060d13' }, // Midnight Ocean
    { bg: '#1c4d38', via: '#102e21', to: '#05110c' }, // Forest Emerald
    { bg: '#582b13', via: '#36180a', to: '#120803' }, // Warm Roasted Amber
    { bg: '#3d1d61', via: '#231039', to: '#0b0512' }, // Royal Twilight Indigo
    { bg: '#541528', via: '#310b17', to: '#110408' }, // Crimson Romance
    { bg: '#23253a', via: '#161725', to: '#090a10' }, // Dark Sapphire Obsidian
  ];
  return themes[Math.abs(hash) % themes.length];
};

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
    volume = 1,
    setVolume,
    isLoadingStream,
    setIsLyricsDrawerOpen,
    setIsQueueModalOpen,
    setIsSleepTimerModalOpen,
    sleepTimerMode,
    sleepTimerRemaining,
    lyrics,
    activeLyricIndex,
    queue,
    jumpToIndex,
  } = usePlayer();

  const [desktopView, setDesktopView] = useState('lyrics'); // 'lyrics' | 'queue' | 'artwork'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const desktopLyricsContainerRef = useRef(null);
  const desktopActiveLineRef = useRef(null);

  // Auto-scroll lyrics in desktop view to keep active line centered
  useEffect(() => {
    if (desktopActiveLineRef.current && desktopLyricsContainerRef.current) {
      desktopActiveLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, currentTime]);

  if (!isOpen || !currentTrack) return null;

  const videoId = String(currentTrack.videoId || currentTrack.video_id || currentTrack.id || '');
  const isLiked = likedTrackIds.has(videoId);
  const highResImage = get500x500Image(
    currentTrack.image || currentTrack.thumbnail || currentTrack.artwork_url
  );
  const theme = getTrackTheme(currentTrack);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatRemainingTime = (total, current) => {
    if (isNaN(total) || total <= 0) return '-0:00';
    const remaining = Math.max(0, total - (current || 0));
    return `-${formatTime(remaining)}`;
  };

  const activeTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  // Like button handler
  const handleLikeClick = (e) => {
    e.stopPropagation();
    toggleLike(currentTrack);
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
    <div className="fixed inset-0 z-50 w-full h-[100dvh] flex flex-col text-white select-none overflow-hidden animate-in fade-in duration-200">
      {/* Dynamic Immersive Background Canvas */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-colors duration-700"
        style={{
          background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.via} 50%, ${theme.to} 100%)`,
        }}
      >
        {/* Ambient blurred artwork glow overlay */}
        <img
          src={highResImage}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover blur-3xl scale-125 opacity-25 mix-blend-screen transition-opacity duration-700 pointer-events-none"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER BAR (Mobile & Desktop)                                         */}
      {/* Matching media_1789497665502.jpg                                          */}
      {/* ========================================================================= */}
      <div className="relative z-20 flex items-center justify-between px-5 sm:px-8 pt-3 sm:pt-4 pb-2 flex-shrink-0">
        {/* Left: Minimize Player button (Chevron Down) */}
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer -ml-2"
          title="Minimize Player"
          aria-label="Minimize Player"
        >
          <ChevronDown className="w-7 h-7 stroke-[2.2]" />
        </button>

        {/* Center: Track title centered on mobile (media_1789497665502.jpg shows "Ehsaas" centered) */}
        <div className="flex-1 text-center px-4 min-w-0">
          <p className="text-sm sm:text-base font-bold text-white truncate max-w-sm mx-auto">
            {currentTrack.title}
          </p>
        </div>

        {/* Right Header: Desktop View Toggles & 3-Dots */}
        <div className="flex items-center gap-1 -mr-2">
          {/* Desktop View Switcher (Lyrics | Queue | Artwork) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-black/30 p-1 rounded-full border border-white/10 mr-2">
            <button
              onClick={() => setDesktopView('lyrics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                desktopView === 'lyrics'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>

            <button
              onClick={() => setDesktopView('queue')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                desktopView === 'queue'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Queue ({queue.length})</span>
            </button>

            <button
              onClick={() => setDesktopView('artwork')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                desktopView === 'artwork'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cover</span>
            </button>
          </div>

          {/* Mobile & Desktop Options 3-Dots */}
          <button
            onClick={() => setShowDetailsModal(true)}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="More Options"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE FULL-SCREEN PLAYER LAYOUT (< 1024px)                               */}
      {/* Matching media_1789497665502.jpg                                          */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex-1 flex flex-col justify-between px-6 pt-1 pb-6 relative z-10 overflow-hidden select-none">
        {/* Large Artwork */}
        <div className="relative w-full max-w-[340px] sm:max-w-sm mx-auto aspect-square rounded-lg overflow-hidden bg-black/40 shadow-[0_16px_36px_rgba(0,0,0,0.6)] my-auto flex-shrink-0">
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

        {/* Track Title, Artist & Spotify Circular Green Checkmark / Heart */}
        <div className="w-full max-w-[340px] sm:max-w-sm mx-auto flex-shrink-0">
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex-1 min-w-0 pr-1">
              <div className="overflow-hidden">
                <MarqueeText
                  text={currentTrack.title}
                  className="text-2xl font-black text-white tracking-tight"
                />
              </div>
              <div className="text-sm text-[#A7A7A7] font-medium truncate mt-0.5">
                <ArtistLinks track={currentTrack} showAvatars={false} />
              </div>
            </div>

            {/* Like Button: Green circular filled checkmark when liked (Matching Screenshot), outline heart when not liked */}
            <button
              onClick={handleLikeClick}
              className="w-8 h-8 flex items-center justify-center transition-transform active:scale-90 cursor-pointer flex-shrink-0"
              title={isLiked ? 'Liked' : 'Like'}
            >
              {isLiked ? (
                <div className="w-6 h-6 rounded-full bg-[#1ED760] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-black stroke-[3.5]" />
                </div>
              ) : (
                <Heart className="w-6 h-6 stroke-white/80 hover:stroke-white fill-none stroke-[2]" />
              )}
            </button>
          </div>

          {/* Timeline Scrubber with negative remaining time (e.g. -3:36) */}
          <div className="w-full mt-4">
            <div className="relative flex items-center py-1 group">
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
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all"
                style={{
                  background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium tabular-nums text-[#B3B3B3] pt-1">
              <span>{formatTime(activeTime)}</span>
              <span>{formatRemainingTime(duration, activeTime)}</span>
            </div>
          </div>

          {/* Main Controls Row: Shuffle -> Prev -> Big White Circular Play/Pause -> Next -> Timer */}
          <div className="flex items-center justify-between px-1 mt-4 mb-4">
            <button
              onClick={toggleShuffle}
              className={`relative p-2 transition-all active:scale-90 cursor-pointer ${
                isShuffle ? 'text-[#1ED760]' : 'text-white/70 hover:text-white'
              }`}
              title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            >
              <Shuffle className="w-5 h-5 stroke-[2]" />
              {isShuffle && (
                <span className="w-1 h-1 rounded-full bg-[#1ED760] absolute bottom-1 left-1/2 -translate-x-1/2" />
              )}
            </button>

            <button
              onClick={prevTrack}
              className="text-white hover:text-white transition-all active:scale-90 cursor-pointer p-2"
              title="Previous"
            >
              <SkipBack className="w-7 h-7 fill-current stroke-0" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all cursor-pointer shadow-xl"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoadingStream ? (
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-black stroke-0" />
              ) : (
                <Play className="w-7 h-7 fill-black stroke-0 ml-1" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-white hover:text-white transition-all active:scale-90 cursor-pointer p-2"
              title="Next"
            >
              <SkipForward className="w-7 h-7 fill-current stroke-0" />
            </button>

            {/* Sleep Timer Icon (replacing repeat on main row matching Spotify icon) */}
            <button
              onClick={() => setIsSleepTimerModalOpen(true)}
              className={`relative p-2 transition-all active:scale-90 cursor-pointer ${
                sleepTimerMode ? 'text-[#1ED760]' : 'text-white/70 hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Moon className="w-5 h-5 stroke-[2]" />
              {sleepTimerMode && (
                <span className="w-1 h-1 rounded-full bg-[#1ED760] absolute bottom-1 left-1/2 -translate-x-1/2" />
              )}
            </button>
          </div>

          {/* Auxiliary Row: Cast/Device on left, Share & Queue on right (Matching media_1789497665502.jpg) */}
          <div className="flex items-center justify-between px-1 mb-4 text-[#B3B3B3]">
            {/* Cast / Device icon */}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="hover:text-white transition-colors cursor-pointer p-1"
              title="Devices / Details"
            >
              <Volume2 className="w-5 h-5 stroke-[2]" />
            </button>

            <div className="flex items-center gap-5">
              <button
                onClick={handleShare}
                className="hover:text-white transition-colors cursor-pointer p-1"
                title="Share track"
              >
                <Share2 className="w-5 h-5 stroke-[2]" />
              </button>

              <button
                onClick={() => setIsQueueModalOpen(true)}
                className="hover:text-white transition-colors cursor-pointer p-1"
                title="Queue"
              >
                <ListMusic className="w-5 h-5 stroke-[2]" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Lyrics Preview Card (Matching media_1789497665502.jpg) */}
        <div
          onClick={() => setIsLyricsDrawerOpen(true)}
          className="w-full max-w-[340px] sm:max-w-sm mx-auto bg-[#4a4a4a]/50 hover:bg-[#5a5a5a]/60 backdrop-blur-md rounded-2xl p-4 pt-3 cursor-pointer transition-all border border-white/5 active:scale-[0.99] flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-sm font-bold text-white tracking-tight">Lyrics preview</h4>
            <Mic2 className="w-4 h-4 text-white/60" />
          </div>
          <p className="text-sm font-semibold text-white/90 truncate">
            {lyrics?.synced_lyrics?.[activeLyricIndex]?.text ||
              lyrics?.plain_lyrics?.split('\n').filter(Boolean)[0] ||
              'Tap to view lyrics & sing along'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP IMMERSIVE FULL-SCREEN VIEW (Matching media_1789491878547.png)      */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-1 w-full min-h-0 overflow-hidden relative z-10 px-8 xl:px-12 py-4 gap-10">
        {/* ------------------------------------------------------------------------- */}
        {/* Left / Center Area: Synchronized Lyrics (Matching Screenshot)             */}
        {/* ------------------------------------------------------------------------- */}
        <div className="flex-1 h-full flex flex-col justify-between min-w-0 pr-4">
          {desktopView === 'lyrics' ? (
            /* HUGE SYNCHRONIZED LYRICS DISPLAY */
            <div
              ref={desktopLyricsContainerRef}
              className="flex-1 overflow-y-auto no-scrollbar py-12 scroll-smooth space-y-6 xl:space-y-8 select-none"
            >
              {lyrics?.is_synced && lyrics?.synced_lyrics?.length > 0 ? (
                lyrics.synced_lyrics.map((line, idx) => {
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
                      ref={isActive ? desktopActiveLineRef : null}
                      onClick={() => seek(line.time)}
                      className={`transition-all duration-300 cursor-pointer rounded-2xl px-4 py-2 hover:bg-white/10 select-none ${
                        isActive
                          ? 'text-white text-3xl sm:text-4xl xl:text-5xl font-black drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)] scale-[1.03] origin-left'
                          : isPast
                          ? 'text-white/35 hover:text-white/70 text-2xl sm:text-3xl xl:text-4xl font-extrabold'
                          : 'text-white/35 hover:text-white/70 text-2xl sm:text-3xl xl:text-4xl font-extrabold'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : lyrics?.plain_lyrics ? (
                <div className="text-white/80 text-xl xl:text-2xl font-bold whitespace-pre-wrap leading-loose px-4 max-w-3xl">
                  {lyrics.plain_lyrics}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/50">
                  <Sparkles className="w-16 h-16 text-white/20 mb-4 animate-pulse" />
                  <h3 className="text-2xl font-black text-white mb-2">
                    Sing along with your favorite tracks
                  </h3>
                  <p className="text-sm text-white/60 max-w-md mb-6">
                    Synchronized lyrics for "{currentTrack.title}" aren't available yet, but you can explore the queue or enjoy full album artwork.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDesktopView('queue')}
                      className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg"
                    >
                      View Queue
                    </button>
                    <button
                      onClick={() => setDesktopView('artwork')}
                      className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors cursor-pointer"
                    >
                      Show Artwork
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : desktopView === 'queue' ? (
            /* Queue Display */
            <div className="flex-1 overflow-y-auto no-scrollbar py-6 space-y-2 max-w-3xl">
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4">
                Playback Queue ({queue.length} songs)
              </h3>
              {queue.map((t, idx) => {
                const isCurrent =
                  idx === (queue.indexOf(currentTrack) !== -1 ? queue.indexOf(currentTrack) : 0);
                return (
                  <div
                    key={t.videoId || t.id || idx}
                    onClick={() => jumpToIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-white/20 border border-white/20 text-white'
                        : 'hover:bg-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={get500x500Image(t.image || t.thumbnail)}
                        alt={t.title}
                        className="w-12 h-12 rounded-xl object-cover shadow-md flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-bold truncate ${
                            isCurrent ? 'text-[#1ED760]' : 'text-white'
                          }`}
                        >
                          {t.title}
                        </p>
                        <p className="text-xs text-white/60 truncate mt-0.5">{t.artist}</p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs text-[#1ED760] font-bold px-2.5 py-1 rounded-full bg-[#1ED760]/20">
                        Playing Now
                      </span>
                    ) : (
                      <span className="text-xs font-semibold tabular-nums text-white/50">
                        {formatTime(t.duration || t.duration_seconds)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Massive Artwork Display */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="relative w-80 h-80 xl:w-96 xl:h-96 rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
                <img
                  src={highResImage}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover shadow-2xl"
                />
              </div>
            </div>
          )}

          {/* Desktop Timeline & Controls Bar */}
          <div className="w-full pt-4 pb-2 border-t border-white/10">
            {/* Scrubber */}
            <div className="w-full mb-2">
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
              <div className="flex justify-between text-xs font-semibold tabular-nums text-white/60">
                <span>{formatTime(activeTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between">
              {/* Left track snippet */}
              <div className="flex items-center gap-3 min-w-0 max-w-xs">
                <img
                  src={highResImage}
                  alt={currentTrack.title}
                  className="w-11 h-11 rounded-lg object-cover shadow-md flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                  <p className="text-xs text-white/60 truncate">{currentTrack.artist}</p>
                </div>
                <button
                  onClick={handleLikeClick}
                  className={`p-1.5 transition-all cursor-pointer ${
                    isLiked ? 'text-[#1ED760]' : 'text-white/60 hover:text-white'
                  }`}
                  title={isLiked ? 'Liked' : 'Like'}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isLiked ? 'fill-[#1ED760] stroke-[#1ED760]' : 'stroke-white'
                    }`}
                  />
                </button>
              </div>

              {/* Center Playback Controls */}
              <div className="flex items-center gap-5">
                <button
                  onClick={toggleShuffle}
                  className={`p-2 transition-colors cursor-pointer ${
                    isShuffle ? 'text-[#1ED760]' : 'text-white/60 hover:text-white'
                  }`}
                  title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={prevTrack}
                  className="text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer p-1"
                  title="Previous"
                >
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all cursor-pointer shadow-xl mx-1"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoadingStream ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-black stroke-0" />
                  ) : (
                    <Play className="w-5 h-5 fill-black stroke-0 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer p-1"
                  title="Next"
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-2 transition-colors cursor-pointer ${
                    repeatMode !== 'off' ? 'text-[#1ED760]' : 'text-white/60 hover:text-white'
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Right Tools (Volume, Share, Sleep Timer) */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleShare}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Share track"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setIsSleepTimerModalOpen(true)}
                  className={`transition-colors cursor-pointer ${
                    sleepTimerMode ? 'text-indigo-400' : 'text-white/60 hover:text-white'
                  }`}
                  title="Sleep Timer"
                >
                  <Moon className="w-5 h-5" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 group">
                  <button onClick={toggleMute} className="text-white/60 hover:text-white cursor-pointer">
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume && setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* Right Side Dock: Now Playing Card & "About the artist" (Matching Screenshot)*/}
        {/* ------------------------------------------------------------------------- */}
        <div className="w-80 xl:w-96 h-full flex flex-col justify-between bg-black/35 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl overflow-y-auto no-scrollbar flex-shrink-0">
          <div>
            {/* Top header label */}
            <p className="text-xs font-bold text-white/70 truncate mb-3">
              {currentTrack.album || 'Now Playing'}
            </p>

            {/* Large Artwork Card */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/50 shadow-2xl border border-white/10 mb-4 group">
              <img
                src={highResImage}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Track Info with Liked Green Checkmark badge */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-black text-white truncate tracking-tight leading-snug">
                  {currentTrack.title}
                </h3>
                <p className="text-sm text-white/70 font-semibold truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              {isLiked ? (
                <div className="w-7 h-7 rounded-full bg-[#1ED760] text-black flex items-center justify-center flex-shrink-0 shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <button
                  onClick={handleLikeClick}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* "About the artist" Card (Exact Spotify Layout) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-white">
                About the artist
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={highResImage}
                  alt={currentTrack.artist}
                  className="w-14 h-14 rounded-full object-cover shadow-md flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{currentTrack.artist}</p>
                  <p className="text-xs text-white/60 truncate mt-0.5">
                    {currentTrack.genres || 'Bollywood • Hindi Pop • Indie'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions at bottom of right card */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-white/70">
            <button
              onClick={() => setShowPlaylistSheet(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Add to Playlist
            </button>
            <button
              onClick={() => setShowDetailsModal(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Credits & Info
            </button>
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
