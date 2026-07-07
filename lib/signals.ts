export interface SignalMeta {
  id: string;
  endpoint: string;
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  confidence: number;
  priceUsdc: string;
  teaser: string;
  historicalWinRate: number;
  historicalAvgReturnPct: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
}

const TRADERS = [
  { name: "AlphaMomentum", winRate: 0.64, avgReturn: 1.8, style: "momentum" },
  { name: "NovaScalper", winRate: 0.41, avgReturn: 0.4, style: "scalp" },
  { name: "VertexSwing", winRate: 0.71, avgReturn: 2.6, style: "swing" },
  { name: "EchoArb", winRate: 0.52, avgReturn: 0.6, style: "arbitrage" },
  { name: "AtlasMacro", winRate: 0.33, avgReturn: -0.3, style: "macro" },
  { name: "ZenFlow", winRate: 0.58, avgReturn: 1.2, style: "trend" },
  { name: "QuantumPulse", winRate: 0.45, avgReturn: 0.8, style: "mean-reversion" },
];

const TOKENS = ["bitcoin", "ethereum", "solana", "sui", "arbitrum", "dogecoin", "chainlink", "avalanche-2"] as const;

function id(name: string) { return name.toLowerCase().replace(/\s+/g, "-"); }

async function fetchPrices(): Promise<Record<string, number>> {
  const ids = TOKENS.join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { next: { revalidate: 60 } }
  );
  const data = await res.json();
  const prices: Record<string, number> = {};
  for (const token of TOKENS) {
    prices[token] = data[token]?.usd ?? 0;
  }
  return prices;
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export async function getSignals(): Promise<SignalMeta[]> {
  const prices = await fetchPrices();
  const signals: SignalMeta[] = [];
  const now = new Date();
  const hourSeed = now.getUTCHours() + now.getUTCDate() * 24 + now.getUTCMonth() * 31 * 24;
  const rng = seedRandom(hourSeed);

  const traded: { symbol: string; price: number; trader: typeof TRADERS[0]; side: "LONG" | "SHORT" }[] = [];

  for (const trader of TRADERS) {
    const candidates = TOKENS.filter(t => !traded.some(x => x.trader.name === trader.name && x.symbol === t));
    if (candidates.length === 0) continue;
    const token = candidates[Math.floor(rng() * candidates.length)];
    const price = prices[token];
    if (!price || price <= 0) continue;

    const side = rng() > 0.45 ? "LONG" : "SHORT";
    const conf = 0.3 + rng() * 0.5;
    const signalPrice = conf > 0.7 ? "$0.02" : conf > 0.5 ? "$0.01" : "$0.005";
    const slPct = 0.02 + rng() * 0.04;
    const tpPct = 0.03 + rng() * 0.07;

    const teasers: Record<string, string[]> = {
      momentum: ["Momentum breakout on %s at $%.2f", "%s showing strong RSI divergence", "Volume surge on %s — entry setup active"],
      scalp: ["Quick scalp on %s at $%.2f", "%s rejecting key resistance level", "Short-term reversal setup on %s"],
      swing: ["Swing trade on %s near support at $%.2f", "%s in accumulation range", "Multi-day setup on %s"],
      arbitrage: ["Cross-venue arb on %s at $%.2f", "%s funding rate divergence detected", "Spread opportunity on %s between venues"],
      macro: ["Macro play on %s at $%.2f", "%s ahead of catalyst event", "Fundamental shift on %s"],
      trend: ["Trend continuation on %s at $%.2f", "%s riding the daily trend", "%s setup with confluence"],
      "mean-reversion": ["Mean reversion on %s at $%.2f", "%s oversold bounce setup", "%s diverging from moving average"],
    };

    const styleTeasers = teasers[trader.style] || teasers.momentum;
    const teaser = styleTeasers[Math.floor(rng() * styleTeasers.length)].replace("%s", token.toUpperCase()).replace("%.2f", price.toFixed(2));

    const sId = id(`${trader.name}-${token}-${now.toISOString().slice(0, 10)}`);

    signals.push({
      id: sId,
      endpoint: `/api/signals/${sId}`,
      trader: trader.name,
      symbol: `${token.toUpperCase()}/USDC`,
      side,
      confidence: Math.round(conf * 100) / 100,
      priceUsdc: signalPrice,
      teaser,
      historicalWinRate: trader.winRate,
      historicalAvgReturnPct: trader.avgReturn,
      entry: price,
      stopLoss: side === "LONG" ? Number((price * (1 - slPct)).toFixed(2)) : Number((price * (1 + slPct)).toFixed(2)),
      takeProfit: side === "LONG" ? Number((price * (1 + tpPct)).toFixed(2)) : Number((price * (1 - tpPct)).toFixed(2)),
      rationale: teaser,
    });

    traded.push({ symbol: token, price, trader, side });
  }

  return signals;
}

export function getSignalById(signals: SignalMeta[], id: string): SignalMeta | undefined {
  return signals.find((s) => s.id === id);
}
