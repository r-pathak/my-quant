"use node";

import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Resend } from "resend";
import { render } from "@react-email/render";
import OpenAI from "openai";
import Firecrawl from '@mendable/firecrawl-js';

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

// Main cron job function
export const sendWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Starting weekly digest cron job...");
    
    try {
      // Get all users
      const users = await ctx.runQuery(internal.weeklyDigestQueries.getAllUsers);
      console.log(`📧 Found ${users.length} users to process`);

      // Process each user
      for (const user of users) {
        try {
          await ctx.runAction(internal.weeklyDigestEngine.processUserDigest, {
            userId: user._id,
            userEmail: user.email || "",
            userName: user.name || "",
          });
          console.log(`✅ Processed digest for user: ${user.email}`);
        } catch (error) {
          console.error(`❌ Failed to process digest for user ${user.email}:`, error);
          // Continue with other users even if one fails
        }
      }

      console.log("🎉 Weekly digest cron job completed successfully");
    } catch (error) {
      console.error("💥 Weekly digest cron job failed:", error);
      throw error;
    }
  },
});

// Process individual user digest - COMPLETE IMPLEMENTATION
export const processUserDigest = internalAction({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, { userId, userEmail, userName }) => {
    console.log(`🔄 Processing digest for ${userEmail}`);
    
    try {
      // 1. Get user's holdings and research stocks
      const allHoldings = await ctx.runQuery(internal.weeklyDigestQueries.getUserHoldings, { userId });
      const allResearchStocks = await ctx.runQuery(internal.weeklyDigestQueries.getUserResearchStocks, { userId });
      
      if (allHoldings.length === 0 && allResearchStocks.length === 0) {
        console.log(`⏭️ User ${userEmail} has no holdings or research stocks, skipping`);
        return;
      }

      // 2. Get top 10 holdings by value and limit research to 10
      const topHoldings = allHoldings
        .map(h => ({ ...h, value: (h.currentPrice || h.boughtPrice) * h.unitsHeld }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      // Filter out research stocks that are already in portfolio
      const portfolioTickers = new Set(topHoldings.map(h => h.ticker));
      const researchStocks = allResearchStocks
        .filter(r => !portfolioTickers.has(r.ticker))
        .slice(0, 10);
      
      console.log(`📊 Processing ${topHoldings.length} holdings and ${researchStocks.length} research stocks`);

      // 3. Get all unique tickers
      const allTickers = [...new Set([
        ...topHoldings.map(h => h.ticker),
        ...researchStocks.map(r => r.ticker),
      ])];

      // 4. Fetch current prices from Yahoo Finance
      const priceData = await ctx.runAction(internal.weeklyDigestEngine.fetchCurrentPrices, {
        tickers: allTickers,
      });

      // 5. Process holdings with AI analysis
      const holdingsWithAnalysis = await Promise.all(
        topHoldings.map(async (holding) => {
          const currentPrice = priceData[holding.ticker]?.price || holding.boughtPrice;
          const weeklyChange = priceData[holding.ticker]?.weeklyChange || 0; // Actual weekly price change
          const weeklyChangePercent = priceData[holding.ticker]?.weeklyChangePercent || 0; // Actual weekly %
          const priceWeekAgo = priceData[holding.ticker]?.priceWeekAgo || currentPrice;
          
          // Calculate weekly value change for this holding
          const currentValue = currentPrice * holding.unitsHeld;
          const valueWeekAgo = priceWeekAgo * holding.unitsHeld;
          const weeklyValueChange = currentValue - valueWeekAgo;
          
          // Calculate all-time performance for display
          const allTimeChange = currentPrice - holding.boughtPrice;
          const allTimeChangePercent = holding.boughtPrice > 0 ? (allTimeChange / holding.boughtPrice) * 100 : 0;
          
          // Get news and AI analysis
          const analysis = await ctx.runAction(internal.weeklyDigestEngine.getStockAnalysisWithNews, {
            ticker: holding.ticker,
            companyName: holding.companyName,
            currentPrice,
            boughtPrice: holding.boughtPrice,
          });

          return {
            symbol: holding.ticker,
            companyName: holding.companyName,
            currentPrice,
            priceChange: allTimeChange, // All-time change for display
            priceChangePercent: allTimeChangePercent, // All-time % for display
            weeklyChange: weeklyChange, // Weekly price change
            weeklyChangePercent: weeklyChangePercent, // Weekly % change
            weeklyValueChange: weeklyValueChange, // Weekly value change for this holding
            value: currentPrice * holding.unitsHeld,
            shares: holding.unitsHeld,
            recommendation: analysis.recommendation,
            summary: analysis.summary,
            newsUrls: analysis.newsUrls,
          };
        })
      );

      // 6. Process research stocks with AI analysis
      const researchWithAnalysis = await Promise.all(
        researchStocks.map(async (stock) => {
          const currentPrice = priceData[stock.ticker]?.price || stock.currentPrice || 0;
          const weeklyChange = priceData[stock.ticker]?.weeklyChange || stock.change || 0;
          const weeklyChangePercent = priceData[stock.ticker]?.weeklyChangePercent || stock.changePercent || 0;
          
          // Get news and AI analysis
          const analysis = await ctx.runAction(internal.weeklyDigestEngine.getStockAnalysisWithNews, {
            ticker: stock.ticker,
            companyName: stock.companyName,
            currentPrice,
            boughtPrice: currentPrice, // Use current as baseline for research stocks
          });

          return {
            symbol: stock.ticker,
            companyName: stock.companyName,
            currentPrice,
            priceChange: weeklyChange,
            priceChangePercent: weeklyChangePercent,
            weeklyChangePercent: weeklyChangePercent, // Add weekly change for display
            recommendation: analysis.recommendation,
            summary: analysis.summary,
            researchReason: "Added to your research watchlist for potential opportunities",
            newsUrls: analysis.newsUrls,
          };
        })
      );

      // 7. Calculate portfolio metrics
      const totalPortfolioValue = holdingsWithAnalysis.reduce((sum, holding) => sum + holding.value, 0);
      
      // Calculate weekly portfolio change using actual weekly value changes
      const totalWeeklyPortfolioChange = holdingsWithAnalysis.reduce((sum, holding) => sum + holding.weeklyValueChange, 0);
      const portfolioValueWeekAgo = totalPortfolioValue - totalWeeklyPortfolioChange;
      const weeklyPortfolioChangePercent = portfolioValueWeekAgo > 0 ? (totalWeeklyPortfolioChange / portfolioValueWeekAgo) * 100 : 0;

      // 8. Generate portfolio overview with AI
      const portfolioOverview = await ctx.runAction(internal.weeklyDigestEngine.generatePortfolioOverview, {
        holdingsWithAnalysis,
        researchWithAnalysis,
        totalPortfolioValue,
        totalPortfolioChange: totalWeeklyPortfolioChange,
        portfolioChangePercent: weeklyPortfolioChangePercent,
      });

      // 9. Send email
      // Get user's first name (lowercase)
      const firstName = userName 
        ? userName.split(' ')[0].toLowerCase()
        : userEmail.split('@')[0].toLowerCase();

      await ctx.runAction(internal.weeklyDigestEngine.sendDigestEmail, {
        userEmail,
        userName: firstName,
        weekEnding: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        topHoldings: holdingsWithAnalysis,
        researchStocks: researchWithAnalysis,
        totalPortfolioValue,
        portfolioChange: totalWeeklyPortfolioChange, // Use weekly change
        portfolioChangePercent: weeklyPortfolioChangePercent, // Use weekly %
        portfolioOverview,
      });

      console.log(`✅ Successfully processed and sent digest for ${userEmail}`);

    } catch (error) {
      console.error(`💥 Error processing digest for user ${userEmail}:`, error);
      throw error;
    }
  },
});

// Fetch current and weekly prices from Yahoo Finance (no auth needed)
export const fetchCurrentPrices = internalAction({
  args: { tickers: v.array(v.string()) },
  handler: async (ctx, { tickers }) => {
    console.log(`💰 Fetching current and weekly prices for ${tickers.length} tickers`);
    const results: { [key: string]: { price: number; change: number; changePercent: number; weeklyChange: number; weeklyChangePercent: number; priceWeekAgo: number } } = {};
    
    for (const ticker of tickers) {
      try {
        // Get 1 week of data (5 trading days)
        const period1 = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000); // 1 week ago
        const period2 = Math.floor(Date.now() / 1000); // Now
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`❌ HTTP error for ${ticker}! status: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
          const result = data.chart.result[0];
          const meta = result.meta;
          const timestamps = result.timestamp;
          const closes = result.indicators.quote[0].close;
          
          if (meta && timestamps && closes && closes.length > 0) {
            const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0;
            const previousClose = meta.previousClose || currentPrice;
            const dailyChange = currentPrice - previousClose;
            const dailyChangePercent = previousClose > 0 ? (dailyChange / previousClose) * 100 : 0;
            
            // Get price from a week ago (first available price in the data)
            const priceWeekAgo = closes[0] || currentPrice;
            const weeklyChange = currentPrice - priceWeekAgo;
            const weeklyChangePercent = priceWeekAgo > 0 ? (weeklyChange / priceWeekAgo) * 100 : 0;
            
            results[ticker] = {
              price: currentPrice,
              change: dailyChange,
              changePercent: dailyChangePercent,
              weeklyChange,
              weeklyChangePercent,
              priceWeekAgo
            };
            console.log(`✅ ${ticker}: $${currentPrice.toFixed(2)} (daily: ${dailyChangePercent.toFixed(2)}%, weekly: ${weeklyChangePercent.toFixed(2)}%)`);
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching price for ${ticker}:`, error);
        // Fallback to current price only
        try {
          const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
          const fallbackResponse = await fetch(fallbackUrl);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.chart?.result?.[0]?.meta) {
              const meta = fallbackData.chart.result[0].meta;
              const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
              const previousClose = meta.previousClose || currentPrice;
              const change = currentPrice - previousClose;
              const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
              
              results[ticker] = {
                price: currentPrice,
                change,
                changePercent,
                weeklyChange: change, // Use daily as fallback
                weeklyChangePercent: changePercent,
                priceWeekAgo: previousClose
              };
            }
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback failed for ${ticker}:`, fallbackError);
        }
      }
    }
    
    return results;
  },
});

// Get stock analysis with news scraping and AI summary
export const getStockAnalysisWithNews = internalAction({
  args: {
    ticker: v.string(),
    companyName: v.string(),
    currentPrice: v.number(),
    boughtPrice: v.number(),
  },
  handler: async (ctx, { ticker, companyName, currentPrice, boughtPrice }) => {
    console.log(`🔍 Analyzing ${ticker} with news and AI`);
    
    try {
      // 1. Search for news from the last week
      const searchQuery = `${ticker} ${companyName} stock news`;
      console.log(`📰 Searching for: ${searchQuery}`);
      
      const searchResults = await firecrawl.search(searchQuery, {
        tbs: 'qdr:w', // Past week
        sources: ['news'],
        limit: 2 // Get 2 articles
      });

      let newsContent = '';
      const newsUrls: string[] = [];
      
      // 2. Scrape the news articles
      const resultsNews = (searchResults as any)?.news;
      if (resultsNews && Array.isArray(resultsNews)) {
        console.log(`📄 Found ${resultsNews.length} news articles for ${ticker}`);
        
        for (const newsItem of resultsNews.slice(0, 2)) {
          if (newsItem.url) {
            try {
              console.log(`🕷️ Scraping: ${newsItem.url}`);
              const scrapeResult = await firecrawl.scrape(newsItem.url, {
                formats: ['markdown'],
                onlyMainContent: true,
              });
              
              if (scrapeResult && scrapeResult.markdown) {
                newsContent += `\n\nArticle: ${newsItem.title}\n${scrapeResult.markdown.substring(0, 1000)}`;
                newsUrls.push(newsItem.url);
              }
            } catch (scrapeError) {
              console.error(`❌ Error scraping ${newsItem.url}:`, scrapeError);
              // Use snippet as fallback
              newsContent += `\n\nArticle: ${newsItem.title}\n${newsItem.snippet || ''}`;
              newsUrls.push(newsItem.url);
            }
          }
        }
      }

      // 3. Generate AI analysis
      const priceChange = currentPrice - boughtPrice;
      const priceChangePercent = boughtPrice > 0 ? (priceChange / boughtPrice) * 100 : 0;
      
      const prompt = `
Analyze ${ticker} (${companyName}) for a trading recommendation.

Current Price: $${currentPrice.toFixed(2)}
Previous/Bought Price: $${boughtPrice.toFixed(2)}
Price Change: ${priceChangePercent.toFixed(2)}%

Recent News (last 7 days):
${newsContent || 'No recent news available'}

News Sources: ${newsUrls.join(', ')}

Provide a concise analysis (max 120 words) and a clear recommendation (BUY, SELL, or HOLD).
Focus on:
1. Key factors from the news affecting the stock
2. Technical and fundamental outlook
3. Risk assessment
4. Clear rationale for recommendation

Format your response as:
RECOMMENDATION: [BUY/SELL/HOLD]
ANALYSIS: [Your analysis here]
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional financial analyst providing concise, actionable trading recommendations. Be objective and consider both risks and opportunities. Keep analysis under 120 words."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 250,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Parse recommendation and analysis
      let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let summary = content;

      const lines = content.split('\n');
      const recLine = lines.find(line => line.startsWith('RECOMMENDATION:'));
      if (recLine) {
        const rec = recLine.replace('RECOMMENDATION:', '').trim().toUpperCase();
        if (rec === 'BUY' || rec === 'SELL' || rec === 'HOLD') {
          recommendation = rec as 'BUY' | 'SELL' | 'HOLD';
        }
      }

      const analysisLine = lines.find(line => line.startsWith('ANALYSIS:'));
      if (analysisLine) {
        summary = analysisLine.replace('ANALYSIS:', '').trim();
      }

      console.log(`🤖 AI Analysis for ${ticker}: ${recommendation} - ${summary.substring(0, 50)}...`);

      return {
        recommendation,
        summary: summary || `${ticker} analysis based on current market conditions and recent news.`,
        newsUrls,
      };

    } catch (error) {
      console.error(`❌ Failed to generate analysis for ${ticker}:`, error);
      return {
        recommendation: 'HOLD' as const,
        summary: `Unable to generate analysis for ${ticker} at this time. Please review manually.`,
        newsUrls: [],
      };
    }
  },
});

// Generate portfolio overview with AI
export const generatePortfolioOverview = internalAction({
  args: {
    holdingsWithAnalysis: v.array(v.any()),
    researchWithAnalysis: v.array(v.any()),
    totalPortfolioValue: v.number(),
    totalPortfolioChange: v.number(),
    portfolioChangePercent: v.number(),
  },
  handler: async (ctx, { holdingsWithAnalysis, researchWithAnalysis, totalPortfolioValue, totalPortfolioChange, portfolioChangePercent }) => {
    console.log(`🤖 Generating portfolio overview with AI`);
    
    try {
      // Prepare portfolio summary data with weekly changes and news
      const holdingsSummary = holdingsWithAnalysis.map(h => {
        // Use actual weekly change percentage
        const weeklyChange = h.weeklyChangePercent || 0;
        const newsSummary = h.summary ? h.summary.substring(0, 150) + '...' : 'No recent news analysis available';
        return `${h.symbol}: ${h.recommendation} (${weeklyChange.toFixed(1)}% weekly, $${h.value.toLocaleString()} value) - ${newsSummary}`;
      }).join('\n');
      
      const researchSummary = researchWithAnalysis.map(r => {
        const weeklyChange = r.priceChangePercent || 0;
        return `${r.symbol}: ${r.recommendation} (${weeklyChange.toFixed(1)}% weekly)`;
      }).join('\n');

      const prompt = `
Provide a brief portfolio summary for this week.

PORTFOLIO: $${totalPortfolioValue.toLocaleString()} total value

HOLDINGS WITH NEWS ANALYSIS (${holdingsWithAnalysis.length}):
${holdingsSummary}

Based on the above holdings, their performance, recommendations, and news analysis, write a concise portfolio summary (max 150 words) covering:
- Overall portfolio performance and trends
- Key news themes affecting your holdings
- Notable winners/losers and why
- Market sentiment from the news

No bullet points or sections - just a flowing, insightful paragraph in a professional but conversational tone. Address the portfolio owner directly using 'your portfolio' rather than 'the portfolio'.

Your answer should be less than 150 words in total.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional portfolio analyst providing weekly investment insights. Be concise, actionable, and focus on the most important trends and opportunities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
      });

      const overview = response.choices[0]?.message?.content || "Portfolio analysis unavailable at this time.";
      
      console.log(`✅ Generated portfolio overview: ${overview.substring(0, 100)}...`);
      return overview;

    } catch (error) {
      console.error(`❌ Failed to generate portfolio overview:`, error);
      return "Your portfolio analysis will be available in the next digest. Individual stock recommendations are provided below.";
    }
  },
});

// Send digest email
export const sendDigestEmail = internalAction({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    weekEnding: v.string(),
    topHoldings: v.array(v.any()),
    researchStocks: v.array(v.any()),
    totalPortfolioValue: v.number(),
    portfolioChange: v.number(),
    portfolioChangePercent: v.number(),
    portfolioOverview: v.optional(v.string()),
  },
  handler: async (ctx, emailData) => {
    console.log(`📧 Sending email to ${emailData.userEmail}`);
    
    try {
      // Import the email template dynamically
      const { WeeklyDigestEmail } = await import("../email_templates/weekly-digest");
      
      // Render the email
      const emailHtml = await render(WeeklyDigestEmail(emailData));
      
      // Send via Resend
      const result = await resend.emails.send({
        from: `myquant. <digest@resend.dev>`,
        to: [emailData.userEmail],
        subject: `myquant. weekly digest - ${emailData.weekEnding}`,
        html: emailHtml,
      });

      console.log(`✅ Email sent successfully to ${emailData.userEmail}:`, result);
      return result;

    } catch (error) {
      console.error(`❌ Failed to send email to ${emailData.userEmail}:`, error);
      throw error;
    }
  },
});
