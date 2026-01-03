import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { isAdmin } from "@/server/services/admin.service";
import { AdminLayout } from "@/components/layout/admin-layout";

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      redirect("/auth/signin?callbackUrl=/admin");
    }

    // Check if user is admin with error handling
    try {
      const admin = await isAdmin(session.user.id);
      if (!admin) {
        redirect("/dashboard?error=unauthorized");
      }
    } catch (adminError) {
      console.error("Error checking admin status:", adminError);
      // If admin check fails, redirect to dashboard for safety
      redirect("/dashboard?error=unauthorized");
    }

    return <AdminLayout user={session.user}>{children}</AdminLayout>;
  } catch (error) {
    console.error("Admin layout error:", error);
    redirect("/auth/signin?callbackUrl=/admin");
  }
}

