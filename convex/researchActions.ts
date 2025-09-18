import { action, query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Function to fetch comprehensive stock data from Yahoo Finance
async function fetchStockData(ticker: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    console.log(`Fetching stock data for ${ticker} from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTP error for ${ticker}! status: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`Raw Yahoo Finance API response for ${ticker}:`, JSON.stringify(data, null, 2));
    
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;
      
      if (meta) {
        return {
          ticker: ticker.toUpperCase(),
          companyName: meta.longName || meta.shortName || ticker.toUpperCase(),
          currentPrice: meta.regularMarketPrice || meta.previousClose || 0,
          previousClose: meta.previousClose || 0,
          change: (meta.regularMarketPrice || meta.previousClose || 0) - (meta.previousClose || 0),
          changePercent: meta.previousClose > 0 ? 
            (((meta.regularMarketPrice || meta.previousClose || 0) - (meta.previousClose || 0)) / (meta.previousClose || 0)) * 100 : 0,
          marketCap: meta.marketCap || null,
          peRatio: meta.trailingPE || null,
          dividendYield: meta.dividendYield ? meta.dividendYield * 100 : null,
          sector: meta.sector || null,
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
          volume: meta.regularMarketVolume || null,
          avgVolume: meta.averageVolume || null,
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}

// Function to fetch historical performance data
async function fetchHistoricalData(ticker: string, period: string = "1y") {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${period}&interval=1d`;
    console.log(`Fetching historical data for ${ticker} from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTP error for historical data ${ticker}! status: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const prices = result.indicators.quote[0].close;
      
      if (timestamps && prices && timestamps.length > 0 && prices.length > 0) {
        // Filter out null prices and get valid data points
        const validData = timestamps
          .map((timestamp: number, index: number) => ({
            timestamp,
            price: prices[index]
          }))
          .filter((item: any) => item.price !== null && item.price !== undefined);
        
        if (validData.length < 2) return null;
        
        const firstPrice = validData[0].price;
        const lastPrice = validData[validData.length - 1].price;
        const periodReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
        
        return {
          periodReturn,
          firstPrice,
          lastPrice,
          dataPoints: validData.length
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    return null;
  }
}

// Query to get all research stocks
export const getAllResearchStocks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("researchStocks").collect();
  },
});

// Query to get a specific research stock by ticker
export const getResearchStockByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("researchStocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
  },
});

// Mutation to add a new research stock
export const addResearchStock = mutation({
  args: {
    ticker: v.string(),
    companyName: v.string(),
    currentPrice: v.optional(v.number()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    peRatio: v.optional(v.number()),
    dividendYield: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existingStock = await ctx.db
      .query("researchStocks")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
    
    if (existingStock) {
      throw new Error(`Stock ${args.ticker} is already in your research list`);
    }
    
    return await ctx.db.insert("researchStocks", {
      ticker: args.ticker.toUpperCase(),
      companyName: args.companyName,
      currentPrice: args.currentPrice,
      sector: args.sector,
      marketCap: args.marketCap,
      peRatio: args.peRatio,
      dividendYield: args.dividendYield,
      addedDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });
  },
});

// Mutation to update research stock data
export const updateResearchStock = mutation({
  args: {
    id: v.id("researchStocks"),
    currentPrice: v.optional(v.number()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    peRatio: v.optional(v.number()),
    dividendYield: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    return await ctx.db.patch(id, {
      ...updateData,
      lastUpdated: new Date().toISOString(),
    });
  },
});

// Mutation to remove a research stock
export const removeResearchStock = mutation({
  args: { id: v.id("researchStocks") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// Action to fetch and add a new stock to research list
export const fetchAndAddStock = action({
  args: { ticker: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
      const stockData = await fetchStockData(args.ticker);
      
      if (!stockData) {
        return { success: false, message: `Could not fetch data for ticker ${args.ticker}` };
      }
      
      const stockId = await ctx.runMutation(api.researchActions.addResearchStock, {
        ticker: stockData.ticker,
        companyName: stockData.companyName,
        currentPrice: stockData.currentPrice,
        sector: stockData.sector || undefined,
        marketCap: stockData.marketCap || undefined,
        peRatio: stockData.peRatio || undefined,
        dividendYield: stockData.dividendYield || undefined,
      });
      
      return { 
        success: true, 
        message: `Successfully added ${stockData.companyName} (${stockData.ticker}) to research list`,
        data: { id: stockId, ...stockData }
      };
    } catch (error) {
      console.error(`Error adding stock ${args.ticker}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : `Failed to add ${args.ticker}` 
      };
    }
  },
});

// Action to get comprehensive stock data for research
export const getStockResearchData = action({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    try {
      const [currentData, ytdData, threeMonthData, oneMonthData] = await Promise.all([
        fetchStockData(args.ticker),
        fetchHistoricalData(args.ticker, "ytd"),
        fetchHistoricalData(args.ticker, "3mo"),
        fetchHistoricalData(args.ticker, "1mo"),
      ]);
      
      if (!currentData) {
        return { success: false, message: `Could not fetch data for ${args.ticker}` };
      }
      
      return {
        success: true,
        data: {
          ...currentData,
          performance: {
            ytd: ytdData?.periodReturn || null,
            threeMonth: threeMonthData?.periodReturn || null,
            oneMonth: oneMonthData?.periodReturn || null,
          }
        }
      };
    } catch (error) {
      console.error(`Error fetching research data for ${args.ticker}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : `Failed to fetch data for ${args.ticker}` 
      };
    }
  },
});

// Action to update all research stock prices
export const updateAllResearchPrices = action({
  args: {},
  handler: async (ctx): Promise<{ message: string }> => {
    const stocks = await ctx.runQuery(api.researchActions.getAllResearchStocks);
    
    if (stocks.length === 0) {
      return { message: "No research stocks to update" };
    }
    
    let updatedCount = 0;
    for (const stock of stocks) {
      try {
        const stockData = await fetchStockData(stock.ticker);
        
        if (stockData) {
          await ctx.runMutation(api.researchActions.updateResearchStock, {
            id: stock._id,
            currentPrice: stockData.currentPrice,
            sector: stockData.sector || undefined,
            marketCap: stockData.marketCap || undefined,
            peRatio: stockData.peRatio || undefined,
            dividendYield: stockData.dividendYield || undefined,
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating ${stock.ticker}:`, error);
      }
    }
    
    return { message: `Updated ${updatedCount} of ${stocks.length} research stocks` };
  },
});
