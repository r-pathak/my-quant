"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { IconPlus, IconX } from "@tabler/icons-react";

interface AddHoldingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onHoldingAdded?: () => void; // Callback to trigger refresh after adding
}

export default function AddHoldingForm({ isOpen, onClose, onHoldingAdded }: AddHoldingFormProps) {
  const [formData, setFormData] = useState({
    ticker: "",
    companyName: "",
    unitsHeld: "",
    boughtPrice: "",
    sector: "",
    positionType: "long" as "long" | "short",
    purchaseDate: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCompany, setIsFetchingCompany] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [tickerValidated, setTickerValidated] = useState(false);
  const addOrUpdateHolding = useMutation(api.holdings.addOrUpdateHolding);
  const validateTicker = useAction(api.priceActions.validateTicker);
  const updatePricesForTickers = useAction(api.priceActions.updatePricesForTickers);

  // Function to validate ticker and fetch company name
  const validateAndFetchTicker = async (ticker: string) => {
    if (!ticker || ticker.length < 1) {
      setTickerValidated(false);
      setValidationErrors(prev => ({ ...prev, ticker: '' }));
      return;
    }
    
    setIsFetchingCompany(true);
    setValidationErrors(prev => ({ ...prev, ticker: '' }));
    
    try {
      const result = await validateTicker({ ticker: ticker.toUpperCase() });
      
      if (result.isValid && result.companyName) {
        setFormData(prev => ({
          ...prev,
          companyName: result.companyName!
        }));
        setTickerValidated(true);
        setValidationErrors(prev => ({ ...prev, ticker: '' }));
      } else {
        setFormData(prev => ({
          ...prev,
          companyName: ""
        }));
        setTickerValidated(false);
        setValidationErrors(prev => ({ 
          ...prev, 
          ticker: result.error || 'Invalid ticker symbol' 
        }));
      }
    } catch (error) {
      console.error('Error validating ticker:', error);
      setFormData(prev => ({
        ...prev,
        companyName: ""
      }));
      setTickerValidated(false);
      setValidationErrors(prev => ({ 
        ...prev, 
        ticker: 'Failed to validate ticker. Please try again.' 
      }));
    } finally {
      setIsFetchingCompany(false);
    }
  };

  // Validation function
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    // Ticker validation
    if (!formData.ticker.trim()) {
      errors.ticker = 'Ticker is required';
    } else if (!tickerValidated) {
      errors.ticker = 'Please enter a valid ticker and wait for validation';
    }

    // Bought price validation
    if (!formData.boughtPrice.trim()) {
      errors.boughtPrice = 'Bought price is required';
    } else {
      const price = parseFloat(formData.boughtPrice);
      if (isNaN(price) || price <= 0) {
        errors.boughtPrice = 'Bought price must be a positive number';
      }
    }

    // Units held validation
    if (!formData.unitsHeld.trim()) {
      errors.unitsHeld = 'Units held is required';
    } else {
      const units = parseFloat(formData.unitsHeld);
      if (isNaN(units) || units <= 0) {
        errors.unitsHeld = 'Units held must be a positive number';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const ticker = formData.ticker.toUpperCase();
      
      // Add the holding
      await addOrUpdateHolding({
        ticker,
        companyName: formData.companyName,
        unitsHeld: parseFloat(formData.unitsHeld),
        boughtPrice: parseFloat(formData.boughtPrice),
        sector: formData.sector || undefined,
        positionType: formData.positionType,
        purchaseDate: formData.purchaseDate,
        notes: formData.notes || undefined,
      });

      // Immediately update prices for the new ticker to get current price and daily changes
      try {
        await updatePricesForTickers({ tickers: [ticker] });
        console.log(`Updated prices for newly added ticker: ${ticker}`);
      } catch (priceError) {
        console.error("Error updating prices for new ticker:", priceError);
        // Don't fail the whole operation if price update fails
      }

      // Reset form
      setFormData({
        ticker: "",
        companyName: "",
        unitsHeld: "",
        boughtPrice: "",
        sector: "",
        positionType: "long",
        purchaseDate: "",
        notes: "",
      });
      setValidationErrors({});
      setTickerValidated(false);

      // Trigger callback to refresh portfolio data
      if (onHoldingAdded) {
        onHoldingAdded();
      }

      onClose();
    } catch (error) {
      console.error("Error adding holding:", error);
      alert('Failed to add holding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors for the field being changed
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Auto-validate ticker when it changes (debounced for better UX)
    if (name === 'ticker') {
      setTickerValidated(false);
      if (value.length >= 1) {
        // Use setTimeout to debounce the validation
        const timeoutId = setTimeout(() => {
          validateAndFetchTicker(value);
        }, 500);
        return () => clearTimeout(timeoutId);
      } else {
        // Clear company name if ticker is empty
        setFormData(prev => ({
          ...prev,
          companyName: ""
        }));
        setValidationErrors(prev => ({
          ...prev,
          ticker: ''
        }));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/92 rounded-3xl border-black z-50 flex items-center justify-center p-4">
      <div className=" bg-purple-900/30 border border-white/20 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground font-mono">add new holding</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <IconX className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                  Ticker * {isFetchingCompany && <span className="text-yellow-400">(validating...)</span>}
                  {tickerValidated && <span className="text-green-400">✓</span>}
                </label>
                <input
                  type="text"
                  name="ticker"
                  value={formData.ticker}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:ring-2 uppercase ${
                    validationErrors.ticker 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : tickerValidated 
                        ? 'border-green-500 focus:ring-green-500/50'
                        : 'border-white/20 focus:ring-primary/50'
                  }`}
                  placeholder="aapl"
                  maxLength={10}
                />
                {validationErrors.ticker && (
                  <p className="text-red-400 text-xs mt-1 font-mono">{validationErrors.ticker}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                  position type
                </label>
                <select
                  name="positionType"
                  value={formData.positionType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="long">long</option>
                  <option value="short">short</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                company name {isFetchingCompany ? "(fetching...)" : "*"}
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                readOnly
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder-muted-foreground font-mono cursor-not-allowed opacity-75"
                placeholder={isFetchingCompany ? "Fetching company name..." : "Enter ticker to auto-fetch"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                 No. of Shares *
                </label>
                <input
                  type="number"
                  name="unitsHeld"
                  value={formData.unitsHeld}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:ring-2 ${
                    validationErrors.unitsHeld 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-white/20 focus:ring-primary/50'
                  }`}
                  placeholder="100"
                />
                {validationErrors.unitsHeld && (
                  <p className="text-red-400 text-xs mt-1 font-mono">{validationErrors.unitsHeld}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                  Price *
                </label>
                <input
                  type="number"
                  name="boughtPrice"
                  value={formData.boughtPrice}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:ring-2 ${
                    validationErrors.boughtPrice 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-white/20 focus:ring-primary/50'
                  }`}
                  placeholder="175.43"
                />
                {validationErrors.boughtPrice && (
                  <p className="text-red-400 text-xs mt-1 font-mono">{validationErrors.boughtPrice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                  sector
                </label>
                <input
                  type="text"
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="technology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                  purchase date *
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 font-mono">
                notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Additional notes about this position..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-foreground font-mono transition-colors"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600/70 hover:bg-primary/30 border border-primary/30 rounded-lg text-primary font-mono transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    adding...
                  </>
                ) : (
                  <>
                    <IconPlus className="h-4 w-4" />
                    add holding
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
