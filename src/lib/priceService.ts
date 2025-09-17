// Price fetching service for live stock prices
// Using Yahoo Finance API as it's free and doesn't require API keys

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export class PriceService {
  private static instance: PriceService;
  private priceCache: Map<string, { data: PriceData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  async getLivePrices(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const symbolsToFetch: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cached = this.priceCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        results.push(cached.data);
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    // Fetch fresh prices for uncached symbols
    if (symbolsToFetch.length > 0) {
      try {
        const freshPrices = await this.fetchPricesFromAPI(symbolsToFetch);
        for (const priceData of freshPrices) {
          this.priceCache.set(priceData.symbol, {
            data: priceData,
            timestamp: Date.now()
          });
          results.push(priceData);
        }
      } catch (error) {
        console.error('Error fetching live prices:', error);
        // Return cached data or fallback prices
        for (const symbol of symbolsToFetch) {
          const cached = this.priceCache.get(symbol);
          if (cached) {
            results.push(cached.data);
          } else {
            // Fallback to a mock price (in production, you'd want better error handling)
            results.push({
              symbol,
              price: 100,
              change: 0,
              changePercent: 0
            });
          }
        }
      }
    }

    return results;
  }

  private async fetchPricesFromAPI(symbols: string[]): Promise<PriceData[]> {
    // Using Yahoo Finance API (free, no API key required)
    const symbolsParam = symbols.join(',');
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolsParam}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const results: PriceData[] = [];
      
      if (data.chart && data.chart.result) {
        for (const result of data.chart.result) {
          const meta = result.meta;
          const quote = result.indicators?.quote?.[0];
          
          if (meta && quote) {
            const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
            const previousClose = meta.previousClose || currentPrice;
            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
            
            results.push({
              symbol: meta.symbol,
              price: currentPrice,
              change,
              changePercent
            });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching from Yahoo Finance:', error);
      // Fallback to mock data for development
      return symbols.map(symbol => ({
        symbol,
        price: Math.random() * 500 + 50, // Random price between 50-550
        change: (Math.random() - 0.5) * 20, // Random change between -10 to +10
        changePercent: (Math.random() - 0.5) * 10 // Random percentage between -5% to +5%
      }));
    }
  }

  // Mock data for development/testing
  getMockPrices(symbols: string[]): PriceData[] {
    return symbols.map(symbol => {
      const basePrice = this.getMockBasePrice(symbol);
      const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
      const change = basePrice * (changePercent / 100);
      
      return {
        symbol,
        price: basePrice + change,
        change,
        changePercent
      };
    });
  }

  private getMockBasePrice(symbol: string): number {
    // Mock base prices for common symbols
    const mockPrices: { [key: string]: number } = {
      'AAPL': 175.43,
      'TSLA': 248.12,
      'NVDA': 421.33,
      'MSFT': 380.25,
      'GOOGL': 142.50,
      'AMZN': 155.80,
      'META': 320.15,
      'SPY': 485.30,
      'QQQ': 420.75,
      'BRK.B': 385.90,
      'JPM': 185.40,
      'VTI': 245.80
    };
    
    return mockPrices[symbol] || 100;
  }
}

export const priceService = PriceService.getInstance();
