import React from 'react';
import { useParams } from 'react-router-dom';
import { Play, Heart, Shuffle, Users, Check, Music2, MoreHorizontal } from 'lucide-react';

export default function ArtistPage() {
  const { id } = useParams();
  const artistName = id ? decodeURIComponent(id) : 'Unknown Artist';

  const placeholderTracks = [
    { id: '1', title: 'Top Hit Single', duration: '3:45', plays: '12.4M' },
    { id: '2', title: 'Midnight Melody', duration: '4:12', plays: '8.9M' },
    { id: '3', title: 'Echoes of Summer', duration: '3:20', plays: '5.2M' },
    { id: '4', title: 'Neon Highway', duration: '3:58', plays: '4.1M' },
    { id: '5', title: 'Acoustic Sunset', duration: '2:49', plays: '3.6M' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-8 text-white max-w-7xl mx-auto">
      {/* Artist Header Placeholder */}
      <div className="relative rounded-3xl bg-gradient-to-b from-purple-900/40 via-[#18181B] to-[#121214] border border-[#27272A] p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-2xl flex-shrink-0 border-4 border-black/40">
          <Users className="w-16 h-16 text-white/80" />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-[#22C55E]">
            <Check className="w-3 h-3" />
            <span>Verified Artist</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight capitalize">
            {artistName}
          </h1>
          <p className="text-xs sm:text-sm text-[#8E8E93]">
            Artist ID: <code className="text-white/70">{id}</code> • 2.8M Monthly Listeners
          </p>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-4">
        <button className="w-14 h-14 rounded-full bg-[#22C55E] hover:bg-[#16a34a] flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-all">
          <Play className="w-6 h-6 fill-current ml-0.5" />
        </button>
        <button className="px-5 py-2.5 rounded-full border border-white/20 hover:border-white text-xs font-bold uppercase tracking-wider transition-colors">
          Follow
        </button>
        <button className="w-10 h-10 rounded-full border border-[#27272A] hover:border-white/40 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors">
          <Shuffle className="w-4 h-4" />
        </button>
        <button className="w-10 h-10 rounded-full border border-[#27272A] hover:border-white/40 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Popular Tracks Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Popular Tracks</h2>
        <div className="divide-y divide-[#27272A]/50 rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden">
          {placeholderTracks.map((track, idx) => (
            <div
              key={track.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <span className="w-5 text-center text-xs font-semibold text-[#8E8E93] group-hover:text-white">
                {idx + 1}
              </span>
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Music2 className="w-4 h-4 text-[#8E8E93] group-hover:text-[#22C55E]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                <p className="text-xs text-[#8E8E93] truncate">{artistName}</p>
              </div>
              <span className="text-xs text-[#8E8E93] hidden sm:block">{track.plays}</span>
              <span className="text-xs text-[#8E8E93]">{track.duration}</span>
              <button className="text-[#8E8E93] hover:text-rose-500 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
