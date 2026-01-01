import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized production builds
  output: "standalone",
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Mobile optimization settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    // Optimize for mobile-first approach
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  
  // Include Prisma client files in the build output
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/client/**/*"],
    "/*": ["./node_modules/.prisma/client/**/*"],
  },
  
  // Generate stable build ID for Server Actions compatibility
  // Server Actions require consistent build IDs across deployments
  generateBuildId: async () => {
    // Use BUILD_ID if explicitly provided (for CI/CD with stable IDs)
    if (process.env.BUILD_ID) {
      return process.env.BUILD_ID;
    }
    
    // Use Railway deployment ID if available (stable per deployment)
    if (process.env.RAILWAY_DEPLOYMENT_ID) {
      return process.env.RAILWAY_DEPLOYMENT_ID;
    }
    
    // Use Railway git commit SHA if available
    if (process.env.RAILWAY_GIT_COMMIT_SHA) {
      return process.env.RAILWAY_GIT_COMMIT_SHA.substring(0, 12); // Use first 12 chars
    }
    
    // Use git commit SHA if available (stable per commit)
    try {
      const { execSync } = require('child_process');
      const gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      if (gitSha) {
        return gitSha;
      }
    } catch {
      // Git not available or not in a git repo - fall through
    }
    
    // Fallback: Generate a stable build ID based on package.json version and timestamp
    // This ensures Server Actions work correctly within the same deployment
    // Note: For production, set BUILD_ID or ensure git is available for stable IDs
    const packageJson = require('./package.json');
    const version = packageJson.version || '0.1.0';
    return `build-${version}-${Date.now()}`;
  },
  
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
