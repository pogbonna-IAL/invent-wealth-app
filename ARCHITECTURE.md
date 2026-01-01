# InventWealth - Architecture & Feature Documentation

**Version:** 1.0  
**Last Updated:** December 2024  
**Purpose:** Comprehensive guide for onboarding new team members and understanding the InventWealth platform architecture and functionality.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [System Architecture](#system-architecture)
4. [Core Features & Functionality](#core-features--functionality)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Data Models & Relationships](#data-models--relationships)
7. [Key Business Processes](#key-business-processes)
8. [Technical Stack](#technical-stack)
9. [Project Structure](#project-structure)
10. [API & Integration Points](#api--integration-points)
11. [Security & Compliance](#security--compliance)
12. [Deployment Architecture](#deployment-architecture)

---

## Executive Summary

**InventWealth** is a fractional property ownership platform that enables investors to purchase shares in premium real estate properties and receive monthly income distributions from shortlet (short-term rental) operations. The platform democratizes real estate investment by allowing fractional ownership with lower entry barriers.

### Key Value Propositions

- **Accessibility**: Invest in premium properties with lower capital requirements
- **Passive Income**: Receive monthly distributions from rental income proportional to share ownership
- **Transparency**: Full visibility into property performance, income statements, and distributions
- **Diversification**: Invest across multiple properties and locations
- **Professional Management**: Properties are managed by the platform team

### Platform Statistics

- **User Types**: Investors and Administrators
- **Investment Model**: Share-based fractional ownership
- **Income Distribution**: Monthly pro-rata distributions based on share ownership
- **Property Types**: Apartments, Villas, Studios, Houses, Condos, Townhouses
- **Geographic Focus**: Nigerian real estate market (expandable)

---

## Platform Overview

### What is InventWealth?

InventWealth is a **fractional property ownership platform** that:

1. **Lists Properties**: Premium real estate properties available for fractional investment
2. **Facilitates Investments**: Investors purchase shares in properties at a fixed price per share
3. **Manages Properties**: Properties are operated as shortlet rentals (Airbnb-style)
4. **Distributes Income**: Monthly rental income is distributed to investors based on their share ownership percentage
5. **Provides Transparency**: Investors can track property performance, view income statements, and monitor their portfolio

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    INVESTMENT FLOW                           │
└─────────────────────────────────────────────────────────────┘

1. Property Listing
   └─> Admin creates property with shares (e.g., 100,000 shares @ ₦1,000/share)
   
2. Investor Onboarding
   └─> User signs up → Completes profile → Risk assessment → KYC verification
   
3. Investment
   └─> Investor browses properties → Selects property → Purchases shares
       └─> Minimum investment enforced (e.g., 100 shares)
       └─> Investment status: PENDING → CONFIRMED
       
4. Property Operations
   └─> Property operates as shortlet rental
   └─> Monthly rental income generated
   
5. Income Distribution
   └─> Admin creates rental statement (gross revenue, costs, fees)
   └─> System calculates net distributable income
   └─> Distribution created → Payouts calculated for each investor
   └─> Admin approves distribution → Payouts marked as PAID
   
6. Investor Receives Income
   └─> Payout appears in investor dashboard
   └─> Transaction recorded
   └─> Portfolio value updated
```

### Key Concepts

#### Fractional Ownership
- Each property is divided into a fixed number of **shares** (e.g., 100,000 shares)
- Investors purchase **shares** rather than the entire property
- Share ownership percentage determines income distribution

#### Share Pricing
- **Price Per Share**: Fixed price set when property is listed (e.g., ₦1,000/share)
- **Total Property Value**: `Price Per Share × Total Shares`
- **Minimum Investment**: Minimum number of shares required per property

#### Income Distribution Formula
```
Net Distributable Income = Gross Revenue - Operating Costs - Management Fee + Income Adjustments

Investor Payout = (Investor's Shares ÷ Total Outstanding Shares) × Net Distributable Income
```

#### Property Status Lifecycle
- **OPEN**: Property is accepting investments
- **FUNDED**: Target raise amount reached, property fully funded
- **CLOSED**: Property no longer accepting new investments

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web App    │  │  Mobile Web  │  │  PWA Support  │     │
│  │  (Next.js)   │  │  (Responsive) │  │  (Offline)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Next.js App Router                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │  │
│  │  │   Pages      │  │  API Routes  │  │  Actions │  │  │
│  │  │ (Server      │  │  (REST API)   │  │ (Server  │  │  │
│  │  │ Components)  │  │              │  │ Actions) │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Layer                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │
│  │  │Investment│ │Distribution│ │ Property │ │  User  │ │  │
│  │  │ Service  │ │  Service   │ │ Service  │ │Service │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Prisma ORM (Type-Safe)                  │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         PostgreSQL Database                   │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │  │
│  │  │  │  Users   │ │Properties│ │Investments│     │   │  │
│  │  │  │Profiles  │ │ Statements│ │Payouts   │     │   │  │
│  │  │  │Onboarding│ │Distributions│Transactions│     │   │  │
│  │  └──────────────┘ └──────────┘ └──────────┘     │   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   SMTP       │  │  Push        │  │  Email       │     │
│  │  (Email)     │  │  Notifications│ │  (Magic Link)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Application Architecture Patterns

#### 1. **Server-First Architecture**
- **Next.js App Router**: File-based routing with Server Components by default
- **Server Components**: Most pages render on the server for optimal performance
- **Client Components**: Used only when interactivity is needed (forms, charts, modals)

#### 2. **Service Layer Pattern**
- Business logic encapsulated in service classes (`server/services/`)
- Services handle domain logic, validation, and data transformation
- Promotes code reusability and testability

#### 3. **Repository Pattern**
- Prisma ORM abstracts database access
- Type-safe database queries with generated types
- Centralized data access layer

#### 4. **API-First Design**
- RESTful API routes for client-side interactions (`app/api/`)
- Server Actions for form submissions and mutations (`app/actions/`)
- Clear separation between public and authenticated endpoints

### Request Flow

```
User Request
    │
    ▼
┌─────────────────┐
│  Next.js Route  │ (Page or API Route)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Authentication │ (NextAuth.js - Session Check)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Authorization  │ (Role-Based Access Control)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Service Layer  │ (Business Logic)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Prisma Client  │ (Database Access)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  PostgreSQL     │ (Data Storage)
└─────────────────┘
```

---

## Core Features & Functionality

### 1. User Authentication & Onboarding

#### Authentication
- **Method**: Email magic link authentication via NextAuth.js
- **No Passwords**: Users sign in via email link (passwordless)
- **Session Management**: JWT-based sessions with database persistence
- **Development Mode**: Credentials-based login for testing (`admin`/`admin123`)

#### Onboarding Flow
1. **Sign Up**: User enters email → Receives magic link → Clicks link → Account created
2. **Profile Setup**: 
   - Personal information (name, phone, address, date of birth, country)
   - Profile completion required before investing
3. **Risk Assessment**: 
   - Risk tolerance questionnaire
   - Answers stored in onboarding record
4. **KYC Status**: 
   - PENDING → IN_REVIEW → APPROVED/REJECTED
   - KYC verification managed by admins

**Onboarding Status:**
- `PENDING`: User hasn't started onboarding
- `IN_PROGRESS`: User is completing onboarding steps
- `COMPLETED`: User has completed all onboarding steps

### 2. Property Management

#### Property Listing
Properties are created by admins with the following attributes:

- **Basic Information**:
  - Name, slug (URL-friendly identifier)
  - City, country, address
  - Description, highlights (array of feature strings)
  - Cover image, gallery (array of image URLs)

- **Investment Details**:
  - Property type (APARTMENT, VILLA, STUDIO, HOUSE, CONDO, TOWNHOUSE)
  - Shortlet model (ENTIRE_HOME, PRIVATE_ROOM)
  - Total shares (e.g., 100,000)
  - Available shares (decreases as investments are made)
  - Price per share (e.g., ₦1,000)
  - Minimum shares required (e.g., 100 shares)
  - Target raise amount (calculated: `pricePerShare × totalShares`)
  - Projected annual yield percentage (e.g., 8.5%)

- **Status**:
  - `OPEN`: Accepting investments
  - `FUNDED`: Target reached, fully funded
  - `CLOSED`: No longer accepting investments

#### Property Discovery
- **Browse Properties**: List all available properties with filters
- **Property Details**: View comprehensive property information
- **Investment CTA**: Direct investment flow from property page
- **Performance Metrics**: View rental statements and income history

### 3. Investment System

#### Investment Process

```
1. Investor browses properties
   └─> Filters by city, property type, status
   
2. Selects property
   └─> Views property details, performance metrics
   └─> Checks available shares and minimum investment
   
3. Initiates investment
   └─> Enters number of shares to purchase
   └─> System validates:
       - Minimum shares requirement
       - Available shares check
       - Property status (must be OPEN)
       - User onboarding status (must be COMPLETED)
   
4. Investment confirmation
   └─> Investment record created with status PENDING
   └─> Shares reserved (availableShares decreased)
   └─> Transaction record created (type: INVESTMENT)
   └─> Status updated to CONFIRMED
   
5. Portfolio update
   └─> User's portfolio updated
   └─> Investment appears in dashboard
```

#### Investment Features
- **Share Purchase**: Buy shares at fixed price per share
- **Minimum Investment**: Enforced minimum shares per property
- **Availability Check**: Real-time available shares validation
- **Transaction Recording**: All investments recorded as transactions
- **Portfolio Tracking**: Investments tracked in user dashboard

#### Investment Status
- `PENDING`: Investment created but not yet confirmed
- `CONFIRMED`: Investment confirmed and shares allocated
- `CANCELLED`: Investment cancelled (shares returned)

### 4. Income Distribution System

#### Rental Statement Creation
Admins create monthly rental statements for each property:

- **Period**: Start and end dates for the rental period
- **Revenue**: Gross revenue from shortlet rentals
- **Costs**: Operating costs (utilities, maintenance, cleaning, etc.)
- **Management Fee**: Platform management fee percentage
- **Metrics**: 
  - Occupancy rate percentage
  - Average Daily Rate (ADR)
- **Adjustments**: Income adjustments for unforeseen events
- **Notes**: Additional notes or explanations

**Calculation:**
```
Net Distributable Income = Gross Revenue - Operating Costs - Management Fee + Income Adjustments
```

#### Distribution Workflow

```
1. Admin creates rental statement
   └─> RentalStatement record created
   └─> Net distributable income calculated
   
2. System creates distribution
   └─> Distribution record created (status: DRAFT)
   └─> Links to rental statement
   
3. System calculates payouts
   └─> For each confirmed investment:
       - Get investor's shares at record date
       - Calculate payout: (shares ÷ total outstanding shares) × net distributable
       - Create Payout record (status: PENDING)
       - Handle underwriter shares (unsold shares)
   
4. Admin reviews distribution
   └─> View all payouts
   └─> Validate calculations
   └─> Approve distribution (status: APPROVED)
   
5. Admin marks payouts as paid
   └─> Update payout status to PAID
   └─> Record payment method, reference, bank account
   └─> Create transaction record (type: PAYOUT)
   └─> Send push notification (if enabled)
```

#### Distribution Status Flow
- `DRAFT`: Distribution created, payouts calculated
- `PENDING_APPROVAL`: Awaiting admin approval
- `APPROVED`: Distribution approved by admin
- `DECLARED`: Distribution declared to investors
- `PAID`: All payouts marked as paid

#### Payout Status Flow
- `PENDING`: Payout calculated, awaiting payment
- `PENDING_APPROVAL`: Requires admin approval
- `APPROVED`: Approved for payment
- `PAID`: Payment completed

### 5. Investor Dashboard

#### Portfolio Overview
- **Total Invested**: Sum of all confirmed investments
- **Income Earned**: Sum of all paid payouts
- **Current Portfolio Value**: Based on current property valuations
- **Active Investments**: Number of properties invested in
- **Recent Activity**: Latest transactions and distributions

#### Portfolio Charts
- **Portfolio Value Over Time**: Line chart showing portfolio growth
- **Income Distribution Timeline**: Monthly income received
- **Allocation Chart**: Pie chart showing investment distribution across properties

#### Holdings
- **Properties**: List of all properties user has invested in
- **Share Details**: Number of shares owned per property
- **Investment Amount**: Total amount invested per property
- **Income Received**: Total income received per property
- **Performance Metrics**: Property-specific performance data

#### Income Tracking
- **Distributions**: List of all distributions received
- **Payouts**: Detailed payout history with status
- **Income Timeline**: Monthly income distribution chart
- **Next Expected Distribution**: Estimated next payout date

#### Transactions
- **All Transactions**: Complete transaction history
- **Transaction Types**: INVESTMENT, PAYOUT, FEE, REFUND
- **Filters**: Filter by type, date range, property
- **Export**: Download transaction history (future feature)

### 6. Admin Portal

#### Dashboard
- **Platform Statistics**: 
  - Total properties, users, investments
  - Total invested, income distributed
  - Active users, recent activity
- **Quick Actions**: Links to key management pages
- **Recent Activity Feed**: Latest transactions, investments, payouts

#### Property Management
- **Create Property**: Add new property listings
- **Edit Property**: Update property details, images, status
- **View Properties**: List all properties with filters
- **Property Details**: Comprehensive property view with investments and statements

#### User Management
- **User List**: View all investors and admins
- **User Details**: View user profile, investments, transactions
- **Create User**: Manually create user accounts
- **Edit User**: Update user information, roles
- **User Overview**: Aggregate user statistics

#### Investment Management
- **View Investments**: List all investments with filters
- **Investment Details**: View individual investment details
- **Create Investment**: Manually create investment records
- **Edit Investment**: Update investment status, shares

#### Distribution Management
- **Create Rental Statement**: Add monthly rental performance data
- **View Statements**: List all rental statements
- **Edit Statements**: Update statement details
- **Declare Distribution**: Create distribution from statement
- **Approve Distribution**: Review and approve distributions
- **Bulk Operations**: Bulk payout approval and management

#### Payout Management
- **View Payouts**: List all payouts with filters
- **Payout Details**: View individual payout information
- **Mark as Paid**: Update payout status and payment details
- **Payout Audit Log**: Track all payout changes

#### Transaction Management
- **View Transactions**: List all platform transactions
- **Transaction Details**: View transaction information
- **Filters**: Filter by type, user, date range

#### Document Management
- **Upload Documents**: Add property or user documents
- **Document Types**: AGREEMENT, PROSPECTUS, REPORT, STATEMENT
- **Document Scope**: GLOBAL, PROPERTY, USER
- **View Documents**: List and manage all documents

### 7. Document Management

#### Document Types
- **AGREEMENT**: Investment agreements, contracts
- **PROSPECTUS**: Property prospectuses
- **REPORT**: Financial reports, performance reports
- **STATEMENT**: Income statements, account statements

#### Document Scope
- **GLOBAL**: Available to all users (e.g., terms of service)
- **PROPERTY**: Property-specific documents (e.g., property reports)
- **USER**: User-specific documents (e.g., account statements)

#### Features
- Upload and store documents
- Associate documents with properties or users
- View documents in investor dashboard
- Download documents (future feature)

### 8. Push Notifications

#### Notification Types
- **Distribution Declared**: New distribution available
- **Payout Status Update**: Payout marked as PAID
- **Property Updates**: Property status changes (future)

#### Implementation
- **VAPID Keys**: Web Push protocol for browser notifications
- **Subscription Management**: Users subscribe via browser
- **Notification Service**: Server-side notification sending
- **User Preferences**: Users can enable/disable notifications

### 9. Referral System

#### Features
- **Referral Codes**: Unique codes generated for each user
- **Referral Tracking**: Track who referred whom
- **Referral Signups**: Record new user signups via referral codes

#### Implementation
- Each user can have a referral code
- New users can enter referral code during signup
- Referral relationships tracked in database
- Future: Referral rewards and incentives

### 10. Audit & Compliance

#### Audit Logging
- **User Actions**: Track user actions and changes
- **Admin Actions**: Track admin operations
- **Payout Audit**: Track all payout status changes
- **Metadata**: Store action metadata in JSON format

#### Compliance Features
- **KYC Status**: Track user KYC verification status
- **Document Management**: Store compliance documents
- **Transaction Records**: Complete transaction history
- **Audit Trails**: Full audit logs for all operations

---

## User Roles & Permissions

### Investor Role (`INVESTOR`)

#### Permissions
- ✅ View own profile and settings
- ✅ Browse properties
- ✅ Make investments (after onboarding completion)
- ✅ View own dashboard and portfolio
- ✅ View own investments and transactions
- ✅ View own income and payouts
- ✅ View property details and statements
- ✅ Access own documents
- ✅ Enable/disable push notifications
- ❌ Access admin portal
- ❌ Manage properties
- ❌ Create distributions
- ❌ View other users' data

#### Accessible Routes
- `/dashboard/*` - Investor dashboard
- `/properties/*` - Property browsing
- `/invest/*` - Investment pages
- `/income` - Income tracking
- `/transactions` - Transaction history
- `/statements` - Income statements
- `/documents` - User documents
- `/settings` - User settings

### Admin Role (`ADMIN`)

#### Permissions
- ✅ All Investor permissions
- ✅ Access admin portal (`/admin/*`)
- ✅ Create and manage properties
- ✅ Create rental statements
- ✅ Create and approve distributions
- ✅ Manage payouts
- ✅ View and manage all users
- ✅ View all investments and transactions
- ✅ Upload and manage documents
- ✅ View platform statistics
- ✅ Manage user roles (future)

#### Accessible Routes
- All Investor routes
- `/admin/*` - Admin portal
  - `/admin` - Admin dashboard
  - `/admin/properties/*` - Property management
  - `/admin/users/*` - User management
  - `/admin/investments/*` - Investment management
  - `/admin/distributions/*` - Distribution management
  - `/admin/statements/*` - Statement management
  - `/admin/transactions` - Transaction management
  - `/admin/documents/*` - Document management
  - `/admin/income` - Income analytics

### Role Enforcement

#### Middleware
- Route protection via Next.js middleware
- Role-based access control at route level
- Service-level authorization checks

#### Service Layer
- Services check user roles before operations
- Admin-only operations throw errors for non-admins
- User data isolation (users can only access their own data)

---

## Data Models & Relationships

### Core Entities

#### User
- **Purpose**: User accounts (investors and admins)
- **Key Fields**: email, name, role, emailVerified, passwordHash
- **Relationships**:
  - One-to-one: Profile, Onboarding
  - One-to-many: Investments, Payouts, Transactions, Documents
  - One-to-one: ReferralCode

#### Profile
- **Purpose**: Extended user information
- **Key Fields**: phone, address, country, dob (date of birth)
- **Relationship**: One-to-one with User

#### Onboarding
- **Purpose**: Track user onboarding progress
- **Key Fields**: status, riskAnswers (JSON), kycStatus
- **Statuses**: PENDING, IN_PROGRESS, COMPLETED
- **KYC Statuses**: PENDING, IN_REVIEW, APPROVED, REJECTED
- **Relationship**: One-to-one with User

#### Property
- **Purpose**: Real estate properties available for investment
- **Key Fields**: slug, name, city, country, totalShares, availableShares, pricePerShare, status
- **Relationships**:
  - One-to-many: Investments, RentalStatements, Distributions, Documents, Payouts

#### Investment
- **Purpose**: User investments in properties
- **Key Fields**: userId, propertyId, shares, pricePerShareAtPurchase, totalAmount, status
- **Statuses**: PENDING, CONFIRMED, CANCELLED
- **Relationships**:
  - Many-to-one: User, Property

#### RentalStatement
- **Purpose**: Monthly rental performance data
- **Key Fields**: propertyId, periodStart, periodEnd, grossRevenue, operatingCosts, managementFee, netDistributable
- **Relationships**:
  - Many-to-one: Property
  - One-to-many: Distributions, Payouts

#### Distribution
- **Purpose**: Income distributions to investors
- **Key Fields**: propertyId, rentalStatementId, totalDistributed, status, approvedBy, approvedAt
- **Statuses**: DRAFT, PENDING_APPROVAL, APPROVED, DECLARED, PAID
- **Relationships**:
  - Many-to-one: Property, RentalStatement, User (approver)
  - One-to-many: Payouts

#### Payout
- **Purpose**: Individual investor payouts from distributions
- **Key Fields**: userId, propertyId, distributionId, sharesAtRecord, amount, status, paidAt, paymentMethod
- **Statuses**: PENDING, PENDING_APPROVAL, APPROVED, PAID
- **Payment Methods**: WALLET, BANK_TRANSFER, CHECK, WIRE_TRANSFER, MOBILE_MONEY, CASH, OTHER
- **Relationships**:
  - Many-to-one: User, Property, Distribution, RentalStatement
  - One-to-many: PayoutAuditLogs

#### Transaction
- **Purpose**: All financial transactions
- **Key Fields**: userId, type, amount, currency, reference
- **Types**: INVESTMENT, PAYOUT, FEE, REFUND
- **Relationship**: Many-to-one with User

#### Document
- **Purpose**: Platform documents (agreements, reports, statements)
- **Key Fields**: scope, userId, propertyId, title, url, docType
- **Scopes**: GLOBAL, PROPERTY, USER
- **Types**: AGREEMENT, PROSPECTUS, REPORT, STATEMENT
- **Relationships**: Many-to-one with User, Property (optional)

### Entity Relationship Diagram (Simplified)

```
User
├── Profile (1:1)
├── Onboarding (1:1)
├── Investments (1:many)
├── Payouts (1:many)
├── Transactions (1:many)
├── Documents (1:many)
└── ReferralCode (1:1)

Property
├── Investments (1:many)
├── RentalStatements (1:many)
├── Distributions (1:many)
├── Documents (1:many)
└── Payouts (1:many)

RentalStatement
├── Property (many:1)
├── Distributions (1:many)
└── Payouts (1:many)

Distribution
├── Property (many:1)
├── RentalStatement (many:1)
├── User/Approver (many:1)
└── Payouts (1:many)

Payout
├── User (many:1)
├── Property (many:1)
├── Distribution (many:1)
├── RentalStatement (many:1)
└── PayoutAuditLogs (1:many)
```

---

## Key Business Processes

### Process 1: New User Onboarding

```
1. User signs up with email
   └─> NextAuth creates User account (role: INVESTOR)
   └─> Onboarding record created (status: PENDING)
   
2. User receives magic link email
   └─> Clicks link → Email verified → Session created
   
3. User redirected to onboarding
   └─> Step 1: Profile information
   └─> Step 2: Risk assessment
   └─> Step 3: Terms acceptance
   
4. Onboarding completed
   └─> Profile created/updated
   └─> Onboarding status: COMPLETED
   └─> User can now invest
```

### Process 2: Property Investment

```
1. Investor browses properties
   └─> Filters by city, type, status
   └─> Views property details
   
2. Investor selects property
   └─> Checks available shares
   └─> Verifies minimum investment
   
3. Investor initiates investment
   └─> Enters number of shares
   └─> System validates:
       - Onboarding completed
       - Minimum shares met
       - Shares available
       - Property status OPEN
   
4. Investment confirmed
   └─> Investment record created (status: CONFIRMED)
   └─> Available shares decreased
   └─> Transaction created (type: INVESTMENT)
   └─> Portfolio updated
   
5. Property status check
   └─> If availableShares = 0 → Status: FUNDED
   └─> If target reached → Status: FUNDED
```

### Process 3: Monthly Income Distribution

```
1. Admin creates rental statement
   └─> Enters period dates
   └─> Enters gross revenue
   └─> Enters operating costs
   └─> Enters management fee
   └─> System calculates net distributable
   
2. Admin creates distribution
   └─> Links to rental statement
   └─> Distribution created (status: DRAFT)
   
3. System calculates payouts
   └─> For each confirmed investment:
       - Get shares at record date
       - Calculate payout amount
       - Create Payout (status: PENDING)
   └─> Handle underwriter shares (unsold)
   
4. Admin reviews distribution
   └─> Views all payouts
   └─> Validates calculations
   └─> Approves distribution (status: APPROVED)
   
5. Admin marks payouts as paid
   └─> Updates payout status to PAID
   └─> Records payment details
   └─> Creates transaction (type: PAYOUT)
   └─> Sends push notification
```

### Process 4: Payout Approval Workflow

```
1. Payout created (status: PENDING)
   └─> Linked to distribution
   └─> Amount calculated
   
2. Admin reviews payout
   └─> Validates amount
   └─> Checks investor details
   
3. Admin approves payout (status: APPROVED)
   └─> PayoutAuditLog created
   └─> Status change recorded
   
4. Payment processed
   └─> Admin marks as PAID
   └─> Payment method recorded
   └─> Payment reference added
   └─> Transaction created
   └─> Push notification sent
```

---

## Technical Stack

### Frontend

- **Framework**: Next.js 16.1.0 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Charts**: Recharts 3.6.0
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **PWA**: Service Worker, Web Push API

### Backend

- **Runtime**: Node.js 20.9.0+
- **Framework**: Next.js (Full-stack)
- **API**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL 17+
- **ORM**: Prisma 6.x
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Email**: Nodemailer (SMTP)

### Infrastructure

- **Containerization**: Docker (multi-stage builds)
- **Orchestration**: Docker Compose
- **Deployment**: Railway (Docker/NIXPACKS), VPS support
- **Build**: Next.js standalone output mode
- **Environment**: Node.js 20 Alpine (Docker)

### Development Tools

- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Playwright (E2E)
- **Type Checking**: TypeScript

---

## Project Structure

```
invent-wealth/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes (REST endpoints)
│   │   ├── admin/               # Admin API endpoints
│   │   ├── auth/                # Authentication endpoints
│   │   ├── health/              # Health check endpoint
│   │   ├── investments/         # Investment API
│   │   ├── onboarding/         # Onboarding API
│   │   └── push/                # Push notification API
│   ├── actions/                 # Server Actions (mutations)
│   │   ├── admin/               # Admin actions
│   │   ├── auth.ts              # Authentication actions
│   │   ├── investment.ts        # Investment actions
│   │   └── settings.ts          # Settings actions
│   ├── admin/                   # Admin portal pages
│   │   ├── distributions/       # Distribution management
│   │   ├── documents/           # Document management
│   │   ├── income/              # Income analytics
│   │   ├── investments/         # Investment management
│   │   ├── properties/          # Property management
│   │   ├── statements/          # Statement management
│   │   ├── transactions/        # Transaction management
│   │   └── users/               # User management
│   ├── auth/                    # Authentication pages
│   │   ├── signin/              # Sign in page
│   │   ├── reset-password/      # Password reset
│   │   └── verify-request/      # Email verification
│   ├── dashboard/               # Investor dashboard
│   │   ├── account/             # Account settings
│   │   ├── invest/              # Investment page
│   │   ├── learn/               # Educational content
│   │   ├── properties/          # User's properties
│   │   └── wallet/              # Wallet (future)
│   ├── properties/              # Property pages
│   │   └── [slug]/              # Property detail page
│   ├── onboarding/             # Onboarding wizard
│   ├── income/                  # Income tracking
│   ├── transactions/            # Transaction history
│   ├── statements/              # Income statements
│   ├── documents/              # Documents
│   ├── settings/                # User settings
│   └── layout.tsx               # Root layout
├── components/                  # React components
│   ├── ui/                     # shadcn/ui components
│   ├── auth/                   # Authentication components
│   ├── dashboard/             # Dashboard components
│   ├── investment/             # Investment components
│   ├── income/                  # Income components
│   ├── layout/                  # Layout components
│   ├── onboarding/             # Onboarding components
│   ├── properties/              # Property components
│   ├── pwa/                     # PWA components
│   └── theme/                   # Theme components
├── server/                      # Server-side code
│   ├── auth/                   # NextAuth configuration
│   │   ├── config.ts           # Main auth config (Node.js)
│   │   └── edge.ts              # Edge-compatible auth
│   ├── db/                      # Database client
│   │   └── prisma.ts            # Prisma client singleton
│   └── services/                # Business logic services
│       ├── admin.service.ts
│       ├── distribution.service.ts
│       ├── investment.service.ts
│       ├── property.service.ts
│       ├── user.service.ts
│       └── ... (other services)
├── prisma/                      # Prisma schema and migrations
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Migration files
│   └── seed.ts                  # Database seeding script
├── lib/                         # Shared utilities
│   ├── content.ts               # Content loader
│   └── utils.ts                 # General utilities
├── content/                     # Editable content (JSON)
│   ├── home.json                # Homepage content
│   ├── about.json               # About page content
│   └── faq.json                 # FAQ content
├── types/                       # TypeScript types
│   ├── next-auth.d.ts          # NextAuth type extensions
│   └── web-push.d.ts            # Web Push types
├── public/                      # Static assets
│   ├── images/                  # Image assets
│   ├── partners/                # Partner logos
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker
├── Dockerfile                   # Production Docker image
├── docker-compose.yml           # Docker Compose config
├── nixpacks.toml                # NIXPACKS configuration
├── railway.json                 # Railway deployment config
├── next.config.ts               # Next.js configuration
├── package.json                 # Dependencies and scripts
└── tsconfig.json                # TypeScript configuration
```

---

## API & Integration Points

### Public API Routes

#### Health Check
- `GET /api/health`
- **Purpose**: Application health check
- **Response**: `{ status: "healthy", database: "connected", timestamp: "..." }`

### Authentication API

#### NextAuth Endpoints
- `GET/POST /api/auth/[...nextauth]`
- **Purpose**: NextAuth.js authentication endpoints
- **Endpoints**: signin, signout, callback, session, providers

#### Password Reset
- `POST /api/auth/reset-password`
- **Purpose**: Request password reset (if password-based auth added)

#### Change Password
- `POST /api/auth/change-password`
- **Purpose**: Change user password

### Investment API

#### Create Investment
- `POST /api/investments`
- **Purpose**: Create new investment
- **Auth**: Required (Investor)
- **Body**: `{ propertyId, shares }`

### Onboarding API

#### Complete Onboarding
- `POST /api/onboarding/complete`
- **Purpose**: Complete onboarding process
- **Auth**: Required

#### Get Onboarding Status
- `GET /api/onboarding/status`
- **Purpose**: Get user onboarding status
- **Auth**: Required

### Push Notification API

#### Register Subscription
- `POST /api/push/register`
- **Purpose**: Register push notification subscription
- **Auth**: Required
- **Body**: `{ endpoint, keys: { p256dh, auth } }`

#### Send Notification
- `POST /api/push/send`
- **Purpose**: Send push notification (admin only)
- **Auth**: Required (Admin)

### Admin API Routes

#### Distributions

- `POST /api/admin/distributions/declare`
  - **Purpose**: Declare distribution from rental statement
  - **Auth**: Required (Admin)

- `GET /api/admin/distributions/[id]/payouts`
  - **Purpose**: Get payouts for distribution
  - **Auth**: Required (Admin)

#### Statements

- `GET /api/admin/statements`
  - **Purpose**: List rental statements
  - **Auth**: Required (Admin)

- `GET /api/admin/statements/[id]`
  - **Purpose**: Get statement details
  - **Auth**: Required (Admin)

- `GET /api/admin/statements/[id]/download-expenses`
  - **Purpose**: Download statement expenses (CSV)
  - **Auth**: Required (Admin)

---

## Security & Compliance

### Authentication Security

- **Passwordless Auth**: Email magic links (no password storage)
- **Session Management**: Secure JWT-based sessions
- **Email Verification**: Required for account activation
- **CSRF Protection**: Built into Next.js Server Actions

### Authorization

- **Role-Based Access Control**: INVESTOR vs ADMIN roles
- **Route Protection**: Middleware-based route guards
- **Service-Level Checks**: Authorization checks in service layer
- **Data Isolation**: Users can only access their own data

### Data Security

- **SQL Injection Prevention**: Prisma parameterized queries
- **XSS Protection**: React's built-in escaping
- **Input Validation**: Zod schema validation
- **Type Safety**: TypeScript end-to-end

### Audit & Compliance

- **Audit Logging**: All admin actions logged
- **Payout Audit Trail**: Complete payout change history
- **Transaction Records**: Immutable transaction history
- **KYC Tracking**: User KYC status management

### Privacy

- **Data Minimization**: Only collect necessary data
- **User Data Control**: Users can update their data
- **Document Access**: Scoped document access (GLOBAL, PROPERTY, USER)

---

## Deployment Architecture

### Production Deployment (Railway)

#### Build Process
1. **Docker Build** (if Dockerfile detected):
   - Multi-stage build (deps → builder → runner)
   - Install dependencies (`npm ci`)
   - Generate Prisma Client (`npx prisma generate`)
   - Build Next.js (`npm run build`)
   - Create minimal production image

2. **NIXPACKS Build** (if nixpacks.toml present):
   - Auto-detect Node.js version from `package.json`
   - Install dependencies (`npm ci`)
   - Generate Prisma Client
   - Build Next.js

#### Runtime
- **Standalone Mode**: Next.js standalone output
- **Server**: `node server.js` from `.next/standalone`
- **Port**: 3000 (configurable via PORT env var)
- **Database**: PostgreSQL (Railway managed or external)

#### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Secret key for sessions
- `SMTP_*`: Email configuration
- `VAPID_*`: Push notification keys (optional)

### Local Development

#### Docker Compose
- **PostgreSQL**: Containerized database
- **App**: Development server with hot reload
- **Volumes**: Persistent data storage

#### Direct Development
- **Database**: Local PostgreSQL or Docker
- **Server**: `npm run dev` (Next.js dev server)
- **Port**: 3000

---

## Getting Started for New Team Members

### 1. Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd invent-wealth

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

### 2. Key Files to Review

1. **`prisma/schema.prisma`**: Database schema and relationships
2. **`server/services/`**: Business logic services
3. **`app/actions/`**: Server Actions (mutations)
4. **`app/api/`**: API routes
5. **`components/`**: React components

### 3. Common Tasks

#### Adding a New Feature
1. Update Prisma schema if needed
2. Create migration: `npx prisma migrate dev --name feature-name`
3. Create service method in `server/services/`
4. Create Server Action or API route
5. Create UI component
6. Add route/page

#### Debugging
- Check server logs in terminal
- Use Prisma Studio: `npx prisma studio`
- Check database directly
- Review browser console for client errors

#### Testing
- Run E2E tests: `npm run test:e2e`
- Manual testing: Use dev credentials (`admin`/`admin123`)

### 4. Code Style Guidelines

- **TypeScript**: Strict mode enabled
- **Components**: Use shadcn/ui components when possible
- **Forms**: Use React Hook Form + Zod
- **Styling**: Tailwind CSS utility classes
- **Naming**: PascalCase for components, camelCase for functions

---

## Future Enhancements

### Planned Features
- **Payment Integration**: Stripe/Paystack integration for investments
- **Wallet System**: In-app wallet for payouts
- **Secondary Market**: Share trading between investors
- **Mobile App**: Native mobile applications
- **Advanced Analytics**: Property performance analytics
- **Email Templates**: Rich email templates
- **Document Generation**: Automated document generation
- **Multi-Currency**: Support for multiple currencies
- **Referral Rewards**: Referral program with rewards

### Technical Improvements
- **Caching**: Redis for session and data caching
- **CDN**: Static asset CDN integration
- **Monitoring**: Application performance monitoring
- **Logging**: Centralized logging system
- **Testing**: Expanded test coverage

---

## Support & Resources

### Documentation
- **README.md**: Setup and development guide
- **DEPLOYMENT.md**: Deployment instructions
- **ARCHITECTURE.md**: This document

### Key Contacts
- **Technical Lead**: [Contact Information]
- **Product Owner**: [Contact Information]
- **Support**: support@invest.inventallianceco.com

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Railway Documentation](https://docs.railway.app)

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Maintained By**: InventWealth Development Team

