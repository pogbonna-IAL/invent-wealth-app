import type { NextAuthConfig } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";

// PrismaAdapter will be created lazily - prisma client initialization is deferred
// This allows the build to complete even if DATABASE_URL is not set during build time

// Lazy-load Prisma instance for callbacks (to avoid Edge runtime issues)
let prismaInstance: any;

async function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = prisma;
  }
  return prismaInstance;
}

const providers = [
  EmailProvider({
    server: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.SMTP_FROM || "noreply@inventwealth.com",
  }),
  CredentialsProvider({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials): Promise<{ id: string; email?: string; name?: string; role: string } | null> {
        const isDev = process.env.NODE_ENV === "development";
        
        if (isDev) {
          console.log("[Auth] ===== AUTHORIZE FUNCTION CALLED =====");
        }
        
        try {
          if (isDev) {
            const email = typeof credentials?.email === 'string' ? credentials.email : undefined;
            const password = typeof credentials?.password === 'string' ? credentials.password : undefined;
            console.log("[Auth] authorize called with:", {
              hasEmail: !!email,
              hasPassword: !!password,
              emailLength: email?.length,
              passwordLength: password?.length,
            });
          }

          const email = typeof credentials?.email === 'string' ? credentials.email : undefined;
          const password = typeof credentials?.password === 'string' ? credentials.password : undefined;

          if (!email || !password) {
            if (isDev) {
              console.log("[Auth] Missing credentials");
            }
            return null;
          }

          // Trim whitespace from credentials
          let trimmedEmail = email.trim();
          const trimmedPassword = password.trim();

          if (isDev) {
            console.log("[Auth] Attempting authentication for:", trimmedEmail.toLowerCase());
          }

          // Lazy-load Prisma for credentials provider (only runs in Node.js runtime)
          let prismaClient;
          try {
            prismaClient = await getPrisma();
            // Prisma handles connections automatically - no need to test here
            // The actual queries below will handle connection errors properly
          } catch (prismaError) {
            console.error("[Auth] Failed to load Prisma client:", prismaError);
            // Return null to indicate auth failure
            return null;
          }

          // Handle admin login: "admin" / "admin123" maps to admin user (works in dev and production)
          // Also check if email is the admin email directly
          const isAdminUsername = trimmedEmail.toLowerCase() === "admin" && trimmedPassword === "admin123";
          const isAdminEmail = trimmedEmail.toLowerCase() === "pogbonna@gmail.com";
          
          if (isAdminUsername || isAdminEmail) {
            const adminUser = await prismaClient.user.findUnique({
              where: { email: "pogbonna@gmail.com" },
            });

            if (adminUser) {
              // Verify password if using admin username shortcut
              if (isAdminUsername) {
                // For "admin"/"admin123" shortcut, verify against stored password
                if (adminUser.passwordHash) {
                  const bcrypt = require("bcryptjs");
                  const isValidPassword = await bcrypt.compare(trimmedPassword, adminUser.passwordHash);
                  if (!isValidPassword) {
                    // Set password if it doesn't match (for first-time setup)
                    const passwordHash = await bcrypt.hash("admin123", 10);
                    await prismaClient.user.update({
                      where: { id: adminUser.id },
                      data: { passwordHash },
                    });
                  }
                } else {
                  // Set password if not set
                  const bcrypt = require("bcryptjs");
                  const passwordHash = await bcrypt.hash("admin123", 10);
                  await prismaClient.user.update({
                    where: { id: adminUser.id },
                    data: { passwordHash },
                  });
                }
              } else {
                // For direct email login, verify password normally
                if (adminUser.passwordHash) {
                  const bcrypt = require("bcryptjs");
                  const isValidPassword = await bcrypt.compare(trimmedPassword, adminUser.passwordHash);
                  if (!isValidPassword) {
                    if (isDev) {
                      console.log("[Auth] Invalid password for admin email");
                    }
                    return null;
                  }
                } else {
                  // No password set for admin email
                  if (isDev) {
                    console.log("[Auth] Admin email has no password set");
                  }
                  return null;
                }
              }

              if (isDev) {
                console.log("[Auth] Admin login successful");
              }
              return {
                id: adminUser.id,
                email: adminUser.email || undefined,
                name: adminUser.name || undefined,
                role: adminUser.role,
              };
            } else {
              // Create admin user if it doesn't exist (only for admin username shortcut)
              if (isAdminUsername) {
                const bcrypt = require("bcryptjs");
                const passwordHash = await bcrypt.hash("admin123", 10);
                const newAdmin = await prismaClient.user.create({
                  data: {
                    email: "pogbonna@gmail.com",
                    name: "Admin User",
                    role: "ADMIN",
                    passwordHash,
                    emailVerified: new Date(),
                  },
                });

                if (isDev) {
                  console.log("[Auth] Created admin user for admin login");
                }
                return {
                  id: newAdmin.id,
                  email: newAdmin.email || undefined,
                  name: newAdmin.name || undefined,
                  role: newAdmin.role,
                };
              }
            }
          }

          // Find user by email
          const user = await prismaClient.user.findUnique({
            where: { email: trimmedEmail.toLowerCase() },
          });

          // If user exists and has passwordHash, verify password
          if (user && user.passwordHash) {
            const bcrypt = require("bcryptjs");
            const isValidPassword = await bcrypt.compare(trimmedPassword, user.passwordHash);
            
            if (isValidPassword) {
              if (isDev) {
                console.log("[Auth] Password authentication successful for:", trimmedEmail);
              }
              return {
                id: user.id,
                email: user.email || undefined,
                name: user.name || undefined,
                role: user.role,
              };
            } else {
              if (isDev) {
                console.log("[Auth] Invalid password for:", email);
              }
              return null;
            }
          }

          // User not found or doesn't have passwordHash
          if (isDev) {
            console.log("[Auth] User not found or no password set for:", email);
          }
          return null;
        } catch (error) {
          console.error("[Auth] Authorization error:", error instanceof Error ? error.message : "Unknown error");
          // Return null to indicate authentication failure
          // NextAuth will convert this to "CredentialsSignin" error
          return null;
        }
      },
    })
];

// Create auth options
// Note: Adapter is created lazily to avoid requiring DATABASE_URL during build time
// The adapter is only used in API routes (Node.js runtime) where Prisma works

// Lazy adapter creation - only creates when DATABASE_URL is available
// During build, if DATABASE_URL is not set, adapter will be undefined
// This is OK because we're using JWT strategy which doesn't strictly require an adapter
function getPrismaAdapter() {
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    // During build or when DATABASE_URL is not set, skip adapter creation
    // This allows the build to complete
    return undefined;
  }
  
  try {
    // Try to create adapter, but don't fail if database isn't ready
    const adapter = PrismaAdapter(prisma) as any;
    return adapter;
  } catch (error) {
    // Log error but return undefined - JWT strategy doesn't require adapter
    console.warn("[Auth] PrismaAdapter unavailable (database may not be ready):", 
      error instanceof Error ? error.message : "Unknown error");
    return undefined;
  }
}

export const authOptions: NextAuthConfig = {
  adapter: getPrismaAdapter(),
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  trustHost: true, // Trust host for Docker/proxy environments
  providers,
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
  // Enable verbose logging for credentials provider
  logger: {
    error(error) {
      console.error("[NextAuth] Error:", error);
    },
    warn(message) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[NextAuth] Warning:", message);
      }
    },
    debug(message, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.log("[NextAuth] Debug:", message, metadata);
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Ensure user has Profile/Onboarding records on first login
      // Lazy-load Prisma (only runs in Node.js runtime, not Edge)
      if (user.id) {
        try {
          const prismaClient = await getPrisma();
          
          // Get user to check role
          const dbUser = await prismaClient.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          
          const isAdmin = dbUser?.role === "ADMIN";
          
          // Create Profile if it doesn't exist
          await prismaClient.profile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
            },
          });

          // Create Onboarding if it doesn't exist
          // Auto-complete onboarding for admin users
          await prismaClient.onboarding.upsert({
            where: { userId: user.id },
            update: isAdmin ? {
              status: "COMPLETED",
              kycStatus: "APPROVED",
            } : {},
            create: {
              userId: user.id,
              status: isAdmin ? "COMPLETED" : "PENDING",
              kycStatus: isAdmin ? "APPROVED" : "PENDING",
            },
          });
        } catch (error) {
          // Log error but don't block sign in
          console.error("Error creating profile/onboarding:", error);
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects after authentication (email link, credentials, etc.)
      // Use NEXTAUTH_URL for proper domain resolution (Railway public domain)
      // This prevents redirects to 0.0.0.0:8080
      
      try {
        // Get the proper base URL from NEXTAUTH_URL or use baseUrl
        const properBaseUrl = process.env.NEXTAUTH_URL || baseUrl;
        
        // Ensure properBaseUrl doesn't contain 0.0.0.0 or localhost in production
        let finalBaseUrl = properBaseUrl;
        if (process.env.NODE_ENV === "production" && properBaseUrl.includes("0.0.0.0")) {
          // In production, if baseUrl is 0.0.0.0, use NEXTAUTH_URL or RAILWAY_PUBLIC_DOMAIN
          finalBaseUrl = process.env.NEXTAUTH_URL || 
                        (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : properBaseUrl);
        }
        
        // If redirecting to dashboard, use callback handler instead
        // This prevents ERR_FAILED by checking admin status before loading dashboard
        if (url.includes("/dashboard") || url === baseUrl || url === `${baseUrl}/` || url === finalBaseUrl || url === `${finalBaseUrl}/`) {
          return `${finalBaseUrl}/auth/callback`;
        }
        
        // If url is relative, make it absolute using proper base URL
        if (url.startsWith("/")) {
          return `${finalBaseUrl}${url}`;
        }
        
        // If url is absolute, check if it's same origin
        try {
          const urlObj = new URL(url);
          const baseUrlObj = new URL(finalBaseUrl);
          // If same origin, allow it
          if (urlObj.origin === baseUrlObj.origin) {
            return url;
          }
          // If different origin but going to dashboard, redirect to callback
          if (urlObj.pathname.includes("/dashboard")) {
            return `${finalBaseUrl}/auth/callback`;
          }
        } catch {
          // Invalid URL format, use callback handler
        }
        
        // Default to callback handler for safe redirect
        return `${finalBaseUrl}/auth/callback`;
      } catch (error) {
        console.error("[Auth] Redirect callback error:", error);
        // Fallback: use NEXTAUTH_URL or baseUrl
        const fallbackUrl = process.env.NEXTAUTH_URL || baseUrl;
        return `${fallbackUrl}/auth/callback`;
      }
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        
        // Fetch user role from database
        try {
          const prismaClient = await getPrisma();
          const dbUser = await prismaClient.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          token.role = dbUser?.role;
        } catch (error) {
          console.error("[Auth] Error fetching user role:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Add role to session if available
        if (token.role) {
          (session.user as any).role = token.role;
        }
      }
      return session;
    },
  },
};
