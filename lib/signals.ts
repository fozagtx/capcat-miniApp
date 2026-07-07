export interface SignalMeta {
  id: string;
  endpoint: string; // path relative to BASE_URL
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  confidence: number; // 0-1, trader's stated confidence in this specific call
  priceUsdc: string; // x402 price, e.g. "$0.01"
  teaser: string; // free public summary shown before payment
  historicalWinRate: number; // 0-1, trader's advertised track record
  historicalAvgReturnPct: number; // avg simulated return per copied trade
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
}

const pct = (price: number, delta: number) => Number((price * (1 + delta)).toFixed(4));

export const SIGNALS: SignalMeta[] = [
  {
    id: "alpha-momentum",
    endpoint: "/api/signals/alpha-momentum",
    trader: "AlphaMomentum",
    symbol: "SOL/USDC",
    side: "LONG",
    confidence: 0.78,
    priceUsdc: "$0.01",
    teaser: "Momentum breakout setup on SOL — entry/stop/target behind paywall.",
    historicalWinRate: 0.64,
    historicalAvgReturnPct: 1.8,
    entry: 142.3,
    stopLoss: pct(142.3, -0.03),
    takeProfit: pct(142.3, 0.06),
    rationale: "Breakout above the 4h consolidation range with rising volume.",
  },
  {
    id: "nova-scalper",
    endpoint: "/api/signals/nova-scalper",
    trader: "NovaScalper",
    symbol: "ETH/USDC",
    side: "SHORT",
    confidence: 0.55,
    priceUsdc: "$0.004",
    teaser: "Quick scalp on ETH resistance rejection.",
    historicalWinRate: 0.41,
    historicalAvgReturnPct: 0.4,
    entry: 3180.5,
    stopLoss: pct(3180.5, 0.015),
    takeProfit: pct(3180.5, -0.025),
    rationale: "Rejection wick off the daily resistance trendline.",
  },
  {
    id: "vertex-swing",
    endpoint: "/api/signals/vertex-swing",
    trader: "VertexSwing",
    symbol: "BTC/USDC",
    side: "LONG",
    confidence: 0.82,
    priceUsdc: "$0.02",
    teaser: "Multi-day swing setup on BTC accumulation zone.",
    historicalWinRate: 0.71,
    historicalAvgReturnPct: 2.6,
    entry: 68450,
    stopLoss: pct(68450, -0.04),
    takeProfit: pct(68450, 0.09),
    rationale: "Accumulation range with declining exchange reserves.",
  },
  {
    id: "echo-arb",
    endpoint: "/api/signals/echo-arb",
    trader: "EchoArb",
    symbol: "ARB/USDC",
    side: "LONG",
    confidence: 0.6,
    priceUsdc: "$0.001",
    teaser: "Cross-venue funding-rate arb window on ARB.",
    historicalWinRate: 0.52,
    historicalAvgReturnPct: 0.6,
    entry: 0.82,
    stopLoss: pct(0.82, -0.02),
    takeProfit: pct(0.82, 0.03),
    rationale: "Funding rate divergence between two venues, mean-reversion play.",
  },
  {
    id: "atlas-macro",
    endpoint: "/api/signals/atlas-macro",
    trader: "AtlasMacro",
    symbol: "SUI/USDC",
    side: "SHORT",
    confidence: 0.38,
    priceUsdc: "$0.008",
    teaser: "Macro-driven short thesis on SUI ahead of unlock event.",
    historicalWinRate: 0.33,
    historicalAvgReturnPct: -0.3,
    entry: 3.41,
    stopLoss: pct(3.41, 0.03),
    takeProfit: pct(3.41, -0.05),
    rationale: "Token unlock event increases sell pressure; thesis has missed 2 of last 3 calls.",
  },
];

export function getSignalById(id: string): SignalMeta | undefined {
  return SIGNALS.find((s) => s.id === id);
}
