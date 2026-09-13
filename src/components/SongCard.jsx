import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image, extractDominantColor, extractEdgeColors } from '../utils/media';
import { MarqueeText } from './MarqueeText';
import {
  Heart,
  Play,
  Pause,
  MoreHorizontal,
  Mic2,
  User,
  ChevronRight,
  X,
} from 'lucide-react';
import { ArtistSheet } from './ArtistSheet';
import { PlaylistSheet } from './PlaylistSheet';
import { SongDetailsModal } from './SongDetailsModal';

export const SongCard = ({ track, isActive }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    likedTrackIds,
    toggleLike,
    lyrics,
    activeLyricIndex,
    setIsLyricsDrawerOpen,
    setIsQueueModalOpen,
    isMuted,
    toggleMute,
    isLoadingStream,
  } = usePlayer();

  const [showArtistSheet, setShowArtistSheet] = useState(false);
  const [selectedArtistName, setSelectedArtistName] = useState('');
  const [showArtistPicker, setShowArtistPicker] = useState(false);
  const [artistImages, setArtistImages] = useState({});
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [themeRgb, setThemeRgb] = useState('25, 25, 30');
  const [topRgb, setTopRgb] = useState('25, 25, 30');
  const [bottomRgb, setBottomRgb] = useState('15, 15, 18');

  const videoId = String(track.videoId || track.video_id || track.id || '');
  const isLiked = likedTrackIds.has(videoId);

  const highResImage = get500x500Image(track.image || track.thumbnail || track.artwork_url);

  useEffect(() => {
    let isMounted = true;
    extractDominantColor(highResImage).then((rgb) => {
      if (isMounted && rgb) {
        setThemeRgb(rgb);
      }
    });
    extractEdgeColors(highResImage).then((edges) => {
      if (isMounted && edges) {
        setTopRgb(edges.topRgb);
        setBottomRgb(edges.bottomRgb);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [highResImage]);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleShare = async () => {
    const text = `Listen to ${track.title} by ${track.artist} on Staytup Music!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text, url: window.location.href });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const currentLyricLine =
    lyrics?.is_synced &&
    Array.isArray(lyrics?.synced_lyrics) &&
    activeLyricIndex >= 0 &&
    lyrics.synced_lyrics[activeLyricIndex]
      ? lyrics.synced_lyrics[activeLyricIndex].text
      : null;

  // Extract separate artists from artist string (e.g. "Arijit Singh, Shreya Ghoshal & Pritam")
  const rawArtistStr = track.artist || 'Unknown Artist';
  const individualArtists = Array.from(
    new Set(
      rawArtistStr
        .split(/[,/&|;]|(?:\s+feat\.?\s+)|\s+ft\.?\s+/i)
        .map((a) => a.trim())
        .filter((a) => a.length > 0 && a.toLowerCase() !== 'various artists')
    )
  );

  // Fetch artist images for the picker modal from local database / cache or API
  useEffect(() => {
    if (!showArtistPicker || individualArtists.length <= 1) return;

    let isMounted = true;
    let initialMap = {};
    try {
      const followed = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
      followed.forEach((a) => {
        const name = typeof a === 'string' ? a : a.name;
        const img = typeof a === 'object' ? a.image : null;
        if (name && img) {
          initialMap[name] = img;
        }
      });
    } catch (e) {}

    const needed = individualArtists.filter(
      (name) => !artistImages[name] && !initialMap[name]
    );

    if (Object.keys(initialMap).length > 0) {
      setArtistImages((prev) => ({ ...initialMap, ...prev }));
    }

    if (needed.length > 0) {
      api
        .getBatchArtistImages(needed)
        .then((res) => {
          if (!isMounted || !res?.images) return;
          setArtistImages((prev) => ({ ...prev, ...res.images }));
        })
        .catch(() => {
          // Fallback individually
          needed.forEach((name) => {
            api
              .searchArtists(name, 1)
              .then((sRes) => {
                if (!isMounted) return;
                const match = sRes?.artists?.[0] || sRes?.results?.[0];
                if (match?.image) {
                  setArtistImages((prev) => ({ ...prev, [name]: match.image }));
                }
              })
              .catch(() => {});
          });
        });
    }

    return () => {
      isMounted = false;
    };
  }, [showArtistPicker, rawArtistStr]);

  const handleArtistClick = () => {
    if (individualArtists.length > 1) {
      setShowArtistPicker(true);
    } else {
      setSelectedArtistName(individualArtists[0] || rawArtistStr);
      setShowArtistSheet(true);
    }
  };

  const handleSelectArtist = (name) => {
    setShowArtistPicker(false);
    setSelectedArtistName(name);
    setShowArtistSheet(true);
  };

  const artistText = `${track.artist || 'Unknown Artist'}${track.album ? ` • ${track.album}` : ''}`;

  return (
    <div className="relative w-full h-full flex flex-col justify-between snap-card overflow-hidden bg-black select-none">
      {/* Dynamic Ambient Background: deep dark ambient with expanded black at top and bottom */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700 ease-out"
        style={{
          background: `linear-gradient(to bottom, #000000 0%, #000000 15%, rgba(${topRgb}, 0.22) 35%, rgba(${themeRgb}, 0.18) 50%, rgba(${bottomRgb}, 0.22) 65%, #000000 85%, #000000 100%)`,
        }}
      />

      {/* Top Header Area */}
      <div className="h-8 sm:h-12 flex-shrink-0 bg-transparent z-10" />

      {/* Center 500x500 Artwork Card — Subtle, Edge-Focused Blending (Artwork Crystal Clear) */}
      <div className="relative z-10 flex-1 w-full max-w-lg mx-auto px-0 sm:px-4 py-0 flex flex-col items-center justify-center my-auto">
        <div
          className="relative w-full aspect-square overflow-hidden bg-black flex items-center justify-center group shadow-none border-0"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 1.5%, black 98.5%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 1.5%, black 98.5%, transparent 100%)',
          }}
        >
          <img
            src={highResImage}
            alt={track.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoadingStream ? 'opacity-40' : 'opacity-100'
            }`}
          />

          {/* Subtle Top Edge Blend: narrow edge-only feather to blend without obscuring the artwork */}
          <div
            className="absolute inset-x-0 top-0 h-7 pointer-events-none transition-colors duration-700"
            style={{
              background: 'linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.4) 40%, transparent 100%)',
            }}
          />

          {/* Subtle Bottom Edge Blend: narrow edge-only feather to blend without obscuring the artwork */}
          <div
            className="absolute inset-x-0 bottom-0 h-8 pointer-events-none transition-colors duration-700"
            style={{
              background: 'linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0.45) 40%, transparent 100%)',
            }}
          />

          {/* Centered Play / Pause Button — Modern, Clean & Tactile */}
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-200"
          >
            <div
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 hover:scale-105 active:scale-95 transition-all ${
                isPlaying && !isLoadingStream ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
              }`}
            >
              {isLoadingStream ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 fill-white text-white" />
              ) : (
                <Play className="w-6 h-6 fill-white text-white ml-0.5" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Information, Side-by-Side Love & More Buttons, and Reels Slider — Lifted cleanly above bottom nav */}
      <div className="relative z-20 pb-[5.5rem] sm:pb-24 px-4 sm:px-5 w-full max-w-xl mx-auto">
        {/* Lyrics preview slot — Fixed height ensures cover artwork NEVER shifts vertically whether lyrics exist or not */}
        <div className="h-7 mb-2 flex items-center">
          {currentLyricLine ? (
            <div
              onClick={() => setIsLyricsDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1C1E]/90 border border-[#2C2C2E] hover:border-white/40 text-white text-xs cursor-pointer transition-colors max-w-full animate-in fade-in duration-150"
            >
              <Mic2 className="w-3 h-3 text-[#8E8E93] flex-shrink-0" />
              <span className="line-clamp-1 font-medium text-white">{currentLyricLine}</span>
            </div>
          ) : null}
        </div>

        {/* Row: Title & Artist on Left, Love & More Buttons Side-by-Side on Right */}
        <div className="flex items-end justify-between gap-3 mb-2.5">
          {/* Left Column: Marquee Title & Marquee Artist */}
          <div className="flex-1 min-w-0 pr-1">
            {/* Song Title with Marquee Scrolling */}
            <div className="overflow-hidden mb-1">
              {track.title && track.title.length > 20 ? (
                <MarqueeText
                  text={track.title}
                  className="text-lg sm:text-xl font-bold text-white tracking-tight"
                />
              ) : (
                <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-1 tracking-tight">
                  {track.title}
                </h2>
              )}
            </div>

            {/* Artist Name with Marquee Scrolling (No rotating icon) */}
            <div className="overflow-hidden">
              <button
                type="button"
                onClick={handleArtistClick}
                className="w-full text-left text-xs text-[#8E8E93] font-medium hover:text-white transition-colors block cursor-pointer"
              >
                {artistText.length > 22 ? (
                  <MarqueeText
                    text={artistText}
                    className="text-xs text-[#8E8E93] font-medium hover:text-white transition-colors"
                  />
                ) : (
                  <span className="line-clamp-1">{artistText}</span>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Love and More Buttons Side-by-Side */}
          <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
            {/* Love / Like Button — Blue Filled Heart only, Circle remains standard dark */}
            <button
              onClick={() => toggleLike(track)}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-[#2C2C2E] flex items-center justify-center transition-all active:scale-75"
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-5 h-5 transition-transform ${
                  isLiked ? 'fill-[#3B82F6] text-[#3B82F6] stroke-[#3B82F6] scale-110' : 'stroke-white text-transparent'
                }`}
              />
            </button>

            {/* More Options Button */}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-white transition-all active:scale-75"
              title="More Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reels Track Timeline / Progress Bar */}
        <div className="w-full mt-2">
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
              seek(newProgress * duration);
            }}
            className="w-full h-1 sm:h-1.5 bg-white/20 rounded-full cursor-pointer relative overflow-hidden group"
          >
            <div
              className="h-full bg-white rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#8E8E93] mt-1.5 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Mini Modal: Choose Which Artist to View (when track features multiple artists) */}
      {showArtistPicker &&
        ReactDOM.createPortal(
          <div
            onClick={() => setShowArtistPicker(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-xl bg-[#121212] border-t border-[#2C2C2E] sm:border sm:rounded-3xl rounded-t-3xl pt-5 pb-6 px-4 sm:px-6 text-white max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 rounded-full bg-[#3A3A3C] mx-auto mb-4 flex-shrink-0" />

              <div className="flex items-center justify-between pb-3.5 border-b border-[#1C1C1E]">
                <div>
                  <h3 className="text-base font-bold text-white">Select Artist</h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Which artist profile would you like to view?</p>
                </div>
                <button
                  onClick={() => setShowArtistPicker(false)}
                  className="w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-[#1C1C1E] mt-2 overflow-y-auto no-scrollbar">
                {individualArtists.map((artistNameItem, idx) => {
                  const artistImg = artistImages[artistNameItem];
                  return (
                    <div
                      key={`pick-artist-${idx}`}
                      onClick={() => handleSelectArtist(artistNameItem)}
                      className="flex items-center justify-between py-3.5 px-2 hover:bg-[#1C1C1E] rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {artistImg ? (
                          <img
                            src={get500x500Image(artistImg)}
                            alt={artistNameItem}
                            className="w-11 h-11 rounded-full object-cover border border-[#2C2C2E] flex-shrink-0 group-hover:border-white transition-colors"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-white flex-shrink-0 group-hover:border-white transition-colors">
                            <User className="w-5 h-5 text-[#8E8E93] group-hover:text-white" />
                          </div>
                        )}
                        <span className="font-semibold text-sm text-white group-hover:text-white truncate">
                          {artistNameItem}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* More Options / Song Details Bottom Sheet Modal */}
      <SongDetailsModal
        track={track}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        isLiked={isLiked}
        onToggleLike={() => toggleLike(track)}
        onViewLyrics={() => setIsLyricsDrawerOpen(true)}
        onAddToPlaylist={() => setShowPlaylistSheet(true)}
        onViewArtist={handleArtistClick}
        onOpenQueue={() => setIsQueueModalOpen(true)}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onShare={handleShare}
        isCopied={isCopied}
      />

      {/* Artist Sheet */}
      <ArtistSheet
        artistName={selectedArtistName || track.artist}
        isOpen={showArtistSheet}
        onClose={() => setShowArtistSheet(false)}
      />

      {/* Playlist Sheet */}
      <PlaylistSheet
        track={track}
        isOpen={showPlaylistSheet}
        onClose={() => setShowPlaylistSheet(false)}
      />
    </div>
  );
};
