import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import {
  User,
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
  ExternalLink,
  X,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { LoginModal } from '../components/LoginModal';
import { updateService, CURRENT_BUILD } from '../services/updateService';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { likedTrackIds } = usePlayer();

  const [streamWifiOnly, setStreamWifiOnly] = useState(
    () => localStorage.getItem('staytup_setting_wifi') === 'true'
  );
  const [socialListening, setSocialListening] = useState(
    () => localStorage.getItem('staytup_setting_social') !== 'false'
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState(null); // 'terms' | 'privacy'
  const [updateStatus, setUpdateStatus] = useState(null); // 'checking' | 'available' | 'latest' | null
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('checking');
    try {
      const result = await updateService.checkForUpdates();
      if (result && result.hasUpdate) {
        setUpdateStatus('available');
      } else {
        setUpdateStatus('latest');
        setTimeout(() => setUpdateStatus(null), 4000);
      }
    } catch (e) {
      setUpdateStatus('latest');
      setTimeout(() => setUpdateStatus(null), 3000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

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
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-4 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E]">
        <div className="w-full">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Profile &amp; Settings</h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Profile Identity Card (Left side on desktop) */}
          <div className="lg:col-span-5 bg-[#121214] border border-[#222226] rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center h-fit shadow-xl">
            <div className="relative mb-4">
              <img
                src={user?.avatar || './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg'}
                alt={user?.username || 'User avatar'}
                onError={(e) => {
                  e.target.src = './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg';
                }}
                className="w-28 h-28 rounded-full object-cover border-2 border-white/20 bg-black shadow-2xl"
              />
            </div>

            <h3 className="font-extrabold text-2xl text-white tracking-tight leading-tight px-2">
              {user?.username || user?.displayName || 'Staytup Listener'}
            </h3>

            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap justify-center">
              <span className="font-semibold text-[#22C55E]">{likedTrackIds.size} Liked Tracks</span>
              <span className="text-[#444448]">•</span>
              <span className="text-[#8E8E93]">Staytup Member</span>
            </div>

            {user?.email && (
              <p className="text-xs text-[#8E8E93] mt-1.5 break-all px-2 max-w-xs">{user.email}</p>
            )}

            <button
              onClick={() => setShowEditModal(true)}
              className="mt-6 w-full py-2.5 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs inline-flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Right Column: Settings Sections */}
          <div className="lg:col-span-7 space-y-5">

        {/* Playback Preferences */}
        <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
              Playback
            </h4>
          </div>
          <div className="divide-y divide-[#222226]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Wifi className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Wi-Fi only streaming</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Save mobile data while on the move</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleWifiToggle}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
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
        <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
              Social
            </h4>
          </div>
          <div className="divide-y divide-[#222226]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Users className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Share Listening Activity</p>
                  <p className="text-xs text-[#8E8E93] mt-0.5">Let friends see what you are playing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSocialToggle}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
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
          </div>
        </div>

        {/* App Version & Updates */}
        <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
              App Version &amp; Updates
            </h4>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              v{CURRENT_BUILD.version}
            </span>
          </div>
          <div className="divide-y divide-[#222226]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Build Release</p>
                  <p className="text-xs text-[#8E8E93] font-mono truncate max-w-[170px] sm:max-w-xs">
                    {CURRENT_BUILD.buildId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={
                  updateStatus === 'available'
                    ? () => updateService.applyUpdate()
                    : handleCheckUpdate
                }
                disabled={isCheckingUpdate}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                  updateStatus === 'available'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                    : updateStatus === 'latest'
                    ? 'bg-white/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-[#26262A] active:scale-95'
                }`}
              >
                {isCheckingUpdate ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : updateStatus === 'available' ? (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Update Now</span>
                  </>
                ) : updateStatus === 'latest' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Up to Date</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Check for Updates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Developer & Contact */}
        <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
              Developer &amp; Contact
            </h4>
          </div>
          <div className="divide-y divide-[#222226]">
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Code2 className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Developer</p>
                  <p className="text-xs text-[#8E8E93]">Lead Creator &amp; Engineer</p>
                </div>
              </div>
              <a
                href="https://instagram.com/animikh.04"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-medium text-[#8E8E93] hover:text-white transition-colors flex items-center gap-1"
              >
                @animikh.04
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Instagram className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Official Instagram</p>
                  <p className="text-xs text-[#8E8E93]">Community &amp; updates</p>
                </div>
              </div>
              <a
                href="https://instagram.com/staytup.india"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-medium text-[#8E8E93] hover:text-white transition-colors flex items-center gap-1"
              >
                @staytup.india
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Support &amp; Inquiries</p>
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

        {/* Legal & Policies */}
        <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-1">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
              Legal &amp; Policies
            </h4>
          </div>
          <div className="divide-y divide-[#222226]">
            <button
              type="button"
              onClick={() => setActiveSubModal('terms')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                <p className="text-sm font-medium text-white">Terms &amp; Conditions</p>
              </div>
              <span className="text-xs text-[#8E8E93] group-hover:text-white">→</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubModal('privacy')}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[#8E8E93] group-hover:text-white" />
                <p className="text-sm font-medium text-white">Privacy Policy</p>
              </div>
              <span className="text-xs text-[#8E8E93] group-hover:text-white">→</span>
            </button>
          </div>
        </div>

        {/* Log Out Button */}
        <div className="pt-2">
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Staytup</span>
          </button>
        </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      <LoginModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />

      {/* Terms & Privacy Sub Modals */}
      {activeSubModal && (
        <div
          onClick={() => setActiveSubModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#141416] border border-[#26262A] rounded-2xl p-6 text-white max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#26262A] mb-4">
              <h3 className="text-base font-bold text-white">
                {activeSubModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </h3>
              <button
                onClick={() => setActiveSubModal(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto text-xs text-[#8E8E93] space-y-3 leading-relaxed">
              <p>
                Staytup Music is designed as a fast, privacy-focused audio platform. All audio streams are delivered via licensed or public CDNs and cached strictly in compliance with client storage protocols.
              </p>
              <p>
                Your personal data, playlists, and preferences remain confidential and are synchronized securely using Firebase Realtime Database and localized storage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
