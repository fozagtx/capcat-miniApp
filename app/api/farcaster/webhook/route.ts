import { NextRequest, NextResponse } from "next/server";

/**
 * Farcaster Frame v2 webhook handler.
 * Called when a user interacts with the frame in Warpcast/frames clients.
 * Handles button clicks and returns updated frame state.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trustedData, untrustedData } = body;

    console.log("[Farcaster Webhook] Received:", {
      buttonIndex: untrustedData?.buttonIndex,
      fid: untrustedData?.fid,
      castId: untrustedData?.castId,
    });

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Build the next frame
    const frameResponse = {
      frame: {
        version: "vNext",
        image: `${baseUrl}/og.png`,
        postUrl: `${baseUrl}/api/farcaster/webhook`,
        buttons: [
          {
            label: "Open capcat",
            action: "post_redirect",
            target: `${baseUrl}/mini-app`,
          },
        ],
        input: {
          text: "Explore trading signals...",
        },
        state: JSON.stringify({
          fid: untrustedData?.fid,
          timestamp: Date.now(),
        }),
      },
    };

    return NextResponse.json(frameResponse);
  } catch (error) {
    console.error("[Farcaster Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
