import React, { useEffect, useState } from 'react';

export const SplashScreen = ({ onFinish }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onFinish, 400);
    }, 1200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-400 select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <img
        src="./assets/staytup_logo.32975537674b053888ade6460fa37f97.png"
        alt="Staytup"
        className="w-36 h-36 sm:w-44 sm:h-44 object-contain animate-in zoom-in-95 duration-500"
      />
    </div>
  );
};

