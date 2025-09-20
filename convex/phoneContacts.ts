import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper function to get current user ID
async function getUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  // In Convex Auth, the identity.subject is the user ID
  // Extract the user ID from the subject (format: "userId|sessionId")
  return identity.subject.split('|')[0];
}

export const setPhoneNumber = mutation({
  args: {
    phoneNumber: v.string(),
    internationalDialCode: v.string(),
    schedule: v.optional(v.object({
      monday: v.optional(v.array(v.string())),
      tuesday: v.optional(v.array(v.string())),
      wednesday: v.optional(v.array(v.string())),
      thursday: v.optional(v.array(v.string())),
      friday: v.optional(v.array(v.string())),
      saturday: v.optional(v.array(v.string())),
      sunday: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    // Check if a phone contact already exists for the user
    const existingContact = await ctx.db
      .query("userPhoneContacts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingContact) {
      // Update existing contact
      await ctx.db.patch(existingContact._id, {
        phoneNumber: args.phoneNumber,
        internationalDialCode: args.internationalDialCode,
        schedule: args.schedule,
      });
    } else {
      // Create new contact
      await ctx.db.insert("userPhoneContacts", {
        userId: userId as any,
        phoneNumber: args.phoneNumber,
        internationalDialCode: args.internationalDialCode,
        schedule: args.schedule,
      });
    }
  },
});

export const getPhoneNumber = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("userPhoneContacts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const recordCall = mutation({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    summary: v.string(),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    await ctx.db.insert("calls", {
      userId: userId as any,
      startTime: args.startTime,
      endTime: args.endTime,
      summary: args.summary,
      transcript: args.transcript,
    });
  },
});

