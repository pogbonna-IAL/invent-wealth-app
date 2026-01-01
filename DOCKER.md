# Docker Setup Guide

This guide explains how to run InventWealth using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- `.env` file configured (copy from `.env.example`)

## Quick Start

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
```

**Required environment variables:**
- `DATABASE_URL`: Will be set automatically from docker-compose (or override if using external DB)
- `NEXTAUTH_URL`: Your application URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: SMTP configuration for email

**Optional environment variables:**
- `POSTGRES_USER`: PostgreSQL username (default: `postgres`)
- `POSTGRES_PASSWORD`: PostgreSQL password (default: `postgres`)
- `POSTGRES_DB`: Database name (default: `inventwealth`)
- `POSTGRES_PORT`: PostgreSQL port mapping (default: `5432`)
- `APP_PORT`: Application port mapping (default: `3000`)
- `SEED_DATABASE`: Set to `true` to seed database on startup (default: `false`)

### 2. Build and Start Services (Production)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 3. Run Database Migrations

Migrations are **not** automatically run on container startup. Run them manually:

```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# (Optional) Seed database with sample data
docker-compose exec app npx prisma db seed
```

### 4. Access the Application

- **Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Database**: `localhost:5432` (if port is exposed)

## Development Mode

For local development with hot reload:

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Note:** Development mode mounts your source code as a volume for hot reload. Changes to your code will automatically reload the Next.js dev server.

## Docker Commands Reference

### Service Management

```bash
# Start services (production)
docker-compose up -d

# Start services (development)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache
```

### Database Operations

```bash
# Open Prisma Studio (database GUI)
docker-compose exec app npx prisma studio

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Create a new migration (development)
docker-compose exec app npx prisma migrate dev --name migration-name

# Reset database (⚠️ deletes all data, development only)
docker-compose exec app npx prisma migrate reset

# Seed database
docker-compose exec app npx prisma db seed

# Generate Prisma Client
docker-compose exec app npx prisma generate
```

### Application Commands

```bash
# Execute any command in app container
docker-compose exec app <command>

# Example: Check Node.js version
docker-compose exec app node --version

# Example: Install a new package
docker-compose exec app npm install <package-name>
```

## Dockerfile Overview

The Dockerfile uses a **multi-stage build** process:

1. **deps stage**: Installs npm dependencies
2. **builder stage**: Generates Prisma Client and builds Next.js application
3. **runner stage**: Creates minimal production image with only necessary files

**Key Features:**
- Uses Node.js 20 Alpine for smaller image size
- Implements multi-stage builds for optimization
- Generates Prisma Client during build
- Uses Next.js standalone output mode
- Runs as non-root user for security
- Final image size: ~200-300MB (vs ~1GB+ without optimization)

## Troubleshooting

### Build Fails

**Issue**: Build fails with dependency errors
```bash
# Solution: Rebuild without cache
docker-compose build --no-cache
```

**Issue**: Prisma Client generation fails
```bash
# Solution: Ensure Prisma schema is valid
docker-compose exec app npx prisma validate
```

### Database Connection Issues

**Issue**: Application can't connect to database
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in app container
docker-compose exec app env | grep DATABASE_URL
```

### Port Already in Use

**Issue**: Port 3000 or 5432 already in use
```bash
# Solution: Change ports in docker-compose.yml or .env
# Set APP_PORT=3001 or POSTGRES_PORT=5433
```

### Container Won't Start

**Issue**: Container exits immediately
```bash
# Check logs for errors
docker-compose logs app

# Check health status
docker-compose ps

# Try starting without detached mode to see errors
docker-compose up
```

### Permission Issues

**Issue**: Permission denied errors
```bash
# Solution: Ensure Docker has proper permissions
# On Linux: Add user to docker group
sudo usermod -aG docker $USER
```

## Production Deployment

### Building for Production

```bash
# Build production image
docker build -t invent-wealth:latest .

# Tag for registry
docker tag invent-wealth:latest your-registry/invent-wealth:latest

# Push to registry
docker push your-registry/invent-wealth:latest
```

### Environment Variables in Production

Ensure these are set in your production environment:

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your production URL
- `NEXTAUTH_SECRET`: Strong secret key
- `SMTP_*`: SMTP configuration

**Optional:**
- `NODE_ENV`: Set to `production`
- `NEXT_TELEMETRY_DISABLED`: Set to `1`

### Running in Production

```bash
# Using docker-compose
docker-compose -f docker-compose.yml up -d

# Or using docker run
docker run -d \
  --name invent-wealth \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  -e NEXTAUTH_SECRET="..." \
  invent-wealth:latest
```

## Health Checks

The application includes health check endpoints:

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "database": "connected"
# }
```

Docker Compose health checks ensure services are ready before starting dependent services.

## Data Persistence

Database data is persisted in Docker volumes:

- **Production**: `postgres_data` volume
- **Development**: `postgres_data_dev` volume

To backup database:

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres inventwealth > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres inventwealth < backup.sql
```

## Cleanup

```bash
# Remove containers and networks
docker-compose down

# Remove containers, networks, and volumes (⚠️ deletes data)
docker-compose down -v

# Remove images
docker rmi invent-wealth

# Remove all unused Docker resources
docker system prune -a
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

