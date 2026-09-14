import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Phone, AlertCircle } from 'lucide-react';

export const LoginPage = ({ onComplete }) => {
  const { loginWithGoogle, finalizeGoogleLogin } = useAuth();
  const [step, setStep] = useState(1); // 1: Google login / Auth, 2: Phone number for friends
  const [pendingProfile, setPendingProfile] = useState(null);
  const [contactNo, setContactNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { profile, existingProfile } = await loginWithGoogle();

      const existingPhone = profile.phone || existingProfile?.phone || localStorage.getItem('staytup_contact_no');
      
      // If user already had a saved contact number or profile setup, finalize immediately
      if (existingPhone || (existingProfile && existingProfile.username)) {
        await finalizeGoogleLogin(profile, existingPhone || '');
        onComplete?.();
        return;
      }

      // Otherwise, proceed to Step 2 to allow adding phone number for friends blend
      setPendingProfile(profile);
      setStep(2);
    } catch (err) {
      console.warn('Google Sign In:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily closed the popup, do not show an aggressive error
        return;
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup was blocked by your browser. Please enable popups for this site and try again.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage('Domain not authorized in Firebase. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.');
      } else {
        setErrorMessage(err?.message || 'Google sign-in could not be completed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!pendingProfile) return;
    setIsLoading(true);
    try {
      await finalizeGoogleLogin(pendingProfile, contactNo.trim());
      onComplete?.();
    } catch (err) {
      console.error('Error saving contact:', err);
      onComplete?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipContact = async () => {
    if (!pendingProfile) return;
    setIsLoading(true);
    try {
      await finalizeGoogleLogin(pendingProfile, '');
      onComplete?.();
    } catch (err) {
      console.error('Error skipping contact:', err);
      onComplete?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col justify-between bg-black/95 backdrop-blur-2xl animate-in slide-in-from-bottom duration-300 select-none overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-8 max-w-sm sm:max-w-md mx-auto w-full my-auto">
        {step === 1 ? (
          <div className="text-center w-full flex flex-col items-center">
            {/* Pure Logo */}
            <div className="flex justify-center -mb-8 sm:-mb-10">
              <img
                src="./assets/staytup_logo.32975537674b053888ade6460fa37f97.png"
                alt="Staytup"
                className="w-36 h-36 sm:w-44 sm:h-44 object-contain animate-in zoom-in-95 duration-500"
              />
            </div>

            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
                Sound Without Limits
              </h2>
              <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed max-w-xs mx-auto">
                Sign in with Google to sync your favorites, blend playlists with friends, and discover endless music.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-4 w-full p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 text-left animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="space-y-3 pt-2 w-full">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer shadow-lg"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6 text-center">
            <div className="flex justify-center">
              <Phone className="w-12 h-12 text-white" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                Connect with Friends
              </h2>
              <p className="text-xs sm:text-sm text-[#8E8E93] leading-relaxed max-w-xs mx-auto">
                Add your contact number so friends can easily discover you, blend playlists, and see what you're vibing to.
              </p>
            </div>

            <div className="space-y-4 pt-2 text-left">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
                  Contact Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-[#8E8E93]">+91</span>
                  <input
                    type="tel"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    autoFocus
                    className="w-full pl-14 pr-4 py-3.5 bg-[#1C1C1E] border border-[#2C2C2E] rounded-xl text-white placeholder-[#8E8E93] text-sm focus:outline-none focus:border-white font-medium tracking-wide transition-colors"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveContact}
                disabled={contactNo.length < 10 || isLoading}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 active:scale-[0.98] text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Find & Sync Friends</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipContact}
                disabled={isLoading}
                className="w-full text-center text-xs text-[#8E8E93] hover:text-white transition-colors py-2 cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Terms */}
      <div className="p-6 text-center text-xs text-[#8E8E93]/60 border-t border-[#1C1C1E]/50">
        By continuing, you agree to Staytup Music Terms of Service & Privacy Policy.
      </div>
    </div>
  );
};
