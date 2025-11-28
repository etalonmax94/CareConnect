# EmpowerLink CRM System

## Overview
EmpowerLink is a comprehensive CRM system for healthcare providers managing NDIS, Support at Home, and Private clients. Its core purpose is to centralize client data, streamline operations, enhance care coordination, and improve data management efficiency while ensuring compliance with Australian privacy regulations. Key capabilities include robust client and staff management, an interactive dashboard, detailed reporting, and an Australian Privacy Act-compliant archiving system. The system aims to provide a centralized hub for all client-related information and operational workflows.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The system features a professional navy blue theme, utilizes Shadcn UI components with Tailwind CSS for responsiveness, and incorporates interactive elements like gradient-coded urgency tiles and clickable stat cards. Typography emphasizes clear information hierarchy, and Lucide React icons provide visual cues. The UI is designed for intuitive navigation and efficient data entry, including a mobile-first approach for wizard UIs.

### Technical Implementations
-   **Frontend**: React with TypeScript, Wouter for routing, React Query for server state management, and Recharts for data visualization.
-   **Backend**: Express.js, PostgreSQL with Neon, and Drizzle ORM for type-safe database operations. Zod is used for schema validation.
-   **Authentication**: Zoho OAuth2 for secure login with session-based authentication and multi-role access control.
-   **Client Management**: Full CRUD operations for NDIS, Support at Home, and Private clients, including critical medical information and compliance date tracking.
-   **Data Management**: Dropdown selections for various providers (GPs, Pharmacies, etc.) with auto-display of contact information.
-   **Archiving**: Australian Privacy Act compliant 7-year retention policy with server-side retention calculation, activity logging, and read-only enforcement.
-   **Global Search**: Fuzzy matching search for clients and documents.
-   **Reporting**: Interactive age demographics, incident reports, budget reports, and missing documents reports, including comprehensive financial reports with date range filtering and export options.
-   **NDIS Quote System**: Comprehensive NDIS service quotation with NDIS Price Guide integration, detailed rate breakdowns, and PDF generation.
-   **Appointments & Scheduling**: Full scheduling with status tracking, recurrence patterns, travel buffers, multi-staff assignment with acceptance workflow, and GPS-enabled check-in/check-out.
-   **Staff Allocation & Team Tracking**: Client-staff preferences, staff restrictions, availability windows, unavailability periods, and real-time staff status logging.
-   **Versioned Care Plans**: Immutable versioning with audit trails, health matters, diagnoses (with ICD-10 codes), emergency contacts, and procedures.
-   **Customizable Forms System**: Category-based templates with 12 dynamic field types, validation rules, conditional logic, submission tracking, and digital signatures.
-   **Non-Face-to-Face Service Logging**: Tracks non-face-to-face client interactions with method selection, duration, and context.
-   **Diagnoses Management**: Global diagnoses library with ICD-10 codes, linked to clients with primary/secondary designation, onset dates, severity, and status.
-   **Document Management**: Comprehensive folder-based organization per client, with 10 main categories, tracking compliance status for key documents, customizability, archive workflow, and global search integration.
-   **Care Team Directory**: Centralized page for all provider types, with quick access and client overview indicators.
-   **Service Subtypes**: Admin-managed service subtypes associated with clients.
-   **Falls Risk Assessment Tool (FRAT)**: Peninsula Health standard 4-category scoring system with auto-high-risk triggers and score calculation.
-   **NDIS Consent Form Tracking**: Independent compliance tracking for NDIS-specific consent forms.

### System Design Choices
-   **Database Schema**: PostgreSQL with Drizzle ORM, comprehensive tables for clients, goals, notes, incidents, documents, staff, appointments, care plans, quotes, and customizable forms.
-   **API Integration**: Express.js backend with React Query frontend for data fetching and caching, using Zod schemas for validation.
-   **Date Handling**: Robust date formatting and validation, supporting over 40 compliance form dates.
-   **Distance Calculation**: Uses the Haversine formula for distance calculations.
-   **Provider Dialogs**: Consolidated shared components for adding, editing, and deleting various provider types for consistency.
-   **Field Renaming**: HCP references updated to Support at Home (SaH) for consistency.

## External Dependencies
-   **Zoho OAuth2**: User authentication and authorization.
-   **PostgreSQL (Neon)**: Main relational database.
-   **Zoho WorkDrive**: Document storage integration.
-   **Connecteam**: Staff scheduling (quick access button).
-   **Recharts**: Data visualization library.
-   **Shadcn UI & Tailwind CSS**: UI components and styling framework.
-   **Lucide React**: Icon library.
-   **@react-pdf/renderer**: PDF generation library.
-   **Zapier**: Webhook integration for client creation.