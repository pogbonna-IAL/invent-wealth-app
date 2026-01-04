"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function PropertySuccessToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    
    if (success === "property_created") {
      toast.success("Property created successfully!");
      // Clean up the URL by removing the query parameter
      router.replace("/admin/properties", { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}

