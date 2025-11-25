# EmpowerLink CRM System

## Project Overview
A comprehensive CRM system for managing three categories of healthcare clients (NDIS, Support at Home, and Private) with extensive data tracking including personal details, NDIS/HCP plan information, care team management, clinical documentation, service delivery records, and financial management.

## Current Status
### ✅ Completed Modules
1. **Client Management**
   - Three client categories: NDIS, Support at Home (with HCP fields), Private
   - Full CRUD operations with real backend API integration
   - Client profiles with care team, clinical notes, and document tracking
   - Conditional fields for each category type

2. **Database Schema**
   - PostgreSQL with complete table structure
   - Clients table with JSON fields for flexible data storage
   - Progress Notes table for activity tracking
   - Budgets table for fund allocation and tracking
   - Documents table for document management
   - Invoices table for billing and payment tracking

3. **Frontend Features**
   - Dashboard with gradient-coded urgency tiles (blue/green/amber/red)
   - Client list with category filtering
   - Client profile views with tabbed interface
   - Add/Edit client forms with category-specific fields
   - All interactive elements have proper data-testid attributes

4. **API Integration**
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
- Navy blue professional healthcare theme

### Backend Stack
- Express.js
- PostgreSQL with Neon
- Drizzle ORM for type-safe database operations
- Zod for schema validation

### Key Files
- `shared/schema.ts` - Database schema and Zod validations
- `server/storage.ts` - Database operations interface
- `server/routes.ts` - API endpoints with proper validation
- `client/src/pages/` - Page components (Dashboard, Clients, ClientProfile, AddClient, EditClient)
- `client/src/components/ClientForm.tsx` - Tabbed form for client creation/editing

## Features Overview

### Client Module
- **Basic Information**: Name, DOB (auto-calculates age), phone, email, Medicare number, address, NOK/EPOA
- **Clinical**: Main diagnosis, communication needs, high-intensity supports, clinical notes
- **Care Team**: Care Manager, Leadership, GP, Support Coordinator, Plan Manager
- **Category-Specific Fields**:
  - **NDIS**: NDIS number, funding type, plan dates, consent form date
  - **Support at Home**: HCP number, HCP funding level, schedule of supports
  - **Private**: Payment method, service rates, billing preferences
- **Document Tracking**: 9 compliance dates (service agreement, consent, risk assessment, medication, etc.)

### Financial Module
- Budgets: Track allocation by category, start/end dates, usage calculation
- Invoices: Invoice number, date, amount, status (pending/paid/overdue)
- Budget categories: ADLs, Community Access, Nursing, Travel/Transport

### Documents Module
- Central repository for client documents
- Document types: Consent forms, Care Plans, Reports, Risk Assessments, etc.
- Upload tracking with dates

### Progress & Activity Tracking
- Progress notes with types: progress, clinical, incident, complaint, feedback
- Author and date tracking for compliance

## User Categories (Prepared for Future Implementation)
- Admin: Full access
- Care Managers: View/edit own clients
- Nurses: Add notes/records

## Next Steps for Enhancement
1. Document upload functionality (currently schema in place, UI pending)
2. Progress notes UI and management
3. Budget tracking and alerts
4. Invoice creation and approval workflow
5. Compliance dashboard with upcoming renewal alerts
6. Email/SMS notification reminders
7. Data import from Excel
8. Reporting dashboards
9. Activity audit trails
10. Role-based access control

## Design System
- **Colors**: Navy blue primary theme (#001F3F), gradient urgency indicators
- **Components**: Shadcn UI with Tailwind CSS
- **Typography**: Bold, clear information hierarchy
- **Spacing**: Consistent medium spacing between elements
- **Icons**: Lucide React for actions and visual cues

## Database Schema Summary

### Tables
- `clients` - Core client data with JSON fields for nested data
- `progress_notes` - Activity logging and clinical notes
- `budgets` - Budget allocation and tracking
- `documents` - Document management
- `invoices` - Billing and payment tracking
- `users` - User authentication (prepared for future)

## API Endpoints
- `GET /api/clients` - List all clients (supports search and category filter)
- `GET /api/clients/:id` - Get specific client
- `POST /api/clients` - Create new client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

## Notes
- Support at Home category includes HCP-specific fields (Health Care Packages)
- All dates are properly formatted and validated
- Schema supports 40+ compliance form dates through clinical documents JSON
- Real-time reactivity with React Query cache invalidation
- Professional navy blue theme reflects healthcare industry standards
