import { type NextRequest, NextResponse } from "next/server";
import { heartbeatApi } from "@/api";
import { PUBLIC_ROUTE_PATTERNS, PUBLIC_ROUTE_PREFIXES } from "@/constants/publicRoutes";

const AUTHED_HOME = "/transactions";

/**
 * Paths that global-tenant users (identified by ?isGlobal=true) are allowed to
 * visit. Any other path with the global-tenant flag redirects to /login.
 * Mirrors pg-dashboard's GLOBAL_TENANT_ALLOWED_PATH_PREFIXES.
 */
const GLOBAL_TENANT_ALLOWED_PREFIXES = [
  "/login",
  "/forgot-password",
  "/transactions",
  "/global-onboarding",
  "/__/auth",
  "/404",
];

const GLOBAL_FALSY = new Set(["false", "0", "no", "off"]);

function isGlobalTenant(searchParams: URLSearchParams): boolean {
  if (!searchParams.has("isGlobal")) return false;
  const raw = searchParams.get("isGlobal");
  if (raw === null || raw === "") return true;
  return !GLOBAL_FALSY.has(raw.toLowerCase().trim());
}

function isPathAllowedForGlobalTenant(pathname: string): boolean {
  return GLOBAL_TENANT_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

type VerifySessionResult = {
  ok: boolean;
  userCreationType?: "OLD_FLOW" | "NEW_FLOW" | null;
};

async function verifySession(req: NextRequest): Promise<VerifySessionResult> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL ?? req.nextUrl.origin}${heartbeatApi}`,
      {
        headers: { cookie: req.headers.get("cookie") || "" },
      }
    );

    const json = (await res.json()) as { data?: { userCreationType?: "OLD_FLOW" | "NEW_FLOW" } };
    const userCreationType = json?.data?.userCreationType ?? null;

    return {
      ok: res.ok,
      userCreationType,
    };
  } catch {
    return {
      ok: false,
      userCreationType: null,
    };
  }
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Global tenant guard: ?isGlobal=true restricts navigation to a known set of
  // paths. Any out-of-bounds path redirects to /login (isGlobal param preserved
  // by clone so the login page stays in global-tenant mode).
  if (isGlobalTenant(req.nextUrl.searchParams) && !isPathAllowedForGlobalTenant(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Dynamic influencer/deal routes: extract the 6-char ID, store it in the
  // influencerId cookie (30 min), and rewrite to /login so the login flow can
  // read it via getCookie("influencerId"). Mirrors pg-dashboard middleware.ts.
  const matchedPattern = PUBLIC_ROUTE_PATTERNS.find((pattern) => pattern.test(pathname));
  if (matchedPattern) {
    const match = pathname.match(matchedPattern);
    const influencerId = match?.[1];

    if (influencerId) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      const res = NextResponse.rewrite(url);

      res.cookies.set("influencerId", influencerId, {
        path: "/",
        secure: true,
        maxAge: 30 * 60 * 1000, // 30 minutes
      });

      const dealId = match?.[2];
      if (dealId) {
        res.cookies.set("dealId", dealId, {
          path: "/",
          secure: true,
          maxAge: 30 * 60 * 1000, // 30 minutes
        });
      }

      return res;
    } else if (pathname === "/amz") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.rewrite(url);
    }
  }

  // All other public routes (login, forgot-password, risk-underwriting, etc.)
  // are handled without session checks; on /login specifically, redirect an
  // already-authed user straight to the app.
  if (isPublicRoute(pathname)) {
    const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");
    if (isLoginRoute) {
      const { ok: isSessionValid } = await verifySession(req);
      if (isSessionValid) {
        const url = req.nextUrl.clone();
        url.pathname = AUTHED_HOME;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Protected routes — require a valid session.
  const { ok: isSessionValid } = await verifySession(req);

  if (!isSessionValid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|gcc|_next/static|_next/image|_next|assets|favicon.ico).*)"],
};
