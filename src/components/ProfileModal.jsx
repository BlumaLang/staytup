import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import {
  X,
  Edit3,
  Heart,
  Settings,
  Disc3,
  ArrowLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export const ProfileModal = ({ isOpen, onClose, onOpenEdit }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { likedTrackIds } = usePlayer();

  if (!isOpen) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 md:absolute md:inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200 select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center gap-3 bg-black z-10 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold tracking-tight text-white flex-1">Profile</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 no-scrollbar max-w-2xl mx-auto w-full space-y-5 pb-16">

        {/* Identity */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-[#1C1C1E]">
          <div className="relative mb-3">
            <img
              src={user?.avatar || './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg'}
              alt={user?.username || 'User avatar'}
              onError={(e) => {
                e.target.src = './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg';
              }}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#2C2C2E] bg-black"
            />
          </div>

          <h3 className="font-bold text-xl text-white tracking-tight leading-tight px-4">
            {user?.username || user?.displayName || 'Staytup Listener'}
          </h3>

          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="font-semibold text-emerald-400">{likedTrackIds.size} Liked</span>
            <span className="text-[#444448]">•</span>
            <span className="text-[#8E8E93]">Staytup Member</span>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => {
              onClose();
              onOpenEdit?.();
            }}
            className="mt-4 px-5 py-2 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>

        {/* Quick Navigation */}
        <div className="bg-[#111114] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">Quick Links</h4>
          </div>
          <div className="divide-y divide-[#1E1E22]">
            {/* Liked Songs */}
            <button
              onClick={() => goTo('/library?tab=favorites')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Liked Songs</p>
                <span className="text-xs text-[#8E8E93]">{likedTrackIds.size}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>

            {/* Blend */}
            <button
              onClick={() => goTo('/blend')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Disc3 className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Blends</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>

            {/* Full Profile Page */}
            <button
              onClick={() => goTo('/profile')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Edit3 className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">My Profile</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>

            {/* Settings */}
            <button
              onClick={() => goTo('/settings')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Settings</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full py-3 rounded-2xl border border-red-500/25 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Staytup</span>
        </button>

        {/* App Version Footer */}
        <div className="text-center pt-1 pb-2 text-xs text-[#8E8E93]/50 space-y-0.5">
          <p className="font-semibold text-white/60">Staytup Music</p>
          <p>© 2026 Staytup. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
