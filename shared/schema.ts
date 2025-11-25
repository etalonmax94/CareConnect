import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Client types
export type ClientCategory = "NDIS" | "Support at Home" | "Private";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull().$type<ClientCategory>(),
  participantName: text("participant_name").notNull(),
  photo: text("photo"),
  dateOfBirth: date("date_of_birth"),
  homeAddress: text("home_address"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  medicareNumber: text("medicare_number"),
  nokEpoa: text("nok_epoa"),
  frequencyOfServices: text("frequency_of_services"),
  mainDiagnosis: text("main_diagnosis"),
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
  
  // Care Team - stored as JSON
  careTeam: json("care_team").$type<{
    careManager?: string;
    leadership?: string;
    generalPractitioner?: string;
    supportCoordinator?: string;
    planManager?: string;
    supportCoordinatorId?: string;
    planManagerId?: string;
    preferredWorkers?: string[];
    unsuitableWorkers?: string[];
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
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients, {
  email: z.string().email().optional().nullable().or(z.literal("")),
  category: z.enum(["NDIS", "Support at Home", "Private"]),
  dateOfBirth: z.string().optional().or(z.literal("")),
  careTeam: z.any().optional(),
  ndisDetails: z.any().optional(),
  supportAtHomeDetails: z.any().optional(),
  privateClientDetails: z.any().optional(),
  clinicalDocuments: z.any().optional(),
  notificationPreferences: z.any().optional(),
  isPinned: z.enum(["yes", "no"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateClientSchema = insertClientSchema.partial();

export const selectClientSchema = createSelectSchema(clients);

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

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
  type: text("type").notNull().$type<"progress" | "clinical" | "incident" | "complaint" | "feedback">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProgressNoteSchema = createInsertSchema(progressNotes, {
  type: z.enum(["progress", "clinical", "incident", "complaint", "feedback"]),
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
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadDate: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

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
  status: text("status").notNull().$type<"open" | "investigating" | "resolved" | "closed">().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIncidentReportSchema = createInsertSchema(incidentReports, {
  incidentType: z.enum(["fall", "medication", "behavioral", "injury", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "investigating", "resolved", "closed"]),
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

// Notification preference type
export type NotificationPreference = {
  smsArrival?: boolean;
  smsSchedule?: boolean;
  callArrival?: boolean;
  callSchedule?: boolean;
  none?: boolean;
};
