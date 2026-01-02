"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function SignupSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const signup = searchParams.get("signup");
    const emailParam = searchParams.get("email");
    
    if (signup === "success" && emailParam) {
      setIsVisible(true);
      setEmail(emailParam);
      
      // Remove query parameters from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("signup");
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  if (!isVisible || !email) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-4">
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <AlertTitle className="text-green-800 dark:text-green-200 font-semibold mb-1">
                Account Created Successfully! 🎉
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your account has been created with email <strong>{email}</strong>. 
                Please sign in to access your dashboard and start investing.
              </AlertDescription>
              <div className="mt-4">
                <Link href="/auth/signin">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Sign In Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}

