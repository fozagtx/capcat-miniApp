import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";
import { NextRequest, NextResponse } from "next/server";

const ARC_TESTNET_NETWORK = "eip155:5042002";
const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";
const ARC_TESTNET_GATEWAY_WALLET = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

export const sellerAddress = process.env.SELLER_ADDRESS as `0x${string}`;

const facilitator = new BatchFacilitatorClient();

interface PaymentPayload {
  x402Version: number;
  resource?: { url: string; description: string; mimeType: string };
  accepted?: Record<string, unknown>;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

function buildPaymentRequirements(price: string) {
  // Parse dollar amount to USDC atomic units (6 decimals)
  const amount = Math.round(parseFloat(price.replace("$", "")) * 1_000_000);

  return {
    scheme: "exact" as const,
    network: ARC_TESTNET_NETWORK,
    asset: ARC_TESTNET_USDC,
    amount: amount.toString(),
    payTo: sellerAddress,
    maxTimeoutSeconds: 345600,
    extra: {
      name: "GatewayWalletBatched",
      version: "1",
      verifyingContract: ARC_TESTNET_GATEWAY_WALLET,
    },
  };
}

/**
 * Wraps a Next.js route handler with Circle Gateway payment verification.
 *
 * Follows fred-mvp's approach: manually constructs payment requirements with
 * the Gateway batching `extra` field and calls BatchFacilitatorClient directly.
 */
export function withGateway(
  handler: (req: NextRequest) => Promise<NextResponse>,
  price: string,
  endpoint: string,
) {
  const requirements = buildPaymentRequirements(price);

  return async (req: NextRequest) => {
    const paymentSignature = req.headers.get("payment-signature");

    // No payment — return 402 with Gateway batching payment requirements
    if (!paymentSignature) {
      console.log(`[x402] 402 Payment Required: ${endpoint}`);

      const paymentRequired = {
        x402Version: 2,
        resource: {
          url: endpoint,
          description: `Paid resource (${price} USDC)`,
          mimeType: "application/json",
        },
        accepts: [requirements],
      };

      return new NextResponse(JSON.stringify({}), {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-REQUIRED": Buffer.from(
            JSON.stringify(paymentRequired),
          ).toString("base64"),
        },
      });
    }

    // Payment present — verify and settle via Circle Gateway
    try {
      const paymentPayload: PaymentPayload = JSON.parse(
        Buffer.from(paymentSignature, "base64").toString("utf-8"),
      );

      const verifyResult = await facilitator.verify(
        paymentPayload,
        requirements,
      );

      if (!verifyResult.isValid) {
        return NextResponse.json(
          {
            error: "Payment verification failed",
            reason: verifyResult.invalidReason,
          },
          { status: 402 },
        );
      }

      const settleResult = await facilitator.settle(
        paymentPayload,
        requirements,
      );

      if (!settleResult.success) {
        console.error(
          `[x402] Settlement failed for ${endpoint}: ${settleResult.errorReason}`,
        );
        return NextResponse.json(
          {
            error: "Payment settlement failed",
            reason: settleResult.errorReason,
          },
          { status: 402 },
        );
      }

      // Log settled payment
      const amountUsdc = (
        Number(requirements.amount) / 1e6
      ).toString();
      const payer = settleResult.payer ?? verifyResult.payer ?? "unknown";

      console.log(
        `[x402] Payment settled: ${endpoint} — ${amountUsdc} USDC from ${payer}`,
      );

      // Call the actual route handler
      const response = await handler(req);

      // Forward settlement info to the client
      const settleResponseHeader = Buffer.from(
        JSON.stringify({
          success: true,
          transaction: settleResult.transaction,
          network: requirements.network,
          payer,
        }),
      ).toString("base64");

      response.headers.set("PAYMENT-RESPONSE", settleResponseHeader);
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error("[x402] Payment processing error:", message);
      return NextResponse.json(
        { error: "Payment processing error", message },
        { status: 500 },
      );
    }
  };
}

/**
 * Same x402/Gateway verify + settle flow as `withGateway`, but for dynamic
 * routes (e.g. `/api/signals/[id]`) where the price and endpoint depend on
 * the request rather than being fixed at module-load time.
 *
 * `resolve` inspects the request (e.g. reads the `id` route param) and
 * returns the price ("$0.01") and canonical endpoint string, or `null` if
 * the resource doesn't exist (caller should 404 before payment is checked).
 */
export function withGatewayDynamic(
  handler: (req: NextRequest) => Promise<NextResponse>,
  resolve: (req: NextRequest) => { price: string; endpoint: string } | null,
) {
  return async (req: NextRequest) => {
    const resolved = resolve(req);
    if (!resolved) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { price, endpoint } = resolved;
    const requirements = buildPaymentRequirements(price);
    const paymentSignature = req.headers.get("payment-signature");

    if (!paymentSignature) {
      console.log(`[x402] 402 Payment Required: ${endpoint}`);
      const paymentRequired = {
        x402Version: 2,
        resource: {
          url: endpoint,
          description: `Paid resource (${price} USDC)`,
          mimeType: "application/json",
        },
        accepts: [requirements],
      };
      return new NextResponse(JSON.stringify({}), {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-REQUIRED": Buffer.from(
            JSON.stringify(paymentRequired),
          ).toString("base64"),
        },
      });
    }

    try {
      const paymentPayload: PaymentPayload = JSON.parse(
        Buffer.from(paymentSignature, "base64").toString("utf-8"),
      );

      const verifyResult = await facilitator.verify(paymentPayload, requirements);
      if (!verifyResult.isValid) {
        return NextResponse.json(
          { error: "Payment verification failed", reason: verifyResult.invalidReason },
          { status: 402 },
        );
      }

      const settleResult = await facilitator.settle(paymentPayload, requirements);
      if (!settleResult.success) {
        console.error(`[x402] Settlement failed for ${endpoint}: ${settleResult.errorReason}`);
        return NextResponse.json(
          { error: "Payment settlement failed", reason: settleResult.errorReason },
          { status: 402 },
        );
      }

      const amountUsdc = (Number(requirements.amount) / 1e6).toString();
      const payer = settleResult.payer ?? verifyResult.payer ?? "unknown";

      console.log(`[x402] Payment settled: ${endpoint} — ${amountUsdc} USDC from ${payer}`);

      const response = await handler(req);
      const settleResponseHeader = Buffer.from(
        JSON.stringify({
          success: true,
          transaction: settleResult.transaction,
          network: requirements.network,
          payer,
        }),
      ).toString("base64");
      response.headers.set("PAYMENT-RESPONSE", settleResponseHeader);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[x402] Payment processing error:", message);
      return NextResponse.json(
        { error: "Payment processing error", message },
        { status: 500 },
      );
    }
  };
}
