import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/reset-password', '/auth/callback'];

// Routes that require admin/faculty role
const adminRoutes = ['/admin'];

// Routes that require student role
const studentRoutes = ['/student'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and API routes that handle their own auth
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname.includes('.') // Static files
    ) {
        return NextResponse.next();
    }

    const { response, user, supabase } = await updateSession(request);

    // Check if route is public
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
    );

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute) {
        const redirectUrl = new URL('/auth/login', request.url);
        redirectUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // If authenticated, get user profile for role-based routing
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        const userRole = profile?.role;

        // Redirect authenticated users away from auth pages
        if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) {
            const dashboardUrl = userRole === 'admin' || userRole === 'faculty'
                ? '/admin/dashboard'
                : '/student/dashboard';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // Redirect root to appropriate dashboard
        if (pathname === '/') {
            const dashboardUrl = userRole === 'admin' || userRole === 'faculty'
                ? '/admin/dashboard'
                : '/student/dashboard';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // Check admin route access
        if (pathname.startsWith('/admin') && userRole !== 'admin' && userRole !== 'faculty') {
            return NextResponse.redirect(new URL('/student/dashboard', request.url));
        }

        // Check student route access
        if (pathname.startsWith('/student') && userRole !== 'student') {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
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
        '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-*).*)',
    ],
};
