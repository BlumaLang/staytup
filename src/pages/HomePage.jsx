import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { generateDailyPersonalizedFeed } from '../services/dailyFeedService';
import { MediaCard } from '../components/MediaCard';
import { MediaRail } from '../components/MediaRail';
import { get500x500Image } from '../utils/media';
import { Play, Heart, Sparkles } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, likedTrackIds } = usePlayer();

  const [activeFilter, setActiveFilter] = useState('all');
  const [dailyTracks, setDailyTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load feed data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadHomeContent = async () => {
      try {
        // 1. Load Recent Played for Quick Cards & Jump back in
        try {
          const played = JSON.parse(localStorage.getItem('staytup_search_played') || '[]');
          if (played.length > 0 && isMounted) {
            setRecentTracks(played.slice(0, 10));
          }
        } catch (e) {}

        // 2. Load Followed / Favorite Artists
        try {
          const followed = JSON.parse(localStorage.getItem('staytup_followed_artists') || '[]');
          const userFavs = user?.favoriteArtists || [];
          const combined = [...followed];
          userFavs.forEach((name) => {
            if (
              typeof name === 'string' &&
              !combined.some((a) =>
                typeof a === 'string'
                  ? a.toLowerCase() === name.toLowerCase()
                  : a.name?.toLowerCase() === name.toLowerCase()
              )
            ) {
              combined.push({ name, image: '', id: '' });
            }
          });

          // Hydrate artist images if missing
          const missing = combined
            .map((a) => (typeof a === 'string' ? a : !a.image ? a.name : null))
            .filter(Boolean);
          if (missing.length > 0) {
            api.getBatchArtistImages(missing).then((res) => {
              if (res?.images && isMounted) {
                setFavoriteArtists((prev) =>
                  prev.map((a) => {
                    const n = typeof a === 'string' ? a : a.name;
                    if (res.images[n]) {
                      return typeof a === 'string'
                        ? { name: n, image: res.images[n], id: n }
                        : { ...a, image: res.images[n] };
                    }
                    return a;
                  })
                );
              }
            }).catch(() => {});
          }

          if (isMounted) setFavoriteArtists(combined);
        } catch (e) {}

        // 3. Load Made for You (Daily Feed)
        const dailyResult = await generateDailyPersonalizedFeed(user, false);
        const feedTracks = dailyResult?.tracks || [];
        if (isMounted && feedTracks.length > 0) {
          setDailyTracks(feedTracks.slice(0, 15));
        }

        // 4. Recommendations / Trending
        const trendingRes = await api.search('trending hindi hits', 'songs', 0, 12);
        const trendList = trendingRes?.tracks || trendingRes?.results || [];
        if (isMounted && trendList.length > 0) {
          setRecommendedTracks(trendList.slice(0, 12));
        }
      } catch (err) {
        console.warn('Failed to load home page content:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadHomeContent();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Quick-access items (top 2x3 or 2x4 grid like in the Spotify screenshot)
  const quickItems = [
    {
      id: 'liked-songs',
      title: 'Liked Songs',
      type: 'liked',
      count: likedTrackIds.size,
      onClick: () => navigate('/library?tab=favorites'),
    },
    ...recentTracks.slice(0, 7).map((track) => ({
      id: track.videoId || track.id,
      title: track.title,
      image: track.thumbnail || track.image || track.artwork_url,
      track: track,
      onClick: () => playTrack(track, recentTracks),
    })),
  ];

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Filter Chips Bar (Spotify Style) */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 pt-4 pb-3 bg-black/85 backdrop-blur-xl border-b border-[#1C1C1E]">
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

      {/* Main Content View (Full Width) */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full space-y-10">
        {/* ========================================================================= */}
        {/* TOP QUICK ACCESS 2x4 GRID (The Signature Spotify Desktop Section)         */}
        {/* ========================================================================= */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {quickItems.map((item) => {
              if (item.type === 'liked') {
                return (
                  <div
                    key={item.id}
                    onClick={item.onClick}
                    className="flex items-center gap-3.5 bg-[#18181B]/80 hover:bg-[#28282D] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group shadow-sm relative border border-white/5"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Heart className="w-7 h-7 text-white fill-white" />
                    </div>
                    <span className="font-bold text-sm text-white line-clamp-1 pr-12">
                      Liked Songs
                    </span>

                    {/* Hover Green Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onClick();
                      }}
                      className="absolute right-3 w-10 h-10 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10"
                      title="Play Liked Songs"
                    >
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  onClick={item.onClick}
                  className="flex items-center gap-3.5 bg-[#18181B]/80 hover:bg-[#28282D] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group shadow-sm relative border border-white/5"
                >
                  <img
                    src={get500x500Image(item.image)}
                    alt={item.title}
                    onError={(e) => {
                      e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                    }}
                    className="w-16 h-16 object-cover bg-black flex-shrink-0"
                  />
                  <span className="font-bold text-sm text-white line-clamp-1 pr-12">
                    {item.title}
                  </span>

                  {/* Hover Green Play Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                    }}
                    className="absolute right-3 w-10 h-10 rounded-full bg-[#22C55E] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10"
                    title="Play"
                  >
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RAIL 1: JUMP BACK IN                                                      */}
        {/* ========================================================================= */}
        {recentTracks.length > 0 && (
          <MediaRail
            title="Jump back in"
            action={
              <Link
                to="/library?tab=history"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                Show all
              </Link>
            }
          >
            {recentTracks.map((track, i) => (
              <div key={track.videoId || track.id || i} className="w-38 sm:w-48 flex-shrink-0">
                <MediaCard
                  image={track.thumbnail || track.image || track.artwork_url}
                  title={track.title}
                  subtitle={track.artist}
                  onPlay={() => playTrack(track, recentTracks)}
                />
              </div>
            ))}
          </MediaRail>
        )}

        {/* ========================================================================= */}
        {/* RAIL 2: RECOMMENDED FOR TODAY                                             */}
        {/* ========================================================================= */}
        {recommendedTracks.length > 0 && (
          <MediaRail
            title="Recommended for today"
            subtitle="Inspired by your recent listening"
            action={
              <Link
                to="/search"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                Show all
              </Link>
            }
          >
            {recommendedTracks.map((track, i) => (
              <div key={track.videoId || track.id || i} className="w-38 sm:w-48 flex-shrink-0">
                <MediaCard
                  image={track.thumbnail || track.image}
                  title={track.title}
                  subtitle={track.artist}
                  onPlay={() => playTrack(track, recommendedTracks)}
                />
              </div>
            ))}
          </MediaRail>
        )}

        {/* ========================================================================= */}
        {/* RAIL 3: MADE FOR YOU (Daily Mix)                                          */}
        {/* ========================================================================= */}
        {dailyTracks.length > 0 && (
          <MediaRail
            title="Made for you"
            subtitle="Your daily personalized sound blend"
            action={
              <button
                onClick={() => playTrack(dailyTracks[0], dailyTracks)}
                className="text-xs font-bold text-[#22C55E] hover:underline cursor-pointer"
              >
                Play Mix
              </button>
            }
          >
            {dailyTracks.map((track, i) => (
              <div key={track.videoId || track.id || i} className="w-38 sm:w-48 flex-shrink-0">
                <MediaCard
                  image={track.thumbnail || track.image}
                  title={track.title}
                  subtitle={track.artist}
                  badge="Daily Mix"
                  onPlay={() => playTrack(track, dailyTracks)}
                />
              </div>
            ))}
          </MediaRail>
        )}

        {/* ========================================================================= */}
        {/* RAIL 4: YOUR FAVORITE ARTISTS                                             */}
        {/* ========================================================================= */}
        {favoriteArtists.length > 0 && (
          <MediaRail
            title="Your favorite artists"
            action={
              <Link
                to="/library?tab=artists"
                className="text-xs font-bold text-[#8E8E93] hover:text-white transition-colors"
              >
                Show all
              </Link>
            }
          >
            {favoriteArtists.map((artist, idx) => {
              const name = typeof artist === 'string' ? artist : artist.name;
              const img = typeof artist === 'object' ? artist.image : null;
              return (
                <div key={idx} className="w-32 sm:w-40 flex-shrink-0">
                  <MediaCard
                    image={img}
                    title={name}
                    subtitle="Artist"
                    isRound={true}
                    onClick={() => navigate(`/artist/${encodeURIComponent(name)}`)}
                  />
                </div>
              );
            })}
          </MediaRail>
        )}
      </div>
    </div>
  );
}
