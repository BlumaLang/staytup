import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Wifi,
  Disc3,
  Shield,
  FileText,
  Instagram,
  Mail,
  Code2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';
import { updateService, CURRENT_BUILD } from '../services/updateService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [streamWifiOnly, setStreamWifiOnly] = useState(
    () => localStorage.getItem('staytup_setting_wifi') === 'true'
  );
  const [socialListening, setSocialListening] = useState(
    () => localStorage.getItem('staytup_setting_social') !== 'false'
  );
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
    } catch {
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

  /* ─── Toggle component ─── */
  const Toggle = ({ on, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
        on ? 'bg-white' : 'bg-[#2C2C2E]'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
          on ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
        }`}
      />
    </button>
  );

  /* ─── Settings row ─── */
  const Row = ({ icon: Icon, label, sub, right }) => (
    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          {sub && <p className="text-xs text-[#8E8E93] mt-0.5 leading-snug">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );

  /* ─── Section card ─── */
  const Section = ({ title, badge, children }) => (
    <div className="bg-[#121214] border border-[#222226] rounded-2xl overflow-hidden">
      <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">{title}</h4>
        {badge}
      </div>
      <div className="divide-y divide-[#222226]">{children}</div>
    </div>
  );

  return (
    <div className="w-full min-h-full flex flex-col text-white select-none">
      {/* Header — desktop only; mobile already shows "Settings" in AppShell top bar */}
      <div className="hidden lg:flex sticky top-0 z-20 px-4 sm:px-6 py-4 bg-black/90 backdrop-blur-xl border-b border-[#1C1C1E] items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-[#121214] hover:bg-[#1C1C1E] border border-[#222226] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors flex-shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-6 w-full max-w-2xl mx-auto space-y-5">

        {/* Playback */}
        <Section title="Playback">
          <Row
            icon={Wifi}
            label="Wi-Fi only streaming"
            sub="Save mobile data while on the move"
            right={<Toggle on={streamWifiOnly} onToggle={handleWifiToggle} />}
          />
        </Section>

        {/* Blend & Social */}
        <Section title="Blend & Social">
          <Row
            icon={Disc3}
            label="Share Listening Activity"
            sub="Allow listeners to blend tastes with you"
            right={<Toggle on={socialListening} onToggle={handleSocialToggle} />}
          />
        </Section>

        {/* App Version & Updates */}
        <Section
          title="App Version & Updates"
          badge={
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              v{CURRENT_BUILD.version}
            </span>
          }
        >
          <Row
            icon={CheckCircle2}
            label="Build Release"
            sub={CURRENT_BUILD.buildId}
            right={
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
                  <><RefreshCw className="w-3 h-3 animate-spin" /><span>Checking...</span></>
                ) : updateStatus === 'available' ? (
                  <><RefreshCw className="w-3 h-3" /><span>Update Now</span></>
                ) : updateStatus === 'latest' ? (
                  <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span>Up to Date</span></>
                ) : (
                  <><RefreshCw className="w-3 h-3" /><span>Check for Updates</span></>
                )}
              </button>
            }
          />
        </Section>

        {/* Developer & Contact */}
        <Section title="Developer & Contact">
          <Row
            icon={Code2}
            label="Developer"
            sub="Lead Creator & Engineer"
            right={
              <a
                href="https://instagram.com/animikh.04"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#8E8E93] hover:text-white transition-colors flex items-center gap-1"
              >
                @animikh.04
                <ExternalLink className="w-3 h-3" />
              </a>
            }
          />
          <Row
            icon={Instagram}
            label="Official Instagram"
            sub="Community & updates"
            right={
              <a
                href="https://instagram.com/staytup.india"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#8E8E93] hover:text-white transition-colors flex items-center gap-1"
              >
                @staytup.india
                <ExternalLink className="w-3 h-3" />
              </a>
            }
          />
          <Row
            icon={Mail}
            label="Support & Inquiries"
            right={
              <a
                href="mailto:staytup.india@gmail.com"
                className="text-xs font-medium text-[#8E8E93] hover:text-white transition-colors"
              >
                staytup.india@gmail.com
              </a>
            }
          />
        </Section>

        {/* Legal & Policies */}
        <Section title="Legal & Policies">
          <button
            type="button"
            onClick={() => setActiveSubModal('terms')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
              <p className="text-sm font-medium text-white">Terms & Conditions</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSubModal('privacy')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
              <p className="text-sm font-medium text-white">Privacy Policy</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8E8E93] group-hover:text-white transition-colors" />
          </button>
        </Section>

        {/* Log Out */}
        <div className="pt-1 pb-6">
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Staytup</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-6 text-xs text-[#8E8E93]/50 space-y-0.5">
          <p className="font-semibold text-white/60">Staytup Music v{CURRENT_BUILD.version}</p>
          <p>© 2026 Staytup. All rights reserved.</p>
        </div>
      </div>

      {/* Legal Sub-modal */}
      {activeSubModal && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col animate-in fade-in duration-200">
          <div className="px-4 sm:px-6 pt-4 pb-3.5 border-b border-[#1C1C1E] flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-8 h-8 rounded-full bg-[#121214] hover:bg-[#1C1C1E] border border-[#222226] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white flex-1">
              {activeSubModal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
            </h3>
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-8 h-8 rounded-full bg-[#121214] hover:bg-[#1C1C1E] border border-[#222226] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
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
                  Your current song activity and Blend playlists are only shared with mutual listeners if "Share Listening Activity" is kept enabled in your settings. You can disable this anytime with a single tap.
                </p>
                <h4 className="font-bold text-base text-white">4. Contact Us</h4>
                <p>
                  For privacy inquiries or account data removal requests, contact the developer at{' '}
                  <span className="text-white font-semibold">staytup.india@gmail.com</span> or via Instagram{' '}
                  <span className="text-white font-semibold">@staytup.india</span>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
