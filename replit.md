# EmpowerLink CRM System

## Overview
EmpowerLink is a comprehensive CRM system designed for healthcare providers to manage NDIS, Support at Home, and Private clients. It centralizes client data, including personal details, NDIS/HCP plan information, care team management, clinical documentation, service delivery records, and financial management. The system ensures compliance with Australian privacy regulations and aims to streamline operations, improve client care coordination, and enhance data management efficiency. Key capabilities include robust client and staff management, an interactive dashboard for quick insights, detailed reporting, and an Australian Privacy Act-compliant archiving system.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The system features a professional navy blue theme, reflecting healthcare industry standards. It utilizes Shadcn UI components with Tailwind CSS for a consistent and responsive design. Interactive elements, such as gradient-coded urgency tiles and clickable stat cards on the dashboard, provide an intuitive user experience. Typography prioritizes clear information hierarchy, and icons (Lucide React) are used for visual cues.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, React Query (TanStack Query) for server state management, and Recharts for data visualization.
- **Backend**: Express.js, PostgreSQL with Neon, and Drizzle ORM for type-safe database operations. Zod is used for schema validation.
- **Authentication**: Zoho OAuth2 for secure login with session-based authentication and multi-role selection for access control.
- **Client Management**: Full CRUD operations with conditional fields for different client categories (NDIS, Support at Home, Private). Includes prominent display of critical medical information like allergies and Advanced Care Directives.
- **Data Management**: Dropdown selections for GPs, Pharmacies, Support Coordinators, and Plan Managers to reduce manual entry errors. Contact information auto-displays when entities are selected.
- **Archiving**: Australian Privacy Act compliant 7-year retention policy with server-side retention calculation, activity logging, and read-only enforcement for archived clients.
- **Global Search**: Fuzzy matching search functionality for clients via a global search bar.
- **Reports**: Interactive age demographics chart with drill-down capabilities, incident reports, budget reports, and missing documents reports.

### Feature Specifications
- **Client Module**: Manages basic information, communication preferences (SMS, Call, Email), clinical data, and care team details. Supports category-specific fields for NDIS, Support at Home (HCP), and Private clients. Tracks 9 key compliance dates for documents.
- **Dashboard Module**: Provides an overview of client statistics, compliance rates, upcoming renewals, overdue items, recent activity, and birthday reminders. All tiles are interactive, allowing drill-down into filtered client lists.
- **Staff & Team Management**: Manages staff with defined roles (support_worker, nurse, care_manager, admin), Support Coordinators, and Plan Managers.
- **GP & Pharmacy Database**: Manages GP and Pharmacy details, integrated into client forms for easy selection with contact info auto-display.
- **Document Management**: Tracks 9 key compliance documents with expiry dates, allows linking to Zoho WorkDrive for file storage, and provides upload/view functionality.
- **Progress Notes**: Staff-linked progress notes with author tracking, categorized by type (progress, clinical, incident, complaint, feedback).
- **Incident Reports**: Staff-linked incident reporting with severity levels, status tracking, and action taken documentation.
- **Staff Assignments**: Tracks historical and current staff-client relationships with assignment types (primary support, secondary support, care manager, clinical nurse).
- **Settings Module**: Configures office location, report preferences, and company information.
- **Privacy & Compliance Module**: Tracks privacy consent with collection dates, maintains activity audit logs for all data changes, and enforces data retention policies.
- **Quotes Module**: Comprehensive NDIS service quotation system to replace Excel-based estimates. Features include:
  - Quote creation with searchable client picker (typeahead dropdown)
  - NDIS Price Guide integration for service item lookup (optional)
  - Detailed rate breakdown per line item:
    - Weekday hours and rates
    - Saturday hours and rates  
    - Sunday hours and rates
    - Public Holiday hours and rates
    - Evening hours and rates
    - Night hours and rates
  - Annual calculation settings:
    - Configurable weeks per year (48, 50, or 52)
    - QLD Public Holiday uplift toggle (adds rate difference for 12 public holidays)
  - Weekly and annual totals calculated automatically
  - GST exemption for NDIS services
  - Status workflow: draft → sent → accepted/declined/expired
  - Status history tracking with timestamps
  - Professional quote numbering (Q{YEAR}-{NUMBER})

### Data Interconnection
The system implements comprehensive data interconnection to eliminate manual retyping:
- **GP/Pharmacy Selection**: Dropdown selects from database; contact info auto-displays when selected
- **Staff Assignment Tracking**: Links staff members to clients with assignment types and date ranges
- **Progress Notes Author Tracking**: Links notes to staff members via authorId with clickable links to staff profiles
- **Incident Reports Staff Linking**: Links incidents to reporting staff member via reportedById
- **Document Management**: Links documents to clients with Zoho WorkDrive integration

### System Design Choices
- **Database Schema**: PostgreSQL with Drizzle ORM. Key tables include:
  - `clients` - Core client information with foreign keys to GPs, pharmacies, isOnboarded and riskAssessmentScore fields
  - `client_goals` - Up to 5 goals per client with title, description, targetDate, status, priority
  - `progress_notes` - Clinical notes with authorId linking to staff
  - `incident_reports` - Safety incidents with reportedById linking to staff
  - `documents` - File metadata linked to clients with expiryDate field
  - `client_staff_assignments` - Historical staff-client relationships
  - `service_deliveries` - NDIS-aligned visit records
  - `budgets`, `invoices` - Financial tracking
  - `users`, `settings`, `privacy_consent`, `activity_log`
  - `staff`, `support_coordinators`, `plan_managers`
  - `general_practitioners`, `pharmacies`
  - `ndis_services`
  - `ndis_price_guide_items` - NDIS Price Guide with support items, rates for different time periods
  - `quotes` - Service quotations with status tracking (draft, sent, accepted, declined, expired)
  - `quote_line_items` - Individual line items with NDIS support references, quantities, rates
  - `quote_status_history` - Audit trail for quote status changes
- **API Integration**: Express.js backend with React Query on the frontend for efficient data fetching and caching. Zod schemas for robust validation across API endpoints.
- **Date Handling**: All dates are properly formatted and validated, with schema support for 40+ compliance form dates.
- **Distance Calculation**: Uses the Haversine formula for distance calculations from the Caboolture office.

## API Endpoints

### Core Resources
- `GET/POST /api/clients` - List/create clients
- `GET/PATCH/DELETE /api/clients/:id` - Individual client operations
- `POST /api/clients/:id/onboard` - Mark client as onboarded
- `GET/POST /api/clients/:id/notes` - Progress notes with author tracking
- `GET/POST /api/clients/:clientId/goals` - Client goals (max 5 per client)
- `PATCH/DELETE /api/goals/:id` - Update/delete individual goals
- `GET/POST/DELETE /api/clients/:clientId/documents` - Document management
- `GET/POST/DELETE /api/clients/:clientId/assignments` - Staff assignments
- `DELETE /api/budgets/:id` - Delete budget allocation
- `GET /api/incidents/client/:clientId` - Client incidents
- `POST /api/incidents` - Create incident report with reportedById

### Supporting Resources
- `GET/POST /api/staff` - Staff management
- `GET/POST /api/gps` - GP database
- `GET/POST /api/pharmacies` - Pharmacy database
- `GET/POST /api/support-coordinators` - Support coordinators
- `GET/POST /api/plan-managers` - Plan managers

## External Dependencies
- **Zoho OAuth2**: For user authentication and authorization.
- **PostgreSQL (Neon)**: Relational database management system.
- **Zoho WorkDrive**: Document storage integration for client files.
- **Connecteam**: Integrated for quick access to staff scheduling (via a button in the header).
- **Recharts**: JavaScript charting library for data visualization.
- **Shadcn UI & Tailwind CSS**: UI component library and utility-first CSS framework.
- **Lucide React**: Icon library for visual cues.

## Recent Changes (November 2025)
- Added pharmacy dropdown to client form with contact info auto-display
- Implemented document upload/view functionality with Zoho WorkDrive integration
- Added progress notes author tracking with staff member selection
- Added incident reports with staff reporting linkage
- Implemented staff assignment tracking for clients
- Added comprehensive data interconnection across all entities
- **Client Goals Tab**: Up to 5 goals per client with status tracking (not_started, in_progress, achieved, on_hold) with UI and backend enforcement
- **Risk Assessment Badge**: Color-coded risk score badge next to client age (green 1-3, amber 4-6, red 7-10)
- **New Client Onboarding**: Blue banner for new clients with "Mark as Onboarded" button, "New" badge in client list
- **Budget Allocation UI**: Enhanced add/delete functionality with visual progress bars and NDIS-aligned categories
- **Client Table Improvements**: Care Manager displayed as "First Name + Initial" format, phone numbers with no-wrap styling
- **NDIS Quote System Completed**:
  - Searchable client picker with typeahead dropdown
  - Comprehensive rate breakdown per line item (weekday, Saturday, Sunday, public holiday, evening, night)
  - Configurable annual calculations (48/50/52 weeks)
  - QLD Public Holiday uplift toggle with rate difference calculation
  - Fixed annual calculation to avoid double-counting public holidays
  - Professional quote numbering (Q{YEAR}-{NUMBER})
  - Quote status workflow with history tracking
- **Quote PDF Generation**: Professional PDF export using @react-pdf/renderer with company branding, line item details, rate breakdowns, and annual totals
- **Quote-to-Budget Conversion**: Converts accepted quotes to budget allocations grouped by support category with one-click conversion workflow
- **Zapier Webhook Integration**: POST /api/referrals endpoint with API key authentication for auto-creating clients from Zoho Forms, includes GP/pharmacy/SC/PM upsert logic
- **Service-Budget Linking**: Service deliveries now link to budget categories via budgetId field with automatic budget usage tracking
- **Services Tab**: New tab in ClientProfile for recording service deliveries with budget linking, staff assignment, and real-time budget impact display
- **Budget Alerts Dashboard**: Color-coded alert card (green healthy, orange low budget 80%+, rose overspent 100%+) with modal showing detailed alerts by client
- **Dashboard Tiles Enhanced**:
  - Incidents to Action tile: Shows count of open/investigating incidents with orange gradient, clickable to view incident details
  - Unassigned Clients tile: Shows clients without care manager assignments with purple gradient, clickable to view client list
  - All tiles have interactive modals with drill-down navigation to client profiles
- **Client List Page Enhancements**:
  - White color scheme with subtle shadows for modern, clean appearance
  - List/Grid view toggle with responsive grid layout for client cards
  - Density controls (Compact/Standard/Expanded) for adjusting row height and information density
  - Column visibility dropdown with toggleable columns (Client column locked as required)
  - Quick action buttons on row hover (Call, Email, Add Appointment)
  - Three-dot menu with View/Edit/Assign Staff/Archive options
  - All preferences persisted to localStorage per user
- **NDIS Funding Type Badges**: Color-coded badges for NDIS funding management types:
  - Navy blue for Plan-Managed
  - Dark purple for Agency-Managed  
  - Orange for Self-Managed
  - Uses CSS variables for proper light/dark mode support
