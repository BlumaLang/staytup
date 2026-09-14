import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { UserAvatar } from '../components/UserAvatar';
import { createOrGetBlend } from '../services/blendService';
import { get500x500Image } from '../utils/media';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Disc3,
  Play,
  Heart,
  Music2,
  X,
  Share2,
  Check,
  Radio,
  Clock,
  Shield,
  Trash2,
  ArrowRight,
} from 'lucide-react';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const [activeMobileTab, setActiveMobileTab] = useState('people'); // 'people' | 'activity' | 'blend'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [shareActivity, setShareActivity] = useState(true);

  // Live listening activity
  const [activities, setActivities] = useState([]);

  // Fetch Friends
  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.getFriends();
      const list = data.friends || [];
      setFriends(list);

      // Build mock/real live activity from friends
      const act = list.map((f, i) => {
        const songTitle = f.song || f.nowPlaying?.title || 'Daily Discovery';
        const artistName = f.artist || f.nowPlaying?.artist || f.displayName || 'Staytup Artist';
        const art = f.artwork || f.image || f.nowPlaying?.artwork || f.avatar || '';
        return {
          id: f.id,
          user: f,
          song: songTitle,
          artist: artistName,
          artwork: art,
          time: f.time || `${(i + 1) * 3}m ago`,
          isListeningNow: i % 2 === 0,
          track: {
            id: f.nowPlaying?.id || `friend_track_${f.id}`,
            videoId: f.nowPlaying?.videoId || `friend_track_${f.id}`,
            title: songTitle,
            artist: artistName,
            image: art,
          },
        };
      });
      setActivities(act);
    } catch (e) {
      console.error('Failed to fetch friends:', e);
    }
  }, [user?.id]);

  // Fetch Friend Requests
  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.getFriendRequests();
      setRequests(data.requests || []);
    } catch (e) {
      console.error('Failed to fetch friend requests:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      Promise.all([fetchFriends(), fetchRequests()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [user?.id, fetchFriends, fetchRequests]);

  // Debounced User Search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchUsers(q);
        const filtered = (data.users || []).filter((u) => u.id !== user?.id);
        setSearchResults(filtered);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const handleSendRequest = async (targetId) => {
    try {
      await api.sendFriendRequest(targetId);
      setSentRequests((prev) => new Set([...prev, targetId]));
    } catch (e) {
      console.warn('Friend request error:', e);
    }
  };

  const handleAcceptRequest = async (req) => {
    try {
      await api.acceptFriendRequest(req.id);
      await Promise.all([fetchFriends(), fetchRequests()]);
    } catch (e) {
      console.warn('Accept error:', e);
    }
  };

  const handleDeclineRequest = async (reqId) => {
    try {
      await api.declineFriendRequest(reqId);
      await fetchRequests();
    } catch (e) {
      console.warn('Decline error:', e);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.removeFriend(friendId);
      await fetchFriends();
    } catch (e) {
      console.warn('Remove error:', e);
    }
  };

  const handleCreateBlendWithFriend = async (friend) => {
    if (!user || !friend) return;
    const blendData = await createOrGetBlend(user, friend);
    if (blendData?.id) {
      navigate(`/blend/${encodeURIComponent(blendData.id)}`);
    }
  };

  const isFriend = (uId) => friends.some((f) => f.id === uId);
  const isPending = (uId) => sentRequests.has(uId);

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Top Header */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 pt-5 pb-3 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#22C55E]" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Friends &amp; Social Hub
              </h1>
            </div>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Connect with music lovers, share live playback, and create collaborative Blends
            </p>
          </div>

          {/* Social Privacy Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#141417] px-3 py-1.5 rounded-full border border-white/5">
            <Radio className={`w-3.5 h-3.5 ${shareActivity ? 'text-[#22C55E] animate-pulse' : 'text-[#8E8E93]'}`} />
            <span className="text-[11px] font-semibold text-[#8E8E93]">
              {shareActivity ? 'Activity Sharing On' : 'Activity Hidden'}
            </span>
            <button
              onClick={() => setShareActivity((prev) => !prev)}
              className={`w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                shareActivity ? 'bg-[#22C55E]' : 'bg-[#2C2C2E]'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  shareActivity ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Segmented Control */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pt-3">
          {[
            { id: 'people', label: `People (${friends.length})` },
            { id: 'activity', label: 'Live Activity' },
            { id: 'blend', label: 'Blend Mixes' },
          ].map((tab) => {
            const isActive = activeMobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMobileTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#18181A] text-[#8E8E93] hover:text-white border border-[#28282C]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full max-w-7xl mx-auto">
        {/* Desktop 2-Column Grid / Mobile Filter View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: PEOPLE, PROFILES, SEARCH & REQUESTS (Desktop 7 cols)         */}
          {/* ========================================================================= */}
          <div
            className={`space-y-6 lg:col-span-7 ${
              activeMobileTab !== 'people' ? 'hidden lg:block' : ''
            }`}
          >
            {/* Live Search People Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people by username or name..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#141417] hover:bg-[#1A1A1E] focus:bg-[#1A1A1E] border border-white/5 focus:border-white/30 rounded-2xl text-xs sm:text-sm text-white placeholder-[#8E8E93] transition-all focus:outline-none shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown/Box */}
            {searchQuery.trim().length >= 2 && (
              <div className="p-4 bg-[#141417] border border-white/10 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                    People Results
                  </h3>
                  {isSearching && (
                    <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">
                      Searching...
                    </span>
                  )}
                </div>

                {searchResults.length === 0 && !isSearching ? (
                  <p className="text-xs text-[#8E8E93] py-2">
                    No listeners found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((userRes) => {
                      const alreadyFriend = isFriend(userRes.id);
                      const pending = isPending(userRes.id);

                      return (
                        <div
                          key={userRes.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#1B1B20] hover:bg-[#222228] border border-white/[0.03] transition-all"
                        >
                          <div
                            onClick={() => navigate(`/user/${encodeURIComponent(userRes.id)}`)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          >
                            <UserAvatar user={userRes} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight hover:text-emerald-400 transition-colors">
                                {userRes.displayName || userRes.username}
                              </p>
                              <p className="text-[10px] text-[#8E8E93] truncate mt-0.5">
                                @{userRes.username}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {alreadyFriend ? (
                              <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold text-[#22C55E] flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Friends</span>
                              </span>
                            ) : pending ? (
                              <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold text-[#8E8E93]">
                                Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendRequest(userRes.id)}
                                className="px-3.5 py-1 rounded-full bg-white hover:bg-gray-200 text-black text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Add Friend</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pending Friend Requests Section */}
            {requests.length > 0 && (
              <div className="p-4 bg-[#141417] border border-purple-500/20 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Friend Requests ({requests.length})</span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#1B1B20] border border-white/5"
                    >
                      <div
                        onClick={() => navigate(`/user/${encodeURIComponent(req.from_user_id || req.id)}`)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <UserAvatar user={req} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                            {req.name || req.username}
                          </p>
                          <p className="text-[10px] text-[#8E8E93] truncate mt-0.5">
                            Wants to connect with you
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="px-2.5 py-1 rounded-full bg-white/10 text-[#8E8E93] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Your Friends List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                  Your Friends ({friends.length})
                </h3>
              </div>

              {friends.length === 0 ? (
                <div className="py-16 text-center text-[#8E8E93] bg-[#141417] border border-white/5 rounded-2xl p-6">
                  <Users className="w-10 h-10 text-[#2C2C2E] mx-auto mb-2" />
                  <p className="text-sm font-bold text-white mb-1">No friends added yet</p>
                  <p className="text-xs text-[#8E8E93] max-w-xs mx-auto mb-4 leading-relaxed">
                    Search for users above using their username to connect and share your music taste!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#141417] hover:bg-[#1A1A1E] border border-white/[0.03] hover:border-white/10 transition-all group"
                    >
                      <div
                        onClick={() => navigate(`/user/${encodeURIComponent(friend.id)}`)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <div className="relative flex-shrink-0">
                          <UserAvatar user={friend} size="md" />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-black" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight group-hover:text-emerald-400 transition-colors">
                            {friend.name || friend.username}
                          </p>
                          <p className="text-[10px] text-[#8E8E93] truncate mt-0.5 flex items-center gap-1">
                            <span className="text-[#22C55E] font-medium">Listening to:</span>
                            <span className="text-white truncate">{friend.song || 'Staytup Mix'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <button
                          onClick={() => handleCreateBlendWithFriend(friend)}
                          className="px-3 py-1 rounded-full bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title={`Start Blend with ${friend.name}`}
                        >
                          <Disc3 className="w-3 h-3" />
                          <span>Blend</span>
                        </button>

                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="w-7 h-7 rounded-lg hover:bg-white/10 hidden group-hover:flex items-center justify-center text-[#8E8E93] hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: LIVE FRIEND MUSIC ACTIVITY & BLEND SPOTLIGHT (Desktop 5 cols)*/}
          {/* ========================================================================= */}
          <div
            className={`space-y-6 lg:col-span-5 ${
              activeMobileTab === 'people' ? 'hidden lg:block' : ''
            }`}
          >
            {/* Blend Quick Action Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-[#141417] border border-purple-500/20 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 text-purple-300 mb-2">
                <Disc3 className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Social Music Blend
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mb-1">
                Listen Better Together
              </h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
                Combine your music preferences into an automatically refreshed daily mix. Select any friend to start!
              </p>
              {friends.length > 0 ? (
                <button
                  onClick={() => handleCreateBlendWithFriend(friends[0])}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer hover:scale-105"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Blend with {friends[0].name}</span>
                </button>
              ) : (
                <p className="text-[11px] text-[#8E8E93]">
                  Add a friend first to unlock shared Blend mixes.
                </p>
              )}
            </div>

            {/* Live Friend Music Activity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Live Friend Activity</span>
                </h3>
                <span className="text-[10px] text-[#8E8E93]">Real-time</span>
              </div>

              {activities.length === 0 ? (
                <div className="py-12 text-center text-[#8E8E93] bg-[#141417] border border-white/5 rounded-2xl p-4">
                  <Music2 className="w-8 h-8 text-[#2C2C2E] mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">No live friend activity</p>
                  <p className="text-[11px] text-[#636366] mt-0.5">
                    Activity appears here when your friends start listening.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-2xl bg-[#141417] hover:bg-[#1A1A1E] border border-white/[0.03] hover:border-white/10 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Real artwork thumbnail with play button overlay */}
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#18181C] flex-shrink-0 shadow-md flex items-center justify-center">
                          {act.artwork ? (
                            <img
                              src={get500x500Image(act.artwork)}
                              alt={act.song}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <div className="absolute inset-0 -z-0 bg-gradient-to-br from-indigo-900 to-purple-800 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {act.song ? act.song.charAt(0) : 'S'}
                          </div>
                          <button
                            onClick={() => playTrack(act.track, [act.track])}
                            className="absolute inset-0 z-10 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                            title="Listen Along"
                          >
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </button>
                        </div>

                        {/* Song & Friend metadata */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-emerald-400 transition-colors">
                            {act.song}
                          </p>
                          <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">
                            {act.artist}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <UserAvatar user={act.user} size="xs" className="w-4 h-4" />
                            <span className="text-[10px] text-[#A1A1AA] truncate">
                              {act.user.name || act.user.username}
                            </span>
                            <span className="text-[9px] text-[#636366]">• {act.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* Listen Along CTA */}
                      <button
                        onClick={() => playTrack(act.track, [act.track])}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white text-[#8E8E93] hover:text-black flex items-center justify-center transition-all ml-2 flex-shrink-0 cursor-pointer"
                        title="Listen Along"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
