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
- **Data Management**: Dropdown selections for GPs, Pharmacies, Support Coordinators, and Plan Managers to reduce manual entry errors.
- **Archiving**: Australian Privacy Act compliant 7-year retention policy with server-side retention calculation, activity logging, and read-only enforcement for archived clients.
- **Global Search**: Fuzzy matching search functionality for clients via a global search bar.
- **Reports**: Interactive age demographics chart with drill-down capabilities, incident reports, budget reports, and missing documents reports.

### Feature Specifications
- **Client Module**: Manages basic information, communication preferences (SMS, Call, Email), clinical data, and care team details. Supports category-specific fields for NDIS, Support at Home (HCP), and Private clients. Tracks 9 key compliance dates for documents.
- **Dashboard Module**: Provides an overview of client statistics, compliance rates, upcoming renewals, overdue items, recent activity, and birthday reminders. All tiles are interactive, allowing drill-down into filtered client lists.
- **Staff & Team Management**: Manages staff with defined roles (support_worker, nurse, care_manager, admin), Support Coordinators, and Plan Managers.
- **GP & Pharmacy Database**: Manages GP and Pharmacy details, integrated into client forms for easy selection.
- **Settings Module**: Configures office location, report preferences, and company information.
- **Privacy & Compliance Module**: Tracks privacy consent with collection dates, maintains activity audit logs for all data changes, and enforces data retention policies.

### System Design Choices
- **Database Schema**: PostgreSQL with Drizzle ORM. Key tables include `clients`, `progress_notes`, `budgets`, `documents`, `invoices`, `users`, `settings`, `privacy_consent`, `activity_log`, `incident_reports`, `staff`, `support_coordinators`, `plan_managers`, `general_practitioners`, `pharmacies`, and `ndis_services`.
- **API Integration**: Express.js backend with React Query on the frontend for efficient data fetching and caching. Zod schemas for robust validation across API endpoints.
- **Date Handling**: All dates are properly formatted and validated, with schema support for 40+ compliance form dates.
- **Distance Calculation**: Uses the Haversine formula for distance calculations from the Caboolture office.

## External Dependencies
- **Zoho OAuth2**: For user authentication and authorization.
- **PostgreSQL (Neon)**: Relational database management system.
- **Connecteam**: Integrated for quick access to staff scheduling (via a button in the header).
- **Recharts**: JavaScript charting library for data visualization.
- **Shadcn UI & Tailwind CSS**: UI component library and utility-first CSS framework.
- **Lucide React**: Icon library for visual cues.