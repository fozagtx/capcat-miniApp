import { NextRequest, NextResponse } from "next/server";
import { withGatewayDynamic } from "@/lib/x402";
import { getSignalById, getSignals } from "@/lib/signals";

let cached: Awaited<ReturnType<typeof getSignals>> | null = null;
let cachedAt = 0;

async function getSignalsCached() {
  if (!cached || Date.now() - cachedAt > 60_000) {
    cached = await getSignals();
    cachedAt = Date.now();
  }
  return cached;
}

async function routeHandler(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const signals = await getSignalsCached();
  const signal = getSignalById(signals, id);
  if (!signal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: signal.id,
    trader: signal.trader,
    symbol: signal.symbol,
    side: signal.side,
    confidence: signal.confidence,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    rationale: signal.rationale,
    historicalWinRate: signal.historicalWinRate,
    historicalAvgReturnPct: signal.historicalAvgReturnPct,
    timestamp: new Date().toISOString(),
  });
}

export const GET = withGatewayDynamic(routeHandler, async (req) => {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const signals = await getSignalsCached();
  const signal = getSignalById(signals, id);
  if (!signal) return null;
  return { price: signal.priceUsdc, endpoint: signal.endpoint };
});
