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

// Helper function for retry logic with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
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
          // Search for news using ticker and company name with retry logic
          const searchQuery = `${holding.ticker} ${holding.companyName}`;
          console.log(`Searching for: ${searchQuery}`);
          
          const results = await retryWithBackoff(async () => {
            return await firecrawl.search(searchQuery, {
              tbs: 'qdr:d', // Past day
              sources: ['news'],
              limit: 1 // Get 1 article per holding to ensure we don't exceed 5 total
            });
          }, 3, 1000);

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
          console.error(`Error fetching news for ${holding.ticker} after retries:`, tickerError);
          // Continue with next holding instead of failing completely
        }
      }

      // Return up to 5 items (no sorting since dates are relative strings like "12 hours ago")
      return allNews.slice(0, 5);

    } catch (error) {
      console.error('Error in fetchTopHoldingsNews:', error);
      throw new Error(`Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
