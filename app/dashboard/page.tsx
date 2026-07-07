"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface GatewayBalance {
  gateway: {
    total: string;
    available: string;
    withdrawing: string;
    withdrawable: string;
  };
  wallet: {
    balance: string;
  };
}

export default function Dashboard() {
  const [balance, setBalance] = useState<GatewayBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gateway/balance")
      .then((r) => r.json())
      .then(setBalance)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetch("/api/gateway/balance")
        .then((r) => r.json())
        .then(setBalance)
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <Badge variant="destructive">{error}</Badge>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Seller Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Monitor your Circle Gateway balance and earnings from x402 micropayments.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Gateway Available</p>
          <p className="text-2xl font-mono font-bold">
            {Number(balance?.gateway.available ?? 0).toFixed(4)} USDC
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Withdrawable</p>
          <p className="text-2xl font-mono font-bold">
            {Number(balance?.gateway.withdrawable ?? 0).toFixed(4)} USDC
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Wallet USDC</p>
          <p className="text-2xl font-mono font-bold">
            {Number(balance?.wallet.balance ?? 0).toFixed(4)} USDC
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Gateway Total</p>
          <p className="text-2xl font-mono font-bold">
            {Number(balance?.gateway.total ?? 0).toFixed(4)} USDC
          </p>
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Payment Activity</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Payment events are logged in real-time via server console.
            Search for <code className="bg-muted px-1 rounded">[x402] Payment settled</code> in your deployment logs.
          </p>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          <p>No database required — all payment audit trails go to stdout/logs.</p>
        </div>
      </div>
    </div>
  );
}
