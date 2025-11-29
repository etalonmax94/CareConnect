import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, date, serial, integer, uuid } from "drizzle-orm/pg-core";
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

// Falls Risk Assessment type for FRAT scoring
export type FallsRiskAssessment = {
  recentFalls: number; // 2, 4, 6, or 8
  medications: number; // 1, 2, 3, or 4
  psychological: number; // 1, 2, 3, or 4
  cognitiveStatus: number; // 1, 2, 3, or 4
  autoHighRiskDizziness: boolean;
  autoHighRiskFunctionalChange: boolean;
  totalScore: number; // 5-20
  riskCategory: "Low" | "Medium" | "High";
  assessedAt?: string;
  assessedBy?: string;
};

// Service Subtypes - categories within Support Work and Nursing
export const serviceSubtypes = pgTable("service_subtypes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  serviceType: text("service_type").notNull().$type<"Support Work" | "Nursing">(),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceSubtypeSchema = createInsertSchema(serviceSubtypes, {
  serviceType: z.enum(["Support Work", "Nursing"]),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertServiceSubtype = z.infer<typeof insertServiceSubtypeSchema>;
export type ServiceSubtype = typeof serviceSubtypes.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientNumber: serial("client_number").notNull(),
  category: text("category").notNull().$type<ClientCategory>(),
  // Name fields - firstName and lastName are required, middleName is optional
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  middleName: text("middle_name"),
  // Legacy field - kept for backward compatibility, will be computed from firstName + middleName + lastName
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
  sex: text("sex").$type<"Male" | "Female" | "Other" | null>(),
  maritalStatus: text("marital_status").$type<"Single" | "Never married" | "Married" | "Widowed" | "Divorced" | null>(),
  nokEpoa: text("nok_epoa"), // Next of Kin info (name, relationship, phone)
  epoa: text("epoa"), // Enduring Power of Attorney (name, relationship, phone)
  frequencyOfServices: text("frequency_of_services"),
  serviceSchedule: json("service_schedule").$type<{
    week1: { [day: string]: { startTime: string; endTime: string; }[] };
    week2: { [day: string]: { startTime: string; endTime: string; }[] };
    notes?: string;
  }>(),
  mainDiagnosis: text("main_diagnosis"),
  allergies: text("allergies"),
  fallsRiskScore: integer("falls_risk_score"), // Scale 5-20
  substanceUseNotes: text("substance_use_notes"), // Alcohol/drugs/smoke notes
  dietPatterns: text("diet_patterns"),
  exercisePatterns: text("exercise_patterns"),
  sleepPatterns: text("sleep_patterns"),
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
    emailArrival?: boolean;
    emailSchedule?: boolean;
    none?: boolean;
  }>(),
  fallsRiskAssessment: json("falls_risk_assessment").$type<FallsRiskAssessment>(),
  zohoWorkdriveLink: text("zoho_workdrive_link"),
  isPinned: text("is_pinned").default("no").$type<"yes" | "no">(),
  
  // Onboarding status - new clients are highlighted until marked as onboarded
  isOnboarded: text("is_onboarded").default("no").$type<"yes" | "no">(),
  onboardedAt: timestamp("onboarded_at"),
  onboardedBy: varchar("onboarded_by"),
  
  // Client status - Active, Hospital, Paused, Discharged, Referral (Archived is separate)
  status: text("status").default("Active").$type<"Active" | "Hospital" | "Paused" | "Discharged" | "Referral">(),
  statusChangedAt: timestamp("status_changed_at"),
  statusChangedBy: varchar("status_changed_by"),
  
  // Risk assessment score (Level 1-5) for clinical priority
  riskAssessmentScore: text("risk_assessment_score").$type<"Level 1" | "Level 2" | "Level 3" | "Level 4" | "Level 5">(),
  riskAssessmentDate: date("risk_assessment_date"),
  riskAssessmentNotes: text("risk_assessment_notes"),
  
  // New profile fields for Overview page
  serviceType: text("service_type").$type<"Support Work" | "Nursing" | "Both" | null>(),
  serviceSubTypeIds: text("service_sub_type_ids").array(),
  parkingInstructions: text("parking_instructions"),
  attentionNotes: text("attention_notes"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  
  // Personal preferences and lifestyle
  culturalBackground: text("cultural_background"), // Religious/cultural preferences
  hobbiesInterests: text("hobbies_interests"), // Favorite activities, food, shows
  intakeComments: text("intake_comments"), // General intake notes
  
  // Care Team - foreign keys for linked entities
  generalPractitionerId: varchar("general_practitioner_id"),
  pharmacyId: varchar("pharmacy_id"),
  
  // Care Team - stored as JSON (includes legacy string references)
  careTeam: json("care_team").$type<{
    careManager?: string;
    careManagerId?: string;
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
    sahNumber?: string;
    sahFundingLevel?: string;
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
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional().nullable(),
  participantName: z.string().optional(), // Will be computed from name fields
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
  status: z.enum(["Active", "Hospital", "Paused", "Discharged", "Referral"]).optional(),
  riskAssessmentScore: z.enum(["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"]).optional().nullable(),
  riskAssessmentDate: z.string().optional().nullable(),
  riskAssessmentNotes: z.string().optional().nullable(),
  serviceType: z.enum(["Support Work", "Nursing", "Both"]).optional().nullable(),
  serviceSubTypeIds: z.array(z.string()).optional().nullable(),
  fallsRiskAssessment: z.any().optional().nullable(),
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
  // New intake fields
  sex: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  maritalStatus: z.enum(["Single", "Never married", "Married", "Widowed", "Divorced"]).optional().nullable(),
  fallsRiskScore: z.number().min(5).max(20).optional().nullable(),
  substanceUseNotes: z.string().optional().nullable(),
  dietPatterns: z.string().optional().nullable(),
  exercisePatterns: z.string().optional().nullable(),
  sleepPatterns: z.string().optional().nullable(),
  culturalBackground: z.string().optional().nullable(),
  hobbiesInterests: z.string().optional().nullable(),
  intakeComments: z.string().optional().nullable(),
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

// Client Status type
export type ClientStatus = "Active" | "Hospital" | "Paused" | "Discharged" | "Referral";

// Client Status Change Log - tracks all status changes with reasons
export const clientStatusLogs = pgTable("client_status_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  previousStatus: text("previous_status").$type<ClientStatus | null>(),
  newStatus: text("new_status").notNull().$type<ClientStatus>(),
  reason: text("reason"),
  changedBy: varchar("changed_by").notNull(), // User ID who made the change
  changedByName: text("changed_by_name"), // User name for display
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientStatusLogSchema = createInsertSchema(clientStatusLogs, {
  previousStatus: z.enum(["Active", "Hospital", "Paused", "Discharged", "Referral"]).nullable().optional(),
  newStatus: z.enum(["Active", "Hospital", "Paused", "Discharged", "Referral"]),
  reason: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertClientStatusLog = z.infer<typeof insertClientStatusLogSchema>;
export type ClientStatusLog = typeof clientStatusLogs.$inferSelect;

// Helper function to format client number as "C-X"
export function formatClientNumber(clientNumber?: number | null): string {
  if (!clientNumber) return "";
  return `C-${clientNumber}`;
}

// Helper function to compute full name from name parts
export function computeFullName(firstName?: string | null, middleName?: string | null, lastName?: string | null): string {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(" ").trim();
}

// Helper function to split a full name into parts (for migration)
export function splitFullName(fullName: string): { firstName: string; middleName: string | null; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", middleName: null, lastName: "" };
  } else if (parts.length === 1) {
    return { firstName: parts[0], middleName: null, lastName: "" };
  } else if (parts.length === 2) {
    return { firstName: parts[0], middleName: null, lastName: parts[1] };
  } else {
    // More than 2 parts: first is firstName, last is lastName, middle parts are middleName
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" "),
      lastName: parts[parts.length - 1]
    };
  }
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
export type BudgetPeriod = "weekly" | "monthly" | "quarterly" | "annual";

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  quoteId: varchar("quote_id").references(() => quotes.id, { onDelete: "set null" }), // Link to source quote
  category: text("category").notNull(),
  serviceType: text("service_type").$type<ServiceType>().default("NDIS"),
  period: text("period").$type<BudgetPeriod>().default("annual"), // weekly, monthly, quarterly, annual
  totalAllocated: text("total_allocated").notNull(),
  used: text("used").default("0").notNull(),
  remaining: text("remaining").default("0").notNull(),
  weeklyAmount: text("weekly_amount").default("0"),
  monthlyAmount: text("monthly_amount").default("0"),
  quarterlyAmount: text("quarterly_amount").default("0"),
  annualAmount: text("annual_amount").default("0"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetSchema = createInsertSchema(budgets, {
  serviceType: z.enum(["NDIS", "Support at Home", "Private"]).optional(),
  period: z.enum(["weekly", "monthly", "quarterly", "annual"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
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
  // New fields for enhanced document management
  folderId: text("folder_id"), // Reference to folder (e.g., "service-agreement", "progress-notes")
  subFolderId: text("sub_folder_id"), // Reference to sub-folder if applicable
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  originalFolderId: text("original_folder_id"), // Track original folder when archived
  customTitle: text("custom_title"), // Custom title for the document (optional override)
});

export const insertDocumentSchema = createInsertSchema(documents, {
  expiryDate: z.string().optional().nullable(),
  isArchived: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  uploadDate: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Client Document Folder Overrides - Per-client folder customization
export const clientDocumentFolders = pgTable("client_document_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  folderId: text("folder_id").notNull(), // Standard folder ID (e.g., "service-agreement")
  customName: text("custom_name"), // Custom name override
  isHidden: text("is_hidden").default("no").$type<"yes" | "no">(), // Hide folder for this client
  sortOrder: text("sort_order"), // Custom sort order
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientDocumentFolderSchema = createInsertSchema(clientDocumentFolders, {
  isHidden: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientDocumentFolder = z.infer<typeof insertClientDocumentFolderSchema>;
export type ClientDocumentFolder = typeof clientDocumentFolders.$inferSelect;

// Client Document Compliance Overrides - Mark tracked documents as "Not Required"
export const clientDocumentCompliance = pgTable("client_document_compliance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // Standard document type name
  isNotRequired: text("is_not_required").default("no").$type<"yes" | "no">(),
  notRequiredReason: text("not_required_reason"), // Reason why document is not required
  notRequiredBy: varchar("not_required_by"), // User who marked it as not required
  notRequiredAt: timestamp("not_required_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientDocumentComplianceSchema = createInsertSchema(clientDocumentCompliance, {
  isNotRequired: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientDocumentCompliance = z.infer<typeof insertClientDocumentComplianceSchema>;
export type ClientDocumentCompliance = typeof clientDocumentCompliance.$inferSelect;

// Client Goals - Up to 5 goals per client
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "on_hold" | "archived";
export type GoalCategory = "health" | "social" | "independence" | "safety" | "financial" | "other";

export const clientGoals = pgTable("client_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  status: text("status").notNull().$type<GoalStatus>().default("not_started"),
  progress: text("progress"),
  progressPercent: integer("progress_percent").default(0), // 0-100 percentage
  category: text("category").$type<GoalCategory>().default("other"),
  responsibleStaffId: varchar("responsible_staff_id").references(() => staff.id, { onDelete: "set null" }),
  lastReviewDate: date("last_review_date"),
  nextReviewDate: date("next_review_date"),
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  order: text("order").default("1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientGoalSchema = createInsertSchema(clientGoals, {
  status: z.enum(["not_started", "in_progress", "achieved", "on_hold", "archived"]).optional(),
  category: z.enum(["health", "social", "independence", "safety", "financial", "other"]).optional(),
  targetDate: z.string().optional().nullable(),
  progressPercent: z.number().min(0).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientGoal = z.infer<typeof insertClientGoalSchema>;
export type ClientGoal = typeof clientGoals.$inferSelect;

// Goal Updates - Audit trail for goal changes and notes
export type GoalUpdateType = "status_change" | "progress_update" | "note" | "review" | "created" | "edited" | "archived" | "unarchived" | "achievement_step" | "idea";

export const goalUpdates = pgTable("goal_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").notNull().references(() => clientGoals.id, { onDelete: "cascade" }),
  updateType: text("update_type").notNull().$type<GoalUpdateType>(),
  previousValue: text("previous_value"), // For status/progress changes
  newValue: text("new_value"), // For status/progress changes
  note: text("note"), // Additional notes or comments
  details: json("details").$type<Record<string, unknown>>(), // Extra structured data for ideas/achievement steps
  performedBy: varchar("performed_by"),
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoalUpdateSchema = createInsertSchema(goalUpdates, {
  updateType: z.enum(["status_change", "progress_update", "note", "review", "created", "edited", "archived", "unarchived", "achievement_step", "idea"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertGoalUpdate = z.infer<typeof insertGoalUpdateSchema>;
export type GoalUpdate = typeof goalUpdates.$inferSelect;

// Goal Action Plans - Structured strategies for achieving goals
export type ActionPlanStatus = "pending" | "in_progress" | "completed" | "cancelled";

export const goalActionPlans = pgTable("goal_action_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").notNull().references(() => clientGoals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  steps: json("steps").$type<string[]>().default([]), // Ordered list of steps
  assignedStaffId: varchar("assigned_staff_id").references(() => staff.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  status: text("status").notNull().$type<ActionPlanStatus>().default("pending"),
  completedAt: timestamp("completed_at"),
  order: integer("order").default(1),
  createdBy: varchar("created_by"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGoalActionPlanSchema = createInsertSchema(goalActionPlans, {
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  steps: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGoalActionPlan = z.infer<typeof insertGoalActionPlanSchema>;
export type GoalActionPlan = typeof goalActionPlans.$inferSelect;

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
  environment: text("environment").default("production"), // "production" or "development" to identify source
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog, {
  operation: z.enum(["create", "update", "delete", "archive", "restore"]),
  changedFields: z.array(z.string()).optional().nullable(),
  oldValues: z.record(z.unknown()).optional().nullable(),
  newValues: z.record(z.unknown()).optional().nullable(),
  environment: z.enum(["production", "development"]).optional(),
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
  supervisorId: varchar("supervisor_id"),

  // Personal Details
  dateOfBirth: date("date_of_birth"),
  gender: text("gender").$type<"male" | "female" | "non_binary" | "prefer_not_to_say" | null>(),
  pronouns: text("pronouns"),

  // Address Fields
  streetAddress: text("street_address"),
  suburb: text("suburb"),
  state: text("state"),
  postCode: text("post_code"),
  country: text("country").default("Australia"),

  // Employment Details
  employmentType: text("employment_type").$type<"full_time" | "part_time" | "casual" | "contractor" | null>(),
  employmentStartDate: date("employment_start_date"),
  employmentEndDate: date("employment_end_date"),
  department: text("department").$type<"nursing" | "support_work" | "management" | "administration" | "clinical" | null>(),
  workingHoursPerWeek: text("working_hours_per_week"),

  // Secondary Contact
  secondaryPhone: text("secondary_phone"),
  secondaryEmail: text("secondary_email"),
  preferredContactMethod: text("preferred_contact_method").$type<"email" | "phone" | "sms">().default("phone"),

  // Profile
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffSchema = createInsertSchema(staff, {
  role: z.enum(["support_worker", "nurse", "care_manager", "admin"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional().nullable(),
  employmentType: z.enum(["full_time", "part_time", "casual", "contractor"]).optional().nullable(),
  department: z.enum(["nursing", "support_work", "management", "administration", "clinical"]).optional().nullable(),
  preferredContactMethod: z.enum(["email", "phone", "sms"]).optional(),
  dateOfBirth: z.string().optional().nullable(),
  employmentStartDate: z.string().optional().nullable(),
  employmentEndDate: z.string().optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  streetAddress: z.string().max(255).optional().nullable(),
  suburb: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  postCode: z.string().max(10).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  secondaryPhone: z.string().max(20).optional().nullable(),
  secondaryEmail: z.string().email().optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  workingHoursPerWeek: z.string().optional().nullable(),
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

// Pricing Services - Centralized pricing for NDIS, Support at Home, and Private services
export type ServiceType = "NDIS" | "Support at Home" | "Private";
export type RateType = "weekday" | "saturday" | "sunday" | "public_holiday" | "evening" | "night";

export const pricingServices = pgTable("pricing_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceType: text("service_type").notNull().$type<ServiceType>(),
  serviceName: text("service_name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "Nursing", "Support Work", "Transport"
  unit: text("unit").default("Hour"),
  weekdayRate: text("weekday_rate").default("0"),
  saturdayRate: text("saturday_rate").default("0"),
  sundayRate: text("sunday_rate").default("0"),
  publicHolidayRate: text("public_holiday_rate").default("0"),
  eveningRate: text("evening_rate").default("0"),
  nightRate: text("night_rate").default("0"),
  includesGst: text("includes_gst").default("no").$type<"yes" | "no">(),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPricingServiceSchema = createInsertSchema(pricingServices, {
  serviceType: z.enum(["NDIS", "Support at Home", "Private"]),
  includesGst: z.enum(["yes", "no"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricingService = z.infer<typeof insertPricingServiceSchema>;
export type PricingService = typeof pricingServices.$inferSelect;

// Quotes - Service estimates/quotations for clients
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: text("quote_number").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceType: text("service_type").$type<ServiceType>().default("NDIS"), // NDIS, Support at Home, Private
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
  serviceType: z.enum(["NDIS", "Support at Home", "Private"]).optional(),
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

// Quote vs Actual Tracking - Compare quoted hours against delivered hours
export const quoteVsActual = pgTable("quote_vs_actual", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  lineItemId: varchar("line_item_id").notNull().references(() => quoteLineItems.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  category: text("category"),

  // Quoted hours (from quote line item)
  quotedWeekdayHours: text("quoted_weekday_hours").default("0"),
  quotedSaturdayHours: text("quoted_saturday_hours").default("0"),
  quotedSundayHours: text("quoted_sunday_hours").default("0"),
  quotedEveningHours: text("quoted_evening_hours").default("0"),
  quotedNightHours: text("quoted_night_hours").default("0"),
  quotedPublicHolidayHours: text("quoted_public_holiday_hours").default("0"),
  quotedWeeklyTotal: text("quoted_weekly_total").default("0"),
  quotedAnnualTotal: text("quoted_annual_total").default("0"),

  // Actual delivered hours (from service deliveries)
  actualWeekdayHours: text("actual_weekday_hours").default("0"),
  actualSaturdayHours: text("actual_saturday_hours").default("0"),
  actualSundayHours: text("actual_sunday_hours").default("0"),
  actualEveningHours: text("actual_evening_hours").default("0"),
  actualNightHours: text("actual_night_hours").default("0"),
  actualPublicHolidayHours: text("actual_public_holiday_hours").default("0"),
  actualWeeklyTotal: text("actual_weekly_total").default("0"),
  actualTotalToDate: text("actual_total_to_date").default("0"),

  // Variance tracking
  weeklyVariance: text("weekly_variance").default("0"), // actual - quoted
  weeklyVariancePercent: text("weekly_variance_percent").default("0"),

  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  lastCalculated: timestamp("last_calculated"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertQuoteVsActualSchema = createInsertSchema(quoteVsActual).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertQuoteVsActual = z.infer<typeof insertQuoteVsActualSchema>;
export type QuoteVsActual = typeof quoteVsActual.$inferSelect;

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

// ============================================
// APPOINTMENTS & SCHEDULING SYSTEM
// ============================================

// Appointment Status and Types
export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AppointmentType = "home_visit" | "community_access" | "transport" | "nursing" | "assessment" | "review" | "other";
export type AssignmentRole = "lead" | "support" | "trainee" | "observer";
export type AssignmentStatus = "pending" | "accepted" | "declined" | "reassigned";

// Appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  appointmentType: text("appointment_type").$type<AppointmentType>().default("home_visit"),
  status: text("status").$type<AppointmentStatus>().default("scheduled"),
  
  // Scheduling
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  
  // Location - can use client address or custom
  useClientAddress: text("use_client_address").default("yes").$type<"yes" | "no">(),
  customAddress: text("custom_address"),
  customLatitude: text("custom_latitude"),
  customLongitude: text("custom_longitude"),
  
  // Travel buffer (minutes before/after)
  bufferBefore: text("buffer_before").default("15"),
  bufferAfter: text("buffer_after").default("15"),
  
  // Recurrence (null for one-time appointments)
  isRecurring: text("is_recurring").default("no").$type<"yes" | "no">(),
  recurrenceRule: text("recurrence_rule"), // RRULE format
  recurrenceParentId: varchar("recurrence_parent_id"), // Links to parent appointment for series
  
  // Service details
  serviceType: text("service_type"),
  ndisServiceCode: text("ndis_service_code"),
  estimatedDuration: text("estimated_duration"), // in minutes
  
  // Notes
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  
  // Audit
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments, {
  appointmentType: z.enum(["home_visit", "community_access", "transport", "nursing", "assessment", "review", "other"]).optional(),
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]).optional(),
  useClientAddress: z.enum(["yes", "no"]).optional(),
  isRecurring: z.enum(["yes", "no"]).optional(),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Appointment Assignments - Staff assigned to appointments
export const appointmentAssignments = pgTable("appointment_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  role: text("role").$type<AssignmentRole>().default("lead"),
  status: text("status").$type<AssignmentStatus>().default("pending"),
  
  // Response tracking
  respondedAt: timestamp("responded_at"),
  responseNote: text("response_note"),
  declineReason: text("decline_reason"),
  
  // Assignment audit
  assignedById: varchar("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
  assignedByName: text("assigned_by_name"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppointmentAssignmentSchema = createInsertSchema(appointmentAssignments, {
  role: z.enum(["lead", "support", "trainee", "observer"]).optional(),
  status: z.enum(["pending", "accepted", "declined", "reassigned"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedAt: true,
});

export type InsertAppointmentAssignment = z.infer<typeof insertAppointmentAssignmentSchema>;
export type AppointmentAssignment = typeof appointmentAssignments.$inferSelect;

// Appointment Check-ins - GPS tracking for visits
export const appointmentCheckins = pgTable("appointment_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  
  checkType: text("check_type").$type<"check_in" | "check_out">().notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  
  // GPS location
  latitude: text("latitude"),
  longitude: text("longitude"),
  accuracy: text("accuracy"), // GPS accuracy in meters
  
  // Distance from expected location
  distanceFromClient: text("distance_from_client"), // in meters
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppointmentCheckinSchema = createInsertSchema(appointmentCheckins, {
  checkType: z.enum(["check_in", "check_out"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertAppointmentCheckin = z.infer<typeof insertAppointmentCheckinSchema>;
export type AppointmentCheckin = typeof appointmentCheckins.$inferSelect;

// ============================================
// STAFF ALLOCATION & PREFERENCES
// ============================================

// Staff Preference Levels
export type PreferenceLevel = "primary" | "secondary" | "backup";

// Client Staff Preferences - Preferred workers for each client
export const clientStaffPreferences = pgTable("client_staff_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  preferenceLevel: text("preference_level").$type<PreferenceLevel>().default("primary"),
  notes: text("notes"),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientStaffPreferenceSchema = createInsertSchema(clientStaffPreferences, {
  preferenceLevel: z.enum(["primary", "secondary", "backup"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientStaffPreference = z.infer<typeof insertClientStaffPreferenceSchema>;
export type ClientStaffPreference = typeof clientStaffPreferences.$inferSelect;

// Client Staff Restrictions (Blacklist) - Staff who should NOT work with client
export const clientStaffRestrictions = pgTable("client_staff_restrictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  severity: text("severity").$type<"warning" | "soft_block" | "hard_block">().default("hard_block"),
  
  // Effective period
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"), // null = permanent
  
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientStaffRestrictionSchema = createInsertSchema(clientStaffRestrictions, {
  severity: z.enum(["warning", "soft_block", "hard_block"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientStaffRestriction = z.infer<typeof insertClientStaffRestrictionSchema>;
export type ClientStaffRestriction = typeof clientStaffRestrictions.$inferSelect;

// Staff Availability Windows - Regular working hours
export const staffAvailabilityWindows = pgTable("staff_availability_windows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek: text("day_of_week").$type<"0" | "1" | "2" | "3" | "4" | "5" | "6">().notNull(),
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffAvailabilityWindowSchema = createInsertSchema(staffAvailabilityWindows, {
  dayOfWeek: z.enum(["0", "1", "2", "3", "4", "5", "6"]),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffAvailabilityWindow = z.infer<typeof insertStaffAvailabilityWindowSchema>;
export type StaffAvailabilityWindow = typeof staffAvailabilityWindows.$inferSelect;

// Staff Unavailability Periods - Leave, sick days, etc.
export type UnavailabilityType = "annual_leave" | "sick_leave" | "personal_leave" | "training" | "unavailable" | "other";

export const staffUnavailabilityPeriods = pgTable("staff_unavailability_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  
  unavailabilityType: text("unavailability_type").$type<UnavailabilityType>().default("unavailable"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  reason: text("reason"),
  isAllDay: text("is_all_day").default("yes").$type<"yes" | "no">(),
  
  // Approval tracking
  status: text("status").$type<"pending" | "approved" | "rejected">().default("approved"),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedByName: text("approved_by_name"),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffUnavailabilityPeriodSchema = createInsertSchema(staffUnavailabilityPeriods, {
  unavailabilityType: z.enum(["annual_leave", "sick_leave", "personal_leave", "training", "unavailable", "other"]).optional(),
  isAllDay: z.enum(["yes", "no"]).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffUnavailabilityPeriod = z.infer<typeof insertStaffUnavailabilityPeriodSchema>;
export type StaffUnavailabilityPeriod = typeof staffUnavailabilityPeriods.$inferSelect;

// Staff Status Logs - Real-time tracking of staff status
export type StaffStatusType = "available" | "on_road" | "with_client" | "on_break" | "off_duty";

export const staffStatusLogs = pgTable("staff_status_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  
  status: text("status").$type<StaffStatusType>().notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  
  // Location at status change
  latitude: text("latitude"),
  longitude: text("longitude"),
  
  notes: text("notes"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStaffStatusLogSchema = createInsertSchema(staffStatusLogs, {
  status: z.enum(["available", "on_road", "with_client", "on_break", "off_duty"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffStatusLog = z.infer<typeof insertStaffStatusLogSchema>;
export type StaffStatusLog = typeof staffStatusLogs.$inferSelect;

// ============================================
// WORKFORCE MANAGEMENT SYSTEM
// ============================================

// Staff Qualifications & Capabilities
export type QualificationType = "nursing" | "first_aid" | "medication_admin" | "manual_handling" | "behavioral_support" | "complex_care" | "driver_license" | "other";
export type QualificationStatus = "current" | "expired" | "pending_renewal";

export const staffQualifications = pgTable("staff_qualifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  qualificationType: text("qualification_type").$type<QualificationType>().notNull(),
  qualificationName: text("qualification_name").notNull(),
  issuingOrganization: text("issuing_organization"),
  certificationNumber: text("certification_number"),

  // Validity
  issuedDate: date("issued_date"),
  expiryDate: date("expiry_date"),
  status: text("status").$type<QualificationStatus>().default("current"),

  // Documents
  documentUrl: text("document_url"),
  verifiedById: varchar("verified_by_id").references(() => users.id, { onDelete: "set null" }),
  verifiedByName: text("verified_by_name"),
  verifiedAt: timestamp("verified_at"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffQualificationSchema = createInsertSchema(staffQualifications, {
  qualificationType: z.enum(["nursing", "first_aid", "medication_admin", "manual_handling", "behavioral_support", "complex_care", "driver_license", "other"]),
  status: z.enum(["current", "expired", "pending_renewal"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffQualification = z.infer<typeof insertStaffQualificationSchema>;
export type StaffQualification = typeof staffQualifications.$inferSelect;

// Staff Emergency Contacts
export type StaffEmergencyContactRelationship = "spouse" | "partner" | "parent" | "child" | "sibling" | "friend" | "other";

export const staffEmergencyContacts = pgTable("staff_emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  relationship: text("relationship").$type<StaffEmergencyContactRelationship>().notNull(),
  phoneNumber: text("phone_number").notNull(),
  alternatePhone: text("alternate_phone"),
  email: text("email"),

  isPrimary: text("is_primary").default("no").$type<"yes" | "no">(),
  priority: text("priority").default("1"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffEmergencyContactSchema = createInsertSchema(staffEmergencyContacts, {
  relationship: z.enum(["spouse", "partner", "parent", "child", "sibling", "friend", "other"]),
  isPrimary: z.enum(["yes", "no"]).optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffEmergencyContact = z.infer<typeof insertStaffEmergencyContactSchema>;
export type StaffEmergencyContact = typeof staffEmergencyContacts.$inferSelect;

// Staff Document Types - All required compliance and HR documents
export type StaffDocumentType =
  | "id_document_1"
  | "id_document_2"
  | "right_to_work"
  | "police_check"
  | "yellow_card"
  | "blue_card"
  | "nursing_registration"
  | "qualification_award"
  | "cpr"
  | "first_aid"
  | "vaccination_record"
  | "vehicle_insurance"
  | "ndis_orientation"
  | "ndis_communication"
  | "ndis_safe_meals"
  | "hand_hygiene"
  | "infection_control"
  | "employment_agreement"
  | "resume_cv"
  | "position_description"
  | "commitment_declaration"
  | "induction_checklist";

export type StaffDocumentStatus = "pending" | "approved" | "rejected" | "expired";

export const staffDocuments = pgTable("staff_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  documentType: text("document_type").$type<StaffDocumentType>().notNull(),
  documentName: text("document_name").notNull(), // Original filename or custom name

  // File storage
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"), // In bytes
  mimeType: text("mime_type"),

  // Approval workflow
  status: text("status").$type<StaffDocumentStatus>().default("pending").notNull(),
  reviewedById: varchar("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),

  // Expiry tracking for compliance documents
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),

  // Document details
  documentNumber: text("document_number"), // e.g., license number, card number
  issuingAuthority: text("issuing_authority"), // Who issued the document

  notes: text("notes"),

  // Uploaded by
  uploadedById: varchar("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  uploadedByName: text("uploaded_by_name"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffDocumentSchema = createInsertSchema(staffDocuments, {
  documentType: z.enum([
    "id_document_1",
    "id_document_2",
    "right_to_work",
    "police_check",
    "yellow_card",
    "blue_card",
    "nursing_registration",
    "qualification_award",
    "cpr",
    "first_aid",
    "vaccination_record",
    "vehicle_insurance",
    "ndis_orientation",
    "ndis_communication",
    "ndis_safe_meals",
    "hand_hygiene",
    "infection_control",
    "employment_agreement",
    "resume_cv",
    "position_description",
    "commitment_declaration",
    "induction_checklist",
  ]),
  status: z.enum(["pending", "approved", "rejected", "expired"]).optional(),
  fileSize: z.number().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffDocument = z.infer<typeof insertStaffDocumentSchema>;
export type StaffDocument = typeof staffDocuments.$inferSelect;

// Staff Blacklist - Service type, category, or general restrictions
export type BlacklistType = "service_type" | "service_category" | "client_category" | "general";
export type BlacklistSeverity = "warning" | "soft_block" | "hard_block";

export const staffBlacklist = pgTable("staff_blacklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  blacklistType: text("blacklist_type").$type<BlacklistType>().notNull(),
  severity: text("severity").$type<BlacklistSeverity>().default("hard_block"),

  // What's being restricted
  serviceType: text("service_type").$type<ServiceType>(), // NDIS, Support at Home, Private
  serviceCategory: text("service_category"), // e.g., "complex nursing", "high-risk", "behavioral support"
  clientCategory: text("client_category").$type<ClientCategory>(), // NDIS, Support at Home, Private

  reason: text("reason").notNull(),

  // Effective period
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"), // null = permanent

  isActive: text("is_active").default("yes").$type<"yes" | "no">(),

  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffBlacklistSchema = createInsertSchema(staffBlacklist, {
  blacklistType: z.enum(["service_type", "service_category", "client_category", "general"]),
  severity: z.enum(["warning", "soft_block", "hard_block"]).optional(),
  serviceType: z.enum(["NDIS", "Support at Home", "Private"]).optional().nullable(),
  clientCategory: z.enum(["NDIS", "Support at Home", "Private"]).optional().nullable(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffBlacklist = z.infer<typeof insertStaffBlacklistSchema>;
export type StaffBlacklist = typeof staffBlacklist.$inferSelect;

// Time Clock Records - Staff clock in/out with GPS
export type ClockEventType = "clock_in" | "clock_out" | "break_start" | "break_end";
export type ClockEventStatus = "valid" | "flagged_gps" | "flagged_overlap" | "flagged_manual" | "admin_override";

export const timeClockRecords = pgTable("time_clock_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),

  eventType: text("event_type").$type<ClockEventType>().notNull(),
  eventStatus: text("event_status").$type<ClockEventStatus>().default("valid"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),

  // GPS Location
  latitude: text("latitude"),
  longitude: text("longitude"),
  accuracy: text("accuracy"), // in meters

  // Expected location (from appointment or client address)
  expectedLatitude: text("expected_latitude"),
  expectedLongitude: text("expected_longitude"),
  distanceFromExpected: text("distance_from_expected"), // in meters

  // Validation
  isWithinRadius: text("is_within_radius").default("yes").$type<"yes" | "no">(),
  radiusThreshold: text("radius_threshold").default("100"), // meters

  // Device info
  deviceType: text("device_type"), // "mobile", "desktop", "tablet"
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),

  notes: text("notes"),
  flagReason: text("flag_reason"),

  // Admin review
  reviewedById: varchar("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimeClockRecordSchema = createInsertSchema(timeClockRecords, {
  eventType: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  eventStatus: z.enum(["valid", "flagged_gps", "flagged_overlap", "flagged_manual", "admin_override"]).optional(),
  isWithinRadius: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertTimeClockRecord = z.infer<typeof insertTimeClockRecordSchema>;
export type TimeClockRecord = typeof timeClockRecords.$inferSelect;

// Timesheets - Generated from clock records, approved by admins
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";

export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Period
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),

  status: text("status").$type<TimesheetStatus>().default("draft"),

  // Hours summary
  totalHours: text("total_hours").default("0"),
  weekdayHours: text("weekday_hours").default("0"),
  saturdayHours: text("saturday_hours").default("0"),
  sundayHours: text("sunday_hours").default("0"),
  publicHolidayHours: text("public_holiday_hours").default("0"),
  eveningHours: text("evening_hours").default("0"),
  nightHours: text("night_hours").default("0"),

  // Financial
  totalAmount: text("total_amount").default("0"),

  // Approval workflow
  submittedAt: timestamp("submitted_at"),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedByName: text("approved_by_name"),
  approvedAt: timestamp("approved_at"),

  rejectionReason: text("rejection_reason"),

  // Payment tracking
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimesheetSchema = createInsertSchema(timesheets, {
  status: z.enum(["draft", "submitted", "approved", "rejected", "paid"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;

// Timesheet Entries - Individual clock records linked to timesheet
export const timesheetEntries = pgTable("timesheet_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timesheetId: varchar("timesheet_id").notNull().references(() => timesheets.id, { onDelete: "cascade" }),
  clockInId: varchar("clock_in_id").notNull().references(() => timeClockRecords.id, { onDelete: "cascade" }),
  clockOutId: varchar("clock_out_id").references(() => timeClockRecords.id, { onDelete: "set null" }),

  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),

  // Calculated values
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalHours: text("total_hours").default("0"),

  // Rate type (based on time of day/week)
  rateType: text("rate_type").$type<RateType>(),
  hourlyRate: text("hourly_rate").default("0"),
  totalAmount: text("total_amount").default("0"),

  // Adjustments
  isAdjusted: text("is_adjusted").default("no").$type<"yes" | "no">(),
  adjustedHours: text("adjusted_hours"),
  adjustedAmount: text("adjusted_amount"),
  adjustmentReason: text("adjustment_reason"),
  adjustedById: varchar("adjusted_by_id").references(() => users.id, { onDelete: "set null" }),
  adjustedByName: text("adjusted_by_name"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimesheetEntrySchema = createInsertSchema(timesheetEntries, {
  rateType: z.enum(["weekday", "saturday", "sunday", "public_holiday", "evening", "night"]).optional().nullable(),
  isAdjusted: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertTimesheetEntry = z.infer<typeof insertTimesheetEntrySchema>;
export type TimesheetEntry = typeof timesheetEntries.$inferSelect;

// GPS Compliance Logs - Track all GPS-related compliance events
export type GpsComplianceEventType = "location_verified" | "location_mismatch" | "location_unavailable" | "radius_exceeded" | "manual_override";

export const gpsComplianceLogs = pgTable("gps_compliance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  eventType: text("event_type").$type<GpsComplianceEventType>().notNull(),

  staffId: varchar("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  clockRecordId: varchar("clock_record_id").references(() => timeClockRecords.id, { onDelete: "set null" }),

  // Location data
  recordedLatitude: text("recorded_latitude"),
  recordedLongitude: text("recorded_longitude"),
  expectedLatitude: text("expected_latitude"),
  expectedLongitude: text("expected_longitude"),
  distanceMeters: text("distance_meters"),
  accuracyMeters: text("accuracy_meters"),

  // Compliance status
  isCompliant: text("is_compliant").$type<"yes" | "no">().default("yes"),
  radiusThreshold: text("radius_threshold").default("100"),

  // Admin review
  requiresReview: text("requires_review").default("no").$type<"yes" | "no">(),
  reviewedById: varchar("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  reviewOutcome: text("review_outcome"), // "approved", "rejected", "escalated"
  reviewNotes: text("review_notes"),

  notes: text("notes"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGpsComplianceLogSchema = createInsertSchema(gpsComplianceLogs, {
  eventType: z.enum(["location_verified", "location_mismatch", "location_unavailable", "radius_exceeded", "manual_override"]),
  isCompliant: z.enum(["yes", "no"]).optional(),
  requiresReview: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertGpsComplianceLog = z.infer<typeof insertGpsComplianceLogSchema>;
export type GpsComplianceLog = typeof gpsComplianceLogs.$inferSelect;

// ============================================
// SCHEDULING CONFLICTS SYSTEM
// ============================================

// Conflict types for scheduling issues
export type SchedulingConflictType = 
  | "restriction_violation"    // Staff assigned despite client restriction
  | "availability_conflict"    // Staff not available at scheduled time
  | "double_booking"           // Staff assigned to overlapping appointments
  | "preference_override"      // Non-preferred staff assigned
  | "unavailability_period"    // Staff on leave/sick during appointment
  | "care_team_change"         // Care team changed affecting existing appointments
  | "missing_assignment";      // Appointment has no staff assigned

export type ConflictSeverity = "critical" | "warning" | "info";
export type ConflictStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export const schedulingConflicts = pgTable("scheduling_conflicts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Conflict details
  conflictType: text("conflict_type").$type<SchedulingConflictType>().notNull(),
  severity: text("severity").$type<ConflictSeverity>().notNull().default("warning"),
  status: text("status").$type<ConflictStatus>().notNull().default("open"),
  
  // Description
  title: text("title").notNull(),
  description: text("description"),
  
  // Linked entities (at least one should be set)
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  assignmentId: varchar("assignment_id").references(() => appointmentAssignments.id, { onDelete: "cascade" }),
  
  // Denormalized names for display (snapshot at time of conflict detection)
  clientName: text("client_name"),
  staffName: text("staff_name"),
  
  // Detailed conflict context as JSON (for complex display scenarios)
  conflictDetails: json("conflict_details").$type<Record<string, any>>(),
  
  // For restriction violations
  restrictionId: varchar("restriction_id").references(() => clientStaffRestrictions.id, { onDelete: "set null" }),
  
  // For unavailability conflicts
  unavailabilityId: varchar("unavailability_id").references(() => staffUnavailabilityPeriods.id, { onDelete: "set null" }),
  
  // Conflict timing context
  conflictDate: timestamp("conflict_date"), // When the conflict occurs
  
  // Resolution tracking
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedByName: text("resolved_by_name"),
  resolutionNotes: text("resolution_notes"),
  resolutionAction: text("resolution_action").$type<"reassigned" | "override_approved" | "appointment_cancelled" | "restriction_updated" | "dismissed" | "auto_resolved">(),
  
  // Who was notified
  notifiedUserIds: text("notified_user_ids").array(),
  notifiedAt: timestamp("notified_at"),
  
  // Detection info
  detectedById: varchar("detected_by_id").references(() => users.id, { onDelete: "set null" }),
  detectedByName: text("detected_by_name"),
  detectedBySystem: text("detected_by_system").default("no").$type<"yes" | "no">(), // Auto-detected vs manual
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSchedulingConflictSchema = createInsertSchema(schedulingConflicts, {
  conflictType: z.enum([
    "restriction_violation",
    "availability_conflict", 
    "double_booking",
    "preference_override",
    "unavailability_period",
    "care_team_change",
    "missing_assignment"
  ]),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  status: z.enum(["open", "acknowledged", "resolved", "dismissed"]).optional(),
  resolutionAction: z.enum(["reassigned", "override_approved", "appointment_cancelled", "restriction_updated", "dismissed", "auto_resolved"]).optional(),
  detectedBySystem: z.enum(["yes", "no"]).optional(),
  notifiedUserIds: z.array(z.string()).optional().nullable(),
  conflictDetails: z.record(z.string(), z.any()).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchedulingConflict = z.infer<typeof insertSchedulingConflictSchema>;
export type SchedulingConflict = typeof schedulingConflicts.$inferSelect;

// ============================================
// CARE PLANS SYSTEM
// ============================================

// Care Plan Status
export type CarePlanStatus = "draft" | "active" | "archived" | "superseded";

// Care Plans - Versioned care plans per client
export const carePlans = pgTable("care_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  version: text("version").notNull().default("1"),
  status: text("status").$type<CarePlanStatus>().default("draft"),
  
  // Summary
  title: text("title").default("Care Plan"),
  summary: text("summary"),
  
  // Review tracking
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedById: varchar("last_reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  lastReviewedByName: text("last_reviewed_by_name"),
  nextReviewDue: date("next_review_due"),
  reviewNotes: text("review_notes"),
  
  // Archive info
  archivedAt: timestamp("archived_at"),
  archivedById: varchar("archived_by_id").references(() => users.id, { onDelete: "set null" }),
  archivedByName: text("archived_by_name"),
  archiveReason: text("archive_reason"),
  
  // Links to previous/next versions
  previousVersionId: varchar("previous_version_id"),
  
  // Audit
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarePlanSchema = createInsertSchema(carePlans, {
  status: z.enum(["draft", "active", "archived", "superseded"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCarePlan = z.infer<typeof insertCarePlanSchema>;
export type CarePlan = typeof carePlans.$inferSelect;

// Care Plan Health Matters - Conditions, medications, allergies, care needs
export type HealthMatterType = "condition" | "medication" | "allergy" | "care_need" | "equipment" | "other";

export const carePlanHealthMatters = pgTable("care_plan_health_matters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carePlanId: varchar("care_plan_id").notNull().references(() => carePlans.id, { onDelete: "cascade" }),
  
  type: text("type").$type<HealthMatterType>().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // For medications
  dosage: text("dosage"),
  frequency: text("frequency"),
  route: text("route"), // oral, topical, etc.
  prescribedBy: text("prescribed_by"),
  
  // For allergies
  severity: text("severity").$type<"mild" | "moderate" | "severe" | "life_threatening">(),
  reaction: text("reaction"),
  
  // For care needs
  frequency_of_care: text("frequency_of_care"),
  instructions: text("instructions"),
  
  // General
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  notes: text("notes"),
  
  order: text("order").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarePlanHealthMatterSchema = createInsertSchema(carePlanHealthMatters, {
  type: z.enum(["condition", "medication", "allergy", "care_need", "equipment", "other"]),
  severity: z.enum(["mild", "moderate", "severe", "life_threatening"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCarePlanHealthMatter = z.infer<typeof insertCarePlanHealthMatterSchema>;
export type CarePlanHealthMatter = typeof carePlanHealthMatters.$inferSelect;

// Care Plan Diagnoses - Detailed diagnosis tracking
export type DiagnosisSeverity = "mild" | "moderate" | "severe" | "critical";
export type DiagnosisStatus = "active" | "resolved" | "managed" | "monitoring";

export const carePlanDiagnoses = pgTable("care_plan_diagnoses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carePlanId: varchar("care_plan_id").notNull().references(() => carePlans.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  code: text("code"), // ICD-10 or similar code
  description: text("description"),
  
  diagnosedDate: date("diagnosed_date"),
  diagnosedBy: text("diagnosed_by"),
  
  severity: text("severity").$type<DiagnosisSeverity>(),
  status: text("status").$type<DiagnosisStatus>().default("active"),
  
  treatmentPlan: text("treatment_plan"),
  prognosis: text("prognosis"),
  notes: text("notes"),
  
  isPrimary: text("is_primary").default("no").$type<"yes" | "no">(),
  order: text("order").default("0"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarePlanDiagnosisSchema = createInsertSchema(carePlanDiagnoses, {
  severity: z.enum(["mild", "moderate", "severe", "critical"]).optional(),
  status: z.enum(["active", "resolved", "managed", "monitoring"]).optional(),
  isPrimary: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCarePlanDiagnosis = z.infer<typeof insertCarePlanDiagnosisSchema>;
export type CarePlanDiagnosis = typeof carePlanDiagnoses.$inferSelect;

// Care Plan Emergency Contacts and Procedures
export const carePlanEmergencyContacts = pgTable("care_plan_emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carePlanId: varchar("care_plan_id").notNull().references(() => carePlans.id, { onDelete: "cascade" }),
  
  // Contact details
  name: text("name").notNull(),
  relationship: text("relationship"),
  phoneNumber: text("phone_number"),
  alternatePhone: text("alternate_phone"),
  email: text("email"),
  address: text("address"),
  
  // Role
  isPrimaryContact: text("is_primary_contact").default("no").$type<"yes" | "no">(),
  isNextOfKin: text("is_next_of_kin").default("no").$type<"yes" | "no">(),
  hasPowerOfAttorney: text("has_power_of_attorney").default("no").$type<"yes" | "no">(),
  isGuardian: text("is_guardian").default("no").$type<"yes" | "no">(),
  
  priority: text("priority").default("1"), // 1 = first to call
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarePlanEmergencyContactSchema = createInsertSchema(carePlanEmergencyContacts, {
  isPrimaryContact: z.enum(["yes", "no"]).optional(),
  isNextOfKin: z.enum(["yes", "no"]).optional(),
  hasPowerOfAttorney: z.enum(["yes", "no"]).optional(),
  isGuardian: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCarePlanEmergencyContact = z.infer<typeof insertCarePlanEmergencyContactSchema>;
export type CarePlanEmergencyContact = typeof carePlanEmergencyContacts.$inferSelect;

// Care Plan Emergency Procedures
export const carePlanEmergencyProcedures = pgTable("care_plan_emergency_procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carePlanId: varchar("care_plan_id").notNull().references(() => carePlans.id, { onDelete: "cascade" }),
  
  title: text("title").notNull(),
  scenario: text("scenario"), // What triggers this procedure
  steps: text("steps").notNull(), // Step-by-step instructions
  
  // Hospital preferences
  preferredHospital: text("preferred_hospital"),
  hospitalAddress: text("hospital_address"),
  hospitalPhone: text("hospital_phone"),
  
  // Advance care directives
  hasAdvancedCareDirective: text("has_advanced_care_directive").default("no").$type<"yes" | "no">(),
  advancedCareDirectiveType: text("advanced_care_directive_type").$type<"NFR" | "For Resus" | "Other">(),
  advancedCareDirectiveNotes: text("advanced_care_directive_notes"),
  
  order: text("order").default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCarePlanEmergencyProcedureSchema = createInsertSchema(carePlanEmergencyProcedures, {
  hasAdvancedCareDirective: z.enum(["yes", "no"]).optional(),
  advancedCareDirectiveType: z.enum(["NFR", "For Resus", "Other"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCarePlanEmergencyProcedure = z.infer<typeof insertCarePlanEmergencyProcedureSchema>;
export type CarePlanEmergencyProcedure = typeof carePlanEmergencyProcedures.$inferSelect;

// ============================================
// CUSTOMIZABLE FORMS SYSTEM
// ============================================

// Form Template Status
export type FormTemplateStatus = "draft" | "active" | "archived";
// Field types for customizable forms
// Basic inputs: text, textarea, email, number
// Date/time: date, time, datetime
// Selection: yes_no (boolean), checkbox, radio, select, multiselect
// Advanced: signature, file, image_upload, video_upload, audio
// Interactive: rating, slider, scanner, location, image_selection
// Computed: formula (calculated fields)
// Layout: section_header, paragraph, group (field grouping)
// Tasks: task (assignable checklist item)
export type FormFieldType = 
  | "text" | "textarea" | "email" | "number"
  | "date" | "time" | "datetime"
  | "yes_no" | "checkbox" | "radio" | "select" | "multiselect"
  | "signature" | "file" | "image_upload" | "video_upload" | "audio"
  | "rating" | "slider" | "scanner" | "location" | "image_selection"
  | "formula" | "task"
  | "section_header" | "paragraph" | "group";
export type FormSubmissionStatus = "draft" | "submitted" | "voided";

// Form Templates - Reusable form definitions
export const formTemplates = pgTable("form_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").$type<"consent" | "assessment" | "intake" | "review" | "incident" | "checklist" | "other">().default("other"),
  
  status: text("status").$type<FormTemplateStatus>().default("draft"),
  version: text("version").default("1"),
  
  // Settings
  requiresSignature: text("requires_signature").default("no").$type<"yes" | "no">(),
  allowDraft: text("allow_draft").default("yes").$type<"yes" | "no">(),
  
  // Audit
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates, {
  category: z.enum(["consent", "assessment", "intake", "review", "incident", "checklist", "other"]).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  requiresSignature: z.enum(["yes", "no"]).optional(),
  allowDraft: z.enum(["yes", "no"]).optional(),
  createdById: z.string().optional().nullable(),
  createdByName: z.string().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

// Form Template Fields - Field definitions within templates
export const formTemplateFields = pgTable("form_template_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => formTemplates.id, { onDelete: "cascade" }),
  
  fieldKey: text("field_key").notNull(), // Unique key within template
  label: text("label").notNull(),
  description: text("description"),
  placeholder: text("placeholder"),
  
  fieldType: text("field_type").$type<FormFieldType>().notNull(),
  
  // Validation
  isRequired: text("is_required").default("no").$type<"yes" | "no">(),
  minLength: text("min_length"),
  maxLength: text("max_length"),
  minValue: text("min_value"),
  maxValue: text("max_value"),
  pattern: text("pattern"), // Regex pattern
  
  // For select/radio/checkbox/yes_no options
  options: json("options").$type<{ value: string; label: string }[]>(),
  
  // For file/image/video/audio uploads
  acceptedFileTypes: text("accepted_file_types"), // e.g., ".pdf,.jpg,.png"
  maxFileSize: text("max_file_size"), // in MB
  
  // For rating fields
  ratingMax: text("rating_max"), // Max rating value (e.g., "5" for 5-star rating)
  ratingStyle: text("rating_style").$type<"stars" | "numbers" | "emoji">(), // Visual style
  
  // For slider fields
  sliderMin: text("slider_min"),
  sliderMax: text("slider_max"),
  sliderStep: text("slider_step"),
  sliderUnit: text("slider_unit"), // e.g., "%", "kg", "cm"
  
  // For formula/computed fields
  formula: text("formula"), // Expression using other fieldKeys, e.g., "field1 + field2"
  formulaFormat: text("formula_format"), // Output format: number, currency, percentage
  
  // For image_selection fields
  imageOptions: json("image_options").$type<{ value: string; label: string; imageUrl: string }[]>(),
  
  // For task fields
  taskAssignedTo: text("task_assigned_to"), // Staff ID or role
  taskDueOffset: text("task_due_offset"), // Days from form submission
  
  // For scanner fields
  scannerType: text("scanner_type").$type<"barcode" | "qrcode" | "both">(),
  
  // For yes_no fields - optional labels
  yesLabel: text("yes_label"), // Custom label for "Yes" option
  noLabel: text("no_label"), // Custom label for "No" option
  
  // For group fields - contains child fieldKeys
  groupFieldKeys: json("group_field_keys").$type<string[]>(),
  
  // Layout
  section: text("section"),
  order: text("order").default("0"),
  width: text("width").$type<"full" | "half" | "third">().default("full"),
  
  // Conditional display
  conditionalOn: text("conditional_on"), // fieldKey to depend on
  conditionalValue: text("conditional_value"), // value that triggers display
  conditionalOperator: text("conditional_operator").$type<"equals" | "not_equals" | "contains" | "greater_than" | "less_than">(), // Condition operator
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// All valid form field types for validation
const formFieldTypeValues = [
  "text", "textarea", "email", "number",
  "date", "time", "datetime",
  "yes_no", "checkbox", "radio", "select", "multiselect",
  "signature", "file", "image_upload", "video_upload", "audio",
  "rating", "slider", "scanner", "location", "image_selection",
  "formula", "task",
  "section_header", "paragraph", "group"
] as const;

export const insertFormTemplateFieldSchema = createInsertSchema(formTemplateFields, {
  fieldType: z.enum(formFieldTypeValues),
  isRequired: z.enum(["yes", "no"]).optional(),
  width: z.enum(["full", "half", "third"]).optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  ratingStyle: z.enum(["stars", "numbers", "emoji"]).optional().nullable(),
  scannerType: z.enum(["barcode", "qrcode", "both"]).optional().nullable(),
  conditionalOperator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than"]).optional().nullable(),
  imageOptions: z.array(z.object({ value: z.string(), label: z.string(), imageUrl: z.string() })).optional(),
  groupFieldKeys: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFormTemplateField = z.infer<typeof insertFormTemplateFieldSchema>;
export type FormTemplateField = typeof formTemplateFields.$inferSelect;

// Form Submissions - Completed forms for clients
export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => formTemplates.id, { onDelete: "restrict" }),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  status: text("status").$type<FormSubmissionStatus>().default("draft"),
  
  // Submitter info
  submittedById: varchar("submitted_by_id").references(() => users.id, { onDelete: "set null" }),
  submittedByName: text("submitted_by_name"),
  submittedAt: timestamp("submitted_at"),
  
  // Void info
  voidedById: varchar("voided_by_id").references(() => users.id, { onDelete: "set null" }),
  voidedByName: text("voided_by_name"),
  voidedAt: timestamp("voided_at"),
  voidReason: text("void_reason"),
  
  // Link to appointment if applicable
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  
  // Expiry/validity tracking for compliance
  expiryDate: text("expiry_date"), // Date when form expires and needs renewal
  validityPeriod: text("validity_period").$type<"annual" | "6-monthly" | "as-needed">(), // How long form is valid
  
  // Australian Privacy Act compliant archiving (7-year retention)
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  archivedById: varchar("archived_by_id").references(() => users.id, { onDelete: "set null" }),
  archivedByName: text("archived_by_name"),
  retentionExpiresAt: timestamp("retention_expires_at"), // 7 years from submission date
  
  // Document type link for auto-updating client compliance dates
  linkedDocumentType: text("linked_document_type"), // e.g., "serviceAgreement", "consentForm", "riskAssessment"
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions, {
  status: z.enum(["draft", "submitted", "voided"]).optional(),
  validityPeriod: z.enum(["annual", "6-monthly", "as-needed"]).optional().nullable(),
  isArchived: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

// Form Submission Values - Field values for submissions
export const formSubmissionValues = pgTable("form_submission_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => formSubmissions.id, { onDelete: "cascade" }),
  fieldId: varchar("field_id").notNull().references(() => formTemplateFields.id, { onDelete: "cascade" }),
  
  // Value stored as JSON to support all field types
  value: json("value").$type<unknown>(),
  
  // For file uploads
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFormSubmissionValueSchema = createInsertSchema(formSubmissionValues, {
  value: z.unknown().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFormSubmissionValue = z.infer<typeof insertFormSubmissionValueSchema>;
export type FormSubmissionValue = typeof formSubmissionValues.$inferSelect;

// Form Signatures - Digital signatures for submissions
export const formSignatures = pgTable("form_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => formSubmissions.id, { onDelete: "cascade" }),
  
  // Signer info
  signerName: text("signer_name").notNull(),
  signerRole: text("signer_role"), // e.g., "Client", "Guardian", "Witness", "Staff"
  signerRelationship: text("signer_relationship"), // e.g., "Self", "Parent", "Legal Guardian"
  
  // Signature data
  signatureData: text("signature_data"), // Base64 encoded image or SVG path
  signatureUrl: text("signature_url"), // URL if stored as file
  
  // Verification
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  
  // Hash for tamper detection
  signatureHash: text("signature_hash"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFormSignatureSchema = createInsertSchema(formSignatures).omit({
  id: true,
  createdAt: true,
});

export type InsertFormSignature = z.infer<typeof insertFormSignatureSchema>;
export type FormSignature = typeof formSignatures.$inferSelect;

// Appointment Type Required Forms - Link form templates to appointment types
export const appointmentTypeRequiredForms = pgTable("appointment_type_required_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  appointmentType: text("appointment_type").$type<AppointmentType>().notNull(),
  templateId: varchar("template_id").notNull().references(() => formTemplates.id, { onDelete: "cascade" }),
  
  timing: text("timing").$type<"before" | "during" | "after">().default("during"),
  isRequired: text("is_required").default("yes").$type<"yes" | "no">(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppointmentTypeRequiredFormSchema = createInsertSchema(appointmentTypeRequiredForms, {
  appointmentType: z.enum(["home_visit", "community_access", "transport", "nursing", "assessment", "review", "other"]),
  timing: z.enum(["before", "during", "after"]).optional(),
  isRequired: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertAppointmentTypeRequiredForm = z.infer<typeof insertAppointmentTypeRequiredFormSchema>;
export type AppointmentTypeRequiredForm = typeof appointmentTypeRequiredForms.$inferSelect;

// ============================================
// NON-FACE-TO-FACE SERVICE LOGS
// ============================================

export type NonFaceToFaceMethod = "email" | "phone" | "video_call" | "plan_review" | "document_review";

export const nonFaceToFaceServiceLogs = pgTable("non_face_to_face_service_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // Contact details
  contactDateTime: timestamp("contact_date_time").notNull(),
  method: text("method").$type<NonFaceToFaceMethod>().notNull(),
  durationMinutes: text("duration_minutes"),
  
  // Who and where
  contactedBy: text("contacted_by").notNull(),
  contactedById: varchar("contacted_by_id"),
  location: text("location"), // Where the call/email was made from
  recipientName: text("recipient_name"), // Who was contacted
  recipientRole: text("recipient_role"), // e.g., "Client", "Family Member", "Support Coordinator"
  
  // Notes
  summary: text("summary").notNull(),
  outcome: text("outcome"),
  followUpRequired: text("follow_up_required").default("no").$type<"yes" | "no">(),
  followUpDate: date("follow_up_date"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNonFaceToFaceServiceLogSchema = createInsertSchema(nonFaceToFaceServiceLogs, {
  method: z.enum(["email", "phone", "video_call", "plan_review", "document_review"]),
  contactDateTime: z.coerce.date(),
  followUpRequired: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNonFaceToFaceServiceLog = z.infer<typeof insertNonFaceToFaceServiceLogSchema>;
export type NonFaceToFaceServiceLog = typeof nonFaceToFaceServiceLogs.$inferSelect;

// ============================================
// REUSABLE DIAGNOSES DATABASE
// ============================================

export const diagnoses = pgTable("diagnoses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: text("name").notNull(),
  icdCode: text("icd_code"), // ICD-10 code if applicable
  category: text("category"), // e.g., "Neurological", "Cardiovascular", "Mental Health"
  description: text("description"),
  
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDiagnosisSchema = createInsertSchema(diagnoses, {
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiagnosis = z.infer<typeof insertDiagnosisSchema>;
export type Diagnosis = typeof diagnoses.$inferSelect;

// Client Diagnoses - links clients to diagnoses
export const clientDiagnoses = pgTable("client_diagnoses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  diagnosisId: varchar("diagnosis_id").notNull().references(() => diagnoses.id, { onDelete: "cascade" }),
  
  isPrimary: text("is_primary").default("no").$type<"yes" | "no">(),
  diagnosedDate: date("diagnosed_date"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientDiagnosisSchema = createInsertSchema(clientDiagnoses, {
  isPrimary: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertClientDiagnosis = z.infer<typeof insertClientDiagnosisSchema>;
export type ClientDiagnosis = typeof clientDiagnoses.$inferSelect;

// ============================================
// SIL HOUSES (Supported Independent Living)
// ============================================

export type SilHouseStatus = "Active" | "Inactive" | "Under Maintenance";
export type SilHousePropertyType = "Apartment" | "House" | "Unit" | "Villa" | "Other";
export type RentFrequency = "Weekly" | "Fortnightly" | "Monthly";
export type NdisFundingCategory = "Core Supports" | "Capital Supports";

export const silHouses = pgTable("sil_houses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic Info
  houseName: text("house_name").notNull(),
  streetAddress: text("street_address").notNull(),
  suburb: text("suburb").notNull(),
  postcode: text("postcode").notNull(),
  state: text("state").notNull().default("NSW"),
  propertyType: text("property_type").$type<SilHousePropertyType>().notNull().default("House"),
  status: text("status").$type<SilHouseStatus>().notNull().default("Active"),
  
  // Details
  maxResidents: integer("max_residents").notNull().default(1),
  currentResidents: integer("current_residents").notNull().default(0),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  wheelchairAccessible: text("wheelchair_accessible").default("no").$type<"yes" | "no">(),
  
  // Management & Contact
  houseManagerId: varchar("house_manager_id"),
  houseManagerName: text("house_manager_name"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  
  // NDIS-specific
  silProviderNumber: text("sil_provider_number"),
  ndisFundingCategory: text("ndis_funding_category").$type<NdisFundingCategory>(),
  
  // Financial
  leaseStartDate: date("lease_start_date"),
  leaseEndDate: date("lease_end_date"),
  rentAmount: integer("rent_amount"),
  rentFrequency: text("rent_frequency").$type<RentFrequency>().default("Weekly"),
  
  // Compliance (required for NDIS)
  safetyCertificateExpiry: date("safety_certificate_expiry"),
  fireSafetyCheckDate: date("fire_safety_check_date"),
  buildingInspectionDate: date("building_inspection_date"),
  incidentReportingLog: text("incident_reporting_log"),
  privacyConsentObtained: text("privacy_consent_obtained").default("no").$type<"yes" | "no">(),
  
  // Audit
  lastModifiedBy: varchar("last_modified_by"),
  lastModifiedByName: text("last_modified_by_name"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSilHouseSchema = createInsertSchema(silHouses, {
  houseName: z.string().min(1, "House name is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  suburb: z.string().min(1, "Suburb is required"),
  postcode: z.string().length(4, "Postcode must be 4 digits").regex(/^\d{4}$/, "Invalid postcode"),
  state: z.enum(["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]),
  propertyType: z.enum(["Apartment", "House", "Unit", "Villa", "Other"]),
  status: z.enum(["Active", "Inactive", "Under Maintenance"]),
  maxResidents: z.number().int().min(1, "Must have at least 1 resident capacity"),
  currentResidents: z.number().int().min(0).optional(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  wheelchairAccessible: z.enum(["yes", "no"]).optional(),
  rentAmount: z.number().int().min(0).optional().nullable(),
  rentFrequency: z.enum(["Weekly", "Fortnightly", "Monthly"]).optional(),
  ndisFundingCategory: z.enum(["Core Supports", "Capital Supports"]).optional().nullable(),
  privacyConsentObtained: z.enum(["yes", "no"]).optional(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSilHouse = z.infer<typeof insertSilHouseSchema>;
export type SilHouse = typeof silHouses.$inferSelect;

// SIL House Audit Log for NDIS compliance
export type SilHouseAuditAction = "create" | "update" | "delete" | "view" | "export";

export const silHouseAuditLog = pgTable("sil_house_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  silHouseId: varchar("sil_house_id"),
  silHouseName: text("sil_house_name"),
  
  action: text("action").$type<SilHouseAuditAction>().notNull(),
  userId: varchar("user_id"),
  userName: text("user_name"),
  
  details: json("details").$type<Record<string, any>>(),
  deleteReason: text("delete_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSilHouseAuditLogSchema = createInsertSchema(silHouseAuditLog, {
  action: z.enum(["create", "update", "delete", "view", "export"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertSilHouseAuditLog = z.infer<typeof insertSilHouseAuditLogSchema>;
export type SilHouseAuditLog = typeof silHouseAuditLog.$inferSelect;

// ============================================
// NOTIFICATIONS SYSTEM
// ============================================

export type NotificationType = 
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assigned"
  | "ticket_comment"
  | "ticket_resolved"
  | "announcement"
  | "task_assigned"
  | "task_updated"
  | "task_completed"
  | "task_due"
  | "approval_required"
  | "appointment_reminder"
  | "appointment_update"
  | "appointment_cancelled"
  | "compliance_warning"
  | "compliance_expired"
  | "chat_message"
  | "chat_mention"
  | "client_update"
  | "client_incident"
  | "care_plan_update"
  | "document_uploaded"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull(),
  type: text("type").$type<NotificationType>().notNull(),
  priority: text("priority").$type<NotificationPriority>().default("normal"),
  
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Link to related entity for navigation
  relatedType: text("related_type"), // "ticket", "task", "appointment", "client", "chat", etc.
  relatedId: varchar("related_id"),
  linkUrl: text("link_url"), // Full URL path for navigation
  
  // Additional metadata as JSON
  metadata: json("metadata").$type<Record<string, any>>(),
  
  // Read tracking
  isRead: text("is_read").default("no").$type<"yes" | "no">(),
  readAt: timestamp("read_at"),
  
  // Delivery tracking
  isDelivered: text("is_delivered").default("no").$type<"yes" | "no">(),
  deliveredAt: timestamp("delivered_at"),
  
  // Archiving
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const notificationTypeEnum = z.enum([
  "ticket_created", "ticket_updated", "ticket_assigned", "ticket_comment", "ticket_resolved",
  "announcement", "task_assigned", "task_updated", "task_completed", "task_due", "approval_required",
  "appointment_reminder", "appointment_update", "appointment_cancelled",
  "compliance_warning", "compliance_expired",
  "chat_message", "chat_mention",
  "client_update", "client_incident", "care_plan_update", "document_uploaded",
  "system"
]);

export const insertNotificationSchema = createInsertSchema(notifications, {
  type: notificationTypeEnum,
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
  isRead: z.enum(["yes", "no"]).optional(),
  isDelivered: z.enum(["yes", "no"]).optional(),
  isArchived: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  readAt: true,
  deliveredAt: true,
  archivedAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Notification Preferences - per user settings
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().unique(),
  
  // Global settings
  emailEnabled: text("email_enabled").default("yes").$type<"yes" | "no">(),
  pushEnabled: text("push_enabled").default("yes").$type<"yes" | "no">(),
  soundEnabled: text("sound_enabled").default("yes").$type<"yes" | "no">(),
  
  // Per-category toggles
  appointmentAlerts: text("appointment_alerts").default("yes").$type<"yes" | "no">(),
  taskAlerts: text("task_alerts").default("yes").$type<"yes" | "no">(),
  complianceAlerts: text("compliance_alerts").default("yes").$type<"yes" | "no">(),
  chatAlerts: text("chat_alerts").default("yes").$type<"yes" | "no">(),
  ticketAlerts: text("ticket_alerts").default("yes").$type<"yes" | "no">(),
  clientAlerts: text("client_alerts").default("yes").$type<"yes" | "no">(),
  systemAlerts: text("system_alerts").default("yes").$type<"yes" | "no">(),
  
  // Quiet hours
  quietHoursEnabled: text("quiet_hours_enabled").default("no").$type<"yes" | "no">(),
  quietHoursStart: text("quiet_hours_start"), // e.g., "22:00"
  quietHoursEnd: text("quiet_hours_end"), // e.g., "07:00"
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences, {
  emailEnabled: z.enum(["yes", "no"]).optional(),
  pushEnabled: z.enum(["yes", "no"]).optional(),
  soundEnabled: z.enum(["yes", "no"]).optional(),
  appointmentAlerts: z.enum(["yes", "no"]).optional(),
  taskAlerts: z.enum(["yes", "no"]).optional(),
  complianceAlerts: z.enum(["yes", "no"]).optional(),
  chatAlerts: z.enum(["yes", "no"]).optional(),
  ticketAlerts: z.enum(["yes", "no"]).optional(),
  clientAlerts: z.enum(["yes", "no"]).optional(),
  systemAlerts: z.enum(["yes", "no"]).optional(),
  quietHoursEnabled: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

// ============================================
// HELP DESK / SUPPORT TICKETS
// ============================================

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_response" | "resolved" | "closed";
export type TicketCategory = "bug" | "feature_request" | "question" | "access_issue" | "data_issue" | "other";

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  ticketNumber: serial("ticket_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  
  category: text("category").$type<TicketCategory>().notNull().default("other"),
  priority: text("priority").$type<TicketPriority>().notNull().default("medium"),
  status: text("status").$type<TicketStatus>().notNull().default("open"),
  
  // Error details (optional)
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  pageUrl: text("page_url"),
  
  // Screenshots/attachments stored as JSON array of URLs
  screenshots: json("screenshots").$type<string[]>().default([]),
  
  // Creator info
  createdById: varchar("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdByEmail: text("created_by_email"),
  
  // Assignment
  assignedToId: varchar("assigned_to_id"),
  assignedToName: text("assigned_to_name"),
  assignedAt: timestamp("assigned_at"),
  
  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolvedById: varchar("resolved_by_id"),
  resolvedByName: text("resolved_by_name"),
  resolutionNotes: text("resolution_notes"),
  
  closedAt: timestamp("closed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets, {
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["bug", "feature_request", "question", "access_issue", "data_issue", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "waiting_response", "resolved", "closed"]),
  screenshots: z.array(z.string()).optional(),
}).omit({
  id: true,
  ticketNumber: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Ticket Comments
export const ticketComments = pgTable("ticket_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  
  content: text("content").notNull(),
  
  // Is this an internal note (only visible to support staff)?
  isInternal: text("is_internal").default("no").$type<"yes" | "no">(),
  
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments, {
  content: z.string().min(1, "Comment content is required"),
  isInternal: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;

// ============================================
// ANNOUNCEMENTS
// ============================================

export type AnnouncementType = "info" | "success" | "warning" | "alert";
export type AnnouncementAudience = "all" | "support_workers" | "nurses" | "admin" | "managers";

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").$type<AnnouncementType>().notNull().default("info"),
  
  // Target audience
  audience: text("audience").$type<AnnouncementAudience>().notNull().default("all"),
  
  // Scheduling
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  
  // Pinned announcements stay at top
  isPinned: text("is_pinned").default("no").$type<"yes" | "no">(),
  
  // Author
  createdById: varchar("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements, {
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["info", "success", "warning", "alert"]),
  audience: z.enum(["all", "support_workers", "nurses", "admin", "managers"]),
  isPinned: z.enum(["yes", "no"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// ============================================
// TASKS
// ============================================

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "not_started" | "in_progress" | "completed" | "cancelled";
export type TaskCategory = "general" | "client_care" | "documentation" | "compliance" | "training" | "meeting" | "follow_up" | "other";

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Task number for easy reference
  taskNumber: serial("task_number").notNull(),
  
  // Task details
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").$type<TaskCategory>().notNull().default("general"),
  priority: text("priority").$type<TaskPriority>().notNull().default("medium"),
  status: text("status").$type<TaskStatus>().notNull().default("not_started"),
  
  // Due date and reminders
  dueDate: timestamp("due_date"),
  reminderDate: timestamp("reminder_date"),
  
  // Optional link to a client
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientName: text("client_name"),
  
  // Creator
  createdById: varchar("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  
  // Assignment (can be assigned to self or others)
  assignedToId: varchar("assigned_to_id"),
  assignedToName: text("assigned_to_name"),
  assignedAt: timestamp("assigned_at"),
  
  // Completion
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id"),
  completedByName: text("completed_by_name"),
  completionNotes: text("completion_notes"),
  
  // Recurrence (optional)
  isRecurring: text("is_recurring").default("no").$type<"yes" | "no">(),
  recurrencePattern: text("recurrence_pattern"), // daily, weekly, monthly, custom
  recurrenceEndDate: timestamp("recurrence_end_date"),
  parentTaskId: varchar("parent_task_id"), // For recurring task instances
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Helper to coerce string dates to Date objects with validation
const coerceDateSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === "") return null;
    if (val instanceof Date) return val;
    if (typeof val === "string") {
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  },
  z.date().nullable().optional()
);

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["general", "client_care", "documentation", "compliance", "training", "meeting", "follow_up", "other"]).optional().default("general"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  status: z.enum(["not_started", "in_progress", "completed", "cancelled"]).optional().default("not_started"),
  isRecurring: z.enum(["yes", "no"]).optional(),
  recurrencePattern: z.enum(["daily", "weekly", "fortnightly", "monthly", "custom"]).optional().nullable(),
  // Coerce string dates from JSON to Date objects with validation
  dueDate: coerceDateSchema,
  reminderDate: coerceDateSchema,
  recurrenceEndDate: coerceDateSchema,
  assignedAt: coerceDateSchema,
}).omit({
  id: true,
  taskNumber: true,
  createdAt: true,
  updatedAt: true,
}).refine(
  (data) => {
    // If recurring is "yes", require a recurrence pattern
    if (data.isRecurring === "yes" && !data.recurrencePattern) {
      return false;
    }
    return true;
  },
  {
    message: "Recurrence pattern is required when task is recurring",
    path: ["recurrencePattern"],
  }
);

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Task Comments/Updates
export const taskComments = pgTable("task_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  
  content: text("content").notNull(),
  
  // Type of update
  commentType: text("comment_type").$type<"comment" | "status_change" | "assignment" | "due_date_change">().default("comment"),
  
  // For status changes, track old and new values
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  
  authorId: varchar("author_id").notNull(),
  authorName: text("author_name").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskCommentSchema = createInsertSchema(taskComments, {
  content: z.string().min(1, "Comment content is required"),
  commentType: z.enum(["comment", "status_change", "assignment", "due_date_change"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;

// Task Checklists (sub-items within a task)
export const taskChecklists = pgTable("task_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  
  title: text("title").notNull(),
  isCompleted: text("is_completed").default("no").$type<"yes" | "no">(),
  completedAt: timestamp("completed_at"),
  completedById: varchar("completed_by_id"),
  
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskChecklistSchema = createInsertSchema(taskChecklists, {
  title: z.string().min(1, "Title is required"),
  isCompleted: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskChecklist = z.infer<typeof insertTaskChecklistSchema>;
export type TaskChecklist = typeof taskChecklists.$inferSelect;

// ============================================
// CHAT SYSTEM
// ============================================

export type ChatRoomType = "direct" | "group" | "client" | "announcement";
export type ChatRoomStatus = "active" | "archived" | "deleted";

// Filter criteria for creating group chats based on staff attributes
export type ChatStaffFilter = {
  roles?: UserRole[];          // Filter by staff roles (e.g., nurses, managers)
  skills?: string[];           // Filter by staff skills
  clientAssignments?: string[];// Filter by staff assigned to specific clients
};

export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  name: text("name"), // For group chats, null for direct messages
  type: text("type").$type<ChatRoomType>().notNull().default("direct"),
  
  // Room lifecycle status
  status: text("status").$type<ChatRoomStatus>().notNull().default("active"),
  
  // For client-linked conversations
  clientId: varchar("client_id"),
  clientName: text("client_name"),
  
  // Room metadata
  description: text("description"),
  avatarUrl: text("avatar_url"),
  
  // Announcement channel (broadcast only - only admins can post)
  isAnnouncement: text("is_announcement").default("no").$type<"yes" | "no">(),
  
  // Lock feature (locked = announcement-only, admins can post, others read-only)
  isLocked: text("is_locked").default("no").$type<"yes" | "no">(),
  lockedAt: timestamp("locked_at"),
  lockedById: varchar("locked_by_id"),
  lockedByName: text("locked_by_name"),
  
  // Staff filter criteria used to create this group (for auto-sync)
  staffFilter: json("staff_filter").$type<ChatStaffFilter>(),
  
  // Created by
  createdById: varchar("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  
  // Last activity for sorting
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  
  // Archive tracking
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  archivedById: varchar("archived_by_id"),
  archivedByName: text("archived_by_name"),
  
  // Soft delete tracking
  isDeleted: text("is_deleted").default("no").$type<"yes" | "no">(),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id"),
  deletedByName: text("deleted_by_name"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatRoomSchema = createInsertSchema(chatRooms, {
  name: z.string().optional(),
  type: z.enum(["direct", "group", "client", "announcement"]).optional().default("direct"),
  status: z.enum(["active", "archived", "deleted"]).optional().default("active"),
  description: z.string().optional(),
  isAnnouncement: z.enum(["yes", "no"]).optional(),
  isLocked: z.enum(["yes", "no"]).optional(),
  staffFilter: z.object({
    roles: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    clientAssignments: z.array(z.string()).optional(),
  }).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
  lastMessagePreview: true,
  archivedAt: true,
  archivedById: true,
  archivedByName: true,
  lockedAt: true,
  lockedById: true,
  lockedByName: true,
  deletedAt: true,
  deletedById: true,
  deletedByName: true,
  isDeleted: true,
});

export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;

// Chat Room Participants
export const chatRoomParticipants = pgTable("chat_room_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  staffId: varchar("staff_id").notNull(),
  staffName: text("staff_name").notNull(),
  staffEmail: text("staff_email"),
  staffAvatarUrl: text("staff_avatar_url"), // Profile photo URL for staff member
  
  // Role in the room
  role: text("role").$type<"admin" | "member">().default("member"),
  
  // Who added this participant (for audit trail)
  addedById: varchar("added_by_id"),
  addedByName: text("added_by_name"),
  
  // Read tracking
  lastReadAt: timestamp("last_read_at"),
  
  // Notification preferences
  isMuted: text("is_muted").default("no").$type<"yes" | "no">(),
  isPinned: text("is_pinned").default("no").$type<"yes" | "no">(),
  
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertChatRoomParticipantSchema = createInsertSchema(chatRoomParticipants, {
  role: z.enum(["admin", "member"]).optional().default("member"),
  isMuted: z.enum(["yes", "no"]).optional(),
  isPinned: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  joinedAt: true,
});

export type InsertChatRoomParticipant = z.infer<typeof insertChatRoomParticipantSchema>;
export type ChatRoomParticipant = typeof chatRoomParticipants.$inferSelect;

// Chat Messages
export type ChatMessageType = "text" | "system" | "file" | "image" | "video" | "gif" | "voice";

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  // Sender info
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  
  // Message content
  content: text("content").notNull(),
  messageType: text("message_type").$type<ChatMessageType>().default("text"),
  
  // Encryption flag for sensitive data
  isEncrypted: text("is_encrypted").default("yes").$type<"yes" | "no">(),
  
  // File attachment (if any) - legacy single attachment
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  
  // Reply to another message (iMessage-style threading)
  replyToId: varchar("reply_to_id"),
  replyToPreview: text("reply_to_preview"),
  replyToSenderId: varchar("reply_to_sender_id"),
  replyToSenderName: text("reply_to_sender_name"),
  
  // Forwarded message tracking
  isForwarded: text("is_forwarded").default("no").$type<"yes" | "no">(),
  forwardedFromMessageId: varchar("forwarded_from_message_id"),
  forwardedFromRoomId: varchar("forwarded_from_room_id"),
  forwardedFromRoomName: text("forwarded_from_room_name"),
  forwardedById: varchar("forwarded_by_id"),
  forwardedByName: text("forwarded_by_name"),
  forwardedAt: timestamp("forwarded_at"),
  forwardedPreview: json("forwarded_preview").$type<{
    originalSenderId: string;
    originalSenderName: string;
    originalContent: string;
    originalMessageType: string;
    originalCreatedAt: string;
  }>(),
  
  // Edit/delete tracking
  isEdited: text("is_edited").default("no").$type<"yes" | "no">(),
  editedAt: timestamp("edited_at"),
  isDeleted: text("is_deleted").default("no").$type<"yes" | "no">(),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id"),
  deletedByName: text("deleted_by_name"),
  
  // Staff mentions (@mentions)
  mentions: json("mentions").$type<{
    staffId: string;
    staffName: string;
    startIndex: number;
    endIndex: number;
  }[]>(),
  
  // Message pinning
  isPinned: text("is_pinned").default("no").$type<"yes" | "no">(),
  pinnedAt: timestamp("pinned_at"),
  pinnedById: varchar("pinned_by_id"),
  pinnedByName: text("pinned_by_name"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages, {
  content: z.string().default(""),
  messageType: z.enum(["text", "system", "file", "image", "video", "gif", "voice"]).optional().default("text"),
  replyToId: z.string().optional(),
  replyToPreview: z.string().optional(),
  replyToSenderId: z.string().optional(),
  replyToSenderName: z.string().optional(),
  isForwarded: z.enum(["yes", "no"]).optional(),
  forwardedFromMessageId: z.string().optional(),
  forwardedFromRoomId: z.string().optional(),
  forwardedFromRoomName: z.string().optional(),
  forwardedById: z.string().optional(),
  forwardedByName: z.string().optional(),
  forwardedPreview: z.object({
    originalSenderId: z.string(),
    originalSenderName: z.string(),
    originalContent: z.string(),
    originalMessageType: z.string(),
    originalCreatedAt: z.string(),
  }).optional(),
  mentions: z.array(z.object({
    staffId: z.string(),
    staffName: z.string(),
    startIndex: z.number(),
    endIndex: z.number(),
  })).optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  isEdited: true,
  editedAt: true,
  isDeleted: true,
  deletedAt: true,
  deletedById: true,
  deletedByName: true,
  forwardedAt: true,
  isPinned: true,
  pinnedAt: true,
  pinnedById: true,
  pinnedByName: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Chat Message Attachments (for multiple attachments per message)
export type ChatAttachmentType = "image" | "video" | "gif" | "file" | "audio" | "voice";

export const chatMessageAttachments = pgTable("chat_message_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  
  // Attachment details
  type: text("type").$type<ChatAttachmentType>().notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  
  // Storage
  storageKey: text("storage_key").notNull(), // Path in storage
  thumbnailKey: text("thumbnail_key"), // Path to thumbnail for images/videos
  
  // Media metadata
  width: integer("width"), // For images/videos
  height: integer("height"), // For images/videos
  duration: integer("duration"), // For videos/audio in seconds
  
  // For GIFs from external sources (like Tenor)
  externalUrl: text("external_url"),
  externalProvider: text("external_provider"), // "tenor", "giphy", etc.
  externalId: text("external_id"),
  
  // Processing status
  processingStatus: text("processing_status").$type<"pending" | "processing" | "completed" | "failed">().default("pending"),
  processingError: text("processing_error"),
  
  // Media retention - expires 30 days after creation
  expiresAt: timestamp("expires_at"),
  isExpired: text("is_expired").default("no").$type<"yes" | "no">(),
  expiredAt: timestamp("expired_at"),
  
  // Audit metadata for deleted media
  fileHash: text("file_hash"), // SHA-256 hash for audit trail
  deletedReason: text("deleted_reason"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageAttachmentSchema = createInsertSchema(chatMessageAttachments, {
  type: z.enum(["image", "video", "gif", "file", "audio", "voice"]),
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessageAttachment = z.infer<typeof insertChatMessageAttachmentSchema>;
export type ChatMessageAttachment = typeof chatMessageAttachments.$inferSelect;

// Chat Audit Log
export type ChatAuditAction = 
  | "room_created" 
  | "room_archived" 
  | "room_unarchived" 
  | "room_deleted" 
  | "room_locked" 
  | "room_unlocked"
  | "participant_added" 
  | "participant_removed" 
  | "participant_role_changed"
  | "message_deleted" 
  | "message_edited"
  | "message_forwarded"
  | "attachment_uploaded"
  | "attachment_deleted";

export const chatAuditLogs = pgTable("chat_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Action details
  action: text("action").$type<ChatAuditAction>().notNull(),
  
  // Actor (who performed the action)
  actorId: varchar("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role"),
  
  // Affected entities
  roomId: varchar("room_id").references(() => chatRooms.id, { onDelete: "set null" }),
  roomName: text("room_name"),
  messageId: varchar("message_id"),
  attachmentId: varchar("attachment_id"),
  
  // For participant changes
  targetUserId: varchar("target_user_id"),
  targetUserName: text("target_user_name"),
  
  // Additional context
  details: json("details").$type<Record<string, any>>(),
  
  // For forwarding
  sourceRoomId: varchar("source_room_id"),
  sourceRoomName: text("source_room_name"),
  
  // IP and session info for compliance
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatAuditLogSchema = createInsertSchema(chatAuditLogs, {
  action: z.enum([
    "room_created", "room_archived", "room_unarchived", "room_deleted", 
    "room_locked", "room_unlocked", "participant_added", "participant_removed",
    "participant_role_changed", "message_deleted", "message_edited",
    "message_forwarded", "attachment_uploaded", "attachment_deleted"
  ]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertChatAuditLog = z.infer<typeof insertChatAuditLogSchema>;
export type ChatAuditLog = typeof chatAuditLogs.$inferSelect;

// Chat Message Reactions
export type ChatReactionEmoji = "heart" | "thumbs_up" | "thumbs_down" | "diamond" | "party";

export const chatMessageReactions = pgTable("chat_message_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  // Reactor info
  staffId: varchar("staff_id").notNull(),
  staffName: text("staff_name").notNull(),
  
  // Reaction type
  emoji: text("emoji").$type<ChatReactionEmoji>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate reactions of the same emoji by same user on same message
  uniqueReaction: sql`UNIQUE(message_id, staff_id, emoji)`,
}));

export const insertChatMessageReactionSchema = createInsertSchema(chatMessageReactions, {
  emoji: z.enum(["heart", "thumbs_up", "thumbs_down", "diamond", "party"]),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessageReaction = z.infer<typeof insertChatMessageReactionSchema>;
export type ChatMessageReaction = typeof chatMessageReactions.$inferSelect;

// Chat Message Read Receipts - per-message tracking of who has read
export const chatMessageReads = pgTable("chat_message_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  // Reader info
  staffId: varchar("staff_id").notNull(),
  staffName: text("staff_name").notNull(),
  
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate read entries
  uniqueRead: sql`UNIQUE(message_id, staff_id)`,
}));

export const insertChatMessageReadSchema = createInsertSchema(chatMessageReads).omit({
  id: true,
  readAt: true,
});

export type InsertChatMessageRead = z.infer<typeof insertChatMessageReadSchema>;
export type ChatMessageRead = typeof chatMessageReads.$inferSelect;

// Chat Message Delivery Receipts - per-message tracking of when delivered to each user
export const chatMessageDeliveries = pgTable("chat_message_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  messageId: varchar("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  // Recipient info
  staffId: varchar("staff_id").notNull(),
  staffName: text("staff_name").notNull(),
  
  deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate delivery entries
  uniqueDelivery: sql`UNIQUE(message_id, staff_id)`,
}));

export const insertChatMessageDeliverySchema = createInsertSchema(chatMessageDeliveries).omit({
  id: true,
  deliveredAt: true,
});

export type InsertChatMessageDelivery = z.infer<typeof insertChatMessageDeliverySchema>;
export type ChatMessageDelivery = typeof chatMessageDeliveries.$inferSelect;

// Scheduled Messages
export const scheduledMessages = pgTable("scheduled_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  // Sender info
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  
  // Message content
  content: text("content").notNull(),
  
  // Scheduling
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").$type<"pending" | "sent" | "cancelled" | "failed">().default("pending"),
  
  // When sent or cancelled
  sentAt: timestamp("sent_at"),
  cancelledAt: timestamp("cancelled_at"),
  
  // Created message ID (after sending)
  messageId: varchar("message_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages, {
  content: z.string().min(1),
  scheduledAt: z.string().or(z.date()),
}).omit({
  id: true,
  createdAt: true,
  status: true,
  sentAt: true,
  cancelledAt: true,
  messageId: true,
});

export type InsertScheduledMessage = z.infer<typeof insertScheduledMessageSchema>;
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;

// ============================================
// Learning Management System (LMS) Tables
// ============================================

// LMS Course Status Types
export type LmsCourseStatus = "draft" | "published" | "archived";
export type LmsModuleType = "video" | "text" | "quiz" | "document" | "image" | "poll" | "webinar";
export type LmsEnrollmentStatus = "not_started" | "in_progress" | "completed" | "expired" | "failed";
export type LmsComplianceStatus = "compliant" | "due_soon" | "overdue" | "expired" | "not_required";
export type LmsQuizQuestionType = "multiple_choice" | "true_false" | "short_answer" | "matching" | "fill_blank";
export type LmsDifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type LmsBadgeType = "completion" | "quiz_master" | "streak" | "speed" | "perfect_score" | "milestone" | "special";

// LMS Courses - Main course definitions
export const lmsCourses = pgTable("lms_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  thumbnailUrl: text("thumbnail_url"),
  coverImageUrl: text("cover_image_url"),

  // Course metadata
  status: text("status").default("draft").$type<LmsCourseStatus>(),
  version: integer("version").default(1),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  difficultyLevel: text("difficulty_level").$type<LmsDifficultyLevel>().default("beginner"),

  // Compliance settings
  isComplianceRequired: text("is_compliance_required").default("no").$type<"yes" | "no">(),
  complianceCategory: text("compliance_category"), // e.g., "safety", "ndis_ethics", "manual_handling"
  expirationDays: integer("expiration_days"), // Days until certification expires (e.g., 365 for annual)

  // Course structure settings
  requireSequentialProgress: text("require_sequential_progress").default("yes").$type<"yes" | "no">(),
  minimumPassingScore: integer("minimum_passing_score").default(80), // Percentage
  maxQuizAttempts: integer("max_quiz_attempts").default(3),

  // Gamification settings
  gamificationEnabled: text("gamification_enabled").default("yes").$type<"yes" | "no">(),
  gamificationIntensity: text("gamification_intensity").$type<"low" | "medium" | "high">().default("medium"),
  basePointsValue: integer("base_points_value").default(100),
  completionBadgeId: varchar("completion_badge_id"),

  // Targeting/enrollment rules
  targetRoles: json("target_roles").$type<string[]>().default([]), // Auto-enroll these roles
  targetDepartments: json("target_departments").$type<string[]>().default([]),
  prerequisiteCourseIds: json("prerequisite_course_ids").$type<string[]>().default([]),

  // Tags and categorization
  tags: json("tags").$type<string[]>().default([]),
  category: text("category"),
  serviceTypes: json("service_types").$type<string[]>().default([]), // NDIS, Support at Home, Private

  // Accessibility
  hasClosedCaptions: text("has_closed_captions").default("no").$type<"yes" | "no">(),
  hasAudioDescription: text("has_audio_description").default("no").$type<"yes" | "no">(),
  supportsScreenReader: text("supports_screen_reader").default("yes").$type<"yes" | "no">(),

  // Audit fields
  createdBy: varchar("created_by"),
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsCourseSchema = createInsertSchema(lmsCourses, {
  title: z.string().min(1, "Course title is required"),
  status: z.enum(["draft", "published", "archived"]).optional(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  isComplianceRequired: z.enum(["yes", "no"]).optional(),
  requireSequentialProgress: z.enum(["yes", "no"]).optional(),
  gamificationEnabled: z.enum(["yes", "no"]).optional(),
  gamificationIntensity: z.enum(["low", "medium", "high"]).optional(),
  hasClosedCaptions: z.enum(["yes", "no"]).optional(),
  hasAudioDescription: z.enum(["yes", "no"]).optional(),
  supportsScreenReader: z.enum(["yes", "no"]).optional(),
  targetRoles: z.array(z.string()).optional(),
  targetDepartments: z.array(z.string()).optional(),
  prerequisiteCourseIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  serviceTypes: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLmsCourse = z.infer<typeof insertLmsCourseSchema>;
export type LmsCourse = typeof lmsCourses.$inferSelect;

// LMS Course Modules - Individual sections within a course
export const lmsModules = pgTable("lms_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
  moduleType: text("module_type").notNull().$type<LmsModuleType>(),
  orderIndex: integer("order_index").notNull().default(0),

  // Content based on type
  content: json("content").$type<{
    // For video type
    videoUrl?: string;
    videoDurationSeconds?: number;
    videoProvider?: "youtube" | "vimeo" | "direct";
    autoPlayNext?: boolean;

    // For text type (rich text / WYSIWYG)
    htmlContent?: string;

    // For document type
    documentUrl?: string;
    documentName?: string;
    documentSize?: number;
    documentType?: string;

    // For image type
    imageUrl?: string;
    imageAltText?: string;
    imageCaption?: string;

    // For poll type
    pollQuestion?: string;
    pollOptions?: string[];
    allowMultiple?: boolean;

    // For webinar type
    webinarUrl?: string;
    webinarDate?: string;
    webinarDuration?: number;
    webinarProvider?: "zoom" | "teams" | "google_meet" | "other";
  }>(),

  // Points and gamification
  pointsValue: integer("points_value").default(10),
  bonusPointsAvailable: integer("bonus_points_available").default(0),

  // Completion requirements
  minimumTimeSeconds: integer("minimum_time_seconds"), // Minimum time to spend on module
  requireInteraction: text("require_interaction").default("no").$type<"yes" | "no">(), // Must interact (e.g., watch full video)

  // Prerequisites within course
  prerequisiteModuleIds: json("prerequisite_module_ids").$type<string[]>().default([]),

  // Encouragement messages
  completionMessage: text("completion_message"),
  encouragementTips: json("encouragement_tips").$type<string[]>().default([]),

  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsModuleSchema = createInsertSchema(lmsModules, {
  title: z.string().min(1, "Module title is required"),
  moduleType: z.enum(["video", "text", "quiz", "document", "image", "poll", "webinar"]),
  content: z.any().optional(),
  requireInteraction: z.enum(["yes", "no"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
  prerequisiteModuleIds: z.array(z.string()).optional(),
  encouragementTips: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLmsModule = z.infer<typeof insertLmsModuleSchema>;
export type LmsModule = typeof lmsModules.$inferSelect;

// LMS Quizzes - Assessments attached to modules
export const lmsQuizzes = pgTable("lms_quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => lmsModules.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions"),

  // Quiz settings
  timeLimitMinutes: integer("time_limit_minutes"),
  shuffleQuestions: text("shuffle_questions").default("no").$type<"yes" | "no">(),
  shuffleAnswers: text("shuffle_answers").default("yes").$type<"yes" | "no">(),
  showCorrectAnswers: text("show_correct_answers").default("yes").$type<"yes" | "no">(),
  allowReview: text("allow_review").default("yes").$type<"yes" | "no">(),

  // Passing requirements
  passingScore: integer("passing_score").default(80),
  maxAttempts: integer("max_attempts").default(3),
  retryDelayMinutes: integer("retry_delay_minutes").default(0),

  // Gamification
  pointsPerCorrectAnswer: integer("points_per_correct_answer").default(10),
  bonusPointsForPerfectScore: integer("bonus_points_for_perfect_score").default(50),
  bonusPointsForFirstTry: integer("bonus_points_for_first_try").default(25),

  // Encouragement
  successMessage: text("success_message").default("Great job! You passed!"),
  failureMessage: text("failure_message").default("Don't give up! Review the material and try again."),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsQuizSchema = createInsertSchema(lmsQuizzes, {
  title: z.string().min(1),
  shuffleQuestions: z.enum(["yes", "no"]).optional(),
  shuffleAnswers: z.enum(["yes", "no"]).optional(),
  showCorrectAnswers: z.enum(["yes", "no"]).optional(),
  allowReview: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLmsQuiz = z.infer<typeof insertLmsQuizSchema>;
export type LmsQuiz = typeof lmsQuizzes.$inferSelect;

// LMS Quiz Questions
export const lmsQuizQuestions = pgTable("lms_quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull().references(() => lmsQuizzes.id, { onDelete: "cascade" }),

  questionType: text("question_type").notNull().$type<LmsQuizQuestionType>(),
  questionText: text("question_text").notNull(),
  questionImageUrl: text("question_image_url"),
  explanation: text("explanation"), // Shown after answering
  hint: text("hint"), // Optional hint for users

  // Answer options (for multiple choice, true/false, matching)
  options: json("options").$type<{
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect?: boolean; // For multiple choice
    matchTo?: string; // For matching questions
  }[]>(),

  // For short answer / fill in blank
  correctAnswers: json("correct_answers").$type<string[]>(), // Acceptable answers
  caseSensitive: text("case_sensitive").default("no").$type<"yes" | "no">(),

  orderIndex: integer("order_index").notNull().default(0),
  pointValue: integer("point_value").default(10),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLmsQuizQuestionSchema = createInsertSchema(lmsQuizQuestions, {
  questionType: z.enum(["multiple_choice", "true_false", "short_answer", "matching", "fill_blank"]),
  questionText: z.string().min(1),
  options: z.array(z.any()).optional(),
  correctAnswers: z.array(z.string()).optional(),
  caseSensitive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertLmsQuizQuestion = z.infer<typeof insertLmsQuizQuestionSchema>;
export type LmsQuizQuestion = typeof lmsQuizQuestions.$inferSelect;

// LMS Badges - Achievement badges for gamification
export const lmsBadges = pgTable("lms_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  name: text("name").notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  iconEmoji: text("icon_emoji"), // Fallback emoji icon
  color: text("color").default("#6366f1"), // Badge color

  badgeType: text("badge_type").notNull().$type<LmsBadgeType>(),

  // Criteria for earning
  criteria: json("criteria").$type<{
    type: "course_completion" | "quiz_score" | "streak" | "points" | "speed" | "custom";
    courseId?: string;
    minimumScore?: number;
    streakDays?: number;
    pointsRequired?: number;
    completionTimeMinutes?: number;
    customCondition?: string;
  }>(),

  // Gamification
  pointsAwarded: integer("points_awarded").default(50),
  isRare: text("is_rare").default("no").$type<"yes" | "no">(), // Highlighted as rare achievement

  isActive: text("is_active").default("yes").$type<"yes" | "no">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLmsBadgeSchema = createInsertSchema(lmsBadges, {
  name: z.string().min(1),
  badgeType: z.enum(["completion", "quiz_master", "streak", "speed", "perfect_score", "milestone", "special"]),
  criteria: z.any().optional(),
  isRare: z.enum(["yes", "no"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertLmsBadge = z.infer<typeof insertLmsBadgeSchema>;
export type LmsBadge = typeof lmsBadges.$inferSelect;

// LMS Staff Enrollments - Tracks staff course assignments
export const lmsEnrollments = pgTable("lms_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),

  // Status tracking
  status: text("status").default("not_started").$type<LmsEnrollmentStatus>(),
  progressPercentage: integer("progress_percentage").default(0),

  // Dates
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  dueDate: date("due_date"),
  expiresAt: timestamp("expires_at"), // When certification expires

  // Quiz tracking
  bestQuizScore: integer("best_quiz_score"),
  quizAttempts: integer("quiz_attempts").default(0),
  lastQuizAttemptAt: timestamp("last_quiz_attempt_at"),

  // Time tracking
  totalTimeSpentSeconds: integer("total_time_spent_seconds").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  currentModuleId: varchar("current_module_id"),

  // Gamification
  pointsEarned: integer("points_earned").default(0),

  // Enrollment metadata
  enrolledBy: varchar("enrolled_by"), // null = auto-enrolled
  enrollmentReason: text("enrollment_reason"), // e.g., "role_based", "manual", "compliance_required"

  // Certificate
  certificateIssuedAt: timestamp("certificate_issued_at"),
  certificateUrl: text("certificate_url"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsEnrollmentSchema = createInsertSchema(lmsEnrollments, {
  status: z.enum(["not_started", "in_progress", "completed", "expired", "failed"]).optional(),
  dueDate: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  enrolledAt: true,
});

export type InsertLmsEnrollment = z.infer<typeof insertLmsEnrollmentSchema>;
export type LmsEnrollment = typeof lmsEnrollments.$inferSelect;

// LMS Module Progress - Detailed progress for each module
export const lmsModuleProgress = pgTable("lms_module_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").notNull().references(() => lmsEnrollments.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").notNull().references(() => lmsModules.id, { onDelete: "cascade" }),

  // Status
  isCompleted: text("is_completed").default("no").$type<"yes" | "no">(),
  isLocked: text("is_locked").default("yes").$type<"yes" | "no">(),
  completedAt: timestamp("completed_at"),

  // Progress tracking
  progressPercentage: integer("progress_percentage").default(0),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),

  // Video-specific tracking
  videoWatchedSeconds: integer("video_watched_seconds").default(0),
  videoCompleted: text("video_completed").default("no").$type<"yes" | "no">(),

  // Interaction tracking
  interactionData: json("interaction_data").$type<{
    pollAnswers?: Record<string, string | string[]>;
    feedbackSubmitted?: boolean;
    resourcesDownloaded?: string[];
    notesAdded?: string[];
  }>(),

  // Gamification
  pointsEarned: integer("points_earned").default(0),
  bonusPointsEarned: integer("bonus_points_earned").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsModuleProgressSchema = createInsertSchema(lmsModuleProgress, {
  isCompleted: z.enum(["yes", "no"]).optional(),
  isLocked: z.enum(["yes", "no"]).optional(),
  videoCompleted: z.enum(["yes", "no"]).optional(),
  interactionData: z.any().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLmsModuleProgress = z.infer<typeof insertLmsModuleProgressSchema>;
export type LmsModuleProgress = typeof lmsModuleProgress.$inferSelect;

// LMS Quiz Attempts - Individual quiz attempt records
export const lmsQuizAttempts = pgTable("lms_quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").notNull().references(() => lmsEnrollments.id, { onDelete: "cascade" }),
  quizId: varchar("quiz_id").notNull().references(() => lmsQuizzes.id, { onDelete: "cascade" }),

  attemptNumber: integer("attempt_number").notNull().default(1),

  // Results
  score: integer("score").notNull().default(0), // Percentage
  pointsEarned: integer("points_earned").default(0),
  passed: text("passed").default("no").$type<"yes" | "no">(),

  // Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds"),

  // Answers
  answers: json("answers").$type<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    pointsAwarded: number;
    timeSpentSeconds?: number;
  }[]>(),

  // Feedback shown
  feedbackViewed: text("feedback_viewed").default("no").$type<"yes" | "no">(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLmsQuizAttemptSchema = createInsertSchema(lmsQuizAttempts, {
  passed: z.enum(["yes", "no"]).optional(),
  feedbackViewed: z.enum(["yes", "no"]).optional(),
  answers: z.array(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertLmsQuizAttempt = z.infer<typeof insertLmsQuizAttemptSchema>;
export type LmsQuizAttempt = typeof lmsQuizAttempts.$inferSelect;

// LMS Staff Badges - Badges earned by staff
export const lmsStaffBadges = pgTable("lms_staff_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  badgeId: varchar("badge_id").notNull().references(() => lmsBadges.id, { onDelete: "cascade" }),

  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  courseId: varchar("course_id"), // Course that triggered badge (if applicable)
  enrollmentId: varchar("enrollment_id"), // Enrollment that triggered badge (if applicable)

  // For display
  isDisplayed: text("is_displayed").default("yes").$type<"yes" | "no">(),
  displayOrder: integer("display_order").default(0),
});

export const insertLmsStaffBadgeSchema = createInsertSchema(lmsStaffBadges, {
  isDisplayed: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  earnedAt: true,
});

export type InsertLmsStaffBadge = z.infer<typeof insertLmsStaffBadgeSchema>;
export type LmsStaffBadge = typeof lmsStaffBadges.$inferSelect;

// LMS Staff Gamification Stats - Aggregated gamification data per staff
export const lmsStaffStats = pgTable("lms_staff_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Points and levels
  totalPoints: integer("total_points").default(0),
  currentLevel: integer("current_level").default(1),
  levelName: text("level_name").default("Beginner"),
  pointsToNextLevel: integer("points_to_next_level").default(100),

  // Achievements
  coursesCompleted: integer("courses_completed").default(0),
  quizzesPassed: integer("quizzes_passed").default(0),
  perfectScores: integer("perfect_scores").default(0),
  badgesEarned: integer("badges_earned").default(0),

  // Streaks
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: date("last_activity_date"),

  // Leaderboard
  leaderboardRank: integer("leaderboard_rank"),
  weeklyPoints: integer("weekly_points").default(0),
  monthlyPoints: integer("monthly_points").default(0),

  // Time tracking
  totalLearningTimeSeconds: integer("total_learning_time_seconds").default(0),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsStaffStatsSchema = createInsertSchema(lmsStaffStats).omit({
  id: true,
  updatedAt: true,
});

export type InsertLmsStaffStats = z.infer<typeof insertLmsStaffStatsSchema>;
export type LmsStaffStats = typeof lmsStaffStats.$inferSelect;

// LMS Compliance Records - Tracks compliance status per staff/course
export const lmsComplianceRecords = pgTable("lms_compliance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  enrollmentId: varchar("enrollment_id").references(() => lmsEnrollments.id, { onDelete: "set null" }),

  // Status
  complianceStatus: text("compliance_status").notNull().$type<LmsComplianceStatus>(),

  // Dates
  lastCompletedAt: timestamp("last_completed_at"),
  expiresAt: timestamp("expires_at"),
  dueDate: date("due_date"),

  // Scores
  lastScore: integer("last_score"),

  // Certificate
  certificateUrl: text("certificate_url"),
  certificateExpiresAt: timestamp("certificate_expires_at"),

  // HR integration
  capabilityUpdated: text("capability_updated").default("no").$type<"yes" | "no">(),
  blacklistTriggered: text("blacklist_triggered").default("no").$type<"yes" | "no">(),

  // Audit
  statusChangedAt: timestamp("status_changed_at"),
  statusChangedBy: varchar("status_changed_by"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsComplianceRecordSchema = createInsertSchema(lmsComplianceRecords, {
  complianceStatus: z.enum(["compliant", "due_soon", "overdue", "expired", "not_required"]),
  dueDate: z.string().optional(),
  capabilityUpdated: z.enum(["yes", "no"]).optional(),
  blacklistTriggered: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLmsComplianceRecord = z.infer<typeof insertLmsComplianceRecordSchema>;
export type LmsComplianceRecord = typeof lmsComplianceRecords.$inferSelect;

// LMS Activity Log - Audit trail for all LMS activities
export const lmsActivityLogs = pgTable("lms_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").references(() => staff.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),

  // Activity details
  activityType: text("activity_type").notNull(), // e.g., "course_started", "quiz_completed", "badge_earned"
  entityType: text("entity_type"), // e.g., "course", "module", "quiz", "badge"
  entityId: varchar("entity_id"),

  // Context
  metadata: json("metadata").$type<Record<string, unknown>>(),
  pointsAwarded: integer("points_awarded"),

  // IP and device info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLmsActivityLogSchema = createInsertSchema(lmsActivityLogs, {
  activityType: z.string().min(1),
  metadata: z.any().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertLmsActivityLog = z.infer<typeof insertLmsActivityLogSchema>;
export type LmsActivityLog = typeof lmsActivityLogs.$inferSelect;

// LMS Course Feedback - Staff feedback on courses
export const lmsCourseFeedback = pgTable("lms_course_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  enrollmentId: varchar("enrollment_id").references(() => lmsEnrollments.id, { onDelete: "set null" }),

  // Ratings (1-5)
  overallRating: integer("overall_rating"),
  difficultyRating: integer("difficulty_rating"),
  usefulnessRating: integer("usefulness_rating"),
  engagementRating: integer("engagement_rating"),

  // Comments
  comment: text("comment"),
  suggestions: text("suggestions"),

  // Specific feedback
  moduleId: varchar("module_id"), // If feedback is for specific module

  // Status
  isPublic: text("is_public").default("no").$type<"yes" | "no">(), // Show on course page
  isReviewed: text("is_reviewed").default("no").$type<"yes" | "no">(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),

  // Gamification
  pointsAwarded: integer("points_awarded").default(5),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLmsCourseFeedbackSchema = createInsertSchema(lmsCourseFeedback, {
  isPublic: z.enum(["yes", "no"]).optional(),
  isReviewed: z.enum(["yes", "no"]).optional(),
  overallRating: z.number().min(1).max(5).optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
  usefulnessRating: z.number().min(1).max(5).optional(),
  engagementRating: z.number().min(1).max(5).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertLmsCourseFeedback = z.infer<typeof insertLmsCourseFeedbackSchema>;
export type LmsCourseFeedback = typeof lmsCourseFeedback.$inferSelect;

// LMS Notifications - Reminders and alerts
export const lmsNotifications = pgTable("lms_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Notification type
  notificationType: text("notification_type").notNull().$type<
    "course_assigned" | "due_reminder" | "overdue_warning" | "course_completed" |
    "badge_earned" | "level_up" | "streak_reminder" | "compliance_expiring" |
    "new_content" | "leaderboard_change"
  >(),

  // Content
  title: text("title").notNull(),
  message: text("message").notNull(),

  // Related entities
  courseId: varchar("course_id"),
  badgeId: varchar("badge_id"),
  enrollmentId: varchar("enrollment_id"),

  // Delivery
  deliveryMethod: text("delivery_method").$type<"in_app" | "email" | "push" | "all">().default("in_app"),
  isRead: text("is_read").default("no").$type<"yes" | "no">(),
  readAt: timestamp("read_at"),

  // Email status
  emailSent: text("email_sent").default("no").$type<"yes" | "no">(),
  emailSentAt: timestamp("email_sent_at"),

  // Scheduling
  scheduledFor: timestamp("scheduled_for"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLmsNotificationSchema = createInsertSchema(lmsNotifications, {
  notificationType: z.enum([
    "course_assigned", "due_reminder", "overdue_warning", "course_completed",
    "badge_earned", "level_up", "streak_reminder", "compliance_expiring",
    "new_content", "leaderboard_change"
  ]),
  title: z.string().min(1),
  message: z.string().min(1),
  deliveryMethod: z.enum(["in_app", "email", "push", "all"]).optional(),
  isRead: z.enum(["yes", "no"]).optional(),
  emailSent: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertLmsNotification = z.infer<typeof insertLmsNotificationSchema>;
export type LmsNotification = typeof lmsNotifications.$inferSelect;

// LMS Certificate Templates - Customizable certificate designs
export const lmsCertificateTemplates = pgTable("lms_certificate_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  name: text("name").notNull(),
  description: text("description"),

  // Template design
  templateHtml: text("template_html"), // HTML template for PDF generation
  backgroundImageUrl: text("background_image_url"),
  logoUrl: text("logo_url"),

  // Signature
  signatureImageUrl: text("signature_image_url"),
  signatureName: text("signature_name"),
  signatureTitle: text("signature_title"),

  // Styling
  primaryColor: text("primary_color").default("#6366f1"),
  fontFamily: text("font_family").default("Arial"),

  isDefault: text("is_default").default("no").$type<"yes" | "no">(),
  isActive: text("is_active").default("yes").$type<"yes" | "no">(),

  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLmsCertificateTemplateSchema = createInsertSchema(lmsCertificateTemplates, {
  name: z.string().min(1),
  isDefault: z.enum(["yes", "no"]).optional(),
  isActive: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLmsCertificateTemplate = z.infer<typeof insertLmsCertificateTemplateSchema>;
export type LmsCertificateTemplate = typeof lmsCertificateTemplates.$inferSelect;

// Helper: Level thresholds for gamification
export const LMS_LEVEL_THRESHOLDS: { level: number; name: string; pointsRequired: number; color: string }[] = [
  { level: 1, name: "Beginner", pointsRequired: 0, color: "#94a3b8" },
  { level: 2, name: "Novice", pointsRequired: 100, color: "#22c55e" },
  { level: 3, name: "Apprentice", pointsRequired: 300, color: "#3b82f6" },
  { level: 4, name: "Practitioner", pointsRequired: 600, color: "#8b5cf6" },
  { level: 5, name: "Specialist", pointsRequired: 1000, color: "#f59e0b" },
  { level: 6, name: "Expert", pointsRequired: 1500, color: "#ef4444" },
  { level: 7, name: "Master", pointsRequired: 2500, color: "#ec4899" },
  { level: 8, name: "Champion", pointsRequired: 4000, color: "#14b8a6" },
  { level: 9, name: "Legend", pointsRequired: 6000, color: "#f97316" },
  { level: 10, name: "Grandmaster", pointsRequired: 10000, color: "#eab308" },
];

// Helper: Get level from points
export function getLmsLevelFromPoints(points: number): { level: number; name: string; color: string; pointsToNext: number } {
  for (let i = LMS_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LMS_LEVEL_THRESHOLDS[i].pointsRequired) {
      const nextLevel = LMS_LEVEL_THRESHOLDS[i + 1];
      return {
        level: LMS_LEVEL_THRESHOLDS[i].level,
        name: LMS_LEVEL_THRESHOLDS[i].name,
        color: LMS_LEVEL_THRESHOLDS[i].color,
        pointsToNext: nextLevel ? nextLevel.pointsRequired - points : 0,
      };
    }
  }
  return { level: 1, name: "Beginner", color: "#94a3b8", pointsToNext: 100 - points };
}

// ============================================
// POLICY MANAGEMENT SYSTEM (PMS)
// ============================================

// PMS Type Definitions
export type PolicyStatus = "draft" | "published" | "archived" | "pending_review";
export type PolicyCategoryType = "HR" | "Safety" | "Finance" | "Operations" | "Clinical" | "IT" | "Legal" | "Quality" | "General";
export type PolicyType = "code_of_conduct" | "leave_policy" | "data_privacy" | "safety_procedure" | "clinical_guideline" | "financial_procedure" | "it_security" | "emergency_procedure" | "general";
export type AcknowledgmentStatus = "not_viewed" | "viewed" | "acknowledged" | "overdue" | "expired";
export type PolicyAudience = "all_staff" | "specific_roles" | "specific_departments" | "specific_staff";

// Policies - Core policy documents
export const policies = pgTable("policies", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  content: text("content"), // Rich text content
  fileUrl: text("file_url"), // URL to uploaded document (PDF, Word, etc.)
  fileName: varchar("file_name", { length: 500 }),
  fileType: varchar("file_type", { length: 100 }), // application/pdf, etc.
  fileSize: integer("file_size"), // in bytes

  // Categorization
  category: varchar("category", { length: 100 }).notNull().default("General"),
  policyType: varchar("policy_type", { length: 100 }).default("general"),
  tags: text("tags"), // JSON array of tags
  departmentTags: text("department_tags"), // JSON array of departments

  // Version control
  version: integer("version").notNull().default(1),
  versionNotes: text("version_notes"),
  previousVersionId: uuid("previous_version_id"),

  // Status and publishing
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  publishedById: varchar("published_by_id", { length: 255 }),

  // Dates
  effectiveDate: date("effective_date"),
  reviewDate: date("review_date"), // When policy should be reviewed
  expiryDate: date("expiry_date"),

  // Mandatory settings
  isMandatory: varchar("is_mandatory", { length: 10 }).default("no"),
  requiresReacknowledgment: varchar("requires_reacknowledgment", { length: 10 }).default("no"),
  reacknowledgmentPeriodDays: integer("reacknowledgment_period_days"), // e.g., 365 for annual
  acknowledgmentDeadlineDays: integer("acknowledgment_deadline_days").default(7), // Days to acknowledge after assignment

  // Target audience
  audienceType: varchar("audience_type", { length: 50 }).default("all_staff"),
  targetRoles: text("target_roles"), // JSON array of role names
  targetDepartments: text("target_departments"), // JSON array of departments
  targetStaffIds: text("target_staff_ids"), // JSON array of specific staff IDs

  // Accessibility
  isSearchable: varchar("is_searchable", { length: 10 }).default("yes"),
  isPrintable: varchar("is_printable", { length: 10 }).default("yes"),
  allowOfflineDownload: varchar("allow_offline_download", { length: 10 }).default("yes"),

  // Metadata
  createdById: varchar("created_by_id", { length: 255 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }),
  lastModifiedById: varchar("last_modified_by_id", { length: 255 }),
  lastModifiedByName: varchar("last_modified_by_name", { length: 255 }),

  // Statistics
  viewCount: integer("view_count").default(0),
  acknowledgmentCount: integer("acknowledgment_count").default(0),
  averageReadTimeSeconds: integer("average_read_time_seconds"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;

// Policy Version History - Track all versions
export const policyVersionHistory = pgTable("policy_version_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  changeDescription: text("change_description"),
  changedById: varchar("changed_by_id", { length: 255 }).notNull(),
  changedByName: varchar("changed_by_name", { length: 255 }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  // Diff tracking
  contentDiff: text("content_diff"), // JSON showing differences
  requiresReacknowledgment: varchar("requires_reacknowledgment", { length: 10 }).default("no"),
});

export const insertPolicyVersionHistorySchema = createInsertSchema(policyVersionHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertPolicyVersionHistory = z.infer<typeof insertPolicyVersionHistorySchema>;
export type PolicyVersionHistory = typeof policyVersionHistory.$inferSelect;

// Staff Policy Assignments - Which policies are assigned to which staff
export const staffPolicyAssignments = pgTable("staff_policy_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  policyVersion: integer("policy_version").notNull(),

  // Assignment details
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: varchar("assigned_by_id", { length: 255 }),
  dueDate: timestamp("due_date"), // Deadline for acknowledgment

  // Status tracking
  status: varchar("status", { length: 50 }).notNull().default("not_viewed"),
  isOverdue: varchar("is_overdue", { length: 10 }).default("no"),

  // Last notification sent
  lastReminderAt: timestamp("last_reminder_at"),
  reminderCount: integer("reminder_count").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffPolicyAssignmentSchema = createInsertSchema(staffPolicyAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffPolicyAssignment = z.infer<typeof insertStaffPolicyAssignmentSchema>;
export type StaffPolicyAssignment = typeof staffPolicyAssignments.$inferSelect;

// Policy Views - Track when staff view policies
export const policyViews = pgTable("policy_views", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  policyVersion: integer("policy_version").notNull(),
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }),

  // View tracking
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  viewDurationSeconds: integer("view_duration_seconds"),
  scrollPercentage: integer("scroll_percentage"), // How far they scrolled (0-100)
  fullyViewed: varchar("fully_viewed", { length: 10 }).default("no"), // Scrolled to end

  // Device info
  deviceType: varchar("device_type", { length: 50 }), // mobile, tablet, desktop
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),

  // Session tracking
  sessionId: varchar("session_id", { length: 255 }),
});

export const insertPolicyViewSchema = createInsertSchema(policyViews).omit({
  id: true,
  viewedAt: true,
});

export type InsertPolicyView = z.infer<typeof insertPolicyViewSchema>;
export type PolicyView = typeof policyViews.$inferSelect;

// Policy Acknowledgments - Staff confirmation of reading
export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  policyVersion: integer("policy_version").notNull(),
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }),

  // Acknowledgment details
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
  acknowledgmentMethod: varchar("acknowledgment_method", { length: 50 }).default("checkbox"), // checkbox, signature, etc.
  electronicSignature: text("electronic_signature"), // Base64 signature image if applicable
  confirmationText: text("confirmation_text"), // "I have read and understood..."

  // Verification
  ipAddress: varchar("ip_address", { length: 100 }),
  deviceType: varchar("device_type", { length: 50 }),
  userAgent: text("user_agent"),

  // Time spent before acknowledgment
  totalViewTimeSeconds: integer("total_view_time_seconds"),

  // Compliance
  wasOnTime: varchar("was_on_time", { length: 10 }).default("yes"), // Acknowledged before due date
  daysOverdue: integer("days_overdue").default(0),

  // For re-acknowledgments
  isReacknowledgment: varchar("is_reacknowledgment", { length: 10 }).default("no"),
  previousAcknowledgmentId: uuid("previous_acknowledgment_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPolicyAcknowledgmentSchema = createInsertSchema(policyAcknowledgments).omit({
  id: true,
  acknowledgedAt: true,
  createdAt: true,
});

export type InsertPolicyAcknowledgment = z.infer<typeof insertPolicyAcknowledgmentSchema>;
export type PolicyAcknowledgment = typeof policyAcknowledgments.$inferSelect;

// Policy Compliance Records - Track overall compliance status per staff per policy
export const policyComplianceRecords = pgTable("policy_compliance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  currentPolicyVersion: integer("current_policy_version").notNull(),

  // Status
  status: varchar("status", { length: 50 }).notNull().default("not_viewed"),

  // Dates
  firstViewedAt: timestamp("first_viewed_at"),
  lastViewedAt: timestamp("last_viewed_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedVersion: integer("acknowledged_version"),
  dueDate: timestamp("due_date"),
  nextReacknowledgmentDate: timestamp("next_reacknowledgment_date"),

  // Compliance metrics
  isCompliant: varchar("is_compliant", { length: 10 }).default("no"),
  isOverdue: varchar("is_overdue", { length: 10 }).default("no"),
  daysUntilDue: integer("days_until_due"),
  totalViewCount: integer("total_view_count").default(0),
  totalTimeSpentSeconds: integer("total_time_spent_seconds").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPolicyComplianceRecordSchema = createInsertSchema(policyComplianceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPolicyComplianceRecord = z.infer<typeof insertPolicyComplianceRecordSchema>;
export type PolicyComplianceRecord = typeof policyComplianceRecords.$inferSelect;

// Policy Notifications - Track notifications sent about policies
export const policyNotifications = pgTable("policy_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id", { length: 255 }).notNull(),

  // Notification details
  type: varchar("type", { length: 50 }).notNull(), // new_policy, update_required, reminder, overdue, expiring
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),

  // Delivery
  channel: varchar("channel", { length: 50 }).default("in_app"), // in_app, email, push
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),

  // Action
  actionUrl: text("action_url"),
  actionTaken: varchar("action_taken", { length: 10 }).default("no"),

  // Status
  isRead: varchar("is_read", { length: 10 }).default("no"),
  isArchived: varchar("is_archived", { length: 10 }).default("no"),
});

export const insertPolicyNotificationSchema = createInsertSchema(policyNotifications).omit({
  id: true,
  sentAt: true,
});

export type InsertPolicyNotification = z.infer<typeof insertPolicyNotificationSchema>;
export type PolicyNotification = typeof policyNotifications.$inferSelect;

// Policy Audit Logs - Complete audit trail
export const policyAuditLogs = pgTable("policy_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "set null" }),
  staffId: varchar("staff_id", { length: 255 }),
  userId: varchar("user_id", { length: 255 }).notNull(), // Who performed the action
  userName: varchar("user_name", { length: 255 }),

  // Action details
  action: varchar("action", { length: 100 }).notNull(), // created, updated, published, archived, viewed, acknowledged, etc.
  entityType: varchar("entity_type", { length: 100 }).notNull(), // policy, acknowledgment, assignment, etc.
  entityId: varchar("entity_id", { length: 255 }),

  // Change details
  previousValue: text("previous_value"), // JSON of previous state
  newValue: text("new_value"), // JSON of new state
  description: text("description"),

  // Context
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),

  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertPolicyAuditLogSchema = createInsertSchema(policyAuditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertPolicyAuditLog = z.infer<typeof insertPolicyAuditLogSchema>;
export type PolicyAuditLog = typeof policyAuditLogs.$inferSelect;

// Policy Categories - Configurable categories
export const policyCategories = pgTable("policy_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }), // Hex color for UI
  icon: varchar("icon", { length: 50 }), // Icon name
  sortOrder: integer("sort_order").default(0),
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPolicyCategorySchema = createInsertSchema(policyCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertPolicyCategory = z.infer<typeof insertPolicyCategorySchema>;
export type PolicyCategory = typeof policyCategories.$inferSelect;

// Saved Reports - For scheduled or saved compliance reports
export const policySavedReports = pgTable("policy_saved_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  reportType: varchar("report_type", { length: 100 }).notNull(), // compliance_overview, staff_detail, policy_performance, overdue_list

  // Filters and configuration
  filters: text("filters"), // JSON of applied filters
  columns: text("columns"), // JSON of selected columns
  sortBy: varchar("sort_by", { length: 100 }),
  sortOrder: varchar("sort_order", { length: 10 }).default("asc"),

  // Scheduling
  isScheduled: varchar("is_scheduled", { length: 10 }).default("no"),
  scheduleFrequency: varchar("schedule_frequency", { length: 50 }), // daily, weekly, monthly
  scheduleDayOfWeek: integer("schedule_day_of_week"), // 0-6 for weekly
  scheduleDayOfMonth: integer("schedule_day_of_month"), // 1-31 for monthly
  scheduleTime: varchar("schedule_time", { length: 10 }), // HH:MM
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),

  // Recipients
  emailRecipients: text("email_recipients"), // JSON array of emails

  // Creator
  createdById: varchar("created_by_id", { length: 255 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPolicySavedReportSchema = createInsertSchema(policySavedReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPolicySavedReport = z.infer<typeof insertPolicySavedReportSchema>;
export type PolicySavedReport = typeof policySavedReports.$inferSelect;

// ============================================
// COMPREHENSIVE SCHEDULING SYSTEM (CSS)
// ============================================

// Shift Types for different client categories
export type ShiftCategory = "NDIS" | "Support at Home" | "Private";
export type ShiftStatus = "draft" | "published" | "assigned" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type ShiftType = "standard" | "sleepover" | "active_night" | "community_access" | "nursing" | "transport" | "respite" | "group";
export type RecurrencePattern = "daily" | "weekly" | "fortnightly" | "monthly" | "custom";
export type AllocationStatus = "pending" | "offered" | "accepted" | "declined" | "reassigned" | "cancelled";

// Shift Templates - Reusable shift configurations
export const shiftTemplates = pgTable("shift_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Shift category & type
  category: varchar("category", { length: 50 }).notNull().$type<ShiftCategory>(),
  shiftType: varchar("shift_type", { length: 50 }).default("standard").$type<ShiftType>(),

  // Default timing
  defaultStartTime: varchar("default_start_time", { length: 10 }).notNull(), // HH:MM
  defaultEndTime: varchar("default_end_time", { length: 10 }).notNull(), // HH:MM
  defaultDurationMinutes: integer("default_duration_minutes").notNull(),

  // Service details
  serviceType: varchar("service_type", { length: 100 }),
  ndisSupportCategory: varchar("ndis_support_category", { length: 100 }),
  ndisFundingCode: varchar("ndis_funding_code", { length: 50 }),
  sahServiceCode: varchar("sah_service_code", { length: 50 }),

  // Staffing requirements
  requiredStaffCount: integer("required_staff_count").default(1),
  requiredQualifications: text("required_qualifications"), // JSON array
  requiredCapabilities: text("required_capabilities"), // JSON array

  // Rates
  defaultHourlyRate: text("default_hourly_rate"),
  overtimeMultiplier: text("overtime_multiplier").default("1.5"),
  publicHolidayMultiplier: text("public_holiday_multiplier").default("2.0"),

  // Defaults
  defaultLocation: text("default_location"), // JSON {address, lat, lng}
  defaultNotes: text("default_notes"),
  defaultTasks: text("default_tasks"), // JSON array of task descriptions

  // Metadata
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  usageCount: integer("usage_count").default(0),

  createdById: varchar("created_by_id", { length: 255 }),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// Shifts - Core shift management
export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Client assignment
  clientId: varchar("client_id", { length: 255 }).references(() => clients.id, { onDelete: "cascade" }),

  // Shift details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().$type<ShiftCategory>(),
  shiftType: varchar("shift_type", { length: 50 }).default("standard").$type<ShiftType>(),
  status: varchar("status", { length: 50 }).default("draft").$type<ShiftStatus>(),

  // Template reference
  templateId: uuid("template_id").references(() => shiftTemplates.id, { onDelete: "set null" }),

  // Scheduling
  scheduledDate: date("scheduled_date").notNull(),
  scheduledStartTime: varchar("scheduled_start_time", { length: 10 }).notNull(), // HH:MM
  scheduledEndTime: varchar("scheduled_end_time", { length: 10 }).notNull(), // HH:MM
  durationMinutes: integer("duration_minutes").notNull(),

  // Actual times (filled during/after shift)
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  actualDurationMinutes: integer("actual_duration_minutes"),

  // Break time
  breakDurationMinutes: integer("break_duration_minutes").default(0),
  isPaidBreak: varchar("is_paid_break", { length: 10 }).default("no"),

  // Location
  locationAddress: text("location_address"),
  locationLatitude: text("location_latitude"),
  locationLongitude: text("location_longitude"),
  useClientAddress: varchar("use_client_address", { length: 10 }).default("yes"),
  locationNotes: text("location_notes"),

  // Travel buffer
  travelTimeBefore: integer("travel_time_before").default(0), // minutes
  travelTimeAfter: integer("travel_time_after").default(0), // minutes

  // Service details
  serviceType: varchar("service_type", { length: 100 }),
  ndisSupportCategory: varchar("ndis_support_category", { length: 100 }),
  ndisFundingCode: varchar("ndis_funding_code", { length: 50 }),
  sahServiceCode: varchar("sah_service_code", { length: 50 }),
  privateRateCode: varchar("private_rate_code", { length: 50 }),

  // Staffing requirements
  requiredStaffCount: integer("required_staff_count").default(1),
  assignedStaffCount: integer("assigned_staff_count").default(0),
  requiredQualifications: text("required_qualifications"), // JSON array
  requiredCapabilities: text("required_capabilities"), // JSON array

  // Rates & billing
  hourlyRate: text("hourly_rate"),
  totalBillable: text("total_billable"),
  overtimeHours: text("overtime_hours"),
  overtimeRate: text("overtime_rate"),

  // Budget tracking
  budgetId: varchar("budget_id", { length: 255 }).references(() => budgets.id, { onDelete: "set null" }),
  estimatedCost: text("estimated_cost"),
  actualCost: text("actual_cost"),

  // Notes & tasks
  notes: text("notes"),
  internalNotes: text("internal_notes"), // Admin only
  tasks: text("tasks"), // JSON array of task objects
  completedTasks: text("completed_tasks"), // JSON array

  // Recurrence
  isRecurring: varchar("is_recurring", { length: 10 }).default("no"),
  recurrencePattern: varchar("recurrence_pattern", { length: 50 }).$type<RecurrencePattern>(),
  recurrenceEndDate: date("recurrence_end_date"),
  recurrenceParentId: uuid("recurrence_parent_id"),
  recurrenceExceptions: text("recurrence_exceptions"), // JSON array of excluded dates

  // Cancellation
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledById: varchar("cancelled_by_id", { length: 255 }),
  cancelledByName: varchar("cancelled_by_name", { length: 255 }),

  // Publishing
  publishedAt: timestamp("published_at"),
  publishedById: varchar("published_by_id", { length: 255 }),
  publishedByName: varchar("published_by_name", { length: 255 }),

  // Priority & flags
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  isBillable: varchar("is_billable", { length: 10 }).default("yes"),
  requiresConfirmation: varchar("requires_confirmation", { length: 10 }).default("yes"),

  // Metadata
  color: varchar("color", { length: 20 }),
  tags: text("tags"), // JSON array

  // Audit
  createdById: varchar("created_by_id", { length: 255 }),
  createdByName: varchar("created_by_name", { length: 255 }),
  lastModifiedById: varchar("last_modified_by_id", { length: 255 }),
  lastModifiedByName: varchar("last_modified_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedStaffCount: true,
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

// Shift Allocations - Staff assigned to shifts
export const shiftAllocations = pgTable("shift_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id", { length: 255 }).notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Allocation details
  status: varchar("status", { length: 50 }).default("pending").$type<AllocationStatus>(),
  role: varchar("role", { length: 50 }).default("primary"), // primary, secondary, backup, trainee

  // Response tracking
  offeredAt: timestamp("offered_at"),
  respondedAt: timestamp("responded_at"),
  declineReason: text("decline_reason"),

  // Confirmation
  confirmedAt: timestamp("confirmed_at"),
  confirmedVia: varchar("confirmed_via", { length: 50 }), // app, email, sms, phone

  // Check in/out
  checkedInAt: timestamp("checked_in_at"),
  checkedInLatitude: text("checked_in_latitude"),
  checkedInLongitude: text("checked_in_longitude"),
  checkedInDistance: text("checked_in_distance"), // meters from expected location

  checkedOutAt: timestamp("checked_out_at"),
  checkedOutLatitude: text("checked_out_latitude"),
  checkedOutLongitude: text("checked_out_longitude"),
  checkedOutDistance: text("checked_out_distance"),

  // Time worked
  actualMinutesWorked: integer("actual_minutes_worked"),
  breakMinutesTaken: integer("break_minutes_taken"),

  // Notes
  notes: text("notes"),
  staffNotes: text("staff_notes"), // Notes from staff

  // Billable tracking
  billableMinutes: integer("billable_minutes"),
  hourlyRate: text("hourly_rate"),
  totalPay: text("total_pay"),

  // Assignment audit
  assignedById: varchar("assigned_by_id", { length: 255 }),
  assignedByName: varchar("assigned_by_name", { length: 255 }),
  assignedAt: timestamp("assigned_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShiftAllocationSchema = createInsertSchema(shiftAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftAllocation = z.infer<typeof insertShiftAllocationSchema>;
export type ShiftAllocation = typeof shiftAllocations.$inferSelect;

// Shift Attachments - Files attached to shifts
export const shiftAttachments = pgTable("shift_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),

  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),

  // Attachment type
  attachmentType: varchar("attachment_type", { length: 50 }).default("general"), // care_plan, risk_assessment, photo, receipt, other
  description: text("description"),

  // Access control
  isVisibleToStaff: varchar("is_visible_to_staff", { length: 10 }).default("yes"),
  isVisibleToClient: varchar("is_visible_to_client", { length: 10 }).default("no"),

  // Version control
  version: integer("version").default(1),
  previousVersionId: uuid("previous_version_id"),

  uploadedById: varchar("uploaded_by_id", { length: 255 }),
  uploadedByName: varchar("uploaded_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShiftAttachmentSchema = createInsertSchema(shiftAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertShiftAttachment = z.infer<typeof insertShiftAttachmentSchema>;
export type ShiftAttachment = typeof shiftAttachments.$inferSelect;

// Shift Notes/Activity Log - Detailed shift activity tracking
export const shiftActivityLog = pgTable("shift_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").notNull().references(() => shifts.id, { onDelete: "cascade" }),

  activityType: varchar("activity_type", { length: 50 }).notNull(), // created, published, assigned, confirmed, started, completed, cancelled, note_added, modified
  description: text("description").notNull(),

  // Change details
  previousValue: text("previous_value"), // JSON
  newValue: text("new_value"), // JSON
  changedFields: text("changed_fields"), // JSON array

  // Actor
  userId: varchar("user_id", { length: 255 }),
  userName: varchar("user_name", { length: 255 }),

  // Metadata
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShiftActivityLogSchema = createInsertSchema(shiftActivityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertShiftActivityLog = z.infer<typeof insertShiftActivityLogSchema>;
export type ShiftActivityLog = typeof shiftActivityLog.$inferSelect;

// Shift Swap Requests - Staff requesting to swap shifts
export const shiftSwapRequests = pgTable("shift_swap_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Original allocation
  originalAllocationId: uuid("original_allocation_id").notNull().references(() => shiftAllocations.id, { onDelete: "cascade" }),
  requestingStaffId: varchar("requesting_staff_id", { length: 255 }).notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Swap details
  swapType: varchar("swap_type", { length: 50 }).default("swap"), // swap, give_away, find_cover
  targetStaffId: varchar("target_staff_id", { length: 255 }).references(() => staff.id, { onDelete: "set null" }), // null for find_cover

  // Status
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected, cancelled
  reason: text("reason"),

  // Response
  respondedAt: timestamp("responded_at"),
  responseNote: text("response_note"),

  // Approval
  approvedById: varchar("approved_by_id", { length: 255 }),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShiftSwapRequestSchema = createInsertSchema(shiftSwapRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftSwapRequest = z.infer<typeof insertShiftSwapRequestSchema>;
export type ShiftSwapRequest = typeof shiftSwapRequests.$inferSelect;

// Note: schedulingConflicts table is defined earlier in this file
// The existing table supports shift conflicts via the appointmentId/assignmentId fields

// Shift Coverage Requirements - Define minimum staffing needs
export const shiftCoverageRequirements = pgTable("shift_coverage_requirements", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Scope
  clientId: varchar("client_id", { length: 255 }).references(() => clients.id, { onDelete: "cascade" }),
  locationId: varchar("location_id", { length: 255 }), // For facility-based coverage

  // Time window
  dayOfWeek: varchar("day_of_week", { length: 10 }), // 0-6, or null for all days
  startTime: varchar("start_time", { length: 10 }).notNull(), // HH:MM
  endTime: varchar("end_time", { length: 10 }).notNull(), // HH:MM

  // Requirements
  minimumStaffCount: integer("minimum_staff_count").default(1),
  requiredQualifications: text("required_qualifications"), // JSON array
  requiredCapabilities: text("required_capabilities"), // JSON array

  // Metadata
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShiftCoverageRequirementSchema = createInsertSchema(shiftCoverageRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftCoverageRequirement = z.infer<typeof insertShiftCoverageRequirementSchema>;
export type ShiftCoverageRequirement = typeof shiftCoverageRequirements.$inferSelect;

// Staff Shift Preferences - Staff preferences for scheduling
export const staffShiftPreferences = pgTable("staff_shift_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: varchar("staff_id", { length: 255 }).notNull().references(() => staff.id, { onDelete: "cascade" }),

  // Work preferences
  preferredShiftTypes: text("preferred_shift_types"), // JSON array
  preferredCategories: text("preferred_categories"), // JSON array of client categories
  preferredDaysOfWeek: text("preferred_days_of_week"), // JSON array 0-6
  preferredStartTime: varchar("preferred_start_time", { length: 10 }),
  preferredEndTime: varchar("preferred_end_time", { length: 10 }),

  // Location preferences
  maxTravelDistanceKm: integer("max_travel_distance_km"),
  preferredSuburbs: text("preferred_suburbs"), // JSON array
  hasOwnTransport: varchar("has_own_transport", { length: 10 }).default("no"),

  // Hour preferences
  preferredWeeklyHours: integer("preferred_weekly_hours"),
  minWeeklyHours: integer("min_weekly_hours"),
  maxWeeklyHours: integer("max_weekly_hours"),

  // Client preferences (optional - specific clients)
  preferredClientIds: text("preferred_client_ids"), // JSON array
  avoidClientIds: text("avoid_client_ids"), // JSON array (soft avoidance, not restriction)

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffShiftPreferenceSchema = createInsertSchema(staffShiftPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffShiftPreference = z.infer<typeof insertStaffShiftPreferenceSchema>;
export type StaffShiftPreference = typeof staffShiftPreferences.$inferSelect;

// Scheduling Rules - Configurable business rules
export const schedulingRules = pgTable("scheduling_rules", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // hours_limit, gap_requirement, qualification, restriction, budget

  // Rule configuration
  config: text("config").notNull(), // JSON with rule-specific settings

  // Scope
  appliesTo: varchar("applies_to", { length: 50 }).default("all"), // all, category, client, staff
  appliesToIds: text("applies_to_ids"), // JSON array of specific IDs

  // Enforcement
  isRequired: varchar("is_required", { length: 10 }).default("yes"), // yes = error, no = warning
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  priority: integer("priority").default(100), // Lower = higher priority

  // Violation handling
  allowOverride: varchar("allow_override", { length: 10 }).default("yes"),
  overrideRequiresApproval: varchar("override_requires_approval", { length: 10 }).default("yes"),

  createdById: varchar("created_by_id", { length: 255 }),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSchedulingRuleSchema = createInsertSchema(schedulingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchedulingRule = z.infer<typeof insertSchedulingRuleSchema>;
export type SchedulingRule = typeof schedulingRules.$inferSelect;

// Scheduling Analytics Snapshots - Periodic analytics snapshots
export const schedulingAnalytics = pgTable("scheduling_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),

  snapshotDate: date("snapshot_date").notNull(),
  snapshotType: varchar("snapshot_type", { length: 50 }).default("daily"), // hourly, daily, weekly, monthly

  // Shift metrics
  totalShifts: integer("total_shifts").default(0),
  publishedShifts: integer("published_shifts").default(0),
  assignedShifts: integer("assigned_shifts").default(0),
  completedShifts: integer("completed_shifts").default(0),
  cancelledShifts: integer("cancelled_shifts").default(0),
  noShowShifts: integer("no_show_shifts").default(0),

  // Staff metrics
  totalStaffScheduled: integer("total_staff_scheduled").default(0),
  totalHoursScheduled: text("total_hours_scheduled"),
  totalHoursWorked: text("total_hours_worked"),
  averageUtilization: text("average_utilization"), // percentage

  // Coverage metrics
  coverageRate: text("coverage_rate"), // percentage of required coverage met
  understaffedPeriods: integer("understaffed_periods").default(0),
  overstaffedPeriods: integer("overstaffed_periods").default(0),

  // Conflict metrics
  conflictsDetected: integer("conflicts_detected").default(0),
  conflictsResolved: integer("conflicts_resolved").default(0),
  conflictsOverridden: integer("conflicts_overridden").default(0),

  // Budget metrics
  totalBudgetAllocated: text("total_budget_allocated"),
  totalActualCost: text("total_actual_cost"),
  budgetVariance: text("budget_variance"),

  // Breakdown by category
  metricsByCategory: text("metrics_by_category"), // JSON {NDIS: {...}, SupportAtHome: {...}, Private: {...}}

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchedulingAnalyticsSchema = createInsertSchema(schedulingAnalytics).omit({
  id: true,
  createdAt: true,
});

export type InsertSchedulingAnalytics = z.infer<typeof insertSchedulingAnalyticsSchema>;
export type SchedulingAnalytics = typeof schedulingAnalytics.$inferSelect;

// ============================================================================
// Organizational Chart System (OCS) Schema
// ============================================================================

// OCS Type Definitions
export type OrgNodeType = "organization" | "department" | "team" | "role" | "position";
export type OrgLayoutType = "tree-vertical" | "tree-horizontal" | "radial" | "compact";
export type ReportingType = "direct" | "matrix" | "dotted";

// Departments/Teams - Organizational units
export const orgDepartments = pgTable("org_departments", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }), // Short code e.g., "HR", "OPS", "CARE"
  description: text("description"),

  // Hierarchy
  parentDepartmentId: uuid("parent_department_id"), // For nested departments
  level: integer("level").default(0), // 0 = root, 1 = child, etc.
  sortOrder: integer("sort_order").default(0),

  // Display settings
  color: varchar("color", { length: 20 }).default("#3B82F6"), // Department color for chart
  icon: varchar("icon", { length: 50 }), // Icon name

  // Leadership
  headOfDepartmentId: varchar("head_of_department_id", { length: 255 }), // Staff ID
  deputyHeadId: varchar("deputy_head_id", { length: 255 }), // Staff ID

  // Settings
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  isExpanded: varchar("is_expanded", { length: 10 }).default("yes"), // Default expanded in chart
  showInChart: varchar("show_in_chart", { length: 10 }).default("yes"),

  // Metadata
  notes: text("notes"),
  customFields: text("custom_fields"), // JSON for additional fields

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrgDepartmentSchema = createInsertSchema(orgDepartments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrgDepartment = z.infer<typeof insertOrgDepartmentSchema>;
export type OrgDepartment = typeof orgDepartments.$inferSelect;

// Org Positions - Defined positions/roles in the org structure
export const orgPositions = pgTable("org_positions", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }), // Position code
  description: text("description"),
  responsibilities: text("responsibilities"), // JSON array of responsibilities

  // Hierarchy
  departmentId: uuid("department_id"), // Which department this belongs to
  reportsToPositionId: uuid("reports_to_position_id"), // Direct reporting position
  level: integer("level").default(0), // Hierarchy level
  sortOrder: integer("sort_order").default(0),

  // Requirements
  requiredQualifications: text("required_qualifications"), // JSON array
  requiredCertifications: text("required_certifications"), // JSON array
  requiredExperienceYears: integer("required_experience_years"),
  requiredSkills: text("required_skills"), // JSON array

  // Capacity
  maxHeadcount: integer("max_headcount").default(1), // How many can hold this position
  currentHeadcount: integer("current_headcount").default(0),
  isVacant: varchar("is_vacant", { length: 10 }).default("no"),

  // Compensation (optional, admin-only)
  salaryRangeMin: text("salary_range_min"),
  salaryRangeMax: text("salary_range_max"),
  salaryType: varchar("salary_type", { length: 20 }), // annual, hourly, etc.

  // Display
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),
  showInChart: varchar("show_in_chart", { length: 10 }).default("yes"),

  isActive: varchar("is_active", { length: 10 }).default("yes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrgPositionSchema = createInsertSchema(orgPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrgPosition = z.infer<typeof insertOrgPositionSchema>;
export type OrgPosition = typeof orgPositions.$inferSelect;

// Staff Position Assignments - Links staff to positions
export const staffPositionAssignments = pgTable("staff_position_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),

  staffId: varchar("staff_id", { length: 255 }).notNull(),
  positionId: uuid("position_id").notNull(),
  departmentId: uuid("department_id"),

  // Assignment details
  assignmentType: varchar("assignment_type", { length: 20 }).default("primary"), // primary, secondary, acting, interim
  reportingType: varchar("reporting_type", { length: 20 }).default("direct"), // direct, matrix, dotted

  // Time period
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null = current

  // Work allocation
  fte: text("fte").default("1.0"), // Full-time equivalent (0.5 = half-time)

  // Status
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  isPrimary: varchar("is_primary", { length: 10 }).default("yes"), // Primary position for this staff

  // Approval
  approvedById: varchar("approved_by_id", { length: 255 }),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  approvedAt: timestamp("approved_at"),

  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffPositionAssignmentSchema = createInsertSchema(staffPositionAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffPositionAssignment = z.infer<typeof insertStaffPositionAssignmentSchema>;
export type StaffPositionAssignment = typeof staffPositionAssignments.$inferSelect;

// Org Chart Snapshots - For versioning and history
export const orgChartSnapshots = pgTable("org_chart_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  snapshotType: varchar("snapshot_type", { length: 50 }).default("manual"), // manual, auto, scheduled

  // Full org structure snapshot
  departmentsSnapshot: text("departments_snapshot"), // JSON
  positionsSnapshot: text("positions_snapshot"), // JSON
  assignmentsSnapshot: text("assignments_snapshot"), // JSON
  staffSnapshot: text("staff_snapshot"), // JSON with relevant staff data

  // Statistics at snapshot time
  totalDepartments: integer("total_departments").default(0),
  totalPositions: integer("total_positions").default(0),
  totalStaff: integer("total_staff").default(0),
  vacancies: integer("vacancies").default(0),

  // Metadata
  createdById: varchar("created_by_id", { length: 255 }),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrgChartSnapshotSchema = createInsertSchema(orgChartSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertOrgChartSnapshot = z.infer<typeof insertOrgChartSnapshotSchema>;
export type OrgChartSnapshot = typeof orgChartSnapshots.$inferSelect;

// Org Chart Change Log - Audit trail
export const orgChartChangeLogs = pgTable("org_chart_change_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  // What changed
  entityType: varchar("entity_type", { length: 50 }).notNull(), // department, position, assignment, staff
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }),

  // Change details
  changeType: varchar("change_type", { length: 50 }).notNull(), // create, update, delete, move, reassign
  changeDescription: text("change_description"),

  // Before/after
  previousData: text("previous_data"), // JSON
  newData: text("new_data"), // JSON
  changedFields: text("changed_fields"), // JSON array of field names

  // Who made the change
  changedById: varchar("changed_by_id", { length: 255 }),
  changedByName: varchar("changed_by_name", { length: 255 }),
  changedByRole: varchar("changed_by_role", { length: 100 }),

  // Approval (if required)
  requiresApproval: varchar("requires_approval", { length: 10 }).default("no"),
  approvalStatus: varchar("approval_status", { length: 20 }), // pending, approved, rejected
  approvedById: varchar("approved_by_id", { length: 255 }),
  approvedAt: timestamp("approved_at"),

  // Can this be undone?
  canUndo: varchar("can_undo", { length: 10 }).default("yes"),
  undoneById: varchar("undone_by_id", { length: 255 }),
  undoneAt: timestamp("undone_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrgChartChangeLogSchema = createInsertSchema(orgChartChangeLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertOrgChartChangeLog = z.infer<typeof insertOrgChartChangeLogSchema>;
export type OrgChartChangeLog = typeof orgChartChangeLogs.$inferSelect;

// Org Chart Settings - User preferences and global settings
export const orgChartSettings = pgTable("org_chart_settings", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: varchar("user_id", { length: 255 }), // null = global setting
  settingType: varchar("setting_type", { length: 50 }).notNull(), // layout, display, filters, etc.

  // Layout preferences
  defaultLayout: varchar("default_layout", { length: 50 }).default("tree-vertical"),
  defaultZoom: text("default_zoom").default("1.0"),
  showPhotos: varchar("show_photos", { length: 10 }).default("yes"),
  showVacancies: varchar("show_vacancies", { length: 10 }).default("yes"),
  showInactiveStaff: varchar("show_inactive_staff", { length: 10 }).default("no"),

  // Card display preferences
  cardFields: text("card_fields"), // JSON array of fields to show on cards
  compactMode: varchar("compact_mode", { length: 10 }).default("no"),

  // Color coding preferences
  colorBy: varchar("color_by", { length: 50 }).default("department"), // department, role, compliance, custom
  customColors: text("custom_colors"), // JSON

  // Filter presets
  savedFilters: text("saved_filters"), // JSON array of filter presets
  defaultFilter: text("default_filter"), // JSON

  // Other settings
  autoRefresh: varchar("auto_refresh", { length: 10 }).default("yes"),
  refreshIntervalSeconds: integer("refresh_interval_seconds").default(60),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrgChartSettingsSchema = createInsertSchema(orgChartSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrgChartSettings = z.infer<typeof insertOrgChartSettingsSchema>;
export type OrgChartSettings = typeof orgChartSettings.$inferSelect;

// Staff Profile Extended Data - Additional data for org chart cards
export const staffProfileExtended = pgTable("staff_profile_extended", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: varchar("staff_id", { length: 255 }).notNull().unique(),

  // Professional info
  jobTitle: varchar("job_title", { length: 255 }),
  professionalSummary: text("professional_summary"),
  specializations: text("specializations"), // JSON array
  certifications: text("certifications"), // JSON array with details

  // Work metrics (synced from other systems)
  currentClientCount: integer("current_client_count").default(0),
  currentShiftCount: integer("current_shift_count").default(0),
  hoursThisWeek: text("hours_this_week"),
  hoursThisMonth: text("hours_this_month"),
  utilizationRate: text("utilization_rate"), // percentage

  // Compliance status (synced from LMS)
  complianceStatus: varchar("compliance_status", { length: 20 }).default("compliant"), // compliant, warning, non_compliant
  pendingTrainings: integer("pending_trainings").default(0),
  overdueTrainings: integer("overdue_trainings").default(0),
  lastComplianceCheck: timestamp("last_compliance_check"),

  // Policy status (synced from Policy system)
  policiesAcknowledged: integer("policies_acknowledged").default(0),
  policiesPending: integer("policies_pending").default(0),
  lastPolicyAcknowledgment: timestamp("last_policy_acknowledgment"),

  // Performance metrics (optional)
  performanceRating: text("performance_rating"),
  lastReviewDate: date("last_review_date"),

  // Availability preferences
  preferredWorkDays: text("preferred_work_days"), // JSON array
  preferredWorkHours: text("preferred_work_hours"), // JSON
  maxHoursPerWeek: integer("max_hours_per_week"),

  // Social/Team info
  teamMemberships: text("team_memberships"), // JSON array of team IDs
  mentorId: varchar("mentor_id", { length: 255 }),
  menteeIds: text("mentee_ids"), // JSON array

  // Visibility settings
  showPhone: varchar("show_phone", { length: 10 }).default("yes"),
  showEmail: varchar("show_email", { length: 10 }).default("yes"),
  showMetrics: varchar("show_metrics", { length: 10 }).default("no"), // Admin only by default

  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffProfileExtendedSchema = createInsertSchema(staffProfileExtended).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffProfileExtended = z.infer<typeof insertStaffProfileExtendedSchema>;
export type StaffProfileExtended = typeof staffProfileExtended.$inferSelect;

// ============================================================================
// Advanced Scheduling and Calendar System (ASCS) Schema
// ============================================================================

// ASCS Type Definitions
export type CalendarViewType = "weekly" | "monthly" | "daily";
export type ShiftSwapStatusType = "pending" | "approved" | "rejected" | "cancelled" | "expired";
export type OpenShiftStatusType = "open" | "claimed" | "assigned" | "cancelled" | "expired";
export type ScheduleTaskStatusType = "pending" | "in_progress" | "completed" | "skipped" | "overdue";
export type ScheduleTaskPriorityType = "low" | "medium" | "high" | "urgent";
export type AutoScheduleStatusType = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type ScheduleSuggestionTypeValue = "auto_fill" | "conflict_resolution" | "optimization" | "coverage" | "preference_match";

// Calendar User Preferences - Stores user-specific calendar settings
export const calendarPreferences = pgTable("calendar_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),

  // View preferences
  defaultView: varchar("default_view", { length: 20 }).default("weekly"), // weekly, monthly, daily
  weekStartDay: integer("week_start_day").default(1), // 0=Sunday, 1=Monday, etc.
  defaultTimeRange: varchar("default_time_range", { length: 20 }).default("business"), // business (6AM-10PM), full (24hr), custom
  customStartHour: integer("custom_start_hour").default(6),
  customEndHour: integer("custom_end_hour").default(22),

  // Display preferences
  showWeekends: varchar("show_weekends", { length: 10 }).default("yes"),
  showCancelledShifts: varchar("show_cancelled_shifts", { length: 10 }).default("no"),
  showBufferTime: varchar("show_buffer_time", { length: 10 }).default("yes"),
  compactMode: varchar("compact_mode", { length: 10 }).default("no"),
  colorScheme: varchar("color_scheme", { length: 50 }).default("category"), // category, status, client, staff

  // Filter preferences
  defaultFilters: text("default_filters"), // JSON: { clientIds: [], staffIds: [], categories: [], statuses: [] }
  savedFilterPresets: text("saved_filter_presets"), // JSON array of named filter presets

  // Notification preferences (calendar-specific)
  shiftReminders: varchar("shift_reminders", { length: 10 }).default("yes"),
  reminderMinutesBefore: integer("reminder_minutes_before").default(30),
  swapRequestAlerts: varchar("swap_request_alerts", { length: 10 }).default("yes"),
  openShiftAlerts: varchar("open_shift_alerts", { length: 10 }).default("yes"),
  conflictAlerts: varchar("conflict_alerts", { length: 10 }).default("yes"),

  // Mobile preferences
  enablePushNotifications: varchar("enable_push_notifications", { length: 10 }).default("yes"),
  syncToDeviceCalendar: varchar("sync_to_device_calendar", { length: 10 }).default("no"),
  deviceCalendarType: varchar("device_calendar_type", { length: 50 }), // google, apple, outlook

  // Display density
  rowHeight: varchar("row_height", { length: 20 }).default("medium"), // compact, medium, comfortable
  showAvatars: varchar("show_avatars", { length: 10 }).default("yes"),
  showClientInfo: varchar("show_client_info", { length: 10 }).default("yes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCalendarPreferencesSchema = createInsertSchema(calendarPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalendarPreferences = z.infer<typeof insertCalendarPreferencesSchema>;
export type CalendarPreferences = typeof calendarPreferences.$inferSelect;

// Open Shifts Marketplace - Unassigned shifts staff can claim
export const openShifts = pgTable("open_shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").notNull(), // Reference to original shift

  // Shift details (denormalized for quick display)
  clientId: varchar("client_id", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }),
  scheduledDate: date("scheduled_date").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  category: varchar("category", { length: 50 }), // NDIS, Support at Home, Private
  shiftType: varchar("shift_type", { length: 50 }),
  location: text("location"),

  // Requirements
  requiredQualifications: text("required_qualifications"), // JSON array
  preferredStaffIds: text("preferred_staff_ids"), // JSON array
  excludedStaffIds: text("excluded_staff_ids"), // JSON array (restricted)
  minExperienceMonths: integer("min_experience_months"),

  // Marketplace settings
  status: varchar("status", { length: 20 }).default("open"), // open, claimed, assigned, cancelled, expired
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  expiresAt: timestamp("expires_at"),
  claimDeadline: timestamp("claim_deadline"),

  // Incentives
  bonusAmount: text("bonus_amount"),
  bonusReason: varchar("bonus_reason", { length: 255 }),

  // Claim tracking
  claimCount: integer("claim_count").default(0),
  viewCount: integer("view_count").default(0),

  // Who posted
  postedById: varchar("posted_by_id", { length: 255 }),
  postedByName: varchar("posted_by_name", { length: 255 }),
  postedAt: timestamp("posted_at").defaultNow(),

  // Assignment (if claimed)
  assignedToId: varchar("assigned_to_id", { length: 255 }),
  assignedToName: varchar("assigned_to_name", { length: 255 }),
  assignedAt: timestamp("assigned_at"),
  assignedById: varchar("assigned_by_id", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOpenShiftSchema = createInsertSchema(openShifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOpenShift = z.infer<typeof insertOpenShiftSchema>;
export type OpenShift = typeof openShifts.$inferSelect;

// Open Shift Claims - Track who claims open shifts
export const openShiftClaims = pgTable("open_shift_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  openShiftId: uuid("open_shift_id").notNull(),

  // Claimant info
  staffId: varchar("staff_id", { length: 255 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }),

  // Claim details
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, withdrawn
  note: text("note"), // Staff can add note with claim

  // Response
  respondedAt: timestamp("responded_at"),
  respondedById: varchar("responded_by_id", { length: 255 }),
  respondedByName: varchar("responded_by_name", { length: 255 }),
  responseNote: text("response_note"),
  rejectionReason: varchar("rejection_reason", { length: 255 }),

  // Match score (AI calculated)
  matchScore: integer("match_score"), // 0-100
  matchReasons: text("match_reasons"), // JSON array of reasons

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOpenShiftClaimSchema = createInsertSchema(openShiftClaims).omit({
  id: true,
  createdAt: true,
});

export type InsertOpenShiftClaim = z.infer<typeof insertOpenShiftClaimSchema>;
export type OpenShiftClaim = typeof openShiftClaims.$inferSelect;

// Enhanced Shift Swap Requests with full workflow
export const ascsShiftSwapRequests = pgTable("ascs_shift_swap_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Original shift info
  originalShiftId: uuid("original_shift_id").notNull(),
  originalStaffId: varchar("original_staff_id", { length: 255 }).notNull(),
  originalStaffName: varchar("original_staff_name", { length: 255 }),

  // Swap type
  swapType: varchar("swap_type", { length: 20 }).default("swap"), // swap, give_away, trade

  // Target (if direct swap request)
  targetStaffId: varchar("target_staff_id", { length: 255 }),
  targetStaffName: varchar("target_staff_name", { length: 255 }),
  targetShiftId: uuid("target_shift_id"), // For true swap (trading shifts)

  // If open to anyone
  openToAll: varchar("open_to_all", { length: 10 }).default("no"),
  eligibleStaffIds: text("eligible_staff_ids"), // JSON array of staff who can accept

  // Request details
  reason: text("reason"),
  urgency: varchar("urgency", { length: 20 }).default("normal"), // low, normal, high, urgent
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, approved, rejected, cancelled, expired

  // Workflow
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),

  // Peer response (target staff)
  peerResponseStatus: varchar("peer_response_status", { length: 20 }), // pending, accepted, declined
  peerRespondedAt: timestamp("peer_responded_at"),
  peerNote: text("peer_note"),

  // Manager approval
  requiresManagerApproval: varchar("requires_manager_approval", { length: 10 }).default("yes"),
  managerApprovalStatus: varchar("manager_approval_status", { length: 20 }), // pending, approved, rejected
  approvedById: varchar("approved_by_id", { length: 255 }),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  approvalNote: text("approval_note"),

  // Validation
  validationResult: text("validation_result"), // JSON with conflict checks
  hasConflicts: varchar("has_conflicts", { length: 10 }).default("no"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAscsShiftSwapRequestSchema = createInsertSchema(ascsShiftSwapRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAscsShiftSwapRequest = z.infer<typeof insertAscsShiftSwapRequestSchema>;
export type AscsShiftSwapRequest = typeof ascsShiftSwapRequests.$inferSelect;

// Schedule Tasks & Checklists - Tasks linked to shifts
export const scheduleTasks = pgTable("schedule_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Link to shift or appointment
  shiftId: uuid("shift_id"),
  appointmentId: varchar("appointment_id", { length: 255 }),

  // Task source
  templateId: uuid("template_id"), // If from a task template
  clientId: varchar("client_id", { length: 255 }),

  // Task details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // medication, personal_care, meals, documentation, safety, other
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent

  // Timing
  dueTime: varchar("due_time", { length: 10 }), // Time within shift (HH:MM)
  estimatedMinutes: integer("estimated_minutes"),
  orderIndex: integer("order_index").default(0),

  // Requirements
  requiresPhoto: varchar("requires_photo", { length: 10 }).default("no"),
  requiresSignature: varchar("requires_signature", { length: 10 }).default("no"),
  requiresNote: varchar("requires_note", { length: 10 }).default("no"),
  requiresGps: varchar("requires_gps", { length: 10 }).default("no"),

  // Checklist items (sub-tasks)
  checklistItems: text("checklist_items"), // JSON array: [{id, text, checked, checkedAt}]

  // Status
  status: varchar("status", { length: 20 }).default("pending"), // pending, in_progress, completed, skipped, overdue

  // Completion details
  completedById: varchar("completed_by_id", { length: 255 }),
  completedByName: varchar("completed_by_name", { length: 255 }),
  completedAt: timestamp("completed_at"),
  completionNote: text("completion_note"),
  completionPhotoUrl: text("completion_photo_url"),
  completionSignatureUrl: text("completion_signature_url"),
  completionGpsLatitude: text("completion_gps_latitude"),
  completionGpsLongitude: text("completion_gps_longitude"),

  // Skip details (if skipped)
  skippedById: varchar("skipped_by_id", { length: 255 }),
  skippedAt: timestamp("skipped_at"),
  skipReason: text("skip_reason"),

  // Verification (for compliance)
  requiresVerification: varchar("requires_verification", { length: 10 }).default("no"),
  verifiedById: varchar("verified_by_id", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  verificationNote: text("verification_note"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScheduleTaskSchema = createInsertSchema(scheduleTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScheduleTask = z.infer<typeof insertScheduleTaskSchema>;
export type ScheduleTask = typeof scheduleTasks.$inferSelect;

// Schedule Task Templates - Reusable task configurations
export const scheduleTaskTemplates = pgTable("schedule_task_templates", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Template info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),

  // Scope
  isGlobal: varchar("is_global", { length: 10 }).default("no"), // Available to all clients
  clientId: varchar("client_id", { length: 255 }), // Client-specific template
  shiftCategory: varchar("shift_category", { length: 50 }), // NDIS, Support at Home, Private
  shiftType: varchar("shift_type", { length: 50 }), // home_visit, community_access, etc.

  // Tasks in template
  tasks: text("tasks").notNull(), // JSON array of task definitions

  // Auto-assignment rules
  autoAssign: varchar("auto_assign", { length: 10 }).default("no"),
  autoAssignConditions: text("auto_assign_conditions"), // JSON: { shiftTypes: [], clientIds: [], categories: [] }

  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),

  // Metadata
  createdById: varchar("created_by_id", { length: 255 }),
  createdByName: varchar("created_by_name", { length: 255 }),
  isActive: varchar("is_active", { length: 10 }).default("yes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScheduleTaskTemplateSchema = createInsertSchema(scheduleTaskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScheduleTaskTemplate = z.infer<typeof insertScheduleTaskTemplateSchema>;
export type ScheduleTaskTemplate = typeof scheduleTaskTemplates.$inferSelect;

// AI Scheduling Suggestions - Auto-generated scheduling recommendations
export const scheduleSuggestions = pgTable("schedule_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Suggestion type
  suggestionType: varchar("suggestion_type", { length: 50 }).notNull(), // auto_fill, conflict_resolution, optimization, coverage, preference_match

  // Context
  shiftId: uuid("shift_id"),
  clientId: varchar("client_id", { length: 255 }),
  dateRange: text("date_range"), // JSON: { start, end }

  // Suggestion details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  suggestedAction: text("suggested_action").notNull(), // JSON describing the action

  // Recommended staff
  suggestedStaffId: varchar("suggested_staff_id", { length: 255 }),
  suggestedStaffName: varchar("suggested_staff_name", { length: 255 }),
  alternativeStaffIds: text("alternative_staff_ids"), // JSON array

  // Scoring
  confidenceScore: integer("confidence_score"), // 0-100
  matchScore: integer("match_score"), // 0-100
  reasoningFactors: text("reasoning_factors"), // JSON: [{ factor, weight, score, explanation }]

  // Impact analysis
  impactAnalysis: text("impact_analysis"), // JSON: { budgetImpact, coverageImpact, staffLoadImpact }
  potentialConflicts: text("potential_conflicts"), // JSON array

  // Status
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, rejected, expired, applied

  // Response
  respondedById: varchar("responded_by_id", { length: 255 }),
  respondedByName: varchar("responded_by_name", { length: 255 }),
  respondedAt: timestamp("responded_at"),
  responseNote: text("response_note"),

  // If applied
  appliedAt: timestamp("applied_at"),
  resultingShiftId: uuid("resulting_shift_id"),

  // Expiry
  expiresAt: timestamp("expires_at"),

  // Generation metadata
  generatedBySystem: varchar("generated_by_system", { length: 10 }).default("yes"),
  generationContext: text("generation_context"), // JSON with generation parameters

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleSuggestionSchema = createInsertSchema(scheduleSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertScheduleSuggestion = z.infer<typeof insertScheduleSuggestionSchema>;
export type ScheduleSuggestion = typeof scheduleSuggestions.$inferSelect;

// Auto-Scheduling Jobs - Track automated scheduling runs
export const autoSchedulingJobs = pgTable("auto_scheduling_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Job configuration
  jobType: varchar("job_type", { length: 50 }).notNull(), // fill_gaps, optimize, weekly_schedule, daily_schedule
  scope: text("scope").notNull(), // JSON: { clientIds, staffIds, dateRange, categories }

  // Constraints
  constraints: text("constraints"), // JSON: { maxHoursPerStaff, preferredStaff, excludeStaff, budgetLimit }
  preferences: text("preferences"), // JSON: { prioritizeExperience, balanceWorkload, minimizeTravel }

  // Status
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, completed, failed, cancelled
  progress: integer("progress").default(0), // 0-100
  progressMessage: text("progress_message"),

  // Results
  shiftsCreated: integer("shifts_created").default(0),
  shiftsModified: integer("shifts_modified").default(0),
  suggestionsGenerated: integer("suggestions_generated").default(0),
  conflictsFound: integer("conflicts_found").default(0),
  conflictsResolved: integer("conflicts_resolved").default(0),

  // Detailed results
  resultSummary: text("result_summary"), // JSON summary
  resultDetails: text("result_details"), // JSON detailed results
  errors: text("errors"), // JSON array of errors

  // Timing
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  // Who triggered
  triggeredById: varchar("triggered_by_id", { length: 255 }),
  triggeredByName: varchar("triggered_by_name", { length: 255 }),
  triggeredBySystem: varchar("triggered_by_system", { length: 10 }).default("no"),

  // Approval workflow
  requiresApproval: varchar("requires_approval", { length: 10 }).default("yes"),
  approvalStatus: varchar("approval_status", { length: 20 }), // pending, approved, rejected
  approvedById: varchar("approved_by_id", { length: 255 }),
  approvedAt: timestamp("approved_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAutoSchedulingJobSchema = createInsertSchema(autoSchedulingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAutoSchedulingJob = z.infer<typeof insertAutoSchedulingJobSchema>;
export type AutoSchedulingJob = typeof autoSchedulingJobs.$inferSelect;

// Schedule Communications - In-app messages for shifts
export const scheduleCommunications = pgTable("schedule_communications", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Context
  shiftId: uuid("shift_id"),
  clientId: varchar("client_id", { length: 255 }),
  threadId: uuid("thread_id"), // For threaded conversations

  // Message type
  messageType: varchar("message_type", { length: 50 }).default("message"), // message, announcement, alert, reminder, update

  // Content
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  contentFormat: varchar("content_format", { length: 20 }).default("text"), // text, markdown, html

  // Attachments
  attachments: text("attachments"), // JSON array: [{ name, url, type, size }]

  // Sender
  senderId: varchar("sender_id", { length: 255 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  senderRole: varchar("sender_role", { length: 100 }),

  // Recipients
  recipientType: varchar("recipient_type", { length: 50 }).default("individual"), // individual, group, shift_team, all_staff
  recipientIds: text("recipient_ids"), // JSON array of user IDs
  recipientGroupId: varchar("recipient_group_id", { length: 255 }),

  // Delivery status
  sentAt: timestamp("sent_at").defaultNow(),
  deliveryStatus: text("delivery_status"), // JSON: { userId: status }
  readBy: text("read_by"), // JSON array: [{ userId, readAt }]

  // Priority
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  isPinned: varchar("is_pinned", { length: 10 }).default("no"),

  // Scheduling
  scheduledFor: timestamp("scheduled_for"), // For scheduled messages
  expiresAt: timestamp("expires_at"),

  // Reactions
  reactions: text("reactions"), // JSON: { emoji: [userIds] }

  // Moderation
  isEdited: varchar("is_edited", { length: 10 }).default("no"),
  editedAt: timestamp("edited_at"),
  isDeleted: varchar("is_deleted", { length: 10 }).default("no"),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleCommunicationSchema = createInsertSchema(scheduleCommunications).omit({
  id: true,
  createdAt: true,
});

export type InsertScheduleCommunication = z.infer<typeof insertScheduleCommunicationSchema>;
export type ScheduleCommunication = typeof scheduleCommunications.$inferSelect;

// Scheduling Analytics Extended - Enhanced analytics for ASCS
export const schedulingAnalyticsExtended = pgTable("scheduling_analytics_extended", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Time period
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly, quarterly
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),

  // Scope
  scope: varchar("scope", { length: 50 }).default("organization"), // organization, department, team, staff, client
  scopeId: varchar("scope_id", { length: 255 }),

  // Shift metrics
  totalShifts: integer("total_shifts").default(0),
  completedShifts: integer("completed_shifts").default(0),
  cancelledShifts: integer("cancelled_shifts").default(0),
  noShowShifts: integer("no_show_shifts").default(0),
  lateStarts: integer("late_starts").default(0),
  earlyEnds: integer("early_ends").default(0),

  // Staff metrics
  uniqueStaffScheduled: integer("unique_staff_scheduled").default(0),
  totalHoursScheduled: text("total_hours_scheduled"),
  totalHoursWorked: text("total_hours_worked"),
  overtimeHours: text("overtime_hours"),
  averageShiftsPerStaff: text("average_shifts_per_staff"),

  // Client metrics
  uniqueClientsServed: integer("unique_clients_served").default(0),
  totalClientHours: text("total_client_hours"),
  averageHoursPerClient: text("average_hours_per_client"),

  // Coverage metrics
  coverageRate: text("coverage_rate"), // percentage
  understaffedPeriods: integer("understaffed_periods").default(0),
  gapMinutes: integer("gap_minutes").default(0),

  // Swap & marketplace metrics
  swapRequestsCreated: integer("swap_requests_created").default(0),
  swapRequestsApproved: integer("swap_requests_approved").default(0),
  openShiftsPosted: integer("open_shifts_posted").default(0),
  openShiftsFilled: integer("open_shifts_filled").default(0),
  averageTimeToFill: text("average_time_to_fill"), // in minutes

  // Task metrics
  tasksAssigned: integer("tasks_assigned").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksOverdue: integer("tasks_overdue").default(0),
  taskCompletionRate: text("task_completion_rate"),

  // AI/Auto-scheduling metrics
  aiSuggestionsGenerated: integer("ai_suggestions_generated").default(0),
  aiSuggestionsAccepted: integer("ai_suggestions_accepted").default(0),
  autoScheduleJobsRun: integer("auto_schedule_jobs_run").default(0),
  autoScheduleSuccessRate: text("auto_schedule_success_rate"),

  // Conflict metrics
  conflictsDetected: integer("conflicts_detected").default(0),
  conflictsAutoResolved: integer("conflicts_auto_resolved").default(0),
  conflictsManuallyResolved: integer("conflicts_manually_resolved").default(0),

  // Budget metrics
  budgetAllocated: text("budget_allocated"),
  actualSpend: text("actual_spend"),
  budgetVariance: text("budget_variance"),
  costPerHour: text("cost_per_hour"),

  // Satisfaction metrics
  staffSatisfactionScore: text("staff_satisfaction_score"),
  clientSatisfactionScore: text("client_satisfaction_score"),

  // Breakdown data
  metricsByCategory: text("metrics_by_category"), // JSON
  metricsByShiftType: text("metrics_by_shift_type"), // JSON
  metricsByDayOfWeek: text("metrics_by_day_of_week"), // JSON
  metricsByTimeOfDay: text("metrics_by_time_of_day"), // JSON

  // Trends
  trendData: text("trend_data"), // JSON time series data
  forecastData: text("forecast_data"), // JSON predicted values

  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchedulingAnalyticsExtendedSchema = createInsertSchema(schedulingAnalyticsExtended).omit({
  id: true,
  createdAt: true,
});

export type InsertSchedulingAnalyticsExtended = z.infer<typeof insertSchedulingAnalyticsExtendedSchema>;
export type SchedulingAnalyticsExtended = typeof schedulingAnalyticsExtended.$inferSelect;

// Staff Scheduling Preferences - Staff's own scheduling preferences
export const staffSchedulingPreferences = pgTable("staff_scheduling_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffId: varchar("staff_id", { length: 255 }).notNull().unique(),

  // Workload preferences
  preferredHoursPerWeek: integer("preferred_hours_per_week"),
  maxHoursPerWeek: integer("max_hours_per_week"),
  minHoursPerWeek: integer("min_hours_per_week"),
  maxShiftsPerDay: integer("max_shifts_per_day").default(2),
  maxConsecutiveDays: integer("max_consecutive_days").default(6),

  // Time preferences
  preferredShiftTypes: text("preferred_shift_types"), // JSON array
  preferredDaysOfWeek: text("preferred_days_of_week"), // JSON array
  preferredTimeSlots: text("preferred_time_slots"), // JSON: { morning: true, afternoon: false, evening: true, overnight: false }
  avoidDaysOfWeek: text("avoid_days_of_week"), // JSON array

  // Location preferences
  maxTravelMinutes: integer("max_travel_minutes").default(60),
  preferredAreas: text("preferred_areas"), // JSON array of suburbs/regions
  avoidAreas: text("avoid_areas"), // JSON array
  hasOwnTransport: varchar("has_own_transport", { length: 10 }).default("yes"),

  // Client preferences
  preferredClientIds: text("preferred_client_ids"), // JSON array
  avoidClientIds: text("avoid_client_ids"), // JSON array (soft preference, not restriction)
  preferredCategories: text("preferred_categories"), // JSON array: NDIS, Support at Home, Private

  // Shift preferences
  preferBackToBack: varchar("prefer_back_to_back", { length: 10 }).default("no"),
  minimumBreakMinutes: integer("minimum_break_minutes").default(30),
  preferConsistentSchedule: varchar("prefer_consistent_schedule", { length: 10 }).default("yes"),

  // Notification preferences
  notifyNewShifts: varchar("notify_new_shifts", { length: 10 }).default("yes"),
  notifyOpenShifts: varchar("notify_open_shifts", { length: 10 }).default("yes"),
  notifySwapRequests: varchar("notify_swap_requests", { length: 10 }).default("yes"),

  // Notes
  additionalNotes: text("additional_notes"),

  // Approval
  lastUpdatedById: varchar("last_updated_by_id", { length: 255 }),
  approvedById: varchar("approved_by_id", { length: 255 }),
  approvedAt: timestamp("approved_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStaffSchedulingPreferencesSchema = createInsertSchema(staffSchedulingPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffSchedulingPreferences = z.infer<typeof insertStaffSchedulingPreferencesSchema>;
export type StaffSchedulingPreferences = typeof staffSchedulingPreferences.$inferSelect;

// Schedule Calendar Events - For non-shift events on calendar
export const scheduleCalendarEvents = pgTable("schedule_calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Event basics
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventType: varchar("event_type", { length: 50 }).notNull(), // meeting, training, holiday, blocked, reminder, milestone

  // Timing
  allDay: varchar("all_day", { length: 10 }).default("no"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  timezone: varchar("timezone", { length: 50 }).default("Australia/Sydney"),

  // Recurrence
  isRecurring: varchar("is_recurring", { length: 10 }).default("no"),
  recurrenceRule: text("recurrence_rule"), // RRULE format
  recurrenceEndDate: date("recurrence_end_date"),
  parentEventId: uuid("parent_event_id"),

  // Scope
  scope: varchar("scope", { length: 50 }).default("personal"), // personal, team, organization
  visibleTo: text("visible_to"), // JSON array of user/role IDs

  // Location
  location: text("location"),
  isVirtual: varchar("is_virtual", { length: 10 }).default("no"),
  virtualMeetingUrl: text("virtual_meeting_url"),

  // Participants
  organizerId: varchar("organizer_id", { length: 255 }),
  organizerName: varchar("organizer_name", { length: 255 }),
  participantIds: text("participant_ids"), // JSON array

  // Status
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, completed

  // Display
  color: varchar("color", { length: 20 }),
  icon: varchar("icon", { length: 50 }),

  // Reminders
  reminders: text("reminders"), // JSON array: [{ type, minutesBefore }]

  // Attachments
  attachments: text("attachments"), // JSON array

  // Notes
  notes: text("notes"),

  createdById: varchar("created_by_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScheduleCalendarEventSchema = createInsertSchema(scheduleCalendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScheduleCalendarEvent = z.infer<typeof insertScheduleCalendarEventSchema>;
export type ScheduleCalendarEvent = typeof scheduleCalendarEvents.$inferSelect;

// Gamification - Badges and achievements for staff
export const schedulingBadges = pgTable("scheduling_badges", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Badge definition
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 20 }),
  category: varchar("category", { length: 50 }), // reliability, performance, teamwork, milestone

  // Criteria
  criteriaType: varchar("criteria_type", { length: 50 }).notNull(), // count, streak, percentage, milestone
  criteriaField: varchar("criteria_field", { length: 100 }), // shifts_completed, on_time_arrivals, etc.
  criteriaThreshold: integer("criteria_threshold"),
  criteriaPercentage: text("criteria_percentage"),
  criteriaPeriod: varchar("criteria_period", { length: 20 }), // weekly, monthly, quarterly, all_time

  // Display
  tier: varchar("tier", { length: 20 }).default("bronze"), // bronze, silver, gold, platinum
  points: integer("points").default(0),
  isVisible: varchar("is_visible", { length: 10 }).default("yes"),

  // Availability
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  startDate: date("start_date"),
  endDate: date("end_date"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSchedulingBadgeSchema = createInsertSchema(schedulingBadges).omit({
  id: true,
  createdAt: true,
});

export type InsertSchedulingBadge = z.infer<typeof insertSchedulingBadgeSchema>;
export type SchedulingBadge = typeof schedulingBadges.$inferSelect;

// Staff Badge Awards
export const staffBadgeAwards = pgTable("staff_badge_awards", {
  id: uuid("id").defaultRandom().primaryKey(),

  staffId: varchar("staff_id", { length: 255 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }),
  badgeId: uuid("badge_id").notNull(),

  // Award details
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  awardedForPeriod: varchar("awarded_for_period", { length: 50 }), // e.g., "2024-W45", "2024-11"

  // Achievement data
  achievementValue: text("achievement_value"), // The actual value that earned the badge
  achievementDetails: text("achievement_details"), // JSON with details

  // Notification
  notifiedAt: timestamp("notified_at"),
  acknowledgedAt: timestamp("acknowledged_at"),

  // Display
  isDisplayed: varchar("is_displayed", { length: 10 }).default("yes"), // Staff can hide badges

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStaffBadgeAwardSchema = createInsertSchema(staffBadgeAwards).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffBadgeAward = z.infer<typeof insertStaffBadgeAwardSchema>;
export type StaffBadgeAward = typeof staffBadgeAwards.$inferSelect;

// Schedule Interaction Logs - Track user interactions for analytics
export const scheduleInteractionLogs = pgTable("schedule_interaction_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  // User
  userId: varchar("user_id", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 100 }),

  // Action
  actionType: varchar("action_type", { length: 50 }).notNull(), // view, create, edit, delete, accept, decline, swap, claim
  actionTarget: varchar("action_target", { length: 50 }), // shift, open_shift, swap_request, task, etc.
  targetId: varchar("target_id", { length: 255 }),

  // Context
  calendarView: varchar("calendar_view", { length: 20 }), // weekly, monthly, daily
  deviceType: varchar("device_type", { length: 20 }), // desktop, mobile, tablet

  // Details
  actionDetails: text("action_details"), // JSON with action-specific data

  // Result
  wasSuccessful: varchar("was_successful", { length: 10 }).default("yes"),
  errorMessage: text("error_message"),

  // Timing
  durationMs: integer("duration_ms"),

  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertScheduleInteractionLogSchema = createInsertSchema(scheduleInteractionLogs).omit({
  id: true,
});

export type InsertScheduleInteractionLog = z.infer<typeof insertScheduleInteractionLogSchema>;
export type ScheduleInteractionLog = typeof scheduleInteractionLogs.$inferSelect;

// Daily Notes - Notes visible to specific staff looking after a client
export type DailyNoteVisibilityType = "all_staff" | "client_team" | "specific_staff" | "management_only";

export const dailyNotes = pgTable("daily_notes", {
  id: uuid("id").defaultRandom().primaryKey(),

  // What the note is for
  clientId: varchar("client_id", { length: 255 }).notNull(),
  date: date("date").notNull(), // The date this note applies to

  // Note content
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  category: varchar("category", { length: 50 }), // general, medication, behaviour, safety, handover, etc.

  // Visibility controls
  visibility: varchar("visibility", { length: 30 }).default("client_team").$type<DailyNoteVisibilityType>(),
  visibleToStaffIds: text("visible_to_staff_ids"), // JSON array - specific staff IDs if visibility is "specific_staff"
  visibleToRoles: text("visible_to_roles"), // JSON array - role names if limited by role

  // Created by management
  createdById: varchar("created_by_id", { length: 255 }).notNull(),
  createdByName: varchar("created_by_name", { length: 255 }),

  // Acknowledgement tracking
  requiresAcknowledgement: varchar("requires_acknowledgement", { length: 10 }).default("no"),
  acknowledgedByStaffIds: text("acknowledged_by_staff_ids"), // JSON array of staff who acknowledged

  // Status
  isActive: varchar("is_active", { length: 10 }).default("yes"),
  isPinned: varchar("is_pinned", { length: 10 }).default("no"), // Pinned notes show at top
  expiresAt: timestamp("expires_at"), // Optional expiry date

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyNoteSchema = createInsertSchema(dailyNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDailyNote = z.infer<typeof insertDailyNoteSchema>;
export type DailyNote = typeof dailyNotes.$inferSelect;
