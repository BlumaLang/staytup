import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/endpoints';
import { get500x500Image } from '../utils/media';
import { Check, ChevronRight, ArrowRight } from 'lucide-react';

const AVAILABLE_LANGUAGES = [
  { id: 'hindi', label: 'Hindi', native: 'हिंदी' },
  { id: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { id: 'english', label: 'English', native: 'English' },
  { id: 'tamil', label: 'Tamil', native: 'தமிழ்' },
  { id: 'telugu', label: 'Telugu', native: 'తెలుగు' },
  { id: 'bhojpuri', label: 'Bhojpuri', native: 'भोजपुरी' },
  { id: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { id: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'marathi', label: 'Marathi', native: 'मराठी' },
  { id: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { id: 'haryanvi', label: 'Haryanvi', native: 'हरियाणवी' },
];

const CURATED_BY_LANG = {
  hindi: [
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20231114092437_500x500.jpg' },
    { name: 'Pritam', image: 'https://c.saavncdn.com/artists/Pritam_Chakraborty-20170711073326_500x500.jpg' },
    { name: 'Atif Aslam', image: 'https://c.saavncdn.com/169/Monsoon-Bollywood-Hits-Hindi-2023-20230616161232-500x500.jpg' },
    { name: 'Badshah', image: 'https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg' },
    { name: 'Anuv Jain', image: 'https://c.saavncdn.com/artists/Anuv_Jain_003_20230810074218_500x500.jpg' },
    { name: 'Neha Kakkar', image: 'https://c.saavncdn.com/artists/Neha_Kakkar_006_20231107113110_500x500.jpg' },
    { name: 'Vishal Mishra', image: 'https://c.saavncdn.com/artists/Vishal_Mishra_004_20231107114227_500x500.jpg' },
  ],
  punjabi: [
    { name: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg' },
    { name: 'Karan Aujla', image: 'https://c.saavncdn.com/artists/Karan_Aujla_004_20260810121947_500x500.jpg' },
    { name: 'Sidhu Moose Wala', image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20250617183705_500x500.jpg' },
    { name: 'AP Dhillon', image: 'https://c.saavncdn.com/artists/AP_Dhillon_004_20251023102150_500x500.jpg' },
    { name: 'Shubh', image: 'https://c.saavncdn.com/artists/Shubh_003_20230623064618_500x500.jpg' },
    { name: 'Guru Randhawa', image: 'https://c.saavncdn.com/artists/Guru_Randhawa_007_20231107113402_500x500.jpg' },
  ],
  english: [
    { name: 'The Weeknd', image: 'https://c.saavncdn.com/artists/The_Weeknd_500x500.jpg' },
    { name: 'Taylor Swift', image: 'https://c.saavncdn.com/artists/Taylor_Swift_500x500.jpg' },
    { name: 'Billie Eilish', image: 'https://c.saavncdn.com/artists/Billie_Eilish_500x500.jpg' },
    { name: 'Drake', image: 'https://c.saavncdn.com/artists/Drake_500x500.jpg' },
    { name: 'Post Malone', image: 'https://c.saavncdn.com/artists/Post_Malone_500x500.jpg' },
    { name: 'Ed Sheeran', image: 'https://c.saavncdn.com/artists/Ed_Sheeran_500x500.jpg' },
  ],
  tamil: [
    { name: 'Anirudh Ravichander', image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg' },
    { name: 'A.R. Rahman', image: 'https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20231107113645_500x500.jpg' },
    { name: 'Yuvan Shankar Raja', image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_004_20231107113812_500x500.jpg' },
  ],
  telugu: [
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20231107113645_500x500.jpg' },
    { name: 'Thaman S', image: 'https://c.saavncdn.com/artists/Thaman_S_003_20231107113725_500x500.jpg' },
    { name: 'Devi Sri Prasad', image: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_003_20231107113854_500x500.jpg' },
    { name: 'Anurag Kulkarni', image: 'https://c.saavncdn.com/artists/Anurag_Kulkarni_003_20231107113945_500x500.jpg' },
  ],
  bhojpuri: [
    { name: 'Pawan Singh', image: 'https://c.saavncdn.com/artists/Pawan_Singh_004_20231107114022_500x500.jpg' },
    { name: 'Khesari Lal Yadav', image: 'https://c.saavncdn.com/artists/Khesari_Lal_Yadav_005_20231107114102_500x500.jpg' },
    { name: 'Shilpi Raj', image: 'https://c.saavncdn.com/artists/Shilpi_Raj_004_20231107114138_500x500.jpg' },
  ],
  bengali: [
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg' },
    { name: 'Anupam Roy', image: 'https://c.saavncdn.com/artists/Anupam_Roy_003_20231107114312_500x500.jpg' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20231114092437_500x500.jpg' },
  ],
};

export const Onboarding = ({ onComplete }) => {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedLanguages, setSelectedLanguages] = useState(['hindi', 'punjabi']);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistList, setArtistList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load language-based artist suggestions whenever languages change
  useEffect(() => {
    let isMounted = true;

    // 1. Gather curated artists matching the selected languages
    const initialPool = [];
    selectedLanguages.forEach(lang => {
      if (CURATED_BY_LANG[lang]) {
        initialPool.push(...CURATED_BY_LANG[lang]);
      }
    });

    if (initialPool.length < 8) {
      initialPool.push(...(CURATED_BY_LANG.hindi || []), ...(CURATED_BY_LANG.english || []));
    }

    const seen = new Set();
    const uniquePool = initialPool.filter(a => {
      const lower = a.name.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    setArtistList(uniquePool);

    // 2. Fetch live popular artists for selected languages from API
    api.getPopularArtists(selectedLanguages.join(','), 30)
      .then(res => {
        if (!isMounted) return;
        const fetched = (res?.artists || res?.results || [])
          .filter(a => a.name && !a.name.includes('&') && !a.name.includes('|'))
          .map(a => ({
            id: a.id || a.name,
            name: a.name,
            image: a.image || a.thumbnail || '',
          }))
          .filter(a => a.image && !a.image.includes('default'));

        if (fetched.length > 0) {
          setArtistList(prev => {
            const nameMap = new Map();
            fetched.forEach(f => nameMap.set(f.name.toLowerCase(), f));
            prev.forEach(p => {
              if (!nameMap.has(p.name.toLowerCase())) {
                nameMap.set(p.name.toLowerCase(), p);
              }
            });
            return Array.from(nameMap.values());
          });
        }
      })
      .catch(e => console.warn('Popular artist fetch fallback:', e));

    // 3. Hydrate missing or fallback images for the initial pool
    const namesToHydrate = uniquePool.map(a => a.name);
    if (namesToHydrate.length > 0) {
      api.getBatchArtistImages(namesToHydrate)
        .then(bRes => {
          if (!isMounted || !bRes?.images) return;
          setArtistList(prev =>
            prev.map(a => {
              const realImg = bRes.images[a.name];
              if (realImg && (!a.image || a.image.includes('_500x500.jpg') || a.image.includes('default'))) {
                return { ...a, image: realImg };
              }
              return a;
            })
          );
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [selectedLanguages]);

  // When an artist is selected, dynamically fetch related artists from the API and seamlessly insert them into the artistList
  useEffect(() => {
    if (selectedArtists.length === 0) return;

    let isMounted = true;
    const latestArtist = selectedArtists[selectedArtists.length - 1];

    api.searchArtists(latestArtist, 6)
      .then(res => {
        if (!isMounted) return;
        const related = (res.artists || res.results || [])
          .filter(a => a.name && a.name.toLowerCase() !== latestArtist.toLowerCase())
          .map(a => ({
            id: a.id,
            name: a.name,
            image: a.image || a.thumbnail || '',
          }))
          .filter(a => a.image && !a.image.includes('default'));

        if (related.length > 0) {
          setArtistList(prev => {
            const existingNames = new Set(prev.map(a => a.name.toLowerCase()));
            const newArtists = related.filter(a => !existingNames.has(a.name.toLowerCase()));
            return [...prev, ...newArtists];
          });
        }
      })
      .catch(e => console.warn('Could not load related artists:', e));

    return () => {
      isMounted = false;
    };
  }, [selectedArtists]);

  const toggleLanguage = (id) => {
    setSelectedLanguages(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(l => l !== id) : prev) : [...prev, id]
    );
  };

  const toggleArtist = (name) => {
    setSelectedArtists(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const handleFinish = async () => {
    if (selectedArtists.length < 3) return;
    setIsSubmitting(true);
    try {
      await completeOnboarding(selectedLanguages, selectedArtists);
      onComplete?.();
    } catch (e) {
      console.error(e);
      onComplete?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingToSelect = Math.max(0, 3 - selectedArtists.length);

  return (
    <div className="fixed inset-0 z-50 h-full h-[100dvh] w-full flex flex-col justify-between bg-black text-white animate-in slide-in-from-bottom duration-300 select-none overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 pt-8 pb-6 no-scrollbar max-w-2xl mx-auto w-full">
        {step === 1 ? (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                What music do you vibe to?
              </h2>
              <p className="text-xs sm:text-sm text-[#8E8E93]">
                Select the languages you listen to most. We'll tune your sound feed and artist suggestions accordingly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-8">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.id);
                return (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`relative p-4 rounded-2xl text-left transition-colors border ${
                      isSelected
                        ? 'bg-[#1C1C1E] border-white'
                        : 'bg-[#121212] border-[#2C2C2E] hover:border-[#8E8E93]/40'
                    }`}
                  >
                    <div className="flex justify-between items-center h-5 mb-2.5">
                      <span className="text-xs text-[#8E8E93] font-medium leading-none">{lang.native}</span>
                      <div className={`w-5 h-5 rounded-full bg-white flex items-center justify-center transition-opacity flex-shrink-0 ${
                        isSelected ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}>
                        <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                      </div>
                    </div>
                    <span className="font-semibold text-base block text-white leading-tight">
                      {lang.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            {/* Step 2: Clean Artists Selection */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
                Pick your favorite artists
              </h2>
              <p className="text-xs sm:text-sm text-[#8E8E93]">
                {remainingToSelect > 0
                  ? `Select at least ${remainingToSelect} more artist${remainingToSelect > 1 ? 's' : ''} to build your personalized sound feed.`
                  : "Great taste! You've picked enough artists to tune your sound flow."}
              </p>
            </div>

            {/* Clean Single Grid of Artist Circles */}
            <div className="grid grid-cols-3 gap-y-5 gap-x-3 pb-8">
              {artistList.map((artist) => {
                const isSelected = selectedArtists.includes(artist.name);
                return (
                  <button
                    key={artist.name}
                    onClick={() => toggleArtist(artist.name)}
                    className="flex flex-col items-center group relative text-center"
                  >
                    <div
                      className={`relative w-22 h-22 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden mb-2 transition-all border-2 bg-[#1C1C1E] ${
                        isSelected
                          ? 'border-white scale-105'
                          : 'border-[#2C2C2E] group-hover:border-[#8E8E93]'
                      }`}
                    >
                      <img
                        src={get500x500Image(artist.image)}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                        }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                            <Check className="w-4 h-4 text-black stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium line-clamp-1 max-w-[85px] leading-tight ${
                        isSelected ? 'text-white font-semibold' : 'text-[#8E8E93]'
                      }`}
                    >
                      {artist.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <div className="p-5 sm:p-6 bg-black/95 backdrop-blur-md border-t border-[#1C1C1E] max-w-2xl mx-auto w-full">
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            disabled={selectedLanguages.length === 0}
            className="w-full py-4 rounded-2xl bg-white hover:bg-gray-200 active:scale-[0.98] transition-all text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5 text-black" />
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="py-4 px-6 rounded-2xl bg-[#121212] border border-[#2C2C2E] hover:bg-[#1C1C1E] text-[#8E8E93] hover:text-white font-semibold text-sm transition-all active:scale-95"
            >
              Back
            </button>
            <button
              onClick={handleFinish}
              disabled={isSubmitting || selectedArtists.length < 3}
              className="flex-1 py-4 px-3 sm:px-4 rounded-2xl bg-white hover:bg-gray-200 active:scale-[0.98] transition-all text-black font-bold text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Start Listening</span>
                  {selectedArtists.length < 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 font-semibold whitespace-nowrap">
                      {selectedArtists.length}/3 minimum
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
