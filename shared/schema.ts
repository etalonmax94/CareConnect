import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, date, serial, integer } from "drizzle-orm/pg-core";
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
  
  // Client status - Active, Hospital, Paused, Discharged (Archived is separate)
  status: text("status").default("Active").$type<"Active" | "Hospital" | "Paused" | "Discharged">(),
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
  status: z.enum(["Active", "Hospital", "Paused", "Discharged"]).optional(),
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
export type ClientStatus = "Active" | "Hospital" | "Paused" | "Discharged";

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
  previousStatus: z.enum(["Active", "Hospital", "Paused", "Discharged"]).nullable().optional(),
  newStatus: z.enum(["Active", "Hospital", "Paused", "Discharged"]),
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

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["general", "client_care", "documentation", "compliance", "training", "meeting", "follow_up", "other"]).optional().default("general"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  status: z.enum(["not_started", "in_progress", "completed", "cancelled"]).optional().default("not_started"),
  isRecurring: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  taskNumber: true,
  createdAt: true,
  updatedAt: true,
});

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
  
  // For client-linked conversations
  clientId: varchar("client_id"),
  clientName: text("client_name"),
  
  // Room metadata
  description: text("description"),
  avatarUrl: text("avatar_url"),
  
  // Announcement channel (broadcast only - only admins can post)
  isAnnouncement: text("is_announcement").default("no").$type<"yes" | "no">(),
  
  // Staff filter criteria used to create this group (for auto-sync)
  staffFilter: json("staff_filter").$type<ChatStaffFilter>(),
  
  // Created by
  createdById: varchar("created_by_id").notNull(),
  createdByName: text("created_by_name").notNull(),
  
  // Last activity for sorting
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  
  isArchived: text("is_archived").default("no").$type<"yes" | "no">(),
  archivedAt: timestamp("archived_at"),
  archivedById: varchar("archived_by_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatRoomSchema = createInsertSchema(chatRooms, {
  name: z.string().optional(),
  type: z.enum(["direct", "group", "client", "announcement"]).optional().default("direct"),
  description: z.string().optional(),
  isAnnouncement: z.enum(["yes", "no"]).optional(),
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
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  roomId: varchar("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  
  // Sender info
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  
  // Message content
  content: text("content").notNull(),
  messageType: text("message_type").$type<"text" | "system" | "file">().default("text"),
  
  // File attachment (if any)
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  
  // Reply to another message
  replyToId: varchar("reply_to_id"),
  replyToPreview: text("reply_to_preview"),
  
  // Edit/delete tracking
  isEdited: text("is_edited").default("no").$type<"yes" | "no">(),
  editedAt: timestamp("edited_at"),
  isDeleted: text("is_deleted").default("no").$type<"yes" | "no">(),
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages, {
  content: z.string().min(1, "Message cannot be empty"),
  messageType: z.enum(["text", "system", "file"]).optional().default("text"),
}).omit({
  id: true,
  createdAt: true,
  isEdited: true,
  editedAt: true,
  isDeleted: true,
  deletedAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
