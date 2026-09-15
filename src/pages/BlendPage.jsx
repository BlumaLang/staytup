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
  Sparkles,
  Users,
  RefreshCw,
  Music,
  Disc3,
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
      <div className="w-full min-h-full bg-[#121212] text-white px-4 py-12 flex flex-col items-center justify-center select-none">
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
      <div className="w-full min-h-full bg-[#121212] text-white px-4 sm:px-8 py-6 select-none">
        {/* Header — hidden on mobile (AppShell already displays "Blend" in the top bar) */}
        <div className="hidden lg:flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Blend
              </h1>
              <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Shared Mix
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A7A7A7] mt-1">
              A shared playlist made for two, combining your musical tastes with daily updates.
            </p>
          </div>

          <button
            onClick={handleOpenInviteModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-xs sm:text-sm font-bold hover:bg-gray-200 active:scale-95 transition-all cursor-pointer shadow-lg flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Blend</span>
          </button>
        </div>

        {/* Mobile top action bar when active blends exist */}
        {allBlends.length > 0 && (
          <div className="flex lg:hidden items-center justify-between gap-3 mb-4">
            <span className="text-xs text-[#8E8E93] font-medium">Your Shared Blends</span>
            <button
              onClick={handleOpenInviteModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create</span>
            </button>
          </div>
        )}

        {/* Content: Empty State or Active Blends Grid */}
        {allBlends.length === 0 ? (
          <div>
            {/* Full-Width Gradient Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/40 via-[#18181B] to-purple-950/40 border border-white/10 p-6 sm:p-10 shadow-2xl">
              {/* Radial glow textures */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-10 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left: Value Proposition */}
                <div className="lg:col-span-7 space-y-4">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    Music sounds better <br className="hidden sm:block" />
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
                      when shared together.
                    </span>
                  </h2>

                  <p className="text-xs sm:text-sm text-[#B3B3B3] max-w-xl leading-relaxed">
                    Create a Blend invite and send it to a friend. Once joined, Staytup merges your listening habits into a personalized 50/50 mix that automatically refreshes every single day.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleOpenInviteModal}
                      className="px-6 py-3 rounded-full bg-[#1ED760] hover:bg-[#1db954] active:scale-95 text-black font-extrabold text-xs sm:text-sm transition-all shadow-xl hover:shadow-emerald-500/25 cursor-pointer flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Create Blend Invite</span>
                    </button>
                    <span className="text-xs text-[#8E8E93]">
                      Instant 1-click link • Share anywhere
                    </span>
                  </div>
                </div>

                {/* Right: Visual Illustration Card */}
                <div className="lg:col-span-5 flex justify-center lg:justify-end">
                  <div className="w-full max-w-sm rounded-2xl bg-[#141416]/90 border border-white/10 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                        Blend Preview
                      </span>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        94% Taste Match
                      </span>
                    </div>

                    {/* Overlapping Avatar Rings */}
                    <div className="flex items-center justify-center gap-3 my-4">
                      <div className="flex flex-col items-center">
                        <UserAvatar user={user} size="lg" className="ring-4 ring-emerald-500/40 shadow-xl" />
                        <span className="text-[10px] font-bold text-white mt-1.5 max-w-[70px] truncate">
                          {user?.displayName || user?.username || 'You'}
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-black text-xs -mt-5">
                        +
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl ring-4 ring-purple-500/40">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-white mt-1.5 max-w-[70px] truncate">
                          Friend
                        </span>
                      </div>
                    </div>

                    <div className="text-center mt-3">
                      <h4 className="text-sm font-bold text-white">
                        {user?.username ? `${user.username} + Friend` : 'Shared Taste Blend'}
                      </h4>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5">
                        Daily updated shared playlist • 20 tracks
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center justify-center gap-2 mt-3.5 flex-wrap">
                      <span className="text-[10px] font-medium bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[#B3B3B3]">
                        Shared Favorites
                      </span>
                      <span className="text-[10px] font-medium bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[#B3B3B3]">
                        New Discoveries
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {allBlends.map((b) => {
              const membersList = b.members || [];
              const memberNames = membersList.map((m) => m.name || m.username || m.displayName).filter(Boolean);
              const namesLabel = memberNames.length > 0 ? memberNames.join(' + ') : b.title || 'Shared Blend';

              // Build gradient colors per blend
              const gradColors = [
                'from-emerald-600/80 to-teal-900/90',
                'from-purple-600/80 to-indigo-900/90',
                'from-rose-600/80 to-pink-900/90',
                'from-orange-600/80 to-amber-900/90',
              ];
              const gradIdx = (b.id || '').charCodeAt(0) % gradColors.length;
              const grad = gradColors[gradIdx];

              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/blend/${b.id}`)}
                  className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${grad} border border-white/10 hover:border-white/20 shadow-xl`}
                  style={{ minHeight: '170px' }}
                >
                  {/* Background texture */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_white,_transparent_60%)]" />

                  {/* Content */}
                  <div className="relative z-10 p-5 flex flex-col justify-between h-full" style={{ minHeight: '170px' }}>
                    {/* Top: avatars + match score badge */}
                    <div className="flex items-start justify-between">
                      {/* Stacked avatars */}
                      <div className="flex items-center -space-x-2.5">
                        {membersList.slice(0, 3).map((m, idx) => (
                          <UserAvatar
                            key={idx}
                            user={m}
                            size="sm"
                            className="ring-2 ring-black/40 shadow-lg"
                          />
                        ))}
                      </div>
                      {/* Match score badge */}
                      {b.matchScore && (
                        <span className="text-[10px] font-black text-white bg-white/20 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
                          {b.matchScore}% match
                        </span>
                      )}
                    </div>

                    {/* Bottom: names + stats + open button */}
                    <div className="mt-4">
                      <h3 className="text-base font-extrabold text-white leading-tight truncate max-w-full">
                        {namesLabel}
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        {(b.tracks || []).length > 0 ? `${(b.tracks || []).length} songs` : 'Blend'} • Shared Mix
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                          Taste Blend
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                          Open →
                        </span>
                      </div>
                    </div>
                  </div>
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
    <div className="w-full min-h-full bg-[#121212] text-white px-4 sm:px-8 py-6 select-none">
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

      {/* Blend Header: Spotify-Style Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/40 via-[#18181B] to-teal-950/30 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 mb-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            {/* Avatar List Side by Side with Member Names */}
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-3">
                {members.map((m, idx) => (
                  <UserAvatar
                    key={idx}
                    user={m}
                    size="lg"
                    className="ring-4 ring-[#18181B] shadow-xl"
                  />
                ))}
              </div>

              <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
                {blend.matchScore || 85}% Taste Match
              </span>
            </div>

            {/* User Names List */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Shared Blend Mix
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-0.5">
                {namesTitle}
              </h1>
              <p className="text-xs sm:text-sm text-[#A7A7A7] mt-1">
                {tracks.length} blended tracks based on your listening habits • Refreshes daily
              </p>
            </div>
          </div>

          {/* Actions: Big Play Button & Share */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => handlePlayBlend()}
              className="w-14 h-14 rounded-full bg-[#1ED760] hover:bg-[#1db954] hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
              title="Play Blend"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
              title="Invite another friend"
            >
              <Share2 className="w-4 h-4" />
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
