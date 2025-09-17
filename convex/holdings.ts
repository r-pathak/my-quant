import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Schema for holdings table
export const schema = {
  ticker: v.string(),
  companyName: v.string(),
  unitsHeld: v.number(),
  boughtPrice: v.number(),
  currentPrice: v.optional(v.number()),
  sector: v.optional(v.string()),
  positionType: v.union(v.literal("long"), v.literal("short")),
  purchaseDate: v.string(),
  lastUpdated: v.optional(v.string()),
  notes: v.optional(v.string()),
};

// Query to get all holdings
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("holdings").collect();
  },
});

// Query to get holdings by ticker
export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("holdings")
      .filter((q) => q.eq(q.field("ticker"), args.ticker))
      .collect();
  },
});

// Query to get holdings by position type
export const getByPositionType = query({
  args: { positionType: v.union(v.literal("long"), v.literal("short")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("holdings")
      .filter((q) => q.eq(q.field("positionType"), args.positionType))
      .collect();
  },
});

// Mutation to add a new holding or update existing with weighted average
export const addOrUpdateHolding = mutation({
  args: {
    ticker: v.string(),
    companyName: v.string(),
    unitsHeld: v.number(),
    boughtPrice: v.number(),
    currentPrice: v.optional(v.number()),
    sector: v.optional(v.string()),
    positionType: v.union(v.literal("long"), v.literal("short")),
    purchaseDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if holding already exists for this ticker and position type
    const existingHolding = await ctx.db
      .query("holdings")
      .filter((q) => 
        q.and(
          q.eq(q.field("ticker"), args.ticker),
          q.eq(q.field("positionType"), args.positionType)
        )
      )
      .first();

    if (existingHolding) {
      // Calculate weighted average
      const existingValue = existingHolding.unitsHeld * existingHolding.boughtPrice;
      const newValue = args.unitsHeld * args.boughtPrice;
      const totalUnits = existingHolding.unitsHeld + args.unitsHeld;
      const weightedAveragePrice = (existingValue + newValue) / totalUnits;

      // Update existing holding with new weighted average
      await ctx.db.patch(existingHolding._id, {
        unitsHeld: totalUnits,
        boughtPrice: Math.round(weightedAveragePrice * 100) / 100, // Round to 2 decimal places
        companyName: args.companyName, // Update company name in case it changed
        sector: args.sector || existingHolding.sector,
        notes: args.notes ? 
          (existingHolding.notes ? `${existingHolding.notes}\n\n--- New Purchase ${args.purchaseDate} ---\n${args.notes}` : args.notes) 
          : existingHolding.notes,
        lastUpdated: new Date().toISOString(),
      });

      return existingHolding._id;
    } else {
      // Create new holding
      const holdingId = await ctx.db.insert("holdings", {
        ...args,
        lastUpdated: new Date().toISOString(),
      });
      return holdingId;
    }
  },
});

// Mutation to add a new holding (legacy - kept for compatibility)
export const add = mutation({
  args: {
    ticker: v.string(),
    companyName: v.string(),
    unitsHeld: v.number(),
    boughtPrice: v.number(),
    currentPrice: v.optional(v.number()),
    sector: v.optional(v.string()),
    positionType: v.union(v.literal("long"), v.literal("short")),
    purchaseDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const holdingId = await ctx.db.insert("holdings", {
      ...args,
      lastUpdated: new Date().toISOString(),
    });
    return holdingId;
  },
});

// Mutation to update a holding
export const update = mutation({
  args: {
    id: v.id("holdings"),
    ticker: v.optional(v.string()),
    companyName: v.optional(v.string()),
    unitsHeld: v.optional(v.number()),
    boughtPrice: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    sector: v.optional(v.string()),
    positionType: v.optional(v.union(v.literal("long"), v.literal("short"))),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
  },
});

// Mutation to delete a holding
export const remove = mutation({
  args: { id: v.id("holdings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Mutation to update current price for a holding
export const updateCurrentPrice = mutation({
  args: {
    id: v.id("holdings"),
    currentPrice: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      currentPrice: args.currentPrice,
      lastUpdated: new Date().toISOString(),
    });
  },
});

// Query to get portfolio summary
export const getPortfolioSummary = query({
  args: {},
  handler: async (ctx) => {
    const holdings = await ctx.db.query("holdings").collect();
    
    let totalValue = 0;
    let totalCost = 0;
    let activePositions = 0;
    let longPositions = 0;
    let shortPositions = 0;
    
    holdings.forEach((holding) => {
      const currentPrice = holding.currentPrice || holding.boughtPrice;
      const positionValue = holding.unitsHeld * currentPrice;
      const costBasis = holding.unitsHeld * holding.boughtPrice;
      
      totalValue += positionValue;
      totalCost += costBasis;
      activePositions++;
      
      if (holding.positionType === "long") {
        longPositions++;
      } else {
        shortPositions++;
      }
    });
    
    const totalPnL = totalValue - totalCost;
    const totalPnLPercentage = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    
    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercentage,
      activePositions,
      longPositions,
      shortPositions,
    };
  },
});
