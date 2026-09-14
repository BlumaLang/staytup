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
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

export const ProfileModal = ({ isOpen, onClose, onOpenEdit }) => {
  const { user, logout } = useAuth();
  const { likedTrackIds } = usePlayer();

  // Settings states
  const [streamWifiOnly, setStreamWifiOnly] = useState(() => localStorage.getItem('staytup_setting_wifi') === 'true');
  const [socialListening, setSocialListening] = useState(() => localStorage.getItem('staytup_setting_social') !== 'false');
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

  return (
    <div className="fixed inset-0 md:absolute md:inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200 select-none overflow-hidden">
      {/* Header — Close button on left */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center gap-3 bg-black z-10 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold tracking-tight text-white flex-1">Profile &amp; Settings</h2>
      </div>

      {/* Main Full-Screen Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 no-scrollbar max-w-2xl mx-auto w-full space-y-5 pb-16">

        {/* Profile Identity Header */}
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

          {/* Stats row — no wrapping */}
          <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap justify-center">
            <span className="font-semibold text-white">{likedTrackIds.size} Liked</span>
            <span className="text-[#444448]">•</span>
            <span className="text-[#8E8E93]">Free Member</span>
          </div>

          {/* Email on its own line — never truncates awkwardly */}
          {user?.email && (
            <p className="text-[11px] text-[#8E8E93] mt-1 break-all px-4 max-w-xs">{user.email}</p>
          )}

          {/* Edit Profile Button */}
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

        {/* Playback Preferences */}
        <div className="bg-[#111114] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">Playback</h4>
          </div>
          <div className="divide-y divide-[#1E1E22]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Wifi className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Wi-Fi only streaming</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-snug">Save mobile data while on the move</p>
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

        {/* Social & Friends */}
        <div className="bg-[#111114] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">Social &amp; Friends</h4>
          </div>
          <div className="divide-y divide-[#1E1E22]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Users className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Share Listening Activity</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-snug">Let friends see what you're playing</p>
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

            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Heart className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Blend Playlists</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5 leading-snug">Allow friends to invite you to Blends</p>
                </div>
              </div>
              <span className="text-xs text-[#8E8E93] font-semibold flex-shrink-0">Enabled</span>
            </div>
          </div>
        </div>

        {/* Developer & Contact */}
        <div className="bg-[#111114] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">Developer &amp; Contact</h4>
          </div>
          <div className="divide-y divide-[#1E1E22]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Code2 className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Developer</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5">Lead Creator &amp; Engineer</p>
                </div>
              </div>
              <a
                href="https://instagram.com/animikh.04"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#8E8E93] hover:text-white transition-colors flex items-center gap-1 flex-shrink-0"
              >
                @animikh.04
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Instagram className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Official Instagram</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5">Community &amp; updates</p>
                </div>
              </div>
              <a
                href="https://instagram.com/staytup.india"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#8E8E93] hover:text-white transition-colors flex items-center gap-1 flex-shrink-0"
              >
                @staytup.india
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Support &amp; Inquiries</p>
                </div>
              </div>
              <a
                href="mailto:staytup.india@gmail.com"
                className="text-[11px] font-medium text-[#8E8E93] hover:text-white transition-colors flex-shrink-0"
              >
                staytup.india@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Legal & Policies */}
        <div className="bg-[#111114] border border-[#1E1E22] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">Legal &amp; Policies</h4>
          </div>
          <div className="divide-y divide-[#1E1E22]">
            <button
              type="button"
              onClick={() => setActiveSubModal('terms')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Terms &amp; Conditions</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => setActiveSubModal('privacy')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
                <p className="text-sm font-medium text-white">Privacy Policy</p>
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

        {/* App Version */}
        <div className="text-center pt-1 pb-2 text-xs text-[#8E8E93]/60 space-y-0.5">
          <p className="font-semibold text-white/80">Staytup Music v1.0.0</p>
          <p>© 2026 Staytup. All rights reserved.</p>
        </div>
      </div>

      {/* Submodal for Terms & Conditions and Privacy Policy */}
      {activeSubModal && (
        <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col animate-in fade-in duration-200">
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#1C1C1E] flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-8 h-8 rounded-full bg-[#121212] hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white flex-shrink-0 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white flex-1">
              {activeSubModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
            </h3>
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
                  For privacy inquiries or account data removal requests, contact the developer at <span className="text-white font-semibold">staytup.india@gmail.com</span> or via Instagram <span className="text-white font-semibold">@staytup.india</span>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
