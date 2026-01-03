import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

/**
 * Database error types
 */
export enum DatabaseErrorType {
  CONNECTION = "CONNECTION",
  TIMEOUT = "TIMEOUT",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION = "VALIDATION",
  UNKNOWN = "UNKNOWN",
}

/**
 * Database error handler result
 */
export interface DatabaseErrorResult {
  type: DatabaseErrorType;
  message: string;
  shouldRedirect: boolean;
  redirectPath?: string;
}

/**
 * Analyze database error and return appropriate handling strategy
 */
export function analyzeDatabaseError(error: unknown): DatabaseErrorResult {
  // Connection errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1001"
  ) {
    return {
      type: DatabaseErrorType.CONNECTION,
      message: "Unable to connect to the database. Please try again later.",
      shouldRedirect: true,
      redirectPath: "/",
    };
  }

  // Timeout errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P1008" || error.code === "P1017")
  ) {
    return {
      type: DatabaseErrorType.TIMEOUT,
      message: "Database operation timed out. Please try again.",
      shouldRedirect: true,
      redirectPath: "/",
    };
  }

  // Not found errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return {
      type: DatabaseErrorType.NOT_FOUND,
      message: "The requested resource was not found.",
      shouldRedirect: false,
    };
  }

  // Validation errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2003")
  ) {
    return {
      type: DatabaseErrorType.VALIDATION,
      message: error.message || "Validation error occurred.",
      shouldRedirect: false,
    };
  }

  // Generic Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      type: DatabaseErrorType.UNKNOWN,
      message: `Database error: ${error.message}`,
      shouldRedirect: true,
      redirectPath: "/",
    };
  }

  // Network/connection errors
  if (
    error instanceof Error &&
    (error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("Can't reach database"))
  ) {
    return {
      type: DatabaseErrorType.CONNECTION,
      message: "Database connection failed. Please try again later.",
      shouldRedirect: true,
      redirectPath: "/",
    };
  }

  // Generic error
  return {
    type: DatabaseErrorType.UNKNOWN,
    message:
      error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.",
    shouldRedirect: true,
    redirectPath: "/",
  };
}

/**
 * Handle database error with redirect if needed
 * Use this in server components
 */
export function handleDatabaseError(
  error: unknown,
  fallbackPath: string = "/"
): never {
  const errorInfo = analyzeDatabaseError(error);
  console.error("Database error:", error);
  console.error("Error type:", errorInfo.type);
  console.error("Error message:", errorInfo.message);

  if (errorInfo.shouldRedirect) {
    const redirectPath = errorInfo.redirectPath || fallbackPath;
    redirect(`${redirectPath}?error=${encodeURIComponent(errorInfo.message)}`);
  }

  // If no redirect, throw the error with a user-friendly message
  throw new Error(errorInfo.message);
}

/**
 * Handle database error and return error response
 * Use this in API routes
 */
export function handleDatabaseErrorResponse(
  error: unknown,
  fallbackPath: string = "/"
): Response {
  const errorInfo = analyzeDatabaseError(error);
  console.error("Database error:", error);
  console.error("Error type:", errorInfo.type);
  console.error("Error message:", errorInfo.message);

  return Response.json(
    {
      error: errorInfo.message,
      type: errorInfo.type,
    },
    { status: errorInfo.type === DatabaseErrorType.NOT_FOUND ? 404 : 500 }
  );
}

/**
 * Wrap database operation with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  fallbackPath: string = "/"
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, fallbackPath);
  }
}

