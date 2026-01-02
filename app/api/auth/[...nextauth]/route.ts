import { handlers } from "@/server/auth";
import { NextRequest } from "next/server";

// Handle HEAD requests from email clients (Outlook SafeLinks, etc.)
// These requests can consume magic links if not handled properly
export async function HEAD(request: NextRequest) {
  // Return 200 OK for HEAD requests to prevent magic link consumption
  // Email clients use HEAD to preview links, but we don't want to consume the token
  return new Response(null, { status: 200 });
}

export const { GET, POST } = handlers;

