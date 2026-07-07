import { GatewayClient } from "@circle-fin/x402-batching/client";
import type { SupportedChainName } from "@circle-fin/x402-batching/client";

const DEMO_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
const DEMO_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

let client: GatewayClient | null = null;

export function getPaymentClient(): GatewayClient {
  if (!client) {
    client = new GatewayClient({
      chain: "arcTestnet" as SupportedChainName,
      privateKey: DEMO_PRIVATE_KEY,
    });
  }
  return client;
}

export function getAddress(): string {
  return DEMO_ADDRESS;
}

export async function payAndFetch<T = unknown>(url: string): Promise<T> {
  const gw = getPaymentClient();
  try {
    const b = await gw.getBalances();
    if (Number(b.gateway.formattedAvailable ?? "0") < 0.1) {
      await gw.deposit("1");
    }
  } catch {
    // pay() will surface the real error
  }
  const r = await gw.pay(url);
  return r.data as T;
}
