import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { UserAvatar } from '../components/UserAvatar';
import { createOrGetBlend } from '../services/blendService';
import { getUserUrl, shareContent } from '../utils/canonicalUrl';
import { get500x500Image } from '../utils/media';
import {
  ArrowLeft,
  Disc3,
  Share2,
  Play,
  Heart,
  Music2,
  Check,
  ListMusic,
} from 'lucide-react';

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { playTrack, likedTrackIds, toggleLike } = usePlayer();

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    // Fetch user profile from API
    api
      .getUserProfile(id)
      .then((res) => {
        if (res && res.profile) {
          setProfile(res.profile);
        } else {
          setProfile({
            id,
            username: id,
            displayName: id,
            avatar: '',
            bio: 'Music lover on Staytup',
          });
        }
      })
      .catch(() => {
        setProfile({
          id,
          username: id,
          displayName: id,
          avatar: '',
          bio: 'Music lover on Staytup',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Fetch public listening history / tracks
    api
      .getHistory(id)
      .then((res) => {
        if (Array.isArray(res)) setHistory(res);
        else if (res?.history) setHistory(res.history);
      })
      .catch(() => {});
  }, [id]);

  const handleStartBlend = async () => {
    if (!currentUser || !profile) return;
    const blendData = await createOrGetBlend(currentUser, [profile], [], history, [], []);
    if (blendData?.id) {
      navigate(`/blend/${encodeURIComponent(blendData.id)}`);
    }
  };

  const handleShare = async () => {
    const url = getUserUrl(id);
    const result = await shareContent({
      title: `${profile?.displayName || profile?.username || 'User'} - Staytup Profile`,
      text: `Connect with ${profile?.displayName || profile?.username} on Staytup Music!`,
      url,
    });
    if (result.success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const displayName = profile?.displayName || profile?.username || id || 'User Profile';
  const isMe = currentUser?.id === id;

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Toast */}
      {copiedToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#22C55E] text-black font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Profile link copied to clipboard!</span>
        </div>
      )}

      {/* Top Header */}
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
          <span>Share Profile</span>
        </button>
      </div>

      {/* Profile Header Hero */}
      <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-br from-[#1C1C22] via-[#121215] to-[#0A0A0C] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* User Avatar */}
          <UserAvatar
            user={profile}
            size="hero"
            className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white/10 shadow-2xl flex-shrink-0"
          />

          {/* User Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#22C55E] block mb-1">
              Listener Profile
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white truncate tracking-tight mb-1">
              {displayName}
            </h1>
            <p className="text-xs text-[#8E8E93] mb-3">@{profile?.username || id}</p>
            {profile?.bio && (
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl leading-relaxed mb-4 line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Action Buttons */}
            {!isMe && (
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <button
                  onClick={handleStartBlend}
                  className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                >
                  <Disc3 className="w-4 h-4" />
                  <span>Invite to Blend</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User's Listening Activity */}
      <div className="flex-1 px-4 sm:px-8 py-4 max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Recently Listened</h2>
          {history.length === 0 ? (
            <div className="py-12 text-center text-[#8E8E93] bg-[#121214] border border-white/5 rounded-2xl">
              <Music2 className="w-10 h-10 text-[#2C2C2E] mx-auto mb-2" />
              <p className="text-xs font-bold text-white">No listening history visible</p>
              <p className="text-[11px] text-[#636366] mt-0.5">
                This user's recent tracks are private or empty.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {history.slice(0, 15).map((track, i) => {
                const vid = String(track.videoId || track.video_id || track.id || '');
                const isLiked = likedTrackIds.has(vid);
                const artwork = get500x500Image(
                  track.image || track.thumbnail || track.artwork_url
                );

                return (
                  <div
                    key={vid || i}
                    onClick={() => playTrack(track, history)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#121214] hover:bg-[#18181C] border border-white/[0.03] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-5 text-center text-xs font-semibold text-[#8E8E93] group-hover:hidden">
                        {i + 1}
                      </span>
                      <div className="w-5 hidden group-hover:flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 fill-current text-white" />
                      </div>

                      <img
                        src={artwork}
                        alt={track.title}
                        className="w-10 h-10 rounded-xl object-cover bg-black flex-shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight group-hover:text-white">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">
                          {track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track);
                      }}
                      className="text-[#8E8E93] hover:text-white transition-colors ml-2"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isLiked ? 'fill-[#22C55E] text-[#22C55E]' : 'stroke-current'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
