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
- **Database Schema**: PostgreSQL with Drizzle ORM, including tables for clients, goals, notes, incidents, documents, staff assignments, service deliveries, budgets, invoices, quotes, NDIS price guide items, appointments, care plans, and customizable forms.
- **API Integration**: Express.js backend with React Query frontend for data fetching and caching, using Zod schemas for validation.
- **Date Handling**: Robust date formatting and validation, supporting over 40 compliance form dates.
- **Distance Calculation**: Uses the Haversine formula for distance calculations.

### New Feature Expansions (November 2025)

#### Appointments & Scheduling System
- **Appointments Table**: Full scheduling with status tracking (Scheduled, In Progress, Completed, Cancelled, Missed), recurrence patterns (RRULE format), travel buffers, and location support.
- **Appointment Assignments**: Multi-staff assignment with roles (Primary, Secondary, Shadow), acceptance workflow (Pending, Accepted, Declined, Reassigned), and notification tracking.
- **Check-in/Check-out**: GPS-enabled location verification with timestamp tracking for accountability.
- **API Endpoints**: Full CRUD for appointments, assignments, and check-ins with date range queries.

#### Staff Allocation & Team Tracking
- **Client-Staff Preferences**: Three-tier preference system (Primary, Secondary, Backup) with notes, service type specificity, and effective dates.
- **Staff Restrictions (Blacklist)**: Time-bounded restrictions with reasons, created-by tracking, and active/inactive status.
- **Availability Windows**: Weekly recurring availability slots per staff member with service location preferences.
- **Unavailability Periods**: Leave/holiday tracking with status (Pending, Approved, Rejected) and approval workflow.
- **Staff Status Logs**: Real-time status tracking (Available, On Shift, Break, Travel, Unavailable, Off Duty) with GPS location.

#### Versioned Care Plans
- **Care Plans**: Immutable versioning system with status (Draft, Active, Archived), version numbers, and full audit trail.
- **Health Matters**: Categorized health information (Medical Condition, Allergy, Medication, etc.) with management instructions.
- **Diagnoses**: Primary/secondary diagnosis tracking with severity, status, onset dates, and ICD-10 codes.
- **Emergency Contacts**: Priority-ordered contacts with relationship, availability windows, and notification preferences.
- **Emergency Procedures**: Step-by-step emergency protocols with scenarios and review dates.

#### Customizable Forms System
- **Form Templates**: Category-based templates (Intake, Assessment, Care Plan, Incident, Progress Note, Consent, Custom) with versioning and active/draft/archived status.
- **Dynamic Fields**: 12 field types (Text, Textarea, Number, Date, Time, Checkbox, Radio, Select, Multi-select, Signature, File Upload, Section Header) with validation rules, conditional logic, and placeholder support.
- **Form Submissions**: Complete submission tracking with status (Draft, Submitted, Under Review, Approved, Rejected) and locked state for signed forms.
- **Digital Signatures**: Tamper-proof signatures with SHA-256 integrity hash, IP address, and signature role tracking.
- **Appointment-Form Linking**: Required forms configuration per appointment type.

#### Non-Face-to-Face Service Logging
- **Service Log Table**: Tracks non-face-to-face client interactions with method selection (phone, email, video_call, plan_review, document_review), date/time, duration, location/context, and summary.
- **Client Profile Integration**: New "Non-F2F Services" tab in client profiles for viewing and logging non-face-to-face service interactions.
- **Full CRUD Operations**: Create, view, and delete functionality for service logs with React Query cache invalidation.
- **Staff Tracking**: Records who created each log entry and when.

#### Diagnoses Management System
- **Reusable Diagnoses List**: Global diagnoses library with ICD-10 codes, categories, and description support.
- **Client Diagnoses Association**: Link diagnoses to clients with primary/secondary designation, onset dates, severity, and status tracking.
- **Clinical Tab Integration**: Diagnoses selector component for the Clinical Tab in client profiles.

### Recent Updates (November 2025)
- **HCP to Support at Home Renaming**: All HCP (Home Care Package) references have been renamed to Support at Home (SaH). Field names updated from `hcpNumber`/`hcpFundingLevel` to `sahNumber`/`sahFundingLevel`.
- **Leadership Field Removal**: The `leadership` field has been removed from the careTeam JSON structure per schema cleanup.

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