"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GatewayBalanceDialog, type GatewayBalances } from "./gateway-balance-dialog";
import { WithdrawDialog } from "./withdraw-dialog";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TopBarGatewayControls() {
  const [balances, setBalances] = useState<GatewayBalances | null>(null);
  const [loading, setLoading] = useState(false);
  const balancesRef = useRef<GatewayBalances | null>(null);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gateway/balance");
      if (res.ok) {
        const next: GatewayBalances = await res.json();
        const prev = balancesRef.current;
        if (prev && prev.gateway.available !== next.gateway.available) {
          toast.success("Gateway balance updated", {
            description: `Available: ${next.gateway.available} USDC`,
          });
        }
        balancesRef.current = next;
        setBalances(next);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
    // Poll every 15 seconds instead of Supabase realtime
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return (
    <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-4 min-w-0">
        <span className="font-semibold text-sm truncate">capcat</span>
        <WithdrawDialog
          maxAvailable={balances?.gateway.available ?? "0"}
          onWithdraw={fetchBalances}
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="gap-1.5 text-xs pr-1.5">
          <span className="text-muted-foreground font-sans">Gateway:</span>
          <span className="font-mono leading-none translate-y-px inline-flex items-center gap-1">
            {loading && !balances ? <Loader2 size={12} className="animate-spin" /> : null}
            {balances ? `$${balances.gateway.available} USDC` : loading ? "Loading..." : "—"}
          </span>
          <GatewayBalanceDialog
            balances={balances}
            loading={loading}
            onRefresh={fetchBalances}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 -mr-0.5"
                aria-label="Open gateway balance details"
              >
                <Info size={12} className="text-muted-foreground" />
              </Button>
            }
          />
        </Badge>

      </div>
    </div>
  );
}
