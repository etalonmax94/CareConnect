import { db } from "./db";
import { 
  clients, progressNotes, invoices, budgets, settings, activityLog, incidentReports, privacyConsents,
  staff, supportCoordinators, planManagers, ndisServices, users,
  type InsertClient, type Client, type InsertProgressNote, type ProgressNote, 
  type InsertInvoice, type Invoice, type InsertBudget, type Budget,
  type InsertSettings, type Settings, type InsertActivityLog, type ActivityLog,
  type InsertIncidentReport, type IncidentReport, type InsertPrivacyConsent, type PrivacyConsent,
  type InsertStaff, type Staff, type InsertSupportCoordinator, type SupportCoordinator,
  type InsertPlanManager, type PlanManager, type InsertNdisService, type NdisService,
  type InsertUser, type User, type UserRole
} from "@shared/schema";
import { eq, desc, or, ilike, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Clients
  getAllClients(): Promise<Client[]>;
  getActiveClients(): Promise<Client[]>;
  getArchivedClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | undefined>;
  searchClients(searchTerm: string, category?: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getNewClientsCount(days: number): Promise<number>;
  getNewClients(days: number): Promise<Client[]>;
  archiveClient(id: string, userId: string, reason: string): Promise<Client | undefined>;
  restoreClient(id: string): Promise<Client | undefined>;
  
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
  
  // Staff
  getAllStaff(): Promise<Staff[]>;
  getStaffById(id: string): Promise<Staff | undefined>;
  createStaff(staffMember: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staffMember: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;
  
  // Support Coordinators
  getAllSupportCoordinators(): Promise<SupportCoordinator[]>;
  getSupportCoordinatorById(id: string): Promise<SupportCoordinator | undefined>;
  createSupportCoordinator(coordinator: InsertSupportCoordinator): Promise<SupportCoordinator>;
  updateSupportCoordinator(id: string, coordinator: Partial<InsertSupportCoordinator>): Promise<SupportCoordinator | undefined>;
  deleteSupportCoordinator(id: string): Promise<boolean>;
  
  // Plan Managers
  getAllPlanManagers(): Promise<PlanManager[]>;
  getPlanManagerById(id: string): Promise<PlanManager | undefined>;
  createPlanManager(manager: InsertPlanManager): Promise<PlanManager>;
  updatePlanManager(id: string, manager: Partial<InsertPlanManager>): Promise<PlanManager | undefined>;
  deletePlanManager(id: string): Promise<boolean>;
  
  // NDIS Services
  getNdisServicesByClient(clientId: string): Promise<NdisService[]>;
  createNdisService(service: InsertNdisService): Promise<NdisService>;
  updateNdisService(id: string, service: Partial<InsertNdisService>): Promise<NdisService | undefined>;
  deleteNdisService(id: string): Promise<boolean>;
  
  // Users (Zoho Auth)
  getUserByZohoId(zohoUserId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRoles(id: string, roles: UserRole[]): Promise<User | undefined>;
  updateUserTokens(id: string, accessToken: string, refreshToken: string, expiresAt: Date): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
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
    // First check if the client exists and is not archived
    const existingClient = await this.getClientById(id);
    if (!existingClient) {
      return undefined;
    }
    if (existingClient.isArchived === "yes") {
      throw new Error("Cannot update archived client");
    }
    
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

  async getActiveClients(): Promise<Client[]> {
    return await db.select()
      .from(clients)
      .where(or(eq(clients.isArchived, "no"), sql`${clients.isArchived} IS NULL`))
      .orderBy(desc(clients.createdAt));
  }

  async getArchivedClients(): Promise<Client[]> {
    return await db.select()
      .from(clients)
      .where(eq(clients.isArchived, "yes"))
      .orderBy(desc(clients.archivedAt));
  }

  async archiveClient(id: string, userId: string, reason: string): Promise<Client | undefined> {
    const now = new Date();
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7); // 7 years retention per Australian Privacy Act
    
    const result = await db.update(clients)
      .set({
        isArchived: "yes",
        archivedAt: now,
        archivedByUserId: userId,
        archiveReason: reason,
        retentionUntil: retentionDate.toISOString().split('T')[0],
        updatedAt: now,
      })
      .where(eq(clients.id, id))
      .returning();
    return result[0];
  }

  async restoreClient(id: string): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set({
        isArchived: "no",
        archivedAt: null,
        archivedByUserId: null,
        archiveReason: null,
        retentionUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();
    return result[0];
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

  // Staff
  async getAllStaff(): Promise<Staff[]> {
    return await db.select().from(staff).orderBy(staff.name);
  }

  async getStaffById(id: string): Promise<Staff | undefined> {
    const result = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    return result[0];
  }

  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const result = await db.insert(staff).values(staffMember).returning();
    return result[0];
  }

  async updateStaff(id: string, staffUpdate: Partial<InsertStaff>): Promise<Staff | undefined> {
    const result = await db.update(staff)
      .set({ ...staffUpdate as any, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return result[0];
  }

  async deleteStaff(id: string): Promise<boolean> {
    const result = await db.delete(staff).where(eq(staff.id, id)).returning();
    return result.length > 0;
  }

  // Support Coordinators
  async getAllSupportCoordinators(): Promise<SupportCoordinator[]> {
    return await db.select().from(supportCoordinators).orderBy(supportCoordinators.name);
  }

  async getSupportCoordinatorById(id: string): Promise<SupportCoordinator | undefined> {
    const result = await db.select().from(supportCoordinators).where(eq(supportCoordinators.id, id)).limit(1);
    return result[0];
  }

  async createSupportCoordinator(coordinator: InsertSupportCoordinator): Promise<SupportCoordinator> {
    const result = await db.insert(supportCoordinators).values(coordinator).returning();
    return result[0];
  }

  async updateSupportCoordinator(id: string, coordinatorUpdate: Partial<InsertSupportCoordinator>): Promise<SupportCoordinator | undefined> {
    const result = await db.update(supportCoordinators)
      .set({ ...coordinatorUpdate as any, updatedAt: new Date() })
      .where(eq(supportCoordinators.id, id))
      .returning();
    return result[0];
  }

  async deleteSupportCoordinator(id: string): Promise<boolean> {
    const result = await db.delete(supportCoordinators).where(eq(supportCoordinators.id, id)).returning();
    return result.length > 0;
  }

  // Plan Managers
  async getAllPlanManagers(): Promise<PlanManager[]> {
    return await db.select().from(planManagers).orderBy(planManagers.name);
  }

  async getPlanManagerById(id: string): Promise<PlanManager | undefined> {
    const result = await db.select().from(planManagers).where(eq(planManagers.id, id)).limit(1);
    return result[0];
  }

  async createPlanManager(manager: InsertPlanManager): Promise<PlanManager> {
    const result = await db.insert(planManagers).values(manager).returning();
    return result[0];
  }

  async updatePlanManager(id: string, managerUpdate: Partial<InsertPlanManager>): Promise<PlanManager | undefined> {
    const result = await db.update(planManagers)
      .set({ ...managerUpdate as any, updatedAt: new Date() })
      .where(eq(planManagers.id, id))
      .returning();
    return result[0];
  }

  async deletePlanManager(id: string): Promise<boolean> {
    const result = await db.delete(planManagers).where(eq(planManagers.id, id)).returning();
    return result.length > 0;
  }

  // NDIS Services
  async getNdisServicesByClient(clientId: string): Promise<NdisService[]> {
    return await db.select().from(ndisServices)
      .where(eq(ndisServices.clientId, clientId))
      .orderBy(ndisServices.serviceName);
  }

  async createNdisService(service: InsertNdisService): Promise<NdisService> {
    const result = await db.insert(ndisServices).values(service).returning();
    return result[0];
  }

  async updateNdisService(id: string, serviceUpdate: Partial<InsertNdisService>): Promise<NdisService | undefined> {
    const result = await db.update(ndisServices)
      .set({ ...serviceUpdate as any, updatedAt: new Date() })
      .where(eq(ndisServices.id, id))
      .returning();
    return result[0];
  }

  async deleteNdisService(id: string): Promise<boolean> {
    const result = await db.delete(ndisServices).where(eq(ndisServices.id, id)).returning();
    return result.length > 0;
  }

  // Users (Zoho Auth)
  async getUserByZohoId(zohoUserId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.zohoUserId, zohoUserId)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ ...userUpdate as any, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserRoles(id: string, roles: UserRole[]): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ roles, isFirstLogin: "no", updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserTokens(id: string, accessToken: string, refreshToken: string, expiresAt: Date): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        zohoAccessToken: accessToken, 
        zohoRefreshToken: refreshToken, 
        zohoTokenExpiresAt: expiresAt,
        lastLoginAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.displayName);
  }
}

export const storage = new DbStorage();
