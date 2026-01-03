import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireAdmin } from "@/server/services/admin.service";
import { DistributionService } from "@/server/services/distribution.service";
import { DistributionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { z } from "zod";
import { handleDatabaseErrorResponse } from "@/lib/utils/db-error-handler";

const declareDistributionSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  rentalStatementId: z.string().min(1, "Rental statement ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(session.user.id);

    const body = await request.json();
    const { propertyId, rentalStatementId } = declareDistributionSchema.parse(body);

    let existingDistribution;
    try {
      // Check if distribution already exists for this rental statement
      existingDistribution = await prisma.distribution.findFirst({
        where: { rentalStatementId },
      });
    } catch (dbError) {
      console.error("Database error checking existing distribution:", dbError);
      return handleDatabaseErrorResponse(dbError, "/admin/distributions");
    }

    if (existingDistribution) {
      return NextResponse.json(
        { error: "A distribution already exists for this rental statement" },
        { status: 400 }
      );
    }

    // Create draft distribution and payouts
    let draftResult;
    try {
      draftResult = await DistributionService.createDraftDistribution(
        propertyId,
        rentalStatementId
      );
    } catch (dbError) {
      console.error("Database error creating draft distribution:", dbError);
      return handleDatabaseErrorResponse(dbError, "/admin/distributions");
    }

    // Mark distribution as DECLARED (skip approval flow for direct declaration)
    let declaredDistribution;
    try {
      declaredDistribution = await prisma.distribution.update({
        where: { id: draftResult.distribution.id },
        data: {
          status: DistributionStatus.DECLARED,
          declaredAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error("Database error updating distribution:", dbError);
      return handleDatabaseErrorResponse(dbError, "/admin/distributions");
    }

    // Create transaction records for all payouts
    try {
      await Promise.all(
        draftResult.payouts.map(async (payout) => {
          await prisma.transaction.create({
            data: {
              userId: payout.userId,
              type: TransactionType.PAYOUT,
              amount: payout.amount,
              currency: "NGN",
              reference: `PAY-${payout.id.slice(0, 8).toUpperCase()}`,
            },
          });
        })
      );
    } catch (dbError) {
      console.error("Database error creating transactions:", dbError);
      return handleDatabaseErrorResponse(dbError, "/admin/distributions");
    }

    const result = {
      distribution: declaredDistribution,
      payouts: draftResult.payouts,
    };

    return NextResponse.json({
      success: true,
      distribution: result.distribution,
      payoutsCreated: result.payouts.length,
      message: `Distribution declared successfully. ${result.payouts.length} payouts created.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Distribution declaration error:", error);
    return handleDatabaseErrorResponse(error, "/admin/distributions");
  }
}

