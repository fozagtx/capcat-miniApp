"use client";

import { useEffect, useRef, useState } from "react";
import {
  type SignalFeedItem,
  type PaidSignal,
  type CopyPosition,
  ReputationLedger,
  simulateCopyTrade,
} from "@/lib/copy-agent-core";
import { payAndFetch } from "@/lib/x402-client";

export interface AgentActivity {
  id: string;
  timestamp: string;
  type: "evaluated" | "bought" | "skipped" | "simulated";
  signal: SignalFeedItem;
  decision?: { pay: boolean; reason: string };
  position?: CopyPosition;
}

export interface AgentState {
  running: boolean;
  activities: AgentActivity[];
  ledger: {
    trader: string;
    copiesTaken: number;
    wins: number;
    losses: number;
    netSimulatedPnlPct: number;
  }[];
  stats: {
    totalSignals: number;
    bought: number;
    skipped: number;
    wins: number;
    losses: number;
    netPnl: number;
  };
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function askLlm(
  signal: SignalFeedItem,
  ledger: ReputationLedger,
): Promise<{ pay: boolean; reason: string }> {
  const rep = ledger.get(signal.trader);

  const res = await fetch("/api/agent/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signal,
      reputation: {
        copiesTaken: rep.copiesTaken,
        wins: rep.wins,
        losses: rep.losses,
        netSimulatedPnlPct: rep.netSimulatedPnlPct,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM endpoint error: ${text}`);
  }

  return res.json();
}

export function useCopyAgent() {
  const [state, setState] = useState<AgentState>({
    running: false,
    activities: [],
    ledger: [],
    stats: { totalSignals: 0, bought: 0, skipped: 0, wins: 0, losses: 0, netPnl: 0 },
  });

  const ledgerRef = useRef(new ReputationLedger());
  const runningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addActivity = (activity: AgentActivity) => {
    setState((prev) => ({
      ...prev,
      activities: [activity, ...prev.activities].slice(0, 100),
    }));
  };

  const updateStats = (ledger: ReputationLedger) => {
    const all = ledger.all();
    const wins = all.reduce((s, r) => s + r.wins, 0);
    const losses = all.reduce((s, r) => s + r.losses, 0);
    const netPnl = all.reduce((s, r) => s + r.netSimulatedPnlPct, 0);

    setState((prev) => ({
      ...prev,
      ledger: all,
      stats: {
        ...prev.stats,
        wins,
        losses,
        netPnl: Math.round(netPnl * 100) / 100,
      },
    }));
  };

  const runCycle = async () => {
    try {
      const res = await fetch("/api/signals");
      const data = await res.json();
      const signals: SignalFeedItem[] = data.signals || [];

      setState((prev) => ({
        ...prev,
        stats: { ...prev.stats, totalSignals: signals.length },
      }));

      for (const signal of signals) {
        // Ask the OpenRouter-powered LLM to decide
        const decision = await askLlm(signal, ledgerRef.current);

        if (decision.pay) {
          addActivity({
            id: uid(),
            timestamp: new Date().toISOString(),
            type: "evaluated",
            signal,
            decision,
          });

          try {
            const url = `${window.location.origin}/api/signals/${signal.id}`;
            const paidSignal = await payAndFetch<PaidSignal>(url);

            const cost = parseFloat(signal.priceUsdc.replace("$", ""));
            const position = simulateCopyTrade(paidSignal, cost);
            ledgerRef.current.record(position);

            addActivity({
              id: uid(),
              timestamp: new Date().toISOString(),
              type: "bought",
              signal,
              decision,
              position,
            });

            updateStats(ledgerRef.current);
          } catch {
            addActivity({
              id: uid(),
              timestamp: new Date().toISOString(),
              type: "skipped",
              signal,
              decision: { pay: false, reason: "Payment failed (x402)" },
            });
          }
        } else {
          addActivity({
            id: uid(),
            timestamp: new Date().toISOString(),
            type: "skipped",
            signal,
            decision,
          });
        }

        // Small delay to avoid rate limiting the LLM
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      console.error("[Agent] Cycle error:", err);
    }
  };

  const start = () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState((prev) => ({ ...prev, running: true }));
    runCycle();
    intervalRef.current = setInterval(runCycle, 30000);
  };

  const stop = () => {
    runningRef.current = false;
    setState((prev) => ({ ...prev, running: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { state, start, stop };
}
