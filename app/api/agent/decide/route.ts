import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/openrouter";
import type { SignalFeedItem } from "@/lib/copy-agent-core";

const SYSTEM_PROMPT = `You are capcat's autonomous copy-trading agent. Your job is to decide whether to pay a micro-fee (USDC on Arc Network) to unlock a trading signal from a human trader.

You must respond with EXACTLY one line in this format:
YES|<reason>   or   NO|<reason>

Rules:
- Favor signals with high confidence (>=0.6) and strong historical win rates (>=0.5).
- Avoid traders who have been losing (more losses than wins).
- Signal cost is in USDC; anything over $0.03 is expensive.
- If a trader has 3+ net losses, blacklist them.
- Consider the teaser: does the rationale sound legitimate or vague?
- Be selective, it's better to skip than to bleed.

Respond with ONE line only.`;

const CHAT_PROMPT = `You are capcat's AI copy-trading assistant. You help users understand trading signals, evaluate traders, and make decisions.

Current signals:
%SIGNALS%

Agent stats: %STATS%

Be concise, friendly, and helpful. Answer in 1-3 sentences. Reference specific signal data when asked. Don't make up data.`;

interface DecideBody {
  signal?: SignalFeedItem;
  reputation?: { copiesTaken: number; wins: number; losses: number } | null;
  chat?: string;
  signals?: any[];
  agent?: any;
}

function formatSignals(signals: any[]): string {
  if (!signals?.length) return "No signals loaded yet.";
  return signals.map(s => `${s.symbol} ${s.side} ${(s.confidence*100).toFixed(0)}% conf ${s.priceUsdc} — ${s.trader}`).join("\n");
}

function formatStats(agent: any): string {
  if (!agent) return "Agent not started.";
  return `bought ${agent.stats?.bought ?? 0}, skipped ${agent.stats?.skipped ?? 0}, wins ${agent.stats?.wins ?? 0}, losses ${agent.stats?.losses ?? 0}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: DecideBody = await req.json();

    if (body.chat) {
      const prompt = CHAT_PROMPT
        .replace("%SIGNALS%", formatSignals(body.signals))
        .replace("%STATS%", formatStats(body.agent));

      const reply = await chat({ systemPrompt: prompt, userMessage: body.chat, maxTokens: 256, temperature: 0.7 });
      return NextResponse.json({ reply: reply.trim() });
    }

    const { signal, reputation } = body;
    if (!signal) return NextResponse.json({ error: "Missing signal" }, { status: 400 });

    const repText = reputation
      ? `copies: ${reputation.copiesTaken}, wins: ${reputation.wins}, losses: ${reputation.losses}`
      : "no history yet";

    const userMessage = [
      `Signal: ${signal.symbol} ${signal.side}`,
      `Trader: ${signal.trader}`,
      `Confidence: ${signal.confidence}`,
      `Historic win rate: ${signal.historicalWinRate}`,
      `Avg return: ${signal.historicalAvgReturnPct}%`,
      `Price: ${signal.priceUsdc}`,
      `Teaser: "${signal.teaser}"`,
      `Reputation: ${repText}`,
    ].join("\n");

    const raw = await chat({ systemPrompt: SYSTEM_PROMPT, userMessage, maxTokens: 128, temperature: 0.2 });
    const trimmed = raw.trim();
    const sep = trimmed.indexOf("|");

    if (sep === -1) {
      const upper = trimmed.toUpperCase();
      if (upper.startsWith("YES")) return NextResponse.json({ pay: true, reason: trimmed.replace(/^YES\|?/i, "").trim() || "yes" });
      return NextResponse.json({ pay: false, reason: trimmed.replace(/^NO\|?/i, "").trim() || "no" });
    }

    const verdict = trimmed.slice(0, sep).trim().toUpperCase();
    const reason = trimmed.slice(sep + 1).trim();
    return NextResponse.json({ pay: verdict === "YES", reason: reason || verdict });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Agent/Decide] Error:", message);
    return NextResponse.json({ pay: false, reason: `error: ${message.slice(0, 80)}`, reply: "I can't respond right now." });
  }
}
