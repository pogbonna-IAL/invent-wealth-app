import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/server/services/admin.service";
import { NextResponse } from "next/server";

/**
 * Callback handler for NextAuth redirects after email verification
 * Checks if user is admin and redirects accordingly
 * This prevents ERR_FAILED by checking admin status before loading dashboard
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      // If no session, redirect to sign in
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // Check if user is admin
    try {
      const userIsAdmin = await isAdmin(session.user.id);
      
      if (userIsAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } catch (adminError) {
      console.error("[Auth Callback] Error checking admin status:", adminError);
      // Continue to dashboard if admin check fails
    }

    // Regular users go to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("[Auth Callback] Error:", error);
    // Fallback to dashboard on error
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}

