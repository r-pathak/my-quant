"use client";

import { IconTrendingUp, IconTrendingDown, IconPercentage, IconRefresh, IconPlus, IconPhoneSpark } from "@tabler/icons-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState, useCallback } from "react";
import HoldingsPieChart from "../ui/holdings-pie-chart";
import AddHoldingForm from "../ui/add-holding-form";
import NewsCarousel from "../ui/news-carousel";
import { Button } from "../ui/moving-border";

export default function Portfolio() {
  const holdings = useQuery(api.holdings.getAll);
  const portfolioSummary = useQuery(api.holdings.getPortfolioSummary);
  const updateAllPrices = useAction(api.priceActions.updateAllPrices);
  const getDailyPriceChanges = useAction(api.priceActions.getDailyPriceChanges);

  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [dailyChanges, setDailyChanges] = useState<{ [key: string]: { change: number; changePercent: number } }>({});

  const fetchDailyChanges = useCallback(async () => {
    if (holdings && holdings.length > 0) {
      try {
        const tickers = [...new Set(holdings.map(h => h.ticker))];
        console.log('Fetching daily changes for tickers:', tickers);
        const changes = await getDailyPriceChanges({ tickers });
        console.log('Daily changes received:', changes);
        setDailyChanges(changes);
      } catch (error) {
        console.error('Error fetching daily changes:', error);
      }
    }
  }, [holdings, getDailyPriceChanges]);

  // Auto-update prices every 5 minutes (less frequent to avoid constant changes)
  useEffect(() => {
    const updatePrices = async () => {
      if (holdings && holdings.length > 0 && !isUpdatingPrices) {
        setIsUpdatingPrices(true);
        try {
          console.log('Auto-updating prices...');
          const result = await updateAllPrices({});
          console.log('Auto-update result:', result);
          await fetchDailyChanges();
          setLastUpdated(new Date());
        } catch (error) {
          console.error('Error updating prices:', error);
        } finally {
          setIsUpdatingPrices(false);
        }
      }
    };

    // Initial update only if we don't have recent data (within last 10 minutes)
    if (!lastUpdated || Date.now() - lastUpdated.getTime() > 600000) { // 10 minutes
      updatePrices();
    }

    // Set up interval for auto-updates (5 minutes) only if auto-refresh is enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      interval = setInterval(updatePrices, 300000); // 5 minutes
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [holdings, updateAllPrices, lastUpdated, isUpdatingPrices, autoRefreshEnabled, fetchDailyChanges]);

  // Fetch daily changes when holdings are loaded
  useEffect(() => {
    if (holdings && holdings.length > 0) {
      console.log('Holdings loaded:', holdings);
      fetchDailyChanges();
    }
  }, [holdings, fetchDailyChanges]);

  // Calculate today's P&L based on daily price changes
  const calculateTodaysPnL = () => {
    if (!holdings || !dailyChanges) return { todaysPnL: 0, todaysPnLPercentage: 0 };

    let totalDailyChange = 0;
    let totalCurrentValue = 0;

    holdings.forEach((holding) => {
      const currentPrice = holding.currentPrice || holding.boughtPrice;
      const dailyChange = dailyChanges[holding.ticker];

      if (dailyChange) {
        // Calculate today's change for this holding
        const dailyChangeAmount = dailyChange.change * holding.unitsHeld;
        totalDailyChange += dailyChangeAmount;
      }

      totalCurrentValue += holding.unitsHeld * currentPrice;
    });

    const todaysPnLPercentage = totalCurrentValue > 0 ? (totalDailyChange / totalCurrentValue) * 100 : 0;

    return { todaysPnL: totalDailyChange, todaysPnLPercentage };
  };

  const { todaysPnL, todaysPnLPercentage } = calculateTodaysPnL();

  // All-time P&L from portfolio summary
  const allTimePnL = portfolioSummary ? portfolioSummary.totalPnL : 0;
  const allTimePnLPercentage = portfolioSummary ? portfolioSummary.totalPnLPercentage : 0;

  // Get all holdings for stock cards (sorted by total value)
  const sortedHoldings = holdings ? [...holdings].map(holding => {
    const currentPrice = holding.currentPrice || holding.boughtPrice;
    const totalValue = holding.unitsHeld * currentPrice;

    return {
      ...holding,
      totalValue
    };
  }).sort((a, b) => b.totalValue - a.totalValue) : [];


  const handleRefreshPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      console.log('Updating prices...');
      const result = await updateAllPrices({});
      console.log('Price update result:', result);
      await fetchDailyChanges();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setIsUpdatingPrices(false);
    }
  };
  return (
    <div className="flex flex-col h-full space-y-8 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground font-mono">portfolio</h1>
            <div className={`px-3 py-1 rounded-full text-sm font-mono font-medium ${todaysPnLPercentage >= 0
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
              {todaysPnLPercentage >= 0 ? '+' : ''}{todaysPnLPercentage.toFixed(2)}% today
            </div>
          </div>

          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              // TODO: Implement myquant Update agent call
              console.log('myquant Update clicked - Agent call feature coming soon!');
              alert('myquant Update: Agent call feature coming soon! 📞');
            }}
            borderRadius="0.5rem"
            className="bg-gradient-to-r cursor-pointer from-purple-900 to-pink-900 text-white font-mono border-0 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25"
            borderClassName="bg-gradient-to-r from-purple-400/20 to-pink-400/20"
            duration={4000}
          >
            <div className="flex items-center gap-2"> 
              <IconPhoneSpark className="h-5 w-5" />
              myquant update
            </div>
          </Button>
          
          <button
            onClick={() => setIsAddFormOpen(true)}
            className="flex h-10 cursor-pointer items-center gap-2 px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-white/40 rounded-lg transition-colors"
          >
            <IconPlus className="h-4 w-4" />
            <span className="text-sm font-mono">add holding</span>
          </button>
          
          <button
            onClick={handleRefreshPrices}
            disabled={isUpdatingPrices}
            className="flex h-10 cursor-pointer items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <IconRefresh className={`h-4 w-4 text-white ${isUpdatingPrices ? 'animate-spin' : ''}`} />
          </button>

          {/* <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`flex h-10 items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-mono ${autoRefreshEnabled
                ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
              }`}
          >
            Auto-Refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
          </button> */}
        </div>
      </div>

      {/* Portfolio Overview and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Portfolio Overview Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">total value</p>
                <p className="text-xl font-bold text-foreground font-mono">
                  ${portfolioSummary ? portfolioSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>
              {/* <IconDollarSign className="h-6 w-6 text-primary" /> */}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {todaysPnL >= 0 ? (
                <IconTrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <IconTrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={`text-xs font-mono ${todaysPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} title={`Today's Change: ${todaysPnL >= 0 ? '+' : ''}$${Math.abs(todaysPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                {todaysPnL >= 0 ? '+' : ''}${Math.abs(todaysPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today
              </span>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">today&apos;s p&l</p>
                <p className={`text-2xl font-bold font-mono ${todaysPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {todaysPnL >= 0 ? '+' : ''}${Math.abs(todaysPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {todaysPnL >= 0 ? (
                <IconTrendingUp className="h-8 w-8 text-green-400" />
              ) : (
                <IconTrendingDown className="h-8 w-8 text-red-400" />
              )}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <IconPercentage className={`h-4 w-4 ${todaysPnLPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-sm font-mono ${todaysPnLPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`} title={`Today's Change: ${todaysPnLPercentage >= 0 ? '+' : ''}${todaysPnLPercentage.toFixed(2)}%`}>
                {todaysPnLPercentage >= 0 ? '+' : ''}{todaysPnLPercentage.toFixed(2)}% today
              </span>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">active positions</p>
                <p className="text-2xl font-bold text-foreground font-mono">
                  {portfolioSummary ? portfolioSummary.activePositions : 0}
                </p>
              </div>
              <IconTrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-sm text-muted-foreground font-mono">
                {portfolioSummary ? `${portfolioSummary.longPositions} long, ${portfolioSummary.shortPositions} short` : '0 long, 0 short'}
              </span>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">unrealized p&l</p>
                <p className={`text-xl font-bold font-mono ${allTimePnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {allTimePnL >= 0 ? '+' : ''}${Math.abs(allTimePnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {allTimePnL >= 0 ? (
                <IconTrendingUp className="h-6 w-6 text-green-400" />
              ) : (
                <IconTrendingDown className="h-6 w-6 text-red-400" />
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <IconPercentage className={`h-3 w-3 ${allTimePnLPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-xs font-mono ${allTimePnLPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`} title={`unrealized return: ${allTimePnLPercentage >= 0 ? '+' : ''}${allTimePnLPercentage.toFixed(2)}%`}>
                {allTimePnLPercentage >= 0 ? '+' : ''}{allTimePnLPercentage.toFixed(1)}% 
              </span>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-1">
          <HoldingsPieChart holdings={holdings || []} />
        </div>
      </div>

      {/* Holdings and News Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Stock Holdings */}
        <div className="lg:col-span-2 bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '500px' }}>
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <h2 className="text-md font-semibold text-foreground font-mono">
              holdings ({sortedHoldings.length})
            </h2>
          </div>
          {sortedHoldings.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-white/10">
                
                {sortedHoldings.map((holding) => {
                  const currentPrice = holding.currentPrice || holding.boughtPrice;
                  const totalValue = holding.unitsHeld * currentPrice;
                  const costBasis = holding.unitsHeld * holding.boughtPrice;
                  const pnl = totalValue - costBasis;
                  const pnlPercentage = (pnl / costBasis) * 100;
                  const dailyChange = dailyChanges[holding.ticker];
                  const dailyValueChange = dailyChange ? dailyChange.change * holding.unitsHeld : 0;

                  return (
                    <div
                      key={holding._id}
                      onClick={() => window.location.href = `/research?ticker=${holding.ticker}`}
                      className="p-4 hover:bg-white/5 transition-all duration-200 cursor-pointer group relative"
                    >
                      {/* Mobile Layout */}
                      <div className="block sm:hidden">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                              <span className="text-primary font-bold text-sm font-mono">{'$' + holding.ticker.toLowerCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-mono text-foreground truncate">{holding.companyName.toLowerCase()}</h3>
                              <p className="text-xs text-muted-foreground font-mono">{holding.sector || 'Unknown Sector'}</p>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <IconTrendingUp className="h-4 w-4 text-muted-foreground rotate-45" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-mono">total value</span>
                            <div className="text-right">
                              <span className="text-sm font-mono font-semibold text-foreground">
                                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              {dailyChange && (
                                <div className={`text-xs font-mono ${dailyValueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {dailyValueChange >= 0 ? '+' : '-'}${Math.abs(dailyValueChange).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-mono">current price</span>
                            <div className="flex flex-row items-center gap-2">
                              <span className="text-sm font-mono text-foreground">${currentPrice.toFixed(2)}</span>
                              {dailyChange && (
                                <div className={`flex flex-row items-center gap-1 ${dailyChange.change >= 0 ? 'text-green-400' : 'text-red-400'
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
                            <span className="text-xs text-muted-foreground font-mono">bought price</span>
                            <span className="text-sm font-mono text-foreground">${holding.boughtPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-mono">shares</span>
                            <span className="text-sm font-mono text-foreground">{holding.unitsHeld}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <span className="text-xs text-muted-foreground font-mono">p&l</span>
                            <div className="text-right">
                              <div className={`text-sm font-mono font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                              <div className={`text-xs font-mono ${pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:block">
                        <div className="flex items-center justify-between">
                          {/* Left side - Ticker and Company */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                              <span className="text-primary font-bold text-sm font-mono">{holding.ticker.toLowerCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-mono text-foreground truncate">{holding.companyName.toLowerCase()}</h3>
                            </div>
                          </div>

                          {/* Right side - All financial data */}
                          <div className="flex items-center gap-8 flex-1 justify-end">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground font-mono">current price</p>
                              <div className="flex flex-row items-center gap-2 justify-end">
                                <p className="text-sm font-mono font-semibold text-foreground">${currentPrice.toFixed(2)}</p>
                                {dailyChange && (
                                  <div className={`flex flex-row items-center gap-1 ${dailyChange.change >= 0 ? 'text-green-400' : 'text-red-400'
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
                            <div className="text-right">
                            <p className="text-xs text-muted-foreground font-mono">bought price</p>
                              <p className="text-sm font-mono text-foreground">${holding.boughtPrice.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground font-mono">shares</p>
                              <p className="text-sm font-mono text-foreground">{holding.unitsHeld}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground font-mono">total value</p>
                              <p className="text-sm font-mono font-semibold text-foreground">
                                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </p>
                              {dailyChange && (
                                <div className={`text-xs font-mono ${dailyValueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {dailyValueChange >= 0 ? '+' : '-'}${Math.abs(dailyValueChange).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground font-mono">p&l</p>
                              <div className={`text-sm font-mono font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>  
                                {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                              <div className={`text-xs font-mono ${pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(1)}%
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <IconTrendingUp className="h-4 w-4 text-muted-foreground rotate-45" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-mono">no holdings found. Add some positions to get started!</p>
            </div>
          )}
        </div>

        {/* News Carousel */}
        <div className="lg:col-span-1">
          <NewsCarousel holdings={sortedHoldings.slice(0, 5)} />
        </div>
      </div>

      {/* Add Holding Form Modal */}
      <AddHoldingForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
      />
    </div>
  );
}
