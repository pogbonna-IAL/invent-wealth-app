import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { isAdmin } from "@/server/services/admin.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Server-side authentication check
  if (!session) {
    redirect("/auth/signin");
  }

  // Redirect admin users to admin portal (catches email link logins and other redirects)
  try {
    const userIsAdmin = await isAdmin(session.user.id);
    if (userIsAdmin) {
      redirect("/admin");
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
    // Continue to dashboard if check fails
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </AppLayout>
  );
}

