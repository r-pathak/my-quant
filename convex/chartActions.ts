import { action } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get strategy description for logging
function getStrategyDescription(strategy: { interval: string; range?: string; period1?: number; period2?: number }): string {
  if ('range' in strategy && strategy.range) {
    return `${strategy.interval}/${strategy.range}`;
  } else if ('period1' in strategy && 'period2' in strategy && strategy.period1 && strategy.period2) {
    return `${strategy.interval}/${strategy.period1}-${strategy.period2}`;
  }
  return `${strategy.interval}/unknown`;
}

// Helper function to process Yahoo Finance API response
async function processYahooFinanceData(data: any, ticker: string, strategy: { interval: string; range?: string; period1?: number; period2?: number }, timeframe: string) {
  console.log(`Processing API response for ${ticker} (${getStrategyDescription(strategy)})`);
  
  if (!data.chart?.result?.[0]) {
    throw new Error('No chart data available in response');
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quotes = result.indicators?.quote?.[0];
  
  console.log(`Raw API response structure for ${ticker}:`, {
    timestampsLength: timestamps?.length || 0,
    quotesKeys: quotes ? Object.keys(quotes) : 'no quotes',
    sampleTimestamp: timestamps?.[0],
    resultKeys: Object.keys(result),
    indicatorsKeys: result.indicators ? Object.keys(result.indicators) : 'no indicators'
  });
  
  if (!timestamps || timestamps.length === 0) {
    throw new Error('No timestamp data available');
  }
  
  if (!quotes) {
    throw new Error('No quote data available');
  }
  
  // Format data for charting
  const chartData = timestamps.map((timestamp: number, index: number) => ({
    timestamp: timestamp * 1000, // Convert to milliseconds
    date: new Date(timestamp * 1000).toISOString(),
    open: quotes.open?.[index],
    high: quotes.high?.[index],
    low: quotes.low?.[index],
    close: quotes.close?.[index],
    volume: quotes.volume?.[index]
  })).filter((item: any) => {
    // More detailed filtering
    const hasValidClose = item.close !== null && item.close !== undefined && !isNaN(item.close);
    return hasValidClose;
  });

  console.log(`Successfully processed ${chartData.length} data points for ${ticker} using ${getStrategyDescription(strategy)}`);
  
  // Only proceed if we have a reasonable amount of data
  if (chartData.length < 2) {
    throw new Error(`Insufficient data points: ${chartData.length}`);
  }

  // Calculate technical indicators as time series
  const indicators = calculateIndicators(chartData);
  
  // Add indicators to each data point
  const chartDataWithIndicators = chartData.map((item: any, index: number) => ({
    ...item,
    sma20: indicators.sma20?.[index] || null,
    sma50: indicators.sma50?.[index] || null,
    rsi: indicators.rsi?.[index] || null,
    bollingerUpper: indicators.bollinger?.upper?.[index] || null,
    bollingerMiddle: indicators.bollinger?.middle?.[index] || null,
    bollingerLower: indicators.bollinger?.lower?.[index] || null,
  }));
  
  return {
    success: true,
    data: {
      ticker,
      timeframe,
      interval: strategy.interval,
      period: getStrategyDescription(strategy).split('/')[1],
      chartData: chartDataWithIndicators,
      indicators,
      dataPoints: chartDataWithIndicators.length,
      meta: {
        currency: result.meta?.currency,
        symbol: result.meta?.symbol,
        exchangeName: result.meta?.exchangeName,
        regularMarketPrice: result.meta?.regularMarketPrice,
        previousClose: result.meta?.previousClose
      }
    }
  };
}

// Function to fetch chart data from Yahoo Finance with multiple fallback strategies
async function fetchChartData(ticker: string, timeframe: string) {
  try {
    console.log(`Fetching chart data for ${ticker} with timeframe ${timeframe}`);
    
    // Define strategies using 'range' parameter instead of 'period'
    const now = Math.floor(Date.now() / 1000);
    const strategies = {
      '1h': [
        { interval: '1h', range: '5d' },     // 5 days of hourly data (max for 1h)
        { interval: '1h', range: '2d' },     // Fallback: 2 days
        { interval: '1h', range: '1d' },     // Fallback: 1 day
      ],
      '1d': [
        { interval: '1d', range: '1y' },     // 1 year of daily data
        { interval: '1d', range: '6mo' },    // Fallback: 6 months
        { interval: '1d', range: '3mo' },    // Fallback: 3 months
        // Try date range approach as final fallback
        { interval: '1d', period1: now - (365 * 24 * 60 * 60), period2: now }, // 1 year with timestamps
      ],
      '1wk': [
        { interval: '1wk', range: '2y' },    // 2 years of weekly data
        { interval: '1wk', range: '1y' },    // Fallback: 1 year
        // Try date range approach
        { interval: '1wk', period1: now - (2 * 365 * 24 * 60 * 60), period2: now }, // 2 years with timestamps
      ],
      '1mo': [
        { interval: '1mo', range: '5y' },    // 5 years of monthly data
        { interval: '1mo', range: '2y' },    // Fallback: 2 years
        // Try date range approach
        { interval: '1mo', period1: now - (5 * 365 * 24 * 60 * 60), period2: now }, // 5 years with timestamps
      ]
    };
    
    const strategyList = strategies[timeframe as keyof typeof strategies] || strategies['1d'];
    
    let lastError = null;
    
    // Try each strategy until one works
    for (let i = 0; i < strategyList.length; i++) {
      const strategy = strategyList[i];
      try {
        console.log(`Trying strategy ${i + 1}/${strategyList.length}: ${getStrategyDescription(strategy)} for ${ticker}`);
        
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          console.log(`Waiting 2 seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Build URL with either range or date range parameters
        let url;
        if ('period1' in strategy && 'period2' in strategy && strategy.period1 && strategy.period2) {
          url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${strategy.interval}&period1=${strategy.period1}&period2=${strategy.period2}`;
        } else if ('range' in strategy) {
          url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${strategy.interval}&range=${strategy.range}`;
        } else {
          throw new Error('Invalid strategy configuration');
        }
        
        console.log(`Making request to Yahoo Finance: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            console.log(`Rate limited (429) for ${ticker}, waiting 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Retry the same strategy once more
            const retryResponse = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            if (!retryResponse.ok) {
              throw new Error(`Yahoo Finance API error after retry: ${retryResponse.status}`);
            }
            // Use the retry response
            const retryData = await retryResponse.json();
            // Process retry data (copy the processing logic)
            return await processYahooFinanceData(retryData, ticker, strategy, timeframe);
          }
          throw new Error(`Yahoo Finance API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Log the full API response to debug the issue
        console.log(`Full Yahoo Finance API response for ${ticker} (${getStrategyDescription(strategy)}):`, JSON.stringify(data, null, 2));
        
        return await processYahooFinanceData(data, ticker, strategy, timeframe);
      } catch (error) {
        console.log(`Strategy ${getStrategyDescription(strategy)} failed:`, error);
        lastError = error;
        continue; // Try next strategy
      }
    }
    
    // If all strategies failed
    throw lastError || new Error('All data fetching strategies failed');
    
  } catch (error) {
    console.error(`Error fetching chart data for ${ticker}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

// Calculate technical indicators as time series
function calculateIndicators(data: any[]) {
  if (data.length === 0) return {};
  
  const closes = data.map(d => d.close).filter(c => c !== null);
  
        return {
          sma20: calculateSMATimeSeries(closes, 20),
          sma50: calculateSMATimeSeries(closes, 50),
          rsi: calculateRSITimeSeries(closes, 21),
          bollinger: calculateBollingerBandsTimeSeries(closes, 20, 2)
        };
}

// Simple Moving Average - single value (keep for backward compatibility)
function calculateSMA(data: number[], period: number) {
  if (data.length < period) return null;
  
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  
  return sma[sma.length - 1]; // Return latest value
}

// Simple Moving Average - time series
function calculateSMATimeSeries(data: number[], period: number) {
  if (data.length < period) return [];
  
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null); // Not enough data points
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

// RSI calculation - single value (keep for backward compatibility)
function calculateRSI(data: number[], period: number) {
  if (data.length < period + 1) return null;
  
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // Initial averages
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI for the latest period
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// RSI calculation - time series
function calculateRSITimeSeries(data: number[], period: number) {
  if (data.length < period + 1) return [];
  
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  const rsiValues = [];
  
  // Fill initial values with null
  for (let i = 0; i <= period; i++) {
    rsiValues.push(null);
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // Initial averages
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI for each subsequent period
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
    
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsiValues;
}

// Bollinger Bands - single value (keep for backward compatibility)
function calculateBollingerBands(data: number[], period: number, stdDev: number) {
  if (data.length < period) return null;
  
  const sma = calculateSMA(data, period);
  if (!sma) return null;
  
  const recentData = data.slice(-period);
  const variance = recentData.reduce((sum, value) => sum + Math.pow(value - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    middle: sma,
    upper: sma + (standardDeviation * stdDev),
    lower: sma - (standardDeviation * stdDev)
  };
}

// Bollinger Bands - time series
function calculateBollingerBandsTimeSeries(data: number[], period: number, stdDev: number) {
  if (data.length < period) return { upper: [], middle: [], lower: [] };
  
  const upper = [];
  const middle = [];
  const lower = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sma = slice.reduce((sum, val) => sum + val, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      middle.push(sma);
      upper.push(sma + (standardDeviation * stdDev));
      lower.push(sma - (standardDeviation * stdDev));
    }
  }
  
  return { upper, middle, lower };
}

export const getChartData = action({
  args: { 
    ticker: v.string(),
    timeframe: v.string()
  },
  handler: async (ctx, args) => {
    return await fetchChartData(args.ticker, args.timeframe);
  },
});

export const refreshChartData = action({
  args: { 
    ticker: v.string(),
    timeframe: v.string()
  },
  handler: async (ctx, args) => {
    console.log(`Refreshing chart data for ${args.ticker}`);
    return await fetchChartData(args.ticker, args.timeframe);
  },
});
