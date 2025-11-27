import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, date, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// User roles for role-based access control
export type UserRole = 
  | "support_worker" 
  | "enrolled_nurse" 
  | "registered_nurse" 
  | "admin" 
  | "operations_manager" 
  | "care_manager" 
  | "clinical_manager" 
  | "director";

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "support_worker", label: "Support Worker" },
  { value: "enrolled_nurse", label: "Enrolled Nurse" },
  { value: "registered_nurse", label: "Registered Nurse" },
  { value: "admin", label: "Admin" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "care_manager", label: "Care Manager" },
  { value: "clinical_manager", label: "Clinical Manager" },
  { value: "director", label: "Director" },
];

// Approval status for new users
export type ApprovalStatus = "pending" | "approved" | "rejected";

// Pre-approved admin emails (auto-approved on first login)
export const PRE_APPROVED_ADMINS: { email: string; role: UserRole }[] = [
  { email: "max.bartosh@empowerlink.au", role: "director" },
  { email: "bartoshmax@gmail.com", role: "director" },
  { email: "sarah.little@empowerlink.au", role: "operations_manager" },
];

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, {
  canAccessFunding: boolean;
  canAccessBudgets: boolean;
  canAccessFinancialReports: boolean;
  canExportFinancialData: boolean;
  canManageStaff: boolean;
  canManageClients: boolean;
  canApproveUsers: boolean;
  canViewAllClients: boolean;
  isFullAccess: boolean;
}> = {
  director: { canAccessFunding: true, canAccessBudgets: true, canAccessFinancialReports: true, canExportFinancialData: true, canManageStaff: true, canManageClients: true, canApproveUsers: true, canViewAllClients: true, isFullAccess: true },
  clinical_manager: { canAccessFunding: true, canAccessBudgets: true, canAccessFinancialReports: true, canExportFinancialData: true, canManageStaff: true, canManageClients: true, canApproveUsers: false, canViewAllClients: true, isFullAccess: true },
  operations_manager: { canAccessFunding: true, canAccessBudgets: true, canAccessFinancialReports: true, canExportFinancialData: true, canManageStaff: true, canManageClients: true, canApproveUsers: true, canViewAllClients: true, isFullAccess: true },
  admin: { canAccessFunding: true, canAccessBudgets: true, canAccessFinancialReports: true, canExportFinancialData: true, canManageStaff: true, canManageClients: true, canApproveUsers: false, canViewAllClients: true, isFullAccess: true },
  care_manager: { canAccessFunding: false, canAccessBudgets: true, canAccessFinancialReports: false, canExportFinancialData: false, canManageStaff: false, canManageClients: true, canApproveUsers: false, canViewAllClients: true, isFullAccess: false },
  registered_nurse: { canAccessFunding: false, canAccessBudgets: false, canAccessFinancialReports: false, canExportFinancialData: false, canManageStaff: false, canManageClients: false, canApproveUsers: false, canViewAllClients: false, isFullAccess: false },
  enrolled_nurse: { canAccessFunding: false, canAccessBudgets: false, canAccessFinancialReports: false, canExportFinancialData: false, canManageStaff: false, canManageClients: false, canApproveUsers: false, canViewAllClients: false, isFullAccess: false },
  support_worker: { canAccessFunding: false, canAccessBudgets: false, canAccessFinancialReports: false, canExportFinancialData: false, canManageStaff: false, canManageClients: false, canApproveUsers: false, canViewAllClients: false, isFullAccess: false },
};

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zohoUserId: text("zoho_user_id").unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  roles: json("roles").$type<UserRole[]>().notNull().default([]),
  approvalStatus: text("approval_status").default("pending").$type<ApprovalStatus>(),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  staffId: varchar("staff_id"),
  isFirstLogin: text("is_first_login").default("yes").$type<"yes" | "no">(),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  lastLoginAt: timestamp("last_login_at"),
  zohoAccessToken: text("zoho_access_token"),
  zohoRefreshToken: text("zoho_refresh_token"),
  zohoTokenExpiresAt: timestamp("zoho_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  roles: z.array(z.enum(["support_worker", "enrolled_nurse", "registered_nurse", "admin", "operations_manager", "care_manager", "clinical_manager", "director"])).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  isFirstLogin: z.enum(["yes", "no"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Helper function to check if user has permission
export function hasPermission(userRoles: UserRole[], permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean {
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.[permission]);
}

// Client types
export type ClientCategory = "NDIS" | "Support at Home" | "Private";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientNumber: serial("client_number").notNull(),
  category: text("category").notNull().$type<ClientCategory>(),
  participantName: text("participant_name").notNull(),
  photo: text("photo"),
  dateOfBirth: date("date_of_birth"),
  homeAddress: text("home_address"),
  streetAddress: text("street_address"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  medicareNumber: text("medicare_number"),
  nokEpoa: text("nok_epoa"),
  frequencyOfServices: text("frequency_of_services"),
  serviceSchedule: json("service_schedule").$type<{
    week1: { [day: string]: { startTime: string; endTime: string; }[] };
    week2: { [day: string]: { startTime: string; endTime: string; }[] };
    notes?: string;
  }>(),
  mainDiagnosis: text("main_diagnosis"),
  allergies: text("allergies"),
  advancedCareDirective: text("advanced_care_directive").$type<"NFR" | "For Resus" | "None" | null>(),
  advancedCareDirectiveDocumentId: varchar("acd_document_id"),
  summaryOfServices: text("summary_of_services"),
  communicationNeeds: text("communication_needs"),
  highIntensitySupports: text("high_intensity_supports").array(),
  clinicalNotes: text("clinical_notes"),
  scheduleArrivalNotification: text("schedule_arrival_notification"),
  notificationPreferences: json("notification_preferences").$type<{
    smsArrival?: boolean;
    smsSchedule?: boolean;
    callArrival?: boolean;
    callSchedule?: boolean;
    none?: boolean;
  }>(),
  zohoWorkdriveLink: text("zoho_workdrive_link"),
  isPinned: text("is_pinned").default("no").$type<"yes" | "no">(),
  
  // Onboarding status - new clients are highlighted until marked as onboarded
  isOnboarded: text("is_onboarded").default("no").$type<"yes" | "no">(),
  onboardedAt: timestamp("onboarded_at"),
  onboardedBy: varchar("onboarded_by"),
  
  // Risk assessment score (1-10) for clinical priority
  riskAssessmentScore: text("risk_assessment_score").$type<"1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10">(),
  riskAssessmentDate: date("risk_assessment_date"),
  riskAssessmentNotes: text("risk_assessment_notes"),
  
  // New profile fields for Overview page
  serviceType: text("service_type").$type<"Support Work" | "Nursing" | "Both" | null>(),
  parkingInstructions: text("parking_instructions"),
  attentionNotes: text("attention_notes"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  
  // Care Team - foreign keys for linked entities
  generalPractitionerId: varchar("general_practitioner_id"),
  pharmacyId: varchar("pharmacy_id"),
  
  // Care Team - stored as JSON (includes legacy string references)
  careTeam: json("care_team").$type<{
    careManager?: string;
    careManagerId?: string;
    leadership?: string;
    generalPractitioner?: string;
    pharmacy?: string;
    supportCoordinator?: string;
    planManager?: string;
    supportCoordinatorId?: string;
    planManagerId?: string;
    alliedHealthProfessionalId?: string;
    preferredWorkers?: string[];
    preferredWorkerIds?: string[];
    unsuitableWorkers?: string[];
    unsuitableWorkerIds?: string[];
    otherHealthProfessionals?: string[];
  }>().notNull().default({}),
  
  // NDIS Details - stored as JSON
  ndisDetails: json("ndis_details").$type<{
    ndisNumber?: string;
    ndisFundingType?: string;
    ndisPlanStartDate?: string;
    ndisPlanEndDate?: string;
    scheduleOfSupports?: string;
    ndisConsentFormDate?: string;
  }>(),
  
  // Support at Home Details - stored as JSON
  supportAtHomeDetails: json("support_at_home_details").$type<{
    hcpNumber?: string;
    hcpFundingLevel?: string;
    scheduleOfSupports?: string;
  }>(),
  
  // Private Client Details - stored as JSON
  privateClientDetails: json("private_client_details").$type<{
    paymentMethod?: string;
    serviceRates?: string;
    billingPreferences?: string;
  }>(),
  
  // Clinical Documents - stored as JSON
  clinicalDocuments: json("clinical_documents").$type<{
    serviceAgreementDate?: string;
    consentFormDate?: string;
    riskAssessmentDate?: string;
    selfAssessmentMedxDate?: string;
    medicationConsentDate?: string;
    personalEmergencyPlanDate?: string;
    carePlanDate?: string;
    healthSummaryDate?: string;
    woundCarePlanDate?: string;
  }>().notNull().default({}),
  
  // Archive fields for Australian Privacy Act compliance (7-year retention)
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  archivedByUserId: varchar("archived_by_user_id"),
  archiveReason: text("archive_reason"),
  retentionUntil: date("retention_until"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients, {
  participantName: z.string().min(1, "Participant name is required"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  category: z.enum(["NDIS", "Support at Home", "Private"]),
  dateOfBirth: z.string().optional().or(z.literal("")),
  advancedCareDirective: z.enum(["NFR", "For Resus", "None"]).optional().nullable(),
  advancedCareDirectiveDocumentId: z.string().optional().nullable(),
  generalPractitionerId: z.string().optional().nullable(),
  pharmacyId: z.string().optional().nullable(),
  careTeam: z.any().optional(),
  ndisDetails: z.any().optional(),
  supportAtHomeDetails: z.any().optional(),
  privateClientDetails: z.any().optional(),
  clinicalDocuments: z.any().optional(),
  notificationPreferences: z.any().optional(),
  isPinned: z.enum(["yes", "no"]).optional(),
  isOnboarded: z.enum(["yes", "no"]).optional(),
  riskAssessmentScore: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]).optional().nullable(),
  riskAssessmentDate: z.string().optional().nullable(),
  riskAssessmentNotes: z.string().optional().nullable(),
  serviceType: z.enum(["Support Work", "Nursing", "Both"]).optional().nullable(),
  parkingInstructions: z.string().optional().nullable(),
  attentionNotes: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  isArchived: z.enum(["yes", "no"]).optional(),
  archiveReason: z.string().optional().nullable(),
  retentionUntil: z.string().optional().nullable(),
  streetAddress: z.string().optional().nullable(),
  suburb: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
}).omit({
  id: true,
  clientNumber: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  archivedByUserId: true,
  onboardedAt: true,
  onboardedBy: true,
});

export const updateClientSchema = insertClientSchema.partial();

export const selectClientSchema = createSelectSchema(clients);

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Helper function to format client number as "C-X"
export function formatClientNumber(clientNumber?: number | null): string {
  if (!clientNumber) return "";
  return `C-${clientNumber}`;
}

// Helper function to calculate age
export function calculateAge(dateOfBirth?: Date | string | null): number | undefined {
  if (!dateOfBirth) return undefined;
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Progress Notes
export const progressNotes = pgTable("progress_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull().defaultNow(),
  note: text("note").notNull(),
  author: text("author").notNull(),
  authorId: varchar("author_id"),
  type: text("type").notNull().$type<"progress" | "clinical" | "incident" | "complaint" | "feedback">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProgressNoteSchema = createInsertSchema(progressNotes, {
  type: z.enum(["progress", "clinical", "incident", "complaint", "feedback"]),
  authorId: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertProgressNote = z.infer<typeof insertProgressNoteSchema>;
export type ProgressNote = typeof progressNotes.$inferSelect;

// Budgets
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  totalAllocated: text("total_allocated").notNull(),
  used: text("used").default("0").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  expiryDate: date("expiry_date"),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents, {
  expiryDate: z.string().optional().nullable(),
}).omit({
  id: true,
  uploadDate: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Client Goals - Up to 5 goals per client
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "on_hold";

export const clientGoals = pgTable("client_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  status: text("status").notNull().$type<GoalStatus>().default("not_started"),
  progress: text("progress"),
  order: text("order").default("1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientGoalSchema = createInsertSchema(clientGoals, {
  status: z.enum(["not_started", "in_progress", "achieved", "on_hold"]).optional(),
  targetDate: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientGoal = z.infer<typeof insertClientGoalSchema>;
export type ClientGoal = typeof clientGoals.$inferSelect;

// Invoices
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  amount: text("amount").notNull(),
  status: text("status").notNull().$type<"pending" | "paid" | "overdue">(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices, {
  status: z.enum(["pending", "paid", "overdue"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Activity Log for audit trail and recent activity
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  description: text("description").notNull(),
  performedBy: text("performed_by"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// Comprehensive Audit Log for detailed change tracking
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // client, document, note, incident, budget, etc.
  entityId: varchar("entity_id").notNull(),
  entityName: text("entity_name"), // Human-readable name of the entity
  operation: text("operation").notNull().$type<"create" | "update" | "delete" | "archive" | "restore">(),
  changedFields: text("changed_fields").array(), // List of fields that were changed
  oldValues: json("old_values").$type<Record<string, unknown>>(), // Previous values
  newValues: json("new_values").$type<Record<string, unknown>>(), // New values
  userId: varchar("user_id"),
  userName: text("user_name").notNull(),
  userRole: text("user_role"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }), // Related client if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog, {
  operation: z.enum(["create", "update", "delete", "archive", "restore"]),
  changedFields: z.array(z.string()).optional().nullable(),
  oldValues: z.record(z.unknown()).optional().nullable(),
  newValues: z.record(z.unknown()).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Incident Reports
export const incidentReports = pgTable("incident_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  incidentDate: timestamp("incident_date").notNull(),
  incidentType: text("incident_type").notNull().$type<"fall" | "medication" | "behavioral" | "injury" | "other">(),
  severity: text("severity").notNull().$type<"low" | "medium" | "high" | "critical">(),
  description: text("description").notNull(),
  actionTaken: text("action_taken"),
  reportedBy: text("reported_by").notNull(),
  reportedById: varchar("reported_by_id"),
  status: text("status").notNull().$type<"open" | "investigating" | "resolved" | "closed">().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIncidentReportSchema = createInsertSchema(incidentReports, {
  incidentType: z.enum(["fall", "medication", "behavioral", "injury", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "investigating", "resolved", "closed"]),
  reportedById: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIncidentReport = z.infer<typeof insertIncidentReportSchema>;
export type IncidentReport = typeof incidentReports.$inferSelect;

// Privacy Consent Tracking
export const privacyConsents = pgTable("privacy_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull().$type<"data_collection" | "data_sharing" | "marketing" | "research">(),
  granted: text("granted").notNull().$type<"yes" | "no" | "withdrawn">(),
  grantedDate: timestamp("granted_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  witnessName: text("witness_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPrivacyConsentSchema = createInsertSchema(privacyConsents, {
  consentType: z.enum(["data_collection", "data_sharing", "marketing", "research"]),
  granted: z.enum(["yes", "no", "withdrawn"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrivacyConsent = z.infer<typeof insertPrivacyConsentSchema>;
export type PrivacyConsent = typeof privacyConsents.$inferSelect;

// Staff Members
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  role: text("role").$type<"support_worker" | "nurse" | "care_manager" | "admin">().default("support_worker"),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffSchema = createInsertSchema(staff, {
  role: z.enum(["support_worker", "nurse", "care_manager", "admin"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

// Support Coordinators (External)
export const supportCoordinators = pgTable("support_coordinators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phoneNumber: text("phone_number"),
  organisation: text("organisation"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupportCoordinatorSchema = createInsertSchema(supportCoordinators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportCoordinator = z.infer<typeof insertSupportCoordinatorSchema>;
export type SupportCoordinator = typeof supportCoordinators.$inferSelect;

// Plan Managers (External)
export const planManagers = pgTable("plan_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phoneNumber: text("phone_number"),
  organisation: text("organisation"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlanManagerSchema = createInsertSchema(planManagers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlanManager = z.infer<typeof insertPlanManagerSchema>;
export type PlanManager = typeof planManagers.$inferSelect;

// NDIS Services for service tracking
export const ndisServices = pgTable("ndis_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  ndisCode: text("ndis_code").notNull(),
  serviceName: text("service_name").notNull(),
  hoursAllocated: text("hours_allocated"),
  budgetAllocated: text("budget_allocated"),
  hoursUsed: text("hours_used").default("0"),
  budgetUsed: text("budget_used").default("0"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNdisServiceSchema = createInsertSchema(ndisServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNdisService = z.infer<typeof insertNdisServiceSchema>;
export type NdisService = typeof ndisServices.$inferSelect;

// General Practitioners (GP) Database
export const generalPractitioners = pgTable("general_practitioners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  practiceName: text("practice_name"),
  phoneNumber: text("phone_number"),
  faxNumber: text("fax_number"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGPSchema = createInsertSchema(generalPractitioners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGP = z.infer<typeof insertGPSchema>;
export type GP = typeof generalPractitioners.$inferSelect;

// Pharmacy Database
export const pharmacies = pgTable("pharmacies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  faxNumber: text("fax_number"),
  email: text("email"),
  address: text("address"),
  deliveryAvailable: text("delivery_available").default("no").$type<"yes" | "no">(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPharmacySchema = createInsertSchema(pharmacies, {
  deliveryAvailable: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;
export type Pharmacy = typeof pharmacies.$inferSelect;

// Allied Health Professionals Database
export const alliedHealthProfessionals = pgTable("allied_health_professionals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  specialty: text("specialty").notNull().$type<
    "Physiotherapist" | "Occupational Therapist" | "Speech Pathologist" | 
    "Psychologist" | "Dietitian" | "Podiatrist" | "Exercise Physiologist" | 
    "Social Worker" | "Counsellor" | "Behaviour Support Practitioner" | "Other"
  >(),
  practiceName: text("practice_name"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAlliedHealthProfessionalSchema = createInsertSchema(alliedHealthProfessionals, {
  specialty: z.enum([
    "Physiotherapist", "Occupational Therapist", "Speech Pathologist",
    "Psychologist", "Dietitian", "Podiatrist", "Exercise Physiologist",
    "Social Worker", "Counsellor", "Behaviour Support Practitioner", "Other"
  ]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAlliedHealthProfessional = z.infer<typeof insertAlliedHealthProfessionalSchema>;
export type AlliedHealthProfessional = typeof alliedHealthProfessionals.$inferSelect;

// Notification preference type
export type NotificationPreference = {
  smsArrival?: boolean;
  smsSchedule?: boolean;
  callArrival?: boolean;
  callSchedule?: boolean;
  none?: boolean;
};

// Assignment types for client-staff relationships
export type StaffAssignmentType = "primary_support" | "secondary_support" | "care_manager" | "clinical_nurse" | "primary_worker" | "preferred_worker" | "backup_worker" | "unsuitable";

// Client-Staff Assignments - Track which staff are assigned to which clients
export const clientStaffAssignments = pgTable("client_staff_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  assignmentType: text("assignment_type").notNull().$type<StaffAssignmentType>(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientStaffAssignmentSchema = createInsertSchema(clientStaffAssignments, {
  assignmentType: z.enum(["primary_support", "secondary_support", "care_manager", "clinical_nurse", "primary_worker", "preferred_worker", "backup_worker", "unsuitable"]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientStaffAssignment = z.infer<typeof insertClientStaffAssignmentSchema>;
export type ClientStaffAssignment = typeof clientStaffAssignments.$inferSelect;

// Service Delivery Records - Track services delivered to clients
export const serviceDeliveries = pgTable("service_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").references(() => staff.id, { onDelete: "set null" }),
  budgetId: varchar("budget_id").references(() => budgets.id, { onDelete: "set null" }),
  serviceCode: text("service_code"),
  serviceName: text("service_name").notNull(),
  serviceCategory: text("service_category"),
  amount: text("amount"),
  rateType: text("rate_type").$type<"weekday" | "saturday" | "sunday" | "public_holiday" | "evening" | "night">(),
  deliveredAt: timestamp("delivered_at").notNull(),
  durationMinutes: text("duration_minutes"),
  quantity: text("quantity"),
  distanceKm: text("distance_km"),
  notes: text("notes"),
  status: text("status").$type<"scheduled" | "completed" | "cancelled" | "no_show">().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceDeliverySchema = createInsertSchema(serviceDeliveries, {
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  staffId: z.string().optional().nullable(),
  budgetId: z.string().optional().nullable(),
  amount: z.string().optional().nullable(),
  rateType: z.enum(["weekday", "saturday", "sunday", "public_holiday", "evening", "night"]).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertServiceDelivery = z.infer<typeof insertServiceDeliverySchema>;
export type ServiceDelivery = typeof serviceDeliveries.$inferSelect;

// NDIS Price Guide - Store official NDIS support items and rates
export type NdisPriceGuideRateType = "weekday" | "saturday" | "sunday" | "public_holiday" | "evening" | "night";

export const ndisPriceGuideItems = pgTable("ndis_price_guide_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supportItemNumber: text("support_item_number").notNull(),
  supportItemName: text("support_item_name").notNull(),
  registrationGroup: text("registration_group"),
  supportCategory: text("support_category"),
  supportCategoryNumber: text("support_category_number"),
  unit: text("unit").default("Hour"),
  priceLimit: text("price_limit"),
  weekdayRate: text("weekday_rate"),
  saturdayRate: text("saturday_rate"),
  sundayRate: text("sunday_rate"),
  publicHolidayRate: text("public_holiday_rate"),
  eveningRate: text("evening_rate"),
  nightRate: text("night_rate"),
  travelRate: text("travel_rate"),
  nonFaceToFaceRate: text("non_face_to_face_rate"),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNdisPriceGuideItemSchema = createInsertSchema(ndisPriceGuideItems, {
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNdisPriceGuideItem = z.infer<typeof insertNdisPriceGuideItemSchema>;
export type NdisPriceGuideItem = typeof ndisPriceGuideItems.$inferSelect;

// Quotes - Service estimates/quotations for clients
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: text("quote_number").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").$type<QuoteStatus>().default("draft").notNull(),
  validUntil: date("valid_until"),
  termsAndConditions: text("terms_and_conditions"),
  notes: text("notes"),
  subtotal: text("subtotal").default("0"),
  gstAmount: text("gst_amount").default("0"),
  totalAmount: text("total_amount").default("0"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at"),
  sentTo: text("sent_to"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
  convertedToBudgetAt: timestamp("converted_to_budget_at"),
  version: text("version").default("1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotes, {
  status: z.enum(["draft", "sent", "accepted", "declined", "expired"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Quote Line Items - Individual service items in a quote with comprehensive NDIS pricing
export const quoteLineItems = pgTable("quote_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  priceGuideItemId: varchar("price_guide_item_id").references(() => ndisPriceGuideItems.id, { onDelete: "set null" }),
  supportItemNumber: text("support_item_number"),
  supportItemName: text("support_item_name"),
  description: text("description").notNull(),
  category: text("category"),
  unit: text("unit").default("Hour"),
  
  // Detailed rate breakdown - hours per week for each rate type
  weekdayHours: text("weekday_hours").default("0"),
  weekdayRate: text("weekday_rate").default("0"),
  saturdayHours: text("saturday_hours").default("0"),
  saturdayRate: text("saturday_rate").default("0"),
  sundayHours: text("sunday_hours").default("0"),
  sundayRate: text("sunday_rate").default("0"),
  publicHolidayHours: text("public_holiday_hours").default("0"),
  publicHolidayRate: text("public_holiday_rate").default("0"),
  eveningHours: text("evening_hours").default("0"),
  eveningRate: text("evening_rate").default("0"),
  nightHours: text("night_hours").default("0"),
  nightRate: text("night_rate").default("0"),
  
  // Annual calculation fields
  weeksPerYear: text("weeks_per_year").default("52"),
  includesQldHolidays: text("includes_qld_holidays").default("yes").$type<"yes" | "no">(),
  qldHolidayDays: text("qld_holiday_days").default("12"),
  
  // Weekly and annual totals
  weeklyTotal: text("weekly_total").default("0"),
  annualTotal: text("annual_total").default("0"),
  
  // Legacy fields for backward compatibility
  rateType: text("rate_type").$type<NdisPriceGuideRateType>().default("weekday"),
  quantity: text("quantity").default("1"),
  unitPrice: text("unit_price").default("0"),
  lineTotal: text("line_total").default("0"),
  
  notes: text("notes"),
  sortOrder: text("sort_order").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoteLineItemSchema = createInsertSchema(quoteLineItems, {
  rateType: z.enum(["weekday", "saturday", "sunday", "public_holiday", "evening", "night"]).optional(),
  includesQldHolidays: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;

// Quote Status History - Track quote status changes for audit
export const quoteStatusHistory = pgTable("quote_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  previousStatus: text("previous_status").$type<QuoteStatus>(),
  newStatus: text("new_status").$type<QuoteStatus>().notNull(),
  changedById: varchar("changed_by_id").references(() => users.id, { onDelete: "set null" }),
  changedByName: text("changed_by_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoteStatusHistorySchema = createInsertSchema(quoteStatusHistory, {
  previousStatus: z.enum(["draft", "sent", "accepted", "declined", "expired"]).optional().nullable(),
  newStatus: z.enum(["draft", "sent", "accepted", "declined", "expired"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertQuoteStatusHistory = z.infer<typeof insertQuoteStatusHistorySchema>;
export type QuoteStatusHistory = typeof quoteStatusHistory.$inferSelect;

// Quote Send History - Track each time a quote is sent
export type QuoteSendDeliveryStatus = "sent" | "delivered" | "bounced" | "failed";
export type QuoteSendMethod = "email" | "manual" | "download";

export const quoteSendHistory = pgTable("quote_send_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  sentById: varchar("sent_by_id").references(() => users.id, { onDelete: "set null" }),
  sentByName: text("sent_by_name"),
  deliveryMethod: text("delivery_method").$type<QuoteSendMethod>().default("email"),
  deliveryStatus: text("delivery_status").$type<QuoteSendDeliveryStatus>().default("sent"),
  notes: text("notes"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertQuoteSendHistorySchema = createInsertSchema(quoteSendHistory, {
  deliveryMethod: z.enum(["email", "manual", "download"]).optional(),
  deliveryStatus: z.enum(["sent", "delivered", "bounced", "failed"]).optional(),
}).omit({
  id: true,
  sentAt: true,
});

export type InsertQuoteSendHistory = z.infer<typeof insertQuoteSendHistorySchema>;
export type QuoteSendHistory = typeof quoteSendHistory.$inferSelect;

// Client Contacts - NOK, Family, Advocates, etc.
export type ContactRelationship = "spouse" | "parent" | "child" | "sibling" | "guardian" | "advocate" | "friend" | "other";

export const clientContacts = pgTable("client_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relationship: text("relationship").$type<ContactRelationship>().notNull(),
  phoneNumber: text("phone_number"),
  email: text("email"),
  address: text("address"),
  isPrimary: text("is_primary").default("no").$type<"yes" | "no">(),
  isEmergencyContact: text("is_emergency_contact").default("no").$type<"yes" | "no">(),
  isNok: text("is_nok").default("no").$type<"yes" | "no">(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientContactSchema = createInsertSchema(clientContacts, {
  relationship: z.enum(["spouse", "parent", "child", "sibling", "guardian", "advocate", "friend", "other"]),
  isPrimary: z.enum(["yes", "no"]).optional(),
  isEmergencyContact: z.enum(["yes", "no"]).optional(),
  isNok: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type ClientContact = typeof clientContacts.$inferSelect;

// Client Behaviors - Triggers, Strategies, Notes
export const clientBehaviors = pgTable("client_behaviors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  behaviorType: text("behavior_type").notNull(),
  description: text("description").notNull(),
  triggers: text("triggers"),
  deescalationStrategies: text("deescalation_strategies"),
  preventionStrategies: text("prevention_strategies"),
  severity: text("severity").$type<"low" | "medium" | "high">().default("low"),
  lastOccurred: timestamp("last_occurred"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientBehaviorSchema = createInsertSchema(clientBehaviors, {
  severity: z.enum(["low", "medium", "high"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientBehavior = z.infer<typeof insertClientBehaviorSchema>;
export type ClientBehavior = typeof clientBehaviors.$inferSelect;

// Leadership Meeting Notes
export const leadershipMeetingNotes = pgTable("leadership_meeting_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  meetingDate: timestamp("meeting_date").notNull(),
  attendees: text("attendees").array(),
  discussionPoints: text("discussion_points").notNull(),
  decisions: text("decisions"),
  actionItems: text("action_items"),
  followUpRequired: text("follow_up_required").default("no").$type<"yes" | "no">(),
  followUpDate: date("follow_up_date"),
  recordedBy: text("recorded_by"),
  recordedById: varchar("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeadershipMeetingNoteSchema = createInsertSchema(leadershipMeetingNotes, {
  followUpRequired: z.enum(["yes", "no"]).optional(),
  attendees: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeadershipMeetingNote = z.infer<typeof insertLeadershipMeetingNoteSchema>;
export type LeadershipMeetingNote = typeof leadershipMeetingNotes.$inferSelect;
