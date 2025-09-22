import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Public action to trigger newsletter for current user
export const sendMyNewsletter = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string }> => {
    // Get the current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user ID from identity (same pattern as users.ts)
    const userId = identity.subject.split('|')[0];
    
    // Get user from database
    const user: any = await ctx.runQuery(internal.weeklyDigestQueries.getUserById, {
      userId: userId as any,
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    console.log(`📧 Manual newsletter requested by user: ${user.email}`);

    try {
      // Trigger the newsletter for this specific user
      const result: { success: boolean; message: string } = await ctx.runAction(internal.weeklyDigestEngine.sendUserNewsletter, {
        userId: user._id,
      });

      return result;
    } catch (error) {
      console.error("Failed to send newsletter:", error);
      throw new Error("Failed to send newsletter. Please try again.");
    }
  },
});
