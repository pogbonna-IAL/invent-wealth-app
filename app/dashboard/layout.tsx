import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { isAdmin } from "@/server/services/admin.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await auth();

    // Server-side authentication check
    if (!session?.user?.id) {
      redirect("/auth/signin");
    }

    // Redirect admin users to admin portal (catches email link logins and other redirects)
    // Add timeout to prevent hanging
    try {
      const adminCheckPromise = isAdmin(session.user.id);
      const timeoutPromise = new Promise<boolean>((resolve) => 
        setTimeout(() => resolve(false), 3000)
      );
      
      const userIsAdmin = await Promise.race([adminCheckPromise, timeoutPromise]);
      if (userIsAdmin) {
        redirect("/admin");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      // Continue to dashboard if check fails - don't crash
    }

    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </AppLayout>
    );
  } catch (error) {
    console.error("Dashboard layout error:", error);
    // If there's a critical error, redirect to sign in
    redirect("/auth/signin");
  }
}

