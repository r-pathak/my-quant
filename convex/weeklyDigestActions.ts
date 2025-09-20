import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Resend } from "resend";
import { render } from "@react-email/render";
import OpenAI from "openai";

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Main cron job function
export const sendWeeklyDigests = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting weekly digest cron job...");
    
    try {
      // Get all users
      const users = await ctx.runQuery(internal.weeklyDigestActions.getAllUsers);
      console.log(`Found ${users.length} users to process`);

      // Process each user
      for (const user of users) {
        try {
          await ctx.runAction(internal.weeklyDigestActions.processUserDigest, {
            userId: user._id,
            userEmail: user.email || "",
          });
          console.log(`Processed digest for user: ${user.email}`);
        } catch (error) {
          console.error(`Failed to process digest for user ${user.email}:`, error);
          // Continue with other users even if one fails
        }
      }

      console.log("Weekly digest cron job completed successfully");
    } catch (error) {
      console.error("Weekly digest cron job failed:", error);
      throw error;
    }
  },
});

// Get all users
export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Process individual user digest
export const processUserDigest = internalAction({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
  },
  handler: async (ctx, { userId, userEmail }) => {
    try {
      // Get user's holdings (top 10 by value)
      const holdings = await ctx.runQuery(internal.weeklyDigestActions.getUserTopHoldings, {
        userId,
      });

      // Get user's research stocks (up to 10)
      const researchStocks = await ctx.runQuery(internal.weeklyDigestActions.getUserResearchStocks, {
        userId,
      });

      // Update prices for all stocks
      const allTickers = [
        ...holdings.map((h: any) => h.ticker),
        ...researchStocks.map((r: any) => r.ticker),
      ];
      
      if (allTickers.length > 0) {
        await ctx.runAction(api.priceActions.updatePricesForTickers, {
          tickers: [...new Set(allTickers)], // Remove duplicates
        });
      }

      // Get updated holdings and research stocks with current prices
      const updatedHoldings = await ctx.runQuery(internal.weeklyDigestActions.getUserTopHoldings, {
        userId,
      });
      const updatedResearchStocks = await ctx.runQuery(internal.weeklyDigestActions.getUserResearchStocks, {
        userId,
      });

      // Scrape news for all tickers
      const newsData = await ctx.runAction(internal.weeklyDigestActions.scrapeNewsForTickers, {
        tickers: [...new Set(allTickers)],
      });

      // Generate AI summaries and recommendations
      const holdingsWithAnalysis = await Promise.all(
        updatedHoldings.map(async (holding: any) => {
          const tickerNews = newsData.filter((news: any) => 
            news.ticker === holding.ticker || 
            news.content.toLowerCase().includes(holding.companyName.toLowerCase())
          );
          
          const analysis = await ctx.runAction(internal.weeklyDigestActions.generateStockAnalysis, {
            ticker: holding.ticker,
            companyName: holding.companyName,
            currentPrice: holding.currentPrice || 0,
            boughtPrice: holding.boughtPrice,
            newsData: tickerNews,
          });

          return {
            symbol: holding.ticker,
            companyName: holding.companyName,
            currentPrice: holding.currentPrice || 0,
            priceChange: (holding.currentPrice || 0) - holding.boughtPrice,
            priceChangePercent: holding.currentPrice 
              ? ((holding.currentPrice - holding.boughtPrice) / holding.boughtPrice) * 100 
              : 0,
            value: (holding.currentPrice || 0) * holding.unitsHeld,
            shares: holding.unitsHeld,
            recommendation: analysis.recommendation,
            summary: analysis.summary,
          };
        })
      );

      const researchWithAnalysis = await Promise.all(
        updatedResearchStocks.map(async (stock: any) => {
          const tickerNews = newsData.filter((news: any) => 
            news.ticker === stock.ticker || 
            news.content.toLowerCase().includes(stock.companyName.toLowerCase())
          );
          
          const analysis = await ctx.runAction(internal.weeklyDigestActions.generateStockAnalysis, {
            ticker: stock.ticker,
            companyName: stock.companyName,
            currentPrice: stock.currentPrice || 0,
            boughtPrice: stock.currentPrice || 0, // For research stocks, use current price as baseline
            newsData: tickerNews,
          });

          return {
            symbol: stock.ticker,
            companyName: stock.companyName,
            currentPrice: stock.currentPrice || 0,
            priceChange: stock.change || 0,
            priceChangePercent: stock.changePercent || 0,
            recommendation: analysis.recommendation,
            summary: analysis.summary,
            researchReason: "Added to your research watchlist for potential opportunities",
          };
        })
      );

      // Calculate portfolio metrics
      const totalPortfolioValue = holdingsWithAnalysis.reduce((sum: number, holding: any) => sum + holding.value, 0);
      const totalPortfolioChange = holdingsWithAnalysis.reduce((sum: number, holding: any) => sum + holding.priceChange * holding.shares, 0);
      const portfolioChangePercent = totalPortfolioValue > 0 ? (totalPortfolioChange / (totalPortfolioValue - totalPortfolioChange)) * 100 : 0;

      // Generate and send email
      await ctx.runAction(internal.weeklyDigestActions.sendDigestEmail, {
        userEmail,
        userName: userEmail.split('@')[0], // Use email prefix as name
        weekEnding: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        topHoldings: holdingsWithAnalysis,
        researchStocks: researchWithAnalysis,
        totalPortfolioValue,
        portfolioChange: totalPortfolioChange,
        portfolioChangePercent,
      });

    } catch (error) {
      console.error(`Error processing digest for user ${userEmail}:`, error);
      throw error;
    }
  },
});

// Get user's top holdings by value
export const getUserTopHoldings = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const holdings = await ctx.db
      .query("holdings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sort by value (currentPrice * unitsHeld) and take top 10
    return holdings
      .map(holding => ({
        ...holding,
        value: (holding.currentPrice || holding.boughtPrice) * holding.unitsHeld,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  },
});

// Get user's research stocks
export const getUserResearchStocks = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const researchStocks = await ctx.db
      .query("researchStocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Take up to 10 research stocks
    return researchStocks.slice(0, 10);
  },
});

// Scrape news for tickers
export const scrapeNewsForTickers = internalAction({
  args: { tickers: v.array(v.string()) },
  handler: async (ctx, { tickers }) => {
    const newsData = [];
    
    try {
      // Use existing news action to fetch news for holdings
      const holdingsData = tickers.map(ticker => ({
        ticker,
        companyName: ticker, // Simplified for now
      }));
      
      const news: any[] = await ctx.runAction(api.newsActions.fetchTopHoldingsNews, {
        holdings: holdingsData,
      });
      
      // Map news items to include ticker information
      for (const item of news) {
        // Try to match news item to ticker based on title content
        const matchingTicker = tickers.find((ticker: string) => 
          item.title.toLowerCase().includes(ticker.toLowerCase())
        );
        
        newsData.push({
          ticker: matchingTicker || tickers[0], // Default to first ticker if no match
          title: item.title,
          content: item.summary || '',
          url: item.url,
          source: item.source,
          publishedAt: item.publishedAt,
        });
      }
    } catch (error) {
      console.error('Failed to scrape news:', error);
    }
    
    return newsData;
  },
});

// Generate AI analysis for a stock
export const generateStockAnalysis = internalAction({
  args: {
    ticker: v.string(),
    companyName: v.string(),
    currentPrice: v.number(),
    boughtPrice: v.number(),
    newsData: v.array(v.any()),
  },
  handler: async (ctx, { ticker, companyName, currentPrice, boughtPrice, newsData }) => {
    try {
      const priceChange = currentPrice - boughtPrice;
      const priceChangePercent = boughtPrice > 0 ? (priceChange / boughtPrice) * 100 : 0;
      
      const newsContext = newsData
        .slice(0, 5) // Limit to 5 most recent news items
        .map(news => `- ${news.title}: ${news.summary || news.content?.substring(0, 200)}`)
        .join('\n');

      const prompt = `
Analyze ${ticker} (${companyName}) for a trading recommendation.

Current Price: $${currentPrice}
Previous/Bought Price: $${boughtPrice}
Price Change: ${priceChangePercent.toFixed(2)}%

Recent News (last 7 days):
${newsContext || 'No recent news available'}

Provide a concise analysis (max 150 words) and a clear recommendation (BUY, SELL, or HOLD).
Focus on:
1. Key factors affecting the stock
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
            content: "You are a professional financial analyst providing concise, actionable trading recommendations. Be objective and consider both risks and opportunities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "";
      const lines = content.split('\n');
      
      let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let summary = content;

      // Parse recommendation
      const recLine = lines.find(line => line.startsWith('RECOMMENDATION:'));
      if (recLine) {
        const rec = recLine.replace('RECOMMENDATION:', '').trim().toUpperCase();
        if (rec === 'BUY' || rec === 'SELL' || rec === 'HOLD') {
          recommendation = rec as 'BUY' | 'SELL' | 'HOLD';
        }
      }

      // Parse analysis
      const analysisLine = lines.find(line => line.startsWith('ANALYSIS:'));
      if (analysisLine) {
        summary = analysisLine.replace('ANALYSIS:', '').trim();
      }

      return {
        recommendation,
        summary: summary || `${ticker} analysis based on current market conditions and recent news.`,
      };

    } catch (error) {
      console.error(`Failed to generate analysis for ${ticker}:`, error);
      return {
        recommendation: 'HOLD' as const,
        summary: `Unable to generate analysis for ${ticker} at this time. Please review manually.`,
      };
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
  },
  handler: async (ctx, emailData) => {
    try {
      // Import the email template dynamically
      const { WeeklyDigestEmail } = await import("../email_templates/weekly-digest");
      
      // Render the email
      const emailHtml = await render(WeeklyDigestEmail(emailData));
      
      // Send via Resend
      const result = await resend.emails.send({
        from: `myquant. <digest@${process.env.EMAIL_DOMAIN || 'yourdomain.com'}>`,
        to: [emailData.userEmail],
        subject: `your weekly myquant. digest`,
        html: emailHtml,
      });

      console.log(`Email sent successfully to ${emailData.userEmail}:`, result);
      return result;

    } catch (error) {
      console.error(`Failed to send email to ${emailData.userEmail}:`, error);
      throw error;
    }
  },
});
