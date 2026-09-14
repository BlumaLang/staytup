import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import {
  getBlendById,
  getStoredBlends,
  saveBlend,
  createOrGetBlend,
  createBlendInvite,
  removeBlend,
} from '../services/blendService';
import { api } from '../api/endpoints';
import { UserAvatar } from '../components/UserAvatar';
import { ArtistLinks } from '../components/ArtistLinks';
import { get500x500Image } from '../utils/media';
import {
  Play,
  ArrowLeft,
  Heart,
  Plus,
  Check,
  Share2,
  Trash2,
  X,
} from 'lucide-react';

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function BlendPage() {
  const { id, token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, likedTrackIds, toggleLike } = usePlayer();

  // Detect mode
  const isInviteMode = !!token || location.pathname.includes('/blend/invite/');
  const currentToken = token || location.pathname.split('/blend/invite/')[1]?.split('/')[0] || '';
  const isDetailMode = !!id && !isInviteMode;

  // States
  const [blend, setBlend] = useState(null);
  const [allBlends, setAllBlends] = useState([]);
  const [copiedToast, setCopiedToast] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [joining, setJoining] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // 1. Load Blend or Blends list
  useEffect(() => {
    if (isInviteMode && currentToken) {
      api.getBlendInvite(currentToken)
        .then((res) => {
          if (res?.blend) setBlend(res.blend);
        })
        .catch(() => {});
      return;
    }

    if (isDetailMode && id) {
      getBlendById(id).then((found) => {
        if (found) {
          setBlend(found);
        } else {
          // Fallback initial blend if opened without existing state
          const mockFriend = {
            id: 'friend_vibes',
            name: 'Music Friend',
            username: 'friend',
            avatar: '',
          };
          createOrGetBlend(user || { id: 'you', username: 'You', displayName: 'You' }, [mockFriend]).then((b) => {
            if (b) setBlend(b);
          });
        }
      });
    } else {
      // Hub mode: load all stored blends
      const stored = getStoredBlends();
      setAllBlends(Object.values(stored));
    }
  }, [id, token, isDetailMode, isInviteMode, currentToken, user]);

  // Handle Approve & Join Blend from invite link
  const handleApproveBlend = async () => {
    if (!user) {
      alert('Please sign in to approve and join this Blend.');
      return;
    }
    setJoining(true);
    try {
      const res = await api.joinBlendInvite(currentToken, user);
      if (res?.blend) {
        saveBlend(res.blend);
        setBlend(res.blend);
        navigate(`/blend/${res.blend.id}`, { replace: true });
      } else {
        const b = blend || { id: 'blend_shared', title: 'Shared Blend', members: [] };
        const exists = b.members?.some((m) => String(m.id) === String(user.id));
        if (!exists) {
          b.members = [
            ...(b.members || []),
            { id: user.id, name: user.displayName || user.username, avatar: user.avatar || '' },
          ];
        }
        saveBlend(b);
        navigate(`/blend/${b.id}`, { replace: true });
      }
    } catch (e) {
      navigate('/blend');
    } finally {
      setJoining(false);
    }
  };

  // Handle Create / Share Invite Link
  const handleOpenInviteModal = async () => {
    const bId = blend?.id || `blend_${user?.id || 'user'}_${Date.now()}`;
    const inv = await createBlendInvite(bId, user);
    setInviteUrl(inv.inviteUrl);
    setInviteModalOpen(true);
  };

  const handleCopyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2200);
    }
  };

  // Remove / Leave Blend
  const handleLeaveOrRemoveBlend = () => {
    if (!blend?.id) return;
    removeBlend(blend.id);
    navigate('/blend');
  };

  // ==========================================
  // VIEW 1: APPROVE BLEND SECTION (INVITE LINK)
  // ==========================================
  if (isInviteMode) {
    const inviter = blend?.members?.[0] || { name: 'A friend', username: 'listener' };

    return (
      <div className="min-h-full bg-black text-white px-4 py-12 flex flex-col items-center justify-center select-none">
        <div className="w-full max-w-sm bg-[#141417] border border-white/10 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
          {/* Member Avatars Side by Side */}
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="flex flex-col items-center">
              <UserAvatar user={inviter} size="lg" className="ring-2 ring-emerald-500/40 shadow-lg" />
              <span className="text-xs font-semibold text-white mt-1.5 max-w-[80px] truncate">
                {inviter.name || inviter.username}
              </span>
            </div>

            <span className="text-xl font-bold text-[#8E8E93] pb-4">+</span>

            <div className="flex flex-col items-center">
              <UserAvatar user={user} size="lg" className="ring-2 ring-white/20 shadow-lg" />
              <span className="text-xs font-semibold text-white mt-1.5 max-w-[80px] truncate">
                {user?.displayName || user?.username || 'You'}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-1.5 mt-2">
            Join Taste Blend
          </h2>
          <p className="text-xs text-[#8E8E93] mb-6 max-w-xs leading-relaxed">
            {inviter.name || inviter.username} invited you to a shared blend. Your music tastes will automatically combine into a daily shared playlist.
          </p>

          <button
            onClick={handleApproveBlend}
            disabled={joining}
            className="w-full py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 mb-2.5"
          >
            {joining ? (
              <span>Approving & Blending...</span>
            ) : (
              <span>Approve & Join Blend</span>
            )}
          </button>

          <button
            onClick={() => navigate('/blend')}
            className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer py-1"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: BLEND HUB (CLEAN LIST OF BLENDS)
  // ==========================================
  if (!isDetailMode || !blend) {
    return (
      <div className="min-h-full bg-black text-white px-4 sm:px-6 py-6 max-w-4xl mx-auto select-none">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Blend
            </h1>
            <p className="text-xs sm:text-sm text-[#8E8E93] mt-0.5">
              Shared mixes combining music taste between friends.
            </p>
          </div>

          <button
            onClick={handleOpenInviteModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all cursor-pointer shadow-md flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Blend</span>
          </button>
        </div>

        {/* Blends Grid */}
        {allBlends.length === 0 ? (
          <div className="bg-[#141417] border border-white/5 rounded-2xl p-8 sm:p-12 text-center">
            <h3 className="text-base font-bold text-white mb-1">No Active Blends Yet</h3>
            <p className="text-xs text-[#8E8E93] max-w-sm mx-auto mb-5">
              Create an invite link and send it to a friend. Once approved, your shared mix appears here.
            </p>
            <button
              onClick={handleOpenInviteModal}
              className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer shadow-md"
            >
              Create Invite Link
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {allBlends.map((b) => {
              const membersList = b.members || [];
              const memberNames = membersList.map((m) => m.name || m.username).filter(Boolean);
              const namesLabel = memberNames.length > 0 ? memberNames.join(' + ') : b.title || 'Shared Blend';

              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/blend/${b.id}`)}
                  className="bg-[#141417] hover:bg-[#1C1C20] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all cursor-pointer group flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Member Avatars Stack */}
                    <div className="flex items-center -space-x-2 flex-shrink-0">
                      {membersList.slice(0, 3).map((m, idx) => (
                        <UserAvatar
                          key={idx}
                          user={m}
                          size="sm"
                          className="ring-2 ring-[#141417]"
                        />
                      ))}
                    </div>

                    {/* Member Names */}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {namesLabel}
                      </h3>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5">
                        {(b.tracks || []).length} songs • {b.matchScore || 85}% match
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-[#8E8E93] group-hover:text-white transition-colors flex-shrink-0">
                    Open →
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Invite Link Modal */}
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181B] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white">
                  Invite to Blend
                </h3>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="text-[#8E8E93] hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#8E8E93] mb-4">
                Share this link with a friend. When they open and approve it, your shared blend will generate instantly.
              </p>

              <div className="flex items-center gap-2 bg-[#121214] border border-white/10 rounded-xl p-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="bg-transparent text-xs text-white flex-1 outline-none px-1 select-all truncate"
                />
                <button
                  onClick={handleCopyInvite}
                  className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex-shrink-0"
                >
                  {copiedToast ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE BLEND SCREEN
  // ==========================================
  const members = blend?.members || [
    { id: user?.id || 'you', name: user?.displayName || user?.username || 'You', avatar: user?.avatar || '' },
  ];
  const memberNames = members.map((m) => m.name || m.username).filter(Boolean);
  const namesTitle = memberNames.length > 0 ? memberNames.join(' + ') : blend.title || 'Taste Blend';
  const tracks = blend?.tracks || [];

  const handlePlayBlend = (trackToPlay = tracks[0]) => {
    if (trackToPlay) {
      playTrack(trackToPlay, tracks);
    }
  };

  const handleCopyLink = async () => {
    const inv = await createBlendInvite(blend.id, user);
    navigator.clipboard.writeText(inv.inviteUrl);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2200);
  };

  return (
    <div className="min-h-full bg-black text-white px-4 sm:px-6 py-6 max-w-4xl mx-auto select-none">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/blend')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Blends</span>
        </button>

        {/* Remove / Leave Blend Button */}
        <button
          onClick={() => setShowRemoveConfirm(true)}
          className="text-xs text-[#8E8E93] hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
          title="Remove from Blend"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove Blend</span>
        </button>
      </div>

      {/* Blend Header: User Names + Avatar List */}
      <div className="bg-[#141417] border border-white/5 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            {/* Avatar List Side by Side with Member Names */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center -space-x-2">
                {members.map((m, idx) => (
                  <UserAvatar
                    key={idx}
                    user={m}
                    size="md"
                    className="ring-2 ring-[#141417] shadow-md"
                  />
                ))}
              </div>

              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-1">
                {blend.matchScore || 85}% Match
              </span>
            </div>

            {/* User Names List */}
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {namesTitle}
            </h1>
            <p className="text-xs text-[#8E8E93] mt-1">
              {tracks.length} blended tracks based on your listening activity
            </p>
          </div>

          {/* Actions: Big Play Button & Share */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePlayBlend()}
              className="w-12 h-12 rounded-full bg-[#22C55E] hover:bg-[#1fb856] active:scale-95 text-black flex items-center justify-center shadow-lg transition-transform cursor-pointer"
              title="Play Blend"
            >
              <Play className="w-5 h-5 fill-black ml-0.5" />
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Invite another friend"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-1">
        {tracks.map((track, idx) => {
          const trackId = String(track.videoId || track.video_id || track.id || '');
          const isPlayingCurrent =
            isPlaying &&
            String(currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id || '') === trackId;
          const isLiked = likedTrackIds.has(trackId);

          return (
            <div
              key={`${trackId}-${idx}`}
              onClick={() => handlePlayBlend(track)}
              className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-semibold text-[#8E8E93] w-5 text-center flex-shrink-0">
                  {idx + 1}
                </span>

                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                  <img
                    src={get500x500Image(track.thumbnail || track.artwork_url || track.image)}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = './assets/staytup_logo.32975537674b053888ade6460fa37f97.png';
                    }}
                  />
                  {isPlayingCurrent && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 pr-2">
                  <div
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isPlayingCurrent ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </div>
                  <div className="text-[11px] text-[#8E8E93] truncate mt-0.5">
                    <ArtistLinks track={track} maxDisplay={2} showAvatars={false} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(track);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isLiked ? 'fill-emerald-500 text-emerald-500' : 'text-[#8E8E93] hover:text-white'
                    }`}
                  />
                </button>
                <span className="text-xs text-[#8E8E93] tabular-nums">
                  {formatDuration(track.duration || track.duration_seconds)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl text-center">
            <h3 className="text-sm font-bold text-white mb-1.5">Remove this Blend?</h3>
            <p className="text-xs text-[#8E8E93] mb-4">
              This shared mix will be removed from your blends list.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveOrRemoveBlend}
                className="flex-1 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-4 py-2 rounded-full font-bold text-xs shadow-2xl flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>Invite link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
