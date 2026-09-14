import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { loadSmartFeed } from '../services/smartFeedService';
import { RankedTrackList } from '../components/RankedTrackList';
import { MediaCard } from '../components/MediaCard';
import { MediaRail } from '../components/MediaRail';
import { get500x500Image } from '../utils/media';
import { Flame, TrendingUp, Sparkles, Disc3, ListMusic, History, Radio, Play, Pause, Heart } from 'lucide-react';

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

  // Quick Jump cards derived from smartFeed
  const quickCards = [];
  if (smartFeed.trendingOnApp?.[0]) {
    const t = smartFeed.trendingOnApp[0];
    quickCards.push({
      title: t.title,
      subtitle: t.artist || 'Trending',
      image: get500x500Image(t.image || t.thumbnail || t.artwork_url),
      onClick: () => playTrack(t, smartFeed.trendingOnApp),
      onPlay: () => playTrack(t, smartFeed.trendingOnApp),
    });
  }
  if (smartFeed.popularRightNow?.[0]) {
    const t = smartFeed.popularRightNow[0];
    quickCards.push({
      title: t.title,
      subtitle: t.artist || 'Top Hit',
      image: get500x500Image(t.image || t.thumbnail || t.artwork_url),
      onClick: () => playTrack(t, smartFeed.popularRightNow),
      onPlay: () => playTrack(t, smartFeed.popularRightNow),
    });
  }
  if (smartFeed.newReleases?.[0]) {
    const t = smartFeed.newReleases[0];
    quickCards.push({
      title: t.title,
      subtitle: t.artist || 'New Release',
      image: get500x500Image(t.image || t.thumbnail || t.artwork_url),
      onClick: () => (t.videoId ? playTrack(t, smartFeed.newReleases) : navigate(`/album/${t.id}`)),
      onPlay: () => (t.videoId ? playTrack(t, smartFeed.newReleases) : navigate(`/album/${t.id}`)),
    });
  }
  if (smartFeed.popularAlbums?.[0]) {
    const a = smartFeed.popularAlbums[0];
    quickCards.push({
      title: a.title,
      subtitle: a.artist || 'Album',
      image: get500x500Image(a.image || a.thumbnail),
      onClick: () => navigate(`/album/${encodeURIComponent(a.id)}`),
      onPlay: () => navigate(`/album/${encodeURIComponent(a.id)}`),
    });
  }
  if (smartFeed.popularPlaylists?.[0]) {
    const p = smartFeed.popularPlaylists[0];
    quickCards.push({
      title: p.title,
      subtitle: 'Playlist',
      image: get500x500Image(p.image || p.thumbnail),
      onClick: () => navigate(`/playlist/${encodeURIComponent(p.id)}`),
      onPlay: () => navigate(`/playlist/${encodeURIComponent(p.id)}`),
    });
  }
  if (quickCards.length < 5 && smartFeed.trendingOnApp?.length > 1) {
    for (let i = 1; i < smartFeed.trendingOnApp.length && quickCards.length < 5; i++) {
      const t = smartFeed.trendingOnApp[i];
      quickCards.push({
        title: t.title,
        subtitle: t.artist || 'Trending',
        image: get500x500Image(t.image || t.thumbnail || t.artwork_url),
        onClick: () => playTrack(t, smartFeed.trendingOnApp),
        onPlay: () => playTrack(t, smartFeed.trendingOnApp),
      });
    }
  }

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
      <div className="flex-1 px-4 sm:px-8 py-6 w-full space-y-9">
        {/* ========================================================================= */}
        {/* QUICK JUMP 6-PACK GRID (Spotify Signature Desktop Dashboard Grid)         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Liked Songs */}
          <div
            onClick={() => navigate('/library?tab=favorites')}
            className="group relative flex items-center bg-[#151518] hover:bg-[#202025] rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border border-white/[0.04] hover:border-white/10 shadow-md"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0 px-3 py-1.5">
              <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                Liked Songs
              </p>
              <p className="text-[10px] sm:text-xs text-[#8E8E93] truncate mt-0.5">
                {likedTrackIds.size} {likedTrackIds.size === 1 ? 'song' : 'songs'}
              </p>
            </div>
            <div className="pr-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 flex-shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform">
                <Play className="w-4 h-4 fill-black ml-0.5" />
              </div>
            </div>
          </div>

          {/* Cards 2-6: Dynamic Quick Hits */}
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-12 sm:h-14 rounded-xl bg-white/5 animate-pulse" />
            ))
          ) : (
            quickCards.map((item, idx) => (
              <div
                key={idx}
                onClick={item.onClick}
                className="group relative flex items-center bg-[#151518] hover:bg-[#202025] rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border border-white/[0.04] hover:border-white/10 shadow-md"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 bg-black overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0 px-3 py-1.5">
                  <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                    {item.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#8E8E93] truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
                <div className="pr-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.onPlay) item.onPlay();
                      else item.onClick();
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl hover:scale-105 transition-transform cursor-pointer"
                    title={`Play ${item.title}`}
                  >
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

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
