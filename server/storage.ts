import { db } from "./db";
import { 
  clients, progressNotes, invoices, budgets, settings, activityLog, incidentReports, privacyConsents,
  staff, supportCoordinators, planManagers, ndisServices, users, generalPractitioners, pharmacies,
  documents, clientStaffAssignments, serviceDeliveries,
  type InsertClient, type Client, type InsertProgressNote, type ProgressNote, 
  type InsertInvoice, type Invoice, type InsertBudget, type Budget,
  type InsertSettings, type Settings, type InsertActivityLog, type ActivityLog,
  type InsertIncidentReport, type IncidentReport, type InsertPrivacyConsent, type PrivacyConsent,
  type InsertStaff, type Staff, type InsertSupportCoordinator, type SupportCoordinator,
  type InsertPlanManager, type PlanManager, type InsertNdisService, type NdisService,
  type InsertUser, type User, type UserRole,
  type InsertGP, type GP, type InsertPharmacy, type Pharmacy,
  type InsertDocument, type Document, 
  type InsertClientStaffAssignment, type ClientStaffAssignment,
  type InsertServiceDelivery, type ServiceDelivery
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
  getUpcomingBirthdays(days: number): Promise<Client[]>;
  
  // Progress Notes
  getAllProgressNotes(): Promise<ProgressNote[]>;
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
  
  // General Practitioners (GP)
  getAllGPs(): Promise<GP[]>;
  getGPById(id: string): Promise<GP | undefined>;
  createGP(gp: InsertGP): Promise<GP>;
  updateGP(id: string, gp: Partial<InsertGP>): Promise<GP | undefined>;
  deleteGP(id: string): Promise<boolean>;
  
  // Pharmacies
  getAllPharmacies(): Promise<Pharmacy[]>;
  getPharmacyById(id: string): Promise<Pharmacy | undefined>;
  createPharmacy(pharmacy: InsertPharmacy): Promise<Pharmacy>;
  updatePharmacy(id: string, pharmacy: Partial<InsertPharmacy>): Promise<Pharmacy | undefined>;
  deletePharmacy(id: string): Promise<boolean>;
  
  // Documents
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;
  
  // Client-Staff Assignments
  getAssignmentsByClient(clientId: string): Promise<ClientStaffAssignment[]>;
  getAssignmentsByStaff(staffId: string): Promise<ClientStaffAssignment[]>;
  createAssignment(assignment: InsertClientStaffAssignment): Promise<ClientStaffAssignment>;
  updateAssignment(id: string, assignment: Partial<InsertClientStaffAssignment>): Promise<ClientStaffAssignment | undefined>;
  deleteAssignment(id: string): Promise<boolean>;
  
  // Service Deliveries
  getServiceDeliveriesByClient(clientId: string): Promise<ServiceDelivery[]>;
  getServiceDeliveriesByStaff(staffId: string): Promise<ServiceDelivery[]>;
  createServiceDelivery(delivery: InsertServiceDelivery): Promise<ServiceDelivery>;
  updateServiceDelivery(id: string, delivery: Partial<InsertServiceDelivery>): Promise<ServiceDelivery | undefined>;
  deleteServiceDelivery(id: string): Promise<boolean>;
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

  async getUpcomingBirthdays(days: number): Promise<Client[]> {
    // Get all active clients with a date of birth
    const allClients = await this.getActiveClients();
    
    // Normalize to start of day (midnight) for accurate date-only comparisons
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    
    return allClients.filter(client => {
      if (!client.dateOfBirth) return false;
      
      const dob = new Date(client.dateOfBirth);
      // Create birthday this year at midnight
      const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
      birthdayThisYear.setHours(0, 0, 0, 0);
      
      // If birthday has already passed this year (strictly before today), check next year
      if (birthdayThisYear.getTime() < today.getTime()) {
        birthdayThisYear.setFullYear(currentYear + 1);
      }
      
      // Calculate days until birthday
      const diffTime = birthdayThisYear.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= days;
    }).sort((a, b) => {
      // Sort by upcoming birthday
      const dobA = new Date(a.dateOfBirth!);
      const dobB = new Date(b.dateOfBirth!);
      const bdayA = new Date(currentYear, dobA.getMonth(), dobA.getDate());
      const bdayB = new Date(currentYear, dobB.getMonth(), dobB.getDate());
      bdayA.setHours(0, 0, 0, 0);
      bdayB.setHours(0, 0, 0, 0);
      if (bdayA.getTime() < today.getTime()) bdayA.setFullYear(currentYear + 1);
      if (bdayB.getTime() < today.getTime()) bdayB.setFullYear(currentYear + 1);
      return bdayA.getTime() - bdayB.getTime();
    });
  }

  // Progress Notes
  async getAllProgressNotes(): Promise<ProgressNote[]> {
    return await db.select().from(progressNotes)
      .orderBy(desc(progressNotes.date));
  }

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

  // General Practitioners (GP)
  async getAllGPs(): Promise<GP[]> {
    return await db.select().from(generalPractitioners).orderBy(generalPractitioners.name);
  }

  async getGPById(id: string): Promise<GP | undefined> {
    const result = await db.select().from(generalPractitioners).where(eq(generalPractitioners.id, id)).limit(1);
    return result[0];
  }

  async createGP(gp: InsertGP): Promise<GP> {
    const result = await db.insert(generalPractitioners).values(gp).returning();
    return result[0];
  }

  async updateGP(id: string, gpUpdate: Partial<InsertGP>): Promise<GP | undefined> {
    const result = await db.update(generalPractitioners)
      .set({ ...gpUpdate as any, updatedAt: new Date() })
      .where(eq(generalPractitioners.id, id))
      .returning();
    return result[0];
  }

  async deleteGP(id: string): Promise<boolean> {
    const result = await db.delete(generalPractitioners).where(eq(generalPractitioners.id, id)).returning();
    return result.length > 0;
  }

  // Pharmacies
  async getAllPharmacies(): Promise<Pharmacy[]> {
    return await db.select().from(pharmacies).orderBy(pharmacies.name);
  }

  async getPharmacyById(id: string): Promise<Pharmacy | undefined> {
    const result = await db.select().from(pharmacies).where(eq(pharmacies.id, id)).limit(1);
    return result[0];
  }

  async createPharmacy(pharmacy: InsertPharmacy): Promise<Pharmacy> {
    const result = await db.insert(pharmacies).values(pharmacy).returning();
    return result[0];
  }

  async updatePharmacy(id: string, pharmacyUpdate: Partial<InsertPharmacy>): Promise<Pharmacy | undefined> {
    const result = await db.update(pharmacies)
      .set({ ...pharmacyUpdate as any, updatedAt: new Date() })
      .where(eq(pharmacies.id, id))
      .returning();
    return result[0];
  }

  async deletePharmacy(id: string): Promise<boolean> {
    const result = await db.delete(pharmacies).where(eq(pharmacies.id, id)).returning();
    return result.length > 0;
  }

  // Documents
  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.uploadDate));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return result[0];
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  // Client-Staff Assignments
  async getAssignmentsByClient(clientId: string): Promise<ClientStaffAssignment[]> {
    return await db.select().from(clientStaffAssignments)
      .where(eq(clientStaffAssignments.clientId, clientId))
      .orderBy(desc(clientStaffAssignments.createdAt));
  }

  async getAssignmentsByStaff(staffId: string): Promise<ClientStaffAssignment[]> {
    return await db.select().from(clientStaffAssignments)
      .where(eq(clientStaffAssignments.staffId, staffId))
      .orderBy(desc(clientStaffAssignments.createdAt));
  }

  async createAssignment(assignment: InsertClientStaffAssignment): Promise<ClientStaffAssignment> {
    const result = await db.insert(clientStaffAssignments).values(assignment).returning();
    return result[0];
  }

  async updateAssignment(id: string, assignmentUpdate: Partial<InsertClientStaffAssignment>): Promise<ClientStaffAssignment | undefined> {
    const result = await db.update(clientStaffAssignments)
      .set({ ...assignmentUpdate as any, updatedAt: new Date() })
      .where(eq(clientStaffAssignments.id, id))
      .returning();
    return result[0];
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const result = await db.delete(clientStaffAssignments).where(eq(clientStaffAssignments.id, id)).returning();
    return result.length > 0;
  }

  // Service Deliveries
  async getServiceDeliveriesByClient(clientId: string): Promise<ServiceDelivery[]> {
    return await db.select().from(serviceDeliveries)
      .where(eq(serviceDeliveries.clientId, clientId))
      .orderBy(desc(serviceDeliveries.deliveredAt));
  }

  async getServiceDeliveriesByStaff(staffId: string): Promise<ServiceDelivery[]> {
    return await db.select().from(serviceDeliveries)
      .where(eq(serviceDeliveries.staffId, staffId))
      .orderBy(desc(serviceDeliveries.deliveredAt));
  }

  async createServiceDelivery(delivery: InsertServiceDelivery): Promise<ServiceDelivery> {
    const result = await db.insert(serviceDeliveries).values(delivery).returning();
    return result[0];
  }

  async updateServiceDelivery(id: string, deliveryUpdate: Partial<InsertServiceDelivery>): Promise<ServiceDelivery | undefined> {
    const result = await db.update(serviceDeliveries)
      .set({ ...deliveryUpdate as any })
      .where(eq(serviceDeliveries.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceDelivery(id: string): Promise<boolean> {
    const result = await db.delete(serviceDeliveries).where(eq(serviceDeliveries.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
