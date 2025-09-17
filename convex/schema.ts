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
});
