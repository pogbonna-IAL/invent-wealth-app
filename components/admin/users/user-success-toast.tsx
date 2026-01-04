"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function UserSuccessToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    
    if (success === "user_created") {
      toast.success("User created successfully!");
      // Clean up the URL by removing the query parameter
      router.replace("/admin/users", { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}

