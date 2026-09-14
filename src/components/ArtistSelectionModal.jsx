import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { ArtistAvatar } from './ArtistAvatar';

export const ArtistSelectionModal = ({
  isOpen,
  onClose,
  artists = [],
  songTitle = '',
}) => {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !artists || artists.length === 0) return null;

  const handleSelectArtist = (artist) => {
    const artistName = typeof artist === 'string' ? artist : artist.name;
    if (!artistName) return;
    onClose();
    navigate(`/artist/${encodeURIComponent(artistName)}`);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#18181B] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Modal Header */}
        <div className="px-6 pt-4 pb-3 sm:py-5 flex items-center justify-between border-b border-white/5">
          <div className="min-w-0 pr-2">
            <h3 className="text-lg font-black text-white tracking-tight">Artists</h3>
            {songTitle ? (
              <p className="text-xs text-[#8E8E93] truncate mt-0.5">
                From <span className="text-[#D1D5DB] font-medium">{songTitle}</span>
              </p>
            ) : (
              <p className="text-xs text-[#8E8E93] mt-0.5">Select an artist to view their profile</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer flex-shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Artist List */}
        <div className="overflow-y-auto p-4 space-y-1.5 flex-1 divide-y divide-white/5 no-scrollbar">
          {artists.map((artist, idx) => {
            const name = typeof artist === 'string' ? artist : artist.name;
            const img = typeof artist === 'object' ? artist.image : null;
            const role =
              typeof artist === 'object' && artist.role
                ? artist.role === 'primary_artists'
                  ? 'Primary Artist'
                  : artist.role === 'featured_artists'
                  ? 'Featured Artist'
                  : artist.role
                : 'Artist';

            return (
              <div
                key={`${name}-${idx}`}
                onClick={() => handleSelectArtist(artist)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group pt-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <ArtistAvatar
                    name={name}
                    image={img}
                    size="md"
                    className="w-12 h-12 flex-shrink-0 border border-white/10 shadow-md group-hover:border-white/30 transition-colors"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-[#22C55E] transition-colors truncate">
                      {name}
                    </p>
                    <p className="text-[11px] text-[#8E8E93] capitalize truncate mt-0.5">
                      {role}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ArtistSelectionModal;
