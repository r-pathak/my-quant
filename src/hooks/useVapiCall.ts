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
}

interface CallState {
  isCallActive: boolean;
  isMuted: boolean;
  isConnecting: boolean;
  error: string | null;
}

export const useVapiCall = ({ holdings }: UseVapiCallProps) => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isMuted: false,
    isConnecting: false,
    error: null,
  });

  // Initialize Vapi instance with public key
  useEffect(() => {
    const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    
    if (!vapiPublicKey) {
      console.error('NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set');
      return;
    }

    const vapiInstance = new Vapi(vapiPublicKey);
    setVapi(vapiInstance);

    // Set up basic event listeners (without holdings-dependent logic)
    vapiInstance.on('call-start', () => {
      console.log('🎉 Call started event triggered');
      setCallState(prev => ({ ...prev, isCallActive: true, isConnecting: false, error: null }));
    });

    vapiInstance.on('call-end', () => {
      console.log('🔚 Call ended event triggered');
      setCallState(prev => ({ ...prev, isCallActive: false, isConnecting: false, error: null }));
    });

    vapiInstance.on('error', (error) => {
      console.error('💥 Vapi error event:', error);
      setCallState(prev => ({ ...prev, error: error.message || 'An error occurred', isConnecting: false }));
    });

    vapiInstance.on('speech-start', () => {
      console.log('🗣️ Assistant is speaking');
    });

    vapiInstance.on('speech-end', () => {
      console.log('🔇 Assistant finished speaking');
    });

    vapiInstance.on('message', (message) => {
      console.log('📨 Message received:', message);
    });

    return () => {
      vapiInstance.stop();
    };
  }, []);

  // Generate concise system message based on holdings
  const generateSystemMessage = useCallback(() => {
    if (!holdings || holdings.length === 0) {
      return "You are a finance expert. Ask the user about their portfolio and offer to research any stocks they're interested in using the firecrawl tool.";
    }

    // Sort holdings by total value to get top holdings
    const sortedHoldings = holdings
      .map(holding => {
        const currentPrice = holding.currentPrice || holding.boughtPrice;
        const totalValue = holding.unitsHeld * currentPrice;
        return { ...holding, totalValue };
      })
      .sort((a, b) => b.totalValue - a.totalValue);

    const topHolding = sortedHoldings[0];
    const secondHolding = sortedHoldings[1];
    
    // Create a list with company names for natural conversation
    const holdingsList = sortedHoldings.map(h => `${h.ticker} (${h.companyName})`).join(', ');

    let prompt = `You are a finance expert. The user holds: ${holdingsList}.`;
    
    if (topHolding) {
      prompt += ` Ask: "Want me to give you the latest on ${topHolding.companyName}?`;
      if (secondHolding) {
        prompt += ` Maybe ${secondHolding.companyName}?`;
      }
      prompt += `" 

When researching stocks using the firecrawl tool, DO NOT robotically list article summaries. Instead, weave the news into a flowing, engaging story about the company's outlook. Synthesize multiple sources into a cohesive narrative that tells the bigger picture. End with a clear conclusion about the investment outlook from an investor's perspective - bullish, bearish, or mixed - and why.`;
    }

    return prompt;
  }, [holdings]);

  // Start a call with existing assistant ID
  const startCall = useCallback(async () => {
    if (!vapi || callState.isCallActive || callState.isConnecting) return;

    setCallState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('🚀 Starting Vapi call...');
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '';
      console.log('📞 Assistant ID:', assistantId);
      
      // Set up a one-time call-start listener with current holdings
      const handleCallStart = () => {
        console.log('🎉 Call started event triggered');
        setCallState(prev => ({ ...prev, isCallActive: true, isConnecting: false, error: null }));
        
        // Inject system message with current holdings
        console.log('📤 Attempting immediate message injection on call-start...');
        console.log('📊 Current holdings for injection:', holdings);
        
        const systemMessage = generateSystemMessage();
        console.log('📝 System message for injection:', systemMessage);
        
        try {
          vapi.send({
            type: 'add-message',
            message: {
              role: 'system',
              content: systemMessage,
            },
          });
          console.log('✅ System message sent via call-start event');
        } catch (injectionError) {
          console.error('❌ Failed to inject system message via call-start:', injectionError);
        }
        
        // Remove the one-time listener
        vapi.off('call-start', handleCallStart);
      };
      
      // Add the one-time listener
      vapi.on('call-start', handleCallStart);
      
      // Start call with existing assistant ID
      await vapi.start(assistantId);
      console.log('✅ Call started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start call:', error);
      setCallState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start call',
        isConnecting: false 
      }));
    }
  }, [vapi, callState.isCallActive, callState.isConnecting, holdings, generateSystemMessage]);

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
      console.log('📤 Sending user message:', message);
      try {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'user',
            content: message,
          },
        });
        console.log('✅ User message sent successfully');
      } catch (error) {
        console.error('❌ Failed to send user message:', error);
      }
    } else {
      console.warn('⚠️ Cannot send message - vapi or call not ready');
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