import { NextRequest, NextResponse } from "next/server";
import { withGateway } from "@/lib/x402";

/**
 * Premium endpoint: Find top crypto traders.
 * Paywalled at $0.01 via x402 on Arc Network.
 */

// Static mock trader data (in production, this queries Moralis/Alchemy/Dune)
const TOP_TRADERS = [
  {
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    pnl30d: 45230,
    winRate: 72,
    totalTrades: 156,
    avgPositionSize: 12450,
    riskScore: 4,
    specialties: ["DeFi", "Blue Chip"],
    followers: 342,
    volume30d: 1890000,
  },
  {
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    pnl30d: 32100,
    winRate: 68,
    totalTrades: 98,
    avgPositionSize: 8700,
    riskScore: 5,
    specialties: ["Meme Coins", "Swing Trading"],
    followers: 189,
    volume30d: 852000,
  },
  {
    walletAddress: "0x9876543210fedcba9876543210fedcba98765432",
    pnl30d: 28150,
    winRate: 81,
    totalTrades: 42,
    avgPositionSize: 23400,
    riskScore: 3,
    specialties: ["Arbitrage", "DeFi"],
    followers: 521,
    volume30d: 982000,
  },
  {
    walletAddress: "0xdeadbeef1234567890abcdef1234567890abcdef",
    pnl30d: 18900,
    winRate: 65,
    totalTrades: 210,
    avgPositionSize: 3200,
    riskScore: 6,
    specialties: ["Day Trading", "Scalping"],
    followers: 105,
    volume30d: 672000,
  },
  {
    walletAddress: "0xbeefdead9876543210fedcba9876543210fedcba",
    pnl30d: 12400,
    winRate: 59,
    totalTrades: 87,
    avgPositionSize: 5600,
    riskScore: 7,
    specialties: ["Memecoin Trading"],
    followers: 67,
    volume30d: 487000,
  },
];

const handler = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const chain = searchParams.get("chain") || "ethereum";
  const limit = parseInt(searchParams.get("limit") || "5");
  const minTrades = parseInt(searchParams.get("minTrades") || "10");

  const filtered = TOP_TRADERS.filter((t) => t.totalTrades >= minTrades)
    .sort((a, b) => b.pnl30d - a.pnl30d)
    .slice(0, limit);

  return NextResponse.json({
    success: true,
    data: {
      traders: filtered,
      metadata: {
        chain,
        totalFound: filtered.length,
        provider: "capcat",
        timestamp: new Date().toISOString(),
      },
    },
  });
};

export const GET = withGateway(handler, "$0.01", "/api/copy-trading/top-traders");
