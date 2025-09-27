import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Function to fetch real-time prices from Yahoo Finance
async function fetchRealTimePrices(tickers: string[]): Promise<{ [key: string]: { price: number; change: number; changePercent: number } }> {
  const results: { [key: string]: { price: number; change: number; changePercent: number } } = {};
  
  // Fetch each ticker individually since Yahoo Finance doesn't support comma-separated requests reliably
  for (const ticker of tickers) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      console.log(`Fetching price for ${ticker} from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`HTTP error for ${ticker}! status: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Raw Yahoo Finance API response for ${ticker}:`, JSON.stringify(data, null, 2));
      
      if (data.chart && data.chart.result && data.chart.result[0]) {
        const result = data.chart.result[0];
        const meta = result.meta;
        
        if (meta) {
          const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
          const previousClose = meta.previousClose || currentPrice;
          const change = currentPrice - previousClose;
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
          
          results[ticker] = {
            price: currentPrice,
            change,
            changePercent
          };
          console.log(`✅ Price data for ${ticker}: price=${currentPrice}, change=${change}, changePercent=${changePercent}`);
        } else {
          console.error(`No meta data found for ${ticker}`);
        }
      } else {
        console.error(`Invalid response structure for ${ticker}`);
      }
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
    }
  }
  
  console.log('Final results:', results);
  return results;
}

export const updateAllPrices = action({
  args: {},
  handler: async (ctx): Promise<{ message: string }> => {
    // Get all holdings
    const holdings = await ctx.runQuery(api.holdings.getAll);
    console.log('updateAllPrices: Found holdings:', holdings.length);
    
    if (holdings.length === 0) {
      return { message: "No holdings to update" };
    }
    
    // Extract unique tickers
    const tickers = [...new Set(holdings.map((h: any) => h.ticker))];
    console.log('updateAllPrices: Tickers to update:', tickers);
    
    // Fetch real-time prices for all tickers
    const priceData = await fetchRealTimePrices(tickers);
    console.log('updateAllPrices: Price data received:', priceData);
    
    // Update prices for each holding
    let updatedCount = 0;
    for (const holding of holdings) {
      const tickerData = priceData[holding.ticker];
      
      console.log(`updateAllPrices: Processing ${holding.ticker}, current price in DB: ${holding.currentPrice}, tickerData:`, tickerData);
      
      if (tickerData && tickerData.price) {
        const newPrice = Math.round(tickerData.price * 100) / 100;
        console.log(`updateAllPrices: Updating ${holding.ticker} from ${holding.currentPrice} to ${newPrice}`);
        
        await ctx.runMutation(api.holdings.updateCurrentPrice, {
          id: holding._id,
          currentPrice: newPrice
        });
        updatedCount++;
        console.log(`✅ Successfully updated ${holding.ticker} to ${newPrice}`);
      } else {
        console.log(`updateAllPrices: No valid price data for ${holding.ticker}, tickerData:`, tickerData);
      }
    }
    
    return { message: `Updated prices for ${updatedCount} of ${holdings.length} holdings` };
  },
});

export const updatePricesForTickers = action({
  args: { tickers: v.array(v.string()) },
  handler: async (ctx, args): Promise<{ message: string }> => {
    const holdings = await ctx.runQuery(api.holdings.getAll);
    const holdingsToUpdate = holdings.filter((holding: any) => 
      args.tickers.includes(holding.ticker)
    );
    
    if (holdingsToUpdate.length === 0) {
      return { message: "No holdings found for the specified tickers" };
    }
    
    // Fetch real-time prices for the specified tickers
    const priceData = await fetchRealTimePrices(args.tickers);
    
    let updatedCount = 0;
    for (const holding of holdingsToUpdate) {
      const tickerData = priceData[holding.ticker];
      
      if (tickerData) {
        await ctx.runMutation(api.holdings.updateCurrentPrice, {
          id: holding._id,
          currentPrice: Math.round(tickerData.price * 100) / 100
        });
        updatedCount++;
      } else {
        console.log(`updatePricesForTickers: No price data available for ${holding.ticker}, skipping update`);
      }
    }
    
    return { message: `Updated prices for ${updatedCount} of ${holdingsToUpdate.length} holdings` };
  },
});

export const getDailyPriceChanges = action({
  args: { tickers: v.array(v.string()) },
  handler: async (ctx, args): Promise<{ [key: string]: { change: number; changePercent: number } }> => {
    const priceData = await fetchRealTimePrices(args.tickers);
    const result: { [key: string]: { change: number; changePercent: number } } = {};
    
    for (const ticker of args.tickers) {
      const data = priceData[ticker];
      if (data) {
        result[ticker] = {
          change: data.change,
          changePercent: data.changePercent
        };
      } else {
        console.log(`getDailyPriceChanges: No price data available for ${ticker}`);
        // Don't add anything to result if no data is available
      }
    }
    
    return result;
  },
});

// Action to validate ticker and fetch company name
export const validateTicker = action({
  args: { ticker: v.string() },
  handler: async (ctx, args): Promise<{ isValid: boolean; companyName: string | null; error?: string }> => {
    try {
      const ticker = args.ticker.toUpperCase().trim();
      
      // Basic format validation
      if (!ticker || ticker.length < 1 || ticker.length > 10) {
        return { 
          isValid: false, 
          companyName: null, 
          error: 'Ticker must be between 1 and 10 characters' 
        };
      }
      
      // Check if ticker contains only valid characters (letters, numbers, and dots)
      if (!/^[A-Z0-9.-]+$/.test(ticker)) {
        return { 
          isValid: false, 
          companyName: null, 
          error: 'Ticker can only contain letters, numbers, and dots' 
        };
      }

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      console.log(`Validating ticker ${ticker} from: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
      });
      
      if (!response.ok) {
        console.error(`HTTP error for ${ticker}! status: ${response.status}`);
        return { 
          isValid: false, 
          companyName: null, 
          error: response.status === 404 ? 'Ticker not found' : `HTTP ${response.status}` 
        };
      }
      
      const data = await response.json();
      console.log(`Yahoo Finance API response for ${ticker}:`, JSON.stringify(data, null, 2));
      
      // Check if we have valid chart data
      if (data.chart?.result?.[0]?.meta) {
        const meta = data.chart.result[0].meta;
        const companyName = meta.longName || meta.shortName || ticker;
        
        // Additional validation: check if we have valid price data
        if (meta.regularMarketPrice || meta.previousClose) {
          console.log(`✅ Ticker ${ticker} is valid: ${companyName}`);
          return { 
            isValid: true, 
            companyName 
          };
        } else {
          console.log(`No price data found for ${ticker}`);
          return { 
            isValid: false, 
            companyName: null, 
            error: 'No price data available for this ticker' 
          };
        }
      } else {
        console.log(`Invalid ticker ${ticker} - no chart data`);
        return { 
          isValid: false, 
          companyName: null, 
          error: 'Ticker not found or invalid' 
        };
      }
    } catch (error) {
      console.error(`Error validating ticker ${args.ticker}:`, error);
      return { 
        isValid: false, 
        companyName: null, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },
});

// Action to fetch company name by ticker (kept for backward compatibility)
export const getCompanyNameByTicker = action({
  args: { ticker: v.string() },
  handler: async (ctx, args): Promise<{ companyName: string | null; error?: string }> => {
    const result = await ctx.runAction(api.priceActions.validateTicker, { ticker: args.ticker });
    return {
      companyName: result.companyName,
      error: result.error
    };
  },
});
