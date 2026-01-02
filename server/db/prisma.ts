import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPromise: Promise<PrismaClient> | undefined;
};

/**
 * Prisma Client instance
 * Uses singleton pattern to prevent multiple instances in development
 * 
 * Prisma 6.x reads DATABASE_URL directly from environment variables.
 * This code prioritizes DATABASE_PUBLIC_URL (for Railway) over DATABASE_URL.
 * 
 * This uses lazy initialization to avoid requiring DATABASE_URL during build time.
 */

// Set DATABASE_URL early if DATABASE_PUBLIC_URL is available
// This ensures Prisma uses the correct URL from the start
if (process.env.DATABASE_PUBLIC_URL) {
  const publicUrl = process.env.DATABASE_PUBLIC_URL.trim();
  if (publicUrl && publicUrl.length > 0 && 
      publicUrl !== 'undefined' && 
      !publicUrl.includes('undefined') &&
      (publicUrl.startsWith('postgresql://') || publicUrl.startsWith('postgres://'))) {
    // Override DATABASE_URL with public URL for Railway deployments
    process.env.DATABASE_URL = publicUrl;
  }
}

function getDatabaseUrl(): string {
  // Priority 1: Use Railway public TCP proxy connection (for Railway deployments)
  if (process.env.DATABASE_PUBLIC_URL) {
    const url = process.env.DATABASE_PUBLIC_URL.trim();
    if (url && url.length > 0 && url !== 'undefined' && !url.includes('undefined')) {
      // Validate URL format
      if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
        return url;
      }
    }
  }
  
  // Priority 2: Fall back to standard DATABASE_URL
  const url = process.env.DATABASE_URL;
  if (!url) {
    const errorMessage = [
      "DATABASE_URL or DATABASE_PUBLIC_URL environment variable is not set.",
      "",
      "To fix this:",
      "1. Create a .env file in the project root (copy from .env.example if available)",
      "2. Set DATABASE_URL with your PostgreSQL connection string",
      "   Example: DATABASE_URL=postgresql://user:password@localhost:5432/dbname",
      "",
      "For Railway deployments, set DATABASE_PUBLIC_URL for public TCP proxy connection.",
      "",
      "See README.md for more setup instructions.",
    ].join("\n");
    throw new Error(errorMessage);
  }
  return url;
}

// Lazy initialization - only create connection when actually needed
function createPrismaClient(): PrismaClient {
  // Get the database URL (prioritizes DATABASE_PUBLIC_URL for Railway)
  let databaseUrl = getDatabaseUrl();
  
  // Add connection pool parameters to prevent connection exhaustion
  // Railway PostgreSQL has connection limits, so we need to manage the pool carefully
  try {
    const url = new URL(databaseUrl);
    
    // Set connection pool parameters (only if not already set)
    // connection_limit: Maximum number of connections in the pool (Railway free tier allows ~20)
    // pool_timeout: Timeout in seconds for getting a connection from the pool
    // connect_timeout: Timeout in seconds for establishing a connection
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "10");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "10");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    
    // Ensure SSL is required (Railway requires SSL)
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    
    databaseUrl = url.toString();
  } catch (error) {
    // If URL parsing fails, log and use original URL
    console.error("Failed to parse database URL for connection pool configuration:", error);
    // Still ensure SSL mode is set if missing
    if (!databaseUrl.includes("sslmode=")) {
      databaseUrl += (databaseUrl.includes("?") ? "&" : "?") + "sslmode=require";
    }
  }
  
  // Set DATABASE_URL for Prisma (Prisma 6.x reads from environment)
  // This ensures Prisma uses the correct URL
  process.env.DATABASE_URL = databaseUrl;

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Lazy getter - only initializes when accessed
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Check if we're in a build context
  // During build, Next.js might try to analyze code without DATABASE_URL
  const isBuildTime = 
    process.env.NEXT_PHASE === "phase-production-build" ||
    (process.env.NODE_ENV === "production" && process.argv.includes("build")) ||
    process.env.NEXT_BUILD === "true";

  // During build without DATABASE_URL, defer initialization
  // This allows the build to complete but will fail at runtime if DATABASE_URL is missing
  if (isBuildTime && !process.env.DATABASE_URL) {
    // Return a proxy that defers the error until actual use
    // PrismaAdapter might access properties during initialization, so we need to handle that
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        // Allow some properties that might be checked during build/adapter initialization
        if (
          prop === "then" || 
          prop === "constructor" || 
          typeof prop === "symbol" ||
          prop === "toString" ||
          prop === "valueOf"
        ) {
          return undefined;
        }
        
        // For PrismaAdapter, it might access model names or other metadata
        // Return a no-op function or empty object to allow adapter creation
        if (typeof prop === "string" && prop.startsWith("$")) {
          // Prisma internal methods like $connect, $disconnect, etc.
          return () => Promise.resolve();
        }
        
        // Return a proxy for model access (e.g., prisma.user, prisma.property)
        // This allows PrismaAdapter to inspect the schema without connecting
        return new Proxy({}, {
          get() {
            // Return another proxy for model methods
            return new Proxy(() => {}, {
              apply() {
                // If actually called at runtime, check DATABASE_URL
                if (!process.env.DATABASE_URL) {
                  const errorMessage = [
                    "DATABASE_URL environment variable is not set.",
                    "",
                    "To fix this:",
                    "1. Create a .env file in the project root",
                    "2. Set DATABASE_URL with your PostgreSQL connection string",
                    "   Example: DATABASE_URL=postgresql://user:password@localhost:5432/dbname",
                    "",
                    "For local development with Docker:",
                    "   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventwealth",
                    "",
                    "See README.md for more setup instructions.",
                  ].join("\n");
                  throw new Error(errorMessage);
                }
                // If DATABASE_URL is now available, create the client
                const client = createPrismaClient();
                if (process.env.NODE_ENV !== "production") {
                  globalForPrisma.prisma = client;
                }
                // This won't work perfectly, but it's better than failing the build
                throw new Error("Prisma client accessed during build. Please set DATABASE_URL before building.");
              },
            });
          },
        });
      },
    });
  }

  const client = createPrismaClient();
  
  // Cache the client in both development and production to prevent multiple instances
  // This is critical for connection pool management
  globalForPrisma.prisma = client;
  
  return client;
}

// Export - initialization happens lazily on first access
export const prisma = getPrismaClient();

