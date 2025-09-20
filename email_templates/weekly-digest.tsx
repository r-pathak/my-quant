import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface HoldingData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  weeklyChange?: number;
  weeklyChangePercent?: number;
  value: number;
  shares: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  summary: string;
  newsUrls?: string[];
}

interface ResearchStock {
  symbol: string;
  companyName: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  weeklyChangePercent?: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  summary: string;
  researchReason: string;
  newsUrls?: string[];
}

interface WeeklyDigestEmailProps {
  userEmail: string;
  userName?: string;
  weekEnding: string;
  topHoldings: HoldingData[];
  researchStocks: ResearchStock[];
  totalPortfolioValue: number;
  portfolioChange: number;
  portfolioChangePercent: number;
  portfolioOverview?: string;
}

export const WeeklyDigestEmail = ({
  userEmail,
  userName = 'Trader',
  weekEnding,
  topHoldings = [],
  researchStocks = [],
  totalPortfolioValue,
  portfolioChange,
  portfolioChangePercent,
  portfolioOverview,
}: WeeklyDigestEmailProps) => {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY': return '#10b981'; // green
      case 'SELL': return '#ef4444'; // red
      case 'HOLD': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <Html>
      <Head />
      <Preview>myquant. weekly digest</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={logoSection}>
            <Img
              src={'https://my-quant.vercel.app/logo-white.png'}
              width="80"
              height="80"
              alt="myquant"
              style={logo}
            />
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Text style={greeting}>
              hey {userName},
            </Text>
            <Text style={paragraph}>
              here's your personalized trading digest for the week ending {weekEnding.toLowerCase()}.
            </Text>
          </Section>

          {/* Portfolio Overview */}
          {portfolioOverview && (
            <Section style={section}>
              <Heading style={h2}>portfolio overview</Heading>
              <div style={overviewCard}>
                <Text style={overviewText}>{portfolioOverview}</Text>
              </div>
            </Section>
          )}

          {/* Portfolio Metrics */}
          <Section style={portfolioSection}>
            <Heading style={h2}>portfolio metrics</Heading>
            <div style={portfolioCard}>
              <Row>
                <Column>
                  <Text style={portfolioLabel}>total value</Text>
                  <Text style={portfolioValue}>{formatCurrency(totalPortfolioValue)}</Text>
                </Column>
                <Column>
                  <Text style={portfolioLabel}>weekly change</Text>
                  <Text style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: portfolioChangePercent >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {formatCurrency(portfolioChange)} ({formatPercent(portfolioChangePercent)})
                  </Text>
                </Column>
              </Row>
            </div>
          </Section>

          {/* Top Holdings */}
          <Section style={section}>
            <Heading style={h2}>your holdings</Heading>
            {topHoldings.map((holding, index) => (
              <div key={holding.symbol} style={holdingCard}>
                <Row>
                  <Column style={{ width: '70%' }}>
                    <Text style={stockSymbol}>{holding.symbol}</Text>
                    <Text style={companyName}>{holding.companyName}</Text>
                    <Text style={stockPrice}>
                      {formatCurrency(holding.currentPrice)} 
                      <span style={{
                        color: (holding.weeklyChangePercent || holding.priceChangePercent) >= 0 ? '#10b981' : '#ef4444',
                        marginLeft: '8px'
                      }}>
                        ({formatPercent(holding.weeklyChangePercent || holding.priceChangePercent)} weekly)
                      </span>
                    </Text>
                    <Text style={holdingValue}>
                      {holding.shares} shares • {formatCurrency(holding.value)}
                    </Text>
                  </Column>
                  <Column style={{ width: '30%', textAlign: 'right' }}>
                    <div style={{
                      ...recommendationBadge,
                      backgroundColor: getRecommendationColor(holding.recommendation)
                    }}>
                      <Text style={recommendationText}>{holding.recommendation}</Text>
                    </div>
                  </Column>
                </Row>
                <Text style={summary}>{holding.summary}</Text>
                {holding.newsUrls && holding.newsUrls.length > 0 && (
                  <div style={newsLinks}>
                    {holding.newsUrls.map((url, index) => (
                      <a key={index} href={url} style={newsLink}>
                        article {index + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>

          {/* Research Stocks */}
          {researchStocks.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>research watchlist</Heading>
              {researchStocks.map((stock, index) => (
                <div key={stock.symbol} style={researchCard}>
                  <Row>
                    <Column style={{ width: '70%' }}>
                      <Text style={stockSymbol}>{stock.symbol}</Text>
                      <Text style={companyName}>{stock.companyName}</Text>
                      <Text style={stockPrice}>
                        {formatCurrency(stock.currentPrice)}
                        <span style={{
                          color: (stock.weeklyChangePercent || stock.priceChangePercent) >= 0 ? '#10b981' : '#ef4444',
                          marginLeft: '8px'
                        }}>
                          ({formatPercent(stock.weeklyChangePercent || stock.priceChangePercent)} weekly)
                        </span>
                      </Text>
                    </Column>
                    <Column style={{ width: '30%', textAlign: 'right' }}>
                      <div style={{
                        ...recommendationBadge,
                        backgroundColor: getRecommendationColor(stock.recommendation)
                      }}>
                        <Text style={recommendationText}>{stock.recommendation}</Text>
                      </div>
                    </Column>
                  </Row>
                  <Text style={summary}>{stock.summary}</Text>
                  {stock.newsUrls && stock.newsUrls.length > 0 && (
                    <div style={newsLinks}>
                      {/* <Text style={newsLabel}>sources:</Text> */}
                      {stock.newsUrls.map((url, index) => (
                        <a key={index} href={url} style={newsLink}>
                          article {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              this digest was generated by your ai trading assistant.
            </Text>
            <Text style={footerText}>
              trade responsibly. past performance doesn't guarantee future results.
            </Text>
            <Text style={disclaimerText}>
              myquant. | ai trading assistant
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #0f172a 50%, #1e1b4b 75%, #0f172a 100%)',
  fontFamily: 'JetBrains Mono, monospace',
  color: '#ffffff',
  position: 'relative' as const,
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
  borderRadius: '24px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  marginBottom: '24px',
};

const headerRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
};

const logoColumn = {
  textAlign: 'left' as const,
};

const titleColumn = {
  textAlign: 'right' as const,
};

const logoSection = {
  padding: '0 24px',
  marginBottom: '24px',
};

const logo = {
  borderRadius: '12px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
};

const subtitle = {
  color: '#a1a1aa',
  fontSize: '16px',
  margin: '4px 0 0 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const weeklyDigestTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
  opacity: '0.9',
};

const section = {
  padding: '0 24px',
  marginBottom: '32px',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0 0 8px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const paragraph = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#d1d5db',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
};

const h2 = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const portfolioSection = {
  padding: '0 24px',
  marginBottom: '32px',
};

const portfolioCard = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '24px',
  backdropFilter: 'blur(12px)',
};

const portfolioLabel = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 4px 0',
  fontFamily: 'JetBrains Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const portfolioValue = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
};

const portfolioChange = {
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
};

const holdingCard = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  backdropFilter: 'blur(12px)',
};

const researchCard = {
  background: 'rgba(139, 92, 246, 0.05)',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  backdropFilter: 'blur(12px)',
};

const stockSymbol = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 4px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const companyName = {
  fontSize: '14px',
  color: '#9ca3af',
  margin: '0 0 8px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const stockPrice = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#ffffff',
  margin: '0 0 4px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const holdingValue = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 12px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const recommendationBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '20px',
  marginBottom: '12px',
};

const recommendationText = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
  textAlign: 'center' as const,
};

const summary = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#d1d5db',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
};

const researchReason = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#e5e7eb',
  margin: '0 0 8px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const footer = {
  padding: '32px 24px',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  textAlign: 'center' as const,
  marginTop: '32px',
};

const footerText = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0 0 8px 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const disclaimerText = {
  fontSize: '11px',
  color: '#6b7280',
  margin: '16px 0 0 0',
  fontFamily: 'JetBrains Mono, monospace',
};

const overviewCard = {
  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  backdropFilter: 'blur(12px)',
};

const overviewText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#e5e7eb',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
};

const newsLinks = {
  marginTop: '12px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  justifyContent: 'flex-start',
};

const newsLabel = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
  fontFamily: 'JetBrains Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const newsLink = {
  fontSize: '11px',
  color: '#ffffff',
  textDecoration: 'underline',
  fontFamily: 'JetBrains Mono, monospace',
  marginRight: '8px',
};

export default WeeklyDigestEmail;
