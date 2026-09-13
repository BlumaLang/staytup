import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import {
  User,
  X,
  Edit3,
  Wifi,
  LogOut,
  Heart,
  Users,
  Shield,
  FileText,
  Instagram,
  Mail,
  Code2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export const ProfileModal = ({ isOpen, onClose, onOpenEdit }) => {
  const { user, logout } = useAuth();
  const { likedTrackIds } = usePlayer();

  // Settings states
  const [streamWifiOnly, setStreamWifiOnly] = useState(() => localStorage.getItem('staytup_setting_wifi') === 'true');
  const [socialListening, setSocialListening] = useState(() => localStorage.getItem('staytup_setting_social') !== 'false');
  const [crossfade, setCrossfade] = useState(() => localStorage.getItem('staytup_setting_crossfade') || '3');
  const [activeSubModal, setActiveSubModal] = useState(null); // 'terms' | 'privacy'

  if (!isOpen) return null;

  const handleWifiToggle = () => {
    const next = !streamWifiOnly;
    setStreamWifiOnly(next);
    localStorage.setItem('staytup_setting_wifi', String(next));
  };

  const handleSocialToggle = () => {
    const next = !socialListening;
    setSocialListening(next);
    localStorage.setItem('staytup_setting_social', String(next));
  };

  const handleCrossfadeChange = (e) => {
    setCrossfade(e.target.value);
    localStorage.setItem('staytup_setting_crossfade', e.target.value);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200 select-none overflow-hidden">
      {/* Header — Matching Library Modal Header */}
      <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center justify-between bg-black z-10 flex-shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-white">Your Profile & Settings</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Full-Screen Scrollable Content — Cardless, Clean, Modern Layout */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 no-scrollbar max-w-2xl mx-auto w-full space-y-7 pb-16">
        {/* Profile Identity Header — Cardless, Clean & Elegant */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-[#1C1C1E]">
          <div className="relative mb-3">
            <img
              src={user?.avatar || './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg'}
              alt={user?.username}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#2C2C2E] bg-black"
            />
          </div>

          <h3 className="font-bold text-xl sm:text-2xl text-white tracking-tight">
            {user?.username || 'Music Explorer'}
          </h3>

          <div className="flex items-center gap-2 mt-1 text-xs text-[#8E8E93]">
            <span className="text-white font-medium">{likedTrackIds.size} Liked songs</span>
            <span>•</span>
            <span className="text-[#8E8E93]">Free Member</span>
            {user?.email && (
              <>
                <span>•</span>
                <span className="truncate max-w-[180px]">{user.email}</span>
              </>
            )}
          </div>

          {/* Edit Profile Action Pill */}
          <button
            onClick={() => {
              onClose();
              onOpenEdit?.();
            }}
            className="mt-4 px-5 py-2 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Playback Settings — Cardless Row List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-1 px-1">
            Playback Preferences
          </h4>
          <div className="divide-y divide-[#1C1C1E]">
            {/* Crossfade */}
            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Crossfade Songs</p>
                <p className="text-xs text-[#8E8E93] mt-0.5">Seamless transitions between tracks ({crossfade}s)</p>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                value={crossfade}
                onChange={handleCrossfadeChange}
                className="w-28 accent-white cursor-pointer"
              />
            </div>

            {/* Stream over Wi-Fi only */}
            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="w-4 h-4 text-[#8E8E93]" />
                <div>
                  <p className="text-sm font-medium text-white">Stream over Wi-Fi only</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Save mobile data while on the move</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleWifiToggle}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                  streamWifiOnly ? 'bg-white' : 'bg-[#2C2C2E]'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                    streamWifiOnly ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Social & Friends Settings — Cardless Row List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-1 px-1">
            Social & Friends
          </h4>
          <div className="divide-y divide-[#1C1C1E]">
            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#8E8E93]" />
                <div>
                  <p className="text-sm font-medium text-white">Share Listening Activity</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Allow friends to see what you're listening to</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSocialToggle}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                  socialListening ? 'bg-white' : 'bg-[#2C2C2E]'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                    socialListening ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>

            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Blend Playlists</p>
                <p className="text-xs text-[#8E8E93] mt-0.5">Allow mutual friends to invite you to Blend sessions</p>
              </div>
              <span className="text-xs text-[#8E8E93] font-semibold">Enabled</span>
            </div>
          </div>
        </div>

        {/* Developer & Contact Section — Cardless Row List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-1 px-1">
            Developer & Official Contact
          </h4>
          <div className="divide-y divide-[#1C1C1E]">
            {/* Developer */}
            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-white flex-shrink-0">
                  <Code2 className="w-4 h-4 text-[#8E8E93]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Developed by</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Lead Creator & Engineer</p>
                </div>
              </div>
              <a
                href="https://instagram.com/animikh.04"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-medium text-white hover:text-[#8E8E93] transition-colors flex items-center gap-1.5"
              >
                <span>@animikh.04</span>
                <ExternalLink className="w-3 h-3 text-[#8E8E93]" />
              </a>
            </div>

            {/* Official Instagram */}
            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-white flex-shrink-0">
                  <Instagram className="w-4 h-4 text-[#8E8E93]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Official Instagram</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Staytup community & updates</p>
                </div>
              </div>
              <a
                href="https://instagram.com/staytup.india"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-medium text-white hover:text-[#8E8E93] transition-colors flex items-center gap-1.5"
              >
                <span>@staytup.india</span>
                <ExternalLink className="w-3 h-3 text-[#8E8E93]" />
              </a>
            </div>

            {/* Official Email */}
            <div className="py-3.5 px-1 sm:px-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-white flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#8E8E93]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Support & Inquiries</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Direct email correspondence</p>
                </div>
              </div>
              <a
                href="mailto:staytup.india@gmail.com"
                className="text-xs font-mono text-[#8E8E93] hover:text-white transition-colors"
              >
                staytup.india@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Legal & Terms Section — Cardless Row List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-1 px-1">
            Legal & Policies
          </h4>
          <div className="divide-y divide-[#1C1C1E]">
            <button
              type="button"
              onClick={() => setActiveSubModal('terms')}
              className="w-full py-3.5 px-1 sm:px-2 flex items-center justify-between hover:bg-[#121212]/60 rounded-xl transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <div>
                  <p className="text-sm font-medium text-white">Terms & Conditions</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Usage terms, rights, and streaming policy</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => setActiveSubModal('privacy')}
              className="w-full py-3.5 px-1 sm:px-2 flex items-center justify-between hover:bg-[#121212]/60 rounded-xl transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <div>
                  <p className="text-sm font-medium text-white">Privacy Policy</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">How your music taste and profile data are protected</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Logout Action */}
        <div className="pt-2">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-3 rounded-xl border border-red-500/25 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Staytup</span>
          </button>
        </div>

        {/* App Version Branding */}
        <div className="text-center pt-2 text-xs text-[#8E8E93]/60 space-y-1">
          <p className="font-semibold text-white/80">Staytup Music Player v1.0.0</p>
          <p>© 2026 Staytup. All rights reserved.</p>
        </div>
      </div>

      {/* Submodal for Terms & Conditions and Privacy Policy */}
      {activeSubModal && (
        <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col animate-in fade-in duration-200">
          <div className="px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-bold text-white">
              {activeSubModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
            </h3>
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full text-sm text-[#8E8E93] leading-relaxed no-scrollbar">
            {activeSubModal === 'terms' ? (
              <>
                <h4 className="font-bold text-base text-white">1. Acceptance of Terms</h4>
                <p>
                  By accessing and using Staytup Music ("Staytup"), you agree to abide by these Terms and Conditions. Staytup delivers high-definition streaming playback with non-stop vertical feed navigation.
                </p>

                <h4 className="font-bold text-base text-white">2. Content & Licensing</h4>
                <p>
                  All musical compositions, sound recordings, lyrics, album artworks, and metadata served via Staytup are made accessible for personal, non-commercial streaming purposes only. All intellectual property remains the property of their respective copyright holders and artists.
                </p>

                <h4 className="font-bold text-base text-white">3. User Conduct & Social Blends</h4>
                <p>
                  Users agree not to misuse social features, Blend collaborative sessions, or listening activity sharing. Any abusive behavior or copyright infringement attempts will result in account restriction.
                </p>

                <h4 className="font-bold text-base text-white">4. Modifications</h4>
                <p>
                  Staytup reserves the right to enhance or alter streaming features, algorithms, or terms at any time. Continued usage constitutes agreement to updated policies.
                </p>
              </>
            ) : (
              <>
                <h4 className="font-bold text-base text-white">1. Data We Collect</h4>
                <p>
                  Staytup collects minimal information strictly necessary to provide an exceptional listening experience: your chosen avatar, handle, liked tracks, listening history for algorithmic sound feeds, and optional contact numbers for friend synchronization.
                </p>

                <h4 className="font-bold text-base text-white">2. Audio Streaming & Storage</h4>
                <p>
                  Playback state and audio streams are cached locally in your browser memory to enable instantaneous track transitions without buffering. We do not sell or monetize personal listening data.
                </p>

                <h4 className="font-bold text-base text-white">3. Social Visibility</h4>
                <p>
                  Your current song activity and Blend playlists are only shared with mutual friends if "Share Listening Activity" is kept enabled in your settings. You can disable this anytime with a single tap.
                </p>

                <h4 className="font-bold text-base text-white">4. Contact Us</h4>
                <p>
                  For privacy inquiries or account data removal requests, contact the developer at <span className="text-white font-mono">staytup.india@gmail.com</span> or via Instagram <span className="text-white font-mono">@staytup.india</span>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
