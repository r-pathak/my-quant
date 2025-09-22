import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);

// Vapi proxy endpoint for in-browser voice calls
http.route({
  path: "/vapi/call",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Handle CORS preflight
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const vapiApiKey = process.env.VAPI_API_KEY;
      if (!vapiApiKey) {
        return new Response(
          JSON.stringify({ error: "VAPI_API_KEY not configured" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Parse the request body - extract custom data as per Vapi guide
      const body = await request.json();
      const { userId, assistantType, holdings, ...rest } = body;

      // Map custom data to assistant configuration as per Vapi guide
      const getAssistantConfig = (userId: string, assistantType: string, holdings: any[]) => {
        // Generate system message based on holdings
        const generateSystemMessage = () => {
        if (!holdings || holdings.length === 0) {
          return "You are an accomplished finance expert. You never miss a beat when it comes to news regarding stocks.\n\nYou can use the mcp TOOL WITH FIRECRAWL TO RESEARCH STOCKS ANY TIME AND GIVE THE CALL RECIPIENT INFORMATIVE DETAILS ON THE LATEST NEWS ABOUT STOCKS.\n\nWhen using the firecrawl tool, search for relevant news then scrape it. Summarise the findings of the news and how they impact the stock or stocks in general. Try to summarise information rather than regurgitate it and offer an interpretation on how it might impact the market or markets in question. Summarise the contents of several articles at once if needs be, just keep things conversational and not just speak for ages and ages.\n\nYou're a slick talking, charming finance bro, act like one. If the user asks about a list of stocks, you need to pick them one by one and use the firecrawl tool.\n\nThe tool should return 3-5 articles, and you can summarise the findings from each of them, as if a natural response to whats going on with the stock. Do not exhaustively list things in a robotic manner, synthesise and condense the info. Do not numerate and list out each news item, that feels very boring and robotic. Prioritise the most recent news and go through it as a seamless soliloquy, rather than some list by list robotic bs. At the end of your summary, talk about how the news will impact price.\n\nNever ever quote your sources, the whole point is that you appear to be the bearer of the news to build trust with the recipient.\n\njust summarise the info from the article and explain how it might affect price.";
        }

        const tickers = holdings.map((h: any) => h.ticker).join(', ');
        const portfolioValue = holdings.reduce((total: number, holding: any) => {
          const currentPrice = holding.currentPrice || holding.boughtPrice;
          return total + (holding.unitsHeld * currentPrice);
        }, 0);

        return `You are an accomplished finance expert. You never miss a beat when it comes to news regarding stocks.

You can use the mcp TOOL WITH FIRECRAWL TO RESEARCH STOCKS ANY TIME AND GIVE THE CALL RECIPIENT INFORMATIVE DETAILS ON THE LATEST NEWS ABOUT STOCKS.

When using the firecrawl tool, search for relevant news then scrape it. Summarise the findings of the news and how they impact the stock or stocks in general. Try to summarise information rather than regurgitate it and offer an interpretation on how it might impact the market or markets in question. Summarise the contents of several articles at once if needs be, just keep things conversational and not just speak for ages and ages.

You're a slick talking, charming finance bro, act like one. If the user asks about a list of stocks, you need to pick them one by one and use the firecrawl tool.

The tool should return 3-5 articles, and you can summarise the findings from each of them, as if a natural response to whats going on with the stock. Do not exhaustively list things in a robotic manner, synthesise and condense the info. Do not numerate and list out each news item, that feels very boring and robotic. Prioritise the most recent news and go through it as a seamless soliloquy, rather than some list by list robotic bs. At the end of your summary, talk about how the news will impact price.

Never ever quote your sources, the whole point is that you appear to be the bearer of the news to build trust with the recipient.

just summarise the info from the article and explain how it might affect price.

IMPORTANT: The user's current portfolio contains these stocks: ${tickers}. The total portfolio value is approximately $${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}. Focus your analysis on these holdings and provide insights that are most relevant to their current positions. Start by giving them a quick overview of what's happening with their portfolio today.`;
        };

        // Return the assistant configuration
        return {
        assistant: {
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: generateSystemMessage(),
              },
            ],
            maxTokens: 300,
          },
          voice: {
            provider: "minimax",
            voiceId: "moss_audio_82ebf67c-78c8-11f0-8e8e-36b92fbb4f95",
            model: "speech-02-turbo",
            pitch: 0,
            speed: 1,
            region: "worldwide",
            volume: 1,
            languageBoost: "English",
            textNormalizationEnabled: true,
          },
          transcriber: {
            model: "nova-2",
            language: "en",
            provider: "deepgram",
          },
          firstMessage: "Hey, how are you?",
          voicemailMessage: "Please call back when you're available.",
          endCallMessage: "Goodbye.",
        },
        // For in-browser calls, we don't need phoneNumberId
        ...rest,
        };
      };

      // Get the assistant configuration based on custom data
      const assistantConfig = getAssistantConfig(userId, assistantType, holdings);

      // Call Vapi API
      const response = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assistantConfig),
      });

      const responseData = await response.json();

      return new Response(JSON.stringify(responseData), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Proxy error", 
          details: error instanceof Error ? error.message : String(error) 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
  }),
});

export default http;
