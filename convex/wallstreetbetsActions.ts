"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Firecrawl from '@mendable/firecrawl-js';
import OpenAI from 'openai';

interface WSBPost {
  title: string;
  url: string;
  author: string;
  score: number;
  comments: number;
  created: string;
  content?: string;
  snippet?: string;
  domain?: string;
}

interface WSBAnalysis {
  posts: WSBPost[];
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    summary: string;
    keyThemes: string[];
  };
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
      console.log(`WSB scrape attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export const fetchWallStreetBetsData = action({
  args: { 
    ticker: v.string(),
    companyName: v.optional(v.string())
  },
  handler: async (ctx, args): Promise<WSBAnalysis> => {
    try {
      // Initialize Firecrawl client
      const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
      
      // Search for posts about the ticker on r/wallstreetbets using search
      const searchQuery = args.companyName 
        ? `site:reddit.com/r/wallstreetbets ${args.ticker} ${args.companyName}`
        : `site:reddit.com/r/wallstreetbets ${args.ticker}`;
      
      console.log(`Searching WSB for: ${searchQuery}`);
      
      const results = await retryWithBackoff(async () => {
        return await firecrawl.search(searchQuery, {
          tbs: 'qdr:w', // Past week
          limit: 10 // Get up to 10 posts
        });
      }, 3, 1000);

      console.log(`WSB search results for ${args.ticker}:`, JSON.stringify(results, null, 2));

      const posts: WSBPost[] = [];
      
      // Process search results
      if (results && (results as any)?.web) {
        const webResults = (results as any).web;
        
        for (const result of webResults.slice(0, 10)) {
          // Extract post data from Reddit URLs
          if (result.url && result.url.includes('reddit.com/r/wallstreetbets')) {
            // Extract more detailed info from the URL and title
            const urlParts = result.url.split('/');
            const postId = urlParts[urlParts.length - 2] || '';
            
            // Try to extract date from various sources
            let postDate = 'Past week';
            if (result.date) {
              postDate = result.date;
            } else if (result.publishedDate) {
              postDate = result.publishedDate;
            } else if (result.timestamp) {
              postDate = new Date(result.timestamp).toLocaleDateString();
            } else if (result.created) {
              postDate = result.created;
            } else if (result.time) {
              postDate = result.time;
            }
            
            // Extract author from URL if possible (reddit URLs sometimes contain username)
            let author = 'WSB User';
            if (result.url.includes('/user/') || result.url.includes('/u/')) {
              const userMatch = result.url.match(/\/u(?:ser)?\/([^\/]+)/);
              if (userMatch) {
                author = `u/${userMatch[1]}`;
              }
            }
            
            const post: WSBPost = {
              title: result.title || 'WSB Discussion',
              url: result.url,
              author: author,
              score: 0, // Would need Reddit API for actual scores
              comments: 0, // Would need Reddit API for comment counts
              created: postDate,
              content: result.snippet || undefined,
              snippet: result.description || result.snippet || undefined,
              domain: 'reddit.com'
            };
            
            posts.push(post);
          }
        }
      }

      // Generate sentiment analysis using OpenAI
      let sentiment = {
        overall: 'neutral' as const,
        confidence: 0,
        summary: 'No posts found for analysis.',
        keyThemes: [] as string[]
      };

      if (posts.length > 0) {
        sentiment = await generateSentimentAnalysis(args.ticker, posts);
      }

      return {
        posts: posts.slice(0, 10),
        sentiment
      };

    } catch (error) {
      console.error('Error in fetchWallStreetBetsData:', error);
      throw new Error(`Failed to fetch WSB data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

async function generateSentimentAnalysis(ticker: string, posts: WSBPost[]) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare content for analysis
    const postsContent = posts.map(post => 
      `Title: ${post.title}\nContent: ${post.content || 'No content'}`
    ).join('\n\n---\n\n');

    const prompt = `You are analyzing r/wallstreetbets posts about ${ticker}. Provide an honest analysis that captures the retail investor sentiment while being informative.

Posts to analyze:
${postsContent}

Provide a clear analysis:
1. Overall sentiment: bullish (positive/optimistic), bearish (negative/pessimistic), or neutral (mixed/uncertain)
2. Confidence level (0-100) - how confident are you based on the available posts?
3. Summary: Explain the general sentiment in clear terms, mentioning key drivers and community opinions
4. Key themes: What topics are being discussed? (earnings, technical analysis, market conditions, etc.)

Focus on identifying genuine sentiment trends rather than defaulting to neutral. Use accessible language that captures the community's perspective.

Respond in JSON format:
{
  "overall": "bullish|bearish|neutral",
  "confidence": number,
  "summary": "Clear summary of community sentiment and key discussion points",
  "keyThemes": ["main topics being discussed"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analyst specializing in retail investor communities. Provide clear, informative analysis that captures genuine community sentiment. Focus on identifying real trends and opinions while maintaining objectivity."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sentiment_analysis",
          schema: {
            type: "object",
            properties: {
              overall: {
                type: "string",
                enum: ["bullish", "bearish", "neutral"],
                description: "Overall sentiment classification"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 100,
                description: "Confidence level from 0 to 100"
              },
              summary: {
                type: "string",
                description: "Clear summary of community sentiment and key discussion points"
              },
              keyThemes: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Main topics being discussed",
                maxItems: 5
              }
            },
            required: ["overall", "confidence", "summary", "keyThemes"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // With structured outputs, JSON parsing is guaranteed to work
    const analysis = JSON.parse(content);
    return {
      overall: analysis.overall,
      confidence: analysis.confidence,
      summary: analysis.summary,
      keyThemes: analysis.keyThemes
    };

  } catch (error) {
    console.error('Error generating sentiment analysis:', error);
    return {
      overall: 'neutral' as const,
      confidence: 0,
      summary: 'Unable to analyze sentiment due to API error.',
      keyThemes: []
    };
  }
}
