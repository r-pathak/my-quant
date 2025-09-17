"use client";

import { GlareCard } from "./glare-card";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface StockCardProps {
  holding: {
    _id: string;
    ticker: string;
    companyName: string;
    unitsHeld: number;
    boughtPrice: number;
    currentPrice?: number;
    sector?: string;
  };
  dailyChange?: {
    change: number;
    changePercent: number;
  };
}

export default function StockCard({ holding, dailyChange }: StockCardProps) {
  const router = useRouter();
  
  const currentPrice = holding.currentPrice || holding.boughtPrice;
  const totalValue = holding.unitsHeld * currentPrice;
  const costBasis = holding.unitsHeld * holding.boughtPrice;
  const pnl = totalValue - costBasis;
  const pnlPercentage = (pnl / costBasis) * 100;
  
  const handleClick = () => {
    router.push(`/stock?ticker=${holding.ticker}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <GlareCard className="p-6 flex flex-col h-full bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:bg-card/60 transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <span className="text-primary font-bold text-sm font-mono">{holding.ticker}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-mono truncate">
                {holding.companyName}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
            pnlPercentage >= 0 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {pnlPercentage >= 0 ? (
              <IconTrendingUp className="h-4 w-4" />
            ) : (
              <IconTrendingDown className="h-4 w-4" />
            )}
            <span className="text-sm font-mono font-medium">
              {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Main Content - Better Spaced */}
        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-mono">Value</span>
            <span className="text-base font-mono font-semibold text-foreground">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-mono">Shares</span>
            <span className="text-sm font-mono text-foreground">{holding.unitsHeld}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-mono">Current Price</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-foreground">${currentPrice.toFixed(2)}</span>
              {dailyChange && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                  dailyChange.change >= 0 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {dailyChange.change >= 0 ? (
                    <IconTrendingUp className="h-3 w-3" />
                  ) : (
                    <IconTrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs font-mono">
                    {dailyChange.change >= 0 ? '+' : ''}{dailyChange.change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground font-mono">Bought Price</span>
            <span className="text-sm font-mono text-foreground">${holding.boughtPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* All-time P&L */}
        <div className={`mt-5 p-4 rounded-xl ${
          pnl >= 0 
            ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
            : 'bg-red-500/15 text-red-400 border border-red-500/20'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-mono">All-time P&L</span>
            <span className="text-sm font-mono font-semibold">
              {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </GlareCard>
    </div>
  );
}
