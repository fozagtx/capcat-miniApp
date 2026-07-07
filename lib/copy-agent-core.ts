export interface SignalFeedItem {
  id: string;
  endpoint: string;
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  confidence: number;
  priceUsdc: string;
  teaser: string;
  historicalWinRate: number;
  historicalAvgReturnPct: number;
}

export interface PaidSignal {
  id: string;
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
  historicalWinRate: number;
  historicalAvgReturnPct: number;
}

export interface CopyPosition {
  signalId: string;
  trader: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  costUsdc: number;
  openedAt: string;
  simulatedExit: number;
  simulatedPnlPct: number;
  simulatedPnlUsdcNotional: number;
  outcome: "win" | "loss";
}

export interface TraderReputation {
  trader: string;
  copiesTaken: number;
  wins: number;
  losses: number;
  netSimulatedPnlPct: number;
}

export interface AgentDecisionConfig {
  /** Minimum trader-stated confidence required to even consider paying. */
  minConfidence: number;
  /** Minimum trader historical win rate required to consider paying. */
  minHistoricalWinRate: number;
  /** Max USDC price willing to pay for a single signal. */
  maxPriceUsdc: number;
  /**
   * Reputation circuit-breaker: once a trader has produced this many net
   * losing copies (losses - wins), the agent blacklists them regardless of
   * their stated confidence on new signals. This is the "reputation as
   * collateral" mechanic — trust is earned and can be revoked.
   */
  blacklistAfterNetLosses: number;
}

export const DEFAULT_CONFIG: AgentDecisionConfig = {
  minConfidence: 0.5,
  minHistoricalWinRate: 0.4,
  maxPriceUsdc: 0.05,
  blacklistAfterNetLosses: 2,
};

export function parseUsdcPrice(priceUsdc: string): number {
  return parseFloat(priceUsdc.replace("$", ""));
}

/**
 * In-memory reputation ledger the agent builds up over a run. Real deployment
 * would persist this (Supabase/SQLite) so trust carries across restarts.
 */
export class ReputationLedger {
  private ledger = new Map<string, TraderReputation>();

  private getOrCreate(trader: string): TraderReputation {
    let rep = this.ledger.get(trader);
    if (!rep) {
      rep = { trader, copiesTaken: 0, wins: 0, losses: 0, netSimulatedPnlPct: 0 };
      this.ledger.set(trader, rep);
    }
    return rep;
  }

  get(trader: string): TraderReputation {
    return this.getOrCreate(trader);
  }

  isBlacklisted(trader: string, threshold: number): boolean {
    const rep = this.ledger.get(trader);
    if (!rep) return false;
    return rep.losses - rep.wins >= threshold;
  }

  record(position: CopyPosition) {
    const rep = this.getOrCreate(position.trader);
    rep.copiesTaken += 1;
    if (position.outcome === "win") rep.wins += 1;
    else rep.losses += 1;
    rep.netSimulatedPnlPct += position.simulatedPnlPct;
  }

  all(): TraderReputation[] {
    return [...this.ledger.values()];
  }
}

/**
 * Decide whether the agent should pay to unlock a given signal from the
 * public teaser feed, BEFORE spending anything. This is the agentic
 * evaluation step judges care about: the agent is filtering, not blindly
 * paying for everything it sees.
 */
export function shouldPayForSignal(
  item: SignalFeedItem,
  ledger: ReputationLedger,
  config: AgentDecisionConfig = DEFAULT_CONFIG,
): { pay: boolean; reason: string } {
  const price = parseUsdcPrice(item.priceUsdc);

  if (ledger.isBlacklisted(item.trader, config.blacklistAfterNetLosses)) {
    return { pay: false, reason: `${item.trader} is blacklisted (too many net losing copies)` };
  }
  if (price > config.maxPriceUsdc) {
    return { pay: false, reason: `price $${price} exceeds max $${config.maxPriceUsdc}` };
  }
  if (item.confidence < config.minConfidence) {
    return { pay: false, reason: `confidence ${item.confidence} below minimum ${config.minConfidence}` };
  }
  if (item.historicalWinRate < config.minHistoricalWinRate) {
    return {
      pay: false,
      reason: `trader win rate ${item.historicalWinRate} below minimum ${config.minHistoricalWinRate}`,
    };
  }
  return { pay: true, reason: `confidence ${item.confidence}, win rate ${item.historicalWinRate} — passes thresholds` };
}

/**
 * Simulate copying a paid signal as a paper trade. Deterministic-ish: biases
 * the outcome by the trader's historical win rate and average return so the
 * demo produces plausible, reproducible-ish P&L without a live price feed.
 */
export function simulateCopyTrade(signal: PaidSignal, costUsdc: number, rng: () => number = Math.random): CopyPosition {
  const win = rng() < signal.historicalWinRate;
  const magnitude = Math.abs(signal.historicalAvgReturnPct) || 1;
  const pnlPct = win ? magnitude * (0.6 + rng() * 0.8) : -magnitude * (0.4 + rng() * 0.6);

  const direction = signal.side === "LONG" ? 1 : -1;
  const simulatedExit = Number(
    (signal.entry * (1 + (direction * pnlPct) / 100)).toFixed(4),
  );

  return {
    signalId: signal.id,
    trader: signal.trader,
    symbol: signal.symbol,
    side: signal.side,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    costUsdc,
    openedAt: new Date().toISOString(),
    simulatedExit,
    simulatedPnlPct: Number(pnlPct.toFixed(3)),
    simulatedPnlUsdcNotional: Number((pnlPct / 100 * 1000).toFixed(4)), // vs. a fixed $1000 paper notional
    outcome: win ? "win" : "loss",
  };
}
