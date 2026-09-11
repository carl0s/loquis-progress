import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authMisconfigured, verifySession } from "@/lib/auth";

const CLIENT_AREA = "/cliente";

export async function proxy(request: NextRequest) {
  if (authMisconfigured()) {
    return new NextResponse(
      "Accesso non configurato: imposta DASHBOARD_PASSWORD (in locale in .env.local, su Vercel nelle Environment Variables).",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const role = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!role) {
    return isApi ? new NextResponse("Non autorizzato", { status: 401 }) : NextResponse.redirect(new URL("/login", request.url));
  }

  const inClientArea = pathname === CLIENT_AREA || pathname.startsWith(`${CLIENT_AREA}/`);
  if (role === "viewer" && !inClientArea) {
    return isApi ? new NextResponse("Non autorizzato", { status: 403 }) : NextResponse.redirect(new URL(CLIENT_AREA, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
