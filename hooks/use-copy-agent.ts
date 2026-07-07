"use client";

import { useEffect, useRef, useState } from "react";
import { type SignalFeedItem, type PaidSignal, ReputationLedger } from "@/lib/copy-agent-core";
import { payAndFetch } from "@/lib/x402-client";

export interface AgentActivity {
  id: string;
  timestamp: string;
  type: "evaluated" | "bought" | "skipped";
  signal: SignalFeedItem;
  decision?: { pay: boolean; reason: string };
}

export interface AgentState {
  running: boolean;
  activities: AgentActivity[];
  ledger: {
    trader: string;
    copiesTaken: number;
    wins: number;
    losses: number;
  }[];
  stats: {
    totalSignals: number;
    bought: number;
    skipped: number;
    wins: number;
    losses: number;
  };
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function askLlm(signal: SignalFeedItem, ledger: ReputationLedger): Promise<{ pay: boolean; reason: string }> {
  const rep = ledger.get(signal.trader);
  const res = await fetch("/api/agent/decide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signal, reputation: rep }),
  });
  if (!res.ok) throw new Error(`LLM error: ${await res.text()}`);
  return res.json();
}

export function useCopyAgent() {
  const [state, setState] = useState<AgentState>({
    running: false,
    activities: [],
    ledger: [],
    stats: { totalSignals: 0, bought: 0, skipped: 0, wins: 0, losses: 0 },
  });

  const ledgerRef = useRef(new ReputationLedger());
  const runningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addActivity = (a: AgentActivity) => {
    setState((prev) => ({ ...prev, activities: [a, ...prev.activities].slice(0, 100) }));
  };

  const updateStats = (ledger: ReputationLedger) => {
    const all = ledger.all();
    const wins = all.reduce((s, r) => s + r.wins, 0);
    const losses = all.reduce((s, r) => s + r.losses, 0);
    setState((prev) => ({
      ...prev,
      ledger: all,
      stats: { ...prev.stats, wins, losses },
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
        const decision = await askLlm(signal, ledgerRef.current);

        if (decision.pay) {
          addActivity({ id: uid(), timestamp: new Date().toISOString(), type: "evaluated", signal, decision });

          try {
            const url = `${window.location.origin}/api/signals/${signal.id}`;
            await payAndFetch<PaidSignal>(url);

            ledgerRef.current.record(signal.trader, true);
            updateStats(ledgerRef.current);

            addActivity({ id: uid(), timestamp: new Date().toISOString(), type: "bought", signal, decision });
          } catch {
            ledgerRef.current.record(signal.trader, false);
            updateStats(ledgerRef.current);
            addActivity({ id: uid(), timestamp: new Date().toISOString(), type: "skipped", signal, decision: { pay: false, reason: "Payment failed" } });
          }
        } else {
          addActivity({ id: uid(), timestamp: new Date().toISOString(), type: "skipped", signal, decision });
        }

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
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { state, start, stop };
}
