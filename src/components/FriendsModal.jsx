import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Users,
  X,
  Music2,
  Play,
  UserPlus,
  Check,
  Search,
  UserCheck,
  Share2,
  ArrowLeft,
  Music,
  Send,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export const FriendsModal = ({ isOpen, onClose }) => {
  const { playTrack } = usePlayer();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [blendRequests, setBlendRequests] = useState([]);
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
    if (isOpen && user?.id) {
      setIsLoading(true);
      Promise.all([fetchFriends(), fetchRequests()]).finally(() => {
        setTimeout(() => setIsLoading(false), 240);
      });
    }
  }, [isOpen, user?.id, fetchFriends, fetchRequests]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const t = setTimeout(() => setIsLoading(false), 240);
      return () => clearTimeout(t);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!searchFilter || searchFilter.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.searchUsers(searchFilter);
        const filtered = (data.users || []).filter(u => u.id !== user?.id);
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

  if (!isOpen) return null;

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
      setSentRequests(prev => new Set([...prev, toUserId]));
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  const handleAcceptBlend = () => {
    setAcceptedBlend(true);
  };

  const filteredFriends = friends.filter(f =>
    (f.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (f.song || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col bg-black text-white animate-in slide-in-from-bottom duration-300 select-none overflow-hidden">
      <div className="px-3.5 sm:px-6 pt-3 sm:pt-4 pb-2.5 sm:pb-3 border-b border-[#1C1C1E] bg-black z-10 flex-shrink-0">
        <div className="w-full max-w-2xl mx-auto flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#141416] hover:bg-[#1C1C1E] border border-[#26262A] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-3.5 sm:left-4 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search friends or find users..."
              className="w-full pl-10 sm:pl-11 pr-10 py-2 sm:py-2.5 bg-[#141416] border border-[#26262A] focus:border-white/40 focus:bg-[#18181C] rounded-full text-white placeholder-[#8E8E93] text-xs sm:text-sm placeholder:text-xs focus:outline-none transition-all shadow-inner"
            />
            {searchFilter && (
              <button
                onClick={() => { setSearchFilter(''); setSearchResults([]); }}
                className="absolute right-3 text-[#8E8E93] hover:text-white p-1 cursor-pointer"
                aria-label="Clear text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 sm:px-8 pt-2.5 pb-1 bg-black overflow-x-auto no-scrollbar flex-shrink-0 max-w-2xl mx-auto w-full">
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
              className={`flex items-center px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer relative ${
                isActive
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-[#18181A] hover:bg-[#222226] text-[#8E8E93] hover:text-white border border-[#28282C]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-black text-white' : 'bg-[#2563EB] text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-5 sm:px-8 pt-2 pb-24 no-scrollbar max-w-2xl mx-auto w-full space-y-4">
        {isLoading ? (
          <div className="space-y-3 animate-in fade-in duration-150">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-3.5 p-3.5 bg-[#121214] border border-[#1E1E22] rounded-2xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#1C1C20] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[#24242A] rounded w-2/5" />
                  <div className="h-3 bg-[#1C1C20] rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'friends' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="divide-y divide-[#1C1C1E]/60 overflow-y-auto no-scrollbar flex-1">
                  {filteredFriends.length === 0 ? (
                    <div className="py-14 text-center text-[#8E8E93] text-xs">
                      No friends found. Check friend requests or use "Find Friends" to add people.
                    </div>
                  ) : (
                    filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between py-3 px-1 hover:bg-[#121212] rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-full object-cover bg-black"
                            />
                            {friend.isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2563EB] border-2 border-black" />
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1">{friend.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Music2 className="w-3 h-3 text-[#2563EB] flex-shrink-0" />
                              <p className="text-xs text-[#8E8E93] line-clamp-1">
                                <span className="text-white font-medium">{friend.song}</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] font-mono text-[#8E8E93] hidden sm:inline">
                            {friend.status}
                          </span>
                          <button
                            onClick={() => {
                              playTrack({
                                id: friend.id,
                                videoId: friend.id,
                                title: friend.song,
                                artist: friend.artist,
                                image: friend.avatar,
                              });
                              onClose();
                            }}
                            className="w-8 h-8 rounded-full text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] flex items-center justify-center transition-all"
                            title="Listen Along"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="divide-y divide-[#1C1C1E]/60 overflow-y-auto no-scrollbar flex-1">
                {requests.length === 0 ? (
                  <div className="py-16 text-center text-[#8E8E93] space-y-2">
                    <UserCheck className="w-10 h-10 mx-auto text-[#2C2C2E]" />
                    <p className="text-sm font-semibold text-white">No pending requests</p>
                    <p className="text-xs">You're all caught up! New requests will show up here.</p>
                  </div>
                ) : (
                  requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between py-3.5 px-1 hover:bg-[#121212] rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={req.avatar}
                          alt={req.name}
                          className="w-12 h-12 rounded-full object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0 text-left">
                          <p className="font-semibold text-sm text-white line-clamp-1">{req.name}</p>
                          <p className="text-xs text-[#8E8E93] mt-0.5">Sent you a friend request</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAcceptFriend(req)}
                          className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-gray-200 transition-all active:scale-95"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineFriend(req.id)}
                          className="px-3 py-1.5 rounded-full bg-[#1C1C1E] text-[#8E8E93] hover:text-white font-semibold text-xs transition-all"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'find' && (
              <div className="space-y-4">
                {isSearching && (
                  <div className="text-center py-4">
                    <p className="text-xs text-[#8E8E93]">Searching users...</p>
                  </div>
                )}
                
                {!isSearching && searchFilter.length >= 2 && searchResults.length === 0 && (
                  <div className="py-16 text-center text-[#8E8E93] space-y-2">
                    <Users className="w-10 h-10 mx-auto text-[#2C2C2E]" />
                    <p className="text-sm font-semibold text-white">No users found</p>
                    <p className="text-xs">Try searching with a different name.</p>
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="divide-y divide-[#1C1C1E]/60">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between py-3.5 px-1 hover:bg-[#121212] rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={u.avatar}
                            alt={u.username}
                            className="w-12 h-12 rounded-full object-cover bg-black flex-shrink-0"
                          />
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm text-white line-clamp-1">{u.displayName || u.username}</p>
                            <p className="text-xs text-[#8E8E93] mt-0.5">@{u.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sentRequests.has(u.id) ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-[#1C1C1E] text-[#8E8E93] font-semibold text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" /> Sent
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(u.id)}
                              className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-1"
                            >
                              <UserPlus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchFilter.length < 2 && !isSearching && (
                  <div className="py-16 text-center text-[#8E8E93] space-y-2">
                    <Search className="w-10 h-10 mx-auto text-[#2C2C2E]" />
                    <p className="text-sm font-semibold text-white">Find friends on Staytup</p>
                    <p className="text-xs">Type at least 2 characters to search for users.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'blend' && (
              <div className="space-y-5 pt-1">
                <div className="bg-[#111114] border border-[#1E1E22] rounded-2xl p-4 flex flex-col gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white">Daily Blend</h4>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">Mix your taste with a friend's — updated daily</p>
                  </div>
                  <button
                    type="button"
                    className="w-full py-2.5 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Invite Friend to Blend</span>
                  </button>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93] mb-2 px-0.5">
                    Blend Requests
                  </h5>

                  {acceptedBlend ? (
                    <p className="text-xs text-[#8E8E93] py-2 px-0.5">
                      Blend created! Find your blended mixtape in Library → Playlists.
                    </p>
                  ) : blendRequests.length > 0 ? (
                    <div className="divide-y divide-[#1C1C1E]/60">
                      {blendRequests.map((b) => (
                        <div
                          key={b.id}
                          className="py-3 px-0.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={b.avatar}
                              alt={b.friendName}
                              className="w-10 h-10 rounded-full object-cover bg-black flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-white line-clamp-1">{b.friendName}</p>
                              <p className="text-xs text-[#8E8E93] mt-0.5">{b.tasteMatch} taste match</p>
                            </div>
                          </div>
                          <button
                            onClick={handleAcceptBlend}
                            className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#8E8E93] py-3 px-0.5">
                      No pending blend invites. Invite a friend above to start a blend.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
