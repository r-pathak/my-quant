import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Get all users
export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get user by ID
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

// Get user's holdings
export const getUserHoldings = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("holdings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get user's research stocks
export const getUserResearchStocks = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("researchStocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
