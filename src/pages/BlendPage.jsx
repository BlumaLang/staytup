import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { getBlendById, saveBlend, createOrGetBlend } from '../services/blendService';
import { UserAvatar } from '../components/UserAvatar';
import { get500x500Image } from '../utils/media';
import { getBlendUrl, shareContent } from '../utils/canonicalUrl';
import {
  Play,
  Pause,
  Share2,
  Sparkles,
  ArrowLeft,
  Heart,
  Music2,
  Users,
  Check,
} from 'lucide-react';

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function BlendPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();

  const [blend, setBlend] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'both' | 'fresh_you' | 'fresh_friend'
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    const existing = getBlendById(id);
    if (existing) {
      setBlend(existing);
    } else {
      // Create stub / fallback blend
      const mockFriend = {
        id: 'friend_listener',
        name: 'Friend Listener',
        username: 'friend',
        avatar: '',
      };
      createOrGetBlend(user || { id: 'guest', username: 'You' }, mockFriend).then((res) => {
        if (res) setBlend(res);
      });
    }
  }, [id, user]);

  const handleShare = async () => {
    const url = getBlendUrl(id);
    const result = await shareContent({
      title: `${blend?.title || 'Shared Blend'} - Staytup Music`,
      text: `Check out our ${blend?.matchScore || 80}% shared music Blend on Staytup!`,
      url,
    });
    if (result.success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const tracks = blend?.tracks || [];
  const bothLove = blend?.bothLoveTracks || [];
  const freshForYou = blend?.freshForUser1Tracks || [];
  const freshForFriend = blend?.freshForUser2Tracks || [];

  const getActiveTracks = () => {
    switch (activeTab) {
      case 'both':
        return bothLove.length > 0 ? bothLove : tracks;
      case 'fresh_you':
        return freshForYou.length > 0 ? freshForYou : tracks;
      case 'fresh_friend':
        return freshForFriend.length > 0 ? freshForFriend : tracks;
      default:
        return tracks;
    }
  };

  const activeTracks = getActiveTracks();

  const isCurrentPlaying = (track) => {
    const activeId = currentTrack?.videoId || currentTrack?.id;
    const trackId = track?.videoId || track?.id;
    return isPlaying && activeId && trackId && String(activeId) === String(trackId);
  };

  const handlePlayAll = () => {
    if (activeTracks.length > 0) {
      playTrack(activeTracks[0], activeTracks);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#22C55E] text-black font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <Check className="w-4 h-4" />
          <span>Link copied to clipboard!</span>
        </div>
      )}

      {/* Top Navigation */}
      <div className="px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Blend</span>
        </button>
      </div>

      {/* Hero Banner with Dual Avatars */}
      <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-br from-indigo-900/60 via-purple-900/30 to-[#0F0F12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Overlapping Dual Avatars */}
          <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">
            <div className="absolute left-2 z-10">
              <UserAvatar
                user={blend?.user1}
                size="2xl"
                className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-[#0F0F12] shadow-xl"
              />
            </div>
            <div className="absolute right-2 z-20">
              <UserAvatar
                user={blend?.user2}
                size="2xl"
                className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-[#0F0F12] shadow-xl"
              />
            </div>
          </div>

          {/* Blend Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{blend?.matchScore || 78}% Match</span>
              </span>
              <span className="text-xs font-semibold text-[#8E8E93]">Daily Blend</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 truncate">
              {blend?.title || 'Shared Blend'}
            </h1>

            <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl line-clamp-2 mb-4 leading-relaxed">
              {blend?.description || 'A personalized daily mix combining your favorite music.'}
            </p>

            {/* Play All Button */}
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <button
                onClick={handlePlayAll}
                className="px-6 py-2.5 rounded-full bg-[#22C55E] hover:bg-[#20ba58] text-black font-extrabold text-sm flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play Blend</span>
              </button>

              <span className="text-xs text-[#8E8E93]">
                {activeTracks.length} {activeTracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-white/5">
          {[
            { id: 'all', label: `All Blend (${tracks.length})` },
            { id: 'both', label: `Both Love (${bothLove.length})` },
            { id: 'fresh_you', label: 'Fresh for You' },
            { id: 'fresh_friend', label: `Fresh for ${blend?.user2?.name || 'Friend'}` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#18181A] hover:bg-[#222226] text-[#8E8E93] hover:text-white border border-[#28282C]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        {activeTracks.length === 0 ? (
          <div className="py-16 text-center text-[#8E8E93]">
            <Music2 className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
            <p className="text-sm font-bold text-white">No tracks in this category</p>
            <p className="text-xs mt-1">Switch to "All Blend" to listen to the full mix.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeTracks.map((track, idx) => {
              const vid = String(track.videoId || track.video_id || track.id || '');
              const isPlayingNow = isCurrentPlaying(track);
              const isLiked = likedTrackIds.has(vid);
              const artwork = get500x500Image(
                track.image || track.thumbnail || track.artwork_url
              );

              return (
                <div
                  key={vid || idx}
                  onClick={() => playTrack(track, activeTracks)}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer group ${
                    isPlayingNow
                      ? 'bg-white/10 text-[#22C55E]'
                      : 'bg-[#121214] hover:bg-[#18181C] text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Index or Playing indicator */}
                    <span className="w-5 text-center text-xs font-semibold text-[#8E8E93] group-hover:hidden">
                      {idx + 1}
                    </span>
                    <div className="w-5 hidden group-hover:flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>

                    {/* Artwork */}
                    <img
                      src={artwork}
                      alt={track.title}
                      className="w-11 h-11 rounded-xl object-cover bg-black flex-shrink-0 shadow-md"
                    />

                    {/* Track info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate leading-tight group-hover:text-white">
                        {track.title}
                      </p>
                      <p
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/artist/${encodeURIComponent(track.artist || '')}`);
                        }}
                        className="text-xs text-[#8E8E93] hover:text-white transition-colors truncate mt-0.5"
                      >
                        {track.artist || 'Unknown Artist'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      className="text-[#8E8E93] hover:text-white transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-[#8E8E93] w-12 text-right">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
