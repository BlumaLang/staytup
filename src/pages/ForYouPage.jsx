import React from 'react';
import { useNavigate } from 'react-router-dom';
import DoomPlayer from '../components/DoomPlayer';

export default function ForYouPage({ onOpenLibrary }) {
  const navigate = useNavigate();

  const handleOpenLibrary = () => {
    if (typeof onOpenLibrary === 'function') {
      onOpenLibrary();
    } else {
      navigate('/library');
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      <DoomPlayer onOpenLibrary={handleOpenLibrary} />
    </div>
  );
}
