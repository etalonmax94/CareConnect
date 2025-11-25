# EmpowerLink CRM System

## Project Overview
A comprehensive CRM system for managing three categories of healthcare clients (NDIS, Support at Home, and Private) with extensive data tracking including personal details, NDIS/HCP plan information, care team management, clinical documentation, service delivery records, financial management, and Australian privacy compliance.

## Current Status
### ✅ Completed Modules

1. **Client Management**
   - Three client categories: NDIS, Support at Home (with HCP fields), Private
   - Full CRUD operations with real backend API integration
   - Client profiles with care team, clinical notes, and document tracking
   - Conditional fields for each category type
   - Notification preferences (SMS/Call/Email/N/A) for schedule and arrival notifications

2. **Interactive Dashboard**
   - Gradient-coded urgency tiles (blue/green/amber/red)
   - Clickable stat cards with drill-down modals showing filtered client data
   - New Clients (30 days) with detailed list modal
   - Compliance Rate with overdue clients modal
   - Due This Month and Overdue Items with client lists
   - Recent Activity feed with client events

3. **Reports System**
   - Age Demographics chart using Recharts
   - Incident Reports graph with monthly visualization
   - Budget Reports by category and client
   - Missing Documents report for compliance tracking
   - Distance From Office report (from Caboolture: 9/73-75 King Street)

4. **Settings Management**
   - Office location configuration (default: 9/73-75 King Street, Caboolture QLD 4510)
   - Report preferences and display settings
   - Company information management

5. **Database Schema**
   - PostgreSQL with complete table structure
   - Clients table with JSON fields for flexible data storage
   - Progress Notes table for activity tracking
   - Budgets table for fund allocation and tracking
   - Documents table for document management
   - Invoices table for billing and payment tracking
   - Settings table for application configuration
   - PrivacyConsent table for Australian privacy compliance
   - ActivityLog table for audit trails
   - IncidentReports table for incident tracking

6. **Australian Privacy Compliance**
   - Privacy consent tracking with collection dates
   - Activity logging for audit trails
   - Consent tracking with collection dates
   - Audit fields for data changes

7. **API Integration**
   - Backend: Express.js with Drizzle ORM
   - Frontend: React Query for data fetching and caching
   - Proper validation using Zod schemas
   - Date handling and parsing
   - Search and filter functionality

## Architecture

### Frontend Stack
- React with TypeScript
- Wouter for routing
- React Query (TanStack Query) for server state
- Shadcn UI components with Tailwind CSS
- Recharts for data visualization
- Navy blue professional healthcare theme

### Backend Stack
- Express.js
- PostgreSQL with Neon
- Drizzle ORM for type-safe database operations
- Zod for schema validation

### Key Files
- `shared/schema.ts` - Database schema and Zod validations (includes Settings, PrivacyConsent, ActivityLog, IncidentReports)
- `server/storage.ts` - Database operations interface
- `server/routes.ts` - API endpoints with proper validation
- `client/src/pages/Dashboard.tsx` - Interactive dashboard with clickable tiles
- `client/src/pages/Reports.tsx` - Reports page with charts
- `client/src/pages/Settings.tsx` - Settings management
- `client/src/pages/Clients.tsx` - Client list with filtering
- `client/src/pages/ClientProfile.tsx` - Client profile view
- `client/src/pages/AddClient.tsx` - Add new client
- `client/src/pages/EditClient.tsx` - Edit existing client
- `client/src/components/ClientForm.tsx` - Tabbed form for client creation/editing

## Features Overview

### Client Module
- **Basic Information**: Name, DOB (auto-calculates age), phone, email, Medicare number, address, NOK/EPOA
- **Communication**: Notification preferences (SMS/Call/Email/N/A) for schedules and arrivals
- **Clinical**: Main diagnosis, communication needs, high-intensity supports, clinical notes
- **Care Team**: Care Manager, Leadership, GP, Support Coordinator, Plan Manager
- **Category-Specific Fields**:
  - **NDIS**: NDIS number, funding type, plan dates, consent form date
  - **Support at Home**: HCP number, HCP funding level, schedule of supports
  - **Private**: Payment method, service rates, billing preferences
- **Document Tracking**: 9 compliance dates (service agreement, consent, risk assessment, medication, etc.)

### Dashboard Module
- Interactive stat cards with hover effects
- Click to drill-down into filtered client lists via modals
- Total Clients showing new clients in last 30 days
- Compliance Rate with overdue/due status
- Due This Month for upcoming document renewals
- Overdue Items for urgent attention
- Recent Activity feed with meaningful events

### Reports Module
- **Age Demographics**: Pie chart showing client age distribution (0-17, 18-34, 35-54, 55-74, 75+)
- **Incident Reports**: Bar chart of incidents by month
- **Budget Reports**: Spending by category (ADLs, Community Access, Nursing, Travel)
- **Missing Documents**: List of clients with incomplete compliance documents
- **Distance From Office**: Client locations with distance calculation from Caboolture office

### Settings Module
- Office Location: Configure office address (default: Caboolture)
- Report Preferences: Default date ranges and formats
- Company Information: Organization details

### Financial Module
- Budgets: Track allocation by category, start/end dates, usage calculation
- Invoices: Invoice number, date, amount, status (pending/paid/overdue)
- Budget categories: ADLs, Community Access, Nursing, Travel/Transport

### Documents Module
- Central repository for client documents
- Document types: Consent forms, Care Plans, Reports, Risk Assessments, etc.
- Upload tracking with dates

### Privacy & Compliance Module
- Australian Privacy Act compliance tracking
- Consent collection dates and renewal reminders
- Activity audit logs for all data changes
- Data retention policies

## API Endpoints

### Clients
- `GET /api/clients` - List all clients (supports search and category filter)
- `GET /api/clients/:id` - Get specific client
- `POST /api/clients` - Create new client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/new/30` - Get clients created in last 30 days

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/age-demographics` - Age distribution data
- `GET /api/reports/incidents` - Incident statistics
- `GET /api/reports/budgets` - Budget allocation data
- `GET /api/reports/missing-documents` - Clients with missing docs
- `GET /api/reports/distance` - Distance calculations from office

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get specific setting
- `PUT /api/settings` - Update settings

### Activity
- `GET /api/activity` - Get activity log
- `POST /api/activity` - Log new activity

### Privacy
- `GET /api/privacy-consent/:clientId` - Get client consent records
- `POST /api/privacy-consent` - Record new consent

## Design System
- **Colors**: Navy blue primary theme (#001F3F), gradient urgency indicators
- **Components**: Shadcn UI with Tailwind CSS
- **Typography**: Bold, clear information hierarchy
- **Spacing**: Consistent medium spacing between elements
- **Icons**: Lucide React for actions and visual cues
- **Charts**: Recharts for data visualization

## Database Schema Summary

### Tables
- `clients` - Core client data with JSON fields for nested data
- `progress_notes` - Activity logging and clinical notes
- `budgets` - Budget allocation and tracking
- `documents` - Document management
- `invoices` - Billing and payment tracking
- `users` - User authentication (prepared for future)
- `settings` - Application configuration key-value store
- `privacy_consent` - Consent tracking for privacy compliance
- `activity_log` - Audit trail of all system activities
- `incident_reports` - Incident tracking and reporting

## Notes
- Support at Home category includes HCP-specific fields (Health Care Packages)
- All dates are properly formatted and validated
- Schema supports 40+ compliance form dates through clinical documents JSON
- Real-time reactivity with React Query cache invalidation
- Professional navy blue theme reflects healthcare industry standards
- Dashboard tiles are interactive - click to see filtered client data
- Distance calculations use Haversine formula from Caboolture office coordinates
- Privacy compliance meets Australian Privacy Act requirements
