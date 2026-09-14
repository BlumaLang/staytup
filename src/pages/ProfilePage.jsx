import React, { useState } from 'react';
import { User, Edit3, Wifi, Shield, LogOut, Heart, Users, ListMusic, ChevronRight, Bell, Music2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [streamWifiOnly, setStreamWifiOnly] = useState(false);
  const [highQualityAudio, setHighQualityAudio] = useState(true);
  const [socialListening, setSocialListening] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const displayName = user?.name || user?.displayName || 'Staytup Listener';
  const displayEmail = user?.email || user?.phone || 'user@staytup.music';

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-8 space-y-8 text-white max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Profile &amp; Settings</h1>
        <p className="text-sm text-[#8E8E93] mt-1">
          Manage your account, preferences, audio quality, and privacy
        </p>
      </div>

      {/* User Info Summary Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/30 via-[#18181B] to-[#121214] border border-[#27272A] flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xl">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-3xl shadow-lg border-2 border-white/20">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-[#22C55E] text-black shadow-md hover:scale-110 transition-transform">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-2xl font-bold text-white">{displayName}</h2>
          <p className="text-sm text-[#8E8E93]">{displayEmail}</p>
          <div className="pt-2 flex items-center justify-center sm:justify-start gap-6 text-xs text-[#8E8E93]">
            <span><strong className="text-white">12</strong> Playlists</span>
            <span><strong className="text-white">48</strong> Following</span>
            <span><strong className="text-white">215</strong> Liked Songs</span>
          </div>
        </div>
      </div>

      {/* Settings Section: Playback & Streaming */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-1">
          Playback &amp; Streaming
        </h3>
        <div className="divide-y divide-[#27272A] rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-[#8E8E93]" />
              <div>
                <p className="text-sm font-semibold text-white">Stream over Wi-Fi only</p>
                <p className="text-xs text-[#8E8E93]">Save mobile data when listening on the go</p>
              </div>
            </div>
            <button
              onClick={() => setStreamWifiOnly(!streamWifiOnly)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                streamWifiOnly ? 'bg-[#22C55E]' : 'bg-[#27272A]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  streamWifiOnly ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Music2 className="w-5 h-5 text-[#8E8E93]" />
              <div>
                <p className="text-sm font-semibold text-white">High Quality Audio (320kbps)</p>
                <p className="text-xs text-[#8E8E93]">Lossless clarity and dynamic stereo sound</p>
              </div>
            </div>
            <button
              onClick={() => setHighQualityAudio(!highQualityAudio)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                highQualityAudio ? 'bg-[#22C55E]' : 'bg-[#27272A]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  highQualityAudio ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Section: Social & Privacy */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] px-1">
          Social &amp; Privacy
        </h3>
        <div className="divide-y divide-[#27272A] rounded-2xl bg-[#18181B] border border-[#27272A] overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#8E8E93]" />
              <div>
                <p className="text-sm font-semibold text-white">Social Listening Activity</p>
                <p className="text-xs text-[#8E8E93]">Allow friends to see what you are playing</p>
              </div>
            </div>
            <button
              onClick={() => setSocialListening(!socialListening)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                socialListening ? 'bg-[#22C55E]' : 'bg-[#27272A]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  socialListening ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#8E8E93]" />
              <div>
                <p className="text-sm font-semibold text-white">New Music Notifications</p>
                <p className="text-xs text-[#8E8E93]">Alerts when followed artists release tracks</p>
              </div>
            </div>
            <button
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                pushNotifications ? 'bg-[#22C55E]' : 'bg-[#27272A]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  pushNotifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="pt-2">
        <button
          onClick={() => logout && logout()}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#18181B] hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 border border-[#27272A] hover:border-rose-800/40 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
