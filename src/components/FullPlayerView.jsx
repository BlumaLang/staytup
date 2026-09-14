import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import { MarqueeText } from './MarqueeText';
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
  Volume2,
  VolumeX,
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
    isMuted,
    toggleMute,
    isLoadingStream,
    setIsLyricsDrawerOpen,
    setIsQueueModalOpen,
    setIsSleepTimerModalOpen,
    sleepTimerMode,
    sleepTimerRemaining,
  } = usePlayer();

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
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white select-none overflow-hidden animate-in slide-in-from-bottom duration-300">
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

      {/* Top Bar (Collapse chevron, title, options) */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4 sm:pt-6 pb-2">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Collapse Player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex-1 text-center px-4 min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#8E8E93]">Playing From</p>
          <p className="text-xs sm:text-sm font-bold text-white truncate">
            {currentTrack.album || currentTrack.playlist || 'Staytup Feed'}
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Center Section: Large Artwork */}
      <div className="relative z-10 flex-1 w-full max-w-sm sm:max-w-md mx-auto px-6 py-4 flex items-center justify-center my-auto">
        <div className="relative w-full aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-[#121212] shadow-2xl border border-white/10 group">
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
      </div>

      {/* Bottom Controls Area */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 sm:px-8 pb-8 pt-2">
        {/* Track Title, Artist, & Like Button */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="overflow-hidden mb-1">
              {currentTrack.title?.length > 22 ? (
                <MarqueeText
                  text={currentTrack.title}
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                />
              ) : (
                <h2 className="text-xl sm:text-2xl font-bold text-white line-clamp-1 tracking-tight">
                  {currentTrack.title}
                </h2>
              )}
            </div>
            <p className="text-sm sm:text-base text-[#8E8E93] line-clamp-1">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>

          <button
            onClick={handleLikeClick}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
              isLiked
                ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              className={`w-6 h-6 transition-transform duration-200 ${
                isLiked
                  ? 'fill-[#22C55E] stroke-[#22C55E] scale-110'
                  : 'stroke-white'
              }`}
            />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full mb-4">
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
          <div className="flex justify-between text-xs font-mono text-[#8E8E93]">
            <span>{formatTime(activeTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls (Prev, Play/Pause, Next) */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <button
            onClick={prevTrack}
            className="text-white/80 hover:text-white transition-colors active:scale-90 cursor-pointer"
            title="Previous"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-2xl"
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

          <button
            onClick={nextTrack}
            className="text-white/80 hover:text-white transition-colors active:scale-90 cursor-pointer"
            title="Next"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>
        </div>

        {/* Bottom Actions Row (Lyrics, Queue, Mute) */}
        <div className="flex items-center justify-between text-[#8E8E93] pt-2 border-t border-white/10">
          <button
            onClick={() => setIsLyricsDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer"
          >
            <Mic2 className="w-4 h-4" />
            <span>Lyrics</span>
          </button>

          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsQueueModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:text-white hover:bg-white/10 transition-colors text-xs font-semibold cursor-pointer"
          >
            <ListMusic className="w-4 h-4" />
            <span>Queue</span>
          </button>
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
