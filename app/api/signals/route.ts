/**
 * Public, free discovery feed for the strategy marketplace.
 *
 * Returns the teaser metadata for every posted signal (trader, symbol, side,
 * confidence, price, historical track record) WITHOUT the paid entry/stop/
 * target/rationale fields — those live behind the per-signal x402 route.
 * The copy-agent polls this endpoint to decide what's worth paying for.
 */
import { NextResponse } from "next/server";
import { SIGNALS } from "@/lib/signals";

export async function GET() {
  const feed = SIGNALS.map((s) => ({
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
