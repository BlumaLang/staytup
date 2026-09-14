import React from 'react';
import { Home, Compass, Search, Library, Users, User, Settings, Music2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DesktopSidebar = ({ activeView, setActiveView, onOpenProfile, onOpenFriends }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'foryou', label: 'For You', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[260px] bg-[#0A0A0A] border-r border-[#1C1C1E] h-full flex-shrink-0 select-none relative z-30">
      {/* Logo / Branding */}
      <div
        onClick={() => setActiveView('home')}
        className="px-5 pt-6 pb-5 flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center transition-transform group-hover:scale-105">
          <Music2 className="w-4.5 h-4.5 text-black" />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-white">Staytup</span>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-[#8E8E93] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Section at Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-[#1C1C1E] mt-auto">
        <button
          onClick={onOpenProfile}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group cursor-pointer ${
            activeView === 'profile' ? 'bg-white/10 text-white' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                onError={(e) => {
                  e.target.src = './assets/memoji/pastel_0.51697304321735f33add6051853bcd14.jpg';
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-4 h-4 text-[#8E8E93]" />
              </div>
            )}
          </div>
          <div className="min-w-0 text-left flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {user?.username || user?.displayName || 'Staytup Listener'}
            </p>
            <p className="text-[11px] text-[#8E8E93] truncate">Free Member</p>
          </div>
          <Settings className="w-4 h-4 text-[#8E8E93] group-hover:text-white flex-shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  );
};
