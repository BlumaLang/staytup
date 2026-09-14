import React, { useState } from 'react';
import { getArtistGradient, getArtistInitial } from '../services/artistImageService';

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl font-extrabold',
  hero: 'w-32 h-32 sm:w-36 sm:h-36 text-4xl font-black',
};

export const UserAvatar = ({
  user,
  avatar,
  name,
  size = 'md',
  className = '',
  onClick,
}) => {
  const displayName = user?.displayName || user?.username || name || 'User';
  const rawAvatar = avatar || user?.avatar || '';

  const [hasError, setHasError] = useState(false);
  const initial = getArtistInitial(displayName);
  const gradient = getArtistGradient(displayName);
  const sizeClass = SIZE_CLASSES[size] || size;

  const showImage = Boolean(rawAvatar && !hasError);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 select-none shadow-md ${sizeClass} ${className}`}
    >
      {showImage ? (
        <img
          src={rawAvatar}
          alt={displayName}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} border border-white/10 flex items-center justify-center text-white font-bold tracking-tight uppercase shadow-inner`}
        >
          <span>{initial}</span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
