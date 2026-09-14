import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtistAvatar } from './ArtistAvatar';
import { ArtistSelectionModal } from './ArtistSelectionModal';

/**
 * Robustly parses any track, artist array, or artist string into a clean list of artist objects
 */
export function parseArtists(trackOrArtist) {
  if (!trackOrArtist) return [];

  // Case 1: Track object with structured artists array
  if (typeof trackOrArtist === 'object' && Array.isArray(trackOrArtist.artists) && trackOrArtist.artists.length > 0) {
    return trackOrArtist.artists
      .map((a) => {
        if (typeof a === 'string') return { name: a.trim(), id: '', image: '' };
        return {
          name: (a.name || '').trim(),
          id: a.id || '',
          image: a.image || '',
          role: a.role || '',
        };
      })
      .filter((a) => a.name.length > 0);
  }

  // Case 2: Array of artist strings or objects
  if (Array.isArray(trackOrArtist)) {
    return trackOrArtist
      .map((a) => {
        if (typeof a === 'string') return { name: a.trim(), id: '', image: '' };
        return {
          name: (a?.name || '').trim(),
          id: a?.id || '',
          image: a?.image || '',
          role: a?.role || '',
        };
      })
      .filter((a) => a.name.length > 0);
  }

  // Case 3: Track object with artist string or raw string
  const rawString =
    typeof trackOrArtist === 'object'
      ? trackOrArtist.artist || trackOrArtist.subtitle || ''
      : String(trackOrArtist);

  if (!rawString || typeof rawString !== 'string') return [];

  // Split on commas, ampersands, slashes, and feat/ft/with
  const splitNames = rawString
    .split(/[,/&|;]|(?:\s+feat\.?\s+)|\s+ft\.?\s+|\s+with\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== 'various artists');

  // Deduplicate case-insensitively while preserving original casing
  const seen = new Set();
  const artists = [];
  splitNames.forEach((name) => {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      artists.push({ name, id: '', image: '' });
    }
  });

  return artists;
}

/**
 * Formats a clean comma-and-space separated string for plain text displays
 */
export function formatArtistNames(trackOrArtist) {
  const artists = parseArtists(trackOrArtist);
  return artists.map((a) => a.name).join(', ');
}

export const ArtistLinks = ({
  artists: artistsProp,
  track,
  maxVisible = 2,
  showAvatars = false,
  className = '',
  linkClassName = '',
  songTitle = '',
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const artists = parseArtists(artistsProp || track);
  const title = songTitle || track?.title || '';

  if (artists.length === 0) {
    return <span className={className}>Unknown Artist</span>;
  }

  const visibleArtists = artists.slice(0, maxVisible);
  const remainingCount = artists.length - visibleArtists.length;

  const handleArtistClick = (e, artistName) => {
    e.stopPropagation();
    navigate(`/artist/${encodeURIComponent(artistName)}`);
  };

  const handleOpenModal = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
        {/* Clickable individual artist links */}
        <span className="inline-flex items-center flex-wrap">
          {visibleArtists.map((artist, idx) => (
            <React.Fragment key={`${artist.name}-${idx}`}>
              {idx > 0 && <span className="text-[#8E8E93] mr-1">, </span>}
              <span
                onClick={(e) => handleArtistClick(e, artist.name)}
                className={`hover:text-white cursor-pointer transition-colors ${linkClassName}`}
                title={`View ${artist.name}`}
              >
                {artist.name}
              </span>
            </React.Fragment>
          ))}

          {/* +N Indicator badge for 3+ artists */}
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={handleOpenModal}
              className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[#A1A1AA] hover:text-white text-[10px] font-bold transition-all cursor-pointer inline-flex items-center"
              title={`+${remainingCount} more artists`}
            >
              +{remainingCount}
            </button>
          )}
        </span>

        {/* Optional compact circular artist avatar stack */}
        {showAvatars && artists.length > 1 && (
          <div
            onClick={handleOpenModal}
            className="inline-flex items-center pl-1 cursor-pointer group"
            title="View all artists"
          >
            <div className="flex items-center -space-x-1.5">
              {artists.slice(0, 3).map((artist, idx) => (
                <ArtistAvatar
                  key={`${artist.name}-${idx}`}
                  name={artist.name}
                  image={artist.image}
                  size="xs"
                  className="w-4 h-4 sm:w-5 sm:h-5 ring-1 ring-black flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}
      </span>

      {/* Multiple Artist Selection Modal */}
      {isModalOpen && (
        <ArtistSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          artists={artists}
          songTitle={title}
        />
      )}
    </>
  );
};

export default ArtistLinks;
