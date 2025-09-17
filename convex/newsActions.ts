"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Firecrawl from '@mendable/firecrawl-js';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export const fetchTopHoldingsNews = action({
  args: { 
    holdings: v.array(v.object({
      ticker: v.string(),
      companyName: v.string()
    }))
  },
  handler: async (ctx, args): Promise<NewsItem[]> => {
    const allNews: NewsItem[] = [];
    
    try {
      // Initialize Firecrawl client
      const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
      
      for (const holding of args.holdings) {
        // Stop if we already have 5 articles
        if (allNews.length >= 5) break;
        
        try {
          // Search for news using ticker and company name
          const searchQuery = `${holding.ticker} ${holding.companyName}`;
          console.log(`Searching for: ${searchQuery}`);
          
          const results = await firecrawl.search(searchQuery, {
            tbs: 'qdr:d', // Past day
            sources: ['news'],
            limit: 1 // Get 1 article per holding to ensure we don't exceed 5 total
          });

          console.log(`Firecrawl results for ${holding.ticker}:`, JSON.stringify(results, null, 2));

          // Handle the correct response structure: results.news is an array
          // Type assertion since the SDK types don't match the actual response
          const resultsNews = (results as any)?.news;
          if (results && resultsNews && Array.isArray(resultsNews)) {
            for (const result of resultsNews) {
              // Stop if we already have 5 articles
              if (allNews.length >= 5) break;
              
              const newsItem: NewsItem = {
                title: result.title || `${holding.ticker} News Update`,
                url: result.url || '#',
                source: extractDomain(result.url) || 'Unknown Source',
                publishedAt: result.date || 'Recently', // Use the date string from response (e.g., "12 hours ago")
                summary: result.snippet || undefined
              };
              
              allNews.push(newsItem);
            }
          }
        } catch (tickerError) {
          console.error(`Error fetching news for ${holding.ticker}:`, tickerError);
        }
      }

      // Return up to 5 items (no sorting since dates are relative strings like "12 hours ago")
      return allNews.slice(0, 5);

    } catch (error) {
      console.error('Error in fetchTopHoldingsNews:', error);
      return []; // Return empty array - no mock data
    }
  },
});

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
}
