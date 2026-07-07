import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && session !== "authenticated") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
