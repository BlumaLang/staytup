import React from 'react';
import { Compass, Search, Library, Users, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav = ({ activeView, setActiveView, onOpenProfile, onOpenFriends }) => {
  const { user } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-[#1C1C1E] px-3 sm:px-4 pt-1.5 pb-3 sm:pb-3.5 select-none flex items-center justify-center">
      <div className="w-full max-w-md flex items-center justify-between px-2 sm:px-6">
        {/* Feed / For You */}
        <button
          onClick={() => setActiveView('feed')}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-2 min-w-[50px]"
        >
          <div
            className={`transition-colors ${
              activeView === 'feed' ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-semibold tracking-wide ${
              activeView === 'feed' ? 'text-white' : 'text-[#8E8E93]'
            }`}
          >
            For You
          </span>
        </button>

        {/* Search */}
        <button
          onClick={() => setActiveView('search')}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-2 min-w-[50px]"
        >
          <div
            className={`transition-colors ${
              activeView === 'search' ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
            }`}
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-semibold tracking-wide ${
              activeView === 'search' ? 'text-white' : 'text-[#8E8E93]'
            }`}
          >
            Search
          </span>
        </button>

        {/* Library */}
        <button
          onClick={() => setActiveView('library')}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-2 min-w-[50px]"
        >
          <div
            className={`transition-colors ${
              activeView === 'library' ? 'text-white' : 'text-[#8E8E93] group-hover:text-white'
            }`}
          >
            <Library className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-semibold tracking-wide ${
              activeView === 'library' ? 'text-white' : 'text-[#8E8E93]'
            }`}
          >
            Library
          </span>
        </button>

        {/* Friends */}
        <button
          onClick={onOpenFriends}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-2 min-w-[50px]"
        >
          <div className="text-[#8E8E93] group-hover:text-white transition-colors">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-[#8E8E93] group-hover:text-white">
            Friends
          </span>
        </button>

        {/* Profile */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center gap-1 group py-1 px-2.5 min-w-[56px]"
        >
          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[#121212]">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#8E8E93]" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-[#8E8E93] group-hover:text-white">
            Profile
          </span>
        </button>
      </div>
    </div>
  );
};
