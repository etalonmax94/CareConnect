import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

export interface CareTeam {
  careManager?: string;
  leadership?: string;
  generalPractitioner?: string;
  supportCoordinator?: string;
  planManager?: string;
  otherHealthProfessionals?: string[];
}

export interface NDISDetails {
  ndisNumber?: string;
  ndisFundingType?: string;
  ndisPlanStartDate?: string;
  ndisPlanEndDate?: string;
  scheduleOfSupports?: string;
  ndisConsentFormDate?: string;
}

export interface SupportAtHomeDetails {
  programDetails?: string;
  fundingSource?: string;
  serviceEntitlements?: string;
}

export interface PrivateClientDetails {
  paymentMethod?: string;
  serviceRates?: string;
  billingPreferences?: string;
}

export interface ClinicalDocuments {
  serviceAgreementDate?: string;
  consentFormDate?: string;
  riskAssessmentDate?: string;
  selfAssessmentMedxDate?: string;
  medicationConsentDate?: string;
  personalEmergencyPlanDate?: string;
  carePlanDate?: string;
  healthSummaryDate?: string;
  woundCarePlanDate?: string;
}

export interface Client {
  id: string;
  category: ClientCategory;
  participantName: string;
  photo?: string;
  dateOfBirth?: string;
  age?: number;
  homeAddress?: string;
  phoneNumber?: string;
  email?: string;
  medicareNumber?: string;
  nokEpoa?: string;
  frequencyOfServices?: string;
  mainDiagnosis?: string;
  summaryOfServices?: string;
  communicationNeeds?: string;
  highIntensitySupports?: string[];
  careTeam: CareTeam;
  ndisDetails?: NDISDetails;
  supportAtHomeDetails?: SupportAtHomeDetails;
  privateClientDetails?: PrivateClientDetails;
  clinicalDocuments: ClinicalDocuments;
  clinicalNotes?: string;
  scheduleArrivalNotification?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InsertClient = Omit<Client, "id" | "createdAt" | "updatedAt">;

// Service records
export interface ProgressNote {
  id: string;
  clientId: string;
  date: string;
  note: string;
  author: string;
  type: "progress" | "clinical" | "incident" | "complaint" | "feedback";
}

// Invoice
export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  description?: string;
}
