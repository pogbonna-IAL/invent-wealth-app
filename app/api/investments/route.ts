import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { InvestmentService } from "@/server/services/investment.service";
import { OnboardingService } from "@/server/services/onboarding.service";
import { z } from "zod";
import { handleDatabaseErrorResponse } from "@/lib/utils/db-error-handler";

const investmentSchema = z.object({
  propertyId: z.string(),
  shares: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if onboarding is complete
    let isOnboardingComplete = false;
    try {
      isOnboardingComplete = await OnboardingService.isOnboardingComplete(session.user.id);
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      return handleDatabaseErrorResponse(error, "/dashboard");
    }

    if (!isOnboardingComplete) {
      return NextResponse.json(
        { error: "Please complete your investor profile before making investments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { propertyId, shares } = investmentSchema.parse(body);

    let investment;
    try {
      investment = await InvestmentService.purchaseShares(
        session.user.id,
        propertyId,
        shares
      );
    } catch (dbError) {
      console.error("Database error creating investment:", dbError);
      return handleDatabaseErrorResponse(dbError, "/dashboard/invest");
    }

    return NextResponse.json({ success: true, investment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Investment API error:", error);
    return handleDatabaseErrorResponse(error, "/dashboard/invest");
  }
}

