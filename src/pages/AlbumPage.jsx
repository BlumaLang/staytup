import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { usePlayer } from '../context/PlayerContext';
import { get500x500Image } from '../utils/media';
import {
  Play,
  Shuffle,
  Heart,
  Clock,
  ArrowLeft,
  Disc3,
  Share2,
  Check,
} from 'lucide-react';
import { getAlbumUrl, shareContent } from '../utils/canonicalUrl';
import { ArtistLinks } from '../components/ArtistLinks';

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();

  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareToast, setShareToast] = useState(false);

  const albumId = decodeURIComponent(id || '');

  const handleShare = async () => {
    if (!album) return;
    const url = getAlbumUrl(album);
    const result = await shareContent({
      title: `${albumTitle} - ${albumArtist}`,
      text: `Check out "${albumTitle}" by ${albumArtist} on Staytup Music!`,
      url,
    });
    if (result.success) {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  useEffect(() => {
    if (!albumId) return;

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        let fetchedAlbum = null;
        try {
          const res = await api.getAlbum(albumId);
          if (res && (res.tracks || res.album)) {
            fetchedAlbum = res.album || res;
            if (Array.isArray(res.tracks)) {
              fetchedAlbum.tracks = res.tracks;
            }
          }
        } catch (err) {
          console.warn('Direct album fetch error:', err);
        }

        // Fallback: search by album name if ID lookup was empty
        if (!fetchedAlbum?.tracks || fetchedAlbum.tracks.length === 0) {
          const searchRes = await api.search(`album:"${albumId}"`, 'songs', 0, 30);
          const searchedTracks = searchRes?.tracks || searchRes?.results || [];
          if (searchedTracks.length > 0) {
            fetchedAlbum = {
              id: albumId,
              title: albumId,
              artist: searchedTracks[0].artist || 'Various Artists',
              image: searchedTracks[0].image || searchedTracks[0].thumbnail,
              year: searchedTracks[0].year || '',
              song_count: searchedTracks.length,
              tracks: searchedTracks,
            };
          }
        }

        if (isMounted && fetchedAlbum) {
          setAlbum(fetchedAlbum);
          setTracks(fetchedAlbum.tracks || []);
        }
      } catch (e) {
        console.warn('Failed to load album:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [albumId]);

  const albumTitle = album?.title || album?.name || albumId || 'Album';
  const albumArtist = album?.artist || (tracks[0]?.artist) || 'Various Artists';
  const albumImage = get500x500Image(album?.image || album?.thumbnail || tracks[0]?.image);
  const albumYear = album?.year || tracks[0]?.year || '';

  const handlePlayAlbum = (startIndex = 0) => {
    if (tracks.length === 0) return;
    playTrack(tracks[startIndex], tracks);
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#8E8E93]">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Loading album...</p>
        </div>
      ) : (
        <div className="flex-1 w-full px-4 sm:px-8 py-6 space-y-8">
          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-[#1C1C1E]">
            <img
              src={albumImage}
              alt={albumTitle}
              className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl object-cover shadow-2xl border border-white/10 flex-shrink-0"
            />
            <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                Album
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white line-clamp-2">
                {albumTitle}
              </h1>
              <div className="flex items-center justify-center sm:justify-start flex-wrap gap-1.5 text-sm text-[#8E8E93]">
                <ArtistLinks
                  track={{ artist: albumArtist }}
                  className="font-bold text-white hover:text-gray-300"
                  showAvatars={false}
                />
                {albumYear ? ` • ${albumYear}` : ''} • {tracks.length} songs
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
                <button
                  onClick={() => handlePlayAlbum(0)}
                  disabled={tracks.length === 0}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Play</span>
                </button>
                <button
                  onClick={handleShufflePlay}
                  disabled={tracks.length === 0}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  title="Share Album"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tracks Table / List */}
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#8E8E93] pb-2 px-3 border-b border-[#1C1C1E]">
              <div className="flex items-center gap-4">
                <span className="w-5 text-center">#</span>
                <span>Title</span>
              </div>
              <Clock className="w-4 h-4" />
            </div>

            <div className="divide-y divide-[#1C1C1E]/40 mt-1">
              {tracks.map((track, i) => {
                const vid = String(track.videoId || track.video_id || track.id || '');
                const isCurrent = (currentTrack?.videoId || currentTrack?.id) === vid;
                const isLiked = likedTrackIds.has(vid);

                return (
                  <div
                    key={vid || i}
                    onClick={() => handlePlayAlbum(i)}
                    className="flex items-center justify-between py-3 px-3 hover:bg-[#141416] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-3">
                      <span className="w-5 text-center text-xs font-medium tabular-nums text-[#8E8E93] group-hover:hidden">
                        {isCurrent && isPlaying ? (
                          <span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block animate-pulse" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <Play className="w-4 h-4 text-white hidden group-hover:block ml-0.5" />
                      <div className="min-w-0 text-left">
                        <p
                          className={`font-semibold text-sm line-clamp-1 group-hover:text-white ${
                            isCurrent ? 'text-[#22C55E]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <div className="mt-0.5">
                          <ArtistLinks
                            track={track}
                            className="text-xs text-[#8E8E93]"
                            maxDisplay={2}
                            showAvatars={false}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium tabular-nums text-[#8E8E93]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(track);
                        }}
                        className="text-[#8E8E93] hover:text-white transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                          }`}
                        />
                      </button>
                      <span>{formatDuration(track.duration || track.duration_seconds)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {shareToast && (
        <div className="fixed bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#22C55E] text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Album link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
