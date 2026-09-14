import React from 'react';
import { useParams } from 'react-router-dom';
import { Disc3, Play, Heart, Shuffle, Clock, MoreHorizontal } from 'lucide-react';

export default function AlbumPage() {
  const { id } = useParams();
  const albumTitle = id ? decodeURIComponent(id) : 'Unknown Album';

  const placeholderTracks = [
    { id: '1', title: 'Intro / Overture', duration: '1:45' },
    { id: '2', title: 'Main Theme', duration: '3:50' },
    { id: '3', title: 'Starlight Serenade', duration: '4:15' },
    { id: '4', title: 'Rhythm in the Rain', duration: '3:25' },
    { id: '5', title: 'After Hours (Outro)', duration: '2:50' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-8 text-white max-w-7xl mx-auto">
      {/* Album Header Placeholder */}
      <div className="relative rounded-3xl bg-gradient-to-b from-emerald-950/40 via-[#18181B] to-[#121214] border border-[#27272A] p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-2xl flex-shrink-0 border border-white/10">
          <Disc3 className="w-20 h-20 text-white/80 animate-spin-slow" />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#22C55E]">
            Album
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight capitalize">
            {albumTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#8E8E93]">
            Album ID: <code className="text-white/70">{id}</code> • 2024 • 5 songs, 16 min 5 sec
          </p>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-4">
        <button className="w-14 h-14 rounded-full bg-[#22C55E] hover:bg-[#16a34a] flex items-center justify-center text-black shadow-xl hover:scale-105 active:scale-95 transition-all">
          <Play className="w-6 h-6 fill-current ml-0.5" />
        </button>
        <button className="w-10 h-10 rounded-full border border-[#27272A] hover:border-white/40 flex items-center justify-center text-[#8E8E93] hover:text-rose-500 transition-colors">
          <Heart className="w-4 h-4" />
        </button>
        <button className="w-10 h-10 rounded-full border border-[#27272A] hover:border-white/40 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors">
          <Shuffle className="w-4 h-4" />
        </button>
        <button className="w-10 h-10 rounded-full border border-[#27272A] hover:border-white/40 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Track List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93] px-4 uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span className="w-5 text-center">#</span>
            <span>Title</span>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="divide-y divide-[#27272A]/50 rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden">
          {placeholderTracks.map((track, idx) => (
            <div
              key={track.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="w-5 text-center text-xs font-semibold text-[#8E8E93] group-hover:text-white">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                  <p className="text-xs text-[#8E8E93] truncate">{albumTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="text-[#8E8E93] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#8E8E93]">{track.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
