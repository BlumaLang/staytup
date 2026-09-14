import React from 'react';
import { Home, Search, Library, Users, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav = ({ activeView, setActiveView, onOpenProfile }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'My Library', icon: Library },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0C]/95 backdrop-blur-xl border-t border-[#1C1C1E] px-3 pt-1.5 pb-3.5 select-none flex items-center justify-center lg:hidden">
      <div className="w-full max-w-lg flex items-center justify-between px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex flex-col items-center justify-center gap-1 group py-1 px-2 min-w-[54px] cursor-pointer"
            >
              <div
                className={`transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-colors duration-150 ${
                  isActive ? 'text-white font-bold' : 'text-[#8E8E93] font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Profile */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-2 min-w-[54px] cursor-pointer"
        >
          <div
            className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[#1A1A1E] transition-transform duration-150 ${
              activeView === 'profile' ? 'ring-2 ring-white scale-105' : 'ring-1 ring-white/20'
            }`}
          >
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
              <User className="w-3.5 h-3.5 text-[#8E8E93]" />
            )}
          </div>
          <span
            className={`text-[10px] tracking-tight transition-colors duration-150 ${
              activeView === 'profile' ? 'text-white font-bold' : 'text-[#8E8E93] font-medium'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
