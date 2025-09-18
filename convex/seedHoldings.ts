import { mutation } from "./_generated/server";

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

// Sample holdings data based on the Portfolio component
export const seedHoldings = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const sampleHoldings = [
      {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        unitsHeld: 100,
        boughtPrice: 175.43,
        currentPrice: 187.90, // Updated to show +7.12% gain
        sector: "Technology",
        positionType: "long" as const,
        purchaseDate: "2024-01-15",
        notes: "Core position in tech portfolio",
      },
      {
        ticker: "TSLA",
        companyName: "Tesla Inc.",
        unitsHeld: 50,
        boughtPrice: 248.12,
        currentPrice: 230.34, // Updated to show -7.19% loss
        sector: "Automotive",
        positionType: "long" as const,
        purchaseDate: "2024-02-20",
        notes: "EV exposure with high volatility",
      },
      {
        ticker: "NVDA",
        companyName: "NVIDIA Corp.",
        unitsHeld: 25,
        boughtPrice: 421.33,
        currentPrice: 507.50, // Updated to show +20.45% gain
        sector: "Technology",
        positionType: "long" as const,
        purchaseDate: "2024-01-10",
        notes: "AI and GPU leader",
      },
      {
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        unitsHeld: 75,
        boughtPrice: 380.25,
        currentPrice: 395.80,
        sector: "Technology",
        positionType: "long" as const,
        purchaseDate: "2024-01-25",
        notes: "Cloud and enterprise software",
      },
      {
        ticker: "GOOGL",
        companyName: "Alphabet Inc.",
        unitsHeld: 40,
        boughtPrice: 142.50,
        currentPrice: 148.75,
        sector: "Technology",
        positionType: "long" as const,
        purchaseDate: "2024-02-05",
        notes: "Search and advertising dominance",
      },
      {
        ticker: "AMZN",
        companyName: "Amazon.com Inc.",
        unitsHeld: 30,
        boughtPrice: 155.80,
        currentPrice: 162.40,
        sector: "Consumer Discretionary",
        positionType: "long" as const,
        purchaseDate: "2024-02-10",
        notes: "E-commerce and cloud leader",
      },
      {
        ticker: "META",
        companyName: "Meta Platforms Inc.",
        unitsHeld: 60,
        boughtPrice: 320.15,
        currentPrice: 345.20,
        sector: "Technology",
        positionType: "long" as const,
        purchaseDate: "2024-01-30",
        notes: "Social media and metaverse",
      },
      {
        ticker: "SPY",
        companyName: "SPDR S&P 500 ETF Trust",
        unitsHeld: 200,
        boughtPrice: 485.30,
        currentPrice: 492.15,
        sector: "Financial Services",
        positionType: "long" as const,
        purchaseDate: "2024-01-05",
        notes: "Broad market exposure",
      },
      {
        ticker: "QQQ",
        companyName: "Invesco QQQ Trust",
        unitsHeld: 150,
        boughtPrice: 420.75,
        currentPrice: 435.60,
        sector: "Financial Services",
        positionType: "long" as const,
        purchaseDate: "2024-01-12",
        notes: "Nasdaq 100 exposure",
      },
      {
        ticker: "BRK.B",
        companyName: "Berkshire Hathaway Inc.",
        unitsHeld: 80,
        boughtPrice: 385.90,
        currentPrice: 392.45,
        sector: "Financial Services",
        positionType: "long" as const,
        purchaseDate: "2024-02-01",
        notes: "Value investing approach",
      },
      {
        ticker: "JPM",
        companyName: "JPMorgan Chase & Co.",
        unitsHeld: 45,
        boughtPrice: 185.40,
        currentPrice: 178.20,
        sector: "Financial Services",
        positionType: "long" as const,
        purchaseDate: "2024-02-15",
        notes: "Banking sector exposure",
      },
      {
        ticker: "VTI",
        companyName: "Vanguard Total Stock Market ETF",
        unitsHeld: 100,
        boughtPrice: 245.80,
        currentPrice: 252.30,
        sector: "Financial Services",
        positionType: "long" as const,
        purchaseDate: "2024-01-20",
        notes: "Total market diversification",
      },
    ];

    // Clear existing holdings for this user first
    const existingHoldings = await ctx.db
      .query("holdings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const holding of existingHoldings) {
      await ctx.db.delete(holding._id);
    }

    // Insert sample holdings for this user
    const insertedIds = [];
    for (const holding of sampleHoldings) {
      const id = await ctx.db.insert("holdings", {
        userId: user._id,
        ...holding,
        lastUpdated: new Date().toISOString(),
      });
      insertedIds.push(id);
    }

    return { message: `Successfully seeded ${insertedIds.length} holdings` };
  },
});
