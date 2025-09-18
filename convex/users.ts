import { query } from "./_generated/server";

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

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    return await getCurrentUser(ctx);
  },
});
