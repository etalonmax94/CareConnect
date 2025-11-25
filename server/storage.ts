import { db } from "./db";
import { 
  clients, progressNotes, invoices, budgets, settings, activityLog, incidentReports, privacyConsents,
  type InsertClient, type Client, type InsertProgressNote, type ProgressNote, 
  type InsertInvoice, type Invoice, type InsertBudget, type Budget,
  type InsertSettings, type Settings, type InsertActivityLog, type ActivityLog,
  type InsertIncidentReport, type IncidentReport, type InsertPrivacyConsent, type PrivacyConsent
} from "@shared/schema";
import { eq, desc, or, ilike, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Clients
  getAllClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | undefined>;
  searchClients(searchTerm: string, category?: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getNewClientsCount(days: number): Promise<number>;
  getNewClients(days: number): Promise<Client[]>;
  
  // Progress Notes
  getProgressNotesByClientId(clientId: string): Promise<ProgressNote[]>;
  createProgressNote(note: InsertProgressNote): Promise<ProgressNote>;
  
  // Invoices
  getInvoicesByClientId(clientId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  
  // Budgets
  getBudgetsByClientId(clientId: string): Promise<Budget[]>;
  getAllBudgets(): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  
  // Settings
  getSetting(key: string): Promise<Settings | undefined>;
  getAllSettings(): Promise<Settings[]>;
  upsertSetting(key: string, value: any): Promise<Settings>;
  
  // Activity Log
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;
  getActivityByClient(clientId: string): Promise<ActivityLog[]>;
  logActivity(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Incident Reports
  getAllIncidentReports(): Promise<IncidentReport[]>;
  getIncidentsByClient(clientId: string): Promise<IncidentReport[]>;
  createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport>;
  updateIncidentReport(id: string, report: Partial<InsertIncidentReport>): Promise<IncidentReport | undefined>;
  
  // Privacy Consents
  getConsentsByClient(clientId: string): Promise<PrivacyConsent[]>;
  createPrivacyConsent(consent: InsertPrivacyConsent): Promise<PrivacyConsent>;
  updatePrivacyConsent(id: string, consent: Partial<InsertPrivacyConsent>): Promise<PrivacyConsent | undefined>;
}

export class DbStorage implements IStorage {
  // Clients
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClientById(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async searchClients(searchTerm: string, category?: string): Promise<Client[]> {
    const conditions = [];
    
    if (searchTerm) {
      conditions.push(
        or(
          ilike(clients.participantName, `%${searchTerm}%`),
          ilike(clients.medicareNumber, `%${searchTerm}%`),
          ilike(clients.email, `%${searchTerm}%`)
        )
      );
    }
    
    if (category && category !== "All") {
      conditions.push(eq(clients.category, category as any));
    }
    
    if (conditions.length === 0) {
      return this.getAllClients();
    }
    
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    return await db.select().from(clients)
      .where(whereClause)
      .orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values([client]).returning();
    return result[0];
  }

  async updateClient(id: string, clientUpdate: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set({ ...clientUpdate as any, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async getNewClientsCount(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(gte(clients.createdAt, cutoffDate));
    
    return Number(result[0]?.count || 0);
  }

  async getNewClients(days: number): Promise<Client[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db.select()
      .from(clients)
      .where(gte(clients.createdAt, cutoffDate))
      .orderBy(desc(clients.createdAt));
  }

  // Progress Notes
  async getProgressNotesByClientId(clientId: string): Promise<ProgressNote[]> {
    return await db.select().from(progressNotes)
      .where(eq(progressNotes.clientId, clientId))
      .orderBy(desc(progressNotes.date));
  }

  async createProgressNote(note: InsertProgressNote): Promise<ProgressNote> {
    const result = await db.insert(progressNotes).values(note).returning();
    return result[0];
  }

  // Invoices
  async getInvoicesByClientId(clientId: string): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.clientId, clientId))
      .orderBy(desc(invoices.date));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  // Budgets
  async getBudgetsByClientId(clientId: string): Promise<Budget[]> {
    return await db.select().from(budgets)
      .where(eq(budgets.clientId, clientId))
      .orderBy(desc(budgets.createdAt));
  }

  async getAllBudgets(): Promise<Budget[]> {
    return await db.select().from(budgets).orderBy(desc(budgets.createdAt));
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const result = await db.insert(budgets).values(budget).returning();
    return result[0];
  }

  async updateBudget(id: string, budgetUpdate: Partial<InsertBudget>): Promise<Budget | undefined> {
    const result = await db.update(budgets)
      .set({ ...budgetUpdate as any, updatedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    return result[0];
  }

  // Settings
  async getSetting(key: string): Promise<Settings | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0];
  }

  async getAllSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async upsertSetting(key: string, value: any): Promise<Settings> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const result = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(settings).values({ key, value }).returning();
      return result[0];
    }
  }

  // Activity Log
  async getRecentActivity(limit: number = 20): Promise<ActivityLog[]> {
    return await db.select().from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async getActivityByClient(clientId: string): Promise<ActivityLog[]> {
    return await db.select().from(activityLog)
      .where(eq(activityLog.clientId, clientId))
      .orderBy(desc(activityLog.createdAt));
  }

  async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLog).values(log).returning();
    return result[0];
  }

  // Incident Reports
  async getAllIncidentReports(): Promise<IncidentReport[]> {
    return await db.select().from(incidentReports).orderBy(desc(incidentReports.incidentDate));
  }

  async getIncidentsByClient(clientId: string): Promise<IncidentReport[]> {
    return await db.select().from(incidentReports)
      .where(eq(incidentReports.clientId, clientId))
      .orderBy(desc(incidentReports.incidentDate));
  }

  async createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport> {
    const result = await db.insert(incidentReports).values(report).returning();
    return result[0];
  }

  async updateIncidentReport(id: string, reportUpdate: Partial<InsertIncidentReport>): Promise<IncidentReport | undefined> {
    const result = await db.update(incidentReports)
      .set({ ...reportUpdate as any, updatedAt: new Date() })
      .where(eq(incidentReports.id, id))
      .returning();
    return result[0];
  }

  // Privacy Consents
  async getConsentsByClient(clientId: string): Promise<PrivacyConsent[]> {
    return await db.select().from(privacyConsents)
      .where(eq(privacyConsents.clientId, clientId))
      .orderBy(desc(privacyConsents.createdAt));
  }

  async createPrivacyConsent(consent: InsertPrivacyConsent): Promise<PrivacyConsent> {
    const result = await db.insert(privacyConsents).values(consent).returning();
    return result[0];
  }

  async updatePrivacyConsent(id: string, consentUpdate: Partial<InsertPrivacyConsent>): Promise<PrivacyConsent | undefined> {
    const result = await db.update(privacyConsents)
      .set({ ...consentUpdate as any, updatedAt: new Date() })
      .where(eq(privacyConsents.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
