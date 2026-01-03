import { PropertyService } from "@/server/services/property.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Edit, Eye, FileText } from "lucide-react";
import { formatCurrencyNGN } from "@/lib/utils/currency";
import { prisma } from "@/server/db/prisma";
import { Property } from "@prisma/client";
import { DeletePropertyButton } from "@/components/admin/properties/delete-property-button";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  let properties: Property[] = [];
  let propertiesWithAvailableShares: (Property & { availableShares: number })[] = [];

  try {
    properties = await PropertyService.getProperties();
    
    // Calculate availableShares dynamically for each property
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
  } catch (error) {
    console.error("Admin properties page error:", error);
    // Return empty array if there's an error fetching properties
    properties = [];
    propertiesWithAvailableShares = [];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Properties</h1>
          <p className="text-muted-foreground">
            Manage property listings and details
          </p>
        </div>
        <Link href="/admin/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Property
          </Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No properties found.</p>
            <Link href="/admin/properties/new">
              <Button>Create First Property</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Location</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Shares</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Price/Share</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {propertiesWithAvailableShares.map((property) => (
                <tr key={property.id} className="border-b">
                  <td className="p-4">
                    <Link
                      href={`/admin/properties/${property.id}`}
                      className="hover:text-[#253E8D] transition-colors"
                    >
                      <div>
                        <p className="font-semibold">{property.name}</p>
                        <p className="text-sm text-muted-foreground">{property.propertyType}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">{property.city}, {property.country}</p>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        property.status === "OPEN"
                          ? "default"
                          : property.status === "FUNDED"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {property.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">
                      {(property.availableShares ?? property.totalShares).toLocaleString()} / {property.totalShares.toLocaleString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold">
                      {formatCurrencyNGN(Number(property.pricePerShare) || 0, "NGN")}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/properties/${property.id}`}>
                        <Button variant="ghost" size="sm" title="View Details">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/properties/${property.id}/edit`}>
                        <Button variant="ghost" size="sm" title="Edit Property">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/properties/${property.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" title="View Public Page">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeletePropertyButton
                        propertyId={property.id}
                        propertyName={property.name}
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

