import React, { useState, useEffect } from 'react';
import {
  getStoredArtistImage,
  resolveArtistImage,
  subscribeToArtistImages,
  getArtistInitial,
  getArtistGradient,
} from '../services/artistImageService';
import { get500x500Image } from '../utils/media';

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-2xl',
  '2xl': 'w-32 h-32 sm:w-36 sm:h-36 text-3xl font-extrabold',
  hero: 'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 text-5xl font-black',
};

export const ArtistAvatar = ({
  name = '',
  image = '',
  size = 'md',
  className = '',
  onClick,
  alt,
}) => {
  const initial = getArtistInitial(name);
  const gradient = getArtistGradient(name);

  // Check passed image or cached image
  const initialImage =
    (typeof image === 'string' && image.trim() && !image.includes('default') && !image.includes('share-image'))
      ? image
      : getStoredArtistImage(name);

  const [resolvedImage, setResolvedImage] = useState(initialImage || null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronize when passed image changes
  useEffect(() => {
    if (typeof image === 'string' && image.trim() && !image.includes('default') && !image.includes('share-image')) {
      setResolvedImage(image);
      setHasError(false);
    } else {
      const cached = getStoredArtistImage(name);
      if (cached) {
        setResolvedImage(cached);
        setHasError(false);
      }
    }
  }, [image, name]);

  // Non-blocking asynchronous resolution
  useEffect(() => {
    if (!resolvedImage && name) {
      resolveArtistImage(name);
    }

    const unsubscribe = subscribeToArtistImages((key, newUrl) => {
      const myKey = String(name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      if (key === myKey && newUrl) {
        setResolvedImage(newUrl);
        setHasError(false);
      }
    });

    return unsubscribe;
  }, [name, resolvedImage]);

  const sizeClass = SIZE_CLASSES[size] || size;
  const highResUrl = resolvedImage ? get500x500Image(resolvedImage) : null;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 select-none shadow-md ${sizeClass} ${className}`}
    >
      {highResUrl && !hasError ? (
        <>
          {/* Subtle initial skeleton behind the image while it loads */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold tracking-tight uppercase transition-opacity duration-300 ${
              isLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span>{initial}</span>
          </div>

          <img
            src={highResUrl}
            alt={alt || name || 'Artist'}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      ) : (
        /* Deterministic Initial Badge (Intentional, elegant fallback) */
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} border border-white/10 flex items-center justify-center text-white font-bold tracking-tight uppercase shadow-inner`}
        >
          <span>{initial}</span>
        </div>
      )}
    </div>
  );
};

export default ArtistAvatar;
