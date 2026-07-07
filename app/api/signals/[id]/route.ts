/**
 * Paid strategy-signal endpoint. Returns entry/stop/target/rationale for one
 * trader's signal once payment has settled via Circle Gateway (x402).
 *
 * GET /api/signals/[id] -> 402 Payment Required (first call)
 * GET /api/signals/[id] with payment-signature header -> full signal payload
 */
import { NextRequest, NextResponse } from "next/server";
import { withGatewayDynamic } from "@/lib/x402";
import { getSignalById } from "@/lib/signals";

async function routeHandler(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const signal = getSignalById(id);
  // Existence already checked in resolve(), but guard defensively.
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
  const signal = getSignalById(id);
  if (!signal) return null;
  return { price: signal.priceUsdc, endpoint: signal.endpoint };
});
