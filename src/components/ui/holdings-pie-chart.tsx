"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMemo } from 'react';

interface Holding {
  _id: string;
  ticker: string;
  companyName: string;
  unitsHeld: number;
  boughtPrice: number;
  currentPrice?: number;
  sector?: string;
}

interface HoldingsPieChartProps {
  holdings: Holding[];
}

// Glassy theme colors - all variations of glass/transparent effects
const GLASSY_COLORS = [
  'rgba(255, 255, 255, 0.15)',
  'rgba(255, 255, 255, 0.12)',
  'rgba(255, 255, 255, 0.18)',
  'rgba(255, 255, 255, 0.10)',
  'rgba(255, 255, 255, 0.20)',
  'rgba(255, 255, 255, 0.08)',
  'rgba(255, 255, 255, 0.14)',
  'rgba(255, 255, 255, 0.16)',
  'rgba(255, 255, 255, 0.11)',
  'rgba(255, 255, 255, 0.13)',
  'rgba(255, 255, 255, 0.17)',
  'rgba(255, 255, 255, 0.09)',
  'rgba(255, 255, 255, 0.19)',
  'rgba(255, 255, 255, 0.07)',
  'rgba(255, 255, 255, 0.21)'
];

export default function HoldingsPieChart({ holdings }: HoldingsPieChartProps) {
  const chartData = useMemo(() => {
    return holdings.map((holding, index) => {
      const currentPrice = holding.currentPrice || holding.boughtPrice;
      const value = holding.unitsHeld * currentPrice;
      
      return {
        name: holding.ticker,
        fullName: holding.companyName,
        value: Math.round(value * 100) / 100,
        color: GLASSY_COLORS[index % GLASSY_COLORS.length],
        sector: holding.sector || 'Unknown'
      };
    }).sort((a, b) => b.value - a.value); // Sort by value descending
  }, [holdings]);

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; fullName: string; value: number; color: string; sector: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      
      return (
        <div className="bg-card/80 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl">
          <p className="font-medium text-foreground font-mono text-lg">{data.name}</p>
          <p className="text-sm text-muted-foreground font-mono mb-2">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-sm text-foreground font-mono">
              Value: <span className="text-primary">${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              Allocation: <span className="text-primary">{percentage}%</span>
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Sector: {data.sector}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Remove legend component - we'll only use tooltips

  if (chartData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono">No holdings data available</p>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Add some positions to see the chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground font-mono">Portfolio Allocation</h3>
        <p className="text-sm text-muted-foreground font-mono">
          Total Value: ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={1}
              dataKey="value"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground font-mono">
          Hover over segments for details • {chartData.length} position{chartData.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
