import React, { useState } from 'react';
import { Users, UserPlus, Sparkles, UserCheck, Play, Music, ArrowRight } from 'lucide-react';

const TABS = [
  { id: 'friends', label: 'Friends', icon: Users, count: 3 },
  { id: 'requests', label: 'Requests', icon: UserPlus, count: 1 },
  { id: 'blend', label: 'Blend', icon: Sparkles },
];

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState('friends');

  const placeholderFriends = [
    { id: '1', name: 'Aarav Sharma', handle: '@aarav_s', track: 'Kesariya - Arijit Singh', online: true },
    { id: '2', name: 'Simran Kaur', handle: '@simran_k', track: 'Lover - Diljit Dosanjh', online: true },
    { id: '3', name: 'Rohan Mehta', handle: '@rohan_m', track: 'Tu Hai Kahan - AUR', online: false },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-6 text-white max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Friends &amp; Social</h1>
        <p className="text-sm text-[#8E8E93] mt-1">
          See what friends are listening to, share blend playlists, and discover together
        </p>
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
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#27272A] text-[#8E8E93]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Stubs */}
      <div className="pt-2">
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {placeholderFriends.map((friend) => (
              <div
                key={friend.id}
                className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-white/20 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-sm">
                      {friend.name[0]}
                    </div>
                    {friend.online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-[#18181B]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{friend.name}</h4>
                    <p className="text-xs text-[#8E8E93] truncate">{friend.handle}</p>
                    <p className="text-xs text-[#22C55E] flex items-center gap-1 mt-0.5 truncate">
                      <Music className="w-3 h-3 flex-shrink-0 animate-pulse" />
                      <span className="truncate">{friend.track}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="p-6 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-sm text-indigo-400">
                P
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Priya Patel</p>
                <p className="text-xs text-[#8E8E93]">wants to connect with you</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-[#22C55E] text-black text-xs font-bold hover:bg-[#16a34a] transition-colors">
                Accept
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">
                Ignore
              </button>
            </div>
          </div>
        )}

        {activeTab === 'blend' && (
          <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-900/40 via-[#18181B] to-[#121214] border border-[#27272A] text-center max-w-lg mx-auto space-y-4 shadow-xl">
            <div className="flex justify-center -space-x-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 border-4 border-black flex items-center justify-center font-bold text-lg">
                You
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 border-4 border-black flex items-center justify-center font-bold text-lg">
                Friend
              </div>
            </div>
            <h3 className="text-xl font-bold text-white">Blend Playlists</h3>
            <p className="text-xs text-[#8E8E93] leading-relaxed">
              Combine your music taste with a friend into a shared playlist updated daily with songs you both love.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#22C55E] hover:bg-[#16a34a] text-black text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95">
              <span>Invite to Blend</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
