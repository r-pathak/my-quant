"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FlickeringGrid } from "../ui/flickering-grid";
import { EvervaultCard } from "../ui/evervault-card";

// Common country codes with their flags and dial codes
const COUNTRY_CODES = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
  { code: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { code: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", dial: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", dial: "+36", flag: "🇭🇺" },
  { code: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
];

interface PhoneNumberFormProps {
  onComplete: () => void;
}

export default function PhoneNumberForm({ onComplete }: PhoneNumberFormProps) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const setPhoneNumberMutation = useMutation(api.phoneContacts.setPhoneNumber);

  // Debug: Log when selectedCountry changes
  useEffect(() => {
    console.log('Selected country changed to:', selectedCountry);
  }, [selectedCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setIsLoading(true);
    try {
      await setPhoneNumberMutation({
        phoneNumber: phoneNumber.trim(),
        internationalDialCode: selectedCountry.dial,
      });
      onComplete();
    } catch (error) {
      console.error("Failed to save phone number:", error);
      alert("Failed to save phone number. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountrySelect = (country: typeof COUNTRY_CODES[0]) => {
    console.log('handleCountrySelect called with:', country);
    setSelectedCountry(country);
    setIsDropdownOpen(false);
  };

  const filteredCountries = COUNTRY_CODES;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <FlickeringGrid
        className="fixed inset-0 z-0 w-full h-full"
        squareSize={4}
        gridGap={6}
        color="#ab47bc"
        maxOpacity={0.5}
        flickerChance={0.5}
        height={2000}
        width={2000}
      />
      <div className="relative z-10 w-full max-w-md">
        <EvervaultCard className="h-[500px] w-full">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 flex flex-col justify-center">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                add your phone number
              </h2>
              <p className="text-slate-300 text-sm font-mono">
               we use this to contact you for personalized trading insights
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                  phone number
                </label>
                <div className="flex relative">
                  {/* Country Code Selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Current selected country:', selectedCountry);
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className="flex items-center gap-2 px-3 py-3 bg-slate-800/50 border border-slate-600 rounded-l-xl text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 relative z-20"
                    >
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span className="text-sm font-mono">{selectedCountry.dial}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto">
                        {filteredCountries.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => handleCountrySelect(country)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors text-white font-mono cursor-pointer border-b border-slate-700 last:border-b-0"
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="font-mono text-sm min-w-[3rem]">{country.dial}</span>
                            <span className="text-sm font-mono">{country.name.toLowerCase()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="enter your phone number"
                    className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600 border-l-0 rounded-r-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !phoneNumber.trim()}
                className="w-full py-3 cursor-pointer px-6 bg-gradient-to-r from-purple-500/30 via-slate-900/95 to-black hover:from-purple-500/40 hover:via-slate-800/95 hover:to-slate-900 backdrop-blur-xl text-white rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all duration-300 font-mono relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10">
                  {isLoading ? "saving..." : "continue"}
                </span>
              </button>

              <p className="text-xs text-slate-400 text-center font-mono">
                we respect your privacy and will only use your number for trading-related communications.
              </p>
            </form>
          </div>
        </EvervaultCard>
      </div>

    </div>
  );
}

