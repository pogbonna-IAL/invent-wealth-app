import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { OnboardingService } from "@/server/services/onboarding.service";
import { handleDatabaseErrorResponse } from "@/lib/utils/db-error-handler";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ completed: false }, { status: 401 });
    }

    let completed = false;
    try {
      completed = await OnboardingService.isOnboardingComplete(session.user.id);
    } catch (dbError) {
      console.error("Database error checking onboarding status:", dbError);
      return handleDatabaseErrorResponse(dbError, "/onboarding");
    }

    return NextResponse.json({ completed });
  } catch (error) {
    console.error("Onboarding status check error:", error);
    return handleDatabaseErrorResponse(error, "/onboarding");
  }
}

