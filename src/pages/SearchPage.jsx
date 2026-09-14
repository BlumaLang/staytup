import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp, Music2, Disc3, Mic2, Radio, Compass } from 'lucide-react';

const QUICK_BADGES = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'];

const BROWSE_CATEGORIES = [
  { label: 'Bollywood Hits', color: 'from-orange-500 to-rose-600', icon: Music2 },
  { label: 'Punjabi Pop', color: 'from-amber-500 to-orange-600', icon: Radio },
  { label: 'Romantic Hindi', color: 'from-pink-500 to-rose-500', icon: Sparkles },
  { label: 'Chill Lo-Fi', color: 'from-indigo-600 to-purple-600', icon: Disc3 },
  { label: 'Indian Indie Pop', color: 'from-emerald-500 to-teal-600', icon: Mic2 },
  { label: 'Party Bangers', color: 'from-fuchsia-600 to-pink-600', icon: TrendingUp },
  { label: 'Hip Hop & Rap', color: 'from-blue-600 to-cyan-600', icon: Compass },
  { label: 'Global Top 50', color: 'from-violet-600 to-indigo-700', icon: Music2 },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeBadge, setActiveBadge] = useState('All');

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-8 text-white max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Search</h1>
        <p className="text-sm text-[#8E8E93] mt-1">
          Explore songs, artists, albums, and curated vibes
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full pl-12 pr-4 py-3.5 bg-[#18181B] hover:bg-[#202024] focus:bg-[#202024] text-white placeholder-[#8E8E93] rounded-2xl border border-[#27272A] focus:border-[#22C55E] outline-none transition-all text-sm font-medium shadow-lg"
        />
      </div>

      {/* Quick Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {QUICK_BADGES.map((badge) => (
          <button
            key={badge}
            onClick={() => setActiveBadge(badge)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeBadge === badge
                ? 'bg-white text-black shadow-md'
                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] border border-[#27272A]'
            }`}
          >
            {badge}
          </button>
        ))}
      </div>

      {/* Browse All Categories Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#22C55E]" />
          Browse All
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BROWSE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.label}
                className={`relative h-28 sm:h-32 rounded-2xl p-4 bg-gradient-to-br ${cat.color} overflow-hidden cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex flex-col justify-between`}
              >
                <span className="font-bold text-sm sm:text-base text-white leading-tight">
                  {cat.label}
                </span>
                <div className="self-end opacity-80">
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10 transform rotate-12" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
