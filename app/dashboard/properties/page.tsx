import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { PropertyService } from "@/server/services/property.service";
import { PropertiesCatalog } from "@/components/properties/properties-catalog";
import { handleDatabaseError } from "@/lib/utils/db-error-handler";

export const dynamic = "force-dynamic";

export default async function DashboardPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    city?: string;
    type?: string;
    minInvestment?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      redirect("/auth/signin");
    }

    const params = await searchParams;
    let properties: any[] = [];
    let propertiesWithAvailableShares: any[] = [];
    let allProperties: any[] = [];
    let cities: string[] = [];
    let types: string[] = [];

    try {
      properties = await PropertyService.getPropertiesWithFilters({
        city: params.city,
        propertyType: params.type,
        minInvestment: params.minInvestment ? Number(params.minInvestment) : undefined,
        status: params.status as any,
        sortBy: params.sort as any,
      });

      // Calculate availableShares dynamically for each property
      const { prisma } = await import("@/server/db/prisma");
      propertiesWithAvailableShares = await Promise.all(
        properties.map(async (property) => {
          try {
            // Get total confirmed investments for this property
            const totalInvestedShares = await prisma.investment.aggregate({
              where: {
                propertyId: property.id,
                status: "CONFIRMED",
              },
              _sum: {
                shares: true,
              },
            });
            const investedShares = totalInvestedShares._sum.shares || 0;
            const availableShares = property.totalShares - investedShares;

            return {
              ...property,
              availableShares, // Use dynamically calculated value
            };
          } catch (error) {
            console.error(`Error calculating shares for property ${property.id}:`, error);
            // Return property with totalShares as availableShares if calculation fails
            return {
              ...property,
              availableShares: property.totalShares,
            };
          }
        })
      );

      // Get unique values for filters
      allProperties = await PropertyService.getProperties();
      cities = [...new Set(allProperties.map((p) => p.city))].sort();
      types = [...new Set(allProperties.map((p) => p.propertyType))].sort();
    } catch (error) {
      console.error("Error fetching properties:", error);
      handleDatabaseError(error, "/dashboard");
    }

    // Serialize Decimal fields to numbers for client components
    const serializedProperties = propertiesWithAvailableShares.map((property) => ({
      ...property,
      pricePerShare: Number(property.pricePerShare),
      targetRaise: property.targetRaise ? Number(property.targetRaise) : null,
      projectedAnnualYieldPct: Number(property.projectedAnnualYieldPct),
    }));

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Properties</h1>
        <p className="text-muted-foreground">
          Discover investment opportunities in premium properties
        </p>
      </div>

      <PropertiesCatalog
        properties={serializedProperties}
        cities={cities}
        types={types}
        currentFilters={{
          city: params.city,
          type: params.type,
          minInvestment: params.minInvestment,
          status: params.status,
          sort: params.sort,
        }}
      />
    </div>
  );
  } catch (error) {
    console.error("Dashboard properties page error:", error);
    handleDatabaseError(error, "/dashboard");
  }
}

