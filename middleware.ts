import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/register",
  "/auth/reset-password",
  "/auth/update-password",
  "/auth/callback",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and ALL API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") || // Skip ALL API routes
    pathname.includes(".") // Static files
  ) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  // If not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Keep middleware lightweight for peak load reliability.
  // Role routing is enforced in app layouts after profile fetch.
  if (user) {
    if (
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/signup") ||
      pathname.startsWith("/auth/register")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-*).*)",
  ],
};
