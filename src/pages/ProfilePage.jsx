import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import {
  Edit3,
  Heart,
  Settings,
  Share2,
  Clock,
  Music2,
  ChevronRight,
  Play,
  Disc3,
  Check,
} from 'lucide-react';
import { LoginModal } from '../components/LoginModal';
import { api } from '../api/endpoints';
import { getStoredBlends } from '../services/blendService';

/* ─── Small track row ─── */
const TrackRow = ({ track, onPlay, index }) => {
  const { currentTrack, isPlaying } = usePlayer();
  const videoId = String(track?.videoId || track?.video_id || track?.id || '');
  const curId = String(
    currentTrack?.videoId || currentTrack?.video_id || currentTrack?.id || ''
  );
  const isActive = videoId && videoId === curId;

  return (
    <button
      type="button"
      onClick={() => onPlay(track, index)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left group cursor-pointer"
    >
      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
        {track?.thumbnail || track?.image ? (
          <img
            src={track.thumbnail || track.image}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-4 h-4 text-[#8E8E93]" />
          </div>
        )}
        <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <Play className="w-3.5 h-3.5 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-emerald-400' : 'text-white'}`}>
          {track?.title || 'Unknown Track'}
        </p>
        <p className="text-xs text-[#8E8E93] truncate">
          {track?.artist || track?.channelTitle || 'Unknown Artist'}
        </p>
      </div>
      {isActive && isPlaying && (
        <span className="flex-shrink-0">
          <Disc3 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
        </span>
      )}
    </button>
  );
};

/* ─── Section card ─── */
const SectionCard = ({ title, icon: Icon, count, onViewAll, viewAllPath, children }) => (
  <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-[#8E8E93]" />}
        <h4 className="text-sm font-bold text-white">{title}</h4>
        {count !== undefined && (
          <span className="text-xs text-[#8E8E93] font-medium">({count})</span>
        )}
      </div>
      {(onViewAll || viewAllPath) && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
        >
          View all
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    <div className="px-1 pb-2">{children}</div>
  </div>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likedTrackIds, playTrack } = usePlayer();

  const [showEditModal, setShowEditModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [likedTracks, setLikedTracks] = useState([]);
  const [history, setHistory] = useState([]);
  const [blends, setBlends] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname.includes('/staytup') ? '/staytup' : ''}/user/${user?.id || user?.uid}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [user]);

  const handlePlayLiked = useCallback((track) => {
    playTrack(track, likedTracks);
  }, [likedTracks, playTrack]);

  const handlePlayHistory = useCallback((track) => {
    playTrack(track, history);
  }, [history, playTrack]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        // Load liked tracks
        if (user?.id || user?.uid) {
          const [favs, hist] = await Promise.allSettled([
            api.getFavorites(user.id || user.uid),
            api.getHistory(user.id || user.uid),
          ]);
          if (alive) {
            if (favs.status === 'fulfilled' && Array.isArray(favs.value)) {
              setLikedTracks(favs.value.slice(0, 6));
            }
            if (hist.status === 'fulfilled' && Array.isArray(hist.value)) {
              setHistory(hist.value.slice(0, 6));
            }
          }
        } else {
          // Fallback: localStorage recently played
          if (alive) {
            try {
              const raw = localStorage.getItem('staytup_recently_played');
              if (raw) setHistory(JSON.parse(raw).slice(0, 6));
            } catch {}
          }
        }

        // Load blends
        if (alive) {
          const storedBlends = getStoredBlends();
          setBlends(storedBlends || []);
        }
      } catch {
        // silent
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user]);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).getFullYear()
    : null;

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Hero Header */}
      <div className="relative px-4 sm:px-8 pt-8 pb-6 bg-gradient-to-b from-[#1a1a1f] to-black border-b border-[#1C1C1E]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={user?.avatar || './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg'}
              alt={user?.username || 'User avatar'}
              onError={(e) => {
                e.target.src = './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg';
              }}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-white/20 bg-black shadow-2xl"
            />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-1">Profile</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight truncate">
              {user?.username || user?.displayName || 'Staytup Listener'}
            </h1>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-xs text-[#8E8E93]">
              <span className="font-semibold text-emerald-400">{likedTrackIds.size} Liked Tracks</span>
              {blends.length > 0 && (
                <>
                  <span className="text-[#444448]">•</span>
                  <span className="font-medium">{blends.length} Blend{blends.length !== 1 ? 's' : ''}</span>
                </>
              )}
              {memberSince && (
                <>
                  <span className="text-[#444448]">•</span>
                  <span>Member since {memberSince}</span>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs inline-flex items-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied!</>
                ) : (
                  <><Share2 className="w-3.5 h-3.5" />Share Profile</>
                )}
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Music Content */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full max-w-5xl mx-auto space-y-5">

        {/* Liked Songs */}
        {(likedTracks.length > 0 || likedTrackIds.size > 0) && (
          <SectionCard
            title="Liked Songs"
            icon={Heart}
            count={likedTrackIds.size}
            onViewAll={() => navigate('/library?tab=favorites')}
          >
            {loading ? (
              <div className="px-3 py-4 text-xs text-[#8E8E93]">Loading...</div>
            ) : likedTracks.length > 0 ? (
              likedTracks.map((track, i) => (
                <TrackRow key={track?.videoId || track?.id || i} track={track} index={i} onPlay={handlePlayLiked} />
              ))
            ) : (
              <div className="px-3 py-4 text-xs text-[#8E8E93]">Your liked tracks will appear here.</div>
            )}
          </SectionCard>
        )}

        {/* Recently Played */}
        {history.length > 0 && (
          <SectionCard
            title="Recently Played"
            icon={Clock}
            onViewAll={() => navigate('/library?tab=history')}
          >
            {history.map((track, i) => (
              <TrackRow key={track?.videoId || track?.id || i} track={track} index={i} onPlay={handlePlayHistory} />
            ))}
          </SectionCard>
        )}

        {/* Active Blends */}
        {blends.length > 0 && (
          <SectionCard
            title="Your Blends"
            icon={Disc3}
            onViewAll={() => navigate('/blend')}
          >
            <div className="px-2 py-1 space-y-1">
              {blends.slice(0, 4).map((blend) => {
                const otherMembers = (blend.members || []).filter(
                  (m) => m.id !== (user?.id || user?.uid)
                );
                const label =
                  otherMembers.length > 0
                    ? `Blend with ${otherMembers.map((m) => m.username || m.displayName || 'Someone').join(', ')}`
                    : 'Your Blend';
                return (
                  <button
                    key={blend.id}
                    onClick={() => navigate(`/blend/${blend.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Disc3 className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{label}</p>
                      {blend.matchScore && (
                        <p className="text-xs text-emerald-400 font-medium">{blend.matchScore}% match</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                  </button>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Empty state if nothing loaded */}
        {!loading && likedTracks.length === 0 && likedTrackIds.size === 0 && history.length === 0 && blends.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Music2 className="w-12 h-12 text-[#333336]" />
            <p className="text-sm font-medium text-[#8E8E93]">Your music activity will appear here.</p>
            <p className="text-xs text-[#555558]">Start listening to build your profile.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-2 px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Explore Music
            </button>
          </div>
        )}

        {/* Settings link hint at bottom */}
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-between px-4 py-3.5 bg-[#121214] border border-[#222226] rounded-2xl hover:bg-[#18181B] transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            <span className="text-sm font-medium text-white">Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Edit Profile Modal */}
      <LoginModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
    </div>
  );
}
