import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Helper function to handle retries with exponential backoff for rate limits
async function retryFirecrawlRequest(
  requestFn: () => Promise<Response>,
  maxRetries: number = 3,
  baseDelay: number = 3000 // 3 seconds as suggested by Firecrawl
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await requestFn();
      
      // If it's a rate limit error (429), retry with delay
      if (response.status === 429 && attempt < maxRetries) {
        const errorText = await response.text();
        console.log(`Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${baseDelay * Math.pow(2, attempt)}ms...`);
        
        // Parse the error to get reset time if available
        let waitTime = baseDelay * Math.pow(2, attempt); // Exponential backoff
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.includes('retry after')) {
            // Extract retry time from error message if available
            const retryMatch = errorData.error.match(/retry after (\d+)s/);
            if (retryMatch) {
              waitTime = Math.max(waitTime, parseInt(retryMatch[1]) * 1000);
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use exponential backoff
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${baseDelay * Math.pow(2, attempt)}ms...`);
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Define the schema for Motley Fool stock data
const motleyFoolStockSchema = {
  type: "object",
  properties: {
    company_name: { type: "string" },
    current_price: { type: "string" },
    price_change: { type: "string" },
    price_change_percent: { type: "string" },
    market_cap: { type: "string" },
    pe_ratio: { type: "string" },
    dividend_yield: { type: "string" },
    fifty_two_week_high: { type: "string" },
    fifty_two_week_low: { type: "string" },
    volume: { type: "string" },
    sector: { type: "string" },
    description: { type: "string" }
  },
  required: []
};

// Define schema for earnings transcripts
const earningsTranscriptsSchema = {
  type: "object",
  properties: {
    transcripts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" },
          period: { type: "string" },
          url: { type: "string" }
        }
      }
    }
  },
  required: []
};

// Function to determine the exchange for a ticker using Yahoo Finance
async function getTickerExchange(ticker: string): Promise<string> {
  try {
    console.log(`Getting exchange info for ${ticker} from Yahoo Finance`);
    
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${ticker}`);
    
    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      return 'nasdaq'; // Default fallback
    }

    const data = await response.json();
    
    if (data.quotes && data.quotes.length > 0) {
      const quote = data.quotes[0];
      const exchange = quote.exchange;
      
      console.log(`Found exchange for ${ticker}: ${exchange}`);
      
      // Map Yahoo Finance exchange codes to Motley Fool URL paths
      switch (exchange?.toLowerCase()) {
        case 'nyse':
        case 'nys':
        case 'nyq':  // NYSE Arca (NYSE MKT) - map to nyse
          return 'nyse';
        case 'nasdaq':
        case 'nms':
        case 'ncm':
          return 'nasdaq';
        case 'amex':
        case 'ase':
          return 'amex';
        default:
          console.log(`Unknown exchange ${exchange} for ${ticker}, defaulting to nasdaq`);
          return 'nasdaq';
      }
    }
    
    console.log(`No exchange data found for ${ticker}, defaulting to nasdaq`);
    return 'nasdaq';
  } catch (error) {
    console.error(`Error getting exchange for ${ticker}:`, error);
    return 'nasdaq'; // Default fallback
  }
}

// Function to scrape Motley Fool stock data
async function scrapeMotleyFoolData(ticker: string) {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }

    // Get the correct exchange for the ticker
    const exchange = await getTickerExchange(ticker);
    const url = `https://www.fool.com/quote/${exchange}/${ticker.toLowerCase()}`;
    console.log(`Scraping Motley Fool data for ${ticker} from: ${url}`);

    const response = await retryFirecrawlRequest(() => 
      fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: [{
            type: "json",
            schema: motleyFoolStockSchema
          }],
          onlyMainContent: true,
          waitFor: 3000
        })
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl API error for ${ticker}:`, response.status, errorText);
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`Motley Fool result for ${ticker}:`, JSON.stringify(result, null, 2));

    if (result.success && result.data?.json) {
      return {
        success: true,
        data: result.data.json,
        exchange: exchange,
        url: url
      };
    } else {
      console.error(`Failed to scrape Motley Fool data for ${ticker}:`, result);
      return {
        success: false,
        error: result.error || 'Failed to extract stock data',
        exchange: exchange,
        url: url
      };
    }
  } catch (error) {
    console.error(`Error scraping Motley Fool data for ${ticker}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      exchange: 'nasdaq',
      url: `https://www.fool.com/quote/nasdaq/${ticker.toLowerCase()}`
    };
  }
}

// Function to scrape Motley Fool earnings transcripts
async function scrapeMotleyFoolEarningsTranscripts(ticker: string, exchange: string) {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }

    const url = `https://www.fool.com/quote/${exchange}/${ticker.toLowerCase()}/#quote-earnings-transcripts`;
    console.log(`Scraping Motley Fool earnings transcripts for ${ticker} from: ${url}`);

    const response = await retryFirecrawlRequest(() =>
      fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: [{
            type: "json",
            schema: earningsTranscriptsSchema
          }],
          onlyMainContent: true,
          waitFor: 3000
        })
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl API error for earnings transcripts ${ticker}:`, response.status, errorText);
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`Motley Fool earnings transcripts result for ${ticker}:`, JSON.stringify(result, null, 2));

    if (result.success && result.data?.json) {
      return {
        success: true,
        data: result.data.json,
        url: url
      };
    } else {
      console.error(`Failed to scrape Motley Fool earnings transcripts for ${ticker}:`, result);
      return {
        success: false,
        error: result.error || 'Failed to extract transcripts',
        url: url
      };
    }
  } catch (error) {
    console.error(`Error scraping Motley Fool earnings transcripts for ${ticker}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: `https://www.fool.com/quote/${exchange}/${ticker.toLowerCase()}/#quote-earnings-transcripts`
    };
  }
}

// Function to scrape earnings transcript content
async function scrapeEarningsTranscript(transcriptUrl: string) {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }

    console.log(`Scraping earnings transcript from: ${transcriptUrl}`);

    const response = await retryFirecrawlRequest(() =>
      fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: transcriptUrl,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000
        })
      })
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl API error for transcript:`, response.status, errorText);
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`Transcript scraping result:`, JSON.stringify(result, null, 2));

    if (result.success && result.data?.markdown) {
      return {
        success: true,
        content: result.data.markdown,
        url: transcriptUrl
      };
    } else {
      console.error(`Failed to scrape transcript:`, result);
      return {
        success: false,
        error: result.error || 'Failed to extract transcript content',
        url: transcriptUrl
      };
    }
  } catch (error) {
    console.error(`Error scraping transcript:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: transcriptUrl
    };
  }
}

// Function to summarize earnings transcript using OpenAI
async function summarizeEarningsTranscript(transcriptContent: string, ticker: string, companyName: string) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    console.log(`Summarizing earnings transcript for ${ticker}`);

    const prompt = `Summarize ${companyName} (${ticker})s earnings call like you're talking to active investors hunting for opportunities. Cut through the corporate fluff and focus on what actually matters for the stock:

  The headline numbers (revenue, earnings, guidance — beats or misses).

  Any big moves or strategic plays management is making.

  How leadership sees the road ahead — optimism, caution, or hedging?

  Risks, red flags, or challenges investors should keep on their radar.

  The overall vibe: bullish, bearish, or mixed — and why that matters for anyone thinking about buying, holding, or selling.

  Keep it punchy (under 200 words), actionable, and written in a way that gives investors the real story without the jargon.
  Transcript content:
  ${transcriptContent} // Limit content to avoid token limits`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error:`, response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`OpenAI summarization result:`, JSON.stringify(result, null, 2));

    if (result.choices && result.choices[0] && result.choices[0].message) {
      return {
        success: true,
        summary: result.choices[0].message.content.trim()
      };
    } else {
      console.error(`Failed to get summary from OpenAI:`, result);
      return {
        success: false,
        error: 'Failed to generate summary'
      };
    }
  } catch (error) {
    console.error(`Error summarizing transcript:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Action to get comprehensive Motley Fool data for a stock
export const getMotleyFoolData = action({
  args: { ticker: v.string() },
  handler: async (ctx, args): Promise<{
    stockData: any;
    latestEarnings?: any;
    success: boolean;
    errors?: string[];
  }> => {
    const ticker = args.ticker.toUpperCase();
    console.log(`Getting Motley Fool data for ${ticker}`);

    try {
      // First get the stock data to determine exchange
      const stockDataResult = await scrapeMotleyFoolData(ticker);
      
      let latestEarnings = null;
      const errors: string[] = [];
      
      if (!stockDataResult.success) {
        errors.push(`Stock data: ${stockDataResult.error}`);
      }

      // If we got the exchange info, try to get earnings transcripts
      if (stockDataResult.success && stockDataResult.exchange) {
        const earningsResult = await scrapeMotleyFoolEarningsTranscripts(ticker, stockDataResult.exchange);
        
        if (!earningsResult.success) {
          errors.push(`Earnings transcripts: ${earningsResult.error}`);
        }

        // Get and summarize the latest earnings transcript
        if (earningsResult.success && earningsResult.data?.transcripts && earningsResult.data.transcripts.length > 0) {
          const latestTranscript = earningsResult.data.transcripts[0]; // Most recent is first
          
          console.log(`Processing latest earnings transcript: ${latestTranscript.title}`);
          
          const transcriptResult = await scrapeEarningsTranscript(latestTranscript.url);
          if (transcriptResult.success) {
            const companyName = stockDataResult.data?.company_name || ticker;
            const summaryResult = await summarizeEarningsTranscript(
              transcriptResult.content, 
              ticker, 
              companyName
            );
            
            if (summaryResult.success) {
              latestEarnings = {
                title: latestTranscript.title.toLowerCase(),
                date: latestTranscript.date.toLowerCase(),
                period: latestTranscript.period || latestTranscript.quarter.toLowerCase(),
                url: latestTranscript.url,
                summary: summaryResult.summary.toLowerCase()
              };
            } else {
              errors.push(`Earnings summary: ${summaryResult.error}`);
            }
          } else {
            errors.push(`Transcript scraping: ${transcriptResult.error}`);
          }
        }
      }

      return {
        stockData: stockDataResult.success ? stockDataResult.data : null,
        latestEarnings,
        success: stockDataResult.success,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error(`Error getting Motley Fool data for ${ticker}:`, error);
      return {
        stockData: null,
        latestEarnings: null,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  },
});

// Action to refresh Motley Fool data for a specific ticker
export const refreshMotleyFoolData = action({
  args: { ticker: v.string() },
  handler: async (ctx, args): Promise<{
    stockData: any;
    latestEarnings?: any;
    success: boolean;
    errors?: string[];
  }> => {
    return await ctx.runAction(api.firecrawlActions.getMotleyFoolData, { ticker: args.ticker });
  },
});
