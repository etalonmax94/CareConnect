# EmpowerLink CRM System

## Overview
EmpowerLink is a comprehensive CRM system designed for healthcare providers managing NDIS, Support at Home, and Private clients. Its primary purpose is to centralize client data, streamline operations, enhance client care coordination, and improve data management efficiency while ensuring compliance with Australian privacy regulations. Key capabilities include robust client and staff management, an interactive dashboard, detailed reporting, and an Australian Privacy Act-compliant archiving system.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The system features a professional navy blue theme, utilizes Shadcn UI components with Tailwind CSS for responsiveness, and incorporates interactive elements like gradient-coded urgency tiles and clickable stat cards. Typography emphasizes clear information hierarchy, and Lucide React icons provide visual cues.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, React Query for server state management, and Recharts for data visualization.
- **Backend**: Express.js, PostgreSQL with Neon, and Drizzle ORM for type-safe database operations. Zod is used for schema validation.
- **Authentication**: Zoho OAuth2 for secure login with session-based authentication and multi-role access control.
- **Client Management**: Full CRUD operations with conditional fields for NDIS, Support at Home, and Private clients, including critical medical information display. Clients are assigned sequential numbers displayed as "C-1", "C-2", etc.
- **Data Management**: Dropdown selections for GPs, Pharmacies, Support Coordinators, and Plan Managers with auto-display of contact information.
- **Archiving**: Australian Privacy Act compliant 7-year retention policy with server-side retention calculation, activity logging, and read-only enforcement.
- **Global Search**: Fuzzy matching search for clients.
- **Reports**: Interactive age demographics, incident reports, budget reports, and missing documents reports, including comprehensive financial reports with date range filtering and export options.
- **NDIS Quote System**: Comprehensive NDIS service quotation system with NDIS Price Guide integration, detailed rate breakdowns, annual calculation settings, status workflow, and PDF generation.

### Feature Specifications
- **Core Modules**: Client, Dashboard, Staff & Team Management, GP & Pharmacy Database, Document Management, Progress Notes, Incident Reports, Staff Assignments, Settings, and Privacy & Compliance.
- **Client Features**: Manages basic information, communication preferences, clinical data, care team details, and tracks 9 key compliance dates.
- **Dashboard Features**: Overview of client statistics, compliance rates, renewals, overdue items, activity, and birthday reminders with interactive drill-down.
- **Privacy & Compliance**: Tracks privacy consent, maintains activity audit logs, and enforces data retention.

### System Design Choices
- **Database Schema**: PostgreSQL with Drizzle ORM, including tables for clients, goals, notes, incidents, documents, staff assignments, service deliveries, budgets, invoices, quotes, and NDIS price guide items.
- **API Integration**: Express.js backend with React Query frontend for data fetching and caching, using Zod schemas for validation.
- **Date Handling**: Robust date formatting and validation, supporting over 40 compliance form dates.
- **Distance Calculation**: Uses the Haversine formula for distance calculations.

## Developer Access (Development Only)
In development mode (`NODE_ENV=development`), a "Developer Access" panel appears on the login page below the Zoho login button. This allows developers to:
- Enter a custom display name
- Select a role (Admin, Manager, Care Coordinator, Support Worker, Finance, Viewer)
- Login without requiring Zoho OAuth credentials

The developer login creates a session with:
- User ID: `dev-user-001`
- Email: `test@empowerlink.local`
- Selected display name and role

This feature is automatically hidden in production builds (`import.meta.env.DEV` check on frontend, `NODE_ENV === "production"` check on backend).

## External Dependencies
- **Zoho OAuth2**: User authentication and authorization.
- **PostgreSQL (Neon)**: Relational database.
- **Zoho WorkDrive**: Document storage integration.
- **Connecteam**: Staff scheduling (quick access button).
- **Recharts**: Data visualization.
- **Shadcn UI & Tailwind CSS**: UI components and styling.
- **Lucide React**: Icon library.
- **@react-pdf/renderer**: PDF generation.
- **Zapier**: Webhook integration for client creation.