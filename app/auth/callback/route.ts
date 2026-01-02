import { auth } from "@/server/auth";
import { isAdmin } from "@/server/services/admin.service";
import { NextResponse } from "next/server";

/**
 * Callback handler for NextAuth redirects after email verification
 * Checks if user is admin and redirects accordingly
 * This prevents ERR_FAILED by checking admin status before loading dashboard
 * Uses proper domain from request URL to avoid 0.0.0.0:8080 redirects
 */
export async function GET(request: Request) {
  try {
    // Get proper base URL from request or environment
    const requestUrl = new URL(request.url);
    const baseUrl = process.env.NEXTAUTH_URL || requestUrl.origin;
    
    // Ensure baseUrl doesn't contain 0.0.0.0 in production
    let finalBaseUrl = baseUrl;
    if (process.env.NODE_ENV === "production") {
      if (baseUrl.includes("0.0.0.0") || baseUrl.includes("localhost")) {
        // Use NEXTAUTH_URL or RAILWAY_PUBLIC_DOMAIN
        finalBaseUrl = process.env.NEXTAUTH_URL || 
                      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : baseUrl);
      }
    }

    // Get session
    const session = await auth();

    if (!session?.user?.id) {
      // If no session, redirect to sign in
      return NextResponse.redirect(new URL("/auth/signin", finalBaseUrl));
    }

    // Check if user is admin (with timeout to prevent hanging)
    try {
      const adminCheckPromise = isAdmin(session.user.id);
      const timeoutPromise = new Promise<boolean>((resolve) => 
        setTimeout(() => resolve(false), 3000)
      );
      
      const userIsAdmin = await Promise.race([adminCheckPromise, timeoutPromise]);
      
      if (userIsAdmin) {
        return NextResponse.redirect(new URL("/admin", finalBaseUrl));
      }
    } catch (adminError) {
      console.error("[Auth Callback] Error checking admin status:", adminError);
      // Continue to dashboard if admin check fails - don't block the redirect
    }

    // Regular users go to dashboard
    // Use a relative URL to avoid any domain resolution issues
    const dashboardUrl = new URL("/dashboard", finalBaseUrl);
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    console.error("[Auth Callback] Error:", error);
    // Fallback: redirect to sign in on error
    try {
      const requestUrl = new URL(request.url);
      const fallbackUrl = process.env.NEXTAUTH_URL || requestUrl.origin;
      return NextResponse.redirect(new URL("/auth/signin", fallbackUrl));
    } catch {
      // If all else fails, return a simple response
      return NextResponse.json({ error: "Authentication error" }, { status: 500 });
    }
  }
}

