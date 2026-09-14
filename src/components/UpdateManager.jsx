import React, { useState, useEffect, useRef } from 'react';
import { updateService } from '../services/updateService';
import { usePlayer } from '../context/PlayerContext';
import { Sparkles, RefreshCw, X, ArrowRight } from 'lucide-react';

export default function UpdateManager() {
  const { isPlaying } = usePlayer();
  const [updateState, setUpdateState] = useState(updateService.getState());
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownIntervalRef = useRef(null);
  const hasAutoUpdatedRef = useRef(false);

  // Subscribe to updateService state changes
  useEffect(() => {
    const unsubscribe = updateService.subscribe((state) => {
      setUpdateState(state);
    });
    return () => unsubscribe();
  }, []);

  // Handle music-safe auto-update logic
  useEffect(() => {
    if (!updateState.isUpdateAvailable || dismissed || hasAutoUpdatedRef.current) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(null);
      return;
    }

    // If audio is NOT playing: auto-update after a friendly 2-second countdown
    if (!isPlaying) {
      if (countdown === null) {
        setCountdown(2);
      }

      if (!countdownIntervalRef.current) {
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
              hasAutoUpdatedRef.current = true;
              updateService.applyUpdate();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      // Audio IS playing: pause auto-countdown so music is never interrupted
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(null);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [updateState.isUpdateAvailable, isPlaying, dismissed, countdown]);

  if (!updateState.isUpdateAvailable || dismissed) {
    return null;
  }

  const handleUpdateNow = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    hasAutoUpdatedRef.current = true;
    updateService.applyUpdate();
  };

  const handleDismiss = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setDismissed(true);
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="App update available"
      className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-50 max-w-[92vw] sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="bg-[#18181B]/95 backdrop-blur-xl border border-[#27272A] shadow-2xl shadow-black/80 rounded-2xl p-3.5 sm:p-4 text-white flex items-center justify-between gap-3">
        {/* Left: Sparkle Icon + Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs sm:text-sm font-bold text-white tracking-tight">
                New Update Available
              </p>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] sm:text-xs text-[#A1A1AA] truncate">
              {isPlaying
                ? 'Music is playing. Will update when paused.'
                : countdown !== null
                ? `Updating app in ${countdown}s...`
                : 'Fresh music & features ready.'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleUpdateNow}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-gray-200 text-black font-bold text-xs flex items-center gap-1 transition-transform active:scale-95 shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Update Now</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss"
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#71717A] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
