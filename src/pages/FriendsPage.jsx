import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Music2,
  Play,
  UserPlus,
  Sparkles,
  Check,
  Search,
  UserCheck,
  X,
  Share2,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function FriendsPage() {
  const { playTrack } = usePlayer();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [acceptedBlend, setAcceptedBlend] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.getFriends();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    }
  }, [user?.id]);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await api.getFriendRequests();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      Promise.all([fetchFriends(), fetchRequests()]).finally(() => {
        setTimeout(() => setIsLoading(false), 200);
      });
    }
  }, [user?.id, fetchFriends, fetchRequests]);

  useEffect(() => {
    if (!searchFilter || searchFilter.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.searchUsers(searchFilter);
        const filtered = (data.users || []).filter((u) => u.id !== user?.id);
        setSearchResults(filtered);
      } catch (err) {
        console.error('Failed to search users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchFilter, user?.id]);

  const handleAcceptFriend = async (req) => {
    try {
      await api.acceptFriendRequest(req.id);
      await Promise.all([fetchFriends(), fetchRequests()]);
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    }
  };

  const handleDeclineFriend = async (id) => {
    try {
      await api.declineFriendRequest(id);
      await fetchRequests();
    } catch (err) {
      console.error('Failed to decline friend request:', err);
    }
  };

  const handleSendRequest = async (toUserId) => {
    try {
      await api.sendFriendRequest(toUserId);
      setSentRequests((prev) => new Set([...prev, toUserId]));
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      (f.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (f.song || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 pt-5 pb-3 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Friends &amp; Social</h1>
            <p className="text-xs text-[#8E8E93] mt-0.5">Listen together and see what friends are playing</p>
          </div>

          <div className="relative flex items-center w-full sm:w-72">
            <Search className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter friends or search users..."
              className="w-full pl-10 pr-9 py-2 bg-[#141416] border border-[#26262A] focus:border-white/40 rounded-full text-white placeholder-[#8E8E93] text-xs focus:outline-none"
            />
            {searchFilter && (
              <button
                onClick={() => {
                  setSearchFilter('');
                  setSearchResults([]);
                }}
                className="absolute right-3 text-[#8E8E93] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 w-full">
          {[
            { id: 'friends', label: `Friends (${friends.length})` },
            { id: 'requests', label: 'Requests', badge: requests.length },
            { id: 'find', label: 'Find Friends' },
            { id: 'blend', label: 'Daily Blend' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'bg-[#18181A] hover:bg-[#222226] text-[#8E8E93] hover:text-white border border-[#28282C]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-black text-white' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Content */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#8E8E93]">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Loading friend activity...</p>
          </div>
        ) : (
          <>
            {/* TAB: FRIENDS */}
            {activeTab === 'friends' && (
              <div className="space-y-4">
                {filteredFriends.length === 0 ? (
                  <div className="py-16 text-center text-[#8E8E93]">
                    <Users className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No friends yet</h3>
                    <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
                      Search for users in the "Find Friends" tab to start listening together!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-3.5 bg-[#121214] hover:bg-[#18181C] border border-[#222226] hover:border-white/20 rounded-2xl transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-full object-cover bg-black"
                            />
                            {friend.isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-black" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white line-clamp-1">{friend.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Music2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                              <p className="text-xs text-[#8E8E93] line-clamp-1">
                                Listening to <span className="text-white font-medium">{friend.song}</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {friend.track && (
                          <button
                            onClick={() => playTrack(friend.track, [friend.track])}
                            className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white text-white group-hover:text-black flex items-center justify-center transition-colors flex-shrink-0"
                            title="Listen Along"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: REQUESTS */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="py-16 text-center text-[#8E8E93]">
                    <UserCheck className="w-12 h-12 text-[#2C2C2E] mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No pending friend requests</h3>
                    <p className="text-xs text-[#8E8E93]">Incoming requests will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3.5 bg-[#121214] border border-[#222226] rounded-2xl"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={req.avatar}
                            alt={req.name}
                            className="w-11 h-11 rounded-full object-cover bg-black flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white">{req.name}</p>
                            <p className="text-xs text-[#8E8E93]">{req.username || 'Listener'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptFriend(req)}
                            className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineFriend(req.id)}
                            className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: FIND FRIENDS */}
            {activeTab === 'find' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Discover Staytup Listeners</h3>
                  <p className="text-xs text-[#8E8E93]">Type a username in the search bar above to find friends</p>
                </div>

                {isSearching && (
                  <div className="py-8 text-center text-[#8E8E93] text-xs">Searching users...</div>
                )}

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {searchResults.map((userResult) => {
                      const isSent = sentRequests.has(userResult.id);
                      return (
                        <div
                          key={userResult.id}
                          className="flex items-center justify-between p-3.5 bg-[#121214] border border-[#222226] rounded-2xl"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={userResult.avatar}
                              alt={userResult.name}
                              className="w-11 h-11 rounded-full object-cover bg-black flex-shrink-0"
                            />
                            <div>
                              <p className="font-bold text-sm text-white">{userResult.name}</p>
                              <p className="text-xs text-[#8E8E93]">{userResult.username}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSendRequest(userResult.id)}
                            disabled={isSent}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                              isSent
                                ? 'bg-white/10 text-[#8E8E93]'
                                : 'bg-white text-black hover:bg-gray-200 cursor-pointer'
                            }`}
                          >
                            {isSent ? 'Sent' : 'Add Friend'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : searchFilter && !isSearching ? (
                  <div className="py-12 text-center text-[#8E8E93] text-xs">
                    No users found matching &ldquo;{searchFilter}&rdquo;
                  </div>
                ) : null}
              </div>
            )}

            {/* TAB: DAILY BLEND */}
            {activeTab === 'blend' && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/40 via-[#141418] to-black border border-purple-500/20 space-y-4 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center mx-auto text-purple-300">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">Friend Blend</h3>
                  <p className="text-xs text-[#8E8E93] mt-1">
                    A personalized daily shared mix combining your music taste with your friends' favorites.
                  </p>
                </div>
                <button
                  onClick={() => setAcceptedBlend(true)}
                  className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  {acceptedBlend ? 'Blend Generated!' : 'Create Blend Mix'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
