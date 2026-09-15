import React from 'react';
import { Home, Search, Library, Disc3 } from 'lucide-react';

export const BottomNav = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'My Library', icon: Library },
    { id: 'blend', label: 'Blend', icon: Disc3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-white/10 px-4 select-none flex items-center justify-center lg:hidden h-[calc(56px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-md flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className="flex flex-col items-center justify-center gap-1 group py-1 px-3 min-w-[56px] cursor-pointer transition-transform active:scale-95"
            >
              <div
                className={`transition-all duration-200 ${
                  isActive
                    ? 'text-white scale-105'
                    : 'text-[#8E8E93] group-hover:text-neutral-200'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'stroke-[2.4] text-white' : 'stroke-[1.75]'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-all duration-200 ${
                  isActive
                    ? 'text-white font-bold scale-105'
                    : 'text-[#8E8E93] font-medium group-hover:text-neutral-300'
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
