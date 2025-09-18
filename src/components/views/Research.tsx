"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { 
  IconPlus, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconMinus,
  IconChartLine,
  IconBuilding,
  IconSparkles,
  IconCurrencyDollar,
  IconPercentage,
  IconCalendarStats,
  IconCalendar,
  IconSettings,
  IconTrash,
  IconRefresh,
  IconExternalLink
} from "@tabler/icons-react";

interface StockData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap?: number | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  sector?: string | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  performance?: {
    ytd?: number | null;
    threeMonth?: number | null;
    oneMonth?: number | null;
  };
}

export function Research() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showManageStocks, setShowManageStocks] = useState(false);
  const [motleyFoolData, setMotleyFoolData] = useState<any>(null);
  const [isLoadingMotleyFool, setIsLoadingMotleyFool] = useState(false);
  const [hasLoadedMotleyFool, setHasLoadedMotleyFool] = useState<string | null>(null);

  const researchStocks = useQuery(api.researchActions.getAllResearchStocks);
  const fetchAndAddStock = useAction(api.researchActions.fetchAndAddStock);
  const removeStock = useMutation(api.researchActions.removeResearchStock);
  const getStockData = useAction(api.researchActions.getStockResearchData);
  const getMotleyFoolData = useAction(api.firecrawlActions.getMotleyFoolData);

  // Auto-select the most recent stock when research stocks are loaded
  useEffect(() => {
    if (researchStocks && researchStocks.length > 0 && !selectedTicker) {
      // Sort by addedDate to get the most recent
      const sortedStocks = [...researchStocks].sort((a, b) => 
        new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
      );
      setSelectedTicker(sortedStocks[0].ticker);
    }
  }, [researchStocks, selectedTicker]);

  // Load stock data when a ticker is selected
  useEffect(() => {
    if (selectedTicker) {
      setIsLoadingData(true);
      setIsLoadingMotleyFool(true);
      
      // Load basic stock data
      getStockData({ ticker: selectedTicker })
        .then((result) => {
          if (result.success && result.data) {
            setStockData(result.data);
          } else {
            console.error("Failed to fetch stock data:", result.message);
            setStockData(null);
          }
        })
        .catch((error) => {
          console.error("Error fetching stock data:", error);
          setStockData(null);
        })
        .finally(() => {
          setIsLoadingData(false);
        });

      // Load Motley Fool data (only once per ticker)
      if (hasLoadedMotleyFool !== selectedTicker) {
        getMotleyFoolData({ ticker: selectedTicker })
          .then((result) => {
            if (result.success) {
              setMotleyFoolData(result);
              setHasLoadedMotleyFool(selectedTicker);
            } else {
              console.error("Failed to fetch Motley Fool data:", result.errors);
              setMotleyFoolData(null);
            }
          })
          .catch((error) => {
            console.error("Error fetching Motley Fool data:", error);
            setMotleyFoolData(null);
          })
          .finally(() => {
            setIsLoadingMotleyFool(false);
          });
      } else {
        // Already loaded for this ticker, just stop loading state
        setIsLoadingMotleyFool(false);
      }
    } else {
      setStockData(null);
      setMotleyFoolData(null);
    }
  }, [selectedTicker, getStockData, getMotleyFoolData]);

  const handleAddStock = async () => {
    if (!newTicker.trim()) return;
    
    setIsAddingStock(true);
    try {
      const result = await fetchAndAddStock({ ticker: newTicker.trim().toUpperCase() });
      if (result.success) {
        setNewTicker("");
        // Auto-select the newly added stock
        setSelectedTicker(newTicker.trim().toUpperCase());
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Failed to add stock");
    } finally {
      setIsAddingStock(false);
    }
  };

  const handleRemoveStock = async (stockId: Id<"researchStocks">, ticker: string) => {
    if (confirm(`Remove ${ticker} from your research list?`)) {
      try {
        await removeStock({ id: stockId });
        if (selectedTicker === ticker) {
          setSelectedTicker(null);
          setStockData(null);
          setMotleyFoolData(null);
        }
      } catch (error) {
        console.error("Error removing stock:", error);
        alert("Failed to remove stock");
      }
    }
  };

  const handleRefreshData = async () => {
    if (!selectedTicker) return;
    
    setIsLoadingData(true);
    setIsLoadingMotleyFool(true);

    try {
      // Refresh both data sources
      const [stockResult, motleyFoolResult] = await Promise.all([
        getStockData({ ticker: selectedTicker }),
        getMotleyFoolData({ ticker: selectedTicker })
      ]);

      if (stockResult.success && stockResult.data) {
        setStockData(stockResult.data);
      }

      if (motleyFoolResult.success) {
        setMotleyFoolData(motleyFoolResult);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoadingData(false);
      setIsLoadingMotleyFool(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLargeNumber = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    const isPositive = value >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <IconTrendingUp className="h-4 w-4" /> : <IconTrendingDown className="h-4 w-4" />}
        {Math.abs(value).toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 relative font-mono">
      {/* Header with Add Stock Interface */}
      <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-bold text-foreground font-mono">Research</h1>
          </div>
          
          <button
            onClick={() => setShowManageStocks(!showManageStocks)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-mono ${
              showManageStocks 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-card/40 hover:bg-card/60 border border-white/20'
            }`}
          >
            <IconSettings className="h-4 w-4" />
            {showManageStocks ? 'Exit Manage' : 'Manage Stocks'}
          </button>
        </div>
        
        {/* Add Stock Form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            placeholder="Add ticker (AAPL, GOOGL, TSLA)"
            className="flex-1 px-2 py-1.5 text-sm bg-card/40 backdrop-blur-xl border border-white/20 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent font-mono"
            onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
            disabled={isAddingStock}
          />
          <button
            onClick={handleAddStock}
            disabled={isAddingStock || !newTicker.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingStock ? (
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
            ) : (
              <IconPlus className="h-3 w-3" />
            )}
            <span className="text-xs font-mono">Add</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* Left Sidebar - Ticker List */}
        <div className="lg:col-span-1 bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex flex-col">
          <div className="p-2 border-b border-white/10 flex-shrink-0">
            <h2 className="text-sm font-semibold text-foreground font-mono">
              Watchlist ({researchStocks?.length || 0})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {researchStocks?.length === 0 ? (
              <div className="text-center py-6">
                <IconChartLine className="h-6 w-6 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-mono">No stocks</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {researchStocks?.map((stock) => (
                  <div
                    key={stock._id}
                    className={`p-2 cursor-pointer transition-all duration-200 hover:bg-white/5 group ${
                      selectedTicker === stock.ticker ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                            <span className="text-primary font-bold text-xs font-mono">{stock.ticker.slice(0, 2)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-mono text-foreground truncate font-semibold">{stock.ticker}</h3>
                            {stock.currentPrice && (
                              <p className="text-xs text-primary font-mono">
                                ${stock.currentPrice.toFixed(0)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {showManageStocks && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStock(stock._id, stock.ticker);
                            }}
                            className="p-0.5 hover:bg-red-500/20 rounded transition-all text-red-400 hover:text-red-300"
                            title={`Remove ${stock.ticker}`}
                          >
                            <IconTrash className="h-2.5 w-2.5" />
                          </button>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <IconTrendingUp className="h-3 w-3 text-muted-foreground rotate-45" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Stock Analysis */}
        <div className="lg:col-span-4 bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex flex-col">
          {!selectedTicker ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <IconChartLine className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2 font-mono">Select a Stock</h3>
                <p className="font-mono">Choose a ticker from the watchlist to view detailed research data</p>
              </div>
            </div>
          ) : isLoadingData ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-mono">Loading stock data...</p>
              </div>
            </div>
          ) : stockData ? (
            <div className="h-full overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h1 className="text-xl font-bold text-foreground font-mono mb-2">
                      {stockData.ticker} - {stockData.companyName}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-lg font-bold text-foreground font-mono">
                        {formatCurrency(stockData.currentPrice)}
                      </div>
                      {formatPercentage(stockData.changePercent)}
                      <span className={`text-sm font-mono ${stockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({stockData.change >= 0 ? '+' : ''}{formatCurrency(stockData.change)})
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* 52-Week Range - Condensed */}
                    {stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground font-mono mb-1">52W Range</div>
                        <div className="flex items-center gap-2 text-sm font-mono">
                          <span className="text-red-400">{formatCurrency(stockData.fiftyTwoWeekLow)}</span>
                          <div className="w-16 h-1 bg-white/10 rounded-full relative">
                            <div 
                              className="h-1 bg-gradient-to-r from-red-500 to-green-500 rounded-full"
                              style={{
                                width: `${((stockData.currentPrice - stockData.fiftyTwoWeekLow) / (stockData.fiftyTwoWeekHigh - stockData.fiftyTwoWeekLow)) * 100}%`
                              }}
                            ></div>
                            <div 
                              className="absolute top-0 w-0.5 h-1 bg-white rounded-full"
                              style={{
                                left: `${((stockData.currentPrice - stockData.fiftyTwoWeekLow) / (stockData.fiftyTwoWeekHigh - stockData.fiftyTwoWeekLow)) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-green-400">{formatCurrency(stockData.fiftyTwoWeekHigh)}</span>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleRefreshData}
                      disabled={isLoadingData || isLoadingMotleyFool}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <IconRefresh className={`h-3 w-3 ${(isLoadingData || isLoadingMotleyFool) ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Performance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {stockData.performance?.ytd !== null && stockData.performance?.ytd !== undefined && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconTrendingUp className={`h-5 w-5 ${stockData.performance.ytd >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-sm text-muted-foreground font-mono">YTD Performance</span>
                      </div>
                      <div className="text-xl font-bold font-mono">
                        {formatPercentage(stockData.performance.ytd)}
                      </div>
                    </div>
                  )}
                  
                  {stockData.performance?.threeMonth !== null && stockData.performance?.threeMonth !== undefined && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconChartLine className={`h-5 w-5 ${stockData.performance.threeMonth >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-sm text-muted-foreground font-mono">3M Performance</span>
                      </div>
                      <div className="text-xl font-bold font-mono">
                        {formatPercentage(stockData.performance.threeMonth)}
                      </div>
                    </div>
                  )}
                  
                  {stockData.performance?.oneMonth !== null && stockData.performance?.oneMonth !== undefined && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconCalendarStats className={`h-5 w-5 ${stockData.performance.oneMonth >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-sm text-muted-foreground font-mono">1M Performance</span>
                      </div>
                      <div className="text-xl font-bold font-mono">
                        {formatPercentage(stockData.performance.oneMonth)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Comprehensive Market Analysis Section */}
                {isLoadingMotleyFool ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-blue-300/30 rounded-xl p-6 shadow-2xl relative overflow-hidden">
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="relative">
                            <div className="w-8 h-8 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 w-8 h-8 border-3 border-purple-400/20 border-r-purple-400 rounded-full animate-spin animate-reverse"></div>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-foreground font-mono">Analyzing Market Data</h3>
                            <div className="text-xs text-blue-300 font-mono">Powered by Firecrawl 🔥 & OpenAI 🧠</div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-sm font-mono text-muted-foreground">Detecting exchange (NYSE/NASDAQ)...</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
                            <span className="text-sm font-mono text-muted-foreground">Scraping Motley Fool financial data...</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-500"></div>
                            <span className="text-sm font-mono text-muted-foreground">Fetching earnings transcripts...</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-700"></div>
                            <span className="text-sm font-mono text-muted-foreground">Generating AI earnings summary...</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="text-xs text-muted-foreground font-mono italic">
                            ✨ This may take 10-30 seconds for comprehensive analysis
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Motley Fool Data Section */}
                    {motleyFoolData?.stockData ? (
                  <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl p-5 shadow-2xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-foreground font-mono">Motley Fool Data</h3>
                        <div className="text-xs text-white/60 font-mono ">Powered by Firecrawl 🔥</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {motleyFoolData.stockData.pe_ratio && motleyFoolData.stockData.pe_ratio !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">P/E Ratio</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.pe_ratio}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.market_cap && motleyFoolData.stockData.market_cap !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">Market Cap</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.market_cap}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.dividend_yield && motleyFoolData.stockData.dividend_yield !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">Dividend Yield</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.dividend_yield}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.sector && motleyFoolData.stockData.sector !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">Sector</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.sector}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.fifty_two_week_high && motleyFoolData.stockData.fifty_two_week_high !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">52W High</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.fifty_two_week_high}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.fifty_two_week_low && motleyFoolData.stockData.fifty_two_week_low !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">52W Low</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.fifty_two_week_low}</div>
                        </div>
                      )}
                    </div>
                    {motleyFoolData.stockData.description && motleyFoolData.stockData.description !== "N/A" && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-muted-foreground font-mono mb-2 text-sm">Company Description</div>
                        <div className="text-foreground font-mono font-semiboldtext-sm leading-relaxed">
                          {motleyFoolData.stockData.description}
                        </div>
                      </div>
                    )}
                  </div>
                    ) : motleyFoolData && !motleyFoolData.success ? (
                      <div className="bg-card/40 backdrop-blur-xl border border-red-300/50 rounded-xl p-4 shadow-2xl">
                        <div>
                          <h3 className="text-base font-bold text-foreground font-mono mb-1">Motley Fool Data</h3>
                          <div className="text-xs text-red-400 font-mono mb-2 font-semibold">Powered by Firecrawl 🔥</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            Failed to load data: {motleyFoolData.errors?.join(', ')}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Latest Earnings - AI Summary */}
                    {motleyFoolData?.latestEarnings && (
                      <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-300/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        {/* AI Sparkle Background Effect */}
                        <div className="absolute top-2 right-2 opacity-20">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse delay-200"></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div>
                                  <h3 className="text-base font-bold flex items-center gap-2 text-foreground font-mono">Latest Earnings Summary <IconSparkles className="size-6" /></h3>
                                  <div className="flex items-center gap-2 text-xs text-purple-300">
                                    <span className="font-mono">Powered by Firecrawl 🔥 + OpenAI 🧠</span>
                                  </div>
                                </div>
                            </div>
                          </div>
                          <a
                            href={motleyFoolData.latestEarnings.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-300/30 rounded-xl transition-all duration-300 transform hover:scale-105"
                          >
                            <IconExternalLink className="h-4 w-4" />
                            <span className="font-mono">Read Full Transcript</span>
                          </a>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono mb-2">
                            <span className="px-2 py-1 bg-purple-500/20 rounded-lg">{motleyFoolData.latestEarnings.period}</span>
                            <span>•</span>
                            <span>{motleyFoolData.latestEarnings.date}</span>
                          </div>
                          <div className="text-sm font-mono text-foreground font-semibold opacity-90">
                            {motleyFoolData.latestEarnings.title}
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="text-sm text-foreground font-mono leading-relaxed bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
                            {motleyFoolData.latestEarnings.summary}
                          </div>
                          {/* AI Badge */}
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-mono font-bold shadow-lg">
                            AI
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stockData.marketCap && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconBuilding className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-muted-foreground font-mono">Market Cap</span>
                      </div>
                      <div className="text-lg font-bold text-foreground font-mono">
                        {formatMarketCap(stockData.marketCap)}
                      </div>
                    </div>
                  )}
                  
                  {stockData.peRatio && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconPercentage className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-muted-foreground font-mono">P/E Ratio</span>
                      </div>
                      <div className="text-lg font-bold text-foreground font-mono">
                        {stockData.peRatio.toFixed(2)}
                      </div>
                    </div>
                  )}
                  
                  {stockData.dividendYield && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconCurrencyDollar className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm text-muted-foreground font-mono">Dividend Yield</span>
                      </div>
                      <div className="text-lg font-bold text-foreground font-mono">
                        {stockData.dividendYield.toFixed(2)}%
                      </div>
                    </div>
                  )}
                  
                  {stockData.sector && (
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <IconBuilding className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground font-mono">Sector</span>
                      </div>
                      <div className="text-lg font-bold text-foreground font-mono">
                        {stockData.sector}
                      </div>
                    </div>
                  )}
                </div>




              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <IconMinus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2 font-mono">No Data Available</h3>
                <p className="font-mono">Could not load data for {selectedTicker}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
