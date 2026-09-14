import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MediaRail = ({ title, subtitle, action, children }) => {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {/* Rail Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-xs text-[#8E8E93] mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {action}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Rail Scrolling Row */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {children}
      </div>
    </div>
  );
};

export default MediaRail;
