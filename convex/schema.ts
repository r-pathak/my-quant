import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
  holdings: defineTable({
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
  }),
  researchStocks: defineTable({
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
  }).index("by_ticker", ["ticker"]),
});
