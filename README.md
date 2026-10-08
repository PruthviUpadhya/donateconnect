# DonateConnect — Mobile-First Community Donation Platform

DonateConnect is a mobile-first donation management and relief logistics platform bridging **Donors**, **Verified NGOs**, **Volunteers**, and **Platform Administrators**. It facilitates transparent, tracked, and verifiable non-monetary relief donations (food, clothing, books, medical supplies, electronics, and furnishings) across communities.

---

## 🌟 Key Features Across Phases

### Phase 1 & 2: Architecture & Secure Authentication
- **Role-Based Authentication**: Secure JWT tokens with refresh capabilities for `DONOR`, `NGO`, `VOLUNTEER`, and `ADMIN`.
- **OTP Verification via Nodemailer SMTP**: Clean transactional email OTP delivery service with 10-minute expiry and attempt tracking.
- **NGO Onboarding**: Registration with compliance documentation upload (registration certificate, PAN card).
- **Relational Integrity**: Backed by **Neon PostgreSQL** managed through **Prisma ORM**.

### Phase 3: Donation Lifecycle & Atomic Acceptance
- **Donation Request Creation**: Categories, quantities, descriptions, and pickup location landmark coordinates.
- **In-Database Binary Storage**: Resilient document and image delivery (`StoredFile`) without third-party vendor lock-in.
- **Atomic Concurrency Guarantee**: Concurrent NGO acceptances are protected by database transactions ensuring **exactly one NGO** wins a donation with zero race conditions.

### Phase 4: Volunteer Lifecycle, Delivery & Inventory
- **Smart Dispatch**: NGOs assign affiliated volunteers to collected donations.
- **Security & Privacy**: Donor contact and exact pickup address are strictly masked from volunteers until assignment dispatch.
- **Proof of Delivery**: Photo proof required before finalizing drop-off at NGO shelters.
- **Automated Inventory & Receipts**: Delivery auto-generates official PDF-compatible receipts (`DC-REC-XXXX`) and adds verified goods to warehouse stock.

### Phase 5: Dashboards, Community Requests & Admin Platform
- **Role-Specific Dashboards**: Custom metrics for Donors, NGOs, and Volunteers.
- **Community Beneficiary Requests**: NGOs post urgent shelter needs matched against incoming stock.
- **Admin Verification Console**: Platform administrators audit incoming NGOs, inspect certificates, approve/reject partners, and manage platform safety.

### Phase 6: Collaboration & Coordination
- **360° Reputation & Ratings**: Multi-directional feedback between Donors, NGOs, and Couriers with live average rating computation.
- **Per-Donation Coordination Chat**: Real-time messaging thread between Donors, NGOs, and assigned Volunteers.
- **NGO Team Management & Private Notes**: Multi-tier organization roles (`OWNER`, `MANAGER`, `STAFF`) with private internal audit/shelter notes.
- **Volunteer Karma Rewards**: Gamified rewards and points timeline honoring humanitarian delivery milestones.

### Phase 7: Google Maps & Explainable Impact Estimation
- **One-Tap Google Maps Routing**: Direct turn-by-turn navigation for volunteers to donor pickup spots and NGO warehouses across Android, iOS, and Web.
- **Explainable Community Impact**: Real-time projection of lives helped, meals served, and CO₂ diverted from landfills before submitting donations.
- **Donor Lifetime Impact**: Cumulative environmental and relief statistics on donor dashboards.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Mobile App (Frontend)** | React Native (Expo SDK 54), Expo Router, TypeScript, Custom Clean Light Theme |
| **Backend API** | Node.js, Express, TypeScript, Helmet, CORS, Express-Rate-Limit, Zod |
| **Database & ORM** | Neon Serverless PostgreSQL, Prisma ORM |
| **Authentication** | JSON Web Tokens (Access + Refresh), bcryptjs |
| **Testing** | Vitest, Supertest (34 passing end-to-end tests) |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo Go (or Android/iOS Simulator) for mobile testing

### 2. Backend Setup
```bash
cd backend
npm install

# Environment Configuration
# Ensure .env has DATABASE_URL, DIRECT_URL, JWT_SECRET, and ADMIN credentials configured

# Database Migration & Seed
npx prisma db push
npx ts-node prisma/seed.ts

# Start Development Server
npm run dev
```

Default Admin Credentials:
- **Email**: `admin@donateconnect.org`
- **Password**: `AdminSecurePassword123!`

### 3. Mobile App Setup
```bash
cd App
npm install

# Start Expo Development Server
npm run start
```

### 4. Running Tests
```bash
cd backend
npx vitest run
```
All 7 test suites (34 tests) validate authentication, atomic acceptance, delivery workflows, reports, collaboration, and impact estimation.

---

## 🔒 Security & Hardening (Phase 8)
- **Strict Server-Side Authorization**: Enforced across every route with `authenticate` and `authorizeRoles`.
- **Database Indexing**: Optimized composite indexes on `Donation`, `Ngo`, `VolunteerProfile`, `ChatMessage`, and `Rating`.
- **Zero Information Leakage**: Production errors sanitize stack traces and expose standardized error codes (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`).
- **Input Sanitization**: Request bodies and queries validated via Zod schemas and type guards.
- **Privacy Assurance**: Donor contact details remain private to public and unassigned users.
