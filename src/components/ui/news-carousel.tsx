"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { IconExternalLink, IconRefresh, IconNews } from "@tabler/icons-react";

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

interface NewsCarouselProps {
  holdings: Array<{
    ticker: string;
    companyName: string;
    unitsHeld: number;
    boughtPrice: number;
    currentPrice?: number;
    totalValue: number;
  }>;
}

export default function NewsCarousel({ holdings }: NewsCarouselProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedNews, setHasLoadedNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const fetchNews = useAction(api.newsActions.fetchTopHoldingsNews);

  const loadNews = useCallback(async (force: boolean = false) => {
    // Rate limiting: prevent calls within 30 seconds unless forced
    const now = Date.now();
    const RATE_LIMIT_MS = 30000; // 30 seconds
    
    if (!force && (now - lastRefreshTime) < RATE_LIMIT_MS) {
      const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - lastRefreshTime)) / 1000);
      setError(`Please wait ${remainingTime} seconds before refreshing again`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Sort holdings by total value and take top 5 on client-side
      const topHoldings = holdings
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5)
        .map(holding => ({
          ticker: holding.ticker,
          companyName: holding.companyName
        }));
      
      const newsData = await fetchNews({ holdings: topHoldings });
      setNews(newsData);
      setHasLoadedNews(true);
      setLastRefreshTime(now);
      
      if (newsData.length === 0) {
        setError('No news found for your holdings. Try again later.');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [holdings, fetchNews, lastRefreshTime]);

  // Load news only once when holdings are first available
  useEffect(() => {
    if (holdings.length > 0 && !hasLoadedNews) {
      loadNews(true); // Force initial load
    }
  }, [holdings, hasLoadedNews, loadNews]);

  // Auto-advance carousel every 10 seconds
  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [news.length]);

  const handleRefresh = () => {
    loadNews(false); // Respect rate limiting
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + news.length) % news.length);
  };

  if (holdings.length === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl h-full flex items-center justify-center">
        <div className="text-center">
          <IconNews className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">add holdings to see related news</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground font-mono flex items-center gap-2">
            news (powered by firecrawl 🔥)
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title={isLoading ? "Loading..." : "Refresh news"}
          >
            <IconRefresh className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <IconRefresh className="h-8 w-8 text-white animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">Fetching latest news...</p>
            </div>
          </div>
        ) : news.length > 0 ? (
          <>
            {/* News Item */}
            <div className="flex-1 -mt-2 flex flex-col relative">
              {/* Animated background gradient */}
              {/* <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 rounded-xl opacity-50"></div> */}
              
              <div className="relative z-10 mb-4">
                {/* Breaking news indicator */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">Live</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-red-500/50 to-transparent flex-1"></div>
                </div>

                <h3 className="text-lg font-bold text-foreground font-mono mb-3 line-clamp-3 leading-tight">
                  {news[currentIndex].title.toLowerCase()}
                </h3>
                
                {/* Enhanced source info */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono mb-4">
                  <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg">
                    <span className="font-semibold">{news[currentIndex].source.toLowerCase()}</span>
                  </div>
                  <span className="text-white/40">•</span>
                  <span className="bg-white/5 px-2 py-1 rounded-lg">
                    {news[currentIndex].publishedAt.toLowerCase()}
                  </span>
                </div>
                
                {news[currentIndex].summary && (
                  <div className="relative">
                    {/* <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b  rounded-full"></div> */}
                    <p className="text-sm text-muted-foreground font-mono line-clamp-4 leading-relaxed">
                      {news[currentIndex].summary.toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-auto relative z-10">
                <a
                  href={news[currentIndex].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center w-52 gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-300/30 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  <IconExternalLink className="h-4 w-4" />
                  <span className="font-mono">read full article</span>
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
              <button
                onClick={handlePrevious}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-mono text-sm"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {news.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentIndex 
                        ? 'bg-white shadow-lg scale-110' 
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={handleNext}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-mono text-sm"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <IconNews className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">no news available</p>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="mt-2 px-3 py-1 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors font-mono text-sm disabled:opacity-50"
              >
                try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
