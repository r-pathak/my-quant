"use client";

import { useState, useEffect, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

interface Holding {
  _id: string;
  ticker: string;
  companyName: string;
  sector?: string;
  unitsHeld: number;
  boughtPrice: number;
  currentPrice?: number;
}

interface UseVapiCallProps {
  holdings: Holding[];
  publicKey: string;
}

interface CallState {
  isCallActive: boolean;
  isMuted: boolean;
  isConnecting: boolean;
  error: string | null;
}

export const useVapiCall = ({ holdings, publicKey }: UseVapiCallProps) => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isMuted: false,
    isConnecting: false,
    error: null,
  });

  // Initialize Vapi instance
  useEffect(() => {
    if (publicKey) {
      const vapiInstance = new Vapi(publicKey);
      setVapi(vapiInstance);

      // Set up event listeners
      vapiInstance.on('call-start', () => {
        setCallState(prev => ({ ...prev, isCallActive: true, isConnecting: false, error: null }));
      });

      vapiInstance.on('call-end', () => {
        setCallState(prev => ({ ...prev, isCallActive: false, isConnecting: false, error: null }));
      });

      vapiInstance.on('error', (error) => {
        setCallState(prev => ({ ...prev, error: error.message || 'An error occurred', isConnecting: false }));
      });

      vapiInstance.on('speech-start', () => {
        console.log('Assistant is speaking');
      });

      vapiInstance.on('speech-end', () => {
        console.log('Assistant finished speaking');
      });

      vapiInstance.on('message', (message) => {
        console.log('Message received:', message);
      });

      return () => {
        vapiInstance.stop();
      };
    }
  }, [publicKey]);

  // Generate system message based on holdings
  const generateSystemMessage = useCallback(() => {
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
  }, [holdings]);

  // Start a call
  const startCall = useCallback(async () => {
    if (!vapi || callState.isCallActive || callState.isConnecting) return;

    setCallState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
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

      await vapi.start(assistantConfig);
    } catch (error) {
      setCallState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start call',
        isConnecting: false 
      }));
    }
  }, [vapi, callState.isCallActive, callState.isConnecting, generateSystemMessage]);

  // Stop a call
  const stopCall = useCallback(() => {
    if (vapi && callState.isCallActive) {
      vapi.stop();
    }
  }, [vapi, callState.isCallActive]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (vapi && callState.isCallActive) {
      const newMutedState = !callState.isMuted;
      vapi.setMuted(newMutedState);
      setCallState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, [vapi, callState.isCallActive, callState.isMuted]);

  // Send a message
  const sendMessage = useCallback((message: string) => {
    if (vapi && callState.isCallActive) {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: message,
        },
      });
    }
  }, [vapi, callState.isCallActive]);

  return {
    ...callState,
    startCall,
    stopCall,
    toggleMute,
    sendMessage,
  };
};
