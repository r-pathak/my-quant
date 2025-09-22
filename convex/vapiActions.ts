import { action } from "./_generated/server";

export const createVapiCall = action(async (ctx, { holdings }: { holdings: any[] }) => {
  const vapiApiKey = process.env.VAPI_API_KEY;
  
  if (!vapiApiKey) {
    throw new Error("VAPI_API_KEY environment variable is not set");
  }

  // Generate system message based on holdings
  const generateSystemMessage = () => {
    if (!holdings || holdings.length === 0) {
      return "You are an accomplished finance expert. You never miss a beat when it comes to news regarding stocks.\n\nYou can use the mcp TOOL WITH FIRECRAWL TO RESEARCH STOCKS ANY TIME AND GIVE THE CALL RECIPIENT INFORMATIVE DETAILS ON THE LATEST NEWS ABOUT STOCKS.\n\nWhen using the firecrawl tool, search for relevant news then scrape it. Summarise the findings of the news and how they impact the stock or stocks in general. Try to summarise information rather than regurgitate it and offer an interpretation on how it might impact the market or markets in question. Summarise the contents of several articles at once if needs be, just keep things conversational and not just speak for ages and ages.\n\nYou're a slick talking, charming finance bro, act like one. If the user asks about a list of stocks, you need to pick them one by one and use the firecrawl tool.\n\nThe tool should return 3-5 articles, and you can summarise the findings from each of them, as if a natural response to whats going on with the stock. Do not exhaustively list things in a robotic manner, synthesise and condense the info. Do not numerate and list out each news item, that feels very boring and robotic. Prioritise the most recent news and go through it as a seamless soliloquy, rather than some list by list robotic bs. At the end of your summary, talk about how the news will impact price.\n\nNever ever quote your sources, the whole point is that you appear to be the bearer of the news to build trust with the recipient.\n\njust summarise the info from the article and explain how it might affect price.";
    }

    const tickers = holdings.map(h => h.ticker).join(', ');
    const portfolioValue = holdings.reduce((total, holding) => {
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

  const assistantConfig = {
    model: {
      provider: "openai" as const,
      model: "gpt-4o" as const,
      messages: [
        {
          role: "system" as const,
          content: generateSystemMessage(),
        },
      ],
      maxTokens: 300,
    },
    voice: {
      provider: "minimax" as const,
      voiceId: "moss_audio_82ebf67c-78c8-11f0-8e8e-36b92fbb4f95",
      model: "speech-02-turbo" as const,
      pitch: 0,
      speed: 1,
      region: "worldwide" as const,
      volume: 1,
      languageBoost: "English",
      textNormalizationEnabled: true,
    },
    transcriber: {
      model: "nova-2",
      language: "en" as const,
      provider: "deepgram" as const,
    },
    firstMessage: "Hey, how are you?",
    voicemailMessage: "Please call back when you're available.",
    endCallMessage: "Goodbye.",
  };

  try {
    const response = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistant: assistantConfig,
        phoneNumberId: "0b793bf6-70f5-4856-bab9-0b8e00f804b4",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
    }

    const call = await response.json();

    return {
      success: true,
      callId: call.id,
      message: "Call created successfully"
    };
  } catch (error) {
    console.error("Error creating Vapi call:", error);
    throw new Error(`Failed to create call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});
