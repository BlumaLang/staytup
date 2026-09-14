import React from 'react';
import { Home, Compass, Search, Library, Users, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav = ({ activeView, setActiveView, onOpenProfile, onOpenFriends }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'foryou', label: 'For You', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'friends', label: 'Friends', icon: Users },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-[#1C1C1E] px-2 sm:px-4 pt-1.5 pb-3 sm:pb-3.5 select-none flex items-center justify-center lg:hidden">
      <div className="w-full max-w-md flex items-center justify-around px-1 sm:px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex flex-col items-center justify-center gap-1 group py-1 px-1.5 min-w-[46px] cursor-pointer"
            >
              <div
                className={`transition-colors ${
                  isActive ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span
                className={`text-[9.5px] font-semibold tracking-wide transition-colors ${
                  isActive ? 'text-white' : 'text-[#8E8E93]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Profile item */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-1.5 min-w-[46px] cursor-pointer"
        >
          <div
            className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[#121212] transition-transform ${
              activeView === 'profile' ? 'ring-2 ring-white scale-105' : ''
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
            className={`text-[9.5px] font-semibold tracking-wide transition-colors ${
              activeView === 'profile' ? 'text-white' : 'text-[#8E8E93]'
            }`}
          >
            Profile
          </span>
        </button>
      </div>
    </div>
  );
};
