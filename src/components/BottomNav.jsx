import React from 'react';
import { Home, Search, Library, Users } from 'lucide-react';

export const BottomNav = ({ activeView, setActiveView }) => {
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
      </div>
    </nav>
  );
};

export default BottomNav;
