import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { loadSmartFeed } from '../services/smartFeedService';
import { RankedTrackList } from '../components/RankedTrackList';
import { MediaCard } from '../components/MediaCard';
import { MediaRail } from '../components/MediaRail';
import { Flame, TrendingUp, Sparkles, Disc3, ListMusic, History, Radio } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();

  const [activeFilter, setActiveFilter] = useState('all');
  const [smartFeed, setSmartFeed] = useState({
    trendingOnApp: null,
    newReleases: null,
    popularRightNow: null,
    popularAlbums: null,
    popularPlaylists: null,
    jumpBackIn: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load Smart Feed
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    loadSmartFeed(user)
      .then((feed) => {
        if (isMounted) {
          setSmartFeed(feed);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Smart feed loading error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.username || user?.displayName?.split(' ')[0] || '';

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Smart Welcome & Filter Chips Bar */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 pt-4 pb-3 bg-black/85 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>{getGreeting()}{displayName ? `, ${displayName}` : ''}</span>
          </h1>

          {/* Filter Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'music', label: 'Music' },
              { id: 'podcasts', label: 'Podcasts' },
            ].map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black shadow-md'
                      : 'bg-[#18181A] hover:bg-[#222226] text-[#8E8E93] hover:text-white border border-[#28282C]'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content View (Full Width) */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full space-y-10">
        {/* ========================================================================= */}
        {/* SECTION 1: TOP DUAL-RANKED LISTS (Trending on This App vs Popular Right Now) */}
        {/* ========================================================================= */}
        {(isLoading || smartFeed.trendingOnApp || smartFeed.popularRightNow) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Trending on This App */}
            {(isLoading || smartFeed.trendingOnApp) && (
              <RankedTrackList
                title="Trending on This App"
                subtitle="Most played & saved by Staytup listeners"
                icon={Flame}
                iconColor="text-rose-400"
                iconBg="bg-rose-500/15"
                tracks={smartFeed.trendingOnApp || []}
                onPlayTrack={playTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedTrackIds={likedTrackIds}
                toggleLike={toggleLike}
                isLoading={isLoading}
              />
            )}

            {/* Right: Popular Right Now (Global Charts) */}
            {(isLoading || smartFeed.popularRightNow) && (
              <RankedTrackList
                title="Popular Right Now"
                subtitle="Top songs currently topping the charts"
                icon={TrendingUp}
                iconColor="text-[#22C55E]"
                iconBg="bg-[#22C55E]/15"
                tracks={smartFeed.popularRightNow || []}
                onPlayTrack={playTrack}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likedTrackIds={likedTrackIds}
                toggleLike={toggleLike}
                isLoading={isLoading}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: NEW RELEASES (Fresh music prioritized within last 30 days)     */}
        {/* ========================================================================= */}
        {(isLoading || (smartFeed.newReleases && smartFeed.newReleases.length > 0)) && (
          <MediaRail
            title="New Releases"
            subtitle="Fresh singles and albums released this month"
            action={
              <Link
                to="/search"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                Discover more
              </Link>
            }
          >
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-38 sm:w-48 flex-shrink-0">
                  <div className="aspect-square rounded-2xl bg-white/5 animate-pulse mb-3" />
                  <div className="w-3/4 h-4 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="w-1/2 h-3 bg-white/5 rounded animate-pulse" />
                </div>
              ))
            ) : (
              smartFeed.newReleases.map((item, idx) => (
                <div key={item.id || item.videoId || idx} className="w-38 sm:w-48 flex-shrink-0">
                  <MediaCard
                    image={item.image || item.thumbnail || item.artwork_url}
                    title={item.title || item.name}
                    subtitle={item.artist}
                    badge={item.releaseBadge}
                    onPlay={
                      item.type === 'song' || item.videoId
                        ? () => playTrack(item, smartFeed.newReleases.filter((s) => s.type === 'song' || s.videoId))
                        : undefined
                    }
                    onClick={
                      item.type === 'album' || !item.videoId
                        ? () => navigate(`/album/${encodeURIComponent(item.id)}`)
                        : undefined
                    }
                  />
                </div>
              ))
            )}
          </MediaRail>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: POPULAR ALBUMS                                                 */}
        {/* ========================================================================= */}
        {(isLoading || (smartFeed.popularAlbums && smartFeed.popularAlbums.length > 0)) && (
          <MediaRail
            title="Popular Albums"
            subtitle="Top full-length albums and curated records"
            action={
              <Link
                to="/search?type=albums"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                Show all
              </Link>
            }
          >
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-38 sm:w-48 flex-shrink-0">
                  <div className="aspect-square rounded-2xl bg-white/5 animate-pulse mb-3" />
                  <div className="w-3/4 h-4 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="w-1/2 h-3 bg-white/5 rounded animate-pulse" />
                </div>
              ))
            ) : (
              smartFeed.popularAlbums.map((album, idx) => (
                <div key={album.id || idx} className="w-38 sm:w-48 flex-shrink-0">
                  <MediaCard
                    image={album.image || album.thumbnail}
                    title={album.title || album.name}
                    subtitle={album.artist || (album.year ? `Album • ${album.year}` : 'Album')}
                    badge={album.year ? String(album.year) : undefined}
                    onClick={() => navigate(`/album/${encodeURIComponent(album.id)}`)}
                  />
                </div>
              ))
            )}
          </MediaRail>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: POPULAR PLAYLISTS                                              */}
        {/* ========================================================================= */}
        {(isLoading || (smartFeed.popularPlaylists && smartFeed.popularPlaylists.length > 0)) && (
          <MediaRail
            title="Popular Playlists"
            subtitle="Handpicked mixes and trending collections"
            action={
              <Link
                to="/library?tab=playlists"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                Browse all
              </Link>
            }
          >
            {isLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-38 sm:w-48 flex-shrink-0">
                  <div className="aspect-square rounded-2xl bg-white/5 animate-pulse mb-3" />
                  <div className="w-3/4 h-4 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="w-1/2 h-3 bg-white/5 rounded animate-pulse" />
                </div>
              ))
            ) : (
              smartFeed.popularPlaylists.map((playlist, idx) => (
                <div key={playlist.id || idx} className="w-38 sm:w-48 flex-shrink-0">
                  <MediaCard
                    image={playlist.image || playlist.thumbnail}
                    title={playlist.title || playlist.name}
                    subtitle={playlist.song_count ? `${playlist.song_count} songs` : 'Playlist'}
                    badge="Playlist"
                    onClick={() => navigate(`/playlist/${encodeURIComponent(playlist.id)}`)}
                  />
                </div>
              ))
            )}
          </MediaRail>
        )}

        {/* ========================================================================= */}
        {/* SECTION 5: JUMP BACK IN (Personal user history, strictly deduplicated)     */}
        {/* ========================================================================= */}
        {!isLoading && smartFeed.jumpBackIn && smartFeed.jumpBackIn.length > 0 && (
          <MediaRail
            title="Jump back in"
            subtitle="Your recent listening activity"
            action={
              <Link
                to="/library?tab=history"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                View history
              </Link>
            }
          >
            {smartFeed.jumpBackIn.map((track, idx) => (
              <div key={track.videoId || track.id || idx} className="w-38 sm:w-48 flex-shrink-0">
                <MediaCard
                  image={track.thumbnail || track.image || track.artwork_url}
                  title={track.title}
                  subtitle={track.artist}
                  onPlay={() => playTrack(track, smartFeed.jumpBackIn)}
                />
              </div>
            ))}
          </MediaRail>
        )}
      </div>
    </div>
  );
}
