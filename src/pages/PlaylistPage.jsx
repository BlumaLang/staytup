import React from 'react';
import { useParams } from 'react-router-dom';
import { ListMusic, Play, Heart, Shuffle, Clock, MoreHorizontal, User } from 'lucide-react';

export default function PlaylistPage() {
  const { id } = useParams();
  const playlistName = id ? decodeURIComponent(id) : 'Custom Playlist';

  const placeholderTracks = [
    { id: '1', title: 'Summer Vibes Track 1', artist: 'Trending Artist', duration: '3:21' },
    { id: '2', title: 'Late Night Echoes', artist: 'Indie Band', duration: '4:02' },
    { id: '3', title: 'Acoustic Morning', artist: 'Folk Duo', duration: '2:45' },
    { id: '4', title: 'Bass Heavy Workout', artist: 'EDM Producer', duration: '3:10' },
    { id: '5', title: 'Chill Waves', artist: 'Lo-Fi Chill', duration: '2:55' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-8 text-white max-w-7xl mx-auto">
      {/* Playlist Header Placeholder */}
      <div className="relative rounded-3xl bg-gradient-to-b from-blue-950/40 via-[#18181B] to-[#121214] border border-[#27272A] p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-2xl flex-shrink-0 border border-white/10">
          <ListMusic className="w-20 h-20 text-white/80" />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Playlist
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight capitalize">
            {playlistName}
          </h1>
          <p className="text-xs sm:text-sm text-[#8E8E93] flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-white/80">
              <User className="w-3.5 h-3.5" /> Curated Playlist
            </span>
            <span>•</span>
            <span>ID: <code className="text-white/70">{id}</code></span>
            <span>•</span>
            <span>5 songs, 16 min</span>
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
                  <p className="text-xs text-[#8E8E93] truncate">{track.artist}</p>
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
