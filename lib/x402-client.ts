import { GatewayClient, type SupportedChainName, BatchEvmScheme } from "@circle-fin/x402-batching/client";
import { x402Client } from "@x402/core/client";
import type { Address } from "viem";

const DEMO_PRIVATE_KEY = (process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`;
const DEMO_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

let gatewayClient: GatewayClient | null = null;
let x402: x402Client | null = null;

function getDemoClient(): GatewayClient {
  if (!gatewayClient) {
    gatewayClient = new GatewayClient({
      chain: "arcTestnet" as SupportedChainName,
      privateKey: DEMO_PRIVATE_KEY,
    });
  }
  return gatewayClient;
}

export function getAddress(): string {
  return DEMO_ADDRESS;
}

export async function connectWallet(): Promise<{ address: string; connected: boolean }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return { address: "", connected: false };
  }
  const eth = (window as any).ethereum;
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  if (!accounts.length) return { address: "", connected: false };

  const address = accounts[0] as Address;
  const signer = {
    address,
    signTypedData: (params: any) =>
      eth.request({
        method: "eth_signTypedData_v4",
        params: [address, JSON.stringify(params)],
      }),
  };

  const scheme = new BatchEvmScheme(signer);
  x402 = new x402Client();
  (x402 as any).register("eip155:5042002", scheme);
  return { address, connected: true };
}

export async function payAndFetch<T = unknown>(url: string): Promise<T> {
  if (x402) {
    const r = await fetch(url);
    if (r.status === 402) {
      const base64 = r.headers.get("PAYMENT-REQUIRED");
      if (!base64) throw new Error("No PAYMENT-REQUIRED header");
      const paymentRequired = JSON.parse(atob(base64));
      const payload = await x402!.createPaymentPayload(paymentRequired);
      const headers = { "payment-signature": btoa(JSON.stringify(payload)) };
      const r2 = await fetch(url, { headers });
      if (!r2.ok) throw new Error(`Payment failed: ${r2.status}`);
      return r2.json();
    }
    if (!r.ok) throw new Error(`Failed: ${r.status}`);
    return r.json();
  }

  const gw = getDemoClient();
  const r = await gw.pay(url);
  return r.data as T;
}

export async function checkBalance(): Promise<{ gateway: string; wallet: string }> {
  const gw = getDemoClient();
  const b = await gw.getBalances();
  return {
    gateway: b.gateway.formattedAvailable ?? "0",
    wallet: b.wallet.formatted ?? "0",
  };
}

export async function depositToGateway(amount: string): Promise<void> {
  const gw = getDemoClient();
  await gw.deposit(amount);
}
