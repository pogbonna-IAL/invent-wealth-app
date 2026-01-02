import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL && !process.env.DATABASE_PUBLIC_URL) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          database: "not_configured",
          error: "DATABASE_URL or DATABASE_PUBLIC_URL environment variable is not set",
        },
        { status: 503 }
      );
    }

    // Check database connection with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection timeout")), 5000)
    );
    
    const dbCheckPromise = prisma.$queryRaw`SELECT 1`;
    await Promise.race([dbCheckPromise, timeoutPromise]);
    
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    // Don't crash - return unhealthy status instead
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

