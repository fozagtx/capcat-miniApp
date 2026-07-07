import { NextRequest, NextResponse } from "next/server";
import { withGatewayDynamic } from "@/lib/x402";
import { getSignalById, getSignals, type SignalMeta } from "@/lib/signals";

let signalsCache: SignalMeta[] = [];

async function refreshCache() {
  signalsCache = await getSignals();
}

refreshCache();
setInterval(refreshCache, 60_000);

async function routeHandler(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const signal = getSignalById(signalsCache, id);
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

export const GET = withGatewayDynamic(routeHandler, (req) => {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const signal = getSignalById(signalsCache, id);
  if (!signal) return null;
  return { price: signal.priceUsdc, endpoint: signal.endpoint };
});
