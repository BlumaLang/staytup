import React from 'react';

export const MarqueeText = ({ text, className = '', speed = 15 }) => {
  if (!text) return null;

  return (
    <div className={`overflow-hidden whitespace-nowrap relative flex items-center ${className}`}>
      <div
        className="animate-marquee flex-shrink-0 flex items-center"
        style={{ animationDuration: `${Math.max(10, text.length * 0.4)}s` }}
      >
        <span className="pr-10">{text}</span>
        <span className="pr-10">{text}</span>
      </div>
    </div>
  );
};
