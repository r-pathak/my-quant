import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    userId: v.id("users"),
  }).index("by_user", ["userId"]),
  holdings: defineTable({
    userId: v.id("users"),
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
  })
    .index("by_user", ["userId"])
    .index("by_user_ticker", ["userId", "ticker"]),
  researchStocks: defineTable({
    userId: v.id("users"),
    ticker: v.string(),
    companyName: v.string(),
    currentPrice: v.optional(v.number()),
    change: v.optional(v.number()),
    changePercent: v.optional(v.number()),
    sector: v.optional(v.string()),
    marketCap: v.optional(v.number()),
    peRatio: v.optional(v.number()),
    dividendYield: v.optional(v.number()),
    lastUpdated: v.optional(v.string()),
    addedDate: v.string(),
    // Motley Fool data
    motleyFoolData: v.optional(v.object({
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
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_ticker", ["userId", "ticker"]),
});
