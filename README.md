# capcat

Farcaster Mini App for copy trading signals, paywalled with x402 nanopayments on Arc Network.

Browse signals from top traders. Pay fractions of a cent in USDC to unlock entry/stop/target. No logins, no API keys — just instant micropayments.

## Stack

- **Next.js 16** — App Router
- **Farcaster Frames v2** — `@farcaster/frame-sdk`
- **x402 Protocol** — HTTP 402 payment flow via `@circle-fin/x402-batching`
- **Arc Network** — USDC-native testnet (eip155:5042002)
- **Supabase** — Payment event logging + dashboard auth
- **Tailwind CSS** + shadcn/ui

## Quick Start

```bash
npm install
cp .env.example .env.local        # fill in Supabase + wallet keys
npx supabase start                # local DB
npx supabase migration up
npm run dev
```

Open `http://localhost:3000`.

## Routes

| Route | Type | Notes |
|---|---|---|
| `/` | Mini App | Signal feed + x402 unlock flow |
| `/dashboard` | Seller | Payment monitoring + withdrawals (auth required) |
| `/api/signals` | Free | Public signal teaser feed |
| `/api/signals/[id]` | x402 | Full signal (entry/stop/target) — $0.001–$0.02 |
| `/api/copy-trading/top-traders` | x402 | Ranked trader list — $0.01 |
| `/api/copy-trading/analytics` | x402 | Deep trader analytics — $0.02 |
| `/api/farcaster/webhook` | Frame | Farcaster interaction handler |
| `/api/gateway/balance` | Internal | Gateway USDC balance |
| `/api/gateway/withdraw` | Internal | Withdraw to wallet |

## Deploy to Farcaster

1. Deploy to Vercel
2. Update `public/.well-known/farcaster.json` with production URLs
3. Paste the URL in a Warpcast cast

## Credentials

Dashboard login: `admin@example.com` / `123456`
