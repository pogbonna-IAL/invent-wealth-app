# Multi-stage Dockerfile for InventWealth Next.js Application
# Uses Node.js 20 Alpine for smaller image size

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install libc6-compat for compatibility with some npm packages
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
# Using npm ci for faster, reliable, reproducible builds
RUN npm ci --no-audit

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Set build-time environment variables (optional)
# DATABASE_URL is not required at build time for Prisma Client generation
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Generate Prisma Client
# This works without DATABASE_URL as Prisma Client generation doesn't need a connection
RUN npx prisma generate

# Build Next.js application
# This creates the standalone output in .next/standalone
RUN npm run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Standalone output includes server.js in the root of .next/standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime migrations (optional)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use standalone server (server.js is in the root of standalone output)
CMD ["node", "server.js"]

