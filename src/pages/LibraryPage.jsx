import React, { useState } from 'react';
import { Heart, ListMusic, Users, Radio, History, Plus, Play, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'artists', label: 'Artists', icon: Users },
  { id: 'community', label: 'Community', icon: Radio },
  { id: 'history', label: 'History', icon: History },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('favorites');

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-6 text-white max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Your Library</h1>
          <p className="text-sm text-[#8E8E93] mt-1">
            Your saved tracks, custom playlists, artists and community activity
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#22C55E] hover:bg-[#16a34a] text-black text-xs font-bold transition-transform active:scale-95 shadow-md self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#27272A] no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white/10 text-[#22C55E] border border-[#22C55E]/30 shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#22C55E]' : 'text-[#8E8E93]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Stubs */}
      <div className="pt-2">
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-900/30 to-purple-900/20 border border-[#27272A] flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  Liked Songs
                </h3>
                <p className="text-xs text-[#8E8E93]">Tracks you marked with a heart</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            </div>
            <p className="text-xs text-[#71717A] text-center py-8">
              Full favorites collection will load here.
            </p>
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-white/20 transition-all flex flex-col items-center justify-center min-h-[160px] text-center cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-[#22C55E]" />
              </div>
              <span className="text-xs font-semibold text-white">Create New Playlist</span>
            </div>
          </div>
        )}

        {activeTab === 'artists' && (
          <div className="p-8 rounded-2xl bg-[#18181B] border border-[#27272A] text-center space-y-2">
            <Users className="w-8 h-8 text-[#8E8E93] mx-auto" />
            <h3 className="text-sm font-semibold text-white">Artists You Follow</h3>
            <p className="text-xs text-[#8E8E93]">Followed artist catalog will appear here.</p>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="p-8 rounded-2xl bg-[#18181B] border border-[#27272A] text-center space-y-2">
            <Radio className="w-8 h-8 text-[#8E8E93] mx-auto" />
            <h3 className="text-sm font-semibold text-white">Community Feeds</h3>
            <p className="text-xs text-[#8E8E93]">Live community activity and shared tracks will appear here.</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-8 rounded-2xl bg-[#18181B] border border-[#27272A] text-center space-y-2">
            <History className="w-8 h-8 text-[#8E8E93] mx-auto" />
            <h3 className="text-sm font-semibold text-white">Listening History</h3>
            <p className="text-xs text-[#8E8E93]">Recently played tracks and session history will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
