import { NextResponse } from "next/server";
import { getSignals } from "@/lib/signals";

export async function GET() {
  const signals = await getSignals();
  const feed = signals.map((s) => ({
    id: s.id,
    endpoint: s.endpoint,
    trader: s.trader,
    symbol: s.symbol,
    side: s.side,
    confidence: s.confidence,
    priceUsdc: s.priceUsdc,
    teaser: s.teaser,
    historicalWinRate: s.historicalWinRate,
    historicalAvgReturnPct: s.historicalAvgReturnPct,
  }));

  return NextResponse.json({ signals: feed, count: feed.length });
}
