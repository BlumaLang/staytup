import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Compass, Search, Library } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="p-6 md:p-8 space-y-6 text-white max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Good evening</h1>
          <p className="text-sm text-[#8E8E93] mt-1">Welcome back to Staytup Music</p>
        </div>
        <Link
          to="/foryou"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
        >
          <Compass className="w-4 h-4 text-[#22C55E]" />
          <span>Launch For You Feed</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          to="/foryou"
          className="p-5 rounded-2xl bg-[#121214] border border-[#222226] hover:border-white/20 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white group-hover:text-white">For You Feed</h3>
            <p className="text-xs text-[#8E8E93]">Doom-scroll fullscreen feed</p>
          </div>
        </Link>

        <Link
          to="/search"
          className="p-5 rounded-2xl bg-[#121214] border border-[#222226] hover:border-white/20 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white group-hover:text-white">Search</h3>
            <p className="text-xs text-[#8E8E93]">Find songs, artists & albums</p>
          </div>
        </Link>

        <Link
          to="/library"
          className="p-5 rounded-2xl bg-[#121214] border border-[#222226] hover:border-white/20 transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Library className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white group-hover:text-white">Your Library</h3>
            <p className="text-xs text-[#8E8E93]">Playlists, favorites & artists</p>
          </div>
        </Link>
      </div>

      <div className="pt-4 border-t border-[#1C1C1E]">
        <h2 className="text-lg font-bold text-white mb-3">Phase 1 Routing Active</h2>
        <p className="text-xs text-[#8E8E93]">
          Navigation skeleton is functional. Page rails and player features will be populated in upcoming phases.
        </p>
      </div>
    </div>
  );
}
