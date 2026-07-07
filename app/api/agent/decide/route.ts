import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/openrouter";
import type { SignalFeedItem } from "@/lib/copy-agent-core";

interface DecideBody {
  signal: SignalFeedItem;
  reputation: {
    copiesTaken: number;
    wins: number;
    losses: number;
    netSimulatedPnlPct: number;
  } | null;
}

const SYSTEM_PROMPT = `You are capcat's autonomous copy-trading agent. Your job is to decide whether to pay a micro-fee (USDC on Arc Network) to unlock a trading signal from a human trader.

You must respond with EXACTLY one line in this format:
YES|<reason>   or   NO|<reason>

Rules:
- Favor signals with high confidence (≥0.6) and strong historical win rates (≥0.5).
- Avoid traders who have been losing (negative net P&L, more losses than wins).
- The signal cost is in USDC; anything over $0.03 is expensive.
- If a trader has 3+ net losses, blacklist them.
- Consider the teaser: does the rationale sound legitimate or vague?
- Be selective — it's better to skip than to bleed.

Respond with ONE line only.`;

export async function POST(req: NextRequest) {
  try {
    const body: DecideBody = await req.json();
    const { signal, reputation } = body;

    if (!signal) {
      return NextResponse.json({ error: "Missing signal" }, { status: 400 });
    }

    const repText = reputation
      ? `copies: ${reputation.copiesTaken}, wins: ${reputation.wins}, losses: ${reputation.losses}, net P&L: ${reputation.netSimulatedPnlPct.toFixed(2)}%`
      : "no history yet";

    const userMessage = [
      `Signal: ${signal.symbol} ${signal.side}`,
      `Trader: ${signal.trader}`,
      `Confidence: ${signal.confidence}`,
      `Historic win rate: ${signal.historicalWinRate}`,
      `Avg return: ${signal.historicalAvgReturnPct}%`,
      `Price: ${signal.priceUsdc}`,
      `Teaser: "${signal.teaser}"`,
      `Trader reputation: ${repText}`,
    ].join("\n");

    const raw = await chat({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 128,
      temperature: 0.2,
    });

    const trimmed = raw.trim();
    const sepIndex = trimmed.indexOf("|");

    if (sepIndex === -1) {
      const upper = trimmed.toUpperCase();
      if (upper.startsWith("YES")) {
        return NextResponse.json({ pay: true, reason: trimmed.replace(/^YES\|?/i, "").trim() || "LLM approved" });
      }
      return NextResponse.json({ pay: false, reason: trimmed.replace(/^NO\|?/i, "").trim() || "LLM skipped" });
    }

    const verdict = trimmed.slice(0, sepIndex).trim().toUpperCase();
    const reason = trimmed.slice(sepIndex + 1).trim();

    return NextResponse.json({
      pay: verdict === "YES",
      reason: reason || (verdict === "YES" ? "LLM approved" : "LLM skipped"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Agent/Decide] Error:", message);
    return NextResponse.json({
      pay: false,
      reason: `LLM unavailable: ${message.slice(0, 80)}`,
    });
  }
}
