# GEM_MODX: Enterprise IT Asset Management System

## Overview
A high-end, multi-tenant IT Asset and Infrastructure Management system designed for enterprise hospital environments. It features a premium modern UI, a robust Node.js backend architecture, and comprehensive tracking for hardware, software, surveillance, and helpdesk operations.

## Technology Stack

### Frontend
- **Framework:** React 18, Vite
- **Routing:** React Router DOM v6
- **Styling:** TailwindCSS (customized with Vanilla CSS variables for dynamic theming)
- **UI Architecture:** Custom-built glassmorphism components
- **Graphics & Visuals:** Lucide React (Icons), Recharts (Data Visualization)
- **State Management:** React Context API (`AuthContext`, `ThemeContext`)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (using Mongoose ODM)
- **Architecture:** Multi-Tenant context management with a Global Identity Store.
- **Authentication:** JWT (JSON Web Tokens), bcrypt password hashing

---

## Core Modules & Features

### 1. Identity & Access Management (IAM)
- **Role-Based Access Control (RBAC):**
  - **Super Admin:** Global system access, overarching user management, and configuration control.
  - **Branch Admin:** Full operational (CRUD) permissions restricted to assigned branches.
  - **Viewer:** Read-only access to specifically assigned branches.
- **Granular Page-Level Access:** Explicit permission checkboxes (Management, Resources, Support, System) allowing restriction/granting of exact module access per user.
- **Route Security:** A custom `PageGuard` component intercepts unauthorized navigation attempts with a secure fallback UI.

### 2. Multi-Tenant Branch System
- Users log in, are authenticated globally, and then select their operational branch (e.g., Chennai, Madurai).
- Application data (assets, tickets, stock) is seamlessly segregated by the chosen branch context, ensuring operational focus and data isolation via custom Mongoose model injectors.

### 3. Comprehensive Asset Tracking
- **Hardware Assets:** Laptops, Desktops, Servers, Printers, etc. Tracks hostnames, MAC addresses, configurations, OS, warranty dates, and physical locations.
- **Software Licenses:** Tracks platform keys, expiration timelines, concurrent seat limits, and device assignments.
- **Surveillance Systems:** Tracks NVR/DVR hardware, Camera IP mappings, and credential management across facility zones.
- **Communication Devices:** Landlines, VoIP phones, Intercoms, and Mobile SIM allocations.

### 4. Stock & Inventory Management
- **Dynamic Ledger:** Tracks inward (purchases) and outward (issuances) stock transactions to build an immutable history, rather than simple quantity overrides.
- **Threshold Alerts:** Built-in calculation for Minimum Stock Level warnings on the dashboard.

### 5. Helpdesk & Ticketing Support
- End-to-end IT support ticket lifecycle management (Open, In Progress, Resolved, Closed).
- Internal resolution logging, status tracking, and technician assignment.

### 6. Master Data Management (Control Panel)
- A highly centralized configuration system for system definitions:
  - System Setup: Asset Categories, Types, Statuses.
  - Organization: Departments, Floors, Storage Types.
  - External: Vendors, Brands.
- Features URL deep-linking directly from specific operational pages into their relevant Master Setup tabs.

### 7. Dashboards & Analytics
- Context-aware dashboards presenting Key Performance Indicators (KPIs) relevant to the active branch.
- Visual charts mapping asset distribution and system health.
- **Global Command Palette:** (CTRL+K / CMD+K) enabled instant system-wide searching for rapid hardware/software retrieval.

### 8. Preventative Maintenance (PM) & Auditing
- Scheduled maintenance planning and execution tracking.
- Handover protocols, deployment tracking, and chronological Activity Audit logging for accountability.

---

## UI/UX Engineering
The visual language of GEM_MODX represents premium, frictionless software design:
- **Glassmorphism:** Implementation of frosted glass effects, subtle semi-transparent backgrounds, and structural backdrop-blurs.
- **Dynamic Theming:** Seamless Light/Dark mode transitions synced with the server to persist across user sessions.
- **Micro-Animations:** Pulsing status indicators, button shimmer sweeps, scale-on-hover layout cards, and fluid page transitions.
- **Design Consistency:** Reusable design tokens enforced via `index.css` global variables, allowing for immediate application-wide color palette shifts.

---

## Project Structure

```text
/IT Asset
 ├── backend/
 │   ├── src/
 │   │   ├── config/       (DB connections, tenant managers, logger)
 │   │   ├── controllers/  (Business logic for API endpoints)
 │   │   ├── middleware/   (RBAC checks, error handlers, model injectors)
 │   │   ├── models/       (Mongoose Schemas for global/tenant data structure)
 │   │   ├── routes/       (Express route definitions)
 │   │   ├── services/     (Background algorithms, database seeders)
 │   │   └── utils/        (General helper functions)
 │   ├── server.js         (Node.js App Entry Point)
 │   └── .env              (Environment Variable Configurations)
 │
 ├── frontend/
 │   ├── src/
 │   │   ├── api/          (Axios client configs and API interceptors)
 │   │   ├── components/   (Reusable UI abstractions, Page Layouts, Data Tables)
 │   │   ├── config/       (Centralized settings, e.g., pages.js registry)
 │   │   ├── context/      (React Context Providers for Global State)
 │   │   ├── pages/        (Dedicated visual module route components)
 │   │   └── index.css     (Global CSS variables & Tailwind directives)
 │   ├── App.jsx           (Root React Component & Route mapping)
 │   ├── main.jsx          (DOM Entry Point)
 │   └── tailwind.config.js(Theme extensions)
 │
 └── project.md            (This documentation)
```

---

## Setup & Execution

### Prerequisites
- Node.js (v18+)
- Local MongoDB Server OR MongoDB Atlas connection

### Backend Setup
1. Navigate to `/backend`
2. Run `npm install`
3. Rename `.env.example` to `.env` and fill in secrets (MongoDB URI, JWT Secret).
4. Run `npm run dev` (Starts server on `http://localhost:5000`)

### Frontend Setup
1. Navigate to `/frontend`
2. Run `npm install`
3. Configure environment variables (if API base URLs differ from default).
4. Run `npm run dev` (Starts Vite dev server on `http://localhost:3000`)

---

## Security Posture
- **Data Protection:** Passwords are mathematically hashed via `bcrypt` exclusively on the server.
- **Session Control:** API protected via stateless, short-lived JSON Web Tokens passed securely over HTTP headers.
- **Data Isolation:** Tenant data separated logically via the model injection architecture to absolutely ensure branch admins cannot access unrelated site data.
