import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
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
    const session = await auth();

    if (!session?.user?.id) {
      // If no session, redirect to sign in
      // Use NEXTAUTH_URL if available, otherwise use request URL
      const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
      return NextResponse.redirect(new URL("/auth/signin", baseUrl));
    }

    // Get proper base URL (use NEXTAUTH_URL or request origin)
    const baseUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    
    // Ensure baseUrl doesn't contain 0.0.0.0 in production
    let finalBaseUrl = baseUrl;
    if (process.env.NODE_ENV === "production" && baseUrl.includes("0.0.0.0")) {
      // Use NEXTAUTH_URL or RAILWAY_PUBLIC_DOMAIN
      finalBaseUrl = process.env.NEXTAUTH_URL || 
                    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : baseUrl);
    }

    // Check if user is admin
    try {
      const userIsAdmin = await isAdmin(session.user.id);
      
      if (userIsAdmin) {
        return NextResponse.redirect(new URL("/admin", finalBaseUrl));
      }
    } catch (adminError) {
      console.error("[Auth Callback] Error checking admin status:", adminError);
      // Continue to dashboard if admin check fails
    }

    // Regular users go to dashboard
    return NextResponse.redirect(new URL("/dashboard", finalBaseUrl));
  } catch (error) {
    console.error("[Auth Callback] Error:", error);
    // Fallback: use NEXTAUTH_URL or request origin
    const fallbackUrl = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    return NextResponse.redirect(new URL("/dashboard", fallbackUrl));
  }
}

