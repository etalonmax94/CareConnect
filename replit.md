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

### Data Interconnection
The system implements comprehensive data interconnection to eliminate manual retyping:
- **GP/Pharmacy Selection**: Dropdown selects from database; contact info auto-displays when selected
- **Staff Assignment Tracking**: Links staff members to clients with assignment types and date ranges
- **Progress Notes Author Tracking**: Links notes to staff members via authorId with clickable links to staff profiles
- **Incident Reports Staff Linking**: Links incidents to reporting staff member via reportedById
- **Document Management**: Links documents to clients with Zoho WorkDrive integration

### System Design Choices
- **Database Schema**: PostgreSQL with Drizzle ORM. Key tables include:
  - `clients` - Core client information with foreign keys to GPs, pharmacies
  - `progress_notes` - Clinical notes with authorId linking to staff
  - `incident_reports` - Safety incidents with reportedById linking to staff
  - `documents` - File metadata linked to clients
  - `client_staff_assignments` - Historical staff-client relationships
  - `service_deliveries` - NDIS-aligned visit records
  - `budgets`, `invoices` - Financial tracking
  - `users`, `settings`, `privacy_consent`, `activity_log`
  - `staff`, `support_coordinators`, `plan_managers`
  - `general_practitioners`, `pharmacies`
  - `ndis_services`
- **API Integration**: Express.js backend with React Query on the frontend for efficient data fetching and caching. Zod schemas for robust validation across API endpoints.
- **Date Handling**: All dates are properly formatted and validated, with schema support for 40+ compliance form dates.
- **Distance Calculation**: Uses the Haversine formula for distance calculations from the Caboolture office.

## API Endpoints

### Core Resources
- `GET/POST /api/clients` - List/create clients
- `GET/PATCH/DELETE /api/clients/:id` - Individual client operations
- `GET/POST /api/clients/:id/notes` - Progress notes with author tracking
- `GET/POST/DELETE /api/clients/:clientId/documents` - Document management
- `GET/POST/DELETE /api/clients/:clientId/assignments` - Staff assignments
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
