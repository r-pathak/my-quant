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
  IconCurrencyDollar,
  IconPercentage,
  IconCalendarStats,
  IconTrash,
  IconRefresh,
  IconExternalLink
} from "@tabler/icons-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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
    oneYear?: number | null;
    twoYear?: number | null;
  };
}

export function Research({ initialTicker }: { initialTicker?: string }) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [newTicker, setNewTicker] = useState("");
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showManageStocks, setShowManageStocks] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'fundamentals' | 'technicals' | 'wallstreetbets'>('fundamentals');
  const [motleyFoolData, setMotleyFoolData] = useState<{
    success: boolean;
    stockData?: {
      pe_ratio?: string;
      market_cap?: string;
      dividend_yield?: string;
      sector?: string;
      fifty_two_week_high?: string;
      fifty_two_week_low?: string;
      description?: string;
    };
    latestEarnings?: {
      title: string;
      date: string;
      period: string;
      summary: string;
      url: string;
    };
    errors?: string[];
  } | null>(null);
  const [isLoadingMotleyFool, setIsLoadingMotleyFool] = useState(false);
  const [hasLoadedMotleyFool, setHasLoadedMotleyFool] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // WallStreetBets states
  const [wsbData, setWsbData] = useState<{
    posts: Array<{
      title: string;
      url: string;
      author: string;
      score: number;
      comments: number;
      created: string;
      content?: string;
    }>;
    sentiment: {
      overall: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
      summary: string;
      keyThemes: string[];
    };
  } | null>(null);
  const [isLoadingWSB, setIsLoadingWSB] = useState(false);
  
  // Handle initial ticker from query params
  useEffect(() => {
    if (initialTicker && !selectedTicker) {
      setSelectedTicker(initialTicker.toUpperCase());
    }
  }, [initialTicker, selectedTicker]);

  // Convex hooks - must be declared before useEffect that uses them
  const researchStocks = useQuery(api.researchActions.getAllResearchStocks);
  const fetchAndAddStock = useAction(api.researchActions.fetchAndAddStock);
  const removeStock = useMutation(api.researchActions.removeResearchStock);
  const getStockData = useAction(api.researchActions.getStockResearchData);
  const getMotleyFoolData = useAction(api.firecrawlActions.getMotleyFoolData);
  const getChartData = useAction(api.chartActions.getChartData);
  const fetchWallStreetBetsData = useAction(api.wallstreetbetsActions.fetchWallStreetBetsData);
  const getCachedMotleyFoolData = useQuery(api.researchActions.getCachedMotleyFoolData, 
    selectedTicker ? { ticker: selectedTicker } : "skip");
  const updateMotleyFoolData = useMutation(api.researchActions.updateMotleyFoolData);

  // Clear WSB data when ticker changes
  useEffect(() => {
    setWsbData(null);
  }, [selectedTicker]);

  // Auto-load WSB data when switching to wallstreetbets tab
  useEffect(() => {
    if (activeTab === 'wallstreetbets' && selectedTicker && !wsbData && !isLoadingWSB) {
      // Wait a bit to ensure stockData is loaded for the current ticker
      const timer = setTimeout(() => {
        setIsLoadingWSB(true);
        // Get company name from stock data or research stocks
        const companyName = stockData?.companyName || 
          researchStocks?.find(stock => stock.ticker === selectedTicker)?.companyName;
        
        console.log(`Loading WSB data for ${selectedTicker} (${companyName}) - stockData:`, stockData?.ticker, stockData?.companyName);
        
        fetchWallStreetBetsData({ 
          ticker: selectedTicker,
          companyName: companyName 
        })
          .then((result) => {
            setWsbData(result);
          })
          .catch((error) => {
            console.error('Error auto-loading WSB data:', error);
          })
          .finally(() => {
            setIsLoadingWSB(false);
          });
      }, 500); // Wait 500ms for stock data to load

      return () => clearTimeout(timer);
    }
  }, [activeTab, selectedTicker, wsbData, isLoadingWSB, fetchWallStreetBetsData, stockData, researchStocks]);
  
  // Technical analysis states
  const [chartData, setChartData] = useState<{
    chartData: Array<{
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
      sma20?: number;
      sma50?: number;
      rsi?: number;
      bollingerUpper?: number;
      bollingerMiddle?: number;
      bollingerLower?: number;
    }>;
    dataPoints?: number;
    period?: string;
    meta?: {
      currency?: string;
      regularMarketPrice?: number;
    };
  } | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '1d' | '1wk' | '1mo'>('1d');
  const [indicators, setIndicators] = useState<{
    rsi: boolean;
    bollinger: boolean;
    sma20: boolean;
    sma50: boolean;
  }>({
    rsi: false,
    bollinger: false,
    sma20: false,
    sma50: false,
  });

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
      
      // Always fetch fresh stock data
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
    } else {
      setStockData(null);
      setMotleyFoolData(null);
    }
  }, [selectedTicker, getStockData]);

  // Handle cached Motley Fool data with background updates
  useEffect(() => {
    if (selectedTicker && getCachedMotleyFoolData) {
      if (getCachedMotleyFoolData.data) {
        // Use cached data immediately
        setMotleyFoolData(getCachedMotleyFoolData.data);
        setHasLoadedMotleyFool(selectedTicker);
        setIsLoadingMotleyFool(false);
        
        // If data needs update, fetch in background
        if (getCachedMotleyFoolData.needsUpdate) {
          console.log(`Motley Fool data for ${selectedTicker} is stale, updating in background...`);
          getMotleyFoolData({ ticker: selectedTicker })
            .then((result) => {
              if (result.success) {
                // Update the database with fresh data
                const dataWithTimestamp = {
                  ...result,
                  lastFetched: new Date().toISOString()
                };
                updateMotleyFoolData({ ticker: selectedTicker, motleyFoolData: dataWithTimestamp });
                setMotleyFoolData(result);
              }
            })
            .catch((error) => {
              console.error("Error updating Motley Fool data in background:", error);
            });
        }
      } else {
        // No cached data, fetch fresh
        setIsLoadingMotleyFool(true);
        getMotleyFoolData({ ticker: selectedTicker })
          .then((result) => {
            if (result.success) {
              const dataWithTimestamp = {
                ...result,
                lastFetched: new Date().toISOString()
              };
              updateMotleyFoolData({ ticker: selectedTicker, motleyFoolData: dataWithTimestamp });
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
      }
    }
  }, [selectedTicker, getCachedMotleyFoolData, getMotleyFoolData, updateMotleyFoolData, hasLoadedMotleyFool]);

  // Load chart data when switching to technicals tab or changing timeframe
  useEffect(() => {
    if (selectedTicker && activeTab === 'technicals') {
      setIsLoadingChart(true);
      getChartData({ ticker: selectedTicker, timeframe })
        .then((result) => {
          if (result.success) {
            setChartData(result.data);
          } else {
            console.error("Failed to fetch chart data:", 'error' in result ? result.error : 'Unknown error');
            setChartData(null);
          }
        })
        .catch((error) => {
          console.error("Error fetching chart data:", error);
          setChartData(null);
        })
        .finally(() => {
          setIsLoadingChart(false);
        });
    }
  }, [selectedTicker, activeTab, timeframe, getChartData]);

  const handleAddStock = async () => {
    if (!newTicker.trim()) return;
    
    setIsAddingStock(true);
    try {
      const result = await fetchAndAddStock({ ticker: newTicker.trim().toUpperCase() });
      if (result.success) {
        setNewTicker("");
        setShowAddStockModal(false);
        // Auto-select the newly added stock
        setSelectedTicker(newTicker.trim().toUpperCase());
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error adding stock:", error);
        alert("failed to add stock");
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
        alert("failed to remove stock");
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

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        timestamp: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume?: number;
        sma20?: number;
        sma50?: number;
        rsi?: number;
        bollingerMiddle?: number;
      };
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/98 backdrop-blur-xl border border-white/40 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-muted-foreground font-mono mb-2">
            {new Date(data.timestamp).toLocaleDateString()} {new Date(data.timestamp).toLocaleTimeString()}
          </p>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">open:</span>
              <span className="text-foreground font-semibold">{formatCurrency(data.open)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">high:</span>
              <span className="text-green-400 font-semibold">{formatCurrency(data.high)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">low:</span>
              <span className="text-red-400 font-semibold">{formatCurrency(data.low)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">close:</span>
              <span className="text-foreground font-semibold">{formatCurrency(data.close)}</span>
            </div>
            {data.volume && (
              <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                <span className="text-muted-foreground">volume:</span>
                <span className="text-white font-semibold">{(data.volume / 1000000).toFixed(1)}M</span>
              </div>
            )}
            {/* Technical Indicators - only show selected ones */}
            {((indicators.sma20 && data.sma20) || (indicators.sma50 && data.sma50) || (indicators.rsi && data.rsi) || (indicators.bollinger && data.bollingerMiddle)) && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                {indicators.sma20 && data.sma20 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-green-400 text-xs">sma20:</span>
                    <span className="text-green-400 text-xs font-semibold">{formatCurrency(data.sma20)}</span>
                  </div>
                )}
                {indicators.sma50 && data.sma50 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-yellow-400 text-xs">sma50:</span>
                    <span className="text-yellow-400 text-xs font-semibold">{formatCurrency(data.sma50)}</span>
                  </div>
                )}
                {indicators.rsi && data.rsi && (
                  <div className="flex justify-between gap-4">
                    <span className="text-white text-xs">rsi:</span>
                    <span className="text-white text-xs font-semibold">{data.rsi.toFixed(1)}</span>
                  </div>
                )}
                {indicators.bollinger && data.bollingerMiddle && (
                  <div className="flex justify-between gap-4">
                    <span className="text-blue-400 text-xs">bb mid:</span>
                    <span className="text-blue-400 text-xs font-semibold">{formatCurrency(data.bollingerMiddle)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
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
    <div className="flex flex-col h-full relative font-mono">
      {/* Title */}
      <div className="flex items-center justify-between mb-4 px-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-mono">research watchlist</h1>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0 p-4">
        {/* Left Sidebar - Ticker List */}
        <div className="lg:col-span-1 bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex flex-col">
          <div className="p-2 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm ml-2 font-semibold text-foreground font-mono">
                your list ({researchStocks?.length || 0})
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAddStockModal(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-white/20 hover:bg-primary/30 rounded-lg transition-colors font-mono"
                >
                  <IconPlus className="h-3 w-3" />
                  add
                </button>
                <button
                  onClick={() => setShowManageStocks(!showManageStocks)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs font-mono ${
                    showManageStocks 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-card/40 hover:bg-card/60 border border-white/20'
                  }`}
                >
                  {showManageStocks ? 'done' : 'edit'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {researchStocks?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 px-4">
                <div className="relative mb-6">
                  {/* Animated background circles */}
                  <div className="absolute inset-0 -m-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 -m-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-full animate-pulse delay-300"></div>
                  </div>
                  <IconChartLine className="h-8 w-8 mx-auto text-primary relative z-10" />
                </div>
                <h3 className="text-sm font-bold text-foreground font-mono mb-2">your followed stocks list is empty</h3>
                <p className="text-xs text-muted-foreground font-mono mb-4 leading-relaxed">
                  add stocks to start your<br />research journey
                </p>
                <button
                  onClick={() => setShowAddStockModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 border border-blue-400/30 rounded-lg transition-all duration-300 transform hover:scale-105 font-mono shadow-lg shadow-blue-500/20"
                >
                  <IconPlus className="h-4 w-4" />
                  add your first stock
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {researchStocks?.map((stock) => (
                  <div
                    key={stock._id}
                    className={`p-2 cursor-pointer transition-all duration-300 group relative overflow-hidden ${
                      selectedTicker === stock.ticker 
                        ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-cyan-500/20 border border-blue-400/40 rounded-lg shadow-lg shadow-blue-500/20 z-10' 
                        : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedTicker(stock.ticker)}
                  >
                    {selectedTicker === stock.ticker && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-cyan-500/10 animate-pulse" />
                    )}
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                            selectedTicker === stock.ticker 
                              ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-blue-400/50 shadow-lg' 
                              : 'bg-primary/20 border-primary/30'
                          }`}>
                            <span className={`font-bold text-xs font-mono ${
                              selectedTicker === stock.ticker ? 'text-white' : 'text-primary'
                            }`}>{stock.ticker.slice(0, 2).toLowerCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-xs font-mono truncate font-semibold transition-colors duration-300 ${
                              selectedTicker === stock.ticker ? 'text-white' : 'text-foreground'
                            }`}>{stock.ticker.toLowerCase()}</h3>
                            {stock.currentPrice && (
                              <p className={`text-xs font-mono transition-colors duration-300 ${
                                selectedTicker === stock.ticker ? 'text-blue-200' : 'text-primary'
                              }`}>
                                ${stock.currentPrice.toFixed(2)}
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
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                {researchStocks?.length === 0 ? (
                  /* Empty watchlist state */
                  <div className="space-y-6">
                    <div className="relative">
                      {/* Main icon with gradient background */}
                      <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-full"></div>
                        <div className="absolute inset-2 bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-cyan-500/30 rounded-full"></div>
                        <IconChartLine className="h-12 w-12 absolute inset-0 m-auto text-primary z-10" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-foreground font-mono bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        welcome to research
                      </h2>
                      <p className="text-muted-foreground font-mono leading-relaxed text-sm">
                        start building your investment research by adding stocks to your followed stocks list. 
                        get comprehensive analysis, earnings summaries, and technical charts.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-xs">
                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-lg p-3 text-center">
                          {/* <IconSparkles className="h-5 w-5 text-blue-400 mb-2 mx-auto" /> */}
                          <div className="font-mono font-semibold text-blue-300">ai earnings</div>
                          <div className="text-muted-foreground font-mono">powered by firecrawl & openai</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-400/20 rounded-lg p-3 text-center">
                          <IconChartLine className="h-5 w-5 text-purple-400 mb-2 mx-auto" />
                          <div className="font-mono font-semibold text-purple-300">technical analysis</div>
                          <div className="text-muted-foreground font-mono">charts & indicators</div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-lg p-3 text-center">
                          <IconBuilding className="h-5 w-5 text-cyan-400 mb-2 mx-auto" />
                          <div className="font-mono font-semibold text-cyan-300">fundamentals</div>
                          <div className="text-muted-foreground font-mono">key metrics & data</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowAddStockModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 border border-blue-400/30 rounded-xl transition-all duration-300 transform hover:scale-105 font-mono shadow-lg shadow-blue-500/20 mt-4"
                      >
                        <IconPlus className="h-5 w-5" />
                        add your first stock
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Has stocks but none selected */
                  <div className="text-muted-foreground space-y-4">
                    <div className="relative mx-auto w-20 h-20 mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"></div>
                      <IconChartLine className="h-10 w-10 absolute inset-0 m-auto text-primary z-10" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 font-mono text-foreground">select a stock</h3>
                    <p className="font-mono text-sm leading-relaxed">
                      choose a ticker from your followed stocks to view detailed research data, 
                      ai-powered earnings summaries, and technical analysis.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : isLoadingData ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-mono">loading stock data...</p>
              </div>
            </div>
          ) : stockData ? (
            <div className="h-full overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h1 className="text-xl font-bold text-foreground font-mono mb-2">
                      {stockData.ticker.toLowerCase()} - {stockData.companyName.toLowerCase()}
                    </h1>
                    <div className="flex items-center gap-2 mt-1 mb-3">
                      <div className="text-lg font-bold text-foreground font-mono">
                        {formatCurrency(stockData.currentPrice)}
                      </div>
                      {formatPercentage(stockData.changePercent)}
                      <span className={`text-sm font-mono ${stockData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({stockData.change >= 0 ? '+' : ''}{formatCurrency(stockData.change)})
                      </span>
                    </div>
                    
                    {/* Tab Navigation - Below Price */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setActiveTab('fundamentals')}
                        className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all duration-300 relative overflow-hidden ${
                          activeTab === 'fundamentals'
                            ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 text-white shadow-lg shadow-blue-500/20 transform scale-105 z-10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                        }`}
                      >
                        {activeTab === 'fundamentals' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse" />
                        )}
                        <span className="relative z-10 flex items-center gap-1">
                        fundamentals
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('technicals')}
                        className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all duration-300 relative overflow-hidden ${
                          activeTab === 'technicals'
                            ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 text-white shadow-lg shadow-blue-500/20 transform scale-105 z-10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                        }`}
                      >
                        {activeTab === 'technicals' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse" />
                        )}
                        <span className="relative z-10 flex items-center gap-1">
                          technicals
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('wallstreetbets')}
                        className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all duration-300 relative overflow-hidden ${
                          activeTab === 'wallstreetbets'
                            ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 text-white shadow-lg shadow-blue-500/20 transform scale-105 z-10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                        }`}
                      >
                        {activeTab === 'wallstreetbets' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse" />
                        )}
                        <span className="relative z-10 flex items-center gap-1">
                          r/wallstreetbets
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* 52-Week Range - Condensed */}
                    {stockData.fiftyTwoWeekHigh && stockData.fiftyTwoWeekLow && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground font-mono mb-1">52w range</div>
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
                    
                    <div className="flex items-center gap-2">
                      {/* Add to Watchlist Button - only show if not in watchlist */}
                      {selectedTicker && !researchStocks?.some(stock => stock.ticker === selectedTicker) && (
                        <button
                          onClick={async () => {
                            if (!selectedTicker) return;
                            setIsAddingStock(true);
                            try {
                              const result = await fetchAndAddStock({ ticker: selectedTicker });
                              if (result.success) {
                                // Stock added successfully - it will appear in the list automatically
                              } else {
                                alert(result.message);
                              }
                            } catch (error) {
                              console.error("Error adding stock:", error);
                              alert("Failed to add stock to watchlist");
                            } finally {
                              setIsAddingStock(false);
                            }
                          }}
                          disabled={isAddingStock}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors disabled:opacity-50 font-mono"
                        >
                          <IconPlus className="h-4 w-4" />
                          {isAddingStock ? 'adding...' : 'add to watchlist'}
                        </button>
                      )}
                      
                      <button
                        onClick={async () => {
                          await handleRefreshData();
                        // Also load WSB data if on that tab
                        if (activeTab === 'wallstreetbets' && selectedTicker) {
                          setIsLoadingWSB(true);
                          try {
                            const companyName = stockData?.companyName || 
                              researchStocks?.find(stock => stock.ticker === selectedTicker)?.companyName;
                            console.log(`Refreshing WSB data for ${selectedTicker} (${companyName})`);
                            const result = await fetchWallStreetBetsData({ 
                              ticker: selectedTicker,
                              companyName: companyName 
                            });
                            setWsbData(result);
                          } catch (error) {
                            console.error('Error fetching WSB data:', error);
                          } finally {
                            setIsLoadingWSB(false);
                          }
                        }
                        }}
                        disabled={isLoadingData || isLoadingMotleyFool || isLoadingWSB}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <IconRefresh className={`h-5 w-5 text-white ${(isLoadingData || isLoadingMotleyFool || isLoadingWSB) ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>


              <div className="p-4 space-y-4">
                {/* Fundamentals Tab Content */}
                {activeTab === 'fundamentals' && (
                  <>
                  {/* Performance Overview */}
                  <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
                    <h3 className="text-base font-bold text-foreground font-mono mb-4">performance overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {stockData.performance?.twoYear !== null && stockData.performance?.twoYear !== undefined && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground font-mono mb-1">2y</div>
                          <div className={`text-lg font-bold font-mono ${stockData.performance.twoYear >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stockData.performance.twoYear >= 0 ? '+' : ''}{stockData.performance.twoYear.toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {stockData.performance?.oneYear !== null && stockData.performance?.oneYear !== undefined && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground font-mono mb-1">1y</div>
                          <div className={`text-lg font-bold font-mono ${stockData.performance.oneYear >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stockData.performance.oneYear >= 0 ? '+' : ''}{stockData.performance.oneYear.toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {stockData.performance?.ytd !== null && stockData.performance?.ytd !== undefined && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground font-mono mb-1">ytd</div>
                          <div className={`text-lg font-bold font-mono ${stockData.performance.ytd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stockData.performance.ytd >= 0 ? '+' : ''}{stockData.performance.ytd.toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {stockData.performance?.threeMonth !== null && stockData.performance?.threeMonth !== undefined && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground font-mono mb-1">3m</div>
                          <div className={`text-lg font-bold font-mono ${stockData.performance.threeMonth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stockData.performance.threeMonth >= 0 ? '+' : ''}{stockData.performance.threeMonth.toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {stockData.performance?.oneMonth !== null && stockData.performance?.oneMonth !== undefined && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground font-mono mb-1">1m</div>
                          <div className={`text-lg font-bold font-mono ${stockData.performance.oneMonth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stockData.performance.oneMonth >= 0 ? '+' : ''}{stockData.performance.oneMonth.toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
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
                            <h3 className="text-base font-bold text-foreground font-mono">analyzing market data</h3>
                            <div className="text-xs text-blue-300 font-mono">powered by firecrawl 🔥 & openai 🧠</div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-sm font-mono text-muted-foreground">detecting exchange (NYSE/NASDAQ)...</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
                            <span className="text-sm font-mono text-muted-foreground">scraping motley fool financial data...</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-500"></div>
                            <span className="text-sm font-mono text-muted-foreground">fetching earnings transcripts...</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-700"></div>
                            <span className="text-sm font-mono text-muted-foreground">generating AI earnings summary...</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="text-xs text-muted-foreground font-mono italic">
                            ✨ this may take 10-30 seconds for comprehensive analysis
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
                        <h3 className="text-base font-bold text-foreground font-mono">motley fool data</h3>
                        <div className="text-xs text-white/60 font-mono ">powered by firecrawl 🔥</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {motleyFoolData.stockData.pe_ratio && motleyFoolData.stockData.pe_ratio !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">p/e ratio</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.pe_ratio}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.market_cap && motleyFoolData.stockData.market_cap !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">market cap</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.market_cap}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.dividend_yield && motleyFoolData.stockData.dividend_yield !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">dividend yield</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.dividend_yield}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.sector && motleyFoolData.stockData.sector !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">sector</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.sector.toLowerCase()}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.fifty_two_week_high && motleyFoolData.stockData.fifty_two_week_high !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">52w high</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.fifty_two_week_high}</div>
                        </div>
                      )}
                      {motleyFoolData.stockData.fifty_two_week_low && motleyFoolData.stockData.fifty_two_week_low !== "N/A" && (
                        <div>
                          <div className="text-muted-foreground font-mono mb-1">52w low</div>
                          <div className="text-foreground font-bold font-mono text-base">{motleyFoolData.stockData.fifty_two_week_low}</div>
                        </div>
                      )}
                    </div>
                    {motleyFoolData.stockData.description && motleyFoolData.stockData.description !== "N/A" && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-muted-foreground font-mono mb-2 text-sm">description</div>
                          <div className="group cursor-pointer">
                            <div 
                              className="text-foreground font-mono font-semibold text-sm leading-relaxed transition-all duration-300 ease-in-out"
                              style={{
                                display: isDescriptionExpanded ? 'block' : '-webkit-box',
                                WebkitLineClamp: isDescriptionExpanded ? 'unset' : 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: isDescriptionExpanded ? 'visible' : 'hidden',
                              }}
                              onClick={() => {
                                setIsDescriptionExpanded(!isDescriptionExpanded);
                              }}
                            >
                              {motleyFoolData.stockData.description.toLowerCase()}
                            </div>
                            <div 
                              className="text-xs text-muted-foreground font-mono mt-1 opacity-60 transition-opacity duration-300 cursor-pointer hover:opacity-80"
                              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            >
                              {isDescriptionExpanded ? 'Click to show less...' : 'Click to read more...'}
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
                    ) : motleyFoolData && !motleyFoolData.success ? (
                      <div className="bg-card/40 backdrop-blur-xl border border-red-300/50 rounded-xl p-4 shadow-2xl">
                        <div>
                          <h3 className="text-base font-bold text-foreground font-mono mb-1">Motley Fool Data</h3>
                          <div className="text-xs text-red-400 font-mono mb-2 font-semibold">powered by firecrawl 🔥</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            Failed to load data: {motleyFoolData.errors?.join(', ')}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Latest Earnings - AI Summary */}
                    {motleyFoolData?.latestEarnings && (
                      <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-300/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                        {/* AI Sparkle Background Effect - only show when loading */}
                        {isLoadingMotleyFool && (
                          <div className="absolute top-2 right-2 opacity-20">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-100"></div>
                              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse delay-200"></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div>
                                  <h3 className="text-base font-bold flex items-center gap-2 text-foreground font-mono">
                                    latest earnings summary </h3>
                                  <div className="flex items-center gap-2 text-xs text-purple-300">
                                    <span className="font-mono">powered by firecrawl 🔥 + openai 🧠</span>
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
                            <span className="font-mono">full transcript</span>
                          </a>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono mb-2">
                            <span className="px-2 py-1 bg-purple-500/20 rounded-lg">{motleyFoolData.latestEarnings.period.toLowerCase()}</span>
                            <span>•</span>
                            <span>{motleyFoolData.latestEarnings.date.toLowerCase()}</span>
                          </div>
                          {/* <div className="text-sm font-mono text-foreground font-semibold opacity-90">
                            {motleyFoolData.latestEarnings.title.toLowerCase()}
                          </div> */}
                        </div>
                        
                        <div className="relative">
                          <div className="text-sm text-foreground font-mono leading-relaxed bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-4 border border-white/10">
                            {motleyFoolData.latestEarnings.summary.toLowerCase()}
                          </div>
                          {/* AI Badge
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-mono font-bold shadow-lg">
                            AI
                          </div> */}
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
                        <span className="text-sm text-muted-foreground font-mono">market cap</span>
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
                        <span className="text-sm text-muted-foreground font-mono">p/e ratio</span>
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
                        <span className="text-sm text-muted-foreground font-mono">dividend yield</span>
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
                        <span className="text-sm text-muted-foreground font-mono">sector</span>
                      </div>
                      <div className="text-lg font-bold text-foreground font-mono">
                        {stockData.sector.toLowerCase()}
                      </div>
                    </div>
                  )}
                </div>
                  </>
                )}

                {/* Technicals Tab Content */}
                {activeTab === 'technicals' && (
                  <>
                    {/* Chart Controls */}
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-foreground font-mono">chart controls</h3>
                      </div>
                      
                      <div>
                        <div className="flex flex-row items-center gap-6">
                          {/* Timeframe Selection */}
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-medium text-muted-foreground font-mono whitespace-nowrap">
                              timeframe:
                            </label>
                            <div className="flex gap-2">
                              {(['1h', '1d', '1wk', '1mo'] as const).map((tf) => (
                                <button
                                  key={tf}
                                  onClick={() => setTimeframe(tf)}
                                  className={`px-2 py-1 text-xs font-mono rounded-md transition-colors ${
                                    timeframe === tf
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'bg-card/40 hover:bg-card/60 border border-white/20 text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {tf.toLowerCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Indicators */}
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-medium text-muted-foreground font-mono whitespace-nowrap">
                              indicators:
                            </label>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(indicators).map(([key, value]) => (
                                <button
                                  key={key}
                                  onClick={() => setIndicators(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                  className={`px-2 py-1 text-xs font-mono rounded-md transition-colors ${
                                    value
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : 'bg-card/40 hover:bg-card/60 border border-white/20 text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {key.toLowerCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Chart */}
                    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl">
                      <div className="p-4 border-b border-white/10">
                        <h3 className="text-lg font-bold text-foreground font-mono">price chart</h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {stockData.ticker.toLowerCase()} • {timeframe.toLowerCase()} • {Object.entries(indicators).filter(([, v]) => v).map(([k]) => k.toLowerCase()).join(', ') || 'No indicators'}
                        </p>
                      </div>
                      
                      <div className="p-4">
                        {isLoadingChart ? (
                          <div className="h-96 flex items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                              <p className="text-sm text-muted-foreground font-mono">loading chart data...</p>
                            </div>
                          </div>
                        ) : chartData ? (
                          <div className="h-[600px] bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-lg border border-white/10 p-4">
                            <div className="h-full flex flex-col">
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-sm font-mono text-muted-foreground">
                                  {chartData.dataPoints || chartData.chartData?.length || 0} data points • {chartData.meta?.currency || 'usd'} • {chartData.period}
                                </div>
                                <div className="text-sm font-mono text-foreground">
                                  latest: {chartData.meta?.regularMarketPrice ? formatCurrency(chartData.meta.regularMarketPrice) : '--'}
                                </div>
                              </div>
                              
                              <div className="flex-1 flex flex-col">
                                {/* Main Price Chart */}
                                <div className={`${indicators.rsi ? 'h-3/4' : 'h-full'}`}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.chartData} margin={{ top: 5, right: 30, left: 20, bottom: indicators.rsi ? 5 : 20 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                      {!indicators.rsi && (
                                        <XAxis 
                                          dataKey="timestamp"
                                          tickFormatter={(value) => {
                                            const date = new Date(value);
                                            if (timeframe === '1h') {
                                              // For hourly charts, show day and time
                                              return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                                                     date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            } else if (timeframe === '1d') {
                                              // For daily charts, show month/year for better readability
                                              return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                            } else if (timeframe === '1wk') {
                                              return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                            } else {
                                              return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                            }
                                          }}
                                          interval={timeframe === '1h' ? Math.floor((chartData.chartData?.length || 0) / 6) : "preserveStartEnd"}
                                          stroke="rgba(255,255,255,0.6)"
                                          fontSize={10}
                                          fontFamily="monospace"
                                        />
                                      )}
                                      <YAxis 
                                        domain={['dataMin - 5', 'dataMax + 5']}
                                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                                        stroke="rgba(255,255,255,0.6)"
                                        fontSize={10}
                                        fontFamily="monospace"
                                      />
                                      <Tooltip content={<CustomTooltip />} />
                                      
                                      {/* Main price line */}
                                      <Line 
                                        type="monotone" 
                                        dataKey="close" 
                                        stroke="rgba(255, 255, 255, 0.8)" 
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: 'rgba(255, 255, 255, 0.8)' }}
                                      />
                                      
                                      {/* SMA 20 */}
                                      {indicators.sma20 && (
                                        <Line 
                                          type="monotone" 
                                          dataKey="sma20" 
                                          stroke="#10b981" 
                                          strokeWidth={1.5}
                                          strokeDasharray="5 5"
                                          dot={false}
                                          connectNulls={false}
                                        />
                                      )}
                                      
                                      {/* SMA 50 */}
                                      {indicators.sma50 && (
                                        <Line 
                                          type="monotone" 
                                          dataKey="sma50" 
                                          stroke="#f59e0b" 
                                          strokeWidth={1.5}
                                          strokeDasharray="5 5"
                                          dot={false}
                                          connectNulls={false}
                                        />
                                      )}
                                      
                                      {/* Bollinger Bands */}
                                      {indicators.bollinger && (
                                        <>
                                          <Line 
                                            type="monotone" 
                                            dataKey="bollingerUpper" 
                                            stroke="#3b82f6" 
                                            strokeWidth={1}
                                            strokeDasharray="2 2"
                                            dot={false}
                                            connectNulls={false}
                                          />
                                          <Line 
                                            type="monotone" 
                                            dataKey="bollingerMiddle" 
                                            stroke="#3b82f6" 
                                            strokeWidth={1}
                                            strokeDasharray="2 2"
                                            dot={false}
                                            connectNulls={false}
                                          />
                                          <Line 
                                            type="monotone" 
                                            dataKey="bollingerLower" 
                                            stroke="#3b82f6" 
                                            strokeWidth={1}
                                            strokeDasharray="2 2"
                                            dot={false}
                                            connectNulls={false}
                                          />
                                        </>
                                      )}
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>

                                {/* RSI Chart */}
                                {indicators.rsi && (
                                  <div className="h-1/4 mt-2">
                                    <div className="text-xs text-muted-foreground font-mono mb-1 px-2">RSI (21)</div>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={chartData.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis 
                                          dataKey="timestamp"
                                          tickFormatter={(value) => {
                                            const date = new Date(value);
                                            if (timeframe === '1h') {
                                              // For hourly charts, show day and time
                                              return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                                                     date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            } else if (timeframe === '1d') {
                                              return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                            } else if (timeframe === '1wk') {
                                              return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                            } else {
                                              return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
                                            }
                                          }}
                                          interval={timeframe === '1h' ? Math.floor((chartData.chartData?.length || 0) / 6) : "preserveStartEnd"}
                                          stroke="rgba(255,255,255,0.6)"
                                          fontSize={10}
                                          fontFamily="monospace"
                                        />
                        <YAxis 
                          domain={['dataMin - 5', 'dataMax + 5']}
                          tickFormatter={(value) => value.toFixed(0)}
                          stroke="rgba(255,255,255,0.6)"
                          fontSize={10}
                          fontFamily="monospace"
                        />
                                        <Tooltip 
                                          content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              return (
                                                <div className="bg-card/90 backdrop-blur-xl border border-white/20 rounded-lg p-2 shadow-xl">
                                                  <p className="text-xs text-muted-foreground font-mono mb-1">
                                                    {new Date(data.timestamp).toLocaleDateString()} {new Date(data.timestamp).toLocaleTimeString()}
                                                  </p>
                                                  <div className="text-xs font-mono">
                                                    <span className="text-white">RSI: {data.rsi?.toFixed(1) || '--'}</span>
                                                  </div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                        
                                        {/* RSI Line */}
                                        <Line 
                                          type="monotone" 
                                          dataKey="rsi" 
                                          stroke="rgba(255,255,255,0.8)" 
                                          strokeWidth={1.5}
                                          dot={false}
                                          connectNulls={false}
                                        />
                                        
                                        {/* RSI Reference Lines */}
                                        <ReferenceLine y={70} stroke="rgba(239,68,68,0.6)" strokeDasharray="2 2" strokeWidth={1} />
                                        <ReferenceLine y={30} stroke="rgba(34,197,94,0.6)" strokeDasharray="2 2" strokeWidth={1} />
                                        <ReferenceLine y={50} stroke="rgba(255,255,255,0.3)" strokeDasharray="1 1" strokeWidth={1} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-96 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <IconChartLine className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="font-mono">no chart data available</p>
                              <button
                                onClick={() => {
                                  setIsLoadingChart(true);
                                  // TODO: Implement chart data loading
                                  setTimeout(() => {
                                    setChartData({ 
                                      chartData: [],
                                      dataPoints: 0,
                                      period: 'No data',
                                      meta: { currency: 'usd' }
                                    });
                                    setIsLoadingChart(false);
                                  }, 2000);
                                }}
                                className="mt-4 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg transition-colors font-mono text-sm"
                              >
                                Load Chart Data
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </>
                )}

                {/* WallStreetBets Tab Content */}
                {activeTab === 'wallstreetbets' && (
                  <>
                    {isLoadingWSB ? (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 backdrop-blur-xl border border-red-300/30 rounded-xl p-6 shadow-2xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5 animate-pulse"></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="relative">
                                <div className="w-8 h-8 border-3 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 w-8 h-8 border-3 border-orange-400/20 border-r-orange-400 rounded-full animate-spin animate-reverse"></div>
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-foreground font-mono">scraping r/wallstreetbets</h3>
                                <div className="text-xs text-red-300 font-mono">powered by firecrawl 🔥 & openai 🧠</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : wsbData ? (
                      <div className="space-y-6">
                        {/* Sentiment Analysis */}
                        <div className="bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 backdrop-blur-xl border border-red-300/30 rounded-xl p-6 shadow-2xl">
                          <h3 className="text-lg font-bold text-foreground font-mono mb-4 flex items-center gap-2">
                            <span>🚀</span> r/wallstreetbets sentiment analysis
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground font-mono mb-1">overall sentiment</div>
                              <div className={`text-lg font-bold font-mono ${
                                wsbData.sentiment.overall === 'bullish' ? 'text-green-400' : 
                                wsbData.sentiment.overall === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                {wsbData.sentiment.overall}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground font-mono mb-1">confidence</div>
                              <div className="text-lg font-bold font-mono text-blue-400">
                                {wsbData.sentiment.confidence}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground font-mono mb-1">posts analyzed</div>
                              <div className="text-lg font-bold font-mono text-purple-400">
                                {wsbData.posts.length}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <div className="text-sm text-muted-foreground font-mono mb-2">summary</div>
                            <p className="text-sm text-foreground font-mono leading-relaxed">
                              {wsbData.sentiment.summary.toLowerCase()}
                            </p>
                          </div>
                          
                          {wsbData.sentiment.keyThemes.length > 0 && (
                            <div>
                              <div className="text-sm text-muted-foreground font-mono mb-2">key themes</div>
                              <div className="flex flex-wrap gap-2">
                                {wsbData.sentiment.keyThemes.map((theme, index) => (
                                  <span 
                                    key={index}
                                    className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-mono"
                                  >
                                    {theme}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Posts */}
                        <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl">
                          <div className="p-4 border-b border-white/10">
                            <h3 className="text-lg font-bold text-foreground font-mono">recent posts</h3>
                          </div>
                          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                            {wsbData.posts.length > 0 ? (
                              wsbData.posts.map((post, index) => (
                                <div key={index} className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="text-sm font-bold text-foreground font-mono line-clamp-2 flex-1 leading-relaxed">
                                      {post.title.toLowerCase()}
                                    </h4>
                                    <a
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                                      title="Open on Reddit"
                                    >
                                      <IconExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </a>
                                  </div>
                                  
                                  {(post.content || post.snippet) && (
                                    <p className="text-xs text-muted-foreground font-mono mb-3 line-clamp-4 leading-relaxed">
                                      {post.snippet || post.content?.toLowerCase()}
                                    </p>
                                  )}
                                  
                                  
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground font-mono">no posts found for {selectedTicker}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground font-mono mb-4">click refresh to load wallstreetbets data</p>
                        <button
                          onClick={async () => {
                            if (!selectedTicker) return;
                            setIsLoadingWSB(true);
                            try {
                              const companyName = stockData?.companyName || 
                                researchStocks?.find(stock => stock.ticker === selectedTicker)?.companyName;
                              console.log(`Manual loading WSB data for ${selectedTicker} (${companyName})`);
                              const result = await fetchWallStreetBetsData({ 
                                ticker: selectedTicker,
                                companyName: companyName 
                              });
                              setWsbData(result);
                            } catch (error) {
                              console.error('Error fetching WSB data:', error);
                            } finally {
                              setIsLoadingWSB(false);
                            }
                          }}
                          className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg transition-colors font-mono text-sm"
                        >
                          load wsb data
                        </button>
                      </div>
                    )}
                  </>
                )}

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

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-purple-900/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground font-mono">add stock to followed stocks</h3>
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setNewTicker("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconMinus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground font-mono mb-2">
                  stock ticker
                </label>
                <input
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  placeholder="enter ticker (e.g., aapl, googl, tsla)"
                  className="w-full px-3 py-2 bg-card/40 backdrop-blur-xl border border-white/20 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent font-mono"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
                  disabled={isAddingStock}
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddStockModal(false);
                    setNewTicker("");
                  }}
                  className="flex-1 px-4 py-2 text-sm bg-card/40 hover:bg-card/60 border border-white/20 rounded-lg transition-colors font-mono"
                  disabled={isAddingStock}
                >
                  cancel
                </button>
                <button
                  onClick={handleAddStock}
                  disabled={isAddingStock || !newTicker.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                >
                  {isAddingStock ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      adding...
                    </>
                  ) : (
                    <>
                      <IconPlus className="h-4 w-4" />
                      add stock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
