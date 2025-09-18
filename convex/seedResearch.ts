import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const seedResearchStocks = action({
  args: {},
  handler: async (ctx): Promise<{ message: string; results: any[] }> => {
    const sampleTickers = [
      "AAPL", // Apple
      "GOOGL", // Alphabet
      "MSFT", // Microsoft
      "TSLA", // Tesla
      "NVDA", // NVIDIA
    ];

    const results: any[] = [];
    
    for (const ticker of sampleTickers) {
      try {
        const result = await ctx.runAction(api.researchActions.fetchAndAddStock, { ticker });
        results.push({ ticker, ...result });
      } catch (error) {
        console.error(`Error adding ${ticker}:`, error);
        results.push({ 
          ticker, 
          success: false, 
          message: error instanceof Error ? error.message : `Failed to add ${ticker}` 
        });
      }
    }

    return {
      message: `Seeding completed. Added ${results.filter((r: any) => r.success).length} of ${sampleTickers.length} stocks.`,
      results
    };
  },
});
