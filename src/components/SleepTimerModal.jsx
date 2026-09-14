import React from 'react';
import ReactDOM from 'react-dom';
import { usePlayer } from '../context/PlayerContext';
import { X, Check, Clock } from 'lucide-react';

export const SleepTimerModal = () => {
  const {
    isSleepTimerModalOpen,
    setIsSleepTimerModalOpen,
    sleepTimerMode,
    sleepTimerRemaining,
    setSleepTimer,
    cancelSleepTimer,
  } = usePlayer();

  if (!isSleepTimerModalOpen) return null;

  const handleSelectOption = (value) => {
    setSleepTimer(value);
    setIsSleepTimerModalOpen(false);
  };

  const formatRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m ${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const timerOptions = [
    { title: '5 min', subtitle: '5 minutes', value: 5 },
    { title: '15 min', subtitle: '15 minutes', value: 15 },
    { title: '30 min', subtitle: '30 minutes', value: 30 },
    { title: '45 min', subtitle: '45 minutes', value: 45 },
    { title: '1 hour', subtitle: '60 minutes', value: 60 },
    { title: '2 hours', subtitle: '120 minutes', value: 120 },
  ];

  const endOfTrackSelected = sleepTimerMode === 'end_of_track';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div
        onClick={() => setIsSleepTimerModalOpen(false)}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Bottom Sheet Modal Card */}
      <div className="relative w-full sm:max-w-md bg-[#121214] border-t sm:border border-[#242428] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 text-white">
        {/* Mobile Pull Indicator */}
        <div className="w-10 h-1 rounded-full bg-[#2C2C32] mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-white">Sleep Timer</h3>
          <button
            onClick={() => setIsSleepTimerModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#18181C] hover:bg-[#222228] text-[#8E8E93] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Timer Status (if running) */}
        {sleepTimerMode && (
          <div className="mb-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-white/70 animate-pulse" />
              <div>
                <p className="text-xs font-medium text-[#8E8E93]">
                  {sleepTimerMode === 'end_of_track' ? 'Stopping at end of track' : 'Time remaining'}
                </p>
                {sleepTimerMode === 'time' && (
                  <p className="text-sm font-extrabold text-white font-mono mt-0.5">
                    {formatRemaining(sleepTimerRemaining)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                cancelSleepTimer();
                setIsSleepTimerModalOpen(false);
              }}
              className="text-xs font-bold text-red-400 hover:text-red-300 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 transition-colors cursor-pointer"
            >
              Turn Off
            </button>
          </div>
        )}

        {/* Timer Option Cards — 2×3 grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-2.5">
          {timerOptions.map((opt) => {
            const isSelected =
              typeof opt.value === 'number' &&
              sleepTimerMode === 'time' &&
              Math.abs(sleepTimerRemaining - opt.value * 60) <= 60;

            return (
              <button
                key={opt.title}
                onClick={() => handleSelectOption(opt.value)}
                className={`p-3.5 rounded-2xl flex flex-col justify-between items-start transition-all cursor-pointer text-left border active:scale-95 min-h-[76px] ${
                  isSelected
                    ? 'bg-white text-black font-bold border-white shadow-lg'
                    : 'bg-[#18181C] hover:bg-[#202026] text-white border-[#24242A] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-base font-bold ${isSelected ? 'text-black' : 'text-white'}`}>
                    {opt.title}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-black flex-shrink-0 ml-1" />}
                </div>
                <span className={`text-[11px] mt-1 ${isSelected ? 'text-black/70 font-medium' : 'text-[#8E8E93]'}`}>
                  {opt.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* End of Track — Full-width bottom button */}
        <button
          onClick={() => handleSelectOption('end_of_track')}
          className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 border transition-all cursor-pointer active:scale-[0.98] ${
            endOfTrackSelected
              ? 'bg-white text-black border-white font-bold shadow-lg'
              : 'bg-[#18181C] hover:bg-[#202026] text-white border-[#24242A] hover:border-white/20'
          }`}
        >
          <span className={`text-sm font-bold ${endOfTrackSelected ? 'text-black' : 'text-white'}`}>
            End of track
          </span>
          <span className={`text-xs ${endOfTrackSelected ? 'text-black/60' : 'text-[#8E8E93]'}`}>
            · Current song
          </span>
          {endOfTrackSelected && <Check className="w-4 h-4 text-black ml-1" />}
        </button>
      </div>
    </div>,
    document.body
  );
};
