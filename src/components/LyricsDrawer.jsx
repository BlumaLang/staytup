import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Music2 } from 'lucide-react';

export const LyricsDrawer = () => {
  const {
    currentTrack,
    lyrics,
    isLoadingLyrics,
    activeLyricIndex,
    isLyricsDrawerOpen,
    setIsLyricsDrawerOpen,
    seek,
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

  if (!isLyricsDrawerOpen) return null;

  const hasSyncedLyrics = lyrics?.is_synced && Array.isArray(lyrics?.synced_lyrics) && lyrics.synced_lyrics.length > 0;
  const hasPlainLyrics = !hasSyncedLyrics && lyrics?.plain_lyrics && lyrics.plain_lyrics.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col bg-black/95 backdrop-blur-2xl animate-in slide-in-from-bottom duration-300 select-none">
      {/* Header — Lifted up to remove excessive gap */}
      <div className="flex items-center justify-between px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E]">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-bold text-base sm:text-lg text-white line-clamp-1">
            {currentTrack?.title || 'Lyrics'}
          </h3>
          <p className="text-xs text-[#8E8E93] line-clamp-1 mt-0.5">
            {currentTrack?.artist || 'Staytup Lyrics'}
          </p>
        </div>

        <button
          onClick={() => setIsLyricsDrawerOpen(false)}
          className="w-9 h-9 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Lyrics Content — Full Height, Left-Oriented Text, Lifted to top */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 pt-4 pb-16 text-left no-scrollbar space-y-6 sm:space-y-7"
      >
        {isLoadingLyrics ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8E8E93]">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Syncing lyrics with rhythm...</p>
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
                className={`cursor-pointer transition-all duration-300 text-left font-bold select-none leading-relaxed origin-left ${
                  isActive
                    ? 'text-2xl sm:text-3xl text-white font-black scale-102'
                    : isPast
                    ? 'text-lg sm:text-xl text-[#8E8E93]/40 hover:text-white/80'
                    : 'text-lg sm:text-xl text-[#8E8E93]/80 hover:text-white'
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : hasPlainLyrics ? (
          <div className="space-y-4 max-w-xl text-left">
            {lyrics.plain_lyrics.split('\n').map((line, idx) => (
              <p key={idx} className="text-base sm:text-lg text-white font-medium leading-relaxed">
                {line || <span className="inline-block h-4" />}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#8E8E93]">
            <Music2 className="w-12 h-12 mb-3 text-[#2C2C2E]" />
            <h4 className="text-lg font-bold text-white mb-1">No lyrics available</h4>
            <p className="text-xs text-[#8E8E93] max-w-xs text-center">
              Enjoy the instrumental and pure melody of this track.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
