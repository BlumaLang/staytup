import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, X, Check, ArrowRight } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose }) => {
  const { user, login, MEMOJI_AVATARS } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(user?.avatarIndex || 0);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    try {
      await login(username, selectedAvatarIndex);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
      await login('Music Explorer', Math.floor(Math.random() * MEMOJI_AVATARS.length));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-all">
      <div className="w-full sm:max-w-md bg-[#121212] border border-[#2C2C2E] rounded-t-3xl sm:rounded-2xl pt-4 sm:pt-5 pb-6 px-6 text-white animate-in slide-in-from-bottom duration-300">
        {/* Header — Matching Lyrics Modal Spacing */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1C1C1E] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center font-bold text-white text-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Edit Profile</h3>
              <p className="text-xs text-[#8E8E93]">Personalize your username & avatar</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Memoji Avatar Selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">
            Choose Your Avatar
          </label>
          <div className="grid grid-cols-5 gap-2.5">
            {MEMOJI_AVATARS.map((avatar, idx) => {
              const isSelected = selectedAvatarIndex === idx;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedAvatarIndex(idx)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-white scale-105'
                      : 'border-[#2C2C2E] hover:border-[#8E8E93]'
                  }`}
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-3 h-3 text-black stroke-[3]" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              Listener Name / Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name or handle"
                className="w-full pl-10 pr-4 py-3 bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#8E8E93] text-sm focus:outline-none focus:border-white transition-colors"
                maxLength={30}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 active:scale-[0.98] text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Save Profile & Continue</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleGuest}
              className="text-xs text-[#8E8E93] hover:text-white transition-colors underline"
            >
              Continue as Guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
