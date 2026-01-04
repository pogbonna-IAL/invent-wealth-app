# InventWealth - Fractional Property Ownership Platform

A production-grade, open-source web application for fractional property ownership investment that distributes shortlet rental income to fractional owners.

**Status**: ✅ Fully functional with comprehensive seed data. Ready for local development and testing.

**Latest Updates** (January 2025):
- ✅ Comprehensive error handling with centralized utilities
- ✅ Toast notifications for consistent user feedback
- ✅ Property file uploads (images, videos, gallery)
- ✅ Property deletion capability in admin portal
- ✅ Full TypeScript type safety improvements
- ✅ Database error handling with graceful fallbacks
- ✅ Dynamic available shares calculation

## Features

- **Fractional Ownership**: Invest in premium properties by purchasing shares
- **Income Distribution**: Receive monthly distributions from shortlet rental income proportional to your share ownership
- **Investor Dashboard**: Track your portfolio, investments, income, and property performance with interactive charts
- **Property Management**: Browse available properties, view income statements, and access documents
- **Admin Portal**: Comprehensive admin interface for managing properties, users, investments, distributions, and statements
- **Authentication**: Secure email magic link authentication via NextAuth with optional password-based login in development
- **Toast Notifications**: User-friendly success/error feedback using Sonner toast notifications
- **Error Handling**: Comprehensive error handling with graceful fallbacks and user-friendly messages
- **File Uploads**: Support for property images, videos, and gallery uploads
- **Push Notifications**: Real-time browser push notifications for distribution updates (optional)
- **Type Safety**: Full TypeScript coverage with strict type checking

## Tech Stack

- **Framework**: Next.js 16.1.0 (App Router) + TypeScript
- **Runtime**: Node.js 20.9.0+ (required)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Database**: PostgreSQL 17+ + Prisma ORM 6.x
- **Authentication**: NextAuth.js v5 (Auth.js) with email magic links
- **Validation**: Zod + React Hook Form
- **Charts**: Recharts
- **Notifications**: Sonner (toast notifications)
- **Testing**: Playwright
- **Error Handling**: Custom database error handler utilities

## Prerequisites

- **Node.js 20.9.0+** and npm 10.0.0+ (required for Next.js 16.1.0)
- PostgreSQL 17+
- SMTP server for email (for authentication)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd invent-wealth
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

**Required environment variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Your application URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET`: Secret key for NextAuth (generate with `openssl rand -base64 32`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: SMTP configuration for email

**Optional environment variables:**
- `SMTP_FROM`: From email address (defaults to `noreply@inventwealth.com`)
- `NEXT_PUBLIC_APP_URL`: Public URL for email links (defaults to `NEXTAUTH_URL`)
- `UNDER_WRITER_EMAIL`: System user email for unsold shares (defaults to `under_writer@system.inventwealth.com`)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: Push notification configuration (see [Push Notifications](#push-notifications))
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Public VAPID key exposed to client (should match `VAPID_PUBLIC_KEY`)

For a complete list of all environment variables, see the `.env.example` file.

### Push Notifications (Optional)

The application supports push notifications for real-time updates. To enable push notifications:

1. **Generate VAPID keys:**
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```

2. **Add the keys to your `.env` file:**
   ```bash
   VAPID_PUBLIC_KEY=<your-public-key>
   VAPID_PRIVATE_KEY=<your-private-key>
   VAPID_SUBJECT=mailto:admin@inventwealth.com
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-VAPID_PUBLIC_KEY>
   ```

3. **Enable notifications in user settings:**
   - Users can enable push notifications from Settings → Notifications
   - Notifications are automatically sent for:
     - New distribution declarations
     - Payout status updates (when marked as PAID)

**Note:** Push notifications are optional. The application will work without them, but users won't receive real-time updates.

### Development Login Credentials

In development mode (`NODE_ENV=development`), you can use the following credentials to log in:

**Admin Login:**
- **Email/Username:** `admin`
- **Password:** `admin123`
- **Role:** ADMIN (full access to admin panel)
- **Email:** `pogbonna@gmail.com`

**Regular User Login:**
- Any email/password combination will work in dev mode
- Creates a new INVESTOR user if the email doesn't exist
- Example: `test@example.com` / `password123`

The dev login tab will automatically appear on the sign-in page when running in development mode. The admin user is automatically created on first login with admin/admin123 credentials.

### 4. Setup database

```bash
# Generate Prisma Client (required before first run)
npx prisma generate

# Run migrations (creates database schema)
npx prisma migrate dev

# (Optional) Seed database with sample data
# This will create test users, properties, and the admin user (pogbonna@gmail.com)
npx prisma db seed
```

**Note:** Prisma Client must be generated before running the application. The build script (`npm run build`) automatically runs `npx prisma generate`, but for development you need to run it manually after cloning.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture Overview

InventWealth is built using Next.js 16 with the App Router, following a modern full-stack architecture pattern:

### Frontend Architecture

- **Next.js App Router**: File-based routing with Server Components by default
- **React Server Components**: Most pages are server-rendered for optimal performance
- **Client Components**: Used only when interactivity is needed (forms, charts, modals)
- **TypeScript**: Full type safety across the application
- **Tailwind CSS + shadcn/ui**: Utility-first styling with accessible component library

### Backend Architecture

- **Server Actions**: Next.js Server Actions for form submissions and mutations (`app/actions/`)
- **API Routes**: RESTful API endpoints for client-side interactions (`app/api/`)
- **Service Layer**: Business logic separated into service classes (`server/services/`)
- **Database Layer**: Prisma ORM for type-safe database access (`server/db/`)

### Authentication & Authorization

- **NextAuth.js (Auth.js)**: Email magic link authentication
- **Edge-Compatible Auth**: Separate auth config for Edge runtime (`server/auth/edge.ts`)
- **Role-Based Access Control**: User roles (INVESTOR, ADMIN) enforced via middleware
- **Session Management**: JWT-based sessions with database persistence

### Data Flow

1. **User Request** → Next.js Route Handler or Server Component
2. **Authentication Check** → `proxy.ts` middleware validates session
3. **Authorization** → Service layer checks user permissions
4. **Business Logic** → Service classes handle domain logic
5. **Database Access** → Prisma Client executes queries
6. **Response** → Server Component renders or API returns JSON

### Key Design Patterns

- **Service Layer Pattern**: Business logic encapsulated in service classes (`server/services/`)
- **Repository Pattern**: Prisma abstracts database access
- **Content Management**: Marketing content loaded from JSON files (`content/`)
- **Type Safety**: End-to-end TypeScript with Prisma-generated types and strict type checking
- **Error Handling Pattern**: Centralized error handling utilities (`lib/utils/db-error-handler.ts`) for consistent error management
- **Toast Notification Pattern**: Consistent user feedback using Sonner toast notifications across all forms

### Security

- **CSRF Protection**: Built into Next.js Server Actions
- **SQL Injection Prevention**: Prisma parameterized queries
- **XSS Protection**: React's built-in escaping
- **Authentication**: Secure session management via NextAuth
- **Authorization**: Role-based access control at route and service level
- **Error Handling**: Comprehensive try-catch blocks prevent crashes and provide graceful error recovery
- **Input Validation**: Zod schema validation on all user inputs
- **Type Safety**: TypeScript strict mode prevents runtime type errors

## Project Structure

```
invent-wealth/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (REST endpoints)
│   ├── actions/           # Server Actions (form mutations)
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Investor dashboard
│   ├── admin/             # Admin portal (role-protected)
│   ├── properties/        # Property listing and details
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication components
│   ├── investment/       # Investment-related components
│   └── layout/           # Layout components
├── server/               # Server-side code
│   ├── auth/            # NextAuth configuration
│   │   ├── config.ts    # Main auth config (Node.js runtime)
│   │   └── edge.ts      # Edge-compatible auth (for proxy.ts)
│   ├── db/              # Database client (Prisma)
│   └── services/        # Business logic services
├── prisma/              # Prisma schema and migrations
│   ├── schema.prisma    # Database schema definition (Prisma 6.x)
│   ├── migrations/      # Database migration files
│   └── seed.ts          # Database seeding script
├── content/             # Editable marketing content (JSON)
│   ├── home.json        # Homepage content
│   ├── about.json       # About page content
│   └── faq.json         # FAQ content
├── lib/                 # Shared utilities
│   ├── content.ts       # Content loader utility
│   ├── utils.ts         # General utilities
│   └── utils/           # Utility modules
│       ├── db-error-handler.ts  # Database error handling utilities
│       └── statement-pro-rating.ts  # Statement pro-rating calculations
├── public/              # Static assets
├── types/              # TypeScript type definitions
└── next.config.ts      # Next.js configuration (standalone mode)
```

## Content Management

Marketing content is stored in JSON files in the `content/` directory, making it easy to edit without code changes:

- `content/home.json` - Homepage hero, features, and CTA content
- `content/about.json` - About page content (mission, values, etc.)
- `content/faq.json` - FAQ questions and answers

To edit content:
1. Open the relevant JSON file in `content/`
2. Edit the content structure (maintain JSON format)
3. Save the file - changes will be reflected on the next page load

The content loader (`lib/content.ts`) caches content for performance. In development, restart the server to see changes.

## Database Schema

The application uses the following main models:

- **User**: User accounts (integrated with NextAuth)
- **Property**: Properties available for fractional ownership
- **Share**: User share ownership in properties
- **Investment**: Investment transactions
- **IncomeStatement**: Monthly income statements for properties
- **Distribution**: Income distributions to investors
- **Document**: Property and user documents

## Key Features Implementation

### Fractional Ownership

- Each property has a fixed number of shares (e.g., 100,000)
- Users purchase shares at a set price per share
- Minimum investment requirements per property
- Funding progress tracking and status (OPEN, FUNDED, CLOSED)

### Income Distribution

- Properties generate monthly income from shortlet rentals
- Income statements track gross revenue, operating costs, and management fees
- Net income is distributed pro-rata based on share ownership
- Distribution history and status tracking

### Investor Dashboard

- Portfolio overview (total invested, income earned, current value)
- Holdings per property with share details
- Distribution history
- Transaction history
- Property documents and statements

## API Routes

### Public API Routes
- `GET /api/health`: Health check endpoint
- `GET/POST /api/auth/[...nextauth]`: NextAuth authentication endpoints

### Investment API
- `POST /api/investments`: Purchase shares in a property

### Onboarding API
- `POST /api/onboarding/complete`: Complete user onboarding process
- `GET /api/onboarding/status`: Get user onboarding status

### Push Notifications API
- `POST /api/push/register`: Register push notification subscription
- `POST /api/push/send`: Send push notification (admin only)

### Admin API Routes
- `POST /api/admin/statements`: Create rental statement
- `GET /api/admin/statements/[id]`: Get statement details
- `PUT /api/admin/statements/[id]`: Update rental statement
- `GET /api/admin/statements/[id]/download-expenses`: Download statement expenses (CSV)
- `POST /api/admin/distributions/declare`: Declare distribution from rental statement
- `GET /api/admin/distributions/[id]/payouts`: Get payouts for distribution
- `POST /api/admin/properties/upload-images`: Upload property images/videos

### Authentication API
- `POST /api/auth/reset-password`: Request password reset
- `POST /api/auth/change-password`: Change user password
- `GET /api/auth/check-admin`: Check if user is admin

## Running the Application End-to-End

### Quick Start (Local Development)

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Database**
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev
   
   # Seed database with sample data
   npx prisma db seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Sign in with email (magic link) or use dev credentials if enabled
   - Browse properties, make investments, view dashboard

### Seed Data Includes

The seed script (`prisma/seed.ts`) creates a complete dataset:

- **5 test users** (investors) with completed profiles and onboarding
- **1 admin user** (pogbonna@gmail.com)
- **12 properties** across 6 Nigerian cities with varying statuses
- **3 investments** linking users to properties
- **6 months of rental statements** for 5 properties with realistic data
- **Distributions and payouts** for invested properties
- **Transactions** for investments and payouts
- **Documents** (global, property-specific, and user-specific)
- **Referral codes** for test users
- **Audit logs** for system initialization

### Testing the Application

1. **Sign In**: Use email magic link or dev credentials (if enabled)
2. **Browse Properties**: Visit `/properties` to see available investments
3. **View Property Details**: Click any property to see details, transparency metrics, and rental statements
4. **Make Investment**: Complete onboarding, then invest in a property
5. **View Dashboard**: Check portfolio value, income earned, and holdings
6. **View Income**: See monthly distributions and income timeline
7. **Admin Portal**: Sign in as admin to manage properties, statements, and distributions

## Development

### Build Process

The application uses Next.js **standalone output mode** for optimized production builds:

- **Standalone Mode**: Creates a minimal production build with only necessary files
- **Prisma Client**: Generated during build (`npx prisma generate`)
- **Build Output**: `.next/standalone/` directory contains the production server

**Build Commands:**
```bash
# Development build
npm run build

# Production build (includes Prisma generation)
npm run build  # Automatically runs: npx prisma generate && next build
```

### Code Quality

- **ESLint**: Code linting with Next.js config
- **Prettier**: Code formatting
- **TypeScript**: Full type safety across the application with strict mode
- **Prisma**: Type-safe database access with generated types
- **Error Handling**: Comprehensive try-catch blocks with centralized error handling utilities
- **Type Annotations**: Explicit type annotations prevent implicit `any` and `unknown` type errors
- **Toast Notifications**: Consistent user feedback using Sonner across all forms and actions

### Running Tests

```bash
# Run Playwright tests
npm run test:e2e
```

### Database Management

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# Create a new migration (development)
npx prisma migrate dev --name migration-name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only - ⚠️ deletes all data)
npx prisma migrate reset

# Generate Prisma Client (after schema changes)
npx prisma generate
```

**Important Notes:**
- **Prisma Version**: This project uses Prisma 6.x
- **Migrations**: Always run `npx prisma generate` after schema changes
- **Production**: Use `npx prisma migrate deploy` (not `migrate dev`) in production

## Configuration Files

Key configuration files in the project:

- **`package.json`**: Dependencies, scripts, and Node.js engine requirements (>=20.9.0)
- **`next.config.ts`**: Next.js configuration with standalone output mode
- **`prisma/schema.prisma`**: Database schema (Prisma 6.x format)

## Troubleshooting

### Common Issues

**Build fails with "DATABASE_URL not set":**
- This is expected during build. Prisma Client generation works without DATABASE_URL due to lazy initialization.
- Ensure DATABASE_URL is set at runtime, not build time.

**"sh: next: not found" error:**
- This happens if Next.js isn't installed or build failed.
- Run `npm ci` to install dependencies, then `npm run build`.

**Prisma migration errors:**
- Ensure Prisma 6.x is installed: `npm install prisma@^6.0.0 @prisma/client@^6.0.0`
- Clear Prisma cache: `rm -rf node_modules/.prisma`
- Regenerate client: `npx prisma generate`

**TypeScript compilation errors:**
- Ensure all function parameters have explicit type annotations
- Check for implicit `any` types in array callbacks (map, reduce, filter, etc.)
- Run `npm run lint` to identify type errors

**Database connection errors:**
- Check `DATABASE_URL` environment variable
- Verify database is running and accessible
- Check network connectivity for remote databases
- Review error messages in console for specific connection issues

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure Node.js 20.9.0+ is installed
4. Run `npm ci` to install dependencies
5. Run `npx prisma generate` to generate Prisma Client
6. Make your changes
7. Run tests: `npm run test:e2e`
8. Commit your changes (`git commit -m 'Add some amazing feature'`)
9. Push to the branch (`git push origin feature/amazing-feature`)
10. Open a Pull Request

## License

This project is open-source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub or contact support@invest.inventallianceco.com
