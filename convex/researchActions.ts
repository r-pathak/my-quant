import { action, query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Helper function to get current user
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  
  // In Convex Auth, the identity.subject is the user ID
  // Extract the user ID from the subject (format: "userId|sessionId")
  const userId = identity.subject.split('|')[0];
  
  const user = await ctx.db.get(userId as any);
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}

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

// Query to get all research stocks for current user
export const getAllResearchStocks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    
    return await ctx.db
      .query("researchStocks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Query to get a specific research stock by ticker for current user
export const getResearchStockByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    return await ctx.db
      .query("researchStocks")
      .withIndex("by_user_ticker", (q) => q.eq("userId", user._id).eq("ticker", args.ticker.toUpperCase()))
      .first();
  },
});

// Mutation to add a new research stock
export const addResearchStock = mutation({
  args: {
    ticker: v.string(),
    companyName: v.string(),
    currentPrice: v.optional(v.number()),
    change: v.optional(v.number()),
    changePercent: v.optional(v.number()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    peRatio: v.optional(v.number()),
    dividendYield: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const existingStock = await ctx.db
      .query("researchStocks")
      .withIndex("by_user_ticker", (q) => q.eq("userId", user._id).eq("ticker", args.ticker.toUpperCase()))
      .first();
    
    if (existingStock) {
      throw new Error(`Stock ${args.ticker} is already in your research list`);
    }
    
    return await ctx.db.insert("researchStocks", {
      userId: user._id,
      ticker: args.ticker.toUpperCase(),
      companyName: args.companyName,
      currentPrice: args.currentPrice,
      change: args.change,
      changePercent: args.changePercent,
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
      const [currentData, ytdData, threeMonthData, oneMonthData, oneYearData, twoYearData] = await Promise.all([
        fetchStockData(args.ticker),
        fetchHistoricalData(args.ticker, "ytd"),
        fetchHistoricalData(args.ticker, "3mo"),
        fetchHistoricalData(args.ticker, "1mo"),
        fetchHistoricalData(args.ticker, "1y"),   // Added 1-year performance
        fetchHistoricalData(args.ticker, "2y"),   // Added 2-year performance
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
            oneYear: oneYearData?.periodReturn || null,     // Added 1-year performance
            twoYear: twoYearData?.periodReturn || null,     // Added 2-year performance
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

// Function to update Motley Fool data for a research stock
export const updateMotleyFoolData = mutation({
  args: { 
    ticker: v.string(),
    motleyFoolData: v.object({
      success: v.boolean(),
      stockData: v.optional(v.object({
        pe_ratio: v.optional(v.string()),
        market_cap: v.optional(v.string()),
        dividend_yield: v.optional(v.string()),
        sector: v.optional(v.string()),
        fifty_two_week_high: v.optional(v.string()),
        fifty_two_week_low: v.optional(v.string()),
        description: v.optional(v.string()),
        company_name: v.optional(v.string()),
        current_price: v.optional(v.string()),
        price_change: v.optional(v.string()),
        price_change_percent: v.optional(v.string()),
        volume: v.optional(v.string()),
      })),
      latestEarnings: v.optional(v.object({
        title: v.string(),
        date: v.string(),
        period: v.string(),
        summary: v.string(),
        url: v.string(),
      })),
      lastFetched: v.string(),
      errors: v.optional(v.array(v.string())),
    })
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    // Find the research stock
    const existingStock = await ctx.db
      .query("researchStocks")
      .withIndex("by_user_ticker", (q) => q.eq("userId", user._id).eq("ticker", args.ticker))
      .first();

    if (existingStock) {
      await ctx.db.patch(existingStock._id, {
        motleyFoolData: args.motleyFoolData
      });
      return { success: true };
    }
    
    return { success: false, message: "Stock not found in research list" };
  },
});

// Function to get cached Motley Fool data
export const getCachedMotleyFoolData = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    
    const stock = await ctx.db
      .query("researchStocks")
      .withIndex("by_user_ticker", (q) => q.eq("userId", user._id).eq("ticker", args.ticker))
      .first();

    if (stock?.motleyFoolData) {
      // Check if data is less than 24 hours old
      const lastFetched = new Date(stock.motleyFoolData.lastFetched);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);
      
      return {
        data: stock.motleyFoolData,
        needsUpdate: hoursSinceUpdate > 24 // Update if older than 24 hours
      };
    }
    
    return { data: null, needsUpdate: true };
  },
});
