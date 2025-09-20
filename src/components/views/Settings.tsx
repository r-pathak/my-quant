"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { createPortal } from "react-dom";

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

const DAYS_OF_WEEK = [
  { key: "monday", label: "m" },
  { key: "tuesday", label: "t" },
  { key: "wednesday", label: "w" },
  { key: "thursday", label: "t" },
  { key: "friday", label: "f" },
  { key: "saturday", label: "s" },
  { key: "sunday", label: "s" },
];

export default function Settings() {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState("09:00");
  const [daySchedules, setDaySchedules] = useState<Record<string, string[]>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const phoneData = useQuery(api.phoneContacts.getPhoneNumber);
  const setPhoneNumberMutation = useMutation(api.phoneContacts.setPhoneNumber);

  // Load existing data when available
  useEffect(() => {
    if (phoneData) {
      setPhoneNumber(phoneData.phoneNumber || "");
      const country = COUNTRY_CODES.find(c => c.dial === phoneData.internationalDialCode);
      if (country) {
        setSelectedCountry(country);
      }
      if (phoneData.schedule) {
        // Convert cron format back to local display format
        const displaySchedules: Record<string, string[]> = {};
        Object.entries(phoneData.schedule).forEach(([day, times]) => {
          if (times && times.length > 0) {
            displaySchedules[day] = times.map(time => {
              try {
                // Check if it's a cron job format (JSON string)
                if (time.startsWith('{') && time.includes('hourUTC')) {
                  const cronSchedule = JSON.parse(time);
                  // Create UTC date and convert to local time
                  const utcDate = new Date();
                  utcDate.setUTCHours(cronSchedule.hourUTC, cronSchedule.minuteUTC, 0, 0);
                  return utcDate.toTimeString().slice(0, 5); // HH:MM format in local time
                } else if (time.includes('T') && time.includes('Z')) {
                  // UTC ISO string - convert to local display time
                  const date = new Date(time);
                  return date.toTimeString().slice(0, 5); // HH:MM format in local time
                } else if (/^\d+$/.test(time)) {
                  // Unix timestamp - convert to display time
                  const date = new Date(parseInt(time) * 1000);
                  return date.toTimeString().slice(0, 5); // HH:MM format
                } else {
                  // Already in display format (HH:MM)
                  return time;
                }
              } catch (error) {
                console.error('Error parsing time format:', time, error);
                // Fallback to original time if parsing fails
                return time;
              }
            });
          }
        });
        setDaySchedules(displaySchedules);
      }
    }
  }, [phoneData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Check if click is not on the portal dropdown
        const target = event.target as Element;
        if (!target.closest('[data-dropdown-portal]')) {
          setIsDropdownOpen(false);
        }
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handlePhoneNumberChange = async (newPhoneNumber: string) => {
    setPhoneNumber(newPhoneNumber);
    
    if (newPhoneNumber.trim().length > 5) { // Basic validation
      try {
        await setPhoneNumberMutation({
          phoneNumber: newPhoneNumber.trim(),
          internationalDialCode: selectedCountry.dial,
          schedule: daySchedules,
        });
      } catch (error) {
        console.error("Failed to update phone number:", error);
      }
    }
  };

  const handleCountryChange = async (country: typeof COUNTRY_CODES[0]) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    
    if (phoneNumber.trim().length > 5) {
      try {
        await setPhoneNumberMutation({
          phoneNumber: phoneNumber.trim(),
          internationalDialCode: country.dial,
          schedule: daySchedules,
        });
      } catch (error) {
        console.error("Failed to update country code:", error);
      }
    }
  };


  const handleDayClick = (dayKey: string) => {
    setSelectedDay(dayKey);
    setShowTimePicker(true);
    // Set temp time to first existing time for this day, or default
    const existingTimes = daySchedules[dayKey];
    setTempTime(existingTimes && existingTimes.length > 0 ? existingTimes[0] : "09:00");
  };

  const handleTimePickerSave = async () => {
    if (selectedDay && tempTime) {
      // Convert local time to UTC for cron jobs
      const today = new Date();
      const [hours, minutes] = tempTime.split(':').map(Number);
      const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      
      // Get UTC hours and minutes for cron job format
      const utcHours = localDate.getUTCHours();
      const utcMinutes = localDate.getUTCMinutes();
      
      // Create cron job compatible format
      const cronSchedule = {
        hourUTC: utcHours,
        minuteUTC: utcMinutes
      };
      
      // Update local state with display time for UI
      const newSchedules = {
        ...daySchedules,
        [selectedDay]: [tempTime] // Keep display time as string for UI
      };
      setDaySchedules(newSchedules);
      
      // Create schedule with cron-compatible format for Convex
      const cronSchedules = {
        ...daySchedules,
        [selectedDay]: [JSON.stringify(cronSchedule)] // Save as JSON string for cron jobs
      };
      
      // Auto-save to Convex immediately with cron format
      try {
        await setPhoneNumberMutation({
          phoneNumber: phoneNumber.trim(),
          internationalDialCode: selectedCountry.dial,
          schedule: cronSchedules,
        });
      } catch (error) {
        console.error("Failed to save schedule:", error);
        // Revert local state on error
        setDaySchedules(daySchedules);
      }
    }
    setShowTimePicker(false);
    setSelectedDay(null);
  };

  const handleTimePickerCancel = () => {
    setShowTimePicker(false);
    setSelectedDay(null);
  };

  const removeDaySchedule = async (dayKey: string) => {
    const newSchedules = { ...daySchedules };
    delete newSchedules[dayKey];
    
    // Update local state
    setDaySchedules(newSchedules);
    
    // Auto-save to Convex immediately (empty schedule, no Unix conversion needed)
    try {
      await setPhoneNumberMutation({
        phoneNumber: phoneNumber.trim(),
        internationalDialCode: selectedCountry.dial,
        schedule: newSchedules, // Empty schedule, no conversion needed
      });
    } catch (error) {
      console.error("Failed to remove schedule:", error);
      // Revert local state on error
      setDaySchedules(daySchedules);
    }
  };

  const getDayName = (dayKey: string) => {
    const dayNames: Record<string, string> = {
      monday: "Monday",
      tuesday: "Tuesday", 
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday"
    };
    return dayNames[dayKey] || dayKey;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex flex-col h-full relative font-mono">
      {/* Title */}
      <div className="flex items-start justify-start mb-4 px-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-mono">settings</h1>
          <p className="text-muted-foreground text-sm font-mono">
            manage your phone number and call preferences
          </p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-h-0 p-4">
        <div className="max-w-2xl">
          <div className="space-y-6">
            {/* Phone Number Section */}
            <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-6">
              <h3 className="text-lg font-bold text-foreground font-mono mb-4">
                phone number
              </h3>
              <div className="flex relative">
                {/* Country Code Selector */}
                <div className="relative" ref={dropdownRef}>
                    <button
                      ref={buttonRef}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (!isDropdownOpen && buttonRef.current) {
                          const rect = buttonRef.current.getBoundingClientRect();
                          setDropdownPosition({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX
                          });
                        }
                        
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className="flex items-center gap-2 h-12 px-3 py-3 bg-card/40 border border-white/20 rounded-l-xl rounded-r-none text-foreground hover:bg-card/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 relative z-20"
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

                </div>

                {/* Phone Number Input */}
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    placeholder="enter your phone number"
                    className="flex-1 h-12 px-4 py-3 bg-card/40 border border-white/20 border-l-0 rounded-l-none rounded-r-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent font-mono"
                  />
              </div>
            </div>

            {/* Call Schedule Section */}
            <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-6">
              <h3 className="text-lg font-bold text-foreground font-mono mb-4">
                call schedule - when myquant will call you.
              </h3>
              <p className="text-muted-foreground text-sm font-mono mb-6">
                tap a day to set your available time
              </p>
              
              {/* Circular Day Orbs */}
              <div className="flex justify-center gap-3 mb-8">
                {DAYS_OF_WEEK.map((day) => {
                  const hasSchedule = daySchedules[day.key] && daySchedules[day.key].length > 0;
                  return (
                    <button
                      key={day.key}
                      onClick={() => handleDayClick(day.key)}
                      className={`w-12 h-12 rounded-full font-mono font-bold text-sm transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                        hasSchedule
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 border-2 border-blue-400/50'
                          : 'bg-card/60 border-2 border-white/20 text-muted-foreground hover:border-white/40 hover:text-foreground'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>

              {/* Current Schedules */}
              {Object.keys(daySchedules).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground font-mono">
                    your schedule
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(daySchedules).map(([dayKey, times]) => (
                      times && times.length > 0 && (
                        <div
                          key={dayKey}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-mono font-bold text-xs">
                              {DAYS_OF_WEEK.find(d => d.key === dayKey)?.label}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground font-mono">
                                {getDayName(dayKey)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatTime(times[0])} (available for calls)
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeDaySchedule(dayKey)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* iPhone-Style Time Picker Modal */}
      {showTimePicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-card/95 backdrop-blur-xl border-t border-white/20 rounded-t-3xl shadow-2xl w-full max-w-md mx-4 mb-0 animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground font-mono">
                  set time for {selectedDay && getDayName(selectedDay)}
                </h3>
                <button
                  onClick={handleTimePickerCancel}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Time Picker */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-2xl p-6">
                  
                  <div className="space-y-4">
                    <Input
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="w-full text-center text-3xl font-mono font-bold bg-card/40 border border-white/20 rounded-xl py-4 text-foreground focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleTimePickerCancel}
                  className="flex-1 py-3 px-6 bg-card/60 hover:bg-card/80 border border-white/20 rounded-xl text-muted-foreground hover:text-foreground font-mono transition-all duration-300"
                >
                  cancel
                </button>
                <button
                  onClick={handleTimePickerSave}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 rounded-xl text-foreground font-mono transition-all duration-300 shadow-lg shadow-blue-500/20"
                >
                  save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal Dropdown */}
      {isDropdownOpen && typeof window !== 'undefined' && createPortal(
        <div 
          data-dropdown-portal
          className="fixed w-80 bg-slate-900 border border-white/30 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top + 4,
            left: dropdownPosition.left,
            zIndex: 99999
          }}
        >
          {COUNTRY_CODES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCountryChange(country);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/20 transition-colors text-white font-mono cursor-pointer border-b border-white/10 last:border-b-0"
            >
              <span className="text-lg">{country.flag}</span>
              <span className="font-mono text-sm min-w-[3rem]">{country.dial}</span>
              <span className="text-sm font-mono">{country.name.toLowerCase()}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}