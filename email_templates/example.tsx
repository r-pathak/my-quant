import { WeeklyDigestEmail } from './weekly-digest';

// Example data for testing the email template
const exampleData = {
  userEmail: "trader@example.com",
  userName: "Alex",
  weekEnding: "December 20, 2024",
  totalPortfolioValue: 125000,
  portfolioChange: 2500,
  portfolioChangePercent: 2.04,
  topHoldings: [
    {
      symbol: "AAPL",
      companyName: "Apple Inc.",
      currentPrice: 195.50,
      priceChange: 2.30,
      priceChangePercent: 1.19,
      value: 19550,
      shares: 100,
      recommendation: "HOLD" as const,
      summary: "Apple continues to show strong fundamentals with solid iPhone sales and growing services revenue. Recent news about AI integration and supply chain improvements support a hold position."
    },
    {
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      currentPrice: 378.85,
      priceChange: -5.20,
      priceChangePercent: -1.35,
      value: 18942,
      shares: 50,
      recommendation: "BUY" as const,
      summary: "Microsoft's cloud business continues to accelerate with strong Azure growth. Recent AI partnerships and enterprise adoption make this an attractive buying opportunity on the dip."
    },
    {
      symbol: "NVDA",
      companyName: "NVIDIA Corporation",
      currentPrice: 495.20,
      priceChange: 15.80,
      priceChangePercent: 3.30,
      value: 14856,
      shares: 30,
      recommendation: "HOLD" as const,
      summary: "NVIDIA remains the AI leader but valuation is stretched. Recent data center demand and new chip announcements support current levels but limit upside potential."
    }
  ],
  researchStocks: [
    {
      symbol: "PLTR",
      companyName: "Palantir Technologies Inc.",
      currentPrice: 28.45,
      priceChange: 1.20,
      priceChangePercent: 4.41,
      recommendation: "BUY" as const,
      summary: "Strong government contract wins and expanding commercial business. Recent earnings beat and raised guidance make this an attractive entry point.",
      researchReason: "AI/data analytics play with strong government relationships and growing commercial adoption"
    },
    {
      symbol: "RKLB",
      companyName: "Rocket Lab USA Inc.",
      currentPrice: 12.80,
      priceChange: -0.45,
      priceChangePercent: -3.39,
      recommendation: "HOLD" as const,
      summary: "Space industry growth story with increasing launch cadence. Recent setbacks in launch schedule create near-term headwinds but long-term outlook remains positive.",
      researchReason: "Small-cap space play with unique positioning in the growing satellite launch market"
    }
  ]
};

// Export the example for preview
export const ExampleWeeklyDigest = () => WeeklyDigestEmail(exampleData);

export default ExampleWeeklyDigest;
