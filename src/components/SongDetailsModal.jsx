import React from 'react';
import ReactDOM from 'react-dom';
import { get500x500Image } from '../utils/media';
import {
  Heart,
  Mic2,
  ListPlus,
  Share2,
  User,
  Volume2,
  VolumeX,
  X,
  Check,
  ListMusic,
} from 'lucide-react';

export const SongDetailsModal = ({
  track,
  isOpen,
  onClose,
  isLiked,
  onToggleLike,
  onViewLyrics,
  onAddToPlaylist,
  onViewArtist,
  onOpenQueue,
  isMuted,
  onToggleMute,
  onShare,
  isCopied,
}) => {
  if (!isOpen || !track) return null;

  const highResImage = get500x500Image(track.image || track.thumbnail || track.artwork_url);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-[#121212] border-t border-[#2C2C2E] sm:border sm:rounded-3xl rounded-t-3xl pt-5 pb-6 px-4 sm:px-6 text-white max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag Handle */}
        <div className="w-12 h-1.5 rounded-full bg-[#3A3A3C] mx-auto mb-4" />

        {/* Header Track Info — Left-Oriented */}
        <div className="flex items-center gap-3.5 pb-3.5 border-b border-[#1C1C1E] mb-2.5 px-1">
          <img
            src={highResImage}
            alt={track.title}
            className="w-14 h-14 rounded-xl object-cover border border-[#2C2C2E] bg-black flex-shrink-0"
          />
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-bold text-base sm:text-lg text-white line-clamp-1">{track.title}</h3>
            <p className="text-xs sm:text-sm text-[#8E8E93] line-clamp-1 mt-0.5">
              {track.artist || 'Unknown Artist'}{track.album ? ` • ${track.album}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Items List */}
        <div className="space-y-0.5 overflow-y-auto no-scrollbar">
          {/* Like / Unlike */}
          <button
            onClick={() => {
              onToggleLike();
            }}
            className="w-full flex items-center justify-between py-2 px-2 rounded-xl transition-opacity active:opacity-60 text-left"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${
                  isLiked
                    ? 'bg-[#2563EB] border-[#3B82F6]'
                    : 'bg-[#1C1C1E] border-[#2C2C2E]'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked ? 'fill-white stroke-white' : 'stroke-white'
                  }`}
                />
              </div>
              <span className={`text-sm font-medium ${isLiked ? 'text-[#60A5FA]' : 'text-white'}`}>
                {isLiked ? 'Liked to Favorites' : 'Add to Favorites'}
              </span>
            </div>
            {isLiked && <Check className="w-4 h-4 text-[#60A5FA]" />}
          </button>

          {/* Add to Playlist */}
          <button
            onClick={() => {
              onClose();
              onAddToPlaylist();
            }}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                <ListPlus className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">Add to Playlist</span>
            </div>
          </button>

          {/* View Playback Queue */}
          <button
            onClick={() => {
              onClose();
              onOpenQueue?.();
            }}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                <ListMusic className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-white block">Playback Queue</span>
                <span className="text-[10px] text-[#8E8E93]">View Up Next & Daily 12 AM Mix</span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1C1C1E] text-white border border-[#2C2C2E]">
              Queue
            </span>
          </button>

          {/* View Synced Lyrics */}
          <button
            onClick={() => {
              onClose();
              onViewLyrics();
            }}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                <Mic2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">View Full Synchronized Lyrics</span>
            </div>
          </button>

          {/* View Artist Profile */}
          <button
            onClick={() => {
              onClose();
              onViewArtist();
            }}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">View Artist Profile</span>
            </div>
          </button>

          {/* Toggle Mute / Unmute */}
          <button
            onClick={onToggleMute}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </div>
              <span className="text-sm font-medium text-white">
                {isMuted ? 'Unmute Audio' : 'Mute Audio'}
              </span>
            </div>
          </button>

          {/* Share Song */}
          <button
            onClick={onShare}
            className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center flex-shrink-0">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-white">
                {isCopied ? 'Link Copied to Clipboard!' : 'Share Track'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
