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
-   **Help Desk & Support Tickets**: In-app issue reporting system with ticket creation, assignment, commenting, resolution workflow. Includes floating help widget for quick access and notification bell for real-time updates.
-   **Task Management System**: Comprehensive task tracking with categories (general, client_care, documentation, compliance, training, meeting, follow_up), priorities (low, medium, high, urgent), status workflow (not_started, in_progress, completed, cancelled), due dates, staff assignment, comments, and checklists.
-   **Real-Time Chat System**: Team messaging with direct messages and group chats. Features WebSocket-powered real-time messaging, typing indicators, online/offline presence, read receipts, and message history. Integrated with staff directory for easy conversation creation. Enhanced features include:
    -   **Message Replies**: iMessage-style threaded replies with quote bubbles showing original message preview
    -   **Message Forwarding**: Forward messages between rooms with source attribution and permission validation
    -   **Lifecycle Controls**: Admin lock/unlock, archive/unarchive, and soft delete for chat rooms
    -   **Role-Based Permissions**: Centralized ChatAuthorizationService checking user roles (admin, director, operations_manager, clinical_manager, etc.) and room membership
    -   **Audit Logging**: Comprehensive chat_audit_logs table tracking all chat events for HIPAA/privacy compliance
    -   **Media Attachments**: Support for photos (up to 15MB), videos (up to 60MB), and GIFs with chat_message_attachments table
    -   **GIF Integration**: Powered by GIPHY API with search, trending GIFs, and healthcare-appropriate categories
    -   **Staff Mentions/Tagging**: @mention functionality with autocomplete popup showing room participants, highlighted mentions in messages, and high-priority notifications for tagged staff
    -   **Admin Dashboard**: Filtered view of all chat rooms with search, pagination, and quick lifecycle actions
    -   **Quick Chat Popup**: Desktop-only floating panel (Sheet component) accessible from header icon. Displays unread message count badge, room list with avatars, and inline message view. Uses WebSocket for real-time updates with typing indicators. Allows quick responses without leaving current page.
    -   **Message Visibility Controls**: New chat members see only the last 5 messages before their join date plus all subsequent messages, protecting historical conversation privacy while maintaining context.
    -   **AES-256-GCM Encryption**: All chat messages encrypted using AES-256-GCM with dedicated CHAT_ENCRYPTION_KEY, per-message unique IVs, and key version metadata (v1:) for future rotation support. Encryption service in `server/services/encryption.ts`.
    -   **Media Retention Policy**: 30-day auto-expiry for all media attachments (photos, videos, GIFs). Schema includes `expiresAt`, `isExpired`, `expiredAt`, and `deletedReason` fields. Soft-delete approach preserves audit trail while clearing storage references.
    -   **Media Cleanup Routes**: Admin endpoints at `/api/chat/admin/media-cleanup` (manual trigger), `/api/chat/admin/media-stats` (statistics), `/api/chat/admin/expiring-attachments` (upcoming expiries). Scheduled cleanup via `/api/internal/media-cleanup` with INTERNAL_API_KEY auth for Cloud Scheduler.
    -   **Client-Chat Archive Integration**: When a client is archived, all associated client chat rooms are automatically archived with audit logging. Unarchiving a client restores chat rooms. Uses `archiveClientChatRooms` and `unarchiveClientChatRooms` storage methods.
    -   **Chat Room Avatars**: Customizable profile images for chat rooms with secure file handling. Room avatars stored in `uploads/chat-avatars/` with 5MB limit (JPEG/PNG/WebP). Client-type chats automatically display the client's profile photo as fallback. Settings panel allows room admins to upload, change, or remove chat photos. Security: Room-level authorization, path sanitization, extension whitelist, and automatic cleanup of orphaned files.
-   **Notifications & Alerts System**: Comprehensive real-time notification system with 19+ notification types (appointments, tasks, compliance, chat, tickets, client updates, etc.). Features WebSocket-powered instant delivery with polling fallback, per-user notification preferences with quiet hours, priority levels (normal, high, urgent), notification archiving, and full Notifications page with filtering and pagination. NotificationBell component in header shows unread badge with dropdown panel for quick access. Enhanced with permission-aware filtering that auto-archives chat notifications when users lose room access, batch archiving (500 IDs per batch) to prevent SQL parameter limit violations, and accurate unread counts that exclude archived items.

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