import { db } from "./db";
import { 
  clients, progressNotes, invoices, budgets, settings, activityLog, auditLog, incidentReports, privacyConsents,
  staff, supportCoordinators, planManagers, ndisServices, users, generalPractitioners, pharmacies,
  alliedHealthProfessionals,
  documents, clientStaffAssignments, serviceDeliveries, clientGoals,
  clientDocumentFolders, clientDocumentCompliance,
  ndisPriceGuideItems, quotes, quoteLineItems, quoteStatusHistory, quoteSendHistory,
  clientContacts, clientBehaviors, leadershipMeetingNotes,
  // New scheduling and care plan tables
  appointments, appointmentAssignments, appointmentCheckins,
  clientStaffPreferences, clientStaffRestrictions,
  staffAvailabilityWindows, staffUnavailabilityPeriods, staffStatusLogs,
  carePlans, carePlanHealthMatters, carePlanDiagnoses, carePlanEmergencyContacts, carePlanEmergencyProcedures,
  formTemplates, formTemplateFields, formSubmissions, formSubmissionValues, formSignatures,
  appointmentTypeRequiredForms,
  nonFaceToFaceServiceLogs, diagnoses, clientDiagnoses,
  clientStatusLogs,
  computeFullName,
  type InsertClient, type Client, type InsertProgressNote, type ProgressNote, 
  type InsertInvoice, type Invoice, type InsertBudget, type Budget,
  type InsertSettings, type Settings, type InsertActivityLog, type ActivityLog,
  type InsertAuditLog, type AuditLog,
  type InsertIncidentReport, type IncidentReport, type InsertPrivacyConsent, type PrivacyConsent,
  type InsertStaff, type Staff, type InsertSupportCoordinator, type SupportCoordinator,
  type InsertPlanManager, type PlanManager, type InsertNdisService, type NdisService,
  type InsertUser, type User, type UserRole,
  type InsertGP, type GP, type InsertPharmacy, type Pharmacy,
  type InsertAlliedHealthProfessional, type AlliedHealthProfessional,
  type InsertDocument, type Document, 
  type InsertClientStaffAssignment, type ClientStaffAssignment,
  type InsertServiceDelivery, type ServiceDelivery,
  type InsertClientGoal, type ClientGoal,
  type InsertNdisPriceGuideItem, type NdisPriceGuideItem,
  type InsertQuote, type Quote, type InsertQuoteLineItem, type QuoteLineItem,
  type InsertQuoteStatusHistory, type QuoteStatusHistory,
  type InsertQuoteSendHistory, type QuoteSendHistory,
  type InsertClientContact, type ClientContact,
  type InsertClientBehavior, type ClientBehavior,
  type InsertLeadershipMeetingNote, type LeadershipMeetingNote,
  type InsertClientDocumentFolder, type ClientDocumentFolder,
  type InsertClientDocumentCompliance, type ClientDocumentCompliance,
  // New types for scheduling and care plans
  type InsertAppointment, type Appointment,
  type InsertAppointmentAssignment, type AppointmentAssignment,
  type InsertAppointmentCheckin, type AppointmentCheckin,
  type InsertClientStaffPreference, type ClientStaffPreference,
  type InsertClientStaffRestriction, type ClientStaffRestriction,
  type InsertStaffAvailabilityWindow, type StaffAvailabilityWindow,
  type InsertStaffUnavailabilityPeriod, type StaffUnavailabilityPeriod,
  type InsertStaffStatusLog, type StaffStatusLog,
  type InsertCarePlan, type CarePlan,
  type InsertCarePlanHealthMatter, type CarePlanHealthMatter,
  type InsertCarePlanDiagnosis, type CarePlanDiagnosis,
  type InsertCarePlanEmergencyContact, type CarePlanEmergencyContact,
  type InsertCarePlanEmergencyProcedure, type CarePlanEmergencyProcedure,
  type InsertFormTemplate, type FormTemplate,
  type InsertFormTemplateField, type FormTemplateField,
  type InsertFormSubmission, type FormSubmission,
  type InsertFormSubmissionValue, type FormSubmissionValue,
  type InsertFormSignature, type FormSignature,
  type InsertAppointmentTypeRequiredForm, type AppointmentTypeRequiredForm,
  type InsertNonFaceToFaceServiceLog, type NonFaceToFaceServiceLog,
  type InsertDiagnosis, type Diagnosis,
  type InsertClientDiagnosis, type ClientDiagnosis,
  type InsertClientStatusLog, type ClientStatusLog
} from "@shared/schema";
import { eq, desc, or, ilike, and, gte, lte, sql } from "drizzle-orm";

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
  getDistinctDiagnoses(search?: string): Promise<string[]>;
  
  // Client Status Logs
  getClientStatusLogs(clientId: string): Promise<ClientStatusLog[]>;
  createClientStatusLog(log: InsertClientStatusLog): Promise<ClientStatusLog>;
  updateClientStatus(clientId: string, newStatus: string, reason: string, userId: string, userName: string): Promise<Client | undefined>;
  
  // Progress Notes
  getAllProgressNotes(): Promise<ProgressNote[]>;
  getProgressNotesByClientId(clientId: string): Promise<ProgressNote[]>;
  createProgressNote(note: InsertProgressNote): Promise<ProgressNote>;
  
  // Invoices
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByClientId(clientId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  
  // Budgets
  getBudgetsByClientId(clientId: string): Promise<Budget[]>;
  getBudget(id: string): Promise<Budget | undefined>;
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
  
  // Audit Log
  getAuditLogs(filters?: {
    entityType?: string;
    entityId?: string;
    operation?: string;
    userId?: string;
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }>;
  getAuditLogById(id: string): Promise<AuditLog | undefined>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
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
  getStaffByEmail(email: string): Promise<Staff | undefined>;
  getStaffByUserId(userId: string): Promise<Staff | undefined>;
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
  getPendingUsers(): Promise<User[]>;
  approveUser(id: string, approvedBy: string, roles: UserRole[]): Promise<User | undefined>;
  rejectUser(id: string, rejectedBy: string): Promise<User | undefined>;
  linkUserToStaff(userId: string, staffId: string): Promise<User | undefined>;
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
  
  // Allied Health Professionals
  getAllAlliedHealthProfessionals(): Promise<AlliedHealthProfessional[]>;
  getAlliedHealthProfessionalById(id: string): Promise<AlliedHealthProfessional | undefined>;
  createAlliedHealthProfessional(ahp: InsertAlliedHealthProfessional): Promise<AlliedHealthProfessional>;
  updateAlliedHealthProfessional(id: string, ahp: Partial<InsertAlliedHealthProfessional>): Promise<AlliedHealthProfessional | undefined>;
  deleteAlliedHealthProfessional(id: string): Promise<boolean>;
  
  // Documents
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: { expiryDate?: string | null; uploadDate?: string }): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  // Client-Staff Assignments
  getAssignmentsByClient(clientId: string): Promise<ClientStaffAssignment[]>;
  getAssignmentsByStaff(staffId: string): Promise<ClientStaffAssignment[]>;
  createAssignment(assignment: InsertClientStaffAssignment): Promise<ClientStaffAssignment>;
  updateAssignment(id: string, assignment: Partial<InsertClientStaffAssignment>): Promise<ClientStaffAssignment | undefined>;
  deleteAssignment(id: string): Promise<boolean>;
  
  // Service Deliveries
  getAllServiceDeliveries(): Promise<ServiceDelivery[]>;
  getServiceDeliveriesByClient(clientId: string): Promise<ServiceDelivery[]>;
  getServiceDeliveriesByStaff(staffId: string): Promise<ServiceDelivery[]>;
  createServiceDelivery(delivery: InsertServiceDelivery): Promise<ServiceDelivery>;
  updateServiceDelivery(id: string, delivery: Partial<InsertServiceDelivery>): Promise<ServiceDelivery | undefined>;
  deleteServiceDelivery(id: string): Promise<boolean>;
  
  // Client Goals
  getGoalsByClient(clientId: string): Promise<ClientGoal[]>;
  getGoalById(id: string): Promise<ClientGoal | undefined>;
  createGoal(goal: InsertClientGoal): Promise<ClientGoal>;
  updateGoal(id: string, goal: Partial<InsertClientGoal>): Promise<ClientGoal | undefined>;
  deleteGoal(id: string): Promise<boolean>;
  
  // Budget Management
  deleteBudget(id: string): Promise<boolean>;
  
  // NDIS Price Guide
  getAllPriceGuideItems(): Promise<NdisPriceGuideItem[]>;
  getActivePriceGuideItems(): Promise<NdisPriceGuideItem[]>;
  getPriceGuideItemById(id: string): Promise<NdisPriceGuideItem | undefined>;
  searchPriceGuideItems(searchTerm: string): Promise<NdisPriceGuideItem[]>;
  createPriceGuideItem(item: InsertNdisPriceGuideItem): Promise<NdisPriceGuideItem>;
  updatePriceGuideItem(id: string, item: Partial<InsertNdisPriceGuideItem>): Promise<NdisPriceGuideItem | undefined>;
  deletePriceGuideItem(id: string): Promise<boolean>;
  
  // Quotes
  getAllQuotes(): Promise<Quote[]>;
  getQuotesByClient(clientId: string): Promise<Quote[]>;
  getQuoteById(id: string): Promise<Quote | undefined>;
  getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<boolean>;
  getNextQuoteNumber(): Promise<string>;
  
  // Quote Line Items
  getLineItemsByQuote(quoteId: string): Promise<QuoteLineItem[]>;
  createLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem>;
  updateLineItem(id: string, item: Partial<InsertQuoteLineItem>): Promise<QuoteLineItem | undefined>;
  deleteLineItem(id: string): Promise<boolean>;
  deleteLineItemsByQuote(quoteId: string): Promise<boolean>;
  
  // Quote Status History
  getStatusHistoryByQuote(quoteId: string): Promise<QuoteStatusHistory[]>;
  createStatusHistory(history: InsertQuoteStatusHistory): Promise<QuoteStatusHistory>;
  
  // Quote Send History
  getSendHistoryByQuote(quoteId: string): Promise<QuoteSendHistory[]>;
  createSendHistory(history: InsertQuoteSendHistory): Promise<QuoteSendHistory>;
  
  // Client Contacts
  getContactsByClient(clientId: string): Promise<ClientContact[]>;
  getContactById(id: string): Promise<ClientContact | undefined>;
  createContact(contact: InsertClientContact): Promise<ClientContact>;
  updateContact(id: string, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  
  // Client Behaviors
  getBehaviorsByClient(clientId: string): Promise<ClientBehavior[]>;
  getBehaviorById(id: string): Promise<ClientBehavior | undefined>;
  createBehavior(behavior: InsertClientBehavior): Promise<ClientBehavior>;
  updateBehavior(id: string, behavior: Partial<InsertClientBehavior>): Promise<ClientBehavior | undefined>;
  deleteBehavior(id: string): Promise<boolean>;
  
  // Leadership Meeting Notes
  getMeetingNotesByClient(clientId: string): Promise<LeadershipMeetingNote[]>;
  getMeetingNoteById(id: string): Promise<LeadershipMeetingNote | undefined>;
  createMeetingNote(note: InsertLeadershipMeetingNote): Promise<LeadershipMeetingNote>;
  updateMeetingNote(id: string, note: Partial<InsertLeadershipMeetingNote>): Promise<LeadershipMeetingNote | undefined>;
  deleteMeetingNote(id: string): Promise<boolean>;
  
  // ============================================
  // APPOINTMENTS & SCHEDULING
  // ============================================
  
  // Appointments
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | undefined>;
  getAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  getAppointmentsByStaff(staffId: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]>;
  getUpcomingAppointments(days?: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  
  // Appointment Assignments
  getAssignmentsByAppointment(appointmentId: string): Promise<AppointmentAssignment[]>;
  getAppointmentAssignmentsByStaff(staffId: string): Promise<AppointmentAssignment[]>;
  createAppointmentAssignment(assignment: InsertAppointmentAssignment): Promise<AppointmentAssignment>;
  updateAppointmentAssignment(id: string, assignment: Partial<InsertAppointmentAssignment>): Promise<AppointmentAssignment | undefined>;
  deleteAppointmentAssignment(id: string): Promise<boolean>;
  
  // Appointment Check-ins
  getCheckinsByAppointment(appointmentId: string): Promise<AppointmentCheckin[]>;
  createAppointmentCheckin(checkin: InsertAppointmentCheckin): Promise<AppointmentCheckin>;
  
  // ============================================
  // STAFF ALLOCATION & PREFERENCES
  // ============================================
  
  // Client Staff Preferences
  getPreferencesByClient(clientId: string): Promise<ClientStaffPreference[]>;
  getPreferencesByStaff(staffId: string): Promise<ClientStaffPreference[]>;
  createStaffPreference(preference: InsertClientStaffPreference): Promise<ClientStaffPreference>;
  updateStaffPreference(id: string, preference: Partial<InsertClientStaffPreference>): Promise<ClientStaffPreference | undefined>;
  deleteStaffPreference(id: string): Promise<boolean>;
  
  // Client Staff Restrictions (Blacklist)
  getRestrictionsByClient(clientId: string): Promise<ClientStaffRestriction[]>;
  getRestrictionsByStaff(staffId: string): Promise<ClientStaffRestriction[]>;
  createStaffRestriction(restriction: InsertClientStaffRestriction): Promise<ClientStaffRestriction>;
  updateStaffRestriction(id: string, restriction: Partial<InsertClientStaffRestriction>): Promise<ClientStaffRestriction | undefined>;
  deleteStaffRestriction(id: string): Promise<boolean>;
  isStaffRestricted(clientId: string, staffId: string): Promise<boolean>;
  
  // Staff Availability Windows
  getAvailabilityByStaff(staffId: string): Promise<StaffAvailabilityWindow[]>;
  createAvailabilityWindow(window: InsertStaffAvailabilityWindow): Promise<StaffAvailabilityWindow>;
  updateAvailabilityWindow(id: string, window: Partial<InsertStaffAvailabilityWindow>): Promise<StaffAvailabilityWindow | undefined>;
  deleteAvailabilityWindow(id: string): Promise<boolean>;
  
  // Staff Unavailability Periods
  getUnavailabilityByStaff(staffId: string): Promise<StaffUnavailabilityPeriod[]>;
  getUnavailabilityByDateRange(startDate: Date, endDate: Date): Promise<StaffUnavailabilityPeriod[]>;
  createUnavailabilityPeriod(period: InsertStaffUnavailabilityPeriod): Promise<StaffUnavailabilityPeriod>;
  updateUnavailabilityPeriod(id: string, period: Partial<InsertStaffUnavailabilityPeriod>): Promise<StaffUnavailabilityPeriod | undefined>;
  deleteUnavailabilityPeriod(id: string): Promise<boolean>;
  
  // Staff Status Logs
  getCurrentStaffStatus(staffId: string): Promise<StaffStatusLog | undefined>;
  getStaffStatusHistory(staffId: string, limit?: number): Promise<StaffStatusLog[]>;
  getAllCurrentStaffStatuses(): Promise<StaffStatusLog[]>;
  createStaffStatusLog(log: InsertStaffStatusLog): Promise<StaffStatusLog>;
  
  // ============================================
  // CARE PLANS
  // ============================================
  
  // Care Plans
  getCarePlansByClient(clientId: string): Promise<CarePlan[]>;
  getActiveCarePlanByClient(clientId: string): Promise<CarePlan | undefined>;
  getCarePlanById(id: string): Promise<CarePlan | undefined>;
  createCarePlan(carePlan: InsertCarePlan): Promise<CarePlan>;
  updateCarePlan(id: string, carePlan: Partial<InsertCarePlan>): Promise<CarePlan | undefined>;
  archiveCarePlan(id: string, userId: string, userName: string, reason?: string): Promise<CarePlan | undefined>;
  
  // Care Plan Health Matters
  getHealthMattersByCarePlan(carePlanId: string): Promise<CarePlanHealthMatter[]>;
  createHealthMatter(matter: InsertCarePlanHealthMatter): Promise<CarePlanHealthMatter>;
  updateHealthMatter(id: string, matter: Partial<InsertCarePlanHealthMatter>): Promise<CarePlanHealthMatter | undefined>;
  deleteHealthMatter(id: string): Promise<boolean>;
  
  // Care Plan Diagnoses
  getDiagnosesByCarePlan(carePlanId: string): Promise<CarePlanDiagnosis[]>;
  createCarePlanDiagnosis(diagnosis: InsertCarePlanDiagnosis): Promise<CarePlanDiagnosis>;
  updateCarePlanDiagnosis(id: string, diagnosis: Partial<InsertCarePlanDiagnosis>): Promise<CarePlanDiagnosis | undefined>;
  deleteCarePlanDiagnosis(id: string): Promise<boolean>;
  
  // Care Plan Emergency Contacts
  getEmergencyContactsByCarePlan(carePlanId: string): Promise<CarePlanEmergencyContact[]>;
  createCarePlanEmergencyContact(contact: InsertCarePlanEmergencyContact): Promise<CarePlanEmergencyContact>;
  updateCarePlanEmergencyContact(id: string, contact: Partial<InsertCarePlanEmergencyContact>): Promise<CarePlanEmergencyContact | undefined>;
  deleteCarePlanEmergencyContact(id: string): Promise<boolean>;
  
  // Care Plan Emergency Procedures
  getEmergencyProceduresByCarePlan(carePlanId: string): Promise<CarePlanEmergencyProcedure[]>;
  createCarePlanEmergencyProcedure(procedure: InsertCarePlanEmergencyProcedure): Promise<CarePlanEmergencyProcedure>;
  updateCarePlanEmergencyProcedure(id: string, procedure: Partial<InsertCarePlanEmergencyProcedure>): Promise<CarePlanEmergencyProcedure | undefined>;
  deleteCarePlanEmergencyProcedure(id: string): Promise<boolean>;
  
  // ============================================
  // FORMS SYSTEM
  // ============================================
  
  // Form Templates
  getAllFormTemplates(): Promise<FormTemplate[]>;
  getActiveFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplateById(id: string): Promise<FormTemplate | undefined>;
  getFormTemplatesByCategory(category: string): Promise<FormTemplate[]>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: string): Promise<boolean>;
  
  // Form Template Fields
  getFieldsByTemplate(templateId: string): Promise<FormTemplateField[]>;
  createTemplateField(field: InsertFormTemplateField): Promise<FormTemplateField>;
  updateTemplateField(id: string, field: Partial<InsertFormTemplateField>): Promise<FormTemplateField | undefined>;
  deleteTemplateField(id: string): Promise<boolean>;
  deleteFieldsByTemplate(templateId: string): Promise<boolean>;
  
  // Form Submissions
  getSubmissionsByClient(clientId: string): Promise<FormSubmission[]>;
  getSubmissionsByTemplate(templateId: string): Promise<FormSubmission[]>;
  getSubmissionById(id: string): Promise<FormSubmission | undefined>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  updateFormSubmission(id: string, submission: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined>;
  
  // Form Submission Values
  getValuesBySubmission(submissionId: string): Promise<FormSubmissionValue[]>;
  createSubmissionValue(value: InsertFormSubmissionValue): Promise<FormSubmissionValue>;
  updateSubmissionValue(id: string, value: Partial<InsertFormSubmissionValue>): Promise<FormSubmissionValue | undefined>;
  deleteValuesBySubmission(submissionId: string): Promise<boolean>;
  
  // Form Signatures
  getSignaturesBySubmission(submissionId: string): Promise<FormSignature[]>;
  createFormSignature(signature: InsertFormSignature): Promise<FormSignature>;
  
  // Appointment Type Required Forms
  getRequiredFormsByAppointmentType(appointmentType: string): Promise<AppointmentTypeRequiredForm[]>;
  createAppointmentTypeRequiredForm(form: InsertAppointmentTypeRequiredForm): Promise<AppointmentTypeRequiredForm>;
  deleteAppointmentTypeRequiredForm(id: string): Promise<boolean>;
  
  // ============================================
  // NON-FACE-TO-FACE SERVICE LOGS
  // ============================================
  
  getNonFaceToFaceLogsByClient(clientId: string): Promise<NonFaceToFaceServiceLog[]>;
  getNonFaceToFaceLogById(id: string): Promise<NonFaceToFaceServiceLog | undefined>;
  createNonFaceToFaceLog(log: InsertNonFaceToFaceServiceLog): Promise<NonFaceToFaceServiceLog>;
  updateNonFaceToFaceLog(id: string, log: Partial<InsertNonFaceToFaceServiceLog>): Promise<NonFaceToFaceServiceLog | undefined>;
  deleteNonFaceToFaceLog(id: string): Promise<boolean>;
  
  // ============================================
  // DIAGNOSES
  // ============================================
  
  getAllDiagnoses(): Promise<Diagnosis[]>;
  getDiagnosisById(id: string): Promise<Diagnosis | undefined>;
  searchDiagnoses(searchTerm: string): Promise<Diagnosis[]>;
  createDiagnosis(diagnosis: InsertDiagnosis): Promise<Diagnosis>;
  updateDiagnosis(id: string, diagnosis: Partial<InsertDiagnosis>): Promise<Diagnosis | undefined>;
  deleteDiagnosis(id: string): Promise<boolean>;
  
  // Client Diagnoses
  getDiagnosesByClient(clientId: string): Promise<ClientDiagnosis[]>;
  addDiagnosisToClient(clientDiagnosis: InsertClientDiagnosis): Promise<ClientDiagnosis>;
  updateClientDiagnosis(id: string, diagnosis: Partial<InsertClientDiagnosis>): Promise<ClientDiagnosis | undefined>;
  removeDiagnosisFromClient(id: string): Promise<boolean>;
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
          ilike(clients.firstName, `%${searchTerm}%`),
          ilike(clients.lastName, `%${searchTerm}%`),
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
    // Compute participantName from name fields
    const participantName = client.participantName || 
      computeFullName(client.firstName, client.middleName, client.lastName);
    
    const clientData = {
      ...client,
      participantName,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
    };
    
    const result = await db.insert(clients).values([clientData]).returning();
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
    
    // If name fields are being updated, recompute participantName
    const updateData = { ...clientUpdate };
    if (clientUpdate.firstName !== undefined || clientUpdate.middleName !== undefined || clientUpdate.lastName !== undefined) {
      const firstName = clientUpdate.firstName ?? existingClient.firstName;
      const middleName = clientUpdate.middleName ?? existingClient.middleName;
      const lastName = clientUpdate.lastName ?? existingClient.lastName;
      updateData.participantName = computeFullName(firstName, middleName, lastName);
    }
    
    const result = await db.update(clients)
      .set({ ...updateData as any, updatedAt: new Date() })
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

  async getDistinctDiagnoses(search?: string): Promise<string[]> {
    // Get distinct non-null diagnoses from all clients, ordered by frequency
    const result = await db
      .select({ 
        diagnosis: clients.mainDiagnosis,
        count: sql<number>`count(*)`
      })
      .from(clients)
      .where(
        and(
          sql`${clients.mainDiagnosis} IS NOT NULL`,
          sql`${clients.mainDiagnosis} <> ''`,
          search ? ilike(clients.mainDiagnosis, `%${search}%`) : sql`1=1`
        )
      )
      .groupBy(clients.mainDiagnosis)
      .orderBy(sql`count(*) DESC`)
      .limit(50);
    
    return result.map(r => r.diagnosis).filter(Boolean) as string[];
  }

  // Client Status Logs
  async getClientStatusLogs(clientId: string): Promise<ClientStatusLog[]> {
    return await db.select().from(clientStatusLogs)
      .where(eq(clientStatusLogs.clientId, clientId))
      .orderBy(desc(clientStatusLogs.createdAt));
  }

  async createClientStatusLog(log: InsertClientStatusLog): Promise<ClientStatusLog> {
    const result = await db.insert(clientStatusLogs).values(log).returning();
    return result[0];
  }

  async updateClientStatus(clientId: string, newStatus: string, reason: string, userId: string, userName: string): Promise<Client | undefined> {
    // Get current client to record previous status
    const client = await this.getClientById(clientId);
    if (!client) return undefined;

    const previousStatus = client.status || "Active";

    // Create status log entry
    await this.createClientStatusLog({
      clientId,
      previousStatus: previousStatus as "Active" | "Hospital" | "Paused" | "Discharged",
      newStatus: newStatus as "Active" | "Hospital" | "Paused" | "Discharged",
      reason,
      changedBy: userId,
      changedByName: userName,
    });

    // Update client status
    const result = await db.update(clients)
      .set({
        status: newStatus as "Active" | "Hospital" | "Paused" | "Discharged",
        statusChangedAt: new Date(),
        statusChangedBy: userName,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();

    return result[0];
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
  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.date));
  }

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
  
  async getBudget(id: string): Promise<Budget | undefined> {
    const result = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
    return result[0];
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

  // Audit Log
  async getAuditLogs(filters?: {
    entityType?: string;
    entityId?: string;
    operation?: string;
    userId?: string;
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions: any[] = [];
    
    if (filters?.entityType) {
      conditions.push(eq(auditLog.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLog.entityId, filters.entityId));
    }
    if (filters?.operation) {
      conditions.push(eq(auditLog.operation, filters.operation));
    }
    if (filters?.userId) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }
    if (filters?.clientId) {
      conditions.push(eq(auditLog.clientId, filters.clientId));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLog.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLog.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(whereClause);
    
    const logs = await db.select().from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);
    
    return { 
      logs, 
      total: Number(countResult[0]?.count || 0) 
    };
  }

  async getAuditLogById(id: string): Promise<AuditLog | undefined> {
    const result = await db.select().from(auditLog).where(eq(auditLog.id, id)).limit(1);
    return result[0];
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLog).values(log).returning();
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

  async getStaffByEmail(email: string): Promise<Staff | undefined> {
    const result = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
    return result[0];
  }

  async getStaffByUserId(userId: string): Promise<Staff | undefined> {
    const result = await db.select().from(staff).where(eq(staff.userId, userId)).limit(1);
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

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.approvalStatus, "pending"))
      .orderBy(users.createdAt);
  }

  async approveUser(id: string, approvedBy: string, roles: UserRole[]): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        approvalStatus: "approved",
        approvedBy,
        approvedAt: new Date(),
        roles,
        isFirstLogin: "no",
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async rejectUser(id: string, rejectedBy: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        approvalStatus: "rejected",
        approvedBy: rejectedBy,
        approvedAt: new Date(),
        isActive: "no",
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async linkUserToStaff(userId: string, staffId: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        staffId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
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

  // Allied Health Professionals
  async getAllAlliedHealthProfessionals(): Promise<AlliedHealthProfessional[]> {
    return await db.select().from(alliedHealthProfessionals).orderBy(alliedHealthProfessionals.name);
  }

  async getAlliedHealthProfessionalById(id: string): Promise<AlliedHealthProfessional | undefined> {
    const result = await db.select().from(alliedHealthProfessionals).where(eq(alliedHealthProfessionals.id, id)).limit(1);
    return result[0];
  }

  async createAlliedHealthProfessional(ahp: InsertAlliedHealthProfessional): Promise<AlliedHealthProfessional> {
    const result = await db.insert(alliedHealthProfessionals).values(ahp).returning();
    return result[0];
  }

  async updateAlliedHealthProfessional(id: string, ahpUpdate: Partial<InsertAlliedHealthProfessional>): Promise<AlliedHealthProfessional | undefined> {
    const result = await db.update(alliedHealthProfessionals)
      .set({ ...ahpUpdate as any, updatedAt: new Date() })
      .where(eq(alliedHealthProfessionals.id, id))
      .returning();
    return result[0];
  }

  async deleteAlliedHealthProfessional(id: string): Promise<boolean> {
    const result = await db.delete(alliedHealthProfessionals).where(eq(alliedHealthProfessionals.id, id)).returning();
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

  async updateDocument(id: string, updates: { expiryDate?: string | null; uploadDate?: string }): Promise<Document | undefined> {
    const updateData: any = {};
    if (updates.expiryDate !== undefined) {
      updateData.expiryDate = updates.expiryDate;
    }
    if (updates.uploadDate !== undefined) {
      updateData.uploadDate = new Date(updates.uploadDate);
    }
    const result = await db.update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  async archiveDocument(id: string, userId: string): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set({
        isArchived: "yes",
        archivedAt: new Date(),
        archivedBy: userId,
        originalFolderId: sql`COALESCE(folder_id, document_type)`,
      } as any)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  async unarchiveDocument(id: string): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set({
        isArchived: "no",
        archivedAt: null,
        archivedBy: null,
      } as any)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  async updateDocumentFull(id: string, updates: Partial<InsertDocument>): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set(updates as any)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  async searchDocuments(searchTerm: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(
        or(
          ilike(documents.fileName, `%${searchTerm}%`),
          ilike(documents.documentType, `%${searchTerm}%`),
          ilike(documents.customTitle, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(documents.uploadDate));
  }

  // Client Document Folder Overrides
  async getClientDocumentFolders(clientId: string): Promise<ClientDocumentFolder[]> {
    return await db.select().from(clientDocumentFolders)
      .where(eq(clientDocumentFolders.clientId, clientId))
      .orderBy(clientDocumentFolders.sortOrder);
  }

  async getClientDocumentFolder(clientId: string, folderId: string): Promise<ClientDocumentFolder | undefined> {
    const result = await db.select().from(clientDocumentFolders)
      .where(and(
        eq(clientDocumentFolders.clientId, clientId),
        eq(clientDocumentFolders.folderId, folderId)
      ))
      .limit(1);
    return result[0];
  }

  async upsertClientDocumentFolder(folder: InsertClientDocumentFolder): Promise<ClientDocumentFolder> {
    const existing = await this.getClientDocumentFolder(folder.clientId, folder.folderId);
    if (existing) {
      const result = await db.update(clientDocumentFolders)
        .set({ ...folder, updatedAt: new Date() } as any)
        .where(eq(clientDocumentFolders.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(clientDocumentFolders).values(folder).returning();
      return result[0];
    }
  }

  async deleteClientDocumentFolder(id: string): Promise<boolean> {
    const result = await db.delete(clientDocumentFolders).where(eq(clientDocumentFolders.id, id)).returning();
    return result.length > 0;
  }

  // Client Document Compliance
  async getClientDocumentCompliance(clientId: string): Promise<ClientDocumentCompliance[]> {
    return await db.select().from(clientDocumentCompliance)
      .where(eq(clientDocumentCompliance.clientId, clientId));
  }

  async getClientDocumentComplianceByType(clientId: string, documentType: string): Promise<ClientDocumentCompliance | undefined> {
    const result = await db.select().from(clientDocumentCompliance)
      .where(and(
        eq(clientDocumentCompliance.clientId, clientId),
        eq(clientDocumentCompliance.documentType, documentType)
      ))
      .limit(1);
    return result[0];
  }

  async upsertClientDocumentCompliance(compliance: InsertClientDocumentCompliance): Promise<ClientDocumentCompliance> {
    const existing = await this.getClientDocumentComplianceByType(compliance.clientId, compliance.documentType);
    if (existing) {
      const result = await db.update(clientDocumentCompliance)
        .set({ ...compliance, updatedAt: new Date() } as any)
        .where(eq(clientDocumentCompliance.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(clientDocumentCompliance).values(compliance).returning();
      return result[0];
    }
  }

  async deleteClientDocumentCompliance(id: string): Promise<boolean> {
    const result = await db.delete(clientDocumentCompliance).where(eq(clientDocumentCompliance.id, id)).returning();
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
  async getAllServiceDeliveries(): Promise<ServiceDelivery[]> {
    return await db.select().from(serviceDeliveries).orderBy(desc(serviceDeliveries.deliveredAt));
  }

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
    
    // Auto-update budget usage if amount and budgetId are provided and status is completed
    if (result[0] && delivery.budgetId && delivery.amount && delivery.status === "completed") {
      await this.adjustBudgetUsage(delivery.budgetId, parseFloat(delivery.amount));
    }
    
    return result[0];
  }

  async updateServiceDelivery(id: string, deliveryUpdate: Partial<InsertServiceDelivery>): Promise<ServiceDelivery | undefined> {
    // Get the existing delivery to check for budget/amount changes
    const existing = await db.select().from(serviceDeliveries).where(eq(serviceDeliveries.id, id)).limit(1);
    const oldDelivery = existing[0];
    
    const result = await db.update(serviceDeliveries)
      .set({ ...deliveryUpdate as any })
      .where(eq(serviceDeliveries.id, id))
      .returning();
    
    const newDelivery = result[0];
    
    // Handle budget usage adjustments
    if (oldDelivery && newDelivery) {
      const wasCompleted = oldDelivery.status === "completed";
      const isNowCompleted = (deliveryUpdate.status ?? oldDelivery.status) === "completed";
      const oldAmount = oldDelivery.amount ? parseFloat(oldDelivery.amount) : 0;
      const newAmount = deliveryUpdate.amount !== undefined 
        ? (deliveryUpdate.amount ? parseFloat(deliveryUpdate.amount) : 0)
        : oldAmount;
      const oldBudgetId = oldDelivery.budgetId;
      const newBudgetId = deliveryUpdate.budgetId !== undefined ? deliveryUpdate.budgetId : oldBudgetId;
      
      // If previously completed with budget, subtract old amount
      if (wasCompleted && oldBudgetId && oldAmount > 0) {
        await this.adjustBudgetUsage(oldBudgetId, -oldAmount);
      }
      
      // If now completed with budget, add new amount
      if (isNowCompleted && newBudgetId && newAmount > 0) {
        await this.adjustBudgetUsage(newBudgetId, newAmount);
      }
    }
    
    return result[0];
  }

  async deleteServiceDelivery(id: string): Promise<boolean> {
    // Get the delivery first to check budget
    const existing = await db.select().from(serviceDeliveries).where(eq(serviceDeliveries.id, id)).limit(1);
    const delivery = existing[0];
    
    const result = await db.delete(serviceDeliveries).where(eq(serviceDeliveries.id, id)).returning();
    
    // If was completed with budget, subtract amount
    if (result.length > 0 && delivery && delivery.budgetId && delivery.amount && delivery.status === "completed") {
      await this.adjustBudgetUsage(delivery.budgetId, -parseFloat(delivery.amount));
    }
    
    return result.length > 0;
  }
  
  // Helper method to adjust budget usage
  private async adjustBudgetUsage(budgetId: string, amountChange: number): Promise<void> {
    if (amountChange === 0 || isNaN(amountChange)) return;
    
    const budget = await this.getBudget(budgetId);
    if (!budget) return;
    
    const currentUsed = parseFloat(budget.used) || 0;
    const newUsed = Math.max(0, currentUsed + amountChange); // Never go negative
    
    await db.update(budgets)
      .set({ used: newUsed.toFixed(2), updatedAt: new Date() })
      .where(eq(budgets.id, budgetId));
  }

  // Client Goals
  async getGoalsByClient(clientId: string): Promise<ClientGoal[]> {
    return await db.select().from(clientGoals)
      .where(eq(clientGoals.clientId, clientId))
      .orderBy(clientGoals.order);
  }

  async getGoalById(id: string): Promise<ClientGoal | undefined> {
    const result = await db.select().from(clientGoals).where(eq(clientGoals.id, id)).limit(1);
    return result[0];
  }

  async createGoal(goal: InsertClientGoal): Promise<ClientGoal> {
    const result = await db.insert(clientGoals).values(goal).returning();
    return result[0];
  }

  async updateGoal(id: string, goalUpdate: Partial<InsertClientGoal>): Promise<ClientGoal | undefined> {
    const result = await db.update(clientGoals)
      .set({ ...goalUpdate as any, updatedAt: new Date() })
      .where(eq(clientGoals.id, id))
      .returning();
    return result[0];
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await db.delete(clientGoals).where(eq(clientGoals.id, id)).returning();
    return result.length > 0;
  }

  // Budget Management
  async deleteBudget(id: string): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id)).returning();
    return result.length > 0;
  }

  // NDIS Price Guide
  async getAllPriceGuideItems(): Promise<NdisPriceGuideItem[]> {
    return await db.select().from(ndisPriceGuideItems).orderBy(ndisPriceGuideItems.supportItemNumber);
  }

  async getActivePriceGuideItems(): Promise<NdisPriceGuideItem[]> {
    return await db.select().from(ndisPriceGuideItems)
      .where(eq(ndisPriceGuideItems.isActive, "yes"))
      .orderBy(ndisPriceGuideItems.supportItemNumber);
  }

  async getPriceGuideItemById(id: string): Promise<NdisPriceGuideItem | undefined> {
    const result = await db.select().from(ndisPriceGuideItems).where(eq(ndisPriceGuideItems.id, id)).limit(1);
    return result[0];
  }

  async searchPriceGuideItems(searchTerm: string): Promise<NdisPriceGuideItem[]> {
    return await db.select().from(ndisPriceGuideItems)
      .where(
        and(
          eq(ndisPriceGuideItems.isActive, "yes"),
          or(
            ilike(ndisPriceGuideItems.supportItemNumber, `%${searchTerm}%`),
            ilike(ndisPriceGuideItems.supportItemName, `%${searchTerm}%`),
            ilike(ndisPriceGuideItems.supportCategory, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(ndisPriceGuideItems.supportItemNumber)
      .limit(50);
  }

  async createPriceGuideItem(item: InsertNdisPriceGuideItem): Promise<NdisPriceGuideItem> {
    const result = await db.insert(ndisPriceGuideItems).values(item).returning();
    return result[0];
  }

  async updatePriceGuideItem(id: string, item: Partial<InsertNdisPriceGuideItem>): Promise<NdisPriceGuideItem | undefined> {
    const result = await db.update(ndisPriceGuideItems)
      .set({ ...item as any, updatedAt: new Date() })
      .where(eq(ndisPriceGuideItems.id, id))
      .returning();
    return result[0];
  }

  async deletePriceGuideItem(id: string): Promise<boolean> {
    const result = await db.delete(ndisPriceGuideItems).where(eq(ndisPriceGuideItems.id, id)).returning();
    return result.length > 0;
  }

  // Quotes
  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuotesByClient(clientId: string): Promise<Quote[]> {
    return await db.select().from(quotes)
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quotes.createdAt));
  }

  async getQuoteById(id: string): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    return result[0];
  }

  async getQuoteByNumber(quoteNumber: string): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.quoteNumber, quoteNumber)).limit(1);
    return result[0];
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const result = await db.insert(quotes).values(quote).returning();
    return result[0];
  }

  async updateQuote(id: string, quoteUpdate: Partial<InsertQuote>): Promise<Quote | undefined> {
    // Parse date strings to Date objects for timestamp fields
    const processedUpdate: any = { ...quoteUpdate };
    const dateFields = ['sentAt', 'acceptedAt', 'declinedAt', 'convertedToBudgetAt'];
    for (const field of dateFields) {
      if (processedUpdate[field] && typeof processedUpdate[field] === 'string') {
        processedUpdate[field] = new Date(processedUpdate[field]);
      }
    }
    
    const result = await db.update(quotes)
      .set({ ...processedUpdate, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return result[0];
  }

  async deleteQuote(id: string): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id)).returning();
    return result.length > 0;
  }

  async getNextQuoteNumber(): Promise<string> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(quotes);
    const count = result[0]?.count || 0;
    const year = new Date().getFullYear();
    const nextNum = Number(count) + 1;
    return `Q${year}-${String(nextNum).padStart(4, '0')}`;
  }

  // Quote Line Items
  async getLineItemsByQuote(quoteId: string): Promise<QuoteLineItem[]> {
    return await db.select().from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, quoteId))
      .orderBy(quoteLineItems.sortOrder);
  }

  async createLineItem(item: InsertQuoteLineItem): Promise<QuoteLineItem> {
    const result = await db.insert(quoteLineItems).values(item).returning();
    return result[0];
  }

  async updateLineItem(id: string, item: Partial<InsertQuoteLineItem>): Promise<QuoteLineItem | undefined> {
    const result = await db.update(quoteLineItems)
      .set(item as any)
      .where(eq(quoteLineItems.id, id))
      .returning();
    return result[0];
  }

  async deleteLineItem(id: string): Promise<boolean> {
    const result = await db.delete(quoteLineItems).where(eq(quoteLineItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteLineItemsByQuote(quoteId: string): Promise<boolean> {
    const result = await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId)).returning();
    return result.length >= 0;
  }

  // Quote Status History
  async getStatusHistoryByQuote(quoteId: string): Promise<QuoteStatusHistory[]> {
    return await db.select().from(quoteStatusHistory)
      .where(eq(quoteStatusHistory.quoteId, quoteId))
      .orderBy(desc(quoteStatusHistory.createdAt));
  }

  async createStatusHistory(history: InsertQuoteStatusHistory): Promise<QuoteStatusHistory> {
    const result = await db.insert(quoteStatusHistory).values(history).returning();
    return result[0];
  }
  
  // Quote Send History
  async getSendHistoryByQuote(quoteId: string): Promise<QuoteSendHistory[]> {
    return await db.select().from(quoteSendHistory)
      .where(eq(quoteSendHistory.quoteId, quoteId))
      .orderBy(desc(quoteSendHistory.sentAt));
  }

  async createSendHistory(history: InsertQuoteSendHistory): Promise<QuoteSendHistory> {
    const result = await db.insert(quoteSendHistory).values(history).returning();
    return result[0];
  }

  // Client Contacts
  async getContactsByClient(clientId: string): Promise<ClientContact[]> {
    return await db.select().from(clientContacts)
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(desc(clientContacts.isPrimary), clientContacts.name);
  }

  async getContactById(id: string): Promise<ClientContact | undefined> {
    const result = await db.select().from(clientContacts).where(eq(clientContacts.id, id)).limit(1);
    return result[0];
  }

  async createContact(contact: InsertClientContact): Promise<ClientContact> {
    const result = await db.insert(clientContacts).values(contact).returning();
    return result[0];
  }

  async updateContact(id: string, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined> {
    const result = await db.update(clientContacts)
      .set({ ...contact as any, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(clientContacts).where(eq(clientContacts.id, id)).returning();
    return result.length > 0;
  }

  // Client Behaviors
  async getBehaviorsByClient(clientId: string): Promise<ClientBehavior[]> {
    return await db.select().from(clientBehaviors)
      .where(eq(clientBehaviors.clientId, clientId))
      .orderBy(desc(clientBehaviors.createdAt));
  }

  async getBehaviorById(id: string): Promise<ClientBehavior | undefined> {
    const result = await db.select().from(clientBehaviors).where(eq(clientBehaviors.id, id)).limit(1);
    return result[0];
  }

  async createBehavior(behavior: InsertClientBehavior): Promise<ClientBehavior> {
    const result = await db.insert(clientBehaviors).values(behavior).returning();
    return result[0];
  }

  async updateBehavior(id: string, behavior: Partial<InsertClientBehavior>): Promise<ClientBehavior | undefined> {
    const result = await db.update(clientBehaviors)
      .set({ ...behavior as any, updatedAt: new Date() })
      .where(eq(clientBehaviors.id, id))
      .returning();
    return result[0];
  }

  async deleteBehavior(id: string): Promise<boolean> {
    const result = await db.delete(clientBehaviors).where(eq(clientBehaviors.id, id)).returning();
    return result.length > 0;
  }

  // Leadership Meeting Notes
  async getMeetingNotesByClient(clientId: string): Promise<LeadershipMeetingNote[]> {
    return await db.select().from(leadershipMeetingNotes)
      .where(eq(leadershipMeetingNotes.clientId, clientId))
      .orderBy(desc(leadershipMeetingNotes.meetingDate));
  }

  async getMeetingNoteById(id: string): Promise<LeadershipMeetingNote | undefined> {
    const result = await db.select().from(leadershipMeetingNotes).where(eq(leadershipMeetingNotes.id, id)).limit(1);
    return result[0];
  }

  async createMeetingNote(note: InsertLeadershipMeetingNote): Promise<LeadershipMeetingNote> {
    const result = await db.insert(leadershipMeetingNotes).values(note).returning();
    return result[0];
  }

  async updateMeetingNote(id: string, note: Partial<InsertLeadershipMeetingNote>): Promise<LeadershipMeetingNote | undefined> {
    const result = await db.update(leadershipMeetingNotes)
      .set({ ...note as any, updatedAt: new Date() })
      .where(eq(leadershipMeetingNotes.id, id))
      .returning();
    return result[0];
  }

  async deleteMeetingNote(id: string): Promise<boolean> {
    const result = await db.delete(leadershipMeetingNotes).where(eq(leadershipMeetingNotes.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // APPOINTMENTS & SCHEDULING
  // ============================================

  // Appointments
  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.scheduledStart));
  }

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.scheduledStart));
  }

  async getAppointmentsByStaff(staffId: string): Promise<Appointment[]> {
    const assignmentResults = await db.select().from(appointmentAssignments)
      .where(eq(appointmentAssignments.staffId, staffId));
    
    const appointmentIds = assignmentResults.map(a => a.appointmentId);
    if (appointmentIds.length === 0) return [];
    
    return await db.select().from(appointments)
      .where(sql`${appointments.id} IN (${sql.join(appointmentIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(appointments.scheduledStart));
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        gte(appointments.scheduledStart, startDate),
        lte(appointments.scheduledEnd, endDate)
      ))
      .orderBy(appointments.scheduledStart);
  }

  async getUpcomingAppointments(days: number = 7): Promise<Appointment[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await db.select().from(appointments)
      .where(and(
        gte(appointments.scheduledStart, now),
        lte(appointments.scheduledStart, futureDate),
        sql`${appointments.status} NOT IN ('cancelled', 'completed')`
      ))
      .orderBy(appointments.scheduledStart);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const result = await db.insert(appointments).values(appointment).returning();
    return result[0];
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const result = await db.update(appointments)
      .set({ ...appointment as any, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return result.length > 0;
  }

  // Appointment Assignments
  async getAssignmentsByAppointment(appointmentId: string): Promise<AppointmentAssignment[]> {
    return await db.select().from(appointmentAssignments)
      .where(eq(appointmentAssignments.appointmentId, appointmentId))
      .orderBy(appointmentAssignments.role);
  }

  async getAppointmentAssignmentsByStaff(staffId: string): Promise<AppointmentAssignment[]> {
    return await db.select().from(appointmentAssignments)
      .where(eq(appointmentAssignments.staffId, staffId))
      .orderBy(desc(appointmentAssignments.assignedAt));
  }

  async createAppointmentAssignment(assignment: InsertAppointmentAssignment): Promise<AppointmentAssignment> {
    const result = await db.insert(appointmentAssignments).values(assignment).returning();
    return result[0];
  }

  async updateAppointmentAssignment(id: string, assignment: Partial<InsertAppointmentAssignment>): Promise<AppointmentAssignment | undefined> {
    const result = await db.update(appointmentAssignments)
      .set({ ...assignment as any, updatedAt: new Date() })
      .where(eq(appointmentAssignments.id, id))
      .returning();
    return result[0];
  }

  async deleteAppointmentAssignment(id: string): Promise<boolean> {
    const result = await db.delete(appointmentAssignments).where(eq(appointmentAssignments.id, id)).returning();
    return result.length > 0;
  }

  // Appointment Check-ins
  async getCheckinsByAppointment(appointmentId: string): Promise<AppointmentCheckin[]> {
    return await db.select().from(appointmentCheckins)
      .where(eq(appointmentCheckins.appointmentId, appointmentId))
      .orderBy(appointmentCheckins.timestamp);
  }

  async createAppointmentCheckin(checkin: InsertAppointmentCheckin): Promise<AppointmentCheckin> {
    const result = await db.insert(appointmentCheckins).values(checkin).returning();
    return result[0];
  }

  // ============================================
  // STAFF ALLOCATION & PREFERENCES
  // ============================================

  // Client Staff Preferences
  async getPreferencesByClient(clientId: string): Promise<ClientStaffPreference[]> {
    return await db.select().from(clientStaffPreferences)
      .where(and(
        eq(clientStaffPreferences.clientId, clientId),
        eq(clientStaffPreferences.isActive, "yes")
      ))
      .orderBy(clientStaffPreferences.preferenceLevel);
  }

  async getPreferencesByStaff(staffId: string): Promise<ClientStaffPreference[]> {
    return await db.select().from(clientStaffPreferences)
      .where(and(
        eq(clientStaffPreferences.staffId, staffId),
        eq(clientStaffPreferences.isActive, "yes")
      ));
  }

  async createStaffPreference(preference: InsertClientStaffPreference): Promise<ClientStaffPreference> {
    const result = await db.insert(clientStaffPreferences).values(preference).returning();
    return result[0];
  }

  async updateStaffPreference(id: string, preference: Partial<InsertClientStaffPreference>): Promise<ClientStaffPreference | undefined> {
    const result = await db.update(clientStaffPreferences)
      .set({ ...preference as any, updatedAt: new Date() })
      .where(eq(clientStaffPreferences.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffPreference(id: string): Promise<boolean> {
    const result = await db.delete(clientStaffPreferences).where(eq(clientStaffPreferences.id, id)).returning();
    return result.length > 0;
  }

  // Client Staff Restrictions (Blacklist)
  async getRestrictionsByClient(clientId: string): Promise<ClientStaffRestriction[]> {
    return await db.select().from(clientStaffRestrictions)
      .where(and(
        eq(clientStaffRestrictions.clientId, clientId),
        eq(clientStaffRestrictions.isActive, "yes")
      ))
      .orderBy(desc(clientStaffRestrictions.createdAt));
  }

  async getRestrictionsByStaff(staffId: string): Promise<ClientStaffRestriction[]> {
    return await db.select().from(clientStaffRestrictions)
      .where(and(
        eq(clientStaffRestrictions.staffId, staffId),
        eq(clientStaffRestrictions.isActive, "yes")
      ));
  }

  async createStaffRestriction(restriction: InsertClientStaffRestriction): Promise<ClientStaffRestriction> {
    const result = await db.insert(clientStaffRestrictions).values(restriction).returning();
    return result[0];
  }

  async updateStaffRestriction(id: string, restriction: Partial<InsertClientStaffRestriction>): Promise<ClientStaffRestriction | undefined> {
    const result = await db.update(clientStaffRestrictions)
      .set({ ...restriction as any, updatedAt: new Date() })
      .where(eq(clientStaffRestrictions.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffRestriction(id: string): Promise<boolean> {
    const result = await db.delete(clientStaffRestrictions).where(eq(clientStaffRestrictions.id, id)).returning();
    return result.length > 0;
  }

  async isStaffRestricted(clientId: string, staffId: string): Promise<boolean> {
    const now = new Date();
    const result = await db.select().from(clientStaffRestrictions)
      .where(and(
        eq(clientStaffRestrictions.clientId, clientId),
        eq(clientStaffRestrictions.staffId, staffId),
        eq(clientStaffRestrictions.isActive, "yes"),
        lte(clientStaffRestrictions.effectiveFrom, now),
        or(
          sql`${clientStaffRestrictions.effectiveTo} IS NULL`,
          gte(clientStaffRestrictions.effectiveTo, now)
        )
      ))
      .limit(1);
    return result.length > 0;
  }

  // Staff Availability Windows
  async getAvailabilityByStaff(staffId: string): Promise<StaffAvailabilityWindow[]> {
    return await db.select().from(staffAvailabilityWindows)
      .where(and(
        eq(staffAvailabilityWindows.staffId, staffId),
        eq(staffAvailabilityWindows.isActive, "yes")
      ))
      .orderBy(staffAvailabilityWindows.dayOfWeek, staffAvailabilityWindows.startTime);
  }

  async createAvailabilityWindow(window: InsertStaffAvailabilityWindow): Promise<StaffAvailabilityWindow> {
    const result = await db.insert(staffAvailabilityWindows).values(window).returning();
    return result[0];
  }

  async updateAvailabilityWindow(id: string, window: Partial<InsertStaffAvailabilityWindow>): Promise<StaffAvailabilityWindow | undefined> {
    const result = await db.update(staffAvailabilityWindows)
      .set({ ...window as any, updatedAt: new Date() })
      .where(eq(staffAvailabilityWindows.id, id))
      .returning();
    return result[0];
  }

  async deleteAvailabilityWindow(id: string): Promise<boolean> {
    const result = await db.delete(staffAvailabilityWindows).where(eq(staffAvailabilityWindows.id, id)).returning();
    return result.length > 0;
  }

  // Staff Unavailability Periods
  async getUnavailabilityByStaff(staffId: string): Promise<StaffUnavailabilityPeriod[]> {
    return await db.select().from(staffUnavailabilityPeriods)
      .where(eq(staffUnavailabilityPeriods.staffId, staffId))
      .orderBy(desc(staffUnavailabilityPeriods.startDate));
  }

  async getUnavailabilityByDateRange(startDate: Date, endDate: Date): Promise<StaffUnavailabilityPeriod[]> {
    return await db.select().from(staffUnavailabilityPeriods)
      .where(and(
        lte(staffUnavailabilityPeriods.startDate, endDate),
        gte(staffUnavailabilityPeriods.endDate, startDate)
      ))
      .orderBy(staffUnavailabilityPeriods.startDate);
  }

  async createUnavailabilityPeriod(period: InsertStaffUnavailabilityPeriod): Promise<StaffUnavailabilityPeriod> {
    const result = await db.insert(staffUnavailabilityPeriods).values(period).returning();
    return result[0];
  }

  async updateUnavailabilityPeriod(id: string, period: Partial<InsertStaffUnavailabilityPeriod>): Promise<StaffUnavailabilityPeriod | undefined> {
    const result = await db.update(staffUnavailabilityPeriods)
      .set({ ...period as any, updatedAt: new Date() })
      .where(eq(staffUnavailabilityPeriods.id, id))
      .returning();
    return result[0];
  }

  async deleteUnavailabilityPeriod(id: string): Promise<boolean> {
    const result = await db.delete(staffUnavailabilityPeriods).where(eq(staffUnavailabilityPeriods.id, id)).returning();
    return result.length > 0;
  }

  // Staff Status Logs
  async getCurrentStaffStatus(staffId: string): Promise<StaffStatusLog | undefined> {
    const result = await db.select().from(staffStatusLogs)
      .where(eq(staffStatusLogs.staffId, staffId))
      .orderBy(desc(staffStatusLogs.timestamp))
      .limit(1);
    return result[0];
  }

  async getStaffStatusHistory(staffId: string, limit: number = 50): Promise<StaffStatusLog[]> {
    return await db.select().from(staffStatusLogs)
      .where(eq(staffStatusLogs.staffId, staffId))
      .orderBy(desc(staffStatusLogs.timestamp))
      .limit(limit);
  }

  async getAllCurrentStaffStatuses(): Promise<StaffStatusLog[]> {
    // Get the most recent status for each staff member
    const subquery = db
      .select({
        staffId: staffStatusLogs.staffId,
        maxTimestamp: sql<Date>`MAX(${staffStatusLogs.timestamp})`.as('max_timestamp')
      })
      .from(staffStatusLogs)
      .groupBy(staffStatusLogs.staffId)
      .as('latest');

    return await db.select().from(staffStatusLogs)
      .innerJoin(subquery, and(
        eq(staffStatusLogs.staffId, subquery.staffId),
        eq(staffStatusLogs.timestamp, subquery.maxTimestamp)
      ));
  }

  async createStaffStatusLog(log: InsertStaffStatusLog): Promise<StaffStatusLog> {
    const result = await db.insert(staffStatusLogs).values(log).returning();
    return result[0];
  }

  // ============================================
  // CARE PLANS
  // ============================================

  // Care Plans
  async getCarePlansByClient(clientId: string): Promise<CarePlan[]> {
    return await db.select().from(carePlans)
      .where(eq(carePlans.clientId, clientId))
      .orderBy(desc(carePlans.createdAt));
  }

  async getActiveCarePlanByClient(clientId: string): Promise<CarePlan | undefined> {
    const result = await db.select().from(carePlans)
      .where(and(
        eq(carePlans.clientId, clientId),
        eq(carePlans.status, "active")
      ))
      .orderBy(desc(carePlans.createdAt))
      .limit(1);
    return result[0];
  }

  async getCarePlanById(id: string): Promise<CarePlan | undefined> {
    const result = await db.select().from(carePlans).where(eq(carePlans.id, id)).limit(1);
    return result[0];
  }

  async createCarePlan(carePlan: InsertCarePlan): Promise<CarePlan> {
    const result = await db.insert(carePlans).values(carePlan).returning();
    return result[0];
  }

  async updateCarePlan(id: string, carePlan: Partial<InsertCarePlan>): Promise<CarePlan | undefined> {
    const result = await db.update(carePlans)
      .set({ ...carePlan as any, updatedAt: new Date() })
      .where(eq(carePlans.id, id))
      .returning();
    return result[0];
  }

  async archiveCarePlan(id: string, userId: string, userName: string, reason?: string): Promise<CarePlan | undefined> {
    const result = await db.update(carePlans)
      .set({
        status: "archived",
        archivedAt: new Date(),
        archivedById: userId,
        archivedByName: userName,
        archiveReason: reason,
        updatedAt: new Date()
      })
      .where(eq(carePlans.id, id))
      .returning();
    return result[0];
  }

  // Care Plan Health Matters
  async getHealthMattersByCarePlan(carePlanId: string): Promise<CarePlanHealthMatter[]> {
    return await db.select().from(carePlanHealthMatters)
      .where(eq(carePlanHealthMatters.carePlanId, carePlanId))
      .orderBy(carePlanHealthMatters.type, carePlanHealthMatters.order);
  }

  async createHealthMatter(matter: InsertCarePlanHealthMatter): Promise<CarePlanHealthMatter> {
    const result = await db.insert(carePlanHealthMatters).values(matter).returning();
    return result[0];
  }

  async updateHealthMatter(id: string, matter: Partial<InsertCarePlanHealthMatter>): Promise<CarePlanHealthMatter | undefined> {
    const result = await db.update(carePlanHealthMatters)
      .set({ ...matter as any, updatedAt: new Date() })
      .where(eq(carePlanHealthMatters.id, id))
      .returning();
    return result[0];
  }

  async deleteHealthMatter(id: string): Promise<boolean> {
    const result = await db.delete(carePlanHealthMatters).where(eq(carePlanHealthMatters.id, id)).returning();
    return result.length > 0;
  }

  // Care Plan Diagnoses
  async getDiagnosesByCarePlan(carePlanId: string): Promise<CarePlanDiagnosis[]> {
    return await db.select().from(carePlanDiagnoses)
      .where(eq(carePlanDiagnoses.carePlanId, carePlanId))
      .orderBy(desc(carePlanDiagnoses.isPrimary), carePlanDiagnoses.order);
  }

  async createCarePlanDiagnosis(diagnosis: InsertCarePlanDiagnosis): Promise<CarePlanDiagnosis> {
    const result = await db.insert(carePlanDiagnoses).values(diagnosis).returning();
    return result[0];
  }

  async updateCarePlanDiagnosis(id: string, diagnosis: Partial<InsertCarePlanDiagnosis>): Promise<CarePlanDiagnosis | undefined> {
    const result = await db.update(carePlanDiagnoses)
      .set({ ...diagnosis as any, updatedAt: new Date() })
      .where(eq(carePlanDiagnoses.id, id))
      .returning();
    return result[0];
  }

  async deleteCarePlanDiagnosis(id: string): Promise<boolean> {
    const result = await db.delete(carePlanDiagnoses).where(eq(carePlanDiagnoses.id, id)).returning();
    return result.length > 0;
  }

  // Care Plan Emergency Contacts
  async getEmergencyContactsByCarePlan(carePlanId: string): Promise<CarePlanEmergencyContact[]> {
    return await db.select().from(carePlanEmergencyContacts)
      .where(eq(carePlanEmergencyContacts.carePlanId, carePlanId))
      .orderBy(carePlanEmergencyContacts.priority);
  }

  async createCarePlanEmergencyContact(contact: InsertCarePlanEmergencyContact): Promise<CarePlanEmergencyContact> {
    const result = await db.insert(carePlanEmergencyContacts).values(contact).returning();
    return result[0];
  }

  async updateCarePlanEmergencyContact(id: string, contact: Partial<InsertCarePlanEmergencyContact>): Promise<CarePlanEmergencyContact | undefined> {
    const result = await db.update(carePlanEmergencyContacts)
      .set({ ...contact as any, updatedAt: new Date() })
      .where(eq(carePlanEmergencyContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteCarePlanEmergencyContact(id: string): Promise<boolean> {
    const result = await db.delete(carePlanEmergencyContacts).where(eq(carePlanEmergencyContacts.id, id)).returning();
    return result.length > 0;
  }

  // Care Plan Emergency Procedures
  async getEmergencyProceduresByCarePlan(carePlanId: string): Promise<CarePlanEmergencyProcedure[]> {
    return await db.select().from(carePlanEmergencyProcedures)
      .where(eq(carePlanEmergencyProcedures.carePlanId, carePlanId))
      .orderBy(carePlanEmergencyProcedures.order);
  }

  async createCarePlanEmergencyProcedure(procedure: InsertCarePlanEmergencyProcedure): Promise<CarePlanEmergencyProcedure> {
    const result = await db.insert(carePlanEmergencyProcedures).values(procedure).returning();
    return result[0];
  }

  async updateCarePlanEmergencyProcedure(id: string, procedure: Partial<InsertCarePlanEmergencyProcedure>): Promise<CarePlanEmergencyProcedure | undefined> {
    const result = await db.update(carePlanEmergencyProcedures)
      .set({ ...procedure as any, updatedAt: new Date() })
      .where(eq(carePlanEmergencyProcedures.id, id))
      .returning();
    return result[0];
  }

  async deleteCarePlanEmergencyProcedure(id: string): Promise<boolean> {
    const result = await db.delete(carePlanEmergencyProcedures).where(eq(carePlanEmergencyProcedures.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // FORMS SYSTEM
  // ============================================

  // Form Templates
  async getAllFormTemplates(): Promise<FormTemplate[]> {
    return await db.select().from(formTemplates).orderBy(formTemplates.name);
  }

  async getActiveFormTemplates(): Promise<FormTemplate[]> {
    return await db.select().from(formTemplates)
      .where(eq(formTemplates.status, "active"))
      .orderBy(formTemplates.name);
  }

  async getFormTemplateById(id: string): Promise<FormTemplate | undefined> {
    const result = await db.select().from(formTemplates).where(eq(formTemplates.id, id)).limit(1);
    return result[0];
  }

  async getFormTemplatesByCategory(category: string): Promise<FormTemplate[]> {
    return await db.select().from(formTemplates)
      .where(and(
        eq(formTemplates.category, category as any),
        eq(formTemplates.status, "active")
      ))
      .orderBy(formTemplates.name);
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const result = await db.insert(formTemplates).values(template).returning();
    return result[0];
  }

  async updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const result = await db.update(formTemplates)
      .set({ ...template as any, updatedAt: new Date() })
      .where(eq(formTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteFormTemplate(id: string): Promise<boolean> {
    const result = await db.delete(formTemplates).where(eq(formTemplates.id, id)).returning();
    return result.length > 0;
  }

  // Form Template Fields
  async getFieldsByTemplate(templateId: string): Promise<FormTemplateField[]> {
    return await db.select().from(formTemplateFields)
      .where(eq(formTemplateFields.templateId, templateId))
      .orderBy(formTemplateFields.section, formTemplateFields.order);
  }

  async createTemplateField(field: InsertFormTemplateField): Promise<FormTemplateField> {
    const result = await db.insert(formTemplateFields).values(field).returning();
    return result[0];
  }

  async updateTemplateField(id: string, field: Partial<InsertFormTemplateField>): Promise<FormTemplateField | undefined> {
    const result = await db.update(formTemplateFields)
      .set({ ...field as any, updatedAt: new Date() })
      .where(eq(formTemplateFields.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateField(id: string): Promise<boolean> {
    const result = await db.delete(formTemplateFields).where(eq(formTemplateFields.id, id)).returning();
    return result.length > 0;
  }

  async deleteFieldsByTemplate(templateId: string): Promise<boolean> {
    const result = await db.delete(formTemplateFields).where(eq(formTemplateFields.templateId, templateId)).returning();
    return result.length >= 0;
  }

  // Form Submissions
  async getSubmissionsByClient(clientId: string): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions)
      .where(eq(formSubmissions.clientId, clientId))
      .orderBy(desc(formSubmissions.createdAt));
  }

  async getSubmissionsByTemplate(templateId: string): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions)
      .where(eq(formSubmissions.templateId, templateId))
      .orderBy(desc(formSubmissions.createdAt));
  }

  async getSubmissionById(id: string): Promise<FormSubmission | undefined> {
    const result = await db.select().from(formSubmissions).where(eq(formSubmissions.id, id)).limit(1);
    return result[0];
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const result = await db.insert(formSubmissions).values(submission).returning();
    return result[0];
  }

  async updateFormSubmission(id: string, submission: Partial<InsertFormSubmission>): Promise<FormSubmission | undefined> {
    const result = await db.update(formSubmissions)
      .set({ ...submission as any, updatedAt: new Date() })
      .where(eq(formSubmissions.id, id))
      .returning();
    return result[0];
  }

  // Form Submission Values
  async getValuesBySubmission(submissionId: string): Promise<FormSubmissionValue[]> {
    return await db.select().from(formSubmissionValues)
      .where(eq(formSubmissionValues.submissionId, submissionId));
  }

  async createSubmissionValue(value: InsertFormSubmissionValue): Promise<FormSubmissionValue> {
    const result = await db.insert(formSubmissionValues).values(value).returning();
    return result[0];
  }

  async updateSubmissionValue(id: string, value: Partial<InsertFormSubmissionValue>): Promise<FormSubmissionValue | undefined> {
    const result = await db.update(formSubmissionValues)
      .set({ ...value as any, updatedAt: new Date() })
      .where(eq(formSubmissionValues.id, id))
      .returning();
    return result[0];
  }

  async deleteValuesBySubmission(submissionId: string): Promise<boolean> {
    const result = await db.delete(formSubmissionValues).where(eq(formSubmissionValues.submissionId, submissionId)).returning();
    return result.length >= 0;
  }

  // Form Signatures
  async getSignaturesBySubmission(submissionId: string): Promise<FormSignature[]> {
    return await db.select().from(formSignatures)
      .where(eq(formSignatures.submissionId, submissionId))
      .orderBy(formSignatures.signedAt);
  }

  async createFormSignature(signature: InsertFormSignature): Promise<FormSignature> {
    const result = await db.insert(formSignatures).values(signature).returning();
    return result[0];
  }

  // Appointment Type Required Forms
  async getRequiredFormsByAppointmentType(appointmentType: string): Promise<AppointmentTypeRequiredForm[]> {
    return await db.select().from(appointmentTypeRequiredForms)
      .where(eq(appointmentTypeRequiredForms.appointmentType, appointmentType as any));
  }

  async createAppointmentTypeRequiredForm(form: InsertAppointmentTypeRequiredForm): Promise<AppointmentTypeRequiredForm> {
    const result = await db.insert(appointmentTypeRequiredForms).values(form).returning();
    return result[0];
  }

  async deleteAppointmentTypeRequiredForm(id: string): Promise<boolean> {
    const result = await db.delete(appointmentTypeRequiredForms).where(eq(appointmentTypeRequiredForms.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // NON-FACE-TO-FACE SERVICE LOGS
  // ============================================

  async getNonFaceToFaceLogsByClient(clientId: string): Promise<NonFaceToFaceServiceLog[]> {
    return await db.select().from(nonFaceToFaceServiceLogs)
      .where(eq(nonFaceToFaceServiceLogs.clientId, clientId))
      .orderBy(desc(nonFaceToFaceServiceLogs.contactDateTime));
  }

  async getNonFaceToFaceLogById(id: string): Promise<NonFaceToFaceServiceLog | undefined> {
    const result = await db.select().from(nonFaceToFaceServiceLogs)
      .where(eq(nonFaceToFaceServiceLogs.id, id)).limit(1);
    return result[0];
  }

  async createNonFaceToFaceLog(log: InsertNonFaceToFaceServiceLog): Promise<NonFaceToFaceServiceLog> {
    const result = await db.insert(nonFaceToFaceServiceLogs).values(log).returning();
    return result[0];
  }

  async updateNonFaceToFaceLog(id: string, log: Partial<InsertNonFaceToFaceServiceLog>): Promise<NonFaceToFaceServiceLog | undefined> {
    const result = await db.update(nonFaceToFaceServiceLogs)
      .set({ ...log as any, updatedAt: new Date() })
      .where(eq(nonFaceToFaceServiceLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteNonFaceToFaceLog(id: string): Promise<boolean> {
    const result = await db.delete(nonFaceToFaceServiceLogs)
      .where(eq(nonFaceToFaceServiceLogs.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // DIAGNOSES
  // ============================================

  async getAllDiagnoses(): Promise<Diagnosis[]> {
    return await db.select().from(diagnoses)
      .where(eq(diagnoses.isActive, "yes"))
      .orderBy(diagnoses.name);
  }

  async getDiagnosisById(id: string): Promise<Diagnosis | undefined> {
    const result = await db.select().from(diagnoses)
      .where(eq(diagnoses.id, id)).limit(1);
    return result[0];
  }

  async searchDiagnoses(searchTerm: string): Promise<Diagnosis[]> {
    return await db.select().from(diagnoses)
      .where(and(
        eq(diagnoses.isActive, "yes"),
        or(
          ilike(diagnoses.name, `%${searchTerm}%`),
          ilike(diagnoses.icdCode, `%${searchTerm}%`),
          ilike(diagnoses.category, `%${searchTerm}%`)
        )
      ))
      .orderBy(diagnoses.name);
  }

  async createDiagnosis(diagnosis: InsertDiagnosis): Promise<Diagnosis> {
    const result = await db.insert(diagnoses).values(diagnosis).returning();
    return result[0];
  }

  async updateDiagnosis(id: string, diagnosis: Partial<InsertDiagnosis>): Promise<Diagnosis | undefined> {
    const result = await db.update(diagnoses)
      .set({ ...diagnosis as any, updatedAt: new Date() })
      .where(eq(diagnoses.id, id))
      .returning();
    return result[0];
  }

  async deleteDiagnosis(id: string): Promise<boolean> {
    const result = await db.update(diagnoses)
      .set({ isActive: "no" })
      .where(eq(diagnoses.id, id))
      .returning();
    return result.length > 0;
  }

  // Client Diagnoses
  async getDiagnosesByClient(clientId: string): Promise<ClientDiagnosis[]> {
    return await db.select().from(clientDiagnoses)
      .where(eq(clientDiagnoses.clientId, clientId))
      .orderBy(desc(clientDiagnoses.isPrimary), clientDiagnoses.createdAt);
  }

  async addDiagnosisToClient(clientDiagnosis: InsertClientDiagnosis): Promise<ClientDiagnosis> {
    const result = await db.insert(clientDiagnoses).values(clientDiagnosis).returning();
    return result[0];
  }

  async updateClientDiagnosis(id: string, diagnosis: Partial<InsertClientDiagnosis>): Promise<ClientDiagnosis | undefined> {
    const result = await db.update(clientDiagnoses)
      .set(diagnosis as any)
      .where(eq(clientDiagnoses.id, id))
      .returning();
    return result[0];
  }

  async removeDiagnosisFromClient(id: string): Promise<boolean> {
    const result = await db.delete(clientDiagnoses)
      .where(eq(clientDiagnoses.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
