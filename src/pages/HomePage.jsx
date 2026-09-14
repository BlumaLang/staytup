import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { generateDailyPersonalizedFeed } from '../services/dailyFeedService';
import { MediaCard } from '../components/MediaCard';
import { MediaRail } from '../components/MediaRail';
import { Compass, Sparkles, RefreshCw, Flame } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, isPlaying } = usePlayer();

  const [greeting, setGreeting] = useState('');
  const [dailyTracks, setDailyTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [recommendedContext, setRecommendedContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17 && hour < 22) setGreeting('Good evening');
    else setGreeting('Late night vibes');
  }, []);

  // Load feed data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadHomeContent = async () => {
      try {
        // 1. Load Recent Played
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

        // 4. "Because you liked X" or Trending Recommendations
        try {
          const userId = user?.id || localStorage.getItem('staytup_user_id') || 'guest_user';
          const favs = await api.getFavorites(userId).catch(() => []);
          const favList = Array.isArray(favs) ? favs : favs?.favorites || [];

          if (favList.length > 0) {
            const seed = favList[0];
            const cleanArtist = (seed.artist || '').split(',')[0].split('&')[0].trim();
            const recRes = await api.search(`artist:"${cleanArtist}"`, 'songs', 0, 12);
            const recs = recRes?.tracks || recRes?.results || [];
            if (isMounted && recs.length > 0) {
              setRecommendedContext(seed);
              setRecommendedTracks(recs.slice(0, 12));
            }
          } else {
            // Fallback to trending songs
            const trendingRes = await api.search('trending hindi', 'songs', 0, 12);
            const trendList = trendingRes?.tracks || trendingRes?.results || [];
            if (isMounted && trendList.length > 0) {
              setRecommendedTracks(trendList.slice(0, 12));
            }
          }
        } catch (e) {}
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

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-4 bg-black/85 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated 4-bar equalizer wave while playing */}
            <div className="flex items-end gap-[3px] h-4 w-4 pb-0.5">
              <span
                className={`w-[2.5px] bg-[#22C55E] rounded-full transition-all ${
                  isPlaying ? 'animate-music-bar-1' : 'h-1'
                }`}
              />
              <span
                className={`w-[2.5px] bg-[#22C55E] rounded-full transition-all ${
                  isPlaying ? 'animate-music-bar-2' : 'h-2.5'
                }`}
              />
              <span
                className={`w-[2.5px] bg-[#22C55E] rounded-full transition-all ${
                  isPlaying ? 'animate-music-bar-3' : 'h-3.5'
                }`}
              />
              <span
                className={`w-[2.5px] bg-[#22C55E] rounded-full transition-all ${
                  isPlaying ? 'animate-music-bar-4' : 'h-1.5'
                }`}
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {greeting}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/foryou"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="hidden sm:inline">For You Feed</span>
              <span className="sm:hidden">Feed</span>
            </Link>

            <Link
              to="/profile"
              className="w-8 h-8 rounded-full overflow-hidden bg-[#1C1C1E] border border-white/20 flex items-center justify-center flex-shrink-0"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white">
                  {(user?.username || 'U')[0].toUpperCase()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-10">
        {/* Doom-Scroll Entry Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-black border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="space-y-2 z-10 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Full-Screen Feed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Experience the Doom-Scroll Player
            </h2>
            <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed">
              Swipe vertically through high-fidelity tracks with synchronized lyrics and full visual artwork immersion.
            </p>
          </div>

          <Link
            to="/foryou"
            className="px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 transition-transform active:scale-95 shadow-xl flex items-center gap-2 flex-shrink-0 z-10"
          >
            <span>Launch Feed</span>
            <span>→</span>
          </Link>
        </div>

        {/* RAIL 1: JUMP BACK IN (Recent History) */}
        {recentTracks.length > 0 && (
          <MediaRail
            title="Jump back in"
            subtitle="Pick up where you left off"
            action={
              <Link to="/library?tab=history" className="text-xs text-[#8E8E93] hover:text-white font-semibold">
                See all
              </Link>
            }
          >
            {recentTracks.map((track, i) => (
              <div key={track.videoId || track.id || i} className="w-36 sm:w-44 flex-shrink-0">
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

        {/* RAIL 2: MADE FOR YOU (Daily Personalized Mix) */}
        {dailyTracks.length > 0 && (
          <MediaRail
            title="Made for you"
            subtitle="Your daily personalized curation"
            action={
              <button
                onClick={() => playTrack(dailyTracks[0], dailyTracks)}
                className="text-xs text-[#22C55E] hover:underline font-bold"
              >
                Play Mix
              </button>
            }
          >
            {dailyTracks.map((track, i) => (
              <div key={track.videoId || track.id || i} className="w-36 sm:w-44 flex-shrink-0">
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

        {/* RAIL 3: YOUR FAVORITE ARTISTS */}
        {favoriteArtists.length > 0 && (
          <MediaRail
            title="Your favorite artists"
            subtitle="Artists you follow and love"
            action={
              <Link to="/library?tab=artists" className="text-xs text-[#8E8E93] hover:text-white font-semibold">
                View all
              </Link>
            }
          >
            {favoriteArtists.map((artist, idx) => {
              const name = typeof artist === 'string' ? artist : artist.name;
              const img = typeof artist === 'object' ? artist.image : null;
              return (
                <div key={idx} className="w-32 sm:w-36 flex-shrink-0">
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

        {/* RAIL 4: RECOMMENDATIONS / BECAUSE YOU LIKED */}
        {recommendedTracks.length > 0 && (
          <MediaRail
            title={
              recommendedContext
                ? `Because you liked ${recommendedContext.title || recommendedContext.artist}`
                : 'Trending Hits'
            }
            subtitle={
              recommendedContext
                ? `More songs in similar style to ${recommendedContext.artist}`
                : 'What listeners are enjoying right now'
            }
          >
            {recommendedTracks.map((track, i) => (
              <div key={track.videoId || track.id || i} className="w-36 sm:w-44 flex-shrink-0">
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
      </div>
    </div>
  );
}
