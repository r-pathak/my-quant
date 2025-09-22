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

    // Calculate portfolio details
    const portfolioDetails = holdings.map(holding => {
      const currentPrice = holding.currentPrice || holding.boughtPrice;
      const costBasis = holding.unitsHeld * holding.boughtPrice;
      const currentValue = holding.unitsHeld * currentPrice;
      const profit = currentValue - costBasis;
      const profitPercent = (profit / costBasis) * 100;
      
      return {
        ticker: holding.ticker,
        company: holding.companyName,
        shares: holding.unitsHeld,
        currentPrice: currentPrice,
        profit: profit,
        profitPercent: profitPercent
      };
    });

    const totalValue = portfolioDetails.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
    const totalProfit = portfolioDetails.reduce((sum, h) => sum + h.profit, 0);
    const totalProfitPercent = (totalProfit / (totalValue - totalProfit)) * 100;

    const holdingsList = portfolioDetails.map(h => 
      `${h.ticker} (${h.shares} shares @ $${h.currentPrice.toFixed(2)}) - ${h.profit >= 0 ? '+' : ''}$${h.profit.toFixed(0)} (${h.profitPercent >= 0 ? '+' : ''}${h.profitPercent.toFixed(1)}%)`
    ).join(', ');

    return `You are a finance expert. The user's portfolio: ${holdingsList}. Total value: $${totalValue.toFixed(0)}, Total P&L: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(0)} (${totalProfitPercent >= 0 ? '+' : ''}${totalProfitPercent.toFixed(1)}%). 

Mention their specific holdings and ask if they want you to research any of these stocks using the firecrawl tool. Keep responses conversational and concise.`;
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