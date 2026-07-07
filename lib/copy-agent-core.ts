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

export interface TraderReputation {
  trader: string;
  copiesTaken: number;
  wins: number;
  losses: number;
}

export class ReputationLedger {
  private ledger = new Map<string, TraderReputation>();

  private getOrCreate(trader: string): TraderReputation {
    let rep = this.ledger.get(trader);
    if (!rep) {
      rep = { trader, copiesTaken: 0, wins: 0, losses: 0 };
      this.ledger.set(trader, rep);
    }
    return rep;
  }

  get(trader: string): TraderReputation {
    return this.getOrCreate(trader);
  }

  record(trader: string, won: boolean) {
    const rep = this.getOrCreate(trader);
    rep.copiesTaken += 1;
    if (won) rep.wins += 1;
    else rep.losses += 1;
  }

  all(): TraderReputation[] {
    return [...this.ledger.values()];
  }
}
