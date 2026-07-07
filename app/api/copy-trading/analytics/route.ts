import { NextRequest, NextResponse } from "next/server";
import { withGateway } from "@/lib/x402";

/**
 * Premium endpoint: Deep trader analytics.
 * Paywalled at $0.02 via x402 on Arc Network.
 */
const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: "Valid wallet address required (0x...)" },
      { status: 400 }
    );
  }

  // Simulated deep trader analytics (in production, fetched from Moralis/Dune)
  const analytics = {
    walletAddress,
    performance: {
      pnl1d: 1240,
      pnl7d: 8450,
      pnl30d: 32100,
      pnl90d: 78900,
      totalReturn: 452.8,
      sharpeRatio: 2.1,
      maxDrawdown: -18.4,
      winRate: 68.2,
      avgWinSize: 3400,
      avgLossSize: -1200,
    },
    tradingStats: {
      totalTrades: 156,
      totalVolume: 3450000,
      avgPositionSize: 22100,
      avgHoldTime: 6.5,
      frequentTokens: [
        { token: "0x1", symbol: "ETH", tradeCount: 42, successRate: 71.4 },
        { token: "0x2", symbol: "SOL", tradeCount: 28, successRate: 64.3 },
        { token: "0x3", symbol: "ARB", tradeCount: 15, successRate: 73.3 },
      ],
    },
    riskMetrics: {
      riskScore: 4,
      volatility: 22.5,
      consistency: 7.8,
      leverage: 1.2,
      diversification: 6.5,
    },
    recentTrades: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: "buy",
        token: "0x1",
        symbol: "ETH",
        amount: 2.5,
        price: 3180,
        status: "open",
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: "sell",
        token: "0x2",
        symbol: "SOL",
        amount: 50,
        price: 142.3,
        status: "closed",
      },
    ],
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, data: analytics });
};

export const GET = withGateway(handler, "$0.02", "/api/copy-trading/analytics");
