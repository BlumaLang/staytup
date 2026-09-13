import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Users,
  X,
  Music2,
  Play,
  UserPlus,
  Sparkles,
  Check,
  Search,
  UserCheck,
  Share2
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const FriendsModal = ({ isOpen, onClose }) => {
  const { playTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'blend'
  const [friends, setFriends] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('staytup_friends') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [requests, setRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('staytup_friend_requests') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [blendRequests, setBlendRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('staytup_blend_requests') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [acceptedBlend, setAcceptedBlend] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const handleAcceptFriend = (req) => {
    const updatedRequests = requests.filter(r => r.id !== req.id);
    const updatedFriends = [
      ...friends,
      {
        id: req.id,
        name: req.name,
        avatar: req.avatar,
        status: 'Online',
        song: 'Listening to Staytup',
        artist: 'Staytup Flow',
        isOnline: true,
      },
    ];
    setRequests(updatedRequests);
    setFriends(updatedFriends);
    try {
      localStorage.setItem('staytup_friend_requests', JSON.stringify(updatedRequests));
      localStorage.setItem('staytup_friends', JSON.stringify(updatedFriends));
    } catch (e) {}
  };

  const handleDeclineFriend = (id) => {
    const updatedRequests = requests.filter(r => r.id !== id);
    setRequests(updatedRequests);
    try {
      localStorage.setItem('staytup_friend_requests', JSON.stringify(updatedRequests));
    } catch (e) {}
  };

  const handleAcceptBlend = () => {
    setAcceptedBlend(true);
  };

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.song.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col bg-black text-white animate-in slide-in-from-bottom duration-300 select-none overflow-hidden">
      {/* Top Header — Matching Library Modal Header */}
      <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center justify-between bg-black z-10 flex-shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-white">Friends & Social</h2>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs Bar — Matching Library Modal */}
      <div className="flex border-b border-[#1C1C1E] px-6 bg-black overflow-x-auto no-scrollbar flex-shrink-0">
        {[
          { id: 'friends', label: `Friends (${friends.length})`, icon: Users },
          { id: 'requests', label: 'Requests', icon: UserPlus, badge: requests.length },
          { id: 'blend', label: 'Daily Blend', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors relative ${
                isActive
                  ? 'border-white text-white font-bold'
                  : 'border-transparent text-[#8E8E93] hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8E8E93]'}`} />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-white text-black' : 'bg-[#2563EB] text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Fullscreen Scrollable Content — Clean Cardless Layout */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 no-scrollbar max-w-2xl mx-auto w-full pb-24 space-y-6">
        {/* Tab 1: Friends Activity List */}
        {activeTab === 'friends' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Quick search friends */}
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search friends or what they're playing..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#121212] border border-[#2C2C2E] rounded-full text-xs text-white placeholder-[#8E8E93] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="divide-y divide-[#1C1C1E]/60 overflow-y-auto no-scrollbar flex-1">
              {filteredFriends.length === 0 ? (
                <div className="py-14 text-center text-[#8E8E93] text-xs">
                  No friends found. Check friend requests or invite your contacts.
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
                            <span className="text-white font-medium">{friend.song}</span> • {friend.artist}
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

        {/* Tab 2: Friend Requests */}
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
                      <p className="text-xs text-[#8E8E93] mt-0.5">{req.mutual}</p>
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

        {/* Tab 3: Blend & Blend Requests */}
        {activeTab === 'blend' && (
          <div className="overflow-y-auto no-scrollbar flex-1 space-y-6">
            {/* Blend Promo — Clean Cardless Header */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Create a Blend</h4>
                  <p className="text-xs text-[#8E8E93]">A shared playlist combining your tastes</p>
                </div>
              </div>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Blend automatically updates daily with tracks both you and your friend love, plus mutual recommendations.
              </p>
              <button
                type="button"
                className="w-full py-2.5 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite a Friend to Blend</span>
              </button>
            </div>

            {/* Blend Requests */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-2 px-1">
                Blend Requests
              </h5>
              {acceptedBlend ? (
                <div className="py-6 text-center space-y-1">
                  <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-[#2563EB]" />
                    <span>Blend Playlist Created!</span>
                  </p>
                  <p className="text-xs text-[#8E8E93]">
                    "Diya & You Blend" is now ready in your Library under Playlists.
                  </p>
                </div>
              ) : blendRequests.length > 0 ? (
                <div className="divide-y divide-[#1C1C1E]/60">
                  {blendRequests.map((b) => (
                    <div
                      key={b.id}
                      className="py-3.5 px-1 flex items-center justify-between hover:bg-[#121212] rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={b.avatar}
                          alt={b.friendName}
                          className="w-12 h-12 rounded-full object-cover bg-black"
                        />
                        <div>
                          <p className="font-semibold text-sm text-white">{b.friendName}</p>
                          <p className="text-xs text-[#8E8E93]">{b.tasteMatch} Taste Match</p>
                        </div>
                      </div>
                      <button
                        onClick={handleAcceptBlend}
                        className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200 transition-all active:scale-95"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8E8E93] px-1">No pending Blend invites.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
