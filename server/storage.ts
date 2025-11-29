import { db } from "./db";
import { encryptMessage, decryptMessage, isEncryptionEnabled, isEncryptedFormat } from "./services/encryption";
import { 
  clients, progressNotes, invoices, budgets, settings, activityLog, auditLog, incidentReports, privacyConsents,
  staff, supportCoordinators, planManagers, ndisServices, users, generalPractitioners, pharmacies,
  alliedHealthProfessionals,
  documents, clientStaffAssignments, serviceDeliveries, clientGoals, goalUpdates, goalActionPlans,
  clientDocumentFolders, clientDocumentCompliance,
  ndisPriceGuideItems, pricingServices, quotes, quoteLineItems, quoteStatusHistory, quoteSendHistory, quoteVsActual,
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
  silHouses, silHouseAuditLog,
  serviceSubtypes,
  // Notifications, tickets, and announcements
  notifications, notificationPreferences, supportTickets, ticketComments, announcements,
  // Tasks
  tasks, taskComments, taskChecklists,
  // Chat
  chatRooms, chatRoomParticipants, chatMessages, chatMessageAttachments, chatAuditLogs,
  chatMessageReactions, chatMessageReads, chatMessageDeliveries, scheduledMessages,
  // Scheduling Conflicts
  schedulingConflicts,
  // Workforce Management
  staffQualifications, staffBlacklist, timeClockRecords, timesheets, timesheetEntries, gpsComplianceLogs, clientStaffRestrictions,
  staffEmergencyContacts,
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
  type InsertGoalUpdate, type GoalUpdate,
  type InsertGoalActionPlan, type GoalActionPlan,
  type InsertNdisPriceGuideItem, type NdisPriceGuideItem,
  type InsertPricingService, type PricingService,
  type InsertQuote, type Quote, type InsertQuoteLineItem, type QuoteLineItem,
  type InsertQuoteStatusHistory, type QuoteStatusHistory,
  type InsertQuoteSendHistory, type QuoteSendHistory,
  type InsertQuoteVsActual, type QuoteVsActual,
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
  type InsertClientStatusLog, type ClientStatusLog,
  type InsertSilHouse, type SilHouse,
  type InsertSilHouseAuditLog, type SilHouseAuditLog,
  type InsertServiceSubtype, type ServiceSubtype,
  // Notifications, tickets, and announcements types
  type InsertNotification, type Notification, type NotificationPreferences, type InsertNotificationPreferences,
  type InsertSupportTicket, type SupportTicket,
  type InsertTicketComment, type TicketComment,
  type InsertAnnouncement, type Announcement,
  // Task types
  type InsertTask, type Task,
  type InsertTaskComment, type TaskComment,
  type InsertTaskChecklist, type TaskChecklist,
  // Chat types
  type InsertChatRoom, type ChatRoom,
  type InsertChatRoomParticipant, type ChatRoomParticipant,
  type InsertChatMessage, type ChatMessage,
  type InsertChatMessageAttachment, type ChatMessageAttachment,
  type InsertChatAuditLog, type ChatAuditLog,
  type InsertChatMessageReaction, type ChatMessageReaction,
  type InsertChatMessageRead, type ChatMessageRead,
  type InsertChatMessageDelivery, type ChatMessageDelivery,
  type InsertScheduledMessage, type ScheduledMessage,
  // Scheduling Conflicts types
  type InsertSchedulingConflict, type SchedulingConflict,
  type SchedulingConflictType, type ConflictSeverity, type ConflictStatus,
  // Workforce Management types
  type InsertStaffQualification, type StaffQualification,
  type InsertStaffBlacklist, type StaffBlacklist,
  type InsertTimeClockRecord, type TimeClockRecord,
  type InsertTimesheet, type Timesheet,
  type InsertTimesheetEntry, type TimesheetEntry,
  type InsertGpsComplianceLog, type GpsComplianceLog,
  // Staff Emergency Contacts
  type InsertStaffEmergencyContact, type StaffEmergencyContact
} from "@shared/schema";
import { eq, desc, or, ilike, and, gte, lte, sql, inArray } from "drizzle-orm";

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
  getAssignmentById(id: string): Promise<ClientStaffAssignment | undefined>;
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
  duplicateGoal(id: string): Promise<ClientGoal | undefined>;
  archiveGoal(id: string, archivedBy?: string): Promise<ClientGoal | undefined>;
  unarchiveGoal(id: string): Promise<ClientGoal | undefined>;
  
  // Goal Updates (Audit Trail)
  getGoalUpdates(goalId: string): Promise<GoalUpdate[]>;
  createGoalUpdate(update: InsertGoalUpdate): Promise<GoalUpdate>;
  
  // Goal Action Plans
  getActionPlansByGoal(goalId: string): Promise<GoalActionPlan[]>;
  getActionPlanById(id: string): Promise<GoalActionPlan | undefined>;
  createActionPlan(plan: InsertGoalActionPlan): Promise<GoalActionPlan>;
  updateActionPlan(id: string, plan: Partial<InsertGoalActionPlan>): Promise<GoalActionPlan | undefined>;
  deleteActionPlan(id: string): Promise<boolean>;
  
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
  getAppointmentAssignmentById(id: string): Promise<AppointmentAssignment | undefined>;
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

  // ============================================
  // SIL HOUSES
  // ============================================
  
  getAllSilHouses(): Promise<SilHouse[]>;
  getActiveSilHouses(): Promise<SilHouse[]>;
  getSilHouseById(id: string): Promise<SilHouse | undefined>;
  searchSilHouses(searchTerm: string, status?: string, propertyType?: string): Promise<SilHouse[]>;
  createSilHouse(house: InsertSilHouse): Promise<SilHouse>;
  updateSilHouse(id: string, house: Partial<InsertSilHouse>): Promise<SilHouse | undefined>;
  deleteSilHouse(id: string): Promise<boolean>;
  getSilHouseStats(): Promise<{
    totalHouses: number;
    activeHouses: number;
    totalResidents: number;
    totalCapacity: number;
    occupancyRate: number;
    availableBeds: number;
    propertyTypes: number;
    complianceRate: number;
  }>;
  
  // SIL House Audit Log
  getSilHouseAuditLogs(houseId?: string): Promise<SilHouseAuditLog[]>;
  createSilHouseAuditLog(log: InsertSilHouseAuditLog): Promise<SilHouseAuditLog>;

  // ============================================
  // SERVICE SUBTYPES
  // ============================================
  
  getAllServiceSubtypes(): Promise<ServiceSubtype[]>;
  getServiceSubtypesByType(serviceType: "Support Work" | "Nursing"): Promise<ServiceSubtype[]>;
  createServiceSubtype(subtype: InsertServiceSubtype): Promise<ServiceSubtype>;
  updateServiceSubtype(id: string, updates: Partial<InsertServiceSubtype>): Promise<ServiceSubtype | undefined>;
  deleteServiceSubtype(id: string): Promise<boolean>;
  
  // Notifications
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  deleteNotification(id: string): Promise<boolean>;
  
  // Support Tickets
  getAllTickets(): Promise<SupportTicket[]>;
  getTicketsByUser(userId: string): Promise<SupportTicket[]>;
  getTicketById(id: string): Promise<SupportTicket | undefined>;
  createTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  assignTicket(id: string, assignedToId: string, assignedToName: string): Promise<SupportTicket | undefined>;
  resolveTicket(id: string, resolvedById: string, resolvedByName: string, resolutionNotes?: string): Promise<SupportTicket | undefined>;
  closeTicket(id: string): Promise<SupportTicket | undefined>;
  
  // Ticket Comments
  getTicketComments(ticketId: string): Promise<TicketComment[]>;
  createTicketComment(comment: InsertTicketComment): Promise<TicketComment>;
  
  // Announcements
  getAllAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncements(userRoles?: string[]): Promise<Announcement[]>;
  getAnnouncementById(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;
  
  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getTasksAssignedToUser(userId: string): Promise<Task[]>;
  getTasksByClient(clientId: string): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  assignTask(id: string, assignedToId: string, assignedToName: string): Promise<Task | undefined>;
  completeTask(id: string, completedById: string, completedByName: string, notes?: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  
  // Task Comments
  getTaskComments(taskId: string): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  
  // Task Checklists
  getTaskChecklists(taskId: string): Promise<TaskChecklist[]>;
  createTaskChecklist(item: InsertTaskChecklist): Promise<TaskChecklist>;
  updateTaskChecklist(id: string, updates: Partial<InsertTaskChecklist>): Promise<TaskChecklist | undefined>;
  deleteTaskChecklist(id: string): Promise<boolean>;
  
  // Chat Rooms
  getChatRooms(userId: string): Promise<ChatRoom[]>;
  getChatRoomById(id: string): Promise<ChatRoom | undefined>;
  getDirectChatRoom(userId1: string, userId2: string): Promise<ChatRoom | undefined>;
  getClientChatRoom(clientId: string): Promise<ChatRoom | undefined>;
  getChatRoomsByType(userId: string, type: string): Promise<ChatRoom[]>;
  getAllChatRooms(): Promise<ChatRoom[]>; // Admin only
  getAllChatRoomsWithFilters(filters?: {
    type?: string;
    status?: string;
    isArchived?: string;
    isLocked?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rooms: ChatRoom[]; total: number }>; // Admin dashboard
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  updateChatRoom(id: string, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined>;
  archiveChatRoom(id: string, archivedById: string, archivedByName: string): Promise<ChatRoom | undefined>;
  unarchiveChatRoom(id: string): Promise<ChatRoom | undefined>;
  lockChatRoom(id: string, lockedById: string, lockedByName: string): Promise<ChatRoom | undefined>;
  unlockChatRoom(id: string): Promise<ChatRoom | undefined>;
  softDeleteChatRoom(id: string, deletedById: string, deletedByName: string): Promise<ChatRoom | undefined>;
  deleteChatRoom(id: string): Promise<boolean>;
  
  // Client Chat Auto-Creation
  createClientChatRoom(clientId: string, clientName: string, createdById: string, createdByName: string): Promise<ChatRoom>;
  syncClientChatParticipants(clientId: string, assignedStaffIds: { id: string; name: string; email?: string }[]): Promise<void>;
  archiveClientChatRooms(clientId: string, archivedById: string, archivedByName: string): Promise<number>;
  unarchiveClientChatRooms(clientId: string): Promise<number>;
  
  // Chat Room Participants
  getChatRoomParticipants(roomId: string): Promise<ChatRoomParticipant[]>;
  addChatRoomParticipant(participant: InsertChatRoomParticipant): Promise<ChatRoomParticipant>;
  removeChatRoomParticipant(roomId: string, staffId: string): Promise<boolean>;
  updateParticipantRole(roomId: string, staffId: string, role: "admin" | "member"): Promise<ChatRoomParticipant | undefined>;
  updateLastRead(roomId: string, staffId: string): Promise<void>;
  togglePinRoom(roomId: string, staffId: string): Promise<ChatRoomParticipant | undefined>;
  toggleMuteRoom(roomId: string, staffId: string): Promise<ChatRoomParticipant | undefined>;
  getUnreadCount(userId: string): Promise<number>;
  isRoomAdmin(roomId: string, staffId: string): Promise<boolean>;
  isRoomParticipant(roomId: string, staffId: string): Promise<boolean>;
  
  // Chat Messages
  getChatMessages(roomId: string, limit?: number, before?: string, userId?: string): Promise<ChatMessage[]>;
  getParticipantJoinDate(roomId: string, staffId: string): Promise<Date | null>;
  getChatMessageById(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: string, content: string): Promise<ChatMessage | undefined>;
  deleteChatMessage(id: string): Promise<boolean>;
  softDeleteChatMessage(id: string, deletedById: string, deletedByName: string): Promise<ChatMessage | undefined>;
  forwardChatMessage(originalMessageId: string, targetRoomId: string, forwarderId: string, forwarderName: string, comment?: string): Promise<ChatMessage | undefined>;
  pinChatMessage(id: string, pinnedById: string, pinnedByName: string): Promise<ChatMessage | undefined>;
  unpinChatMessage(id: string): Promise<ChatMessage | undefined>;
  getPinnedMessages(roomId: string): Promise<ChatMessage[]>;
  searchChatMessages(roomId: string, filters: {
    query?: string;
    senderId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    mediaType?: string;
  }): Promise<ChatMessage[]>;
  
  // Chat Message Attachments
  getChatMessageAttachments(messageId: string): Promise<ChatMessageAttachment[]>;
  createChatMessageAttachment(attachment: InsertChatMessageAttachment): Promise<ChatMessageAttachment>;
  updateChatMessageAttachmentStatus(id: string, status: string, error?: string): Promise<ChatMessageAttachment | undefined>;
  deleteChatMessageAttachment(id: string): Promise<boolean>;
  
  // Media Retention
  getExpiredMediaAttachments(limit?: number): Promise<ChatMessageAttachment[]>;
  getUpcomingExpiryAttachments(daysBeforeExpiry: number, limit?: number): Promise<ChatMessageAttachment[]>;
  markAttachmentAsExpired(id: string, reason: string): Promise<ChatMessageAttachment | undefined>;
  setAttachmentExpiry(id: string, expiresAt: Date): Promise<ChatMessageAttachment | undefined>;
  cleanupExpiredMedia(): Promise<{ cleaned: number; errors: string[] }>;
  
  // Chat Audit Logs
  createChatAuditLog(log: InsertChatAuditLog): Promise<ChatAuditLog>;
  getChatAuditLogs(roomId?: string, limit?: number): Promise<ChatAuditLog[]>;
  
  // Chat Message Reactions
  getMessageReactions(messageId: string): Promise<ChatMessageReaction[]>;
  getReactionsForMessages(messageIds: string[]): Promise<Record<string, ChatMessageReaction[]>>;
  addReaction(reaction: InsertChatMessageReaction): Promise<ChatMessageReaction>;
  removeReaction(messageId: string, staffId: string, emoji: string): Promise<boolean>;
  getUserReactionOnMessage(messageId: string, staffId: string, emoji: string): Promise<ChatMessageReaction | undefined>;
  
  // Chat Message Read Receipts
  getMessageReads(messageId: string): Promise<ChatMessageRead[]>;
  getReadsForMessages(messageIds: string[]): Promise<Record<string, ChatMessageRead[]>>;
  markMessageAsRead(read: InsertChatMessageRead): Promise<ChatMessageRead>;
  markMessagesAsRead(roomId: string, messageIds: string[], staffId: string, staffName: string): Promise<number>;
  
  // Chat Message Delivery Receipts
  getMessageDeliveries(messageId: string): Promise<ChatMessageDelivery[]>;
  getDeliveriesForMessages(messageIds: string[]): Promise<Record<string, ChatMessageDelivery[]>>;
  markMessagesAsDelivered(roomId: string, messageIds: string[], staffId: string, staffName: string): Promise<number>;
  
  // Scheduled Messages
  createScheduledMessage(message: InsertScheduledMessage): Promise<ScheduledMessage>;
  getScheduledMessages(userId: string, roomId?: string): Promise<ScheduledMessage[]>;
  getScheduledMessageById(id: string): Promise<ScheduledMessage | undefined>;
  cancelScheduledMessage(id: string): Promise<ScheduledMessage | undefined>;
  getPendingScheduledMessages(): Promise<ScheduledMessage[]>;
  markScheduledMessageAsSent(id: string, messageId: string): Promise<ScheduledMessage | undefined>;
  markScheduledMessageAsFailed(id: string): Promise<ScheduledMessage | undefined>;
  
  // Scheduling Conflicts
  getSchedulingConflicts(filters?: {
    status?: ConflictStatus;
    severity?: ConflictSeverity;
    conflictType?: SchedulingConflictType;
    clientId?: string;
    staffId?: string;
    appointmentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conflicts: SchedulingConflict[]; total: number }>;
  getSchedulingConflictById(id: string): Promise<SchedulingConflict | undefined>;
  getOpenConflictsCount(): Promise<number>;
  getConflictsByAppointment(appointmentId: string): Promise<SchedulingConflict[]>;
  getConflictsByStaff(staffId: string): Promise<SchedulingConflict[]>;
  getConflictsByClient(clientId: string): Promise<SchedulingConflict[]>;
  createSchedulingConflict(conflict: InsertSchedulingConflict): Promise<SchedulingConflict>;
  updateSchedulingConflict(id: string, updates: Partial<InsertSchedulingConflict>): Promise<SchedulingConflict | undefined>;
  resolveSchedulingConflict(id: string, resolution: {
    resolvedById: string;
    resolvedByName: string;
    resolutionNotes?: string;
    resolutionAction: "reassigned" | "override_approved" | "appointment_cancelled" | "restriction_updated" | "dismissed" | "auto_resolved";
  }): Promise<SchedulingConflict | undefined>;
  dismissSchedulingConflict(id: string, userId: string, userName: string, notes?: string): Promise<SchedulingConflict | undefined>;
  deleteSchedulingConflict(id: string): Promise<boolean>;
  autoResolveConflictsForAppointment(appointmentId: string): Promise<number>;

  // Workforce Management - Staff Qualifications
  getStaffQualifications(staffId: string): Promise<StaffQualification[]>;
  getStaffQualificationById(id: string): Promise<StaffQualification | undefined>;
  createStaffQualification(qualification: InsertStaffQualification): Promise<StaffQualification>;
  updateStaffQualification(id: string, qualification: Partial<InsertStaffQualification>): Promise<StaffQualification | undefined>;
  deleteStaffQualification(id: string): Promise<boolean>;

  // Staff Emergency Contacts
  getStaffEmergencyContacts(staffId: string): Promise<StaffEmergencyContact[]>;
  getStaffEmergencyContactById(id: string): Promise<StaffEmergencyContact | undefined>;
  createStaffEmergencyContact(contact: InsertStaffEmergencyContact): Promise<StaffEmergencyContact>;
  updateStaffEmergencyContact(id: string, contact: Partial<InsertStaffEmergencyContact>): Promise<StaffEmergencyContact | undefined>;
  deleteStaffEmergencyContact(id: string): Promise<boolean>;
  unsetPrimaryStaffEmergencyContacts(staffId: string): Promise<void>;

  // Workforce Management - Staff Blacklist
  getStaffBlacklist(staffId: string): Promise<StaffBlacklist[]>;
  getAllActiveBlacklists(): Promise<StaffBlacklist[]>;
  getStaffBlacklistById(id: string): Promise<StaffBlacklist | undefined>;
  createStaffBlacklist(blacklist: InsertStaffBlacklist): Promise<StaffBlacklist>;
  updateStaffBlacklist(id: string, blacklist: Partial<InsertStaffBlacklist>): Promise<StaffBlacklist | undefined>;
  deleteStaffBlacklist(id: string): Promise<boolean>;

  // Workforce Management - Time Clock
  getTimeClockRecords(staffId: string, startDate?: Date, endDate?: Date): Promise<TimeClockRecord[]>;
  getTimeClockRecordById(id: string): Promise<TimeClockRecord | undefined>;
  createTimeClockRecord(record: InsertTimeClockRecord): Promise<TimeClockRecord>;
  updateTimeClockRecord(id: string, record: Partial<InsertTimeClockRecord>): Promise<TimeClockRecord | undefined>;

  // Workforce Management - Timesheets
  getTimesheets(staffId?: string, status?: string): Promise<Timesheet[]>;
  getTimesheetById(id: string): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: string): Promise<boolean>;

  // Workforce Management - Timesheet Entries
  getTimesheetEntries(timesheetId: string): Promise<TimesheetEntry[]>;
  getTimesheetEntryById(id: string): Promise<TimesheetEntry | undefined>;
  createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry>;
  updateTimesheetEntry(id: string, entry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry | undefined>;
  deleteTimesheetEntry(id: string): Promise<boolean>;

  // Workforce Management - GPS Compliance
  getGpsComplianceLogs(filters?: { staffId?: string; appointmentId?: string; isCompliant?: boolean }): Promise<GpsComplianceLog[]>;
  getGpsComplianceLogById(id: string): Promise<GpsComplianceLog | undefined>;
  createGpsComplianceLog(log: InsertGpsComplianceLog): Promise<GpsComplianceLog>;
  updateGpsComplianceLog(id: string, log: Partial<InsertGpsComplianceLog>): Promise<GpsComplianceLog | undefined>;
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

  // Pricing Services
  async getAllPricingServices(): Promise<PricingService[]> {
    return await db.select().from(pricingServices)
      .where(eq(pricingServices.isActive, 'yes'))
      .orderBy(pricingServices.category, pricingServices.serviceName);
  }

  async getPricingServicesByType(serviceType: string): Promise<PricingService[]> {
    return await db.select().from(pricingServices)
      .where(and(
        eq(pricingServices.serviceType, serviceType as any),
        eq(pricingServices.isActive, 'yes')
      ))
      .orderBy(pricingServices.category, pricingServices.serviceName);
  }

  async searchPricingServices(searchTerm: string): Promise<PricingService[]> {
    const search = `%${searchTerm}%`;
    return await db.select().from(pricingServices)
      .where(and(
        or(
          ilike(pricingServices.serviceName, search),
          ilike(pricingServices.description, search),
          ilike(pricingServices.category, search)
        ),
        eq(pricingServices.isActive, 'yes')
      ))
      .orderBy(pricingServices.category, pricingServices.serviceName)
      .limit(20);
  }

  async getPricingServiceById(id: string): Promise<PricingService | undefined> {
    const result = await db.select().from(pricingServices).where(eq(pricingServices.id, id)).limit(1);
    return result[0];
  }

  async createPricingService(service: InsertPricingService): Promise<PricingService> {
    const result = await db.insert(pricingServices).values(service).returning();
    return result[0];
  }

  async updatePricingService(id: string, service: Partial<InsertPricingService>): Promise<PricingService | undefined> {
    const result = await db.update(pricingServices)
      .set({ ...service as any, updatedAt: new Date() })
      .where(eq(pricingServices.id, id))
      .returning();
    return result[0];
  }

  // Quote vs Actual Tracking
  async getQuoteVsActualByQuote(quoteId: string): Promise<QuoteVsActual[]> {
    return await db.select().from(quoteVsActual)
      .where(eq(quoteVsActual.quoteId, quoteId))
      .orderBy(quoteVsActual.serviceName);
  }

  async getQuoteVsActualByClient(clientId: string): Promise<QuoteVsActual[]> {
    return await db.select().from(quoteVsActual)
      .where(eq(quoteVsActual.clientId, clientId))
      .orderBy(desc(quoteVsActual.createdAt));
  }

  async createQuoteVsActual(tracking: InsertQuoteVsActual): Promise<QuoteVsActual> {
    const result = await db.insert(quoteVsActual).values(tracking).returning();
    return result[0];
  }

  async updateQuoteVsActual(id: string, tracking: Partial<InsertQuoteVsActual>): Promise<QuoteVsActual | undefined> {
    const result = await db.update(quoteVsActual)
      .set({ ...tracking as any, updatedAt: new Date() })
      .where(eq(quoteVsActual.id, id))
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

  async getAssignmentById(id: string): Promise<ClientStaffAssignment | undefined> {
    const result = await db.select().from(clientStaffAssignments)
      .where(eq(clientStaffAssignments.id, id))
      .limit(1);
    return result[0];
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

  async duplicateGoal(id: string): Promise<ClientGoal | undefined> {
    const original = await this.getGoalById(id);
    if (!original) return undefined;
    
    const newGoal: InsertClientGoal = {
      clientId: original.clientId,
      title: `${original.title} (Copy)`,
      description: original.description,
      targetDate: original.targetDate,
      status: "not_started",
      progress: null,
      progressPercent: 0,
      category: original.category || undefined,
      responsibleStaffId: original.responsibleStaffId,
      order: original.order,
    };
    
    return await this.createGoal(newGoal);
  }

  async archiveGoal(id: string, archivedBy?: string): Promise<ClientGoal | undefined> {
    const result = await db.update(clientGoals)
      .set({ 
        isArchived: "yes",
        archivedAt: new Date(),
        archivedBy: archivedBy || null,
        updatedAt: new Date()
      })
      .where(eq(clientGoals.id, id))
      .returning();
    return result[0];
  }

  async unarchiveGoal(id: string): Promise<ClientGoal | undefined> {
    const result = await db.update(clientGoals)
      .set({ 
        isArchived: "no",
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date()
      })
      .where(eq(clientGoals.id, id))
      .returning();
    return result[0];
  }

  // Goal Updates (Audit Trail)
  async getGoalUpdates(goalId: string): Promise<GoalUpdate[]> {
    return await db.select().from(goalUpdates)
      .where(eq(goalUpdates.goalId, goalId))
      .orderBy(desc(goalUpdates.createdAt));
  }

  async createGoalUpdate(update: InsertGoalUpdate): Promise<GoalUpdate> {
    const result = await db.insert(goalUpdates).values(update).returning();
    return result[0];
  }

  // Goal Action Plans
  async getActionPlansByGoal(goalId: string): Promise<GoalActionPlan[]> {
    return await db.select().from(goalActionPlans)
      .where(eq(goalActionPlans.goalId, goalId))
      .orderBy(goalActionPlans.order);
  }

  async getActionPlanById(id: string): Promise<GoalActionPlan | undefined> {
    const result = await db.select().from(goalActionPlans).where(eq(goalActionPlans.id, id)).limit(1);
    return result[0];
  }

  async createActionPlan(plan: InsertGoalActionPlan): Promise<GoalActionPlan> {
    const result = await db.insert(goalActionPlans).values(plan).returning();
    return result[0];
  }

  async updateActionPlan(id: string, plan: Partial<InsertGoalActionPlan>): Promise<GoalActionPlan | undefined> {
    const result = await db.update(goalActionPlans)
      .set({ ...plan as any, updatedAt: new Date() })
      .where(eq(goalActionPlans.id, id))
      .returning();
    return result[0];
  }

  async deleteActionPlan(id: string): Promise<boolean> {
    const result = await db.delete(goalActionPlans).where(eq(goalActionPlans.id, id)).returning();
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

  async getAppointmentAssignmentById(id: string): Promise<AppointmentAssignment | undefined> {
    const result = await db.select().from(appointmentAssignments)
      .where(eq(appointmentAssignments.id, id))
      .limit(1);
    return result[0];
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

  // ============================================
  // SIL HOUSES
  // ============================================

  async getAllSilHouses(): Promise<SilHouse[]> {
    return await db.select().from(silHouses).orderBy(silHouses.houseName);
  }

  async getActiveSilHouses(): Promise<SilHouse[]> {
    return await db.select().from(silHouses)
      .where(eq(silHouses.status, "Active"))
      .orderBy(silHouses.houseName);
  }

  async getSilHouseById(id: string): Promise<SilHouse | undefined> {
    const result = await db.select().from(silHouses)
      .where(eq(silHouses.id, id)).limit(1);
    return result[0];
  }

  async searchSilHouses(searchTerm: string, status?: string, propertyType?: string): Promise<SilHouse[]> {
    const conditions = [];
    
    if (searchTerm) {
      conditions.push(
        or(
          ilike(silHouses.houseName, `%${searchTerm}%`),
          ilike(silHouses.streetAddress, `%${searchTerm}%`),
          ilike(silHouses.suburb, `%${searchTerm}%`)
        )
      );
    }
    
    if (status && status !== "All") {
      conditions.push(eq(silHouses.status, status as any));
    }
    
    if (propertyType && propertyType !== "All") {
      conditions.push(eq(silHouses.propertyType, propertyType as any));
    }
    
    if (conditions.length === 0) {
      return await db.select().from(silHouses).orderBy(silHouses.houseName);
    }
    
    return await db.select().from(silHouses)
      .where(and(...conditions))
      .orderBy(silHouses.houseName);
  }

  async createSilHouse(house: InsertSilHouse): Promise<SilHouse> {
    const result = await db.insert(silHouses).values(house).returning();
    return result[0];
  }

  async updateSilHouse(id: string, house: Partial<InsertSilHouse>): Promise<SilHouse | undefined> {
    const result = await db.update(silHouses)
      .set({ ...house as any, updatedAt: new Date() })
      .where(eq(silHouses.id, id))
      .returning();
    return result[0];
  }

  async deleteSilHouse(id: string): Promise<boolean> {
    const result = await db.delete(silHouses)
      .where(eq(silHouses.id, id)).returning();
    return result.length > 0;
  }

  async getSilHouseStats(): Promise<{
    totalHouses: number;
    activeHouses: number;
    totalResidents: number;
    totalCapacity: number;
    occupancyRate: number;
    availableBeds: number;
    propertyTypes: number;
    complianceRate: number;
  }> {
    const houses = await db.select().from(silHouses);
    const today = new Date().toISOString().split('T')[0];
    
    const totalHouses = houses.length;
    const activeHouses = houses.filter(h => h.status === "Active").length;
    const totalResidents = houses.reduce((sum, h) => sum + (h.currentResidents || 0), 0);
    const totalCapacity = houses.reduce((sum, h) => sum + (h.maxResidents || 0), 0);
    const occupancyRate = totalCapacity > 0 ? (totalResidents / totalCapacity) * 100 : 0;
    const availableBeds = totalCapacity - totalResidents;
    const propertyTypes = new Set(houses.map(h => h.propertyType)).size;
    
    // Calculate compliance rate based on valid certificates
    const compliantHouses = houses.filter(h => {
      const safetyValid = h.safetyCertificateExpiry && h.safetyCertificateExpiry >= today;
      const fireValid = h.fireSafetyCheckDate !== null;
      const buildingValid = h.buildingInspectionDate !== null;
      return safetyValid && fireValid && buildingValid;
    }).length;
    const complianceRate = totalHouses > 0 ? (compliantHouses / totalHouses) * 100 : 0;
    
    return {
      totalHouses,
      activeHouses,
      totalResidents,
      totalCapacity,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      availableBeds,
      propertyTypes,
      complianceRate: Math.round(complianceRate * 10) / 10
    };
  }

  // SIL House Audit Log
  async getSilHouseAuditLogs(houseId?: string): Promise<SilHouseAuditLog[]> {
    if (houseId) {
      return await db.select().from(silHouseAuditLog)
        .where(eq(silHouseAuditLog.silHouseId, houseId))
        .orderBy(desc(silHouseAuditLog.createdAt));
    }
    return await db.select().from(silHouseAuditLog)
      .orderBy(desc(silHouseAuditLog.createdAt))
      .limit(100);
  }

  async createSilHouseAuditLog(log: InsertSilHouseAuditLog): Promise<SilHouseAuditLog> {
    const result = await db.insert(silHouseAuditLog).values(log).returning();
    return result[0];
  }

  // ============================================
  // SERVICE SUBTYPES
  // ============================================

  async getAllServiceSubtypes(): Promise<ServiceSubtype[]> {
    return await db.select().from(serviceSubtypes)
      .where(eq(serviceSubtypes.isActive, "yes"))
      .orderBy(serviceSubtypes.serviceType, serviceSubtypes.name);
  }

  async getServiceSubtypesByType(serviceType: "Support Work" | "Nursing"): Promise<ServiceSubtype[]> {
    return await db.select().from(serviceSubtypes)
      .where(and(
        eq(serviceSubtypes.serviceType, serviceType),
        eq(serviceSubtypes.isActive, "yes")
      ))
      .orderBy(serviceSubtypes.name);
  }

  async createServiceSubtype(subtype: InsertServiceSubtype): Promise<ServiceSubtype> {
    const result = await db.insert(serviceSubtypes).values(subtype).returning();
    return result[0];
  }

  async updateServiceSubtype(id: string, updates: Partial<InsertServiceSubtype>): Promise<ServiceSubtype | undefined> {
    const result = await db.update(serviceSubtypes)
      .set(updates as any)
      .where(eq(serviceSubtypes.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceSubtype(id: string): Promise<boolean> {
    const result = await db.update(serviceSubtypes)
      .set({ isActive: "no" })
      .where(eq(serviceSubtypes.id, id))
      .returning();
    return result.length > 0;
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isArchived, "no")
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, "no"),
        eq(notifications.isArchived, "no")
      ));
    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const result = await db.update(notifications)
      .set({ isRead: "yes", readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db.update(notifications)
      .set({ isRead: "yes", readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, "no")
      ))
      .returning();
    return result.length;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications)
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  async getNotificationsByUserPaginated(
    userId: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      isRead?: "yes" | "no"; 
      type?: string;
      includeArchived?: boolean;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { limit = 20, offset = 0, isRead, type, includeArchived = false } = options;
    
    const conditions = [eq(notifications.userId, userId)];
    
    if (!includeArchived) {
      conditions.push(eq(notifications.isArchived, "no"));
    }
    
    if (isRead) {
      conditions.push(eq(notifications.isRead, isRead));
    }
    
    if (type) {
      conditions.push(eq(notifications.type, type as any));
    }
    
    const [notificationList, countResult] = await Promise.all([
      db.select().from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(...conditions))
    ]);
    
    return {
      notifications: notificationList,
      total: Number(countResult[0]?.count || 0)
    };
  }

  async archiveNotification(id: string): Promise<Notification | undefined> {
    const result = await db.update(notifications)
      .set({ isArchived: "yes", archivedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async archiveChatNotificationsForRoom(userId: string, roomId: string): Promise<number> {
    const result = await db.update(notifications)
      .set({ isArchived: "yes", archivedAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.relatedType, "chat"),
        eq(notifications.relatedId, roomId),
        eq(notifications.isArchived, "no")
      ))
      .returning();
    return result.length;
  }

  async archiveInaccessibleChatNotifications(userId: string, accessibleRoomIds: string[]): Promise<number> {
    // Archive all chat notifications for rooms the user no longer has access to
    // Use a subquery approach to avoid SQL parameter limits
    
    if (accessibleRoomIds.length === 0) {
      // No accessible rooms - archive all chat notifications for this user
      const result = await db.update(notifications)
        .set({ isArchived: "yes", archivedAt: new Date() })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.relatedType, "chat"),
          eq(notifications.isArchived, "no")
        ))
        .returning();
      return result.length;
    }
    
    // Get all unarchived chat notifications for this user
    const chatNotifs = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.relatedType, "chat"),
        eq(notifications.isArchived, "no")
      ));
    
    // Find those that are for inaccessible rooms
    const accessibleSet = new Set(accessibleRoomIds);
    const toArchive = chatNotifs.filter(n => n.relatedId && !accessibleSet.has(n.relatedId));
    
    if (toArchive.length === 0) return 0;
    
    // Archive in batches to avoid SQL parameter limits (max ~500 per batch to be safe)
    const BATCH_SIZE = 500;
    let totalArchived = 0;
    
    for (let i = 0; i < toArchive.length; i += BATCH_SIZE) {
      const batch = toArchive.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(n => n.id);
      
      const result = await db.update(notifications)
        .set({ isArchived: "yes", archivedAt: new Date() })
        .where(sql`${notifications.id} IN (${sql.join(batchIds.map(id => sql`${id}`), sql`, `)})`)
        .returning();
      
      totalArchived += result.length;
    }
    
    return totalArchived;
  }

  async markNotificationAsDelivered(id: string, method: string = "websocket"): Promise<Notification | undefined> {
    const result = await db.update(notifications)
      .set({ isDelivered: "yes", deliveredAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async createBulkNotifications(notificationsList: InsertNotification[]): Promise<Notification[]> {
    if (notificationsList.length === 0) return [];
    const result = await db.insert(notifications).values(notificationsList).returning();
    return result;
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const result = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return result[0];
  }

  async createOrUpdateNotificationPreferences(
    userId: string, 
    prefs: Partial<InsertNotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    
    if (existing) {
      const result = await db.update(notificationPreferences)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(notificationPreferences)
        .values({ userId, ...prefs })
        .returning();
      return result[0];
    }
  }

  // ============================================
  // SUPPORT TICKETS
  // ============================================

  async getAllTickets(): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async getTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.createdById, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getTicketById(id: string): Promise<SupportTicket | undefined> {
    const result = await db.select().from(supportTickets)
      .where(eq(supportTickets.id, id));
    return result[0];
  }

  async createTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const result = await db.insert(supportTickets).values(ticket).returning();
    return result[0];
  }

  async updateTicket(id: string, updates: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async assignTicket(id: string, assignedToId: string, assignedToName: string): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({
        assignedToId,
        assignedToName,
        assignedAt: new Date(),
        status: "in_progress",
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async resolveTicket(id: string, resolvedById: string, resolvedByName: string, resolutionNotes?: string): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedById,
        resolvedByName,
        resolutionNotes: resolutionNotes || null,
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async closeTicket(id: string): Promise<SupportTicket | undefined> {
    const result = await db.update(supportTickets)
      .set({
        status: "closed",
        closedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  // ============================================
  // TICKET COMMENTS
  // ============================================

  async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    return await db.select().from(ticketComments)
      .where(eq(ticketComments.ticketId, ticketId))
      .orderBy(ticketComments.createdAt);
  }

  async createTicketComment(comment: InsertTicketComment): Promise<TicketComment> {
    const result = await db.insert(ticketComments).values(comment).returning();
    return result[0];
  }

  // ============================================
  // ANNOUNCEMENTS
  // ============================================

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db.select().from(announcements)
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
  }

  async getActiveAnnouncements(userRoles?: string[]): Promise<Announcement[]> {
    const now = new Date();
    const result = await db.select().from(announcements)
      .where(and(
        eq(announcements.isActive, "yes"),
        lte(announcements.startsAt, now),
        or(
          sql`${announcements.expiresAt} IS NULL`,
          gte(announcements.expiresAt, now)
        )
      ))
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
    
    // Filter by audience if user roles provided
    if (userRoles && userRoles.length > 0) {
      return result.filter(a => {
        if (a.audience === "all") return true;
        if (a.audience === "support_workers" && userRoles.includes("support_worker")) return true;
        if (a.audience === "nurses" && (userRoles.includes("enrolled_nurse") || userRoles.includes("registered_nurse"))) return true;
        if (a.audience === "admin" && userRoles.includes("admin")) return true;
        if (a.audience === "managers" && (userRoles.includes("operations_manager") || userRoles.includes("care_manager") || userRoles.includes("clinical_manager") || userRoles.includes("director"))) return true;
        return false;
      });
    }
    
    return result;
  }

  async getAnnouncementById(id: string): Promise<Announcement | undefined> {
    const result = await db.select().from(announcements)
      .where(eq(announcements.id, id));
    return result[0];
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const result = await db.insert(announcements).values(announcement).returning();
    return result[0];
  }

  async updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const result = await db.update(announcements)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(announcements.id, id))
      .returning();
    return result[0];
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db.update(announcements)
      .set({ isActive: "no" })
      .where(eq(announcements.id, id))
      .returning();
    return result.length > 0;
  }

  // ============================================
  // TASKS
  // ============================================

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks)
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.createdById, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksAssignedToUser(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.assignedToId, userId))
      .orderBy(desc(tasks.dueDate), desc(tasks.createdAt));
  }

  async getTasksByClient(clientId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.clientId, clientId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks)
      .where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async assignTask(id: string, assignedToId: string, assignedToName: string): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set({
        assignedToId,
        assignedToName,
        assignedAt: new Date(),
        status: "not_started",
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async completeTask(id: string, completedById: string, completedByName: string, notes?: string): Promise<Task | undefined> {
    const result = await db.update(tasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedById,
        completedByName,
        completionNotes: notes || null,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    return result.length > 0;
  }

  // Task Comments
  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    return await db.select().from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt);
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const result = await db.insert(taskComments).values(comment).returning();
    return result[0];
  }

  // Task Checklists
  async getTaskChecklists(taskId: string): Promise<TaskChecklist[]> {
    return await db.select().from(taskChecklists)
      .where(eq(taskChecklists.taskId, taskId))
      .orderBy(taskChecklists.sortOrder);
  }

  async createTaskChecklist(item: InsertTaskChecklist): Promise<TaskChecklist> {
    const result = await db.insert(taskChecklists).values(item).returning();
    return result[0];
  }

  async updateTaskChecklist(id: string, updates: Partial<InsertTaskChecklist>): Promise<TaskChecklist | undefined> {
    const result = await db.update(taskChecklists)
      .set(updates as any)
      .where(eq(taskChecklists.id, id))
      .returning();
    return result[0];
  }

  async deleteTaskChecklist(id: string): Promise<boolean> {
    const result = await db.delete(taskChecklists)
      .where(eq(taskChecklists.id, id))
      .returning();
    return result.length > 0;
  }

  // Chat Rooms
  async getChatRooms(userId: string): Promise<ChatRoom[]> {
    const participantRooms = await db.select({ roomId: chatRoomParticipants.roomId })
      .from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.staffId, userId));
    
    const roomIds = participantRooms.map(p => p.roomId);
    if (roomIds.length === 0) return [];

    return await db.select().from(chatRooms)
      .where(and(
        inArray(chatRooms.id, roomIds),
        eq(chatRooms.isArchived, "no")
      ))
      .orderBy(desc(chatRooms.lastMessageAt));
  }

  async getChatRoomById(id: string): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms)
      .where(eq(chatRooms.id, id));
    return result[0];
  }

  async getDirectChatRoom(userId1: string, userId2: string): Promise<ChatRoom | undefined> {
    const user1Rooms = await db.select({ roomId: chatRoomParticipants.roomId })
      .from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.staffId, userId1));
    
    const user2Rooms = await db.select({ roomId: chatRoomParticipants.roomId })
      .from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.staffId, userId2));
    
    const user1RoomIds = new Set(user1Rooms.map(r => r.roomId));
    const commonRoomIds = user2Rooms.filter(r => user1RoomIds.has(r.roomId)).map(r => r.roomId);
    
    if (commonRoomIds.length === 0) return undefined;
    
    const rooms = await db.select().from(chatRooms)
      .where(and(
        inArray(chatRooms.id, commonRoomIds),
        eq(chatRooms.type, "direct")
      ));
    
    return rooms[0];
  }

  // Find existing group chat with exact same participants (2-3 users)
  async findExistingGroupChatWithParticipants(participantIds: string[]): Promise<ChatRoom | undefined> {
    if (participantIds.length < 2 || participantIds.length > 3) {
      return undefined; // Only check for 2-3 person groups
    }
    
    // Get rooms for first participant
    const firstUserRooms = await db.select({ roomId: chatRoomParticipants.roomId })
      .from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.staffId, participantIds[0]));
    
    const potentialRoomIds = firstUserRooms.map(r => r.roomId);
    if (potentialRoomIds.length === 0) return undefined;
    
    // Filter to only group rooms that are not archived
    const groupRooms = await db.select().from(chatRooms)
      .where(and(
        inArray(chatRooms.id, potentialRoomIds),
        eq(chatRooms.type, "group"),
        eq(chatRooms.isArchived, "no")
      ));
    
    // Check each room to see if participants match exactly
    for (const room of groupRooms) {
      const roomParticipants = await db.select({ staffId: chatRoomParticipants.staffId })
        .from(chatRoomParticipants)
        .where(eq(chatRoomParticipants.roomId, room.id));
      
      const roomParticipantIds = roomParticipants.map(p => p.staffId).sort();
      const targetIds = [...participantIds].sort();
      
      // Check if exact match
      if (roomParticipantIds.length === targetIds.length &&
          roomParticipantIds.every((id, i) => id === targetIds[i])) {
        return room;
      }
    }
    
    return undefined;
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const result = await db.insert(chatRooms).values(room).returning();
    return result[0];
  }

  async updateChatRoom(id: string, updates: Partial<InsertChatRoom>): Promise<ChatRoom | undefined> {
    const result = await db.update(chatRooms)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(chatRooms.id, id))
      .returning();
    return result[0];
  }

  async deleteChatRoom(id: string): Promise<boolean> {
    const result = await db.delete(chatRooms)
      .where(eq(chatRooms.id, id))
      .returning();
    return result.length > 0;
  }

  async getClientChatRoom(clientId: string): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms)
      .where(and(
        eq(chatRooms.clientId, clientId),
        eq(chatRooms.type, "client")
      ));
    return result[0];
  }

  async getChatRoomsByType(userId: string, type: string): Promise<ChatRoom[]> {
    const participantRooms = await db.select({ roomId: chatRoomParticipants.roomId })
      .from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.staffId, userId));
    
    const roomIds = participantRooms.map(p => p.roomId);
    if (roomIds.length === 0) return [];

    return await db.select().from(chatRooms)
      .where(and(
        inArray(chatRooms.id, roomIds),
        eq(chatRooms.type, type as any),
        eq(chatRooms.isArchived, "no")
      ))
      .orderBy(desc(chatRooms.lastMessageAt));
  }

  async getAllChatRooms(): Promise<ChatRoom[]> {
    return await db.select().from(chatRooms)
      .orderBy(desc(chatRooms.lastMessageAt));
  }

  async archiveChatRoom(id: string, archivedById: string, archivedByName: string): Promise<ChatRoom | undefined> {
    const result = await db.update(chatRooms)
      .set({
        isArchived: "yes",
        status: "archived",
        archivedAt: new Date(),
        archivedById,
        archivedByName,
        updatedAt: new Date()
      } as any)
      .where(eq(chatRooms.id, id))
      .returning();
    return result[0];
  }

  async unarchiveChatRoom(id: string): Promise<ChatRoom | undefined> {
    const result = await db.update(chatRooms)
      .set({
        isArchived: "no",
        status: "active",
        archivedAt: null,
        archivedById: null,
        archivedByName: null,
        updatedAt: new Date()
      } as any)
      .where(eq(chatRooms.id, id))
      .returning();
    return result[0];
  }

  async lockChatRoom(id: string, lockedById: string, lockedByName: string): Promise<ChatRoom | undefined> {
    const result = await db.update(chatRooms)
      .set({
        isLocked: "yes",
        lockedAt: new Date(),
        lockedById,
        lockedByName,
        updatedAt: new Date()
      } as any)
      .where(eq(chatRooms.id, id))
      .returning();
    return result[0];
  }

  async unlockChatRoom(id: string): Promise<ChatRoom | undefined> {
    const result = await db.update(chatRooms)
      .set({
        isLocked: "no",
        lockedAt: null,
        lockedById: null,
        lockedByName: null,
        updatedAt: new Date()
      } as any)
      .where(eq(chatRooms.id, id))
      .returning();
    return result[0];
  }

  async softDeleteChatRoom(id: string, deletedById: string, deletedByName: string): Promise<ChatRoom | undefined> {
    const result = await db.update(chatRooms)
      .set({
        isDeleted: "yes",
        status: "deleted",
        deletedAt: new Date(),
        deletedById,
        deletedByName,
        updatedAt: new Date()
      } as any)
      .where(eq(chatRooms.id, id))
      .returning();
    return result[0];
  }

  async getAllChatRoomsWithFilters(filters?: {
    type?: string;
    status?: string;
    isArchived?: string;
    isLocked?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rooms: ChatRoom[]; total: number }> {
    const conditions = [];
    
    // Filter out deleted rooms by default unless specifically requested
    if (filters?.status === "deleted") {
      conditions.push(eq(chatRooms.status as any, "deleted"));
    } else if (filters?.status) {
      conditions.push(eq(chatRooms.status as any, filters.status));
    } else {
      conditions.push(sql`${chatRooms.isDeleted} = 'no' OR ${chatRooms.isDeleted} IS NULL`);
    }
    
    if (filters?.type) {
      conditions.push(eq(chatRooms.type, filters.type as any));
    }
    if (filters?.isArchived) {
      conditions.push(eq(chatRooms.isArchived, filters.isArchived as any));
    }
    if (filters?.isLocked) {
      conditions.push(eq(chatRooms.isLocked as any, filters.isLocked));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(chatRooms.name as any, `%${filters.search}%`),
        ilike(chatRooms.clientName as any, `%${filters.search}%`)
      ));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(chatRooms)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated results
    let query = db.select().from(chatRooms);
    if (whereClause) {
      query = query.where(whereClause) as any;
    }
    
    const rooms = await query
      .orderBy(desc(chatRooms.lastMessageAt), desc(chatRooms.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);
    
    return { rooms, total };
  }

  async isRoomParticipant(roomId: string, staffId: string): Promise<boolean> {
    const result = await db.select()
      .from(chatRoomParticipants)
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ));
    return result.length > 0;
  }

  async softDeleteChatMessage(id: string, deletedById: string, deletedByName: string): Promise<ChatMessage | undefined> {
    const result = await db.update(chatMessages)
      .set({
        isDeleted: "yes",
        deletedAt: new Date(),
        deletedById,
        deletedByName
      } as any)
      .where(eq(chatMessages.id, id))
      .returning();
    return result[0];
  }

  async forwardChatMessage(
    originalMessageId: string, 
    targetRoomId: string, 
    forwarderId: string, 
    forwarderName: string, 
    comment?: string
  ): Promise<ChatMessage | undefined> {
    const original = await this.getChatMessageById(originalMessageId);
    if (!original) return undefined;
    
    const sourceRoom = await this.getChatRoomById(original.roomId);
    
    const result = await db.insert(chatMessages).values({
      roomId: targetRoomId,
      senderId: forwarderId,
      senderName: forwarderName,
      content: comment || original.content,
      messageType: comment ? "text" : original.messageType,
      isForwarded: "yes",
      forwardedFromMessageId: originalMessageId,
      forwardedFromRoomId: original.roomId,
      forwardedFromRoomName: sourceRoom?.name || "Unknown",
      forwardedById: forwarderId,
      forwardedByName: forwarderName,
      forwardedAt: new Date(),
      forwardedPreview: {
        originalSenderId: original.senderId,
        originalSenderName: original.senderName,
        originalContent: original.content,
        originalMessageType: original.messageType || "text",
        originalCreatedAt: original.createdAt.toISOString()
      }
    } as any).returning();
    
    // Update last message in target room
    if (result[0]) {
      await this.updateChatRoom(targetRoomId, {
        lastMessageAt: new Date(),
        lastMessagePreview: `Forwarded: ${original.content.substring(0, 50)}...`
      } as any);
    }
    
    return result[0];
  }

  // Chat Message Attachments
  async getChatMessageAttachments(messageId: string): Promise<ChatMessageAttachment[]> {
    return await db.select()
      .from(chatMessageAttachments)
      .where(eq(chatMessageAttachments.messageId, messageId))
      .orderBy(chatMessageAttachments.createdAt);
  }

  async createChatMessageAttachment(attachment: InsertChatMessageAttachment): Promise<ChatMessageAttachment> {
    // Set expiry date to 30 days from now for all media attachments
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const result = await db.insert(chatMessageAttachments).values({
      ...attachment,
      expiresAt,
      isExpired: "no",
    }).returning();
    return result[0];
  }

  async updateChatMessageAttachmentStatus(id: string, status: string, error?: string): Promise<ChatMessageAttachment | undefined> {
    const result = await db.update(chatMessageAttachments)
      .set({
        processingStatus: status,
        processingError: error
      } as any)
      .where(eq(chatMessageAttachments.id, id))
      .returning();
    return result[0];
  }

  async deleteChatMessageAttachment(id: string): Promise<boolean> {
    const result = await db.delete(chatMessageAttachments)
      .where(eq(chatMessageAttachments.id, id))
      .returning();
    return result.length > 0;
  }

  // Get all media attachments for a chat room (photos and documents only, excludes GIFs and videos)
  async getChatRoomMediaAttachments(roomId: string): Promise<(ChatMessageAttachment & { senderName: string; createdAt: Date })[]> {
    const result = await db.select({
      id: chatMessageAttachments.id,
      messageId: chatMessageAttachments.messageId,
      type: chatMessageAttachments.type,
      fileName: chatMessageAttachments.fileName,
      fileSize: chatMessageAttachments.fileSize,
      mimeType: chatMessageAttachments.mimeType,
      storageKey: chatMessageAttachments.storageKey,
      thumbnailKey: chatMessageAttachments.thumbnailKey,
      width: chatMessageAttachments.width,
      height: chatMessageAttachments.height,
      duration: chatMessageAttachments.duration,
      externalUrl: chatMessageAttachments.externalUrl,
      externalProvider: chatMessageAttachments.externalProvider,
      externalId: chatMessageAttachments.externalId,
      processingStatus: chatMessageAttachments.processingStatus,
      processingError: chatMessageAttachments.processingError,
      expiresAt: chatMessageAttachments.expiresAt,
      isExpired: chatMessageAttachments.isExpired,
      expiredAt: chatMessageAttachments.expiredAt,
      fileHash: chatMessageAttachments.fileHash,
      deletedReason: chatMessageAttachments.deletedReason,
      createdAt: chatMessageAttachments.createdAt,
      senderName: chatMessages.senderName,
    })
      .from(chatMessageAttachments)
      .innerJoin(chatMessages, eq(chatMessageAttachments.messageId, chatMessages.id))
      .where(and(
        eq(chatMessages.roomId, roomId),
        eq(chatMessageAttachments.isExpired, "no"),
        or(
          eq(chatMessageAttachments.type, "image"),
          eq(chatMessageAttachments.type, "file")
        )
      ))
      .orderBy(desc(chatMessageAttachments.createdAt));
    
    return result as any;
  }

  // Media Retention Methods
  async getExpiredMediaAttachments(limit: number = 100): Promise<ChatMessageAttachment[]> {
    const now = new Date();
    return await db.select().from(chatMessageAttachments)
      .where(and(
        lte(chatMessageAttachments.expiresAt, now),
        eq(chatMessageAttachments.isExpired, "no")
      ))
      .orderBy(chatMessageAttachments.expiresAt)
      .limit(limit);
  }

  async getUpcomingExpiryAttachments(daysBeforeExpiry: number, limit: number = 100): Promise<ChatMessageAttachment[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);
    return await db.select().from(chatMessageAttachments)
      .where(and(
        gte(chatMessageAttachments.expiresAt, now),
        lte(chatMessageAttachments.expiresAt, futureDate),
        eq(chatMessageAttachments.isExpired, "no")
      ))
      .orderBy(chatMessageAttachments.expiresAt)
      .limit(limit);
  }

  async markAttachmentAsExpired(id: string, reason: string): Promise<ChatMessageAttachment | undefined> {
    const result = await db.update(chatMessageAttachments)
      .set({
        isExpired: "yes",
        expiredAt: new Date(),
        deletedReason: reason,
        storageKey: "", // Clear the actual file reference
        thumbnailKey: null,
      })
      .where(eq(chatMessageAttachments.id, id))
      .returning();
    return result[0];
  }

  async setAttachmentExpiry(id: string, expiresAt: Date): Promise<ChatMessageAttachment | undefined> {
    const result = await db.update(chatMessageAttachments)
      .set({ expiresAt })
      .where(eq(chatMessageAttachments.id, id))
      .returning();
    return result[0];
  }

  async cleanupExpiredMedia(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;
    
    const expiredAttachments = await this.getExpiredMediaAttachments(500);
    
    for (const attachment of expiredAttachments) {
      try {
        // Mark as expired (soft delete with audit trail)
        await this.markAttachmentAsExpired(attachment.id, "30-day retention policy");
        cleaned++;
        
        console.log(`[MEDIA CLEANUP] Expired attachment ${attachment.id} (${attachment.fileName})`);
      } catch (error) {
        const errorMsg = `Failed to cleanup attachment ${attachment.id}: ${error}`;
        errors.push(errorMsg);
        console.error(`[MEDIA CLEANUP ERROR] ${errorMsg}`);
      }
    }
    
    console.log(`[MEDIA CLEANUP] Completed: ${cleaned} attachments cleaned, ${errors.length} errors`);
    return { cleaned, errors };
  }

  // Chat Audit Logs
  async createChatAuditLog(log: InsertChatAuditLog): Promise<ChatAuditLog> {
    const result = await db.insert(chatAuditLogs).values(log).returning();
    return result[0];
  }

  async getChatAuditLogs(roomId?: string, limit?: number): Promise<ChatAuditLog[]> {
    let query = db.select().from(chatAuditLogs);
    
    if (roomId) {
      query = query.where(eq(chatAuditLogs.roomId, roomId)) as any;
    }
    
    return await query
      .orderBy(desc(chatAuditLogs.createdAt))
      .limit(limit || 100);
  }

  // Chat Message Reactions
  async getMessageReactions(messageId: string): Promise<ChatMessageReaction[]> {
    return await db.select().from(chatMessageReactions)
      .where(eq(chatMessageReactions.messageId, messageId))
      .orderBy(chatMessageReactions.createdAt);
  }

  async getReactionsForMessages(messageIds: string[]): Promise<Record<string, ChatMessageReaction[]>> {
    if (messageIds.length === 0) return {};
    
    const reactions = await db.select().from(chatMessageReactions)
      .where(inArray(chatMessageReactions.messageId, messageIds))
      .orderBy(chatMessageReactions.createdAt);
    
    const result: Record<string, ChatMessageReaction[]> = {};
    for (const reaction of reactions) {
      if (!result[reaction.messageId]) {
        result[reaction.messageId] = [];
      }
      result[reaction.messageId].push(reaction);
    }
    return result;
  }

  async addReaction(reaction: InsertChatMessageReaction): Promise<ChatMessageReaction> {
    // Use ON CONFLICT to handle duplicate reactions gracefully
    const result = await db.insert(chatMessageReactions)
      .values(reaction)
      .onConflictDoNothing()
      .returning();
    
    // If nothing was inserted (duplicate), fetch the existing one
    if (result.length === 0) {
      const existing = await this.getUserReactionOnMessage(reaction.messageId, reaction.staffId, reaction.emoji);
      if (existing) return existing;
      throw new Error("Failed to add reaction");
    }
    
    return result[0];
  }

  async removeReaction(messageId: string, staffId: string, emoji: string): Promise<boolean> {
    const result = await db.delete(chatMessageReactions)
      .where(and(
        eq(chatMessageReactions.messageId, messageId),
        eq(chatMessageReactions.staffId, staffId),
        eq(chatMessageReactions.emoji, emoji)
      ))
      .returning();
    return result.length > 0;
  }

  async getUserReactionOnMessage(messageId: string, staffId: string, emoji: string): Promise<ChatMessageReaction | undefined> {
    const result = await db.select().from(chatMessageReactions)
      .where(and(
        eq(chatMessageReactions.messageId, messageId),
        eq(chatMessageReactions.staffId, staffId),
        eq(chatMessageReactions.emoji, emoji)
      ))
      .limit(1);
    return result[0];
  }

  // Chat Message Read Receipts
  async getMessageReads(messageId: string): Promise<ChatMessageRead[]> {
    return await db.select().from(chatMessageReads)
      .where(eq(chatMessageReads.messageId, messageId))
      .orderBy(chatMessageReads.readAt);
  }

  async getReadsForMessages(messageIds: string[]): Promise<Record<string, ChatMessageRead[]>> {
    if (messageIds.length === 0) return {};
    
    const reads = await db.select().from(chatMessageReads)
      .where(inArray(chatMessageReads.messageId, messageIds))
      .orderBy(chatMessageReads.readAt);
    
    const result: Record<string, ChatMessageRead[]> = {};
    for (const read of reads) {
      if (!result[read.messageId]) {
        result[read.messageId] = [];
      }
      result[read.messageId].push(read);
    }
    return result;
  }

  async markMessageAsRead(read: InsertChatMessageRead): Promise<ChatMessageRead> {
    const result = await db.insert(chatMessageReads)
      .values(read)
      .onConflictDoNothing()
      .returning();
    
    if (result.length === 0) {
      // Already read, fetch existing
      const existing = await db.select().from(chatMessageReads)
        .where(and(
          eq(chatMessageReads.messageId, read.messageId),
          eq(chatMessageReads.staffId, read.staffId)
        ))
        .limit(1);
      if (existing[0]) return existing[0];
      throw new Error("Failed to mark message as read");
    }
    
    return result[0];
  }

  async markMessagesAsRead(roomId: string, messageIds: string[], staffId: string, staffName: string): Promise<number> {
    if (messageIds.length === 0) return 0;
    
    let marked = 0;
    for (const messageId of messageIds) {
      try {
        await db.insert(chatMessageReads)
          .values({ messageId, roomId, staffId, staffName })
          .onConflictDoNothing();
        marked++;
      } catch (error) {
        // Ignore duplicate errors
      }
    }
    return marked;
  }

  // Delivery Receipt Methods
  async getMessageDeliveries(messageId: string): Promise<ChatMessageDelivery[]> {
    return await db.select().from(chatMessageDeliveries)
      .where(eq(chatMessageDeliveries.messageId, messageId))
      .orderBy(chatMessageDeliveries.deliveredAt);
  }

  async getDeliveriesForMessages(messageIds: string[]): Promise<Record<string, ChatMessageDelivery[]>> {
    if (messageIds.length === 0) return {};
    
    const deliveries = await db.select().from(chatMessageDeliveries)
      .where(inArray(chatMessageDeliveries.messageId, messageIds));
    
    const result: Record<string, ChatMessageDelivery[]> = {};
    for (const delivery of deliveries) {
      if (!result[delivery.messageId]) {
        result[delivery.messageId] = [];
      }
      result[delivery.messageId].push(delivery);
    }
    return result;
  }

  async markMessagesAsDelivered(roomId: string, messageIds: string[], staffId: string, staffName: string): Promise<number> {
    if (messageIds.length === 0) return 0;
    
    let marked = 0;
    for (const messageId of messageIds) {
      try {
        await db.insert(chatMessageDeliveries)
          .values({ messageId, roomId, staffId, staffName })
          .onConflictDoNothing();
        marked++;
      } catch (error) {
        // Ignore duplicate errors
      }
    }
    return marked;
  }

  async createClientChatRoom(clientId: string, clientName: string, createdById: string, createdByName: string): Promise<ChatRoom> {
    // Check if client chat already exists
    const existing = await this.getClientChatRoom(clientId);
    if (existing) return existing;

    const result = await db.insert(chatRooms).values({
      name: `${clientName}'s Care Team`,
      type: "client",
      clientId,
      clientName,
      createdById,
      createdByName,
      description: `Team chat for ${clientName}`,
    }).returning();
    
    return result[0];
  }

  async syncClientChatParticipants(clientId: string, assignedStaff: { id: string; name: string; email?: string }[]): Promise<void> {
    // Get the client chat room
    const room = await this.getClientChatRoom(clientId);
    if (!room) return;

    // Get current participants
    const currentParticipants = await this.getChatRoomParticipants(room.id);
    const currentStaffIds = new Set(currentParticipants.map(p => p.staffId));
    const newStaffIds = new Set(assignedStaff.map(s => s.id));

    // SECURITY: Only remove non-admin members who are no longer assigned
    // Admins are preserved to prevent privilege loss via sync manipulation
    for (const participant of currentParticipants) {
      if (!newStaffIds.has(participant.staffId) && participant.role !== "admin") {
        await this.removeChatRoomParticipant(room.id, participant.staffId);
      }
    }

    // Add new participants - always as member, not admin
    for (const staff of assignedStaff) {
      if (!currentStaffIds.has(staff.id)) {
        await db.insert(chatRoomParticipants).values({
          roomId: room.id,
          staffId: staff.id,
          staffName: staff.name,
          staffEmail: staff.email,
          role: "member", // SECURITY: Always member, never admin
        });
      }
    }
  }

  // Archive all chat rooms associated with a client when client is archived
  async archiveClientChatRooms(clientId: string, archivedById: string, archivedByName: string): Promise<number> {
    const clientRooms = await db.select().from(chatRooms)
      .where(and(
        eq(chatRooms.clientId, clientId),
        eq(chatRooms.isArchived, "no")
      ));
    
    let archivedCount = 0;
    for (const room of clientRooms) {
      await this.archiveChatRoom(room.id, archivedById, archivedByName);
      
      // Create audit log entry
      await this.createChatAuditLog({
        roomId: room.id,
        action: "room_archived_with_client",
        actorId: archivedById,
        actorName: archivedByName,
        details: {
          clientId,
          reason: "Client archived - chat room auto-archived per compliance policy"
        }
      });
      
      archivedCount++;
    }
    
    console.log(`[CLIENT ARCHIVE] Archived ${archivedCount} chat rooms for client ${clientId}`);
    return archivedCount;
  }

  // Unarchive all chat rooms associated with a client when client is restored
  async unarchiveClientChatRooms(clientId: string): Promise<number> {
    const archivedRooms = await db.select().from(chatRooms)
      .where(and(
        eq(chatRooms.clientId, clientId),
        eq(chatRooms.isArchived, "yes")
      ));
    
    let unarchivedCount = 0;
    for (const room of archivedRooms) {
      await this.unarchiveChatRoom(room.id);
      
      // Create audit log entry
      await this.createChatAuditLog({
        roomId: room.id,
        action: "room_unarchived_with_client",
        actorId: "system",
        actorName: "System",
        details: {
          clientId,
          reason: "Client restored - chat room auto-unarchived"
        }
      });
      
      unarchivedCount++;
    }
    
    console.log(`[CLIENT RESTORE] Unarchived ${unarchivedCount} chat rooms for client ${clientId}`);
    return unarchivedCount;
  }

  // Chat Room Participants
  async getChatRoomParticipants(roomId: string): Promise<ChatRoomParticipant[]> {
    return await db.select().from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.roomId, roomId));
  }

  async addChatRoomParticipant(participant: InsertChatRoomParticipant): Promise<ChatRoomParticipant> {
    const result = await db.insert(chatRoomParticipants).values(participant).returning();
    return result[0];
  }

  async removeChatRoomParticipant(roomId: string, staffId: string): Promise<boolean> {
    const result = await db.delete(chatRoomParticipants)
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ))
      .returning();
    return result.length > 0;
  }

  async updateParticipantRole(roomId: string, staffId: string, role: "admin" | "member"): Promise<ChatRoomParticipant | undefined> {
    const result = await db.update(chatRoomParticipants)
      .set({ role })
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ))
      .returning();
    return result[0];
  }

  async isRoomAdmin(roomId: string, staffId: string): Promise<boolean> {
    const result = await db.select().from(chatRoomParticipants)
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId),
        eq(chatRoomParticipants.role, "admin")
      ));
    return result.length > 0;
  }

  async updateLastRead(roomId: string, staffId: string): Promise<void> {
    await db.update(chatRoomParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ));
  }

  async togglePinRoom(roomId: string, staffId: string): Promise<ChatRoomParticipant | undefined> {
    // First get current pinned status
    const [participant] = await db.select().from(chatRoomParticipants)
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ));
    
    if (!participant) return undefined;
    
    const newPinnedStatus = participant.isPinned === "yes" ? "no" : "yes";
    
    const [updated] = await db.update(chatRoomParticipants)
      .set({ isPinned: newPinnedStatus })
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ))
      .returning();
    
    return updated;
  }

  async toggleMuteRoom(roomId: string, staffId: string): Promise<ChatRoomParticipant | undefined> {
    // First get current muted status
    const [participant] = await db.select().from(chatRoomParticipants)
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ));
    
    if (!participant) return undefined;
    
    const newMutedStatus = participant.isMuted === "yes" ? "no" : "yes";
    
    const [updated] = await db.update(chatRoomParticipants)
      .set({ isMuted: newMutedStatus })
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ))
      .returning();
    
    return updated;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const participants = await db.select().from(chatRoomParticipants)
      .where(eq(chatRoomParticipants.staffId, userId));
    
    let totalUnread = 0;
    for (const participant of participants) {
      const lastRead = participant.lastReadAt || new Date(0);
      const unreadMessages = await db.select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(and(
          eq(chatMessages.roomId, participant.roomId),
          gte(chatMessages.createdAt, lastRead),
          sql`${chatMessages.senderId} != ${userId}`
        ));
      totalUnread += Number(unreadMessages[0]?.count || 0);
    }
    return totalUnread;
  }

  // Chat Messages
  async getParticipantJoinDate(roomId: string, staffId: string): Promise<Date | null> {
    const result = await db.select({ joinedAt: chatRoomParticipants.joinedAt })
      .from(chatRoomParticipants)
      .where(and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.staffId, staffId)
      ));
    return result[0]?.joinedAt || null;
  }

  async getChatMessages(roomId: string, limit: number = 50, before?: string, userId?: string): Promise<ChatMessage[]> {
    // Get participant's join date to limit message visibility for new members
    let joinDate: Date | null = null;
    if (userId) {
      joinDate = await this.getParticipantJoinDate(roomId, userId);
    }

    // If user has a join date, we need special handling:
    // - Show all messages after their join date
    // - Show only 5 messages before their join date
    if (joinDate) {
      // Get messages after join date (all of them up to limit)
      const messagesAfterJoin = await db.select().from(chatMessages)
        .where(and(
          eq(chatMessages.roomId, roomId),
          eq(chatMessages.isDeleted, "no"),
          gte(chatMessages.createdAt, joinDate)
        ))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);

      // Get only 5 messages before join date (historical context)
      const messagesBeforeJoin = await db.select().from(chatMessages)
        .where(and(
          eq(chatMessages.roomId, roomId),
          eq(chatMessages.isDeleted, "no"),
          lte(chatMessages.createdAt, joinDate)
        ))
        .orderBy(desc(chatMessages.createdAt))
        .limit(5);

      // Combine and sort by date (newest first)
      const allMessages = [...messagesAfterJoin, ...messagesBeforeJoin];
      allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply the before cursor if provided
      if (before) {
        const beforeMessage = await db.select().from(chatMessages).where(eq(chatMessages.id, before));
        if (beforeMessage[0]) {
          const beforeDate = new Date(beforeMessage[0].createdAt).getTime();
          const filtered = allMessages.filter(m => new Date(m.createdAt).getTime() <= beforeDate).slice(0, limit);
          return filtered.map(msg => this.decryptChatMessage(msg));
        }
      }
      
      // Decrypt messages that are encrypted
      return allMessages.slice(0, limit).map(msg => this.decryptChatMessage(msg));
    }

    // Default behavior for users without join date tracking (e.g., room creators)
    let query = db.select().from(chatMessages)
      .where(and(
        eq(chatMessages.roomId, roomId),
        eq(chatMessages.isDeleted, "no")
      ));
    
    if (before) {
      const beforeMessage = await db.select().from(chatMessages).where(eq(chatMessages.id, before));
      if (beforeMessage[0]) {
        query = db.select().from(chatMessages)
          .where(and(
            eq(chatMessages.roomId, roomId),
            eq(chatMessages.isDeleted, "no"),
            lte(chatMessages.createdAt, beforeMessage[0].createdAt)
          ));
      }
    }
    
    const messages = await query.orderBy(desc(chatMessages.createdAt)).limit(limit);
    
    // Decrypt messages that are encrypted
    return messages.map(msg => this.decryptChatMessage(msg));
  }

  private decryptChatMessage(message: ChatMessage): ChatMessage {
    if (message.isEncrypted === "yes" && isEncryptionEnabled()) {
      try {
        return {
          ...message,
          content: decryptMessage(message.content, message.id)
        };
      } catch (error) {
        console.error(`[ENCRYPTION] Failed to decrypt message ${message.id}:`, error);
        return { ...message, content: "[Encrypted message - decryption failed]" };
      }
    }
    return message;
  }

  async getChatMessageById(id: string): Promise<ChatMessage | undefined> {
    const result = await db.select().from(chatMessages)
      .where(eq(chatMessages.id, id));
    if (result[0]) {
      return this.decryptChatMessage(result[0]);
    }
    return undefined;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    // Encrypt message content if encryption is enabled
    const encryptedContent = isEncryptionEnabled() ? encryptMessage(message.content) : message.content;
    const isEncrypted = isEncryptionEnabled() ? "yes" : "no";
    
    const result = await db.insert(chatMessages).values({
      ...message,
      content: encryptedContent,
      isEncrypted,
    }).returning();
    
    // Update room's last message info (use original unencrypted preview)
    const preview = message.content.substring(0, 100);
    await db.update(chatRooms)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: preview,
        updatedAt: new Date()
      })
      .where(eq(chatRooms.id, message.roomId));
    
    // Return with decrypted content for immediate use
    const returnMessage = result[0];
    if (returnMessage.isEncrypted === "yes") {
      return { ...returnMessage, content: message.content };
    }
    return returnMessage;
  }

  async updateChatMessage(id: string, content: string): Promise<ChatMessage | undefined> {
    // Encrypt updated content if encryption is enabled
    const encryptedContent = isEncryptionEnabled() ? encryptMessage(content) : content;
    
    const result = await db.update(chatMessages)
      .set({
        content: encryptedContent,
        isEncrypted: isEncryptionEnabled() ? "yes" : "no",
        isEdited: "yes",
        editedAt: new Date()
      })
      .where(eq(chatMessages.id, id))
      .returning();
    
    // Return with decrypted content
    if (result[0]) {
      return { ...result[0], content };
    }
    return undefined;
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    const result = await db.update(chatMessages)
      .set({
        isDeleted: "yes",
        deletedAt: new Date()
      })
      .where(eq(chatMessages.id, id))
      .returning();
    return result.length > 0;
  }

  async pinChatMessage(id: string, pinnedById: string, pinnedByName: string): Promise<ChatMessage | undefined> {
    const result = await db.update(chatMessages)
      .set({
        isPinned: "yes",
        pinnedAt: new Date(),
        pinnedById,
        pinnedByName
      })
      .where(eq(chatMessages.id, id))
      .returning();
    
    if (result[0]) {
      // Decrypt content if encrypted
      if (result[0].isEncrypted === "yes" && result[0].content) {
        return { ...result[0], content: decryptMessage(result[0].content) };
      }
      return result[0];
    }
    return undefined;
  }

  async unpinChatMessage(id: string): Promise<ChatMessage | undefined> {
    const result = await db.update(chatMessages)
      .set({
        isPinned: "no",
        pinnedAt: null,
        pinnedById: null,
        pinnedByName: null
      })
      .where(eq(chatMessages.id, id))
      .returning();
    
    if (result[0]) {
      // Decrypt content if encrypted
      if (result[0].isEncrypted === "yes" && result[0].content) {
        return { ...result[0], content: decryptMessage(result[0].content) };
      }
      return result[0];
    }
    return undefined;
  }

  async getPinnedMessages(roomId: string): Promise<ChatMessage[]> {
    const messages = await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.roomId, roomId),
        eq(chatMessages.isPinned, "yes"),
        eq(chatMessages.isDeleted, "no")
      ))
      .orderBy(desc(chatMessages.pinnedAt));
    
    // Decrypt messages
    return messages.map(msg => {
      if (msg.isEncrypted === "yes" && msg.content) {
        return { ...msg, content: decryptMessage(msg.content) };
      }
      return msg;
    });
  }

  async searchChatMessages(roomId: string, filters: {
    query?: string;
    senderId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    mediaType?: string;
  }): Promise<ChatMessage[]> {
    const conditions = [
      eq(chatMessages.roomId, roomId),
      eq(chatMessages.isDeleted, "no"),
    ];
    
    if (filters.senderId) {
      conditions.push(eq(chatMessages.senderId, filters.senderId));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(chatMessages.createdAt, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      // Add one day to include the entire day
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(chatMessages.createdAt, endDate));
    }
    
    if (filters.mediaType) {
      if (filters.mediaType === "text") {
        conditions.push(eq(chatMessages.messageType, "text"));
      } else if (filters.mediaType === "media") {
        conditions.push(
          sql`${chatMessages.messageType} IN ('image', 'video', 'voice', 'gif')`
        );
      } else if (filters.mediaType === "files") {
        conditions.push(eq(chatMessages.messageType, "file"));
      }
    }
    
    let messages = await db.select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);
    
    // Decrypt messages
    messages = messages.map(msg => {
      if (msg.isEncrypted === "yes" && msg.content) {
        return { ...msg, content: decryptMessage(msg.content) };
      }
      return msg;
    });
    
    // Filter by query text after decryption
    if (filters.query) {
      const queryLower = filters.query.toLowerCase();
      messages = messages.filter(msg => 
        msg.content?.toLowerCase().includes(queryLower) ||
        msg.senderName?.toLowerCase().includes(queryLower)
      );
    }
    
    return messages;
  }

  // ============================================
  // SCHEDULING CONFLICTS
  // ============================================

  async getSchedulingConflicts(filters?: {
    status?: ConflictStatus;
    severity?: ConflictSeverity;
    conflictType?: SchedulingConflictType;
    clientId?: string;
    staffId?: string;
    appointmentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ conflicts: SchedulingConflict[]; total: number }> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(schedulingConflicts.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(schedulingConflicts.severity, filters.severity));
    }
    if (filters?.conflictType) {
      conditions.push(eq(schedulingConflicts.conflictType, filters.conflictType));
    }
    if (filters?.clientId) {
      conditions.push(eq(schedulingConflicts.clientId, filters.clientId));
    }
    if (filters?.staffId) {
      conditions.push(eq(schedulingConflicts.staffId, filters.staffId));
    }
    if (filters?.appointmentId) {
      conditions.push(eq(schedulingConflicts.appointmentId, filters.appointmentId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schedulingConflicts)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated results
    let query = db.select().from(schedulingConflicts);
    if (whereClause) {
      query = query.where(whereClause) as any;
    }
    
    const conflicts = await query
      .orderBy(
        desc(sql`CASE WHEN ${schedulingConflicts.severity} = 'critical' THEN 3 WHEN ${schedulingConflicts.severity} = 'warning' THEN 2 ELSE 1 END`),
        desc(schedulingConflicts.createdAt)
      )
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);
    
    return { conflicts, total };
  }

  async getSchedulingConflictById(id: string): Promise<SchedulingConflict | undefined> {
    const result = await db.select().from(schedulingConflicts)
      .where(eq(schedulingConflicts.id, id));
    return result[0];
  }

  async getOpenConflictsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(schedulingConflicts)
      .where(eq(schedulingConflicts.status, "open"));
    return Number(result[0]?.count || 0);
  }

  async getConflictsByAppointment(appointmentId: string): Promise<SchedulingConflict[]> {
    return await db.select().from(schedulingConflicts)
      .where(eq(schedulingConflicts.appointmentId, appointmentId))
      .orderBy(desc(schedulingConflicts.createdAt));
  }

  async getConflictsByStaff(staffId: string): Promise<SchedulingConflict[]> {
    return await db.select().from(schedulingConflicts)
      .where(eq(schedulingConflicts.staffId, staffId))
      .orderBy(desc(schedulingConflicts.createdAt));
  }

  async getConflictsByClient(clientId: string): Promise<SchedulingConflict[]> {
    return await db.select().from(schedulingConflicts)
      .where(eq(schedulingConflicts.clientId, clientId))
      .orderBy(desc(schedulingConflicts.createdAt));
  }

  async createSchedulingConflict(conflict: InsertSchedulingConflict): Promise<SchedulingConflict> {
    const result = await db.insert(schedulingConflicts).values(conflict).returning();
    return result[0];
  }

  async updateSchedulingConflict(id: string, updates: Partial<InsertSchedulingConflict>): Promise<SchedulingConflict | undefined> {
    const result = await db.update(schedulingConflicts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schedulingConflicts.id, id))
      .returning();
    return result[0];
  }

  async resolveSchedulingConflict(id: string, resolution: {
    resolvedById: string;
    resolvedByName: string;
    resolutionNotes?: string;
    resolutionAction: "reassigned" | "override_approved" | "appointment_cancelled" | "restriction_updated" | "dismissed" | "auto_resolved";
  }): Promise<SchedulingConflict | undefined> {
    const result = await db.update(schedulingConflicts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedById: resolution.resolvedById,
        resolvedByName: resolution.resolvedByName,
        resolutionNotes: resolution.resolutionNotes,
        resolutionAction: resolution.resolutionAction,
        updatedAt: new Date()
      })
      .where(eq(schedulingConflicts.id, id))
      .returning();
    return result[0];
  }

  async dismissSchedulingConflict(id: string, userId: string, userName: string, notes?: string): Promise<SchedulingConflict | undefined> {
    const result = await db.update(schedulingConflicts)
      .set({
        status: "dismissed",
        resolvedAt: new Date(),
        resolvedById: userId,
        resolvedByName: userName,
        resolutionNotes: notes,
        resolutionAction: "dismissed",
        updatedAt: new Date()
      })
      .where(eq(schedulingConflicts.id, id))
      .returning();
    return result[0];
  }

  async deleteSchedulingConflict(id: string): Promise<boolean> {
    const result = await db.delete(schedulingConflicts)
      .where(eq(schedulingConflicts.id, id))
      .returning();
    return result.length > 0;
  }

  async autoResolveConflictsForAppointment(appointmentId: string): Promise<number> {
    const result = await db.update(schedulingConflicts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolutionAction: "auto_resolved",
        resolutionNotes: "Auto-resolved: Appointment was cancelled or staff reassigned",
        updatedAt: new Date()
      })
      .where(and(
        eq(schedulingConflicts.appointmentId, appointmentId),
        eq(schedulingConflicts.status, "open")
      ))
      .returning();
    return result.length;
  }

  // Scheduled Messages
  async createScheduledMessage(message: InsertScheduledMessage): Promise<ScheduledMessage> {
    const result = await db.insert(scheduledMessages).values({
      ...message,
      scheduledAt: typeof message.scheduledAt === 'string' 
        ? new Date(message.scheduledAt) 
        : message.scheduledAt,
    }).returning();
    return result[0];
  }

  async getScheduledMessages(userId: string, roomId?: string): Promise<ScheduledMessage[]> {
    const conditions = [eq(scheduledMessages.senderId, userId)];
    if (roomId) {
      conditions.push(eq(scheduledMessages.roomId, roomId));
    }
    conditions.push(eq(scheduledMessages.status, "pending"));
    
    return await db.select()
      .from(scheduledMessages)
      .where(and(...conditions))
      .orderBy(scheduledMessages.scheduledAt);
  }

  async getScheduledMessageById(id: string): Promise<ScheduledMessage | undefined> {
    const result = await db.select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.id, id))
      .limit(1);
    return result[0];
  }

  async cancelScheduledMessage(id: string): Promise<ScheduledMessage | undefined> {
    const result = await db.update(scheduledMessages)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
      })
      .where(eq(scheduledMessages.id, id))
      .returning();
    return result[0];
  }

  async getPendingScheduledMessages(): Promise<ScheduledMessage[]> {
    const now = new Date();
    return await db.select()
      .from(scheduledMessages)
      .where(and(
        eq(scheduledMessages.status, "pending"),
        lte(scheduledMessages.scheduledAt, now)
      ))
      .orderBy(scheduledMessages.scheduledAt);
  }

  async markScheduledMessageAsSent(id: string, messageId: string): Promise<ScheduledMessage | undefined> {
    const result = await db.update(scheduledMessages)
      .set({
        status: "sent",
        sentAt: new Date(),
        messageId: messageId,
      })
      .where(eq(scheduledMessages.id, id))
      .returning();
    return result[0];
  }

  async markScheduledMessageAsFailed(id: string): Promise<ScheduledMessage | undefined> {
    const result = await db.update(scheduledMessages)
      .set({
        status: "failed",
      })
      .where(eq(scheduledMessages.id, id))
      .returning();
    return result[0];
  }

  // Workforce Management - Staff Qualifications
  async getStaffQualifications(staffId: string): Promise<StaffQualification[]> {
    return await db.select()
      .from(staffQualifications)
      .where(eq(staffQualifications.staffId, staffId))
      .orderBy(desc(staffQualifications.issuedDate));
  }

  async getStaffQualificationById(id: string): Promise<StaffQualification | undefined> {
    const result = await db.select()
      .from(staffQualifications)
      .where(eq(staffQualifications.id, id))
      .limit(1);
    return result[0];
  }

  async createStaffQualification(qualification: InsertStaffQualification): Promise<StaffQualification> {
    const result = await db.insert(staffQualifications)
      .values(qualification)
      .returning();
    return result[0];
  }

  async updateStaffQualification(id: string, qualification: Partial<InsertStaffQualification>): Promise<StaffQualification | undefined> {
    const result = await db.update(staffQualifications)
      .set(qualification)
      .where(eq(staffQualifications.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffQualification(id: string): Promise<boolean> {
    const result = await db.delete(staffQualifications)
      .where(eq(staffQualifications.id, id))
      .returning();
    return result.length > 0;
  }

  // Staff Emergency Contacts
  async getStaffEmergencyContacts(staffId: string): Promise<StaffEmergencyContact[]> {
    return await db.select()
      .from(staffEmergencyContacts)
      .where(eq(staffEmergencyContacts.staffId, staffId))
      .orderBy(staffEmergencyContacts.priority);
  }

  async getStaffEmergencyContactById(id: string): Promise<StaffEmergencyContact | undefined> {
    const result = await db.select()
      .from(staffEmergencyContacts)
      .where(eq(staffEmergencyContacts.id, id))
      .limit(1);
    return result[0];
  }

  async createStaffEmergencyContact(contact: InsertStaffEmergencyContact): Promise<StaffEmergencyContact> {
    const result = await db.insert(staffEmergencyContacts)
      .values(contact)
      .returning();
    return result[0];
  }

  async updateStaffEmergencyContact(id: string, contact: Partial<InsertStaffEmergencyContact>): Promise<StaffEmergencyContact | undefined> {
    const result = await db.update(staffEmergencyContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(staffEmergencyContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffEmergencyContact(id: string): Promise<boolean> {
    const result = await db.delete(staffEmergencyContacts)
      .where(eq(staffEmergencyContacts.id, id))
      .returning();
    return result.length > 0;
  }

  async unsetPrimaryStaffEmergencyContacts(staffId: string): Promise<void> {
    await db.update(staffEmergencyContacts)
      .set({ isPrimary: "no" })
      .where(eq(staffEmergencyContacts.staffId, staffId));
  }

  // Workforce Management - Staff Blacklist
  async getStaffBlacklist(staffId: string): Promise<StaffBlacklist[]> {
    return await db.select()
      .from(staffBlacklist)
      .where(eq(staffBlacklist.staffId, staffId))
      .orderBy(desc(staffBlacklist.effectiveFrom));
  }

  async getAllActiveBlacklists(): Promise<StaffBlacklist[]> {
    return await db.select()
      .from(staffBlacklist)
      .where(eq(staffBlacklist.isActive, 'yes'))
      .orderBy(desc(staffBlacklist.effectiveFrom));
  }

  async getStaffBlacklistById(id: string): Promise<StaffBlacklist | undefined> {
    const result = await db.select()
      .from(staffBlacklist)
      .where(eq(staffBlacklist.id, id))
      .limit(1);
    return result[0];
  }

  async createStaffBlacklist(blacklist: InsertStaffBlacklist): Promise<StaffBlacklist> {
    const result = await db.insert(staffBlacklist)
      .values(blacklist)
      .returning();
    return result[0];
  }

  async updateStaffBlacklist(id: string, blacklist: Partial<InsertStaffBlacklist>): Promise<StaffBlacklist | undefined> {
    const result = await db.update(staffBlacklist)
      .set(blacklist)
      .where(eq(staffBlacklist.id, id))
      .returning();
    return result[0];
  }

  async deleteStaffBlacklist(id: string): Promise<boolean> {
    const result = await db.delete(staffBlacklist)
      .where(eq(staffBlacklist.id, id))
      .returning();
    return result.length > 0;
  }

  // Workforce Management - Time Clock
  async getTimeClockRecords(staffId: string, startDate?: Date, endDate?: Date): Promise<TimeClockRecord[]> {
    const conditions = [eq(timeClockRecords.staffId, staffId)];
    if (startDate) {
      conditions.push(gte(timeClockRecords.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeClockRecords.timestamp, endDate));
    }
    return await db.select()
      .from(timeClockRecords)
      .where(and(...conditions))
      .orderBy(desc(timeClockRecords.timestamp));
  }

  async getTimeClockRecordById(id: string): Promise<TimeClockRecord | undefined> {
    const result = await db.select()
      .from(timeClockRecords)
      .where(eq(timeClockRecords.id, id))
      .limit(1);
    return result[0];
  }

  async createTimeClockRecord(record: InsertTimeClockRecord): Promise<TimeClockRecord> {
    const result = await db.insert(timeClockRecords)
      .values(record)
      .returning();
    return result[0];
  }

  async updateTimeClockRecord(id: string, record: Partial<InsertTimeClockRecord>): Promise<TimeClockRecord | undefined> {
    const result = await db.update(timeClockRecords)
      .set(record)
      .where(eq(timeClockRecords.id, id))
      .returning();
    return result[0];
  }

  // Workforce Management - Timesheets
  async getTimesheets(staffId?: string, status?: string): Promise<Timesheet[]> {
    const conditions = [];
    if (staffId) {
      conditions.push(eq(timesheets.staffId, staffId));
    }
    if (status) {
      conditions.push(eq(timesheets.status, status));
    }
    const query = conditions.length > 0
      ? db.select().from(timesheets).where(and(...conditions))
      : db.select().from(timesheets);
    return await query.orderBy(desc(timesheets.periodStart));
  }

  async getTimesheetById(id: string): Promise<Timesheet | undefined> {
    const result = await db.select()
      .from(timesheets)
      .where(eq(timesheets.id, id))
      .limit(1);
    return result[0];
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const result = await db.insert(timesheets)
      .values(timesheet)
      .returning();
    return result[0];
  }

  async updateTimesheet(id: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const result = await db.update(timesheets)
      .set(timesheet)
      .where(eq(timesheets.id, id))
      .returning();
    return result[0];
  }

  async deleteTimesheet(id: string): Promise<boolean> {
    const result = await db.delete(timesheets)
      .where(eq(timesheets.id, id))
      .returning();
    return result.length > 0;
  }

  // Workforce Management - Timesheet Entries
  async getTimesheetEntries(timesheetId: string): Promise<TimesheetEntry[]> {
    return await db.select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.timesheetId, timesheetId))
      .orderBy(timesheetEntries.date);
  }

  async getTimesheetEntryById(id: string): Promise<TimesheetEntry | undefined> {
    const result = await db.select()
      .from(timesheetEntries)
      .where(eq(timesheetEntries.id, id))
      .limit(1);
    return result[0];
  }

  async createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry> {
    const result = await db.insert(timesheetEntries)
      .values(entry)
      .returning();
    return result[0];
  }

  async updateTimesheetEntry(id: string, entry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry | undefined> {
    const result = await db.update(timesheetEntries)
      .set(entry)
      .where(eq(timesheetEntries.id, id))
      .returning();
    return result[0];
  }

  async deleteTimesheetEntry(id: string): Promise<boolean> {
    const result = await db.delete(timesheetEntries)
      .where(eq(timesheetEntries.id, id))
      .returning();
    return result.length > 0;
  }

  // Workforce Management - GPS Compliance
  async getGpsComplianceLogs(filters?: { staffId?: string; appointmentId?: string; isCompliant?: boolean }): Promise<GpsComplianceLog[]> {
    const conditions = [];
    if (filters?.staffId) {
      conditions.push(eq(gpsComplianceLogs.staffId, filters.staffId));
    }
    if (filters?.appointmentId) {
      conditions.push(eq(gpsComplianceLogs.appointmentId, filters.appointmentId));
    }
    if (filters?.isCompliant !== undefined) {
      conditions.push(eq(gpsComplianceLogs.isCompliant, filters.isCompliant ? 'yes' : 'no'));
    }
    const query = conditions.length > 0
      ? db.select().from(gpsComplianceLogs).where(and(...conditions))
      : db.select().from(gpsComplianceLogs);
    return await query.orderBy(desc(gpsComplianceLogs.timestamp));
  }

  async getGpsComplianceLogById(id: string): Promise<GpsComplianceLog | undefined> {
    const result = await db.select()
      .from(gpsComplianceLogs)
      .where(eq(gpsComplianceLogs.id, id))
      .limit(1);
    return result[0];
  }

  async createGpsComplianceLog(log: InsertGpsComplianceLog): Promise<GpsComplianceLog> {
    const result = await db.insert(gpsComplianceLogs)
      .values(log)
      .returning();
    return result[0];
  }

  async updateGpsComplianceLog(id: string, log: Partial<InsertGpsComplianceLog>): Promise<GpsComplianceLog | undefined> {
    const result = await db.update(gpsComplianceLogs)
      .set(log)
      .where(eq(gpsComplianceLogs.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
