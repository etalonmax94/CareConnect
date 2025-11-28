import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket, broadcastNotification } from "./websocket";
import { storage } from "./storage";
import { chatAuthorizationService, type ChatAction, type UserContext } from "./services/chatAuthorization";
import { 
  insertClientSchema, updateClientSchema, insertProgressNoteSchema, 
  insertInvoiceSchema, calculateAge, insertBudgetSchema,
  insertIncidentReportSchema, insertPrivacyConsentSchema, insertActivityLogSchema,
  insertStaffSchema, insertSupportCoordinatorSchema, insertPlanManagerSchema, insertNdisServiceSchema,
  insertGPSchema, insertPharmacySchema, insertAlliedHealthProfessionalSchema, insertDocumentSchema, insertClientStaffAssignmentSchema,
  insertServiceDeliverySchema, insertClientGoalSchema,
  insertClientContactSchema, insertClientBehaviorSchema, insertLeadershipMeetingNoteSchema,
  // New schemas for scheduling and care plans
  insertAppointmentSchema, insertAppointmentAssignmentSchema, insertAppointmentCheckinSchema,
  insertClientStaffPreferenceSchema, insertClientStaffRestrictionSchema,
  insertStaffAvailabilityWindowSchema, insertStaffUnavailabilityPeriodSchema, insertStaffStatusLogSchema,
  insertCarePlanSchema, insertCarePlanHealthMatterSchema, insertCarePlanDiagnosisSchema,
  insertCarePlanEmergencyContactSchema, insertCarePlanEmergencyProcedureSchema,
  insertFormTemplateSchema, insertFormTemplateFieldSchema, insertFormSubmissionSchema,
  insertFormSubmissionValueSchema, insertFormSignatureSchema, insertAppointmentTypeRequiredFormSchema,
  insertNonFaceToFaceServiceLogSchema, insertDiagnosisSchema, insertClientDiagnosisSchema,
  insertSilHouseSchema, insertSilHouseAuditLogSchema,
  // Notifications, tickets, and announcements
  insertNotificationSchema, insertSupportTicketSchema, insertTicketCommentSchema, insertAnnouncementSchema,
  insertTaskSchema, insertTaskCommentSchema, insertTaskChecklistSchema,
  insertChatRoomSchema, insertChatRoomParticipantSchema, insertChatMessageSchema,
  insertChatMessageAttachmentSchema, insertChatAuditLogSchema,
  USER_ROLES, type UserRole
} from "@shared/schema";
import { 
  calculateClientCompliance, 
  isClientCompliant, 
  getDocumentStatus,
  REQUIRED_DOCUMENTS,
  ALL_DOCUMENTS,
  type ClinicalDocuments
} from "@shared/compliance";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

// JWT secret for cross-domain auth (use SESSION_SECRET as fallback)
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'empowerlink-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

// Document frequency configuration for auto-calculating expiry dates
const DOCUMENT_FREQUENCIES: Record<string, "annual" | "6-monthly" | "as-needed"> = {
  "Service Agreement": "annual",
  "Consent Form": "annual",
  "Risk Assessment": "annual",
  "Self Assessment (Medx Tool)": "annual",
  "Medication Consent": "annual",
  "Personal Emergency Plan": "annual",
  "Care Plan": "6-monthly",
  "Health Summary": "6-monthly",
  "Wound Care Plan": "as-needed",
  // Other document types default to annual
  "NDIS Plan": "annual",
  "Medical Report": "annual",
  "Progress Report": "annual",
  "Assessment": "annual",
  "Referral": "annual",
  "Certificate": "annual",
  "Policy Document": "annual",
  "Other": "as-needed",
};

// Calculate expiry date based on document type and upload date
function calculateDocumentExpiryDate(documentType: string, uploadDate: Date = new Date()): string | null {
  const frequency = DOCUMENT_FREQUENCIES[documentType] || "annual";
  
  if (frequency === "as-needed") {
    return null; // No expiry for as-needed documents
  }
  
  const expiryDate = new Date(uploadDate);
  if (frequency === "annual") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else if (frequency === "6-monthly") {
    expiryDate.setMonth(expiryDate.getMonth() + 6);
  }
  
  return expiryDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\./g, '_');
}

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = (req as any).params.clientId;
    if (clientId) {
      const clientDir = path.join(uploadsDir, sanitizeFilename(clientId));
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
      }
      cb(null, clientDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = sanitizeFilename(file.originalname);
    cb(null, uniqueSuffix + '-' + safeOriginalName);
  }
});

const uploadPdf = multer({
  storage: storage_config,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Photo upload configuration
const photoStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = (req as any).params.clientId;
    if (clientId) {
      const photosDir = path.join(uploadsDir, 'photos', sanitizeFilename(clientId));
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
      }
      cb(null, photosDir);
    } else {
      cb(new Error('Client ID required'), '');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile${ext}`);
  }
});

const uploadPhoto = multer({
  storage: photoStorageConfig,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for photos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Chat attachment upload configuration
const chatAttachmentDir = path.join(uploadsDir, 'chat-attachments');
if (!fs.existsSync(chatAttachmentDir)) {
  fs.mkdirSync(chatAttachmentDir, { recursive: true });
}

const chatAttachmentStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomId = (req as any).params.roomId;
    if (roomId) {
      const roomDir = path.join(chatAttachmentDir, sanitizeFilename(roomId));
      if (!fs.existsSync(roomDir)) {
        fs.mkdirSync(roomDir, { recursive: true });
      }
      cb(null, roomDir);
    } else {
      cb(new Error('Room ID required'), '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `attachment-${uniqueSuffix}${ext}`);
  }
});

// Allowed MIME types for chat attachments
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB for images
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB for videos

const uploadChatAttachment = multer({
  storage: chatAttachmentStorageConfig,
  limits: { fileSize: MAX_VIDEO_SIZE }, // Use video size as max, validate per type
  fileFilter: (req, file, cb) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
    
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, QuickTime, AVI) are allowed'));
    }
  }
});

// Audit logging helper function
interface AuditLogOptions {
  entityType: string;
  entityId: string;
  entityName?: string;
  operation: "create" | "update" | "delete" | "archive" | "restore";
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  clientId?: string;
  req: Request;
}

async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    const user = (options.req.session as any)?.user;
    // Determine environment: "production" if NODE_ENV is production, otherwise "development"
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    
    await storage.createAuditLog({
      entityType: options.entityType,
      entityId: options.entityId,
      entityName: options.entityName,
      operation: options.operation,
      oldValues: options.oldValues,
      newValues: options.newValues,
      changedFields: options.changedFields,
      userId: user?.id || null,
      userName: user?.displayName || user?.email || 'System',
      userRole: user?.roles?.[0] || null,
      ipAddress: options.req.ip || options.req.headers['x-forwarded-for'] as string || null,
      userAgent: options.req.headers['user-agent'] || null,
      clientId: options.clientId,
      environment: environment,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

// Helper to detect changed fields between old and new values
function getChangedFields(oldValues: Record<string, any>, newValues: Record<string, any>): string[] {
  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
}

// Zoho OAuth Configuration
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_AUTH_URL = "https://accounts.zoho.com.au/oauth/v2/auth";
const ZOHO_TOKEN_URL = "https://accounts.zoho.com.au/oauth/v2/token";
const ZOHO_USER_URL = "https://accounts.zoho.com.au/oauth/user/info";

// Get base URL for redirects
// For Cloud Run, use CLOUD_RUN_URL env var to ensure consistent OAuth callback URL
function getBaseUrl(req: Request): string {
  // Use explicit Cloud Run URL if set (required for OAuth callback consistency)
  if (process.env.CLOUD_RUN_URL) {
    return process.env.CLOUD_RUN_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

// JWT token payload interface
interface JwtPayload {
  userId: string | number;  // UUID string or legacy number ID
  email: string;
  displayName: string;
  roles: UserRole[];
  approvalStatus: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token for cross-domain auth
function generateAuthToken(user: {
  id: number | string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
  approvalStatus: string | null;
}): string {
  const payload: JwtPayload = {
    // Keep userId as string (UUID) - don't try to parse as integer
    userId: user.id,
    email: user.email,
    displayName: user.displayName || user.email,
    roles: user.roles || [],
    approvalStatus: user.approvalStatus || 'pending'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyAuthToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.log("JWT verification failed:", error);
    return null;
  }
}

// Auth middleware - check if user is authenticated (supports both session and JWT)
function requireAuth(req: Request, res: Response, next: NextFunction) {
  // First try session auth
  if (req.session?.user) {
    return next();
  }
  
  // Then try JWT auth from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAuthToken(token);
    if (payload) {
      // Set user info from JWT to request for downstream handlers
      (req as any).jwtUser = payload;
      // Also set to session-like structure for compatibility
      req.session.user = {
        id: String(payload.userId),
        email: payload.email,
        displayName: payload.displayName,
        firstName: null,
        lastName: null,
        roles: payload.roles,
        isFirstLogin: "no",
        approvalStatus: payload.approvalStatus as "approved" | "pending" | "rejected"
      };
      return next();
    }
  }
  
  return res.status(401).json({ error: "Authentication required" });
}

// Auth middleware - check if user has completed role selection
function requireRoles(req: Request, res: Response, next: NextFunction) {
  // First check JWT auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAuthToken(token);
    if (payload) {
      if (!payload.roles || payload.roles.length === 0) {
        return res.status(403).json({ error: "Role selection required", needsRoleSelection: true });
      }
      (req as any).jwtUser = payload;
      req.session.user = {
        id: String(payload.userId),
        email: payload.email,
        displayName: payload.displayName,
        firstName: null,
        lastName: null,
        roles: payload.roles,
        isFirstLogin: "no",
        approvalStatus: payload.approvalStatus as "approved" | "pending" | "rejected"
      };
      return next();
    }
  }
  
  // Fall back to session auth
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.session.user.isFirstLogin === "yes" || req.session.user.roles.length === 0) {
    return res.status(403).json({ error: "Role selection required", needsRoleSelection: true });
  }
  next();
}

// Helper to convert date strings to Date objects
function parseDates(data: any): any {
  if (!data) return data;
  
  const result = { ...data };
  
  // Convert top-level date fields
  if (result.dateOfBirth && typeof result.dateOfBirth === 'string') {
    result.dateOfBirth = result.dateOfBirth || null;
  }
  
  // Convert nested date fields in NDIS details
  if (result.ndisDetails) {
    if (result.ndisDetails.ndisPlanStartDate && typeof result.ndisDetails.ndisPlanStartDate === 'string') {
      result.ndisDetails.ndisPlanStartDate = result.ndisDetails.ndisPlanStartDate || undefined;
    }
    if (result.ndisDetails.ndisPlanEndDate && typeof result.ndisDetails.ndisPlanEndDate === 'string') {
      result.ndisDetails.ndisPlanEndDate = result.ndisDetails.ndisPlanEndDate || undefined;
    }
    if (result.ndisDetails.ndisConsentFormDate && typeof result.ndisDetails.ndisConsentFormDate === 'string') {
      result.ndisDetails.ndisConsentFormDate = result.ndisDetails.ndisConsentFormDate || undefined;
    }
  }
  
  // Convert clinical document dates
  if (result.clinicalDocuments) {
    const dateFields = [
      'serviceAgreementDate', 'consentFormDate', 'riskAssessmentDate',
      'selfAssessmentMedxDate', 'medicationConsentDate', 'personalEmergencyPlanDate',
      'carePlanDate', 'healthSummaryDate', 'woundCarePlanDate'
    ];
    dateFields.forEach(field => {
      if (result.clinicalDocuments[field] && typeof result.clinicalDocuments[field] === 'string') {
        result.clinicalDocuments[field] = result.clinicalDocuments[field] || undefined;
      }
    });
  }
  
  return result;
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Office location: 9/73-75 King Street Caboolture QLD 4510
const OFFICE_LOCATION = {
  address: "9/73-75 King Street, Caboolture QLD 4510",
  lat: -27.0847,
  lon: 152.9511
};

// Suburb coordinates mapping for distance calculation
const SUBURB_COORDS: Record<string, { lat: number; lon: number }> = {
  "caboolture": { lat: -27.0847, lon: 152.9511 },
  "morayfield": { lat: -27.1053, lon: 152.9469 },
  "burpengary": { lat: -27.1564, lon: 152.9583 },
  "narangba": { lat: -27.2039, lon: 152.9639 },
  "deception bay": { lat: -27.1944, lon: 153.0247 },
  "redcliffe": { lat: -27.2297, lon: 153.1089 },
  "bribie island": { lat: -27.0667, lon: 153.1333 },
  "bellmere": { lat: -27.0694, lon: 152.9125 },
  "beachmere": { lat: -27.1208, lon: 153.0461 },
  "brisbane": { lat: -27.4698, lon: 153.0251 },
  "sunshine coast": { lat: -26.6500, lon: 153.0667 },
  "north lakes": { lat: -27.2194, lon: 153.0089 },
  "kallangur": { lat: -27.2469, lon: 152.9853 },
  "petrie": { lat: -27.2756, lon: 152.9783 },
  "strathpine": { lat: -27.3050, lon: 152.9889 },
  "warner": { lat: -27.3111, lon: 152.9469 },
  "albany creek": { lat: -27.3508, lon: 152.9686 },
  "aspley": { lat: -27.3658, lon: 153.0183 },
  "chermside": { lat: -27.3833, lon: 153.0333 },
  "nundah": { lat: -27.4000, lon: 153.0500 }
};

// Calculate distance for a client's address
function getDistanceFromOffice(address: string | null | undefined, suburb?: string | null): number | null {
  // First try to match by suburb field directly (most accurate)
  if (suburb) {
    const suburbLower = suburb.toLowerCase().trim();
    for (const [suburbKey, coords] of Object.entries(SUBURB_COORDS)) {
      if (suburbLower === suburbKey || suburbLower.includes(suburbKey)) {
        const distance = calculateDistance(OFFICE_LOCATION.lat, OFFICE_LOCATION.lon, coords.lat, coords.lon);
        return Math.round(distance * 10) / 10;
      }
    }
  }
  
  // Fall back to checking the full address string
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  for (const [suburbKey, coords] of Object.entries(SUBURB_COORDS)) {
    if (addressLower.includes(suburbKey)) {
      const distance = calculateDistance(OFFICE_LOCATION.lat, OFFICE_LOCATION.lon, coords.lat, coords.lon);
      return Math.round(distance * 10) / 10;
    }
  }
  return null;
}

// Frontend URL for redirects (used in hybrid deployment where frontend is hosted separately)
const FRONTEND_URL = process.env.FRONTEND_URL || '';

// Helper to get redirect URL (uses FRONTEND_URL if set, otherwise relative path)
function getRedirectUrl(path: string): string {
  return FRONTEND_URL ? `${FRONTEND_URL}${path}` : path;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== HEALTH CHECK ====================
  
  // Health check endpoint for Cloud Run and load balancers
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });

  // ==================== AUTH ROUTES ====================
  
  // Get current user session (supports both session and JWT)
  app.get("/api/auth/me", async (req, res) => {
    // Prevent caching of auth status
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    
    // First try session auth
    if (req.session?.user) {
      return res.json({ 
        authenticated: true, 
        user: req.session.user,
        needsRoleSelection: req.session.user.isFirstLogin === "yes" || req.session.user.roles.length === 0
      });
    }
    
    // Then try JWT auth from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAuthToken(token);
      
      if (payload) {
        // Get fresh user data from database (convert userId to string)
        const user = await storage.getUserById(String(payload.userId));
        if (user) {
          const sessionUser = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles as string[],
            isFirstLogin: user.isFirstLogin || "no",
            approvalStatus: user.approvalStatus || "approved"
          };
          return res.json({ 
            authenticated: true, 
            user: sessionUser,
            needsRoleSelection: user.isFirstLogin === "yes" || (user.roles?.length ?? 0) === 0
          });
        }
      }
    }
    
    res.json({ authenticated: false, user: null });
  });

  // Initiate Zoho OAuth login
  app.get("/api/auth/zoho", (req, res) => {
    // Validate Zoho credentials are configured
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
      console.error("Zoho OAuth credentials not configured");
      return res.redirect(getRedirectUrl("/login?error=oauth_not_configured"));
    }
    
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/zoho/callback`;
    
    const authUrl = new URL(ZOHO_AUTH_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", ZOHO_CLIENT_ID);
    authUrl.searchParams.set("scope", "openid,email,profile");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    
    res.redirect(authUrl.toString());
  });

  // Zoho OAuth callback
  app.get("/api/auth/zoho/callback", async (req, res) => {
    console.log("=== ZOHO CALLBACK START ===");
    const { code, error } = req.query;
    const baseUrl = getBaseUrl(req);
    console.log("Base URL:", baseUrl);
    console.log("Code received:", code ? "yes" : "no");
    
    // Validate Zoho credentials are configured
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
      console.error("Zoho OAuth credentials not configured in callback");
      return res.redirect(getRedirectUrl("/login?error=oauth_not_configured"));
    }
    
    if (error) {
      console.error("Zoho OAuth error:", error);
      return res.redirect(getRedirectUrl("/login?error=oauth_error"));
    }
    
    if (!code) {
      console.error("No code received");
      return res.redirect(getRedirectUrl("/login?error=no_code"));
    }
    
    try {
      const redirectUri = `${baseUrl}/api/auth/zoho/callback`;
      
      // Exchange code for tokens
      const tokenResponse = await fetch(ZOHO_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          grant_type: "authorization_code",
          client_id: ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri: redirectUri
        })
      });
      
      const tokens = await tokenResponse.json();
      console.log("=== TOKEN RESPONSE DEBUG ===");
      console.log("Token response status:", tokenResponse.status);
      console.log("Full token response:", JSON.stringify(tokens));
      
      if (tokens.error) {
        console.error("Zoho token error:", tokens);
        return res.redirect(getRedirectUrl("/login?error=token_error"));
      }
      
      console.log("Token keys received:", Object.keys(tokens).join(", "));
      console.log("Has id_token:", tokens.id_token ? "YES" : "NO");
      console.log("Has access_token:", tokens.access_token ? "YES" : "NO");
      
      const { access_token, refresh_token, expires_in, id_token } = tokens;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));
      
      // Decode the id_token JWT to get user info (no need for separate API call)
      let zohoUser: any = {};
      
      if (id_token) {
        console.log("=== DECODING ID_TOKEN ===");
        console.log("id_token length:", id_token.length);
        console.log("id_token preview:", id_token.substring(0, 50) + "...");
        try {
          // JWT has 3 parts: header.payload.signature - we need the payload (middle part)
          const parts = id_token.split('.');
          console.log("JWT parts count:", parts.length);
          const payloadBase64 = parts[1];
          console.log("Payload base64 length:", payloadBase64?.length);
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          console.log("Decoded payload JSON:", payloadJson);
          zohoUser = JSON.parse(payloadJson);
          console.log("Parsed user object keys:", Object.keys(zohoUser).join(", "));
          console.log("User email from id_token:", zohoUser.email);
        } catch (decodeError) {
          console.error("=== ID_TOKEN DECODE ERROR ===");
          console.error("Failed to decode id_token:", decodeError);
        }
      } else {
        console.log("=== NO ID_TOKEN RECEIVED ===");
      }
      
      // If no id_token or decode failed, try the userinfo endpoint as fallback
      if (!zohoUser.email && !zohoUser.sub) {
        console.log("=== FALLBACK TO USERINFO ENDPOINT ===");
        console.log("Calling:", ZOHO_USER_URL);
        const userResponse = await fetch(ZOHO_USER_URL, {
          headers: { "Authorization": `Zoho-oauthtoken ${access_token}` }
        });
        console.log("Userinfo response status:", userResponse.status);
        zohoUser = await userResponse.json();
        console.log("Zoho userinfo response:", JSON.stringify(zohoUser));
      }
      
      // Handle both OIDC format (lowercase) and Zoho API format (capitalized)
      const userEmail = zohoUser.email || zohoUser.Email;
      const userId = zohoUser.sub || zohoUser.ZUID;
      const firstName = zohoUser.first_name || zohoUser.given_name || zohoUser.First_Name;
      const lastName = zohoUser.last_name || zohoUser.family_name || zohoUser.Last_Name;
      const displayName = zohoUser.name || zohoUser.Display_Name || firstName || userEmail;
      
      if (!userEmail) {
        console.error("Failed to get Zoho user info:", zohoUser);
        return res.redirect(getRedirectUrl("/login?error=user_info_error"));
      }
      
      console.log("Zoho user email:", userEmail);
      
      // Pre-approved admin emails - these users are auto-approved with their respective roles
      // Only @empowerlink.au emails are allowed for Zoho sign-on
      const PRE_APPROVED_ADMINS: Record<string, UserRole[]> = {
        "max.bartosh@empowerlink.au": ["director"],
        "sarah.little@empowerlink.au": ["operations_manager"]
      };
      
      // Check if user exists in our database
      let user = await storage.getUserByEmail(userEmail);
      let isNewUser = false;
      
      if (!user) {
        isNewUser = true;
        
        // Check if email is pre-approved admin
        const preApprovedRoles = PRE_APPROVED_ADMINS[userEmail.toLowerCase()];
        
        // Check if email matches existing staff member for auto-linking
        const matchingStaff = await storage.getStaffByEmail(userEmail);
        
        // Determine initial approval status and roles
        let initialApprovalStatus: "approved" | "pending" = "pending";
        let initialRoles: UserRole[] = [];
        
        if (preApprovedRoles) {
          initialApprovalStatus = "approved";
          initialRoles = preApprovedRoles;
          console.log(`Pre-approved admin login: ${userEmail} with roles: ${preApprovedRoles.join(", ")}`);
        }
        
        // Create new user
        user = await storage.createUser({
          zohoUserId: userId,
          email: userEmail,
          displayName: displayName,
          firstName: firstName,
          lastName: lastName,
          roles: initialRoles,
          isFirstLogin: preApprovedRoles ? "no" : "yes",
          isActive: "yes",
          approvalStatus: initialApprovalStatus,
          approvedBy: preApprovedRoles ? "system" : null,
          approvedAt: preApprovedRoles ? new Date() : null,
          staffId: matchingStaff?.id || null,
          zohoAccessToken: access_token,
          zohoRefreshToken: refresh_token,
          zohoTokenExpiresAt: expiresAt
        });
        
        // If matched to staff, update staff record to link back to user
        if (matchingStaff && user) {
          await storage.updateStaff(matchingStaff.id, { userId: user.id });
          console.log(`Auto-linked user ${userEmail} to staff member ${matchingStaff.name}`);
        } else if (user) {
          // Auto-create staff record for Zoho-authenticated user
          const fullName = [firstName, lastName].filter(Boolean).join(' ') || displayName || userEmail.split('@')[0];
          
          // Map Zoho roles to staff roles (staff table has limited role types)
          let staffRole: "support_worker" | "nurse" | "care_manager" | "admin" = "support_worker";
          if (preApprovedRoles) {
            if (preApprovedRoles.includes("director") || preApprovedRoles.includes("operations_manager") || preApprovedRoles.includes("admin")) {
              staffRole = "admin";
            } else if (preApprovedRoles.includes("care_manager") || preApprovedRoles.includes("clinical_manager")) {
              staffRole = "care_manager";
            } else if (preApprovedRoles.includes("registered_nurse") || preApprovedRoles.includes("enrolled_nurse")) {
              staffRole = "nurse";
            }
          }
          
          const newStaff = await storage.createStaff({
            name: fullName,
            email: userEmail,
            role: staffRole,
            userId: user.id,
            isActive: "yes"
          });
          
          // Update user with staffId
          await storage.updateUser(user.id, { staffId: newStaff.id });
          console.log(`Auto-created staff record for Zoho user ${userEmail}: ${newStaff.id}`);
        }
      } else {
        // Update existing user tokens
        await storage.updateUserTokens(user.id, access_token, refresh_token, expiresAt);
        
        // Check if existing user needs a staff record
        if (!user.staffId) {
          const existingStaff = await storage.getStaffByEmail(userEmail);
          if (existingStaff) {
            // Link to existing staff record
            await storage.updateUser(user.id, { staffId: existingStaff.id });
            await storage.updateStaff(existingStaff.id, { userId: user.id });
            console.log(`Linked existing user ${userEmail} to staff ${existingStaff.id}`);
          } else {
            // Create new staff record for existing user
            const fullName = [firstName, lastName].filter(Boolean).join(' ') || displayName || userEmail.split('@')[0];
            
            // Use existing user roles for staff role (staff table has limited role types)
            let staffRole: "support_worker" | "nurse" | "care_manager" | "admin" = "support_worker";
            const userRoles = user.roles || [];
            if (userRoles.includes("director") || userRoles.includes("operations_manager") || userRoles.includes("admin")) {
              staffRole = "admin";
            } else if (userRoles.includes("care_manager") || userRoles.includes("clinical_manager")) {
              staffRole = "care_manager";
            } else if (userRoles.includes("registered_nurse") || userRoles.includes("enrolled_nurse")) {
              staffRole = "nurse";
            }
            
            const newStaff = await storage.createStaff({
              name: fullName,
              email: userEmail,
              role: staffRole,
              userId: user.id,
              isActive: "yes"
            });
            
            await storage.updateUser(user.id, { staffId: newStaff.id });
            console.log(`Auto-created staff record for existing user ${userEmail}: ${newStaff.id}`);
          }
        }
        
        user = await storage.getUserById(user.id);
      }
      
      if (!user) {
        return res.redirect(getRedirectUrl("/?error=user_create_error"));
      }
      
      // Generate JWT token for cross-domain auth
      console.log("=== GENERATING JWT TOKEN ===");
      console.log("User object keys:", Object.keys(user));
      console.log("User ID:", user.id);
      console.log("User ID type:", typeof user.id);
      console.log("User email:", user.email);
      
      const authToken = generateAuthToken({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles as UserRole[],
        approvalStatus: user.approvalStatus
      });
      console.log("Generated auth token for user:", user.email);
      console.log("Token payload userId will be:", user.id);
      
      // Check approval status - pending users go to waiting page
      if (user.approvalStatus === "pending") {
        console.log(`User ${userEmail} is pending approval - redirecting to pending page`);
        
        // Set minimal session for pending user (for same-domain compatibility)
        req.session.userId = user.id;
        req.session.user = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: [],
          isFirstLogin: "yes",
          approvalStatus: "pending"
        };
        
        return req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
          }
          // Include token in redirect URL for cross-domain auth
          res.redirect(getRedirectUrl(`/pending-approval?token=${authToken}`));
        });
      }
      
      // Check if user was rejected
      if (user.approvalStatus === "rejected") {
        console.log(`User ${userEmail} was rejected - redirecting to login with error`);
        return res.redirect(getRedirectUrl("/login?error=access_denied"));
      }
      
      // Set session for approved user (for same-domain compatibility)
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles as string[],
        isFirstLogin: user.isFirstLogin || "no",
        approvalStatus: user.approvalStatus || "approved"
      };
      
      // Explicitly save session before redirecting
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        }
        
        console.log("Session saved successfully for user:", user.email);
        
        // Include token in redirect URL for cross-domain auth
        // Frontend will extract and store the token
        res.redirect(getRedirectUrl(`/?token=${authToken}`));
      });
    } catch (error) {
      console.error("Zoho OAuth callback error:", error);
      res.redirect(getRedirectUrl("/?error=callback_error"));
    }
  });

  // Update user roles (for first login)
  app.post("/api/auth/roles", requireAuth, async (req, res) => {
    try {
      const { roles } = req.body;
      
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ error: "At least one role must be selected" });
      }
      
      // Validate roles
      const validRoles = USER_ROLES.map(r => r.value);
      const invalidRoles = roles.filter((r: string) => !validRoles.includes(r as UserRole));
      if (invalidRoles.length > 0) {
        return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(", ")}` });
      }
      
      const userId = req.session.userId!;
      const updatedUser = await storage.updateUserRoles(userId, roles as UserRole[]);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Re-fetch user from database to ensure session is fully in sync
      const freshUser = await storage.getUserById(userId);
      if (!freshUser) {
        return res.status(404).json({ error: "User not found after update" });
      }
      
      // Update session with fresh data from database
      req.session.user = {
        id: freshUser.id,
        email: freshUser.email,
        displayName: freshUser.displayName,
        firstName: freshUser.firstName,
        lastName: freshUser.lastName,
        roles: freshUser.roles as string[],
        isFirstLogin: freshUser.isFirstLogin || "no"
      };
      
      res.json({ success: true, user: req.session.user });
    } catch (error) {
      console.error("Error updating roles:", error);
      res.status(500).json({ error: "Failed to update roles" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Get available roles
  app.get("/api/auth/roles", (req, res) => {
    res.json(USER_ROLES);
  });

  // Development bypass login (only works in development mode)
  app.post("/api/auth/dev-login", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Dev login not available in production" });
    }
    
    const { name, role } = req.body;
    
    // Create a test user session
    req.session.user = {
      id: "dev-user-001",
      email: "test@empowerlink.local",
      displayName: name || "Test User",
      firstName: name?.split(" ")[0] || "Test",
      lastName: name?.split(" ")[1] || "User",
      roles: [role || "Admin"],
      isFirstLogin: "no"
    };
    
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Failed to create session" });
      }
      res.json({ 
        success: true, 
        user: req.session.user,
        message: "Development login successful"
      });
    });
  });

  // ==================== USER APPROVAL ROUTES ====================
  
  // Get pending users (Director and Operations Manager only)
  app.get("/api/users/pending", requireAuth, async (req, res) => {
    try {
      const userRoles = req.session.user?.roles || [];
      
      // Only Directors and Operations Managers can view pending users
      const canApprove = userRoles.some((role: string) => 
        ["director", "operations_manager"].includes(role)
      );
      
      if (!canApprove) {
        return res.status(403).json({ error: "Not authorized to view pending users" });
      }
      
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ error: "Failed to fetch pending users" });
    }
  });
  
  // Get all users (for admin purposes)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userRoles = req.session.user?.roles || [];
      
      // Only Directors and Operations Managers can view all users
      const canViewAll = userRoles.some((role: string) => 
        ["director", "operations_manager", "admin"].includes(role)
      );
      
      if (!canViewAll) {
        return res.status(403).json({ error: "Not authorized to view users" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Approve a pending user
  app.post("/api/users/:id/approve", requireAuth, async (req, res) => {
    try {
      const userRoles = req.session.user?.roles || [];
      
      // Only Directors and Operations Managers can approve users
      const canApprove = userRoles.some((role: string) => 
        ["director", "operations_manager"].includes(role)
      );
      
      if (!canApprove) {
        return res.status(403).json({ error: "Not authorized to approve users" });
      }
      
      const { roles } = req.body;
      
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ error: "At least one role must be assigned" });
      }
      
      // Validate roles
      const validRoles = USER_ROLES.map(r => r.value);
      const invalidRoles = roles.filter((r: string) => !validRoles.includes(r as UserRole));
      if (invalidRoles.length > 0) {
        return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(", ")}` });
      }
      
      const approvedBy = req.session.user?.email || "Unknown";
      const approvedUser = await storage.approveUser(req.params.id, approvedBy, roles as UserRole[]);
      
      if (!approvedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log the approval action
      await storage.logActivity({
        action: "user_approved",
        description: `User ${approvedUser.email} approved with roles: ${roles.join(", ")}`,
        performedBy: approvedBy
      });
      
      res.json(approvedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ error: "Failed to approve user" });
    }
  });
  
  // Reject a pending user
  app.post("/api/users/:id/reject", requireAuth, async (req, res) => {
    try {
      const userRoles = req.session.user?.roles || [];
      
      // Only Directors and Operations Managers can reject users
      const canReject = userRoles.some((role: string) => 
        ["director", "operations_manager"].includes(role)
      );
      
      if (!canReject) {
        return res.status(403).json({ error: "Not authorized to reject users" });
      }
      
      const { reason } = req.body;
      const rejectedBy = req.session.user?.email || "Unknown";
      const rejectedUser = await storage.rejectUser(req.params.id, rejectedBy);
      
      if (!rejectedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log the rejection action
      await storage.logActivity({
        action: "user_rejected",
        description: `User ${rejectedUser.email} access denied${reason ? `: ${reason}` : ""}`,
        performedBy: rejectedBy
      });
      
      res.json(rejectedUser);
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ error: "Failed to reject user" });
    }
  });
  
  // Update user roles (admin only)
  app.patch("/api/users/:id/roles", requireAuth, async (req, res) => {
    try {
      const userRoles = req.session.user?.roles || [];
      
      // Only Directors and Operations Managers can update roles
      const canUpdateRoles = userRoles.some((role: string) => 
        ["director", "operations_manager"].includes(role)
      );
      
      if (!canUpdateRoles) {
        return res.status(403).json({ error: "Not authorized to update user roles" });
      }
      
      const { roles } = req.body;
      
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({ error: "At least one role must be assigned" });
      }
      
      // Validate roles
      const validRoles = USER_ROLES.map(r => r.value);
      const invalidRoles = roles.filter((r: string) => !validRoles.includes(r as UserRole));
      if (invalidRoles.length > 0) {
        return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(", ")}` });
      }
      
      const updatedUser = await storage.updateUserRoles(req.params.id, roles as UserRole[]);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Log the role update
      await storage.logActivity({
        action: "user_roles_updated",
        description: `User ${updatedUser.email} roles updated to: ${roles.join(", ")}`,
        performedBy: req.session.user?.email || "Unknown"
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user roles:", error);
      res.status(500).json({ error: "Failed to update user roles" });
    }
  });

  // ==================== CLIENT ROUTES ====================

  // Get all clients
  app.get("/api/clients", async (req, res) => {
    try {
      const { search, category } = req.query;
      let clients;
      
      if (search || category) {
        clients = await storage.searchClients(
          search as string || "",
          category as string
        );
      } else {
        clients = await storage.getAllClients();
      }
      
      // Add calculated age field
      const clientsWithAge = clients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      }));
      
      res.json(clientsWithAge);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get active clients (non-archived) - MUST be before :id route
  app.get("/api/clients/active", async (req, res) => {
    try {
      const activeClients = await storage.getActiveClients();
      const clientsWithAge = activeClients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      }));
      res.json(clientsWithAge);
    } catch (error) {
      console.error("Error fetching active clients:", error);
      res.status(500).json({ error: "Failed to fetch active clients" });
    }
  });

  // Get archived clients - MUST be before :id route
  app.get("/api/clients/archived", async (req, res) => {
    try {
      const archivedClients = await storage.getArchivedClients();
      const clientsWithAge = archivedClients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      }));
      res.json(clientsWithAge);
    } catch (error) {
      console.error("Error fetching archived clients:", error);
      res.status(500).json({ error: "Failed to fetch archived clients" });
    }
  });

  // Get client by ID
  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const clientWithAge = {
        ...client,
        age: calculateAge(client.dateOfBirth)
      };
      
      res.json(clientWithAge);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // Generate VCF (vCard) file for client - iPhone contact export (requires authentication and role)
  app.get("/api/clients/:id/vcf", requireAuth, requireRoles, async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Get client contacts for NOK info
      const contacts = await storage.getContactsByClient(req.params.id);
      const nokContacts = contacts.filter(c => c.isNok === "yes" || c.isEmergencyContact === "yes");
      
      // Parse name into components
      const nameParts = client.participantName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Format DOB for vCard (YYYYMMDD format)
      let dobFormatted = '';
      if (client.dateOfBirth) {
        const dob = new Date(client.dateOfBirth);
        if (!isNaN(dob.getTime())) {
          dobFormatted = dob.toISOString().slice(0, 10).replace(/-/g, '');
        }
      }
      
      // Build NOK notes section
      const nokNotes: string[] = [];
      
      // Add contacts marked as NOK or emergency contact
      nokContacts.forEach((contact, index) => {
        const prefix = index === 0 ? 'Next of Kin' : `NOK ${index + 1}`;
        nokNotes.push(`${prefix}: ${contact.name}`);
        if (contact.phoneNumber) nokNotes.push(`${prefix} Phone: ${contact.phoneNumber}`);
        if (contact.relationship) nokNotes.push(`Relationship: ${contact.relationship}`);
      });
      
      // Also include nokEpoa field if set
      if (client.nokEpoa) {
        nokNotes.push(`NOK/EPOA: ${client.nokEpoa}`);
      }
      
      // Add client category and any critical notes
      nokNotes.push(`Category: ${client.category}`);
      if (client.attentionNotes) nokNotes.push(`Attention Notes: ${client.attentionNotes}`);
      
      const notesText = nokNotes.join('\\n');
      
      // Build vCard content
      let vcfContent = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${lastName};${firstName};;;`,
        `FN:${client.participantName}`,
      ];
      
      // Add phone number
      if (client.phoneNumber) {
        vcfContent.push(`TEL;TYPE=CELL:${client.phoneNumber}`);
      }
      
      // Add email
      if (client.email) {
        vcfContent.push(`EMAIL:${client.email}`);
      }
      
      // Add address - prefer separate fields if available, otherwise try to parse homeAddress
      if (client.streetAddress) {
        // Use new separate address fields
        const street = client.streetAddress || '';
        const city = client.suburb || '';
        const state = client.state || '';
        const postcode = client.postcode || '';
        vcfContent.push(`ADR;TYPE=HOME:;;${street};${city};${state};${postcode};Australia`);
        
        // Build label from available parts
        const addressParts = [client.streetAddress, client.suburb, client.state, client.postcode].filter(Boolean);
        vcfContent.push(`LABEL;TYPE=HOME:${addressParts.join(', ')}`);
      } else if (client.homeAddress) {
        // Try to parse legacy homeAddress format
        // Examples: "123 Main St, Sydney NSW 2000", "Unit 5, 12 Example St, Brisbane QLD 4000"
        const addressStr = client.homeAddress;
        
        // Try to extract postcode (4 digits, usually at end)
        const postcodeMatch = addressStr.match(/\b(\d{4})\b(?:\s*$|\s*,)/);
        const extractedPostcode = postcodeMatch ? postcodeMatch[1] : '';
        
        // Try to extract state (NSW, VIC, QLD, etc.)
        const stateMatch = addressStr.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i);
        const extractedState = stateMatch ? stateMatch[1].toUpperCase() : '';
        
        // Split by comma to get address parts
        const parts = addressStr.split(',').map(p => p.trim());
        let extractedStreet = '';
        let extractedCity = '';
        
        if (parts.length >= 3) {
          // Multi-part address like "Unit 5, 12 Example St, Brisbane QLD 4000"
          // Combine first two parts as street (e.g., "Unit 5, 12 Example St")
          extractedStreet = parts.slice(0, -1).join(', ');
          // Last part contains suburb, state, postcode
          extractedCity = parts[parts.length - 1]
            .replace(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/gi, '')
            .replace(/\b\d{4}\b/g, '')
            .trim();
        } else if (parts.length === 2) {
          // Two-part address like "123 Main St, Sydney NSW 2000"
          extractedStreet = parts[0];
          // Remove state and postcode from the second part to get suburb
          extractedCity = parts[1]
            .replace(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/gi, '')
            .replace(/\b\d{4}\b/g, '')
            .trim();
        } else {
          // Single line address, try to extract components
          // Look for pattern: street address followed by suburb state postcode
          const singleLineMatch = addressStr.match(/^(.+?)\s+([A-Za-z\s]+)\s+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*(\d{4})?$/i);
          if (singleLineMatch) {
            extractedStreet = singleLineMatch[1].trim();
            extractedCity = singleLineMatch[2].trim();
          } else {
            // Fallback: use entire address as street, stripped of state/postcode
            extractedStreet = addressStr
              .replace(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/gi, '')
              .replace(/\b\d{4}\b/g, '')
              .trim();
          }
        }
        
        vcfContent.push(`ADR;TYPE=HOME:;;${extractedStreet};${extractedCity};${extractedState};${extractedPostcode};Australia`);
        vcfContent.push(`LABEL;TYPE=HOME:${addressStr}`);
      }
      
      // Add birthday
      if (dobFormatted) {
        vcfContent.push(`BDAY:${dobFormatted}`);
      }
      
      // Add notes (NOK info)
      if (notesText) {
        vcfContent.push(`NOTE:${notesText}`);
      }
      
      // Build notification preferences for organization field
      const notifPrefs = client.notificationPreferences;
      const notifParts: string[] = [];
      if (notifPrefs?.smsArrival || notifPrefs?.smsSchedule) {
        notifParts.push('SMS Arrivals & Schedules');
      }
      if (notifPrefs?.callArrival || notifPrefs?.callSchedule) {
        notifParts.push('Calls Arrivals & Schedules');
      }
      
      // Only add ORG field if there are notification preferences
      if (notifParts.length > 0) {
        vcfContent.push(`ORG:${notifParts.join(', ')}`);
      }
      
      // Add photo if exists
      if (client.photo) {
        try {
          const photoPath = path.join(process.cwd(), client.photo);
          if (fs.existsSync(photoPath)) {
            const photoData = fs.readFileSync(photoPath);
            const base64Photo = photoData.toString('base64');
            const extension = path.extname(client.photo).toLowerCase();
            const photoType = extension === '.png' ? 'PNG' : 'JPEG';
            vcfContent.push(`PHOTO;ENCODING=b;TYPE=${photoType}:${base64Photo}`);
          }
        } catch (photoError) {
          console.error("Error reading photo for VCF:", photoError);
        }
      }
      
      vcfContent.push('END:VCARD');
      
      // Generate filename
      const safeFileName = client.participantName.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Send as VCF file
      res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.vcf"`);
      res.send(vcfContent.join('\r\n'));
      
    } catch (error) {
      console.error("Error generating VCF:", error);
      res.status(500).json({ error: "Failed to generate contact file" });
    }
  });

  // Create client
  app.post("/api/clients", async (req, res) => {
    try {
      const parsedData = parseDates(req.body);
      const validationResult = insertClientSchema.safeParse(parsedData);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        console.error("Validation error:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }
      
      const client = await storage.createClient(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: client.id,
        action: "client_created",
        description: `New client ${client.participantName} was added`,
        performedBy: (req.session as any)?.user?.displayName || "System"
      });
      
      // Create audit log
      await logAudit({
        entityType: "client",
        entityId: client.id,
        entityName: client.participantName,
        operation: "create",
        newValues: validationResult.data as Record<string, unknown>,
        clientId: client.id,
        req
      });
      
      // Auto-create client chat room for the new client with retry
      const createChatRoomWithRetry = async (maxRetries = 3) => {
        const createdById = (req.session as any)?.user?.id || "system";
        const createdByName = (req.session as any)?.user?.displayName || "System";
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await storage.createClientChatRoom(
              client.id, 
              client.participantName, 
              createdById, 
              createdByName
            );
            console.log(`Auto-created chat room for client ${client.participantName}`);
            return true;
          } catch (chatError) {
            console.warn(`Chat room creation attempt ${attempt}/${maxRetries} failed:`, chatError);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
          }
        }
        console.error(`Failed to auto-create client chat room after ${maxRetries} attempts`);
        return false;
      };
      
      // Run async but don't block client creation
      createChatRoomWithRetry().catch(err => 
        console.error("Chat room creation error:", err)
      );
      
      const clientWithAge = {
        ...client,
        age: calculateAge(client.dateOfBirth)
      };
      
      res.status(201).json(clientWithAge);
    } catch (error) {
      console.error("Error creating client:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error details:", errorMessage);
      res.status(500).json({ error: "Failed to create client", details: errorMessage });
    }
  });

  // Update client
  app.patch("/api/clients/:id", async (req, res) => {
    try {
      // Check if client is archived - archived clients are read-only
      const existingClient = await storage.getClientById(req.params.id);
      if (!existingClient) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (existingClient.isArchived === "yes") {
        return res.status(403).json({ error: "Cannot edit archived client. Restore the client first." });
      }
      
      const parsedData = parseDates(req.body);
      const validationResult = updateClientSchema.safeParse(parsedData);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        console.error("Validation error:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }
      
      // Store old values for audit
      const oldValues = { ...existingClient };
      
      const client = await storage.updateClient(req.params.id, validationResult.data);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Log activity
      await storage.logActivity({
        clientId: client.id,
        action: "client_updated",
        description: `Client ${client.participantName} was updated`,
        performedBy: (req.session as any)?.user?.displayName || "System"
      });
      
      // Create audit log with field-level changes
      const changedFields = getChangedFields(oldValues as any, client as any);
      await logAudit({
        entityType: "client",
        entityId: client.id,
        entityName: client.participantName,
        operation: "update",
        oldValues: oldValues as Record<string, unknown>,
        newValues: client as Record<string, unknown>,
        changedFields,
        clientId: client.id,
        req
      });
      
      const clientWithAge = {
        ...client,
        age: calculateAge(client.dateOfBirth)
      };
      
      res.json(clientWithAge);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: "Failed to update client" });
    }
  });

  // Delete client
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      // Get client info before deletion for audit log
      const existingClient = await storage.getClientById(req.params.id);
      
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Create audit log for deletion
      if (existingClient) {
        await logAudit({
          entityType: "client",
          entityId: req.params.id,
          entityName: existingClient.participantName,
          operation: "delete",
          oldValues: existingClient as Record<string, unknown>,
          req
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Archive a client (Australian Privacy Act - 7 year retention)
  app.post("/api/clients/:id/archive", requireAuth, async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: "Archive reason is required" });
      }
      
      const userId = req.session.userId || 'system';
      const client = await storage.archiveClient(req.params.id, userId, reason.trim());
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Log the archive action
      await storage.logActivity({
        clientId: client.id,
        action: "client_archived",
        description: `Client archived. Reason: ${reason.trim()}. Retention until: ${client.retentionUntil}`,
        performedBy: (req.session as any)?.user?.displayName || userId,
      });
      
      // Create audit log for archive
      await logAudit({
        entityType: "client",
        entityId: client.id,
        entityName: client.participantName,
        operation: "archive",
        newValues: { archiveReason: reason.trim(), retentionUntil: client.retentionUntil },
        clientId: client.id,
        req
      });
      
      res.json(client);
    } catch (error) {
      console.error("Error archiving client:", error);
      res.status(500).json({ error: "Failed to archive client" });
    }
  });

  // Restore an archived client
  app.post("/api/clients/:id/restore", requireAuth, async (req, res) => {
    try {
      const client = await storage.restoreClient(req.params.id);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const userId = req.session.userId || 'system';
      
      // Log the restore action
      await storage.logActivity({
        clientId: client.id,
        action: "client_restored",
        description: "Client restored from archive",
        performedBy: (req.session as any)?.user?.displayName || userId,
      });
      
      // Create audit log for restore
      await logAudit({
        entityType: "client",
        entityId: client.id,
        entityName: client.participantName,
        operation: "restore",
        clientId: client.id,
        req
      });
      
      res.json(client);
    } catch (error) {
      console.error("Error restoring client:", error);
      res.status(500).json({ error: "Failed to restore client" });
    }
  });

  // Get distance from office for a client
  app.get("/api/clients/:id/distance", async (req, res) => {
    try {
      const client = await storage.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Combine address fields for display
      const fullAddress = client.streetAddress 
        ? `${client.streetAddress}${client.suburb ? ', ' + client.suburb : ''}${client.state ? ' ' + client.state : ''}${client.postcode ? ' ' + client.postcode : ''}`
        : client.homeAddress;
      
      // Calculate distance using suburb field first, then fall back to full address
      const distanceKm = getDistanceFromOffice(fullAddress, client.suburb);
      
      res.json({
        clientId: client.id,
        address: fullAddress,
        distanceKm,
        officeAddress: OFFICE_LOCATION.address
      });
    } catch (error) {
      console.error("Error fetching client distance:", error);
      res.status(500).json({ error: "Failed to fetch client distance" });
    }
  });

  // Get new clients (last N days)
  app.get("/api/clients/new/:days", async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const clients = await storage.getNewClients(days);
      const clientsWithAge = clients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      }));
      res.json(clientsWithAge);
    } catch (error) {
      console.error("Error fetching new clients:", error);
      res.status(500).json({ error: "Failed to fetch new clients" });
    }
  });

  // Get upcoming birthdays
  app.get("/api/clients/birthdays/:days", async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const clients = await storage.getUpcomingBirthdays(days);
      
      // Calculate days until birthday and age for each client
      // Normalize to start of day for accurate date-only comparisons
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();
      
      const clientsWithBirthdayInfo = clients.map(client => {
        const dob = new Date(client.dateOfBirth!);
        const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
        birthdayThisYear.setHours(0, 0, 0, 0);
        
        // If birthday has already passed this year (strictly before today), check next year
        if (birthdayThisYear.getTime() < today.getTime()) {
          birthdayThisYear.setFullYear(currentYear + 1);
        }
        
        const diffTime = birthdayThisYear.getTime() - today.getTime();
        const daysUntilBirthday = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate turning age
        const turningAge = birthdayThisYear.getFullYear() - dob.getFullYear();
        
        return {
          ...client,
          age: calculateAge(client.dateOfBirth),
          daysUntilBirthday,
          turningAge,
          birthdayDate: birthdayThisYear.toISOString(),
        };
      });
      
      res.json(clientsWithBirthdayInfo);
    } catch (error) {
      console.error("Error fetching upcoming birthdays:", error);
      res.status(500).json({ error: "Failed to fetch upcoming birthdays" });
    }
  });

  // Get distinct diagnoses for autocomplete
  app.get("/api/diagnoses", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const diagnoses = await storage.getDistinctDiagnoses(search);
      res.json(diagnoses);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
      res.status(500).json({ error: "Failed to fetch diagnoses" });
    }
  });

  // Get progress notes for a client
  // Get all progress notes
  app.get("/api/progress-notes", async (req, res) => {
    try {
      const notes = await storage.getAllProgressNotes();
      res.json(notes);
    } catch (error) {
      console.error("Error fetching all progress notes:", error);
      res.status(500).json({ error: "Failed to fetch progress notes" });
    }
  });

  app.get("/api/clients/:id/notes", async (req, res) => {
    try {
      const notes = await storage.getProgressNotesByClientId(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching progress notes:", error);
      res.status(500).json({ error: "Failed to fetch progress notes" });
    }
  });

  // Create progress note
  app.post("/api/clients/:id/notes", async (req, res) => {
    try {
      const validationResult = insertProgressNoteSchema.safeParse({
        ...req.body,
        clientId: req.params.id
      });
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      
      const note = await storage.createProgressNote(validationResult.data);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating progress note:", error);
      res.status(500).json({ error: "Failed to create progress note" });
    }
  });

  // Get invoices for a client
  app.get("/api/clients/:id/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByClientId(req.params.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Create invoice
  app.post("/api/clients/:id/invoices", async (req, res) => {
    try {
      const validationResult = insertInvoiceSchema.safeParse({
        ...req.body,
        clientId: req.params.id
      });
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      
      const invoice = await storage.createInvoice(validationResult.data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Budgets endpoints
  app.get("/api/budgets", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      if (clientId) {
        const budgets = await storage.getBudgetsByClientId(clientId);
        res.json(budgets);
      } else {
        const budgets = await storage.getAllBudgets();
        res.json(budgets);
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.get("/api/budgets/:clientId", async (req, res) => {
    try {
      const budgets = await storage.getBudgetsByClientId(req.params.clientId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const validationResult = insertBudgetSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      
      const budget = await storage.createBudget(validationResult.data);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      const settingsMap: Record<string, any> = {};
      allSettings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting.value);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.upsertSetting(req.params.key, req.body.value);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Activity Log endpoints
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activity = await storage.getRecentActivity(limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  app.get("/api/activity/client/:clientId", async (req, res) => {
    try {
      const activity = await storage.getActivityByClient(req.params.clientId);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching client activity:", error);
      res.status(500).json({ error: "Failed to fetch client activity" });
    }
  });

  app.post("/api/activity", async (req, res) => {
    try {
      const validationResult = insertActivityLogSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      
      const log = await storage.logActivity(validationResult.data);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error logging activity:", error);
      res.status(500).json({ error: "Failed to log activity" });
    }
  });

  // Audit Log endpoints
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const filters = {
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId as string | undefined,
        operation: req.query.operation as string | undefined,
        userId: req.query.userId as string | undefined,
        clientId: req.query.clientId as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };
      
      const result = await storage.getAuditLogs(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit-logs/:id", async (req, res) => {
    try {
      const log = await storage.getAuditLogById(req.params.id);
      if (!log) {
        return res.status(404).json({ error: "Audit log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  // Incident Reports endpoints
  app.get("/api/incidents", async (req, res) => {
    try {
      const incidents = await storage.getAllIncidentReports();
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  app.get("/api/incidents/client/:clientId", async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByClient(req.params.clientId);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching client incidents:", error);
      res.status(500).json({ error: "Failed to fetch client incidents" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    try {
      const validationResult = insertIncidentReportSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      
      const incident = await storage.createIncidentReport(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: incident.clientId,
        action: "incident_reported",
        description: `New ${incident.incidentType} incident reported (${incident.severity} severity)`,
        performedBy: (req.session as any)?.user?.displayName || incident.reportedBy
      });
      
      // Create audit log
      await logAudit({
        entityType: "incident",
        entityId: incident.id,
        entityName: `${incident.incidentType} - ${incident.severity}`,
        operation: "create",
        newValues: validationResult.data as Record<string, unknown>,
        clientId: incident.clientId,
        req
      });
      
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  app.patch("/api/incidents/:id", async (req, res) => {
    try {
      // Get existing incident for audit log
      const existingIncident = await storage.getIncidentsByClient(req.body.clientId || '').then(
        incidents => incidents.find(i => i.id === req.params.id)
      );
      
      const incident = await storage.updateIncidentReport(req.params.id, req.body);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      // Create audit log for update
      const changedFields = existingIncident ? getChangedFields(existingIncident as any, incident as any) : [];
      await logAudit({
        entityType: "incident",
        entityId: incident.id,
        entityName: `${incident.incidentType} - ${incident.severity}`,
        operation: "update",
        oldValues: existingIncident as Record<string, unknown>,
        newValues: incident as Record<string, unknown>,
        changedFields,
        clientId: incident.clientId,
        req
      });
      
      res.json(incident);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ error: "Failed to update incident" });
    }
  });

  // Privacy Consents endpoints
  app.get("/api/consents/client/:clientId", async (req, res) => {
    try {
      const consents = await storage.getConsentsByClient(req.params.clientId);
      res.json(consents);
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ error: "Failed to fetch consents" });
    }
  });

  app.post("/api/consents", async (req, res) => {
    try {
      const validationResult = insertPrivacyConsentSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).toString();
        return res.status(400).json({ error: errorMessage });
      }
      
      const consent = await storage.createPrivacyConsent(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: consent.clientId,
        action: "consent_recorded",
        description: `Privacy consent (${consent.consentType}) recorded`,
        performedBy: "System"
      });
      
      res.status(201).json(consent);
    } catch (error) {
      console.error("Error creating consent:", error);
      res.status(500).json({ error: "Failed to create consent" });
    }
  });

  // Reports endpoints
  app.get("/api/reports/dashboard", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      const newClientsCount = await storage.getNewClientsCount(30);
      const allIncidents = await storage.getAllIncidentReports();
      const allBudgets = await storage.getAllBudgets();
      
      // Filter to only active (non-archived) clients for calculations
      const activeClients = allClients.filter(c => c.isArchived !== "yes");
      
      // Calculate compliance rates using shared compliance utility
      let compliantCount = 0;
      let nonCompliantCount = 0;
      const dueThisMonth: any[] = [];
      const overdueItems: any[] = [];
      
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      activeClients.forEach(client => {
        // Use shared compliance calculation
        const compliance = calculateClientCompliance(client.clinicalDocuments as ClinicalDocuments);
        
        if (isClientCompliant(client.clinicalDocuments as ClinicalDocuments)) {
          compliantCount++;
        } else {
          nonCompliantCount++;
        }
        
        // Collect due/overdue documents from shared compliance result
        compliance.documents.forEach(doc => {
          if (doc.dueDate) {
            const dueDate = new Date(doc.dueDate);
            
            if (doc.status === "overdue") {
              overdueItems.push({
                clientId: client.id,
                clientName: client.participantName,
                documentType: doc.label,
                dueDate: doc.dueDate
              });
            } else if (doc.status === "due-soon" && dueDate <= endOfMonth) {
              dueThisMonth.push({
                clientId: client.id,
                clientName: client.participantName,
                documentType: doc.label,
                dueDate: doc.dueDate
              });
            }
          }
        });
        
        // Also check all trackable documents for due/overdue items
        const docs = client.clinicalDocuments || {};
        ALL_DOCUMENTS.forEach(docDef => {
          const dateValue = docs[docDef.key as keyof typeof docs];
          if (dateValue) {
            const { status, dueDate } = getDocumentStatus(dateValue, docDef.renewalPeriod);
            if (dueDate) {
              const dueDateObj = new Date(dueDate);
              
              if (status === "overdue" && !overdueItems.find(item => 
                item.clientId === client.id && item.documentType === docDef.label
              )) {
                overdueItems.push({
                  clientId: client.id,
                  clientName: client.participantName,
                  documentType: docDef.label,
                  dueDate: dueDate
                });
              } else if (status === "due-soon" && dueDateObj <= endOfMonth && !dueThisMonth.find(item => 
                item.clientId === client.id && item.documentType === docDef.label
              )) {
                dueThisMonth.push({
                  clientId: client.id,
                  clientName: client.participantName,
                  documentType: docDef.label,
                  dueDate: dueDate
                });
              }
            }
          }
        });
      });
      
      // Get open/investigating incidents for action
      const openIncidentsList = allIncidents
        .filter(i => i.status === 'open' || i.status === 'investigating')
        .map(i => ({
          id: i.id,
          clientId: i.clientId,
          incidentType: i.incidentType,
          severity: i.severity,
          status: i.status,
          incidentDate: i.incidentDate,
          description: i.description
        }));
      
      // Get unassigned clients (clients without a care manager in careTeam.careManagerId)
      const unassignedClients = activeClients
        .filter((client) => {
          // Check if careTeam exists and has a careManagerId
          const careTeam = client.careTeam as { careManagerId?: string } | null;
          return !careTeam?.careManagerId;
        })
        .map(c => ({
          id: c.id,
          participantName: c.participantName,
          category: c.category,
          phoneNumber: c.phoneNumber,
          createdAt: c.createdAt
        }));
      
      res.json({
        totalClients: activeClients.length,
        newClients: newClientsCount,
        complianceRate: {
          compliant: compliantCount,
          nonCompliant: nonCompliantCount,
          percentage: activeClients.length > 0 ? Math.round((compliantCount / activeClients.length) * 100) : 0
        },
        dueThisMonth: dueThisMonth.length,
        dueThisMonthItems: dueThisMonth,
        overdueItems: overdueItems.length,
        overdueItemsList: overdueItems,
        openIncidents: openIncidentsList.length,
        openIncidentsList: openIncidentsList,
        unassignedClients: unassignedClients.length,
        unassignedClientsList: unassignedClients,
        totalBudgetAllocated: allBudgets.reduce((sum, b) => sum + parseFloat(b.totalAllocated || "0"), 0),
        totalBudgetUsed: allBudgets.reduce((sum, b) => sum + parseFloat(b.used || "0"), 0)
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/reports/age-demographics", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      const demographics: Record<string, number> = {
        "0-17": 0,
        "18-30": 0,
        "31-45": 0,
        "46-60": 0,
        "61-75": 0,
        "76+": 0
      };
      
      allClients.forEach(client => {
        const age = calculateAge(client.dateOfBirth);
        if (age !== undefined) {
          if (age <= 17) demographics["0-17"]++;
          else if (age <= 30) demographics["18-30"]++;
          else if (age <= 45) demographics["31-45"]++;
          else if (age <= 60) demographics["46-60"]++;
          else if (age <= 75) demographics["61-75"]++;
          else demographics["76+"]++;
        }
      });
      
      res.json(demographics);
    } catch (error) {
      console.error("Error fetching age demographics:", error);
      res.status(500).json({ error: "Failed to fetch age demographics" });
    }
  });

  app.get("/api/reports/incidents", async (req, res) => {
    try {
      const incidents = await storage.getAllIncidentReports();
      
      // Group by month
      const monthlyData: Record<string, { fall: number; medication: number; behavioral: number; injury: number; other: number }> = {};
      
      incidents.forEach(incident => {
        const date = new Date(incident.incidentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { fall: 0, medication: 0, behavioral: 0, injury: 0, other: 0 };
        }
        
        monthlyData[monthKey][incident.incidentType]++;
      });
      
      // Convert to array format for charts
      const chartData = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          ...data,
          total: data.fall + data.medication + data.behavioral + data.injury + data.other
        }));
      
      res.json(chartData);
    } catch (error) {
      console.error("Error fetching incident report:", error);
      res.status(500).json({ error: "Failed to fetch incident report" });
    }
  });

  app.get("/api/reports/budgets", async (req, res) => {
    try {
      const allBudgets = await storage.getAllBudgets();
      const allClients = await storage.getAllClients();
      
      const clientMap = new Map(allClients.map(c => [c.id, c]));
      
      const budgetReport = allBudgets.map(budget => {
        const client = clientMap.get(budget.clientId);
        const allocated = parseFloat(budget.totalAllocated || "0");
        const used = parseFloat(budget.used || "0");
        
        return {
          id: budget.id,
          clientId: budget.clientId,
          clientName: client?.participantName || "Unknown",
          category: budget.category,
          allocated,
          used,
          remaining: allocated - used,
          percentUsed: allocated > 0 ? Math.round((used / allocated) * 100) : 0
        };
      });
      
      res.json(budgetReport);
    } catch (error) {
      console.error("Error fetching budget report:", error);
      res.status(500).json({ error: "Failed to fetch budget report" });
    }
  });

  // Budget alerts - returns budgets at 80%+ or overspent (100%+)
  app.get("/api/reports/budget-alerts", async (req, res) => {
    try {
      const allBudgets = await storage.getAllBudgets();
      const allClients = await storage.getAllClients();
      
      const clientMap = new Map(allClients.map(c => [c.id, c]));
      
      const budgetAlerts = allBudgets
        .map(budget => {
          const client = clientMap.get(budget.clientId);
          const allocated = parseFloat(budget.totalAllocated || "0");
          const used = parseFloat(budget.used || "0");
          const percentUsed = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
          
          return {
            id: budget.id,
            clientId: budget.clientId,
            clientName: client?.participantName || "Unknown",
            category: budget.category,
            allocated,
            used,
            remaining: allocated - used,
            percentUsed,
            alertType: percentUsed >= 100 ? "overspent" as const : percentUsed >= 80 ? "low" as const : null
          };
        })
        .filter(b => b.alertType !== null);
      
      const overspentCount = budgetAlerts.filter(b => b.alertType === "overspent").length;
      const lowCount = budgetAlerts.filter(b => b.alertType === "low").length;
      
      res.json({
        totalAlerts: budgetAlerts.length,
        overspentCount,
        lowCount,
        alerts: budgetAlerts.sort((a, b) => b.percentUsed - a.percentUsed)
      });
    } catch (error) {
      console.error("Error fetching budget alerts:", error);
      res.status(500).json({ error: "Failed to fetch budget alerts" });
    }
  });

  app.get("/api/reports/missing-documents", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      
      const requiredDocs = [
        { key: 'serviceAgreementDate', label: 'Service Agreement' },
        { key: 'consentFormDate', label: 'Consent Form' },
        { key: 'riskAssessmentDate', label: 'Risk Assessment' },
        { key: 'carePlanDate', label: 'Care Plan' },
        { key: 'healthSummaryDate', label: 'Health Summary' }
      ];
      
      const report = allClients.map(client => {
        const docs = client.clinicalDocuments || {};
        const missingDocs = requiredDocs.filter(doc => !docs[doc.key as keyof typeof docs]);
        
        return {
          clientId: client.id,
          clientName: client.participantName,
          category: client.category,
          totalRequired: requiredDocs.length,
          totalMissing: missingDocs.length,
          missingDocuments: missingDocs.map(d => d.label),
          completionRate: Math.round(((requiredDocs.length - missingDocs.length) / requiredDocs.length) * 100)
        };
      }).filter(r => r.totalMissing > 0);
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching missing documents report:", error);
      res.status(500).json({ error: "Failed to fetch missing documents report" });
    }
  });

  app.get("/api/reports/distance", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      
      const distanceReport = allClients.map(client => {
        // Build full address from components
        const fullAddress = client.streetAddress 
          ? `${client.streetAddress}${client.suburb ? ', ' + client.suburb : ''}${client.state ? ' ' + client.state : ''}${client.postcode ? ' ' + client.postcode : ''}`
          : client.homeAddress;
        
        // Calculate distance using suburb field first, then full address
        const distanceKm = getDistanceFromOffice(fullAddress, client.suburb);
        
        // Get coordinates for the matched suburb
        let estimatedCoords = null;
        const suburbToCheck = client.suburb?.toLowerCase().trim() || '';
        for (const [suburbKey, coords] of Object.entries(SUBURB_COORDS)) {
          if (suburbToCheck === suburbKey || suburbToCheck.includes(suburbKey) || 
              (fullAddress && fullAddress.toLowerCase().includes(suburbKey))) {
            estimatedCoords = coords;
            break;
          }
        }
        
        return {
          clientId: client.id,
          clientName: client.participantName,
          address: fullAddress || "No address",
          distanceKm,
          estimatedCoords
        };
      });
      
      res.json({
        officeLocation: OFFICE_LOCATION,
        clients: distanceReport.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
      });
    } catch (error) {
      console.error("Error fetching distance report:", error);
      res.status(500).json({ error: "Failed to fetch distance report" });
    }
  });

  // ==================== FINANCIAL REPORTS ====================

  // Comprehensive financial summary report
  app.get("/api/reports/financial-summary", async (req, res) => {
    try {
      const { startDate, endDate, clientId } = req.query;
      
      const allClients = await storage.getAllClients();
      const allBudgets = await storage.getAllBudgets();
      const allInvoices = await storage.getAllInvoices();
      const allServiceDeliveries = await storage.getAllServiceDeliveries();
      const allStaff = await storage.getAllStaff();
      
      const clientMap = new Map(allClients.map(c => [c.id, c]));
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      
      // Filter by date range if provided
      let filteredDeliveries = allServiceDeliveries;
      let filteredInvoices = allInvoices;
      
      if (startDate) {
        const start = new Date(startDate as string);
        filteredDeliveries = filteredDeliveries.filter(d => new Date(d.deliveredAt) >= start);
        filteredInvoices = filteredInvoices.filter(i => new Date(i.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filteredDeliveries = filteredDeliveries.filter(d => new Date(d.deliveredAt) <= end);
        filteredInvoices = filteredInvoices.filter(i => new Date(i.date) <= end);
      }
      if (clientId) {
        filteredDeliveries = filteredDeliveries.filter(d => d.clientId === clientId);
        filteredInvoices = filteredInvoices.filter(i => i.clientId === clientId);
      }
      
      // Calculate totals
      const totalBudgetAllocated = allBudgets.reduce((sum, b) => sum + parseFloat(b.totalAllocated || "0"), 0);
      const totalBudgetUsed = allBudgets.reduce((sum, b) => sum + parseFloat(b.used || "0"), 0);
      const totalBudgetRemaining = totalBudgetAllocated - totalBudgetUsed;
      
      const totalServiceRevenue = filteredDeliveries
        .filter(d => d.status === "completed")
        .reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
      
      const totalServiceHours = filteredDeliveries
        .filter(d => d.status === "completed")
        .reduce((sum, d) => sum + (parseFloat(d.durationMinutes || "0") / 60), 0);
      
      const invoicePending = filteredInvoices.filter(i => i.status === "pending");
      const invoicePaid = filteredInvoices.filter(i => i.status === "paid");
      const invoiceOverdue = filteredInvoices.filter(i => i.status === "overdue");
      
      const totalPending = invoicePending.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
      const totalPaid = invoicePaid.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
      const totalOverdue = invoiceOverdue.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
      
      // Budget breakdown by category
      const budgetByCategory: Record<string, { allocated: number; used: number; remaining: number }> = {};
      allBudgets.forEach(b => {
        if (!budgetByCategory[b.category]) {
          budgetByCategory[b.category] = { allocated: 0, used: 0, remaining: 0 };
        }
        const allocated = parseFloat(b.totalAllocated || "0");
        const used = parseFloat(b.used || "0");
        budgetByCategory[b.category].allocated += allocated;
        budgetByCategory[b.category].used += used;
        budgetByCategory[b.category].remaining += (allocated - used);
      });
      
      // Service delivery breakdown by client
      const servicesByClient: Record<string, { clientName: string; services: number; revenue: number; hours: number }> = {};
      filteredDeliveries.filter(d => d.status === "completed").forEach(d => {
        const client = clientMap.get(d.clientId);
        if (!servicesByClient[d.clientId]) {
          servicesByClient[d.clientId] = { 
            clientName: client?.participantName || "Unknown", 
            services: 0, 
            revenue: 0, 
            hours: 0 
          };
        }
        servicesByClient[d.clientId].services++;
        servicesByClient[d.clientId].revenue += parseFloat(d.amount || "0");
        servicesByClient[d.clientId].hours += parseFloat(d.durationMinutes || "0") / 60;
      });
      
      res.json({
        summary: {
          totalBudgetAllocated,
          totalBudgetUsed,
          totalBudgetRemaining,
          budgetUtilization: totalBudgetAllocated > 0 ? Math.round((totalBudgetUsed / totalBudgetAllocated) * 100) : 0,
          totalServiceRevenue,
          totalServiceHours: Math.round(totalServiceHours * 10) / 10,
          totalServicesDelivered: filteredDeliveries.filter(d => d.status === "completed").length,
          invoiceSummary: {
            pending: { count: invoicePending.length, amount: totalPending },
            paid: { count: invoicePaid.length, amount: totalPaid },
            overdue: { count: invoiceOverdue.length, amount: totalOverdue }
          }
        },
        budgetByCategory: Object.entries(budgetByCategory).map(([category, data]) => ({
          category,
          ...data,
          utilization: data.allocated > 0 ? Math.round((data.used / data.allocated) * 100) : 0
        })),
        servicesByClient: Object.entries(servicesByClient)
          .map(([clientId, data]) => ({ clientId, ...data }))
          .sort((a, b) => b.revenue - a.revenue),
        reportPeriod: {
          startDate: startDate || null,
          endDate: endDate || null,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ error: "Failed to fetch financial summary" });
    }
  });

  // Detailed service deliveries report
  app.get("/api/reports/service-deliveries", async (req, res) => {
    try {
      const { startDate, endDate, clientId, staffId, status } = req.query;
      
      const allClients = await storage.getAllClients();
      const allStaff = await storage.getAllStaff();
      let deliveries = await storage.getAllServiceDeliveries();
      
      const clientMap = new Map(allClients.map(c => [c.id, c]));
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      
      // Apply filters
      if (startDate) {
        const start = new Date(startDate as string);
        deliveries = deliveries.filter(d => new Date(d.deliveredAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        deliveries = deliveries.filter(d => new Date(d.deliveredAt) <= end);
      }
      if (clientId) {
        deliveries = deliveries.filter(d => d.clientId === clientId);
      }
      if (staffId) {
        deliveries = deliveries.filter(d => d.staffId === staffId);
      }
      if (status) {
        deliveries = deliveries.filter(d => d.status === status);
      }
      
      const report = deliveries.map(d => {
        const client = clientMap.get(d.clientId);
        const staff = d.staffId ? staffMap.get(d.staffId) : null;
        
        return {
          id: d.id,
          date: d.deliveredAt,
          clientId: d.clientId,
          clientName: client?.participantName || "Unknown",
          clientCategory: client?.category || "Unknown",
          staffId: d.staffId,
          staffName: staff?.name || "Unassigned",
          serviceName: d.serviceName,
          serviceCode: d.serviceCode,
          serviceCategory: d.serviceCategory,
          amount: parseFloat(d.amount || "0"),
          durationMinutes: parseFloat(d.durationMinutes || "0"),
          rateType: d.rateType || "weekday",
          status: d.status,
          notes: d.notes
        };
      });
      
      // Calculate totals
      const completedServices = report.filter(r => r.status === "completed");
      const totalRevenue = completedServices.reduce((sum, r) => sum + r.amount, 0);
      const totalHours = completedServices.reduce((sum, r) => sum + (r.durationMinutes / 60), 0);
      
      res.json({
        deliveries: report,
        totals: {
          totalServices: report.length,
          completedServices: completedServices.length,
          cancelledServices: report.filter(r => r.status === "cancelled").length,
          noShowServices: report.filter(r => r.status === "no_show").length,
          totalRevenue,
          totalHours: Math.round(totalHours * 10) / 10
        },
        filters: { startDate, endDate, clientId, staffId, status }
      });
    } catch (error) {
      console.error("Error fetching service deliveries report:", error);
      res.status(500).json({ error: "Failed to fetch service deliveries report" });
    }
  });

  // Detailed invoices report
  app.get("/api/reports/invoices", async (req, res) => {
    try {
      const { startDate, endDate, clientId, status } = req.query;
      
      const allClients = await storage.getAllClients();
      let invoiceList = await storage.getAllInvoices();
      
      const clientMap = new Map(allClients.map(c => [c.id, c]));
      
      // Apply filters
      if (startDate) {
        const start = new Date(startDate as string);
        invoiceList = invoiceList.filter(i => new Date(i.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        invoiceList = invoiceList.filter(i => new Date(i.date) <= end);
      }
      if (clientId) {
        invoiceList = invoiceList.filter(i => i.clientId === clientId);
      }
      if (status) {
        invoiceList = invoiceList.filter(i => i.status === status);
      }
      
      const report = invoiceList.map(i => {
        const client = clientMap.get(i.clientId);
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          date: i.date,
          clientId: i.clientId,
          clientName: client?.participantName || "Unknown",
          clientCategory: client?.category || "Unknown",
          amount: parseFloat(i.amount || "0"),
          status: i.status,
          description: i.description
        };
      });
      
      const pending = report.filter(r => r.status === "pending");
      const paid = report.filter(r => r.status === "paid");
      const overdue = report.filter(r => r.status === "overdue");
      
      res.json({
        invoices: report,
        totals: {
          totalInvoices: report.length,
          totalAmount: report.reduce((sum, r) => sum + r.amount, 0),
          pending: { count: pending.length, amount: pending.reduce((sum, r) => sum + r.amount, 0) },
          paid: { count: paid.length, amount: paid.reduce((sum, r) => sum + r.amount, 0) },
          overdue: { count: overdue.length, amount: overdue.reduce((sum, r) => sum + r.amount, 0) }
        },
        filters: { startDate, endDate, clientId, status }
      });
    } catch (error) {
      console.error("Error fetching invoices report:", error);
      res.status(500).json({ error: "Failed to fetch invoices report" });
    }
  });

  // ==================== STAFF ROUTES ====================
  
  // Get all staff
  app.get("/api/staff", async (req, res) => {
    try {
      const staffList = await storage.getAllStaff();
      res.json(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  // Get staff by ID
  app.get("/api/staff/:id", async (req, res) => {
    try {
      const staffMember = await storage.getStaffById(req.params.id);
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      console.error("Error fetching staff member:", error);
      res.status(500).json({ error: "Failed to fetch staff member" });
    }
  });

  // Create staff
  app.post("/api/staff", async (req, res) => {
    try {
      const validationResult = insertStaffSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const staffMember = await storage.createStaff(validationResult.data);
      res.status(201).json(staffMember);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ error: "Failed to create staff member" });
    }
  });

  // Update staff
  app.patch("/api/staff/:id", async (req, res) => {
    try {
      const staffMember = await storage.updateStaff(req.params.id, req.body);
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ error: "Failed to update staff member" });
    }
  });

  // Delete staff
  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStaff(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ error: "Failed to delete staff member" });
    }
  });

  // ==================== SUPPORT COORDINATORS ROUTES ====================
  
  // Get all support coordinators
  app.get("/api/support-coordinators", async (req, res) => {
    try {
      const coordinators = await storage.getAllSupportCoordinators();
      res.json(coordinators);
    } catch (error) {
      console.error("Error fetching support coordinators:", error);
      res.status(500).json({ error: "Failed to fetch support coordinators" });
    }
  });

  // Get support coordinator by ID
  app.get("/api/support-coordinators/:id", async (req, res) => {
    try {
      const coordinator = await storage.getSupportCoordinatorById(req.params.id);
      if (!coordinator) {
        return res.status(404).json({ error: "Support coordinator not found" });
      }
      res.json(coordinator);
    } catch (error) {
      console.error("Error fetching support coordinator:", error);
      res.status(500).json({ error: "Failed to fetch support coordinator" });
    }
  });

  // Create support coordinator
  app.post("/api/support-coordinators", async (req, res) => {
    try {
      const validationResult = insertSupportCoordinatorSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const coordinator = await storage.createSupportCoordinator(validationResult.data);
      res.status(201).json(coordinator);
    } catch (error) {
      console.error("Error creating support coordinator:", error);
      res.status(500).json({ error: "Failed to create support coordinator" });
    }
  });

  // Update support coordinator
  app.patch("/api/support-coordinators/:id", async (req, res) => {
    try {
      const coordinator = await storage.updateSupportCoordinator(req.params.id, req.body);
      if (!coordinator) {
        return res.status(404).json({ error: "Support coordinator not found" });
      }
      res.json(coordinator);
    } catch (error) {
      console.error("Error updating support coordinator:", error);
      res.status(500).json({ error: "Failed to update support coordinator" });
    }
  });

  // Delete support coordinator
  app.delete("/api/support-coordinators/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSupportCoordinator(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Support coordinator not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting support coordinator:", error);
      res.status(500).json({ error: "Failed to delete support coordinator" });
    }
  });

  // ==================== PLAN MANAGERS ROUTES ====================
  
  // Get all plan managers
  app.get("/api/plan-managers", async (req, res) => {
    try {
      const managers = await storage.getAllPlanManagers();
      res.json(managers);
    } catch (error) {
      console.error("Error fetching plan managers:", error);
      res.status(500).json({ error: "Failed to fetch plan managers" });
    }
  });

  // Get plan manager by ID
  app.get("/api/plan-managers/:id", async (req, res) => {
    try {
      const manager = await storage.getPlanManagerById(req.params.id);
      if (!manager) {
        return res.status(404).json({ error: "Plan manager not found" });
      }
      res.json(manager);
    } catch (error) {
      console.error("Error fetching plan manager:", error);
      res.status(500).json({ error: "Failed to fetch plan manager" });
    }
  });

  // Create plan manager
  app.post("/api/plan-managers", async (req, res) => {
    try {
      const validationResult = insertPlanManagerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const manager = await storage.createPlanManager(validationResult.data);
      res.status(201).json(manager);
    } catch (error) {
      console.error("Error creating plan manager:", error);
      res.status(500).json({ error: "Failed to create plan manager" });
    }
  });

  // Update plan manager
  app.patch("/api/plan-managers/:id", async (req, res) => {
    try {
      const manager = await storage.updatePlanManager(req.params.id, req.body);
      if (!manager) {
        return res.status(404).json({ error: "Plan manager not found" });
      }
      res.json(manager);
    } catch (error) {
      console.error("Error updating plan manager:", error);
      res.status(500).json({ error: "Failed to update plan manager" });
    }
  });

  // Delete plan manager
  app.delete("/api/plan-managers/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePlanManager(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Plan manager not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plan manager:", error);
      res.status(500).json({ error: "Failed to delete plan manager" });
    }
  });

  // ==================== GP (GENERAL PRACTITIONERS) ROUTES ====================
  
  // Get all GPs
  app.get("/api/gps", async (req, res) => {
    try {
      const gps = await storage.getAllGPs();
      res.json(gps);
    } catch (error) {
      console.error("Error fetching GPs:", error);
      res.status(500).json({ error: "Failed to fetch GPs" });
    }
  });

  // Get GP by ID
  app.get("/api/gps/:id", async (req, res) => {
    try {
      const gp = await storage.getGPById(req.params.id);
      if (!gp) {
        return res.status(404).json({ error: "GP not found" });
      }
      res.json(gp);
    } catch (error) {
      console.error("Error fetching GP:", error);
      res.status(500).json({ error: "Failed to fetch GP" });
    }
  });

  // Create GP
  app.post("/api/gps", async (req, res) => {
    try {
      const validationResult = insertGPSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const gp = await storage.createGP(validationResult.data);
      res.status(201).json(gp);
    } catch (error) {
      console.error("Error creating GP:", error);
      res.status(500).json({ error: "Failed to create GP" });
    }
  });

  // Update GP
  app.patch("/api/gps/:id", async (req, res) => {
    try {
      const gp = await storage.updateGP(req.params.id, req.body);
      if (!gp) {
        return res.status(404).json({ error: "GP not found" });
      }
      res.json(gp);
    } catch (error) {
      console.error("Error updating GP:", error);
      res.status(500).json({ error: "Failed to update GP" });
    }
  });

  // Delete GP
  app.delete("/api/gps/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGP(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "GP not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting GP:", error);
      res.status(500).json({ error: "Failed to delete GP" });
    }
  });

  // ==================== PHARMACIES ROUTES ====================
  
  // Get all pharmacies
  app.get("/api/pharmacies", async (req, res) => {
    try {
      const pharmacies = await storage.getAllPharmacies();
      res.json(pharmacies);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
      res.status(500).json({ error: "Failed to fetch pharmacies" });
    }
  });

  // Get pharmacy by ID
  app.get("/api/pharmacies/:id", async (req, res) => {
    try {
      const pharmacy = await storage.getPharmacyById(req.params.id);
      if (!pharmacy) {
        return res.status(404).json({ error: "Pharmacy not found" });
      }
      res.json(pharmacy);
    } catch (error) {
      console.error("Error fetching pharmacy:", error);
      res.status(500).json({ error: "Failed to fetch pharmacy" });
    }
  });

  // Create pharmacy
  app.post("/api/pharmacies", async (req, res) => {
    try {
      const validationResult = insertPharmacySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const pharmacy = await storage.createPharmacy(validationResult.data);
      res.status(201).json(pharmacy);
    } catch (error) {
      console.error("Error creating pharmacy:", error);
      res.status(500).json({ error: "Failed to create pharmacy" });
    }
  });

  // Update pharmacy
  app.patch("/api/pharmacies/:id", async (req, res) => {
    try {
      const pharmacy = await storage.updatePharmacy(req.params.id, req.body);
      if (!pharmacy) {
        return res.status(404).json({ error: "Pharmacy not found" });
      }
      res.json(pharmacy);
    } catch (error) {
      console.error("Error updating pharmacy:", error);
      res.status(500).json({ error: "Failed to update pharmacy" });
    }
  });

  // Delete pharmacy
  app.delete("/api/pharmacies/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePharmacy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Pharmacy not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pharmacy:", error);
      res.status(500).json({ error: "Failed to delete pharmacy" });
    }
  });

  // ==================== ALLIED HEALTH PROFESSIONALS ROUTES ====================
  
  // Get all allied health professionals
  app.get("/api/allied-health-professionals", async (req, res) => {
    try {
      const ahps = await storage.getAllAlliedHealthProfessionals();
      res.json(ahps);
    } catch (error) {
      console.error("Error fetching allied health professionals:", error);
      res.status(500).json({ error: "Failed to fetch allied health professionals" });
    }
  });

  // Get allied health professional by ID
  app.get("/api/allied-health-professionals/:id", async (req, res) => {
    try {
      const ahp = await storage.getAlliedHealthProfessionalById(req.params.id);
      if (!ahp) {
        return res.status(404).json({ error: "Allied health professional not found" });
      }
      res.json(ahp);
    } catch (error) {
      console.error("Error fetching allied health professional:", error);
      res.status(500).json({ error: "Failed to fetch allied health professional" });
    }
  });

  // Create allied health professional
  app.post("/api/allied-health-professionals", async (req, res) => {
    try {
      const validationResult = insertAlliedHealthProfessionalSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const ahp = await storage.createAlliedHealthProfessional(validationResult.data);
      res.status(201).json(ahp);
    } catch (error) {
      console.error("Error creating allied health professional:", error);
      res.status(500).json({ error: "Failed to create allied health professional" });
    }
  });

  // Update allied health professional
  app.patch("/api/allied-health-professionals/:id", async (req, res) => {
    try {
      const ahp = await storage.updateAlliedHealthProfessional(req.params.id, req.body);
      if (!ahp) {
        return res.status(404).json({ error: "Allied health professional not found" });
      }
      res.json(ahp);
    } catch (error) {
      console.error("Error updating allied health professional:", error);
      res.status(500).json({ error: "Failed to update allied health professional" });
    }
  });

  // Delete allied health professional
  app.delete("/api/allied-health-professionals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAlliedHealthProfessional(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Allied health professional not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting allied health professional:", error);
      res.status(500).json({ error: "Failed to delete allied health professional" });
    }
  });

  // Get clients by allied health professional ID
  app.get("/api/allied-health-professionals/:id/clients", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      const clients = allClients.filter(c => c.careTeam?.alliedHealthProfessionalId === req.params.id);
      res.json(clients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      })));
    } catch (error) {
      console.error("Error fetching clients for allied health professional:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // ==================== NDIS SERVICES ROUTES ====================
  
  // Get NDIS services by client
  app.get("/api/clients/:clientId/ndis-services", async (req, res) => {
    try {
      const services = await storage.getNdisServicesByClient(req.params.clientId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching NDIS services:", error);
      res.status(500).json({ error: "Failed to fetch NDIS services" });
    }
  });

  // Create NDIS service
  app.post("/api/clients/:clientId/ndis-services", async (req, res) => {
    try {
      const validationResult = insertNdisServiceSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const service = await storage.createNdisService(validationResult.data);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating NDIS service:", error);
      res.status(500).json({ error: "Failed to create NDIS service" });
    }
  });

  // Update NDIS service
  app.patch("/api/ndis-services/:id", async (req, res) => {
    try {
      const service = await storage.updateNdisService(req.params.id, req.body);
      if (!service) {
        return res.status(404).json({ error: "NDIS service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error updating NDIS service:", error);
      res.status(500).json({ error: "Failed to update NDIS service" });
    }
  });

  // Delete NDIS service
  app.delete("/api/ndis-services/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNdisService(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "NDIS service not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting NDIS service:", error);
      res.status(500).json({ error: "Failed to delete NDIS service" });
    }
  });

  // Get clients by support coordinator ID
  app.get("/api/support-coordinators/:id/clients", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      const clients = allClients.filter(c => c.careTeam?.supportCoordinatorId === req.params.id);
      res.json(clients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      })));
    } catch (error) {
      console.error("Error fetching coordinator clients:", error);
      res.status(500).json({ error: "Failed to fetch coordinator clients" });
    }
  });

  // Get clients by plan manager ID
  app.get("/api/plan-managers/:id/clients", async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      const clients = allClients.filter(c => c.careTeam?.planManagerId === req.params.id);
      res.json(clients.map(client => ({
        ...client,
        age: calculateAge(client.dateOfBirth)
      })));
    } catch (error) {
      console.error("Error fetching plan manager clients:", error);
      res.status(500).json({ error: "Failed to fetch plan manager clients" });
    }
  });

  // ==================== DOCUMENT ROUTES ====================
  
  // Get documents by client
  app.get("/api/clients/:clientId/documents", async (req, res) => {
    try {
      const docs = await storage.getDocumentsByClient(req.params.clientId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Create document (metadata only - file URL from external storage)
  app.post("/api/clients/:clientId/documents", async (req, res) => {
    try {
      const validationResult = insertDocumentSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const document = await storage.createDocument(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.clientId,
        action: "document_uploaded",
        description: `Document ${document.fileName} was uploaded`,
        performedBy: (req.session as any)?.user?.displayName || "System"
      });
      
      // Create audit log
      await logAudit({
        entityType: "document",
        entityId: document.id,
        entityName: document.fileName,
        operation: "create",
        newValues: validationResult.data as Record<string, unknown>,
        clientId: req.params.clientId,
        req
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Update document (requires authentication) - allows manual expiry date override
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { expiryDate, uploadDate } = req.body;
      
      // Get existing document
      const existingDoc = await storage.getDocumentById(req.params.id);
      if (!existingDoc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Build update object
      const updates: { expiryDate?: string | null; uploadDate?: string } = {};
      
      if (expiryDate !== undefined) {
        // Allow null to clear expiry date, or a valid date string
        updates.expiryDate = expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null;
      }
      
      if (uploadDate !== undefined) {
        updates.uploadDate = new Date(uploadDate).toISOString();
      }
      
      const updatedDoc = await storage.updateDocument(req.params.id, updates);
      
      // Log activity
      await storage.logActivity({
        clientId: existingDoc.clientId,
        action: "document_updated",
        description: `Document ${existingDoc.fileName} dates updated`,
        performedBy: (req.session as any)?.user?.displayName || "System"
      });
      
      // Create audit log
      await logAudit({
        entityType: "document",
        entityId: req.params.id,
        entityName: existingDoc.fileName,
        operation: "update",
        oldValues: { expiryDate: existingDoc.expiryDate, uploadDate: existingDoc.uploadDate },
        newValues: updates as Record<string, unknown>,
        clientId: existingDoc.clientId,
        req
      });
      
      res.json(updatedDoc);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Delete document (requires authentication)
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get document info before deletion for audit log
      const existingDoc = await storage.getDocumentById(req.params.id);
      
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Log the deletion
      await storage.logActivity({
        clientId: existingDoc?.clientId || null,
        action: "document_deleted",
        description: `Document ${existingDoc?.fileName || ''} was deleted`,
        performedBy: (req.session as any)?.user?.displayName || req.session.user.email || "Unknown"
      });
      
      // Create audit log for deletion
      if (existingDoc) {
        await logAudit({
          entityType: "document",
          entityId: req.params.id,
          entityName: existingDoc.fileName,
          operation: "delete",
          oldValues: existingDoc as Record<string, unknown>,
          clientId: existingDoc.clientId,
          req
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Archive document
  app.post("/api/documents/:id/archive", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const existingDoc = await storage.getDocumentById(req.params.id);
      if (!existingDoc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const archivedDoc = await storage.archiveDocument(req.params.id, req.session.user.id || req.session.user.email);
      
      await storage.logActivity({
        clientId: existingDoc.clientId,
        action: "document_archived",
        description: `Document ${existingDoc.fileName} was archived`,
        performedBy: req.session.user.displayName || req.session.user.email || "System"
      });
      
      res.json(archivedDoc);
    } catch (error) {
      console.error("Error archiving document:", error);
      res.status(500).json({ error: "Failed to archive document" });
    }
  });

  // Unarchive document
  app.post("/api/documents/:id/unarchive", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const existingDoc = await storage.getDocumentById(req.params.id);
      if (!existingDoc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const unarchivedDoc = await storage.unarchiveDocument(req.params.id);
      
      await storage.logActivity({
        clientId: existingDoc.clientId,
        action: "document_unarchived",
        description: `Document ${existingDoc.fileName} was restored from archive`,
        performedBy: req.session.user.displayName || req.session.user.email || "System"
      });
      
      res.json(unarchivedDoc);
    } catch (error) {
      console.error("Error unarchiving document:", error);
      res.status(500).json({ error: "Failed to unarchive document" });
    }
  });

  // Update document (full update including custom title, folder)
  app.put("/api/documents/:id", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const existingDoc = await storage.getDocumentById(req.params.id);
      if (!existingDoc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const { customTitle, folderId, subFolderId, expiryDate, uploadDate } = req.body;
      const updates: any = {};
      
      if (customTitle !== undefined) updates.customTitle = customTitle;
      if (folderId !== undefined) updates.folderId = folderId;
      if (subFolderId !== undefined) updates.subFolderId = subFolderId;
      if (expiryDate !== undefined) updates.expiryDate = expiryDate;
      if (uploadDate !== undefined) updates.uploadDate = new Date(uploadDate);
      
      const updatedDoc = await storage.updateDocumentFull(req.params.id, updates);
      
      await storage.logActivity({
        clientId: existingDoc.clientId,
        action: "document_updated",
        description: `Document ${existingDoc.fileName} was updated`,
        performedBy: req.session.user.displayName || req.session.user.email || "System"
      });
      
      res.json(updatedDoc);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Search documents globally
  app.get("/api/documents/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search term required" });
      }
      
      const docs = await storage.searchDocuments(q);
      res.json(docs);
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ error: "Failed to search documents" });
    }
  });

  // Get client document folder overrides
  app.get("/api/clients/:clientId/document-folders", async (req, res) => {
    try {
      const folders = await storage.getClientDocumentFolders(req.params.clientId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching document folders:", error);
      res.status(500).json({ error: "Failed to fetch document folders" });
    }
  });

  // Create/Update client document folder override
  app.post("/api/clients/:clientId/document-folders", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { folderId, customName, isHidden, sortOrder } = req.body;
      if (!folderId) {
        return res.status(400).json({ error: "Folder ID is required" });
      }
      
      const folder = await storage.upsertClientDocumentFolder({
        clientId: req.params.clientId,
        folderId,
        customName,
        isHidden,
        sortOrder,
      });
      
      res.json(folder);
    } catch (error) {
      console.error("Error saving document folder:", error);
      res.status(500).json({ error: "Failed to save document folder" });
    }
  });

  // Delete client document folder override
  app.delete("/api/clients/:clientId/document-folders/:folderId", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const folder = await storage.getClientDocumentFolder(req.params.clientId, req.params.folderId);
      if (!folder) {
        return res.status(404).json({ error: "Folder override not found" });
      }
      
      await storage.deleteClientDocumentFolder(folder.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document folder:", error);
      res.status(500).json({ error: "Failed to delete document folder" });
    }
  });

  // Get client document compliance overrides
  app.get("/api/clients/:clientId/document-compliance", async (req, res) => {
    try {
      const compliance = await storage.getClientDocumentCompliance(req.params.clientId);
      res.json(compliance);
    } catch (error) {
      console.error("Error fetching document compliance:", error);
      res.status(500).json({ error: "Failed to fetch document compliance" });
    }
  });

  // Create/Update client document compliance override (mark as "Not Required")
  app.post("/api/clients/:clientId/document-compliance", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { documentType, isNotRequired, notRequiredReason } = req.body;
      if (!documentType) {
        return res.status(400).json({ error: "Document type is required" });
      }
      
      const compliance = await storage.upsertClientDocumentCompliance({
        clientId: req.params.clientId,
        documentType,
        isNotRequired: isNotRequired || "no",
        notRequiredReason,
        notRequiredBy: req.session.user.id || req.session.user.email,
        notRequiredAt: isNotRequired === "yes" ? new Date() : undefined,
      });
      
      await storage.logActivity({
        clientId: req.params.clientId,
        action: isNotRequired === "yes" ? "document_marked_not_required" : "document_requirement_restored",
        description: `Document "${documentType}" ${isNotRequired === "yes" ? 'marked as not required' : 'requirement restored'}${notRequiredReason ? `: ${notRequiredReason}` : ''}`,
        performedBy: req.session.user.displayName || req.session.user.email || "System"
      });
      
      res.json(compliance);
    } catch (error) {
      console.error("Error saving document compliance:", error);
      res.status(500).json({ error: "Failed to save document compliance" });
    }
  });

  // Delete client document compliance override
  app.delete("/api/clients/:clientId/document-compliance/:documentType", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const compliance = await storage.getClientDocumentComplianceByType(req.params.clientId, req.params.documentType);
      if (!compliance) {
        return res.status(404).json({ error: "Compliance override not found" });
      }
      
      await storage.deleteClientDocumentCompliance(compliance.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document compliance:", error);
      res.status(500).json({ error: "Failed to delete document compliance" });
    }
  });

  // Upload document file (PDF)
  app.post("/api/clients/:clientId/documents/upload", (req, res, next) => {
    uploadPdf.single("file")(req, res, (err) => {
      if (err) {
        // Handle multer errors
        if (err.message === 'Only PDF files are allowed') {
          return res.status(400).json({ error: "Only PDF files are allowed. Please select a PDF document." });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File is too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ error: err.message || "File upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Please select a PDF file." });
      }

      const { documentType, fileName, folderId, subFolderId, customTitle } = req.body;
      if (!documentType) {
        return res.status(400).json({ error: "Document type is required" });
      }
      
      // Accept any document type for comprehensive document storage
      // Standard tracked document types will get automatic expiry calculation

      // Auto-calculate expiry date based on document type and upload date
      const uploadDate = new Date();
      const autoExpiryDate = calculateDocumentExpiryDate(documentType, uploadDate);

      // Create a URL to serve the uploaded file with client ID for authorization
      const safeClientId = sanitizeFilename(req.params.clientId);
      const fileUrl = `/uploads/${safeClientId}/${req.file.filename}`;
      
      const document = await storage.createDocument({
        clientId: req.params.clientId,
        documentType,
        fileName: fileName || req.file.originalname,
        fileUrl,
        expiryDate: autoExpiryDate,
        folderId: folderId || null,
        subFolderId: subFolderId || null,
        customTitle: customTitle || null,
      });

      // Log activity with auto-calculated expiry info
      const frequency = DOCUMENT_FREQUENCIES[documentType] || "annual";
      await storage.logActivity({
        clientId: req.params.clientId,
        action: "document_uploaded",
        description: `Document ${document.fileName} was uploaded (${frequency} review, ${autoExpiryDate ? `expires: ${autoExpiryDate}` : 'no expiry'})`,
        performedBy: req.session.user.email || "System"
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Upload client profile photo
  app.post("/api/clients/:clientId/photo", uploadPhoto.single("photo"), async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        console.log("Photo upload failed - no session:", {
          sessionId: req.session?.id,
          hasSession: !!req.session,
          hasUser: !!req.session?.user,
          cookies: req.headers.cookie ? 'present' : 'missing'
        });
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No photo uploaded" });
      }

      const clientId = req.params.clientId;
      
      // Verify client exists
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Create photo URL
      const safeClientId = sanitizeFilename(clientId);
      const photoUrl = `/uploads/photos/${safeClientId}/${req.file.filename}`;
      
      // Update client with photo URL
      await storage.updateClient(clientId, { photo: photoUrl });

      // Log activity
      await storage.logActivity({
        clientId,
        action: "photo_uploaded",
        description: `Profile photo was uploaded for ${client.participantName}`,
        performedBy: req.session.user.email || "System"
      });

      res.status(200).json({ success: true, photoUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  // Serve client profile photos
  app.get("/uploads/photos/:clientId/:filename", async (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { clientId, filename } = req.params;
    const safeClientId = sanitizeFilename(clientId);
    const safeFilename = sanitizeFilename(filename);
    
    try {
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      const filePath = path.join(uploadsDir, 'photos', safeClientId, safeFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Photo not found" });
      }
      
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving photo:", error);
      res.status(500).json({ error: "Failed to serve photo" });
    }
  });

  // Serve uploaded files with client authorization
  app.get("/uploads/:clientId/:filename", async (req, res) => {
    // Basic security check - ensure user is authenticated
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { clientId, filename } = req.params;
    
    // Sanitize to prevent path traversal
    const safeClientId = sanitizeFilename(clientId);
    const safeFilename = sanitizeFilename(filename);
    
    // Prevent any attempt to traverse directories
    if (safeClientId !== clientId || safeFilename !== filename) {
      return res.status(400).json({ error: "Invalid request" });
    }
    
    try {
      // Verify the client exists
      const client = await storage.getClientById(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Get all documents for this client
      const documents = await storage.getDocumentsByClient(clientId);
      
      // Find the exact document that matches this file URL
      const expectedUrl = `/uploads/${safeClientId}/${safeFilename}`;
      const documentRecord = documents.find(doc => doc.fileUrl === expectedUrl);
      
      if (!documentRecord) {
        // Document not found in database - don't serve the file
        console.warn(`Unauthorized access attempt: ${expectedUrl} not in client ${clientId} documents`);
        return res.status(403).json({ error: "Access denied - document not found" });
      }
      
      // Document is verified to belong to this client - serve it
      const filePath = path.join(uploadsDir, safeClientId, safeFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Set content type for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${documentRecord.fileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  // ==================== CLIENT-STAFF ASSIGNMENT ROUTES ====================
  
  // Get assignments by client
  app.get("/api/clients/:clientId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByClient(req.params.clientId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Get assignments by staff
  app.get("/api/staff/:staffId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByStaff(req.params.staffId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching staff assignments:", error);
      res.status(500).json({ error: "Failed to fetch staff assignments" });
    }
  });

  // Create assignment
  app.post("/api/clients/:clientId/assignments", async (req, res) => {
    try {
      const validationResult = insertClientStaffAssignmentSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const assignment = await storage.createAssignment(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.clientId,
        action: "staff_assigned",
        description: `Staff member assigned as ${assignment.assignmentType.replace("_", " ")}`,
        performedBy: "System"
      });
      
      // Auto-sync client chat room participants after new assignment
      try {
        // Ensure client chat room exists (lazy creation with retry)
        const client = await storage.getClientById(req.params.clientId);
        if (client) {
          const performedBy = (req.session as any)?.user?.displayName || "System";
          const performedById = (req.session as any)?.user?.id || "system";
          let roomCreated = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await storage.createClientChatRoom(req.params.clientId, client.participantName, performedById, performedBy);
              roomCreated = true;
              break;
            } catch (roomError) {
              console.warn(`Lazy chat room creation attempt ${attempt}/3 failed:`, roomError);
              if (attempt < 3) await new Promise(r => setTimeout(r, 100 * attempt));
            }
          }
          if (!roomCreated) {
            console.error("Could not create/verify chat room for sync - skipping sync");
            throw new Error("Chat room not available");
          }
        }
        
        const allAssignments = await storage.getAssignmentsByClient(req.params.clientId);
        // Fetch staff details - skip staff that can't be resolved
        const assignedStaff: { id: string; name: string; email?: string }[] = [];
        for (const a of allAssignments) {
          try {
            const staffMember = await storage.getStaffById(a.staffId);
            if (staffMember?.name) {
              assignedStaff.push({
                id: a.staffId,
                name: staffMember.name,
                email: staffMember.email
              });
            } else {
              console.warn(`Staff ${a.staffId} has no name - skipping from sync`);
            }
          } catch (staffError) {
            console.warn(`Failed to fetch staff ${a.staffId} - skipping from sync:`, staffError);
          }
        }
        await storage.syncClientChatParticipants(req.params.clientId, assignedStaff);
        console.log(`Synced ${assignedStaff.length} chat participants for client ${req.params.clientId}`);
      } catch (chatError) {
        console.error("Failed to sync chat participants:", chatError);
      }
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Update assignment
  app.patch("/api/assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.updateAssignment(req.params.id, req.body);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Delete assignment
  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      // First get the assignment to know which client it belongs to (for sync purposes)
      const assignment = await storage.getAssignmentById(req.params.id);
      
      // If assignment doesn't exist, return 204 for idempotent behavior
      if (!assignment) {
        return res.status(204).send();
      }
      
      const clientId = assignment.clientId;
      
      const deleted = await storage.deleteAssignment(req.params.id);
      // Already checked existence above, so deleted should be true
      // But if somehow it fails, still return 204 for idempotency
      if (!deleted) {
        return res.status(204).send();
      }
      
      // Auto-sync client chat room participants after assignment removal
      try {
        const remainingAssignments = await storage.getAssignmentsByClient(clientId);
        // Fetch staff details - skip staff that can't be resolved
        const assignedStaff: { id: string; name: string; email?: string }[] = [];
        for (const a of remainingAssignments) {
          try {
            const staffMember = await storage.getStaffById(a.staffId);
            if (staffMember?.name) {
              assignedStaff.push({
                id: a.staffId,
                name: staffMember.name,
                email: staffMember.email
              });
            } else {
              console.warn(`Staff ${a.staffId} has no name - skipping from sync`);
            }
          } catch (staffError) {
            console.warn(`Failed to fetch staff ${a.staffId} - skipping from sync:`, staffError);
          }
        }
        await storage.syncClientChatParticipants(clientId, assignedStaff);
        console.log(`Synced ${assignedStaff.length} chat participants for client ${clientId} after removal`);
      } catch (chatError) {
        console.error("Failed to sync chat participants:", chatError);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // ==================== SERVICE DELIVERY ROUTES ====================
  
  // Get service deliveries by client
  app.get("/api/clients/:clientId/service-deliveries", async (req, res) => {
    try {
      const deliveries = await storage.getServiceDeliveriesByClient(req.params.clientId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching service deliveries:", error);
      res.status(500).json({ error: "Failed to fetch service deliveries" });
    }
  });

  // Get service deliveries by staff
  app.get("/api/staff/:staffId/service-deliveries", async (req, res) => {
    try {
      const deliveries = await storage.getServiceDeliveriesByStaff(req.params.staffId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching staff service deliveries:", error);
      res.status(500).json({ error: "Failed to fetch staff service deliveries" });
    }
  });

  // Create service delivery
  app.post("/api/clients/:clientId/service-deliveries", async (req, res) => {
    try {
      const validationResult = insertServiceDeliverySchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const delivery = await storage.createServiceDelivery(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.clientId,
        action: "service_delivered",
        description: `Service "${delivery.serviceName}" was delivered`,
        performedBy: "System"
      });
      
      res.status(201).json(delivery);
    } catch (error) {
      console.error("Error creating service delivery:", error);
      res.status(500).json({ error: "Failed to create service delivery" });
    }
  });

  // Update service delivery
  app.patch("/api/service-deliveries/:id", async (req, res) => {
    try {
      const delivery = await storage.updateServiceDelivery(req.params.id, req.body);
      if (!delivery) {
        return res.status(404).json({ error: "Service delivery not found" });
      }
      res.json(delivery);
    } catch (error) {
      console.error("Error updating service delivery:", error);
      res.status(500).json({ error: "Failed to update service delivery" });
    }
  });

  // Delete service delivery
  app.delete("/api/service-deliveries/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteServiceDelivery(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Service delivery not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service delivery:", error);
      res.status(500).json({ error: "Failed to delete service delivery" });
    }
  });

  // ==================== CLIENT GOALS ROUTES ====================
  
  // Get goals by client
  app.get("/api/clients/:clientId/goals", async (req, res) => {
    try {
      const goals = await storage.getGoalsByClient(req.params.clientId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  // Create goal (max 5 per client)
  app.post("/api/clients/:clientId/goals", async (req, res) => {
    try {
      // Check if client already has 5 goals
      const existingGoals = await storage.getGoalsByClient(req.params.clientId);
      if (existingGoals.length >= 5) {
        return res.status(400).json({ error: "Maximum of 5 goals per client allowed" });
      }
      
      const validationResult = insertClientGoalSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId,
        order: String(existingGoals.length + 1)
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const goal = await storage.createGoal(validationResult.data);
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.clientId,
        action: "goal_added",
        description: `Goal "${goal.title}" was added`,
        performedBy: "System"
      });
      
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  // Update goal
  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const goal = await storage.updateGoal(req.params.id, req.body);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // Delete goal
  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGoal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  // Duplicate goal
  app.post("/api/goals/:id/duplicate", async (req, res) => {
    try {
      // Check goal count for the client first
      const original = await storage.getGoalById(req.params.id);
      if (!original) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      const existingGoals = await storage.getGoalsByClient(original.clientId);
      // Only count non-archived goals
      const activeGoals = existingGoals.filter(g => g.isArchived !== "yes");
      if (activeGoals.length >= 5) {
        return res.status(400).json({ error: "Maximum of 5 active goals per client allowed" });
      }
      
      const duplicated = await storage.duplicateGoal(req.params.id);
      if (!duplicated) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // Create audit log entry
      const performedByName = req.session?.user?.name || req.session?.user?.email || "System";
      await storage.createGoalUpdate({
        goalId: duplicated.id,
        updateType: "created",
        note: `Duplicated from goal "${original.title}"`,
        performedBy: req.session?.user?.id || null,
        performedByName
      });
      
      res.status(201).json(duplicated);
    } catch (error) {
      console.error("Error duplicating goal:", error);
      res.status(500).json({ error: "Failed to duplicate goal" });
    }
  });

  // Archive goal
  app.post("/api/goals/:id/archive", async (req, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      const archivedBy = req.session?.user?.name || req.session?.user?.email || "System";
      const archived = await storage.archiveGoal(req.params.id, archivedBy);
      
      if (!archived) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // Create audit log entry
      await storage.createGoalUpdate({
        goalId: archived.id,
        updateType: "archived",
        previousValue: goal.status,
        note: `Goal archived`,
        performedBy: req.session?.user?.id || null,
        performedByName: archivedBy
      });
      
      res.json(archived);
    } catch (error) {
      console.error("Error archiving goal:", error);
      res.status(500).json({ error: "Failed to archive goal" });
    }
  });

  // Unarchive goal
  app.post("/api/goals/:id/unarchive", async (req, res) => {
    try {
      const goal = await storage.getGoalById(req.params.id);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // Check goal count for the client
      const existingGoals = await storage.getGoalsByClient(goal.clientId);
      const activeGoals = existingGoals.filter(g => g.isArchived !== "yes");
      if (activeGoals.length >= 5) {
        return res.status(400).json({ error: "Maximum of 5 active goals per client allowed. Archive an existing goal first." });
      }
      
      const unarchived = await storage.unarchiveGoal(req.params.id);
      
      if (!unarchived) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // Create audit log entry
      const performedByName = req.session?.user?.name || req.session?.user?.email || "System";
      await storage.createGoalUpdate({
        goalId: unarchived.id,
        updateType: "unarchived",
        note: `Goal restored from archive`,
        performedBy: req.session?.user?.id || null,
        performedByName
      });
      
      res.json(unarchived);
    } catch (error) {
      console.error("Error unarchiving goal:", error);
      res.status(500).json({ error: "Failed to unarchive goal" });
    }
  });

  // Get goal updates (audit trail)
  app.get("/api/goals/:id/updates", async (req, res) => {
    try {
      const updates = await storage.getGoalUpdates(req.params.id);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching goal updates:", error);
      res.status(500).json({ error: "Failed to fetch goal updates" });
    }
  });

  // Add a note/update to a goal
  app.post("/api/goals/:id/updates", async (req, res) => {
    try {
      const { updateType, note, previousValue, newValue, details } = req.body;
      
      if (!updateType) {
        return res.status(400).json({ error: "Update type is required" });
      }
      
      const performedByName = req.session?.user?.name || req.session?.user?.email || "System";
      const update = await storage.createGoalUpdate({
        goalId: req.params.id,
        updateType,
        note,
        previousValue,
        newValue,
        details,
        performedBy: req.session?.user?.id || null,
        performedByName
      });
      
      res.status(201).json(update);
    } catch (error) {
      console.error("Error creating goal update:", error);
      res.status(500).json({ error: "Failed to create goal update" });
    }
  });

  // ==================== GOAL ACTION PLANS ROUTES ====================
  
  // Get action plans for a goal
  app.get("/api/goals/:id/action-plans", async (req, res) => {
    try {
      const plans = await storage.getActionPlansByGoal(req.params.id);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching action plans:", error);
      res.status(500).json({ error: "Failed to fetch action plans" });
    }
  });

  // Create action plan for a goal
  app.post("/api/goals/:id/action-plans", async (req, res) => {
    try {
      const createdByName = req.session?.user?.name || req.session?.user?.email || "System";
      const plan = await storage.createActionPlan({
        ...req.body,
        goalId: req.params.id,
        createdBy: req.session?.user?.id || null,
        createdByName
      });
      
      // Log as goal update for audit trail
      await storage.createGoalUpdate({
        goalId: req.params.id,
        updateType: "achievement_step",
        note: `Added action plan: ${plan.title}`,
        details: { actionPlanId: plan.id },
        performedBy: req.session?.user?.id || null,
        performedByName: createdByName
      });
      
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating action plan:", error);
      res.status(500).json({ error: "Failed to create action plan" });
    }
  });

  // Update action plan
  app.patch("/api/action-plans/:id", async (req, res) => {
    try {
      // Convert completedAt string to Date if present
      const updateData = { ...req.body };
      if (updateData.completedAt && typeof updateData.completedAt === "string") {
        updateData.completedAt = new Date(updateData.completedAt);
      }
      
      const plan = await storage.updateActionPlan(req.params.id, updateData);
      if (!plan) {
        return res.status(404).json({ error: "Action plan not found" });
      }
      
      // Log status change if completed
      if (req.body.status === "completed") {
        const performedByName = req.session?.user?.name || req.session?.user?.email || "System";
        await storage.createGoalUpdate({
          goalId: plan.goalId,
          updateType: "achievement_step",
          note: `Completed action plan: ${plan.title}`,
          details: { actionPlanId: plan.id, status: "completed" },
          performedBy: req.session?.user?.id || null,
          performedByName
        });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error updating action plan:", error);
      res.status(500).json({ error: "Failed to update action plan" });
    }
  });

  // Delete action plan
  app.delete("/api/action-plans/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteActionPlan(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Action plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting action plan:", error);
      res.status(500).json({ error: "Failed to delete action plan" });
    }
  });

  // ==================== BUDGET MANAGEMENT ROUTES ====================
  
  // Delete budget
  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBudget(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  // Update budget
  app.patch("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await storage.updateBudget(req.params.id, req.body);
      if (!budget) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json(budget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ error: "Failed to update budget" });
    }
  });

  // ==================== ONBOARDING ROUTES ====================
  
  // Mark client as onboarded
  app.post("/api/clients/:id/onboard", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const staffName = req.session.user.name || req.session.user.email || "Unknown";
      
      const client = await storage.updateClient(req.params.id, {
        isOnboarded: "yes",
        onboardedAt: new Date(),
        onboardedBy: staffName
      });
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.id,
        action: "client_onboarded",
        description: `Client was marked as onboarded by ${staffName}`,
        performedBy: req.session.user.email || "System"
      });
      
      res.json(client);
    } catch (error) {
      console.error("Error onboarding client:", error);
      res.status(500).json({ error: "Failed to onboard client" });
    }
  });

  // ==================== CLIENT STATUS ROUTES ====================
  
  // Get client status history
  app.get("/api/clients/:id/status-logs", async (req, res) => {
    try {
      const logs = await storage.getClientStatusLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching status logs:", error);
      res.status(500).json({ error: "Failed to fetch status logs" });
    }
  });

  // Update client status with reason
  app.post("/api/clients/:id/status", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { status, reason } = req.body;
      
      if (!status || !["Active", "Hospital", "Paused", "Discharged"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be Active, Hospital, Paused, or Discharged" });
      }
      
      const userId = req.session.user.id || "unknown";
      const userName = req.session.user.name || req.session.user.email || "Unknown";
      
      const client = await storage.updateClientStatus(
        req.params.id,
        status,
        reason || "",
        userId,
        userName
      );
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.id,
        action: "client_status_changed",
        description: `Client status changed to ${status}${reason ? `: ${reason}` : ""} by ${userName}`,
        performedBy: req.session.user.email || "System"
      });
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client status:", error);
      res.status(500).json({ error: "Failed to update client status" });
    }
  });

  // ==================== NDIS PRICE GUIDE ROUTES ====================
  
  // Get all price guide items
  app.get("/api/price-guide", async (req, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const items = activeOnly 
        ? await storage.getActivePriceGuideItems()
        : await storage.getAllPriceGuideItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching price guide items:", error);
      res.status(500).json({ error: "Failed to fetch price guide items" });
    }
  });

  // Search price guide items
  app.get("/api/price-guide/search", async (req, res) => {
    try {
      const searchTerm = (req.query.q as string) || "";
      const items = await storage.searchPriceGuideItems(searchTerm);
      res.json(items);
    } catch (error) {
      console.error("Error searching price guide items:", error);
      res.status(500).json({ error: "Failed to search price guide items" });
    }
  });

  // Get single price guide item
  app.get("/api/price-guide/:id", async (req, res) => {
    try {
      const item = await storage.getPriceGuideItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Price guide item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching price guide item:", error);
      res.status(500).json({ error: "Failed to fetch price guide item" });
    }
  });

  // Create price guide item
  app.post("/api/price-guide", async (req, res) => {
    try {
      const item = await storage.createPriceGuideItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating price guide item:", error);
      res.status(500).json({ error: "Failed to create price guide item" });
    }
  });

  // Update price guide item
  app.patch("/api/price-guide/:id", async (req, res) => {
    try {
      const item = await storage.updatePriceGuideItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Price guide item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating price guide item:", error);
      res.status(500).json({ error: "Failed to update price guide item" });
    }
  });

  // Delete price guide item
  app.delete("/api/price-guide/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePriceGuideItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Price guide item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting price guide item:", error);
      res.status(500).json({ error: "Failed to delete price guide item" });
    }
  });

  // ==================== QUOTES ROUTES ====================
  
  // Get all quotes
  app.get("/api/quotes", async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      if (clientId) {
        const quotes = await storage.getQuotesByClient(clientId);
        res.json(quotes);
      } else {
        const quotes = await storage.getAllQuotes();
        res.json(quotes);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Get next quote number
  app.get("/api/quotes/next-number", async (req, res) => {
    try {
      const quoteNumber = await storage.getNextQuoteNumber();
      res.json({ quoteNumber });
    } catch (error) {
      console.error("Error getting next quote number:", error);
      res.status(500).json({ error: "Failed to get next quote number" });
    }
  });

  // Get single quote with line items
  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuoteById(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      const lineItems = await storage.getLineItemsByQuote(req.params.id);
      const statusHistory = await storage.getStatusHistoryByQuote(req.params.id);
      const sendHistory = await storage.getSendHistoryByQuote(req.params.id);
      res.json({ ...quote, lineItems, statusHistory, sendHistory });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Create quote
  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteNumber = await storage.getNextQuoteNumber();
      const quote = await storage.createQuote({
        ...req.body,
        quoteNumber,
        createdById: req.session?.user?.id
      });
      
      // Log initial status
      await storage.createStatusHistory({
        quoteId: quote.id,
        newStatus: "draft",
        changedById: req.session?.user?.id,
        changedByName: req.session?.user?.displayName || "System"
      });
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Update quote
  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const existingQuote = await storage.getQuoteById(req.params.id);
      if (!existingQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      const quote = await storage.updateQuote(req.params.id, req.body);
      
      // Log status change if status changed
      if (req.body.status && req.body.status !== existingQuote.status) {
        await storage.createStatusHistory({
          quoteId: req.params.id,
          previousStatus: existingQuote.status,
          newStatus: req.body.status,
          changedById: req.session?.user?.id,
          changedByName: req.session?.user?.displayName || "System",
          notes: req.body.statusNote
        });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Delete quote
  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      // Delete line items first
      await storage.deleteLineItemsByQuote(req.params.id);
      const deleted = await storage.deleteQuote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // ==================== QUOTE LINE ITEMS ROUTES ====================
  
  // Get line items for a quote
  app.get("/api/quotes/:quoteId/items", async (req, res) => {
    try {
      const items = await storage.getLineItemsByQuote(req.params.quoteId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching quote line items:", error);
      res.status(500).json({ error: "Failed to fetch quote line items" });
    }
  });

  // Add line item to quote
  app.post("/api/quotes/:quoteId/items", async (req, res) => {
    try {
      const item = await storage.createLineItem({
        ...req.body,
        quoteId: req.params.quoteId
      });
      
      // Recalculate quote totals using annual totals
      const allItems = await storage.getLineItemsByQuote(req.params.quoteId);
      const annualTotal = allItems.reduce((sum, i) => sum + parseFloat(i.annualTotal || i.lineTotal || "0"), 0);
      const weeklyTotal = allItems.reduce((sum, i) => sum + parseFloat(i.weeklyTotal || "0"), 0);
      
      await storage.updateQuote(req.params.quoteId, {
        subtotal: annualTotal.toFixed(2),
        totalAmount: annualTotal.toFixed(2) // GST exempt for NDIS
      });
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating quote line item:", error);
      res.status(500).json({ error: "Failed to create quote line item" });
    }
  });

  // Update line item
  app.patch("/api/quote-items/:id", async (req, res) => {
    try {
      const item = await storage.updateLineItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Quote line item not found" });
      }
      
      // Recalculate quote totals using annual totals
      const allItems = await storage.getLineItemsByQuote(item.quoteId);
      const annualTotal = allItems.reduce((sum, i) => sum + parseFloat(i.annualTotal || i.lineTotal || "0"), 0);
      await storage.updateQuote(item.quoteId, {
        subtotal: annualTotal.toFixed(2),
        totalAmount: annualTotal.toFixed(2)
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error updating quote line item:", error);
      res.status(500).json({ error: "Failed to update quote line item" });
    }
  });

  // Delete line item
  app.delete("/api/quote-items/:id", async (req, res) => {
    try {
      // Get the item first to know which quote to update
      const items = await storage.getLineItemsByQuote(req.params.id);
      const item = items.find(i => i.id === req.params.id);
      
      const deleted = await storage.deleteLineItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Quote line item not found" });
      }
      
      // Recalculate quote totals if we found the quote
      if (item) {
        const remainingItems = await storage.getLineItemsByQuote(item.quoteId);
        const annualTotal = remainingItems.reduce((sum, i) => sum + parseFloat(i.annualTotal || i.lineTotal || "0"), 0);
        await storage.updateQuote(item.quoteId, {
          subtotal: annualTotal.toFixed(2),
          totalAmount: annualTotal.toFixed(2)
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote line item:", error);
      res.status(500).json({ error: "Failed to delete quote line item" });
    }
  });

  // ==================== QUOTE SEND HISTORY ROUTES ====================
  
  // Get send history for a quote
  app.get("/api/quotes/:quoteId/send-history", async (req, res) => {
    try {
      const sendHistory = await storage.getSendHistoryByQuote(req.params.quoteId);
      res.json(sendHistory);
    } catch (error) {
      console.error("Error fetching quote send history:", error);
      res.status(500).json({ error: "Failed to fetch quote send history" });
    }
  });

  // Record a quote send event
  app.post("/api/quotes/:quoteId/send-history", async (req, res) => {
    try {
      const sendRecord = await storage.createSendHistory({
        ...req.body,
        quoteId: req.params.quoteId,
        sentById: req.session?.user?.id,
        sentByName: req.session?.user?.displayName || "System"
      });
      res.status(201).json(sendRecord);
    } catch (error) {
      console.error("Error recording quote send:", error);
      res.status(500).json({ error: "Failed to record quote send" });
    }
  });

  // ==================== ZAPIER INTEGRATION WEBHOOKS ====================
  
  // API Key middleware for webhook authentication
  const ZAPIER_API_KEY = process.env.ZAPIER_API_KEY;
  
  function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!ZAPIER_API_KEY) {
      console.error("ZAPIER_API_KEY not configured");
      return res.status(500).json({ error: "Webhook not configured" });
    }
    
    if (!apiKey || apiKey !== ZAPIER_API_KEY) {
      console.warn("Invalid API key attempt from:", req.ip);
      return res.status(401).json({ error: "Invalid or missing API key" });
    }
    
    next();
  }
  
  // Referral webhook schema - maps Zoho form fields to client data
  const referralWebhookSchema = z.object({
    // Required fields
    participantName: z.string().min(1, "Participant name is required"),
    category: z.enum(["NDIS", "Support at Home", "Private"]).default("NDIS"),
    
    // Optional contact fields
    phoneNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    homeAddress: z.string().optional(),
    dateOfBirth: z.string().optional(),
    
    // Medical information
    mainDiagnosis: z.string().optional(),
    allergies: z.string().optional(),
    medicareNumber: z.string().optional(),
    
    // NDIS specific
    ndisNumber: z.string().optional(),
    ndisPlanStartDate: z.string().optional(),
    ndisPlanEndDate: z.string().optional(),
    
    // Support at Home specific
    hcpLevel: z.string().optional(),
    hcpStartDate: z.string().optional(),
    hcpEndDate: z.string().optional(),
    
    // Related entities (can be IDs or names for upsert)
    gpName: z.string().optional(),
    gpAddress: z.string().optional(),
    gpPhone: z.string().optional(),
    gpFax: z.string().optional(),
    
    supportCoordinatorName: z.string().optional(),
    supportCoordinatorEmail: z.string().optional(),
    supportCoordinatorPhone: z.string().optional(),
    supportCoordinatorOrganisation: z.string().optional(),
    
    planManagerName: z.string().optional(),
    planManagerEmail: z.string().optional(),
    planManagerPhone: z.string().optional(),
    planManagerOrganisation: z.string().optional(),
    
    pharmacyName: z.string().optional(),
    pharmacyAddress: z.string().optional(),
    pharmacyPhone: z.string().optional(),
    
    // Next of kin / Emergency contact
    nokEpoa: z.string().optional(),
    
    // Notes
    summaryOfServices: z.string().optional(),
    clinicalNotes: z.string().optional(),
    communicationNeeds: z.string().optional(),
    
    // Source tracking
    referralSource: z.string().optional(),
    referralDate: z.string().optional(),
  });

  // POST /api/referrals - Zapier webhook to create new clients from Zoho referrals
  app.post("/api/referrals", requireApiKey, async (req, res) => {
    try {
      console.log("Received referral webhook:", JSON.stringify(req.body, null, 2));
      
      const validation = referralWebhookSchema.safeParse(req.body);
      if (!validation.success) {
        const error = fromZodError(validation.error);
        console.error("Referral validation failed:", error.message);
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.message 
        });
      }
      
      const data = validation.data;
      
      // Handle GP upsert if provided
      let generalPractitionerId: string | undefined;
      if (data.gpName) {
        const existingGPs = await storage.getAllGPs();
        let gp = existingGPs.find((g: any) => 
          g.name.toLowerCase() === data.gpName!.toLowerCase()
        );
        
        if (!gp) {
          gp = await storage.createGP({
            name: data.gpName,
            address: data.gpAddress,
            phoneNumber: data.gpPhone,
            faxNumber: data.gpFax,
          });
          console.log("Created new GP:", gp.id, gp.name);
        }
        generalPractitionerId = gp.id;
      }
      
      // Handle Support Coordinator upsert if provided
      let supportCoordinatorId: string | undefined;
      if (data.supportCoordinatorName) {
        const existingSCs = await storage.getAllSupportCoordinators();
        let sc = existingSCs.find((s: any) => 
          s.name.toLowerCase() === data.supportCoordinatorName!.toLowerCase()
        );
        
        if (!sc) {
          sc = await storage.createSupportCoordinator({
            name: data.supportCoordinatorName,
            email: data.supportCoordinatorEmail,
            phoneNumber: data.supportCoordinatorPhone,
            organisation: data.supportCoordinatorOrganisation,
          });
          console.log("Created new Support Coordinator:", sc.id, sc.name);
        }
        supportCoordinatorId = sc.id;
      }
      
      // Handle Plan Manager upsert if provided
      let planManagerId: string | undefined;
      if (data.planManagerName) {
        const existingPMs = await storage.getAllPlanManagers();
        let pm = existingPMs.find((p: any) => 
          p.name.toLowerCase() === data.planManagerName!.toLowerCase()
        );
        
        if (!pm) {
          pm = await storage.createPlanManager({
            name: data.planManagerName,
            email: data.planManagerEmail,
            phoneNumber: data.planManagerPhone,
            organisation: data.planManagerOrganisation,
          });
          console.log("Created new Plan Manager:", pm.id, pm.name);
        }
        planManagerId = pm.id;
      }
      
      // Handle Pharmacy upsert if provided
      let pharmacyId: string | undefined;
      if (data.pharmacyName) {
        const existingPharmacies = await storage.getAllPharmacies();
        let pharmacy = existingPharmacies.find((p: any) => 
          p.name.toLowerCase() === data.pharmacyName!.toLowerCase()
        );
        
        if (!pharmacy) {
          pharmacy = await storage.createPharmacy({
            name: data.pharmacyName,
            address: data.pharmacyAddress,
            phoneNumber: data.pharmacyPhone,
          });
          console.log("Created new Pharmacy:", pharmacy.id, pharmacy.name);
        }
        pharmacyId = pharmacy.id;
      }
      
      // Build NDIS details if applicable
      const ndisDetails = data.category === "NDIS" ? {
        ndisNumber: data.ndisNumber,
        ndisPlanStartDate: data.ndisPlanStartDate,
        ndisPlanEndDate: data.ndisPlanEndDate,
        supportCoordinatorId,
        planManagerId,
      } : undefined;
      
      // Build Support at Home details if applicable  
      const supportAtHomeDetails = data.category === "Support at Home" ? {
        hcpLevel: data.hcpLevel,
        hcpStartDate: data.hcpStartDate,
        hcpEndDate: data.hcpEndDate,
      } : undefined;
      
      // Create the new client
      const newClient = await storage.createClient({
        category: data.category,
        participantName: data.participantName,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        homeAddress: data.homeAddress,
        dateOfBirth: data.dateOfBirth,
        mainDiagnosis: data.mainDiagnosis,
        allergies: data.allergies,
        medicareNumber: data.medicareNumber,
        nokEpoa: data.nokEpoa,
        summaryOfServices: data.summaryOfServices,
        clinicalNotes: data.clinicalNotes,
        communicationNeeds: data.communicationNeeds,
        generalPractitionerId,
        pharmacyId,
        ndisDetails: ndisDetails as any,
        supportAtHomeDetails: supportAtHomeDetails as any,
        isOnboarded: "no",
      });
      
      console.log("Created new client from referral:", newClient.id, newClient.participantName);
      
      // Log the activity
      await storage.logActivity({
        clientId: newClient.id,
        action: "created",
        description: `Client created from Zoho referral form${data.referralSource ? ` (${data.referralSource})` : ""}`,
        performedBy: "Zapier Integration",
        metadata: {
          source: "zapier_webhook",
          referralSource: data.referralSource,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });
      
      res.status(201).json({
        success: true,
        message: "Referral processed successfully",
        clientId: newClient.id,
        clientName: newClient.participantName,
        category: newClient.category,
      });
      
    } catch (error) {
      console.error("Error processing referral webhook:", error);
      res.status(500).json({ error: "Failed to process referral" });
    }
  });
  
  // GET /api/referrals/test - Test endpoint to verify webhook configuration
  app.get("/api/referrals/test", requireApiKey, (req, res) => {
    res.json({
      success: true,
      message: "Webhook endpoint is configured correctly",
      timestamp: new Date().toISOString(),
    });
  });

  // ==================== CLIENT CONTACTS ROUTES ====================
  
  // Get contacts by client
  app.get("/api/clients/:clientId/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContactsByClient(req.params.clientId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching client contacts:", error);
      res.status(500).json({ error: "Failed to fetch client contacts" });
    }
  });

  // Create client contact
  app.post("/api/clients/:clientId/contacts", async (req, res) => {
    try {
      const validationResult = insertClientContactSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const contact = await storage.createContact(validationResult.data);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating client contact:", error);
      res.status(500).json({ error: "Failed to create client contact" });
    }
  });

  // Update client contact
  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  // Delete client contact
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // ==================== CLIENT BEHAVIORS ROUTES ====================
  
  // Get behaviors by client
  app.get("/api/clients/:clientId/behaviors", async (req, res) => {
    try {
      const behaviors = await storage.getBehaviorsByClient(req.params.clientId);
      res.json(behaviors);
    } catch (error) {
      console.error("Error fetching client behaviors:", error);
      res.status(500).json({ error: "Failed to fetch client behaviors" });
    }
  });

  // Create client behavior
  app.post("/api/clients/:clientId/behaviors", async (req, res) => {
    try {
      const validationResult = insertClientBehaviorSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const behavior = await storage.createBehavior(validationResult.data);
      res.status(201).json(behavior);
    } catch (error) {
      console.error("Error creating client behavior:", error);
      res.status(500).json({ error: "Failed to create client behavior" });
    }
  });

  // Update client behavior
  app.patch("/api/behaviors/:id", async (req, res) => {
    try {
      const behavior = await storage.updateBehavior(req.params.id, req.body);
      if (!behavior) {
        return res.status(404).json({ error: "Behavior not found" });
      }
      res.json(behavior);
    } catch (error) {
      console.error("Error updating behavior:", error);
      res.status(500).json({ error: "Failed to update behavior" });
    }
  });

  // Delete client behavior
  app.delete("/api/behaviors/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBehavior(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Behavior not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting behavior:", error);
      res.status(500).json({ error: "Failed to delete behavior" });
    }
  });

  // ==================== LEADERSHIP MEETING NOTES ROUTES ====================
  
  // Get meeting notes by client
  app.get("/api/clients/:clientId/meeting-notes", async (req, res) => {
    try {
      const notes = await storage.getMeetingNotesByClient(req.params.clientId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching meeting notes:", error);
      res.status(500).json({ error: "Failed to fetch meeting notes" });
    }
  });

  // Create meeting note
  app.post("/api/clients/:clientId/meeting-notes", async (req, res) => {
    try {
      const validationResult = insertLeadershipMeetingNoteSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const note = await storage.createMeetingNote(validationResult.data);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating meeting note:", error);
      res.status(500).json({ error: "Failed to create meeting note" });
    }
  });

  // Update meeting note
  app.patch("/api/meeting-notes/:id", async (req, res) => {
    try {
      const note = await storage.updateMeetingNote(req.params.id, req.body);
      if (!note) {
        return res.status(404).json({ error: "Meeting note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Error updating meeting note:", error);
      res.status(500).json({ error: "Failed to update meeting note" });
    }
  });

  // Delete meeting note
  app.delete("/api/meeting-notes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMeetingNote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Meeting note not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meeting note:", error);
      res.status(500).json({ error: "Failed to delete meeting note" });
    }
  });

  // ==================== APPOINTMENTS ROUTES ====================

  // Get all appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Get upcoming appointments
  app.get("/api/appointments/upcoming", async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const appointments = await storage.getUpcomingAppointments(days);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      res.status(500).json({ error: "Failed to fetch upcoming appointments" });
    }
  });

  // Get appointments by date range
  app.get("/api/appointments/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const appointments = await storage.getAppointmentsByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by date range:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Get appointment by ID
  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointmentById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  // Get appointments by client
  app.get("/api/clients/:clientId/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByClient(req.params.clientId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ error: "Failed to fetch client appointments" });
    }
  });

  // Get appointments by staff
  app.get("/api/staff/:staffId/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointmentsByStaff(req.params.staffId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching staff appointments:", error);
      res.status(500).json({ error: "Failed to fetch staff appointments" });
    }
  });

  // Create appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const validationResult = insertAppointmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const appointment = await storage.createAppointment(validationResult.data);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Update appointment
  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.updateAppointment(req.params.id, req.body);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Delete appointment
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAppointment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // ==================== APPOINTMENT ASSIGNMENTS ROUTES ====================

  // Get assignments by appointment
  app.get("/api/appointments/:appointmentId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByAppointment(req.params.appointmentId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching appointment assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Get appointments assignments by staff
  app.get("/api/staff/:staffId/appointment-assignments", async (req, res) => {
    try {
      const assignments = await storage.getAppointmentAssignmentsByStaff(req.params.staffId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching staff appointment assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Create appointment assignment (with conflict validation)
  app.post("/api/appointments/:appointmentId/assignments", async (req, res) => {
    try {
      const validationResult = insertAppointmentAssignmentSchema.safeParse({
        ...req.body,
        appointmentId: req.params.appointmentId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      
      const { staffId } = validationResult.data;
      const appointmentId = req.params.appointmentId;
      
      // Fetch the appointment to get timing details
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // If we have a staffId, validate the assignment
      let conflicts: any[] = [];
      if (staffId) {
        const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
        
        const validationData = {
          staffId,
          clientId: appointment.clientId || undefined,
          appointmentId,
          startTime: new Date(appointment.startDate),
          endTime: appointment.endDate ? new Date(appointment.endDate) : new Date(appointment.startDate),
        };
        
        // Validate and create conflict records if any issues found
        conflicts = await staffAssignmentValidator.validateAndRecordConflicts(validationData);
        
        // Check if any critical conflicts exist that should block the assignment
        const criticalConflicts = conflicts.filter(c => c.severity === "critical");
        
        // For now, we'll allow the assignment but return the conflicts as warnings
        // This can be changed to block critical conflicts if needed
        if (criticalConflicts.length > 0) {
          // Check if the request includes a flag to force the assignment
          const forceAssignment = req.body.forceAssignment === true;
          
          if (!forceAssignment) {
            return res.status(409).json({
              error: "Critical scheduling conflicts detected",
              conflicts: criticalConflicts.map(c => ({
                type: c.conflictType,
                severity: c.severity,
                description: c.description,
              })),
              requiresConfirmation: true,
              message: "Set forceAssignment=true to proceed despite conflicts"
            });
          }
        }
      }
      
      const assignment = await storage.createAppointmentAssignment(validationResult.data);
      
      res.status(201).json({
        ...assignment,
        conflicts: conflicts.length > 0 ? conflicts.map(c => ({
          type: c.conflictType,
          severity: c.severity,
          description: c.description,
        })) : undefined,
        hasWarnings: conflicts.some(c => c.severity === "warning"),
        hasCritical: conflicts.some(c => c.severity === "critical"),
      });
    } catch (error) {
      console.error("Error creating appointment assignment:", error);
      res.status(500).json({ error: "Failed to create assignment" });
    }
  });

  // Update appointment assignment (with conflict revalidation when staff changes)
  app.patch("/api/appointment-assignments/:id", async (req, res) => {
    try {
      const assignmentId = req.params.id;
      
      // Get the existing assignment to check if staffId is changing
      const existingAssignment = await storage.getAppointmentAssignmentById(assignmentId);
      if (!existingAssignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      const newStaffId = req.body.staffId;
      const staffChanging = newStaffId && newStaffId !== existingAssignment.staffId;
      
      let conflicts: any[] = [];
      
      // If staff is changing, validate the new assignment
      if (staffChanging) {
        const appointment = await storage.getAppointmentById(existingAssignment.appointmentId);
        if (!appointment) {
          return res.status(404).json({ error: "Appointment not found" });
        }
        
        const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
        
        // First, auto-resolve any existing conflicts for this appointment with the old staff
        if (existingAssignment.staffId) {
          await storage.autoResolveConflictsForAppointment(
            existingAssignment.appointmentId,
            existingAssignment.staffId,
            "Staff reassigned"
          );
        }
        
        const validationData = {
          staffId: newStaffId,
          clientId: appointment.clientId || undefined,
          appointmentId: existingAssignment.appointmentId,
          startTime: new Date(appointment.startDate),
          endTime: appointment.endDate ? new Date(appointment.endDate) : new Date(appointment.startDate),
        };
        
        // Validate and create conflict records for the new assignment
        conflicts = await staffAssignmentValidator.validateAndRecordConflicts(validationData);
        
        // Check for critical conflicts
        const criticalConflicts = conflicts.filter(c => c.severity === "critical");
        
        if (criticalConflicts.length > 0) {
          const forceAssignment = req.body.forceAssignment === true;
          
          if (!forceAssignment) {
            return res.status(409).json({
              error: "Critical scheduling conflicts detected for new staff assignment",
              conflicts: criticalConflicts.map(c => ({
                type: c.conflictType,
                severity: c.severity,
                description: c.description,
              })),
              requiresConfirmation: true,
              message: "Set forceAssignment=true to proceed despite conflicts"
            });
          }
        }
      }
      
      const assignment = await storage.updateAppointmentAssignment(assignmentId, req.body);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json({
        ...assignment,
        conflicts: conflicts.length > 0 ? conflicts.map(c => ({
          type: c.conflictType,
          severity: c.severity,
          description: c.description,
        })) : undefined,
        hasWarnings: conflicts.some(c => c.severity === "warning"),
        hasCritical: conflicts.some(c => c.severity === "critical"),
      });
    } catch (error) {
      console.error("Error updating appointment assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Delete appointment assignment
  app.delete("/api/appointment-assignments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAppointmentAssignment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // ==================== APPOINTMENT CHECK-INS ROUTES ====================

  // Get check-ins by appointment
  app.get("/api/appointments/:appointmentId/checkins", async (req, res) => {
    try {
      const checkins = await storage.getCheckinsByAppointment(req.params.appointmentId);
      res.json(checkins);
    } catch (error) {
      console.error("Error fetching appointment check-ins:", error);
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  });

  // Create appointment check-in
  app.post("/api/appointments/:appointmentId/checkins", async (req, res) => {
    try {
      const validationResult = insertAppointmentCheckinSchema.safeParse({
        ...req.body,
        appointmentId: req.params.appointmentId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const checkin = await storage.createAppointmentCheckin(validationResult.data);
      res.status(201).json(checkin);
    } catch (error) {
      console.error("Error creating appointment check-in:", error);
      res.status(500).json({ error: "Failed to create check-in" });
    }
  });

  // ==================== CLIENT STAFF PREFERENCES ROUTES ====================

  // Get preferences by client
  app.get("/api/clients/:clientId/staff-preferences", async (req, res) => {
    try {
      const preferences = await storage.getPreferencesByClient(req.params.clientId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching client staff preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Get preferences by staff
  app.get("/api/staff/:staffId/client-preferences", async (req, res) => {
    try {
      const preferences = await storage.getPreferencesByStaff(req.params.staffId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching staff client preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Create staff preference
  app.post("/api/clients/:clientId/staff-preferences", async (req, res) => {
    try {
      const validationResult = insertClientStaffPreferenceSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const preference = await storage.createStaffPreference(validationResult.data);
      res.status(201).json(preference);
    } catch (error) {
      console.error("Error creating staff preference:", error);
      res.status(500).json({ error: "Failed to create preference" });
    }
  });

  // Update staff preference
  app.patch("/api/staff-preferences/:id", async (req, res) => {
    try {
      const preference = await storage.updateStaffPreference(req.params.id, req.body);
      if (!preference) {
        return res.status(404).json({ error: "Preference not found" });
      }
      res.json(preference);
    } catch (error) {
      console.error("Error updating staff preference:", error);
      res.status(500).json({ error: "Failed to update preference" });
    }
  });

  // Delete staff preference
  app.delete("/api/staff-preferences/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStaffPreference(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Preference not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff preference:", error);
      res.status(500).json({ error: "Failed to delete preference" });
    }
  });

  // ==================== CLIENT STAFF RESTRICTIONS (BLACKLIST) ROUTES ====================

  // Get restrictions by client
  app.get("/api/clients/:clientId/staff-restrictions", async (req, res) => {
    try {
      const restrictions = await storage.getRestrictionsByClient(req.params.clientId);
      res.json(restrictions);
    } catch (error) {
      console.error("Error fetching client staff restrictions:", error);
      res.status(500).json({ error: "Failed to fetch restrictions" });
    }
  });

  // Get restrictions by staff
  app.get("/api/staff/:staffId/client-restrictions", async (req, res) => {
    try {
      const restrictions = await storage.getRestrictionsByStaff(req.params.staffId);
      res.json(restrictions);
    } catch (error) {
      console.error("Error fetching staff client restrictions:", error);
      res.status(500).json({ error: "Failed to fetch restrictions" });
    }
  });

  // Check if staff is restricted for client
  app.get("/api/clients/:clientId/staff/:staffId/is-restricted", async (req, res) => {
    try {
      const isRestricted = await storage.isStaffRestricted(req.params.clientId, req.params.staffId);
      res.json({ isRestricted });
    } catch (error) {
      console.error("Error checking staff restriction:", error);
      res.status(500).json({ error: "Failed to check restriction" });
    }
  });

  // Create staff restriction (triggers revalidation of affected appointments)
  app.post("/api/clients/:clientId/staff-restrictions", async (req, res) => {
    try {
      const validationResult = insertClientStaffRestrictionSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const restriction = await storage.createStaffRestriction(validationResult.data);
      
      // Trigger async revalidation of affected appointments
      const staffId = restriction.staffId;
      if (staffId) {
        const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
        staffAssignmentValidator.revalidateStaffFutureAppointments(staffId).catch(err => {
          console.error("Error revalidating after restriction created:", err);
        });
      }
      
      res.status(201).json(restriction);
    } catch (error) {
      console.error("Error creating staff restriction:", error);
      res.status(500).json({ error: "Failed to create restriction" });
    }
  });

  // Update staff restriction
  app.patch("/api/staff-restrictions/:id", async (req, res) => {
    try {
      const restriction = await storage.updateStaffRestriction(req.params.id, req.body);
      if (!restriction) {
        return res.status(404).json({ error: "Restriction not found" });
      }
      res.json(restriction);
    } catch (error) {
      console.error("Error updating staff restriction:", error);
      res.status(500).json({ error: "Failed to update restriction" });
    }
  });

  // Delete staff restriction
  app.delete("/api/staff-restrictions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStaffRestriction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Restriction not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff restriction:", error);
      res.status(500).json({ error: "Failed to delete restriction" });
    }
  });

  // ==================== STAFF AVAILABILITY ROUTES ====================

  // Get availability by staff
  app.get("/api/staff/:staffId/availability", async (req, res) => {
    try {
      const availability = await storage.getAvailabilityByStaff(req.params.staffId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching staff availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Create availability window (triggers revalidation of affected appointments)
  app.post("/api/staff/:staffId/availability", async (req, res) => {
    try {
      const validationResult = insertStaffAvailabilityWindowSchema.safeParse({
        ...req.body,
        staffId: req.params.staffId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const window = await storage.createAvailabilityWindow(validationResult.data);
      
      // Trigger async revalidation of affected appointments
      const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
      staffAssignmentValidator.revalidateStaffFutureAppointments(req.params.staffId).catch(err => {
        console.error("Error revalidating after availability window created:", err);
      });
      
      res.status(201).json(window);
    } catch (error) {
      console.error("Error creating availability window:", error);
      res.status(500).json({ error: "Failed to create availability window" });
    }
  });

  // Update availability window
  app.patch("/api/availability-windows/:id", async (req, res) => {
    try {
      const window = await storage.updateAvailabilityWindow(req.params.id, req.body);
      if (!window) {
        return res.status(404).json({ error: "Availability window not found" });
      }
      res.json(window);
    } catch (error) {
      console.error("Error updating availability window:", error);
      res.status(500).json({ error: "Failed to update availability window" });
    }
  });

  // Delete availability window
  app.delete("/api/availability-windows/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAvailabilityWindow(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Availability window not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting availability window:", error);
      res.status(500).json({ error: "Failed to delete availability window" });
    }
  });

  // ==================== STAFF UNAVAILABILITY ROUTES ====================

  // Get unavailability by staff
  app.get("/api/staff/:staffId/unavailability", async (req, res) => {
    try {
      const unavailability = await storage.getUnavailabilityByStaff(req.params.staffId);
      res.json(unavailability);
    } catch (error) {
      console.error("Error fetching staff unavailability:", error);
      res.status(500).json({ error: "Failed to fetch unavailability" });
    }
  });

  // Get unavailability by date range
  app.get("/api/unavailability/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const unavailability = await storage.getUnavailabilityByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(unavailability);
    } catch (error) {
      console.error("Error fetching unavailability by date range:", error);
      res.status(500).json({ error: "Failed to fetch unavailability" });
    }
  });

  // Create unavailability period (triggers revalidation of affected appointments)
  app.post("/api/staff/:staffId/unavailability", async (req, res) => {
    try {
      const validationResult = insertStaffUnavailabilityPeriodSchema.safeParse({
        ...req.body,
        staffId: req.params.staffId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const period = await storage.createUnavailabilityPeriod(validationResult.data);
      
      // Trigger async revalidation of affected appointments
      const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
      staffAssignmentValidator.revalidateStaffFutureAppointments(req.params.staffId).catch(err => {
        console.error("Error revalidating after unavailability period created:", err);
      });
      
      res.status(201).json(period);
    } catch (error) {
      console.error("Error creating unavailability period:", error);
      res.status(500).json({ error: "Failed to create unavailability period" });
    }
  });

  // Update unavailability period
  app.patch("/api/unavailability-periods/:id", async (req, res) => {
    try {
      const period = await storage.updateUnavailabilityPeriod(req.params.id, req.body);
      if (!period) {
        return res.status(404).json({ error: "Unavailability period not found" });
      }
      res.json(period);
    } catch (error) {
      console.error("Error updating unavailability period:", error);
      res.status(500).json({ error: "Failed to update unavailability period" });
    }
  });

  // Delete unavailability period
  app.delete("/api/unavailability-periods/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUnavailabilityPeriod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Unavailability period not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting unavailability period:", error);
      res.status(500).json({ error: "Failed to delete unavailability period" });
    }
  });

  // ==================== STAFF STATUS LOGS ROUTES ====================

  // Get current status for all staff
  app.get("/api/staff-statuses", async (req, res) => {
    try {
      const statuses = await storage.getAllCurrentStaffStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching staff statuses:", error);
      res.status(500).json({ error: "Failed to fetch staff statuses" });
    }
  });

  // Get current status for staff
  app.get("/api/staff/:staffId/status", async (req, res) => {
    try {
      const status = await storage.getCurrentStaffStatus(req.params.staffId);
      res.json(status || null);
    } catch (error) {
      console.error("Error fetching staff status:", error);
      res.status(500).json({ error: "Failed to fetch staff status" });
    }
  });

  // Get status history for staff
  app.get("/api/staff/:staffId/status-history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getStaffStatusHistory(req.params.staffId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching staff status history:", error);
      res.status(500).json({ error: "Failed to fetch status history" });
    }
  });

  // Create staff status log (check in/out)
  app.post("/api/staff/:staffId/status", async (req, res) => {
    try {
      const validationResult = insertStaffStatusLogSchema.safeParse({
        ...req.body,
        staffId: req.params.staffId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const log = await storage.createStaffStatusLog(validationResult.data);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating staff status log:", error);
      res.status(500).json({ error: "Failed to create status log" });
    }
  });

  // ==================== CARE PLANS ROUTES ====================

  // Get care plans by client
  app.get("/api/clients/:clientId/care-plans", async (req, res) => {
    try {
      const carePlans = await storage.getCarePlansByClient(req.params.clientId);
      res.json(carePlans);
    } catch (error) {
      console.error("Error fetching care plans:", error);
      res.status(500).json({ error: "Failed to fetch care plans" });
    }
  });

  // Get active care plan by client
  app.get("/api/clients/:clientId/care-plans/active", async (req, res) => {
    try {
      const carePlan = await storage.getActiveCarePlanByClient(req.params.clientId);
      res.json(carePlan || null);
    } catch (error) {
      console.error("Error fetching active care plan:", error);
      res.status(500).json({ error: "Failed to fetch active care plan" });
    }
  });

  // Get care plan by ID
  app.get("/api/care-plans/:id", async (req, res) => {
    try {
      const carePlan = await storage.getCarePlanById(req.params.id);
      if (!carePlan) {
        return res.status(404).json({ error: "Care plan not found" });
      }
      res.json(carePlan);
    } catch (error) {
      console.error("Error fetching care plan:", error);
      res.status(500).json({ error: "Failed to fetch care plan" });
    }
  });

  // Create care plan
  app.post("/api/clients/:clientId/care-plans", async (req, res) => {
    try {
      const validationResult = insertCarePlanSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const carePlan = await storage.createCarePlan(validationResult.data);
      res.status(201).json(carePlan);
    } catch (error) {
      console.error("Error creating care plan:", error);
      res.status(500).json({ error: "Failed to create care plan" });
    }
  });

  // Update care plan
  app.patch("/api/care-plans/:id", async (req, res) => {
    try {
      const carePlan = await storage.updateCarePlan(req.params.id, req.body);
      if (!carePlan) {
        return res.status(404).json({ error: "Care plan not found" });
      }
      res.json(carePlan);
    } catch (error) {
      console.error("Error updating care plan:", error);
      res.status(500).json({ error: "Failed to update care plan" });
    }
  });

  // Archive care plan
  app.post("/api/care-plans/:id/archive", async (req, res) => {
    try {
      const { userId, userName, reason } = req.body;
      if (!userId || !userName) {
        return res.status(400).json({ error: "userId and userName are required" });
      }
      const carePlan = await storage.archiveCarePlan(req.params.id, userId, userName, reason);
      if (!carePlan) {
        return res.status(404).json({ error: "Care plan not found" });
      }
      res.json(carePlan);
    } catch (error) {
      console.error("Error archiving care plan:", error);
      res.status(500).json({ error: "Failed to archive care plan" });
    }
  });

  // ==================== CARE PLAN HEALTH MATTERS ROUTES ====================

  // Get health matters by care plan
  app.get("/api/care-plans/:carePlanId/health-matters", async (req, res) => {
    try {
      const healthMatters = await storage.getHealthMattersByCarePlan(req.params.carePlanId);
      res.json(healthMatters);
    } catch (error) {
      console.error("Error fetching health matters:", error);
      res.status(500).json({ error: "Failed to fetch health matters" });
    }
  });

  // Create health matter
  app.post("/api/care-plans/:carePlanId/health-matters", async (req, res) => {
    try {
      const validationResult = insertCarePlanHealthMatterSchema.safeParse({
        ...req.body,
        carePlanId: req.params.carePlanId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const healthMatter = await storage.createHealthMatter(validationResult.data);
      res.status(201).json(healthMatter);
    } catch (error) {
      console.error("Error creating health matter:", error);
      res.status(500).json({ error: "Failed to create health matter" });
    }
  });

  // Update health matter
  app.patch("/api/health-matters/:id", async (req, res) => {
    try {
      const healthMatter = await storage.updateHealthMatter(req.params.id, req.body);
      if (!healthMatter) {
        return res.status(404).json({ error: "Health matter not found" });
      }
      res.json(healthMatter);
    } catch (error) {
      console.error("Error updating health matter:", error);
      res.status(500).json({ error: "Failed to update health matter" });
    }
  });

  // Delete health matter
  app.delete("/api/health-matters/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHealthMatter(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Health matter not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting health matter:", error);
      res.status(500).json({ error: "Failed to delete health matter" });
    }
  });

  // ==================== CARE PLAN DIAGNOSES ROUTES ====================

  // Get diagnoses by care plan
  app.get("/api/care-plans/:carePlanId/diagnoses", async (req, res) => {
    try {
      const diagnoses = await storage.getDiagnosesByCarePlan(req.params.carePlanId);
      res.json(diagnoses);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
      res.status(500).json({ error: "Failed to fetch diagnoses" });
    }
  });

  // Create diagnosis
  app.post("/api/care-plans/:carePlanId/diagnoses", async (req, res) => {
    try {
      const validationResult = insertCarePlanDiagnosisSchema.safeParse({
        ...req.body,
        carePlanId: req.params.carePlanId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const diagnosis = await storage.createCarePlanDiagnosis(validationResult.data);
      res.status(201).json(diagnosis);
    } catch (error) {
      console.error("Error creating diagnosis:", error);
      res.status(500).json({ error: "Failed to create diagnosis" });
    }
  });

  // Update diagnosis
  app.patch("/api/care-plan-diagnoses/:id", async (req, res) => {
    try {
      const diagnosis = await storage.updateCarePlanDiagnosis(req.params.id, req.body);
      if (!diagnosis) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }
      res.json(diagnosis);
    } catch (error) {
      console.error("Error updating diagnosis:", error);
      res.status(500).json({ error: "Failed to update diagnosis" });
    }
  });

  // Delete diagnosis
  app.delete("/api/care-plan-diagnoses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCarePlanDiagnosis(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting diagnosis:", error);
      res.status(500).json({ error: "Failed to delete diagnosis" });
    }
  });

  // ==================== CARE PLAN EMERGENCY CONTACTS ROUTES ====================

  // Get emergency contacts by care plan
  app.get("/api/care-plans/:carePlanId/emergency-contacts", async (req, res) => {
    try {
      const contacts = await storage.getEmergencyContactsByCarePlan(req.params.carePlanId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ error: "Failed to fetch emergency contacts" });
    }
  });

  // Create emergency contact
  app.post("/api/care-plans/:carePlanId/emergency-contacts", async (req, res) => {
    try {
      const validationResult = insertCarePlanEmergencyContactSchema.safeParse({
        ...req.body,
        carePlanId: req.params.carePlanId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const contact = await storage.createCarePlanEmergencyContact(validationResult.data);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(500).json({ error: "Failed to create emergency contact" });
    }
  });

  // Update emergency contact
  app.patch("/api/care-plan-emergency-contacts/:id", async (req, res) => {
    try {
      const contact = await storage.updateCarePlanEmergencyContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Emergency contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating emergency contact:", error);
      res.status(500).json({ error: "Failed to update emergency contact" });
    }
  });

  // Delete emergency contact
  app.delete("/api/care-plan-emergency-contacts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCarePlanEmergencyContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Emergency contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ error: "Failed to delete emergency contact" });
    }
  });

  // ==================== CARE PLAN EMERGENCY PROCEDURES ROUTES ====================

  // Get emergency procedures by care plan
  app.get("/api/care-plans/:carePlanId/emergency-procedures", async (req, res) => {
    try {
      const procedures = await storage.getEmergencyProceduresByCarePlan(req.params.carePlanId);
      res.json(procedures);
    } catch (error) {
      console.error("Error fetching emergency procedures:", error);
      res.status(500).json({ error: "Failed to fetch emergency procedures" });
    }
  });

  // Create emergency procedure
  app.post("/api/care-plans/:carePlanId/emergency-procedures", async (req, res) => {
    try {
      const validationResult = insertCarePlanEmergencyProcedureSchema.safeParse({
        ...req.body,
        carePlanId: req.params.carePlanId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const procedure = await storage.createCarePlanEmergencyProcedure(validationResult.data);
      res.status(201).json(procedure);
    } catch (error) {
      console.error("Error creating emergency procedure:", error);
      res.status(500).json({ error: "Failed to create emergency procedure" });
    }
  });

  // Update emergency procedure
  app.patch("/api/care-plan-emergency-procedures/:id", async (req, res) => {
    try {
      const procedure = await storage.updateCarePlanEmergencyProcedure(req.params.id, req.body);
      if (!procedure) {
        return res.status(404).json({ error: "Emergency procedure not found" });
      }
      res.json(procedure);
    } catch (error) {
      console.error("Error updating emergency procedure:", error);
      res.status(500).json({ error: "Failed to update emergency procedure" });
    }
  });

  // Delete emergency procedure
  app.delete("/api/care-plan-emergency-procedures/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCarePlanEmergencyProcedure(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Emergency procedure not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting emergency procedure:", error);
      res.status(500).json({ error: "Failed to delete emergency procedure" });
    }
  });

  // ==================== FORM TEMPLATES ROUTES ====================

  // Get all form templates
  app.get("/api/form-templates", async (req, res) => {
    try {
      const templates = await storage.getAllFormTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching form templates:", error);
      res.status(500).json({ error: "Failed to fetch form templates" });
    }
  });

  // Get active form templates
  app.get("/api/form-templates/active", async (req, res) => {
    try {
      const templates = await storage.getActiveFormTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active form templates:", error);
      res.status(500).json({ error: "Failed to fetch active form templates" });
    }
  });

  // Get form templates by category
  app.get("/api/form-templates/category/:category", async (req, res) => {
    try {
      const templates = await storage.getFormTemplatesByCategory(req.params.category);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching form templates by category:", error);
      res.status(500).json({ error: "Failed to fetch form templates" });
    }
  });

  // Get form template by ID
  app.get("/api/form-templates/:id", async (req, res) => {
    try {
      const template = await storage.getFormTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching form template:", error);
      res.status(500).json({ error: "Failed to fetch form template" });
    }
  });

  // Create form template
  app.post("/api/form-templates", async (req, res) => {
    try {
      const validationResult = insertFormTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const template = await storage.createFormTemplate(validationResult.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating form template:", error);
      res.status(500).json({ error: "Failed to create form template" });
    }
  });

  // Update form template
  app.patch("/api/form-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateFormTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating form template:", error);
      res.status(500).json({ error: "Failed to update form template" });
    }
  });

  // Delete form template
  app.delete("/api/form-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFormTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Form template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form template:", error);
      res.status(500).json({ error: "Failed to delete form template" });
    }
  });

  // ==================== FORM TEMPLATE FIELDS ROUTES ====================

  // Get fields by template
  app.get("/api/form-templates/:templateId/fields", async (req, res) => {
    try {
      const fields = await storage.getFieldsByTemplate(req.params.templateId);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching template fields:", error);
      res.status(500).json({ error: "Failed to fetch template fields" });
    }
  });

  // Create template field
  app.post("/api/form-templates/:templateId/fields", async (req, res) => {
    try {
      const validationResult = insertFormTemplateFieldSchema.safeParse({
        ...req.body,
        templateId: req.params.templateId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const field = await storage.createTemplateField(validationResult.data);
      res.status(201).json(field);
    } catch (error) {
      console.error("Error creating template field:", error);
      res.status(500).json({ error: "Failed to create template field" });
    }
  });

  // Update template field
  app.patch("/api/template-fields/:id", async (req, res) => {
    try {
      const field = await storage.updateTemplateField(req.params.id, req.body);
      if (!field) {
        return res.status(404).json({ error: "Template field not found" });
      }
      res.json(field);
    } catch (error) {
      console.error("Error updating template field:", error);
      res.status(500).json({ error: "Failed to update template field" });
    }
  });

  // Delete template field
  app.delete("/api/template-fields/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTemplateField(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template field not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template field:", error);
      res.status(500).json({ error: "Failed to delete template field" });
    }
  });

  // Delete all fields by template
  app.delete("/api/form-templates/:templateId/fields", async (req, res) => {
    try {
      await storage.deleteFieldsByTemplate(req.params.templateId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template fields:", error);
      res.status(500).json({ error: "Failed to delete template fields" });
    }
  });

  // ==================== FORM SUBMISSIONS ROUTES ====================

  // Get submissions by client
  app.get("/api/clients/:clientId/form-submissions", async (req, res) => {
    try {
      const submissions = await storage.getSubmissionsByClient(req.params.clientId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ error: "Failed to fetch form submissions" });
    }
  });

  // Get submissions by template
  app.get("/api/form-templates/:templateId/submissions", async (req, res) => {
    try {
      const submissions = await storage.getSubmissionsByTemplate(req.params.templateId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ error: "Failed to fetch form submissions" });
    }
  });

  // Get submission by ID
  app.get("/api/form-submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching form submission:", error);
      res.status(500).json({ error: "Failed to fetch form submission" });
    }
  });

  // Create form submission
  app.post("/api/form-submissions", async (req, res) => {
    try {
      const validationResult = insertFormSubmissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      
      // Calculate expiry date based on validity period
      let expiryDate: string | undefined;
      if (validationResult.data.validityPeriod) {
        const baseDate = new Date();
        if (validationResult.data.validityPeriod === "annual") {
          baseDate.setFullYear(baseDate.getFullYear() + 1);
        } else if (validationResult.data.validityPeriod === "6-monthly") {
          baseDate.setMonth(baseDate.getMonth() + 6);
        }
        expiryDate = baseDate.toISOString().split('T')[0];
      }
      
      const submission = await storage.createFormSubmission({
        ...validationResult.data,
        expiryDate,
      });
      
      // If form has a linked document type, update the client's compliance date
      if (submission.linkedDocumentType && submission.clientId && submission.status === "submitted") {
        // Map linked document types to client schema field names
        const DOCUMENT_TYPE_TO_CLIENT_FIELD: Record<string, string> = {
          "serviceAgreement": "serviceAgreementDate",
          "consentForm": "consentFormDate",
          "riskAssessment": "riskAssessmentDate",
          "selfAssessmentMedx": "selfAssessmentMedxDate",
          "medicationConsent": "medicationConsentDate",
          "personalEmergencyPlan": "personalEmergencyPlanDate",
          "carePlan": "carePlanDate",
          "healthSummary": "healthSummaryDate",
          "woundCarePlan": "woundCarePlanDate",
          "ndisConsentForm": "ndisConsentFormDate",
        };
        
        const clientField = DOCUMENT_TYPE_TO_CLIENT_FIELD[submission.linkedDocumentType];
        if (clientField) {
          try {
            const client = await storage.getClient(submission.clientId);
            if (client) {
              const todayDate = new Date().toISOString().split('T')[0];
              const updateData: Record<string, string> = {};
              updateData[clientField] = todayDate;
              await storage.updateClient(submission.clientId, updateData);
              
              // Log the compliance update
              const user = req.user as any;
              await storage.createAuditLogEntry({
                userId: user?.id,
                userName: user?.fullName || user?.email || "System",
                action: "COMPLIANCE_DATE_UPDATED",
                resourceType: "client",
                resourceId: submission.clientId,
                changes: {
                  documentType: submission.linkedDocumentType,
                  clientField: clientField,
                  newDate: todayDate,
                  sourceSubmissionId: submission.id,
                },
                ipAddress: req.ip || req.socket.remoteAddress,
              });
            }
          } catch (updateError) {
            console.error("Error updating client compliance date:", updateError);
            // Continue - the form was created successfully, just the compliance update failed
          }
        }
      }
      
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating form submission:", error);
      res.status(500).json({ error: "Failed to create form submission" });
    }
  });

  // Update form submission
  app.patch("/api/form-submissions/:id", async (req, res) => {
    try {
      const submission = await storage.updateFormSubmission(req.params.id, req.body);
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error updating form submission:", error);
      res.status(500).json({ error: "Failed to update form submission" });
    }
  });

  // ==================== FORM SUBMISSION VALUES ROUTES ====================

  // Get values by submission
  app.get("/api/form-submissions/:submissionId/values", async (req, res) => {
    try {
      const values = await storage.getValuesBySubmission(req.params.submissionId);
      res.json(values);
    } catch (error) {
      console.error("Error fetching submission values:", error);
      res.status(500).json({ error: "Failed to fetch submission values" });
    }
  });

  // Create submission value
  app.post("/api/form-submissions/:submissionId/values", async (req, res) => {
    try {
      const validationResult = insertFormSubmissionValueSchema.safeParse({
        ...req.body,
        submissionId: req.params.submissionId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const value = await storage.createSubmissionValue(validationResult.data);
      res.status(201).json(value);
    } catch (error) {
      console.error("Error creating submission value:", error);
      res.status(500).json({ error: "Failed to create submission value" });
    }
  });

  // Update submission value
  app.patch("/api/submission-values/:id", async (req, res) => {
    try {
      const value = await storage.updateSubmissionValue(req.params.id, req.body);
      if (!value) {
        return res.status(404).json({ error: "Submission value not found" });
      }
      res.json(value);
    } catch (error) {
      console.error("Error updating submission value:", error);
      res.status(500).json({ error: "Failed to update submission value" });
    }
  });

  // ==================== FORM SIGNATURES ROUTES ====================

  // Get signatures by submission
  app.get("/api/form-submissions/:submissionId/signatures", async (req, res) => {
    try {
      const signatures = await storage.getSignaturesBySubmission(req.params.submissionId);
      res.json(signatures);
    } catch (error) {
      console.error("Error fetching form signatures:", error);
      res.status(500).json({ error: "Failed to fetch form signatures" });
    }
  });

  // Create form signature
  app.post("/api/form-submissions/:submissionId/signatures", async (req, res) => {
    try {
      const validationResult = insertFormSignatureSchema.safeParse({
        ...req.body,
        submissionId: req.params.submissionId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const signature = await storage.createFormSignature(validationResult.data);
      res.status(201).json(signature);
    } catch (error) {
      console.error("Error creating form signature:", error);
      res.status(500).json({ error: "Failed to create form signature" });
    }
  });

  // ==================== FORM SUBMISSION ARCHIVE ROUTES ====================

  // Archive a form submission (7-year retention for Australian Privacy Act compliance)
  app.post("/api/form-submissions/:id/archive", async (req, res) => {
    try {
      const submission = await storage.getSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      
      if (submission.isArchived === "yes") {
        return res.status(400).json({ error: "Form submission is already archived" });
      }

      const user = req.user as any;
      const retentionExpiresAt = new Date();
      retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + 7); // 7-year retention
      
      const archivedSubmission = await storage.updateFormSubmission(req.params.id, {
        isArchived: "yes",
        archivedAt: new Date(),
        archivedById: user?.id,
        archivedByName: user?.fullName || user?.email || "System",
        retentionExpiresAt,
      });

      // Log the archive action
      if (archivedSubmission) {
        await storage.createAuditLogEntry({
          userId: user?.id,
          userName: user?.fullName || user?.email || "System",
          action: "FORM_ARCHIVED",
          resourceType: "form_submission",
          resourceId: req.params.id,
          changes: {
            submissionId: req.params.id,
            templateId: submission.templateId,
            clientId: submission.clientId,
            retentionExpiresAt: retentionExpiresAt.toISOString(),
          },
          ipAddress: req.ip || req.socket.remoteAddress,
        });
      }

      res.json(archivedSubmission);
    } catch (error) {
      console.error("Error archiving form submission:", error);
      res.status(500).json({ error: "Failed to archive form submission" });
    }
  });

  // Unarchive a form submission
  app.post("/api/form-submissions/:id/unarchive", async (req, res) => {
    try {
      const submission = await storage.getSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Form submission not found" });
      }
      
      if (submission.isArchived !== "yes") {
        return res.status(400).json({ error: "Form submission is not archived" });
      }

      const user = req.user as any;
      
      const unarchivedSubmission = await storage.updateFormSubmission(req.params.id, {
        isArchived: "no",
        archivedAt: null,
        archivedById: null,
        archivedByName: null,
      });

      // Log the unarchive action
      if (unarchivedSubmission) {
        await storage.createAuditLogEntry({
          userId: user?.id,
          userName: user?.fullName || user?.email || "System",
          action: "FORM_UNARCHIVED",
          resourceType: "form_submission",
          resourceId: req.params.id,
          changes: {
            submissionId: req.params.id,
            templateId: submission.templateId,
            clientId: submission.clientId,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
        });
      }

      res.json(unarchivedSubmission);
    } catch (error) {
      console.error("Error unarchiving form submission:", error);
      res.status(500).json({ error: "Failed to unarchive form submission" });
    }
  });

  // ==================== APPOINTMENT TYPE REQUIRED FORMS ROUTES ====================

  // Get required forms by appointment type
  app.get("/api/appointment-types/:appointmentType/required-forms", async (req, res) => {
    try {
      const requiredForms = await storage.getRequiredFormsByAppointmentType(req.params.appointmentType);
      res.json(requiredForms);
    } catch (error) {
      console.error("Error fetching required forms:", error);
      res.status(500).json({ error: "Failed to fetch required forms" });
    }
  });

  // Create appointment type required form
  app.post("/api/appointment-types/required-forms", async (req, res) => {
    try {
      const validationResult = insertAppointmentTypeRequiredFormSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const requiredForm = await storage.createAppointmentTypeRequiredForm(validationResult.data);
      res.status(201).json(requiredForm);
    } catch (error) {
      console.error("Error creating required form:", error);
      res.status(500).json({ error: "Failed to create required form" });
    }
  });

  // Delete appointment type required form
  app.delete("/api/appointment-type-required-forms/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAppointmentTypeRequiredForm(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Required form not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting required form:", error);
      res.status(500).json({ error: "Failed to delete required form" });
    }
  });

  // ==================== NON-FACE-TO-FACE SERVICE LOGS ROUTES ====================

  // Get non-face-to-face logs by client
  app.get("/api/clients/:clientId/non-face-to-face-logs", async (req, res) => {
    try {
      const logs = await storage.getNonFaceToFaceLogsByClient(req.params.clientId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching non-face-to-face logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Get non-face-to-face log by ID
  app.get("/api/non-face-to-face-logs/:id", async (req, res) => {
    try {
      const log = await storage.getNonFaceToFaceLogById(req.params.id);
      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error("Error fetching non-face-to-face log:", error);
      res.status(500).json({ error: "Failed to fetch log" });
    }
  });

  // Create non-face-to-face log
  app.post("/api/clients/:clientId/non-face-to-face-logs", async (req, res) => {
    try {
      const validationResult = insertNonFaceToFaceServiceLogSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const log = await storage.createNonFaceToFaceLog(validationResult.data);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating non-face-to-face log:", error);
      res.status(500).json({ error: "Failed to create log" });
    }
  });

  // Update non-face-to-face log
  app.patch("/api/non-face-to-face-logs/:id", async (req, res) => {
    try {
      const log = await storage.updateNonFaceToFaceLog(req.params.id, req.body);
      if (!log) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.json(log);
    } catch (error) {
      console.error("Error updating non-face-to-face log:", error);
      res.status(500).json({ error: "Failed to update log" });
    }
  });

  // Delete non-face-to-face log
  app.delete("/api/non-face-to-face-logs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNonFaceToFaceLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Log not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting non-face-to-face log:", error);
      res.status(500).json({ error: "Failed to delete log" });
    }
  });

  // ==================== DIAGNOSES ROUTES ====================

  // Get all diagnoses
  app.get("/api/diagnoses", async (req, res) => {
    try {
      const { search } = req.query;
      let result;
      if (search && typeof search === "string") {
        result = await storage.searchDiagnoses(search);
      } else {
        result = await storage.getAllDiagnoses();
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
      res.status(500).json({ error: "Failed to fetch diagnoses" });
    }
  });

  // Get diagnosis by ID
  app.get("/api/diagnoses/:id", async (req, res) => {
    try {
      const diagnosis = await storage.getDiagnosisById(req.params.id);
      if (!diagnosis) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }
      res.json(diagnosis);
    } catch (error) {
      console.error("Error fetching diagnosis:", error);
      res.status(500).json({ error: "Failed to fetch diagnosis" });
    }
  });

  // Create diagnosis
  app.post("/api/diagnoses", async (req, res) => {
    try {
      const validationResult = insertDiagnosisSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const diagnosis = await storage.createDiagnosis(validationResult.data);
      res.status(201).json(diagnosis);
    } catch (error) {
      console.error("Error creating diagnosis:", error);
      res.status(500).json({ error: "Failed to create diagnosis" });
    }
  });

  // Update diagnosis
  app.patch("/api/diagnoses/:id", async (req, res) => {
    try {
      const diagnosis = await storage.updateDiagnosis(req.params.id, req.body);
      if (!diagnosis) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }
      res.json(diagnosis);
    } catch (error) {
      console.error("Error updating diagnosis:", error);
      res.status(500).json({ error: "Failed to update diagnosis" });
    }
  });

  // Delete diagnosis (soft delete)
  app.delete("/api/diagnoses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDiagnosis(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting diagnosis:", error);
      res.status(500).json({ error: "Failed to delete diagnosis" });
    }
  });

  // ==================== CLIENT DIAGNOSES ROUTES ====================

  // Get diagnoses by client
  app.get("/api/clients/:clientId/diagnoses", async (req, res) => {
    try {
      const diagnoses = await storage.getDiagnosesByClient(req.params.clientId);
      res.json(diagnoses);
    } catch (error) {
      console.error("Error fetching client diagnoses:", error);
      res.status(500).json({ error: "Failed to fetch client diagnoses" });
    }
  });

  // Add diagnosis to client
  app.post("/api/clients/:clientId/diagnoses", async (req, res) => {
    try {
      const validationResult = insertClientDiagnosisSchema.safeParse({
        ...req.body,
        clientId: req.params.clientId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      const clientDiagnosis = await storage.addDiagnosisToClient(validationResult.data);
      res.status(201).json(clientDiagnosis);
    } catch (error) {
      console.error("Error adding diagnosis to client:", error);
      res.status(500).json({ error: "Failed to add diagnosis" });
    }
  });

  // Update client diagnosis
  app.patch("/api/client-diagnoses/:id", async (req, res) => {
    try {
      const diagnosis = await storage.updateClientDiagnosis(req.params.id, req.body);
      if (!diagnosis) {
        return res.status(404).json({ error: "Client diagnosis not found" });
      }
      res.json(diagnosis);
    } catch (error) {
      console.error("Error updating client diagnosis:", error);
      res.status(500).json({ error: "Failed to update client diagnosis" });
    }
  });

  // Remove diagnosis from client
  app.delete("/api/client-diagnoses/:id", async (req, res) => {
    try {
      const deleted = await storage.removeDiagnosisFromClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client diagnosis not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing diagnosis from client:", error);
      res.status(500).json({ error: "Failed to remove diagnosis" });
    }
  });

  // ==================== SIL HOUSES ROUTES ====================

  // Get all SIL houses
  app.get("/api/sil-houses", async (req, res) => {
    try {
      const { search, status, propertyType } = req.query;
      
      if (search || status || propertyType) {
        const houses = await storage.searchSilHouses(
          search as string || "",
          status as string,
          propertyType as string
        );
        return res.json(houses);
      }
      
      const houses = await storage.getAllSilHouses();
      res.json(houses);
    } catch (error) {
      console.error("Error fetching SIL houses:", error);
      res.status(500).json({ error: "Failed to fetch SIL houses" });
    }
  });

  // Get SIL houses statistics
  app.get("/api/sil-houses/stats", async (req, res) => {
    try {
      const stats = await storage.getSilHouseStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching SIL house stats:", error);
      res.status(500).json({ error: "Failed to fetch SIL house statistics" });
    }
  });

  // Get single SIL house
  app.get("/api/sil-houses/:id", async (req, res) => {
    try {
      const house = await storage.getSilHouseById(req.params.id);
      if (!house) {
        return res.status(404).json({ error: "SIL house not found" });
      }
      
      // Log view action for audit
      const user = (req as any).session?.user;
      if (user) {
        await storage.createSilHouseAuditLog({
          silHouseId: house.id,
          silHouseName: house.houseName,
          action: "view",
          userId: user.id,
          userName: user.displayName,
          details: { viewedAt: new Date().toISOString() }
        });
      }
      
      res.json(house);
    } catch (error) {
      console.error("Error fetching SIL house:", error);
      res.status(500).json({ error: "Failed to fetch SIL house" });
    }
  });

  // Create SIL house
  app.post("/api/sil-houses", async (req, res) => {
    try {
      const validationResult = insertSilHouseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).toString() });
      }
      
      const user = (req as any).session?.user;
      const houseData = {
        ...validationResult.data,
        lastModifiedBy: user?.id,
        lastModifiedByName: user?.displayName
      };
      
      const house = await storage.createSilHouse(houseData);
      
      // Log create action for audit
      if (user) {
        await storage.createSilHouseAuditLog({
          silHouseId: house.id,
          silHouseName: house.houseName,
          action: "create",
          userId: user.id,
          userName: user.displayName,
          details: houseData
        });
      }
      
      res.status(201).json(house);
    } catch (error) {
      console.error("Error creating SIL house:", error);
      res.status(500).json({ error: "Failed to create SIL house" });
    }
  });

  // Update SIL house
  app.patch("/api/sil-houses/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      const existingHouse = await storage.getSilHouseById(req.params.id);
      if (!existingHouse) {
        return res.status(404).json({ error: "SIL house not found" });
      }
      
      const updateData = {
        ...req.body,
        lastModifiedBy: user?.id,
        lastModifiedByName: user?.displayName
      };
      
      const house = await storage.updateSilHouse(req.params.id, updateData);
      if (!house) {
        return res.status(404).json({ error: "SIL house not found" });
      }
      
      // Log update action for audit
      if (user) {
        await storage.createSilHouseAuditLog({
          silHouseId: house.id,
          silHouseName: house.houseName,
          action: "update",
          userId: user.id,
          userName: user.displayName,
          details: { 
            before: existingHouse, 
            after: house,
            changes: req.body 
          }
        });
      }
      
      res.json(house);
    } catch (error) {
      console.error("Error updating SIL house:", error);
      res.status(500).json({ error: "Failed to update SIL house" });
    }
  });

  // Delete SIL house
  app.delete("/api/sil-houses/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      const { reason } = req.body;
      
      const existingHouse = await storage.getSilHouseById(req.params.id);
      if (!existingHouse) {
        return res.status(404).json({ error: "SIL house not found" });
      }
      
      // Log delete action BEFORE deletion for audit trail
      if (user) {
        await storage.createSilHouseAuditLog({
          silHouseId: existingHouse.id,
          silHouseName: existingHouse.houseName,
          action: "delete",
          userId: user.id,
          userName: user.displayName,
          deleteReason: reason || "No reason provided",
          details: existingHouse
        });
      }
      
      const deleted = await storage.deleteSilHouse(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "SIL house not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting SIL house:", error);
      res.status(500).json({ error: "Failed to delete SIL house" });
    }
  });

  // Get SIL house audit logs
  app.get("/api/sil-houses/:id/audit-log", async (req, res) => {
    try {
      const logs = await storage.getSilHouseAuditLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching SIL house audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get all SIL house audit logs (for export)
  app.get("/api/sil-houses-audit-log", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      
      // Log export action
      if (user) {
        await storage.createSilHouseAuditLog({
          action: "export",
          userId: user.id,
          userName: user.displayName,
          details: { exportType: "audit_log", exportedAt: new Date().toISOString() }
        });
      }
      
      const logs = await storage.getSilHouseAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching all SIL house audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Export SIL houses data (logs export action)
  app.get("/api/sil-houses/export/data", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      const houses = await storage.getAllSilHouses();
      
      // Log export action
      if (user) {
        await storage.createSilHouseAuditLog({
          action: "export",
          userId: user.id,
          userName: user.displayName,
          details: { 
            exportType: "houses_data", 
            exportedAt: new Date().toISOString(),
            housesCount: houses.length
          }
        });
      }
      
      res.json(houses);
    } catch (error) {
      console.error("Error exporting SIL houses:", error);
      res.status(500).json({ error: "Failed to export SIL houses" });
    }
  });

  // ============================================
  // SERVICE SUBTYPES API
  // ============================================

  // Get all active service subtypes
  app.get("/api/service-subtypes", async (req, res) => {
    try {
      const subtypes = await storage.getAllServiceSubtypes();
      res.json(subtypes);
    } catch (error) {
      console.error("Error fetching service subtypes:", error);
      res.status(500).json({ error: "Failed to fetch service subtypes" });
    }
  });

  // Get service subtypes by type
  app.get("/api/service-subtypes/:type", async (req, res) => {
    try {
      const serviceType = req.params.type as "Support Work" | "Nursing";
      if (serviceType !== "Support Work" && serviceType !== "Nursing") {
        return res.status(400).json({ error: "Invalid service type. Must be 'Support Work' or 'Nursing'" });
      }
      const subtypes = await storage.getServiceSubtypesByType(serviceType);
      res.json(subtypes);
    } catch (error) {
      console.error("Error fetching service subtypes by type:", error);
      res.status(500).json({ error: "Failed to fetch service subtypes" });
    }
  });

  // Create service subtype (admin/manager only)
  app.post("/api/service-subtypes", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userRoles = user.roles || [];
      const isAdminOrManager = userRoles.some((role: string) => 
        ["superadmin", "admin", "operations_manager", "clinical_manager"].includes(role)
      );
      
      if (!isAdminOrManager) {
        return res.status(403).json({ error: "Access denied. Admin or Manager role required." });
      }
      
      const { name, serviceType } = req.body;
      if (!name || !serviceType) {
        return res.status(400).json({ error: "Name and serviceType are required" });
      }
      
      if (serviceType !== "Support Work" && serviceType !== "Nursing") {
        return res.status(400).json({ error: "Invalid service type. Must be 'Support Work' or 'Nursing'" });
      }
      
      const subtype = await storage.createServiceSubtype({
        name,
        serviceType,
        isActive: "yes"
      });
      
      res.status(201).json(subtype);
    } catch (error) {
      console.error("Error creating service subtype:", error);
      res.status(500).json({ error: "Failed to create service subtype" });
    }
  });

  // Update service subtype (admin/manager only)
  app.patch("/api/service-subtypes/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userRoles = user.roles || [];
      const isAdminOrManager = userRoles.some((role: string) => 
        ["superadmin", "admin", "operations_manager", "clinical_manager"].includes(role)
      );
      
      if (!isAdminOrManager) {
        return res.status(403).json({ error: "Access denied. Admin or Manager role required." });
      }
      
      const { name, serviceType, isActive } = req.body;
      const updates: any = {};
      
      if (name !== undefined) updates.name = name;
      if (serviceType !== undefined) {
        if (serviceType !== "Support Work" && serviceType !== "Nursing") {
          return res.status(400).json({ error: "Invalid service type. Must be 'Support Work' or 'Nursing'" });
        }
        updates.serviceType = serviceType;
      }
      if (isActive !== undefined) {
        if (isActive !== "yes" && isActive !== "no") {
          return res.status(400).json({ error: "Invalid isActive value. Must be 'yes' or 'no'" });
        }
        updates.isActive = isActive;
      }
      
      const subtype = await storage.updateServiceSubtype(req.params.id, updates);
      if (!subtype) {
        return res.status(404).json({ error: "Service subtype not found" });
      }
      
      res.json(subtype);
    } catch (error) {
      console.error("Error updating service subtype:", error);
      res.status(500).json({ error: "Failed to update service subtype" });
    }
  });

  // Delete (soft delete) service subtype (admin/manager only)
  app.delete("/api/service-subtypes/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userRoles = user.roles || [];
      const isAdminOrManager = userRoles.some((role: string) => 
        ["superadmin", "admin", "operations_manager", "clinical_manager"].includes(role)
      );
      
      if (!isAdminOrManager) {
        return res.status(403).json({ error: "Access denied. Admin or Manager role required." });
      }
      
      const deleted = await storage.deleteServiceSubtype(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Service subtype not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service subtype:", error);
      res.status(500).json({ error: "Failed to delete service subtype" });
    }
  });

  // Seed default service subtypes endpoint
  app.post("/api/service-subtypes/seed", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userRoles = user.roles || [];
      const isAdmin = userRoles.some((role: string) => 
        ["superadmin", "admin"].includes(role)
      );
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }
      
      const defaultSubtypes = [
        { name: "Self-Care", serviceType: "Support Work" as const, isActive: "yes" as const },
        { name: "Community Access", serviceType: "Support Work" as const, isActive: "yes" as const },
        { name: "Capacity Building", serviceType: "Support Work" as const, isActive: "yes" as const },
        { name: "Welfare Nursing", serviceType: "Nursing" as const, isActive: "yes" as const },
        { name: "Medx Admin", serviceType: "Nursing" as const, isActive: "yes" as const },
        { name: "Assessment", serviceType: "Nursing" as const, isActive: "yes" as const },
        { name: "Wound Care", serviceType: "Nursing" as const, isActive: "yes" as const },
      ];
      
      const createdSubtypes = [];
      for (const subtype of defaultSubtypes) {
        const existing = await storage.getAllServiceSubtypes();
        const alreadyExists = existing.some(s => 
          s.name === subtype.name && s.serviceType === subtype.serviceType
        );
        
        if (!alreadyExists) {
          const created = await storage.createServiceSubtype(subtype);
          createdSubtypes.push(created);
        }
      }
      
      res.json({ 
        message: `Seeded ${createdSubtypes.length} service subtypes`,
        created: createdSubtypes 
      });
    } catch (error) {
      console.error("Error seeding service subtypes:", error);
      res.status(500).json({ error: "Failed to seed service subtypes" });
    }
  });

  // Seed default form templates endpoint (EmpowerLink Consent Form)
  app.post("/api/form-templates/seed", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userRoles = user.roles || [];
      const isAdmin = userRoles.some((role: string) => 
        ["superadmin", "admin", "director", "operations_manager"].includes(role)
      );
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Access denied. Admin role required." });
      }
      
      // Check if EmpowerLink Consent Form already exists
      const existingTemplates = await storage.getAllFormTemplates();
      const consentFormExists = existingTemplates.some(t => 
        t.name === "EmpowerLink Consent Form" && t.category === "consent"
      );
      
      if (consentFormExists) {
        return res.json({ message: "EmpowerLink Consent Form template already exists", created: [] });
      }
      
      // Create the EmpowerLink Consent Form template
      const consentForm = await storage.createFormTemplate({
        name: "EmpowerLink Consent Form",
        description: "Comprehensive consent form for EmpowerLink clients covering privacy, information sharing, and service agreements in accordance with Australian Privacy Principles.",
        category: "consent",
        status: "active",
        version: "1.0",
        requiresSignature: "yes",
        allowDraft: "yes",
        createdById: user.id,
        createdByName: user.displayName
      });
      
      // Define all fields for the consent form
      const consentFormFields = [
        // Section 1: Participant Information
        { fieldKey: "section_participant", label: "Participant Information", fieldType: "section_header", order: "1", section: "Participant Details" },
        { fieldKey: "participant_name", label: "Participant Full Name", fieldType: "text", isRequired: "yes", order: "2", section: "Participant Details", placeholder: "Enter participant's full legal name" },
        { fieldKey: "date_of_birth", label: "Date of Birth", fieldType: "date", isRequired: "yes", order: "3", section: "Participant Details", width: "half" },
        { fieldKey: "address", label: "Residential Address", fieldType: "textarea", isRequired: "yes", order: "4", section: "Participant Details", placeholder: "Full street address" },
        { fieldKey: "phone", label: "Phone Number", fieldType: "text", isRequired: "yes", order: "5", section: "Participant Details", width: "half", pattern: "^[0-9\\s\\-\\+]+$" },
        { fieldKey: "email", label: "Email Address", fieldType: "email", isRequired: "no", order: "6", section: "Participant Details", width: "half" },
        
        // Section 2: NDIS Information (conditional)
        { fieldKey: "section_ndis", label: "NDIS Information", fieldType: "section_header", order: "10", section: "NDIS Details" },
        { fieldKey: "is_ndis_participant", label: "Is the participant an NDIS client?", fieldType: "yes_no", isRequired: "yes", order: "11", section: "NDIS Details", yesLabel: "Yes - NDIS Participant", noLabel: "No - Not NDIS" },
        { fieldKey: "ndis_number", label: "NDIS Number", fieldType: "text", isRequired: "no", order: "12", section: "NDIS Details", placeholder: "e.g., 123456789", conditionalOn: "is_ndis_participant", conditionalValue: "yes", conditionalOperator: "equals" },
        { fieldKey: "ndis_plan_start", label: "Plan Start Date", fieldType: "date", isRequired: "no", order: "13", section: "NDIS Details", width: "half", conditionalOn: "is_ndis_participant", conditionalValue: "yes", conditionalOperator: "equals" },
        { fieldKey: "ndis_plan_end", label: "Plan End Date", fieldType: "date", isRequired: "no", order: "14", section: "NDIS Details", width: "half", conditionalOn: "is_ndis_participant", conditionalValue: "yes", conditionalOperator: "equals" },
        
        // Section 3: Representative/Guardian (if applicable)
        { fieldKey: "section_representative", label: "Representative / Guardian (if applicable)", fieldType: "section_header", order: "20", section: "Representative" },
        { fieldKey: "has_representative", label: "Does someone else make decisions for the participant?", fieldType: "yes_no", isRequired: "yes", order: "21", section: "Representative" },
        { fieldKey: "representative_name", label: "Representative Full Name", fieldType: "text", isRequired: "no", order: "22", section: "Representative", conditionalOn: "has_representative", conditionalValue: "yes", conditionalOperator: "equals" },
        { fieldKey: "representative_relationship", label: "Relationship to Participant", fieldType: "select", isRequired: "no", order: "23", section: "Representative", conditionalOn: "has_representative", conditionalValue: "yes", conditionalOperator: "equals", options: [{ value: "parent", label: "Parent" }, { value: "guardian", label: "Legal Guardian" }, { value: "power_of_attorney", label: "Power of Attorney" }, { value: "family_member", label: "Family Member" }, { value: "other", label: "Other" }] },
        { fieldKey: "representative_phone", label: "Representative Phone", fieldType: "text", isRequired: "no", order: "24", section: "Representative", width: "half", conditionalOn: "has_representative", conditionalValue: "yes", conditionalOperator: "equals" },
        { fieldKey: "representative_email", label: "Representative Email", fieldType: "email", isRequired: "no", order: "25", section: "Representative", width: "half", conditionalOn: "has_representative", conditionalValue: "yes", conditionalOperator: "equals" },
        
        // Section 4: Privacy & Information Collection
        { fieldKey: "section_privacy", label: "Privacy & Information Collection", fieldType: "section_header", order: "30", section: "Privacy Consent" },
        { fieldKey: "privacy_intro", label: "EmpowerLink collects personal and health information to provide quality care and services. Your information will be handled in accordance with Australian Privacy Principles and the Privacy Act 1988.", fieldType: "paragraph", order: "31", section: "Privacy Consent" },
        { fieldKey: "consent_personal_info", label: "I consent to EmpowerLink collecting my personal information (name, contact details, date of birth) for the purpose of providing services", fieldType: "checkbox", isRequired: "yes", order: "32", section: "Privacy Consent" },
        { fieldKey: "consent_health_info", label: "I consent to EmpowerLink collecting my health information (medical history, diagnoses, medications) for the purpose of providing safe and appropriate care", fieldType: "checkbox", isRequired: "yes", order: "33", section: "Privacy Consent" },
        { fieldKey: "consent_share_providers", label: "I consent to EmpowerLink sharing my information with relevant healthcare providers (GPs, specialists, hospitals) when necessary for my care", fieldType: "checkbox", isRequired: "yes", order: "34", section: "Privacy Consent" },
        { fieldKey: "consent_share_ndis", label: "I consent to EmpowerLink sharing my information with the NDIA and my plan manager/support coordinator for NDIS purposes", fieldType: "checkbox", isRequired: "no", order: "35", section: "Privacy Consent", conditionalOn: "is_ndis_participant", conditionalValue: "yes", conditionalOperator: "equals" },
        
        // Section 5: Communication Preferences
        { fieldKey: "section_communication", label: "Communication Preferences", fieldType: "section_header", order: "40", section: "Communication" },
        { fieldKey: "preferred_contact", label: "Preferred method of contact", fieldType: "select", isRequired: "yes", order: "41", section: "Communication", options: [{ value: "phone", label: "Phone" }, { value: "sms", label: "SMS/Text" }, { value: "email", label: "Email" }, { value: "postal", label: "Postal Mail" }] },
        { fieldKey: "consent_photos", label: "I consent to photos/videos being taken for progress documentation (internal use only)", fieldType: "checkbox", isRequired: "no", order: "42", section: "Communication" },
        { fieldKey: "consent_marketing", label: "I consent to receiving information about EmpowerLink services and updates", fieldType: "checkbox", isRequired: "no", order: "43", section: "Communication" },
        
        // Section 6: Emergency Procedures
        { fieldKey: "section_emergency", label: "Emergency & Medical Procedures", fieldType: "section_header", order: "50", section: "Emergency" },
        { fieldKey: "consent_emergency", label: "In an emergency, I consent to EmpowerLink staff calling emergency services (000) and providing necessary information to paramedics/hospital staff", fieldType: "checkbox", isRequired: "yes", order: "51", section: "Emergency" },
        { fieldKey: "consent_first_aid", label: "I consent to EmpowerLink staff providing first aid assistance if required", fieldType: "checkbox", isRequired: "yes", order: "52", section: "Emergency" },
        { fieldKey: "emergency_contact_name", label: "Emergency Contact Name", fieldType: "text", isRequired: "yes", order: "53", section: "Emergency", width: "half" },
        { fieldKey: "emergency_contact_phone", label: "Emergency Contact Phone", fieldType: "text", isRequired: "yes", order: "54", section: "Emergency", width: "half" },
        { fieldKey: "emergency_contact_relationship", label: "Relationship", fieldType: "text", isRequired: "yes", order: "55", section: "Emergency", width: "half" },
        
        // Section 7: Rights & Acknowledgments
        { fieldKey: "section_rights", label: "Your Rights", fieldType: "section_header", order: "60", section: "Rights" },
        { fieldKey: "rights_info", label: "You have the right to: access your personal information held by EmpowerLink; request corrections to your information; make a complaint about how your information is handled; withdraw consent at any time (which may affect our ability to provide services).", fieldType: "paragraph", order: "61", section: "Rights" },
        { fieldKey: "ack_rights", label: "I acknowledge that I have been informed of my rights regarding my personal information", fieldType: "checkbox", isRequired: "yes", order: "62", section: "Rights" },
        { fieldKey: "ack_privacy_policy", label: "I acknowledge that I have received and understand the EmpowerLink Privacy Policy", fieldType: "checkbox", isRequired: "yes", order: "63", section: "Rights" },
        { fieldKey: "ack_complaints", label: "I understand how to make a complaint if I am not satisfied with how my information is handled", fieldType: "checkbox", isRequired: "yes", order: "64", section: "Rights" },
        
        // Section 8: Service Agreement
        { fieldKey: "section_service", label: "Service Agreement", fieldType: "section_header", order: "70", section: "Service Agreement" },
        { fieldKey: "ack_service_terms", label: "I agree to the EmpowerLink service terms and conditions as outlined in the Service Agreement", fieldType: "checkbox", isRequired: "yes", order: "71", section: "Service Agreement" },
        { fieldKey: "ack_cancellation", label: "I understand the cancellation policy (24 hours notice required)", fieldType: "checkbox", isRequired: "yes", order: "72", section: "Service Agreement" },
        { fieldKey: "ack_feedback", label: "I understand I can provide feedback or raise concerns at any time", fieldType: "checkbox", isRequired: "yes", order: "73", section: "Service Agreement" },
        
        // Section 9: Additional Notes
        { fieldKey: "section_additional", label: "Additional Information", fieldType: "section_header", order: "80", section: "Additional" },
        { fieldKey: "additional_notes", label: "Any additional information or special requirements", fieldType: "textarea", isRequired: "no", order: "81", section: "Additional", placeholder: "Enter any other information you would like us to know..." },
        
        // Section 10: Signatures
        { fieldKey: "section_signatures", label: "Signatures", fieldType: "section_header", order: "90", section: "Signatures" },
        { fieldKey: "signature_date", label: "Date", fieldType: "date", isRequired: "yes", order: "91", section: "Signatures", width: "half" },
        { fieldKey: "participant_signature", label: "Participant/Representative Signature", fieldType: "signature", isRequired: "yes", order: "92", section: "Signatures" },
        { fieldKey: "witness_required", label: "Is a witness signature required?", fieldType: "yes_no", isRequired: "no", order: "93", section: "Signatures" },
        { fieldKey: "witness_name", label: "Witness Name", fieldType: "text", isRequired: "no", order: "94", section: "Signatures", conditionalOn: "witness_required", conditionalValue: "yes", conditionalOperator: "equals" },
        { fieldKey: "witness_signature", label: "Witness Signature", fieldType: "signature", isRequired: "no", order: "95", section: "Signatures", conditionalOn: "witness_required", conditionalValue: "yes", conditionalOperator: "equals" }
      ];
      
      // Create all fields
      const createdFields = [];
      for (const fieldData of consentFormFields) {
        const field = await storage.createTemplateField({
          templateId: consentForm.id,
          ...fieldData as any
        });
        createdFields.push(field);
      }
      
      res.json({ 
        message: `Created EmpowerLink Consent Form template with ${createdFields.length} fields`,
        template: consentForm,
        fieldsCount: createdFields.length
      });
    } catch (error) {
      console.error("Error seeding form templates:", error);
      res.status(500).json({ error: "Failed to seed form templates" });
    }
  });

  // ============================================
  // NOTIFICATIONS API
  // ============================================

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const notifs = await storage.getNotificationsByUser(userId);
      res.json(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const count = await storage.markAllNotificationsAsRead(userId);
      res.json({ markedAsRead: count });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteNotification(id);
      if (!success) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Get paginated notifications with filters
  app.get("/api/notifications/paginated", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const isRead = req.query.isRead as "yes" | "no" | undefined;
      const type = req.query.type as string | undefined;
      const includeArchived = req.query.includeArchived === "true";
      
      const result = await storage.getNotificationsByUserPaginated(userId, {
        limit,
        offset,
        isRead,
        type,
        includeArchived,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching paginated notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Archive notification (soft delete)
  app.patch("/api/notifications/:id/archive", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.archiveNotification(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error archiving notification:", error);
      res.status(500).json({ error: "Failed to archive notification" });
    }
  });

  // Get notification preferences
  app.get("/api/notifications/preferences", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      let prefs = await storage.getNotificationPreferences(userId);
      
      // Return default preferences if none exist
      if (!prefs) {
        prefs = {
          id: "",
          userId,
          emailEnabled: "yes",
          pushEnabled: "yes",
          soundEnabled: "yes",
          appointmentAlerts: "yes",
          taskAlerts: "yes",
          complianceAlerts: "yes",
          chatAlerts: "yes",
          ticketAlerts: "yes",
          clientAlerts: "yes",
          systemAlerts: "yes",
          quietHoursEnabled: "no",
          quietHoursStart: null,
          quietHoursEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notifications/preferences", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const prefs = await storage.createOrUpdateNotificationPreferences(userId, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Create notification (internal use / admin)
  app.post("/api/notifications", requireAuth, async (req: any, res) => {
    try {
      const userRoles = req.session?.user?.roles || [];
      const isAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager"].includes(role)
      );
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const notification = await storage.createNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // ============================================
  // SUPPORT TICKETS API
  // ============================================

  // Get all tickets (for help desk staff)
  app.get("/api/tickets", requireAuth, async (req: any, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  // Get tickets for current user (my tickets)
  app.get("/api/tickets/my", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const tickets = await storage.getTicketsByUser(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  // Get single ticket
  app.get("/api/tickets/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const ticket = await storage.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  // Create new ticket
  app.post("/api/tickets", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      const userName = req.user?.displayName || req.session?.userName || "Unknown User";
      const userEmail = req.user?.email || req.session?.userEmail;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const validatedData = insertSupportTicketSchema.parse({
        ...req.body,
        createdById: userId,
        createdByName: userName,
        createdByEmail: userEmail
      });

      const ticket = await storage.createTicket(validatedData);

      // Create notification for help desk staff (admins, directors, operations_managers)
      const staffToNotify = await storage.getAllStaff();
      for (const staff of staffToNotify) {
        const user = staff.userId ? await storage.getUser(staff.userId) : null;
        if (user && user.roles && (
          user.roles.includes("admin") || 
          user.roles.includes("director") || 
          user.roles.includes("operations_manager")
        )) {
          const notification = await storage.createNotification({
            userId: user.id,
            type: "ticket_created",
            title: "New Support Ticket",
            message: `${userName} submitted a new ticket: ${ticket.title}`,
            relatedType: "ticket",
            relatedId: ticket.id,
            linkUrl: `/help-desk?ticket=${ticket.id}`
          });
          await broadcastNotification(user.id, notification);
        }
      }

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  // Update ticket
  app.patch("/api/tickets/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const ticket = await storage.updateTicket(id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // Assign ticket
  app.post("/api/tickets/:id/assign", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { assignedToId, assignedToName } = req.body;
      
      const ticket = await storage.assignTicket(id, assignedToId, assignedToName);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Notify the assigned user
      const assignedNotification = await storage.createNotification({
        userId: assignedToId,
        type: "ticket_assigned",
        title: "Ticket Assigned to You",
        message: `You have been assigned to ticket #${ticket.ticketNumber}: ${ticket.title}`,
        relatedType: "ticket",
        relatedId: ticket.id,
        linkUrl: `/help-desk?ticket=${ticket.id}`
      });
      await broadcastNotification(assignedToId, assignedNotification);

      // Notify the ticket creator
      if (ticket.createdById !== assignedToId) {
        const creatorNotification = await storage.createNotification({
          userId: ticket.createdById,
          type: "ticket_updated",
          title: "Your Ticket Has Been Assigned",
          message: `Your ticket #${ticket.ticketNumber} has been assigned to ${assignedToName}`,
          relatedType: "ticket",
          relatedId: ticket.id,
          linkUrl: `/help-desk?ticket=${ticket.id}`
        });
        await broadcastNotification(ticket.createdById, creatorNotification);
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error assigning ticket:", error);
      res.status(500).json({ error: "Failed to assign ticket" });
    }
  });

  // Resolve ticket
  app.post("/api/tickets/:id/resolve", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.userId;
      const userName = req.user?.displayName || req.session?.userName || "Unknown User";
      const { resolutionNotes } = req.body;
      
      const ticket = await storage.resolveTicket(id, userId, userName, resolutionNotes);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Notify the ticket creator
      await storage.createNotification({
        userId: ticket.createdById,
        type: "ticket_updated",
        title: "Your Ticket Has Been Resolved",
        message: `Your ticket #${ticket.ticketNumber} has been resolved by ${userName}`,
        relatedType: "ticket",
        relatedId: ticket.id
      });

      res.json(ticket);
    } catch (error) {
      console.error("Error resolving ticket:", error);
      res.status(500).json({ error: "Failed to resolve ticket" });
    }
  });

  // Close ticket
  app.post("/api/tickets/:id/close", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const ticket = await storage.closeTicket(id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error closing ticket:", error);
      res.status(500).json({ error: "Failed to close ticket" });
    }
  });

  // Get ticket comments
  app.get("/api/tickets/:id/comments", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getTicketComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add ticket comment
  app.post("/api/tickets/:id/comments", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.userId;
      const userName = req.user?.displayName || req.session?.userName || "Unknown User";
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Verify ticket exists
      const ticket = await storage.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const validatedData = insertTicketCommentSchema.parse({
        ...req.body,
        ticketId: id,
        authorId: userId,
        authorName: userName
      });

      const comment = await storage.createTicketComment(validatedData);

      // Notify relevant users about the new comment
      const usersToNotify = new Set<string>();
      
      // Notify ticket creator if not the commenter
      if (ticket.createdById !== userId) {
        usersToNotify.add(ticket.createdById);
      }
      
      // Notify assigned user if not the commenter
      if (ticket.assignedToId && ticket.assignedToId !== userId) {
        usersToNotify.add(ticket.assignedToId);
      }

      for (const notifyUserId of usersToNotify) {
        const notification = await storage.createNotification({
          userId: notifyUserId,
          type: "ticket_comment",
          title: "New Comment on Ticket",
          message: `${userName} commented on ticket #${ticket.ticketNumber}`,
          relatedType: "ticket",
          relatedId: ticket.id,
          linkUrl: `/help-desk?ticket=${ticket.id}`
        });
        await broadcastNotification(notifyUserId, notification);
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating ticket comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // ============================================
  // ANNOUNCEMENTS API
  // ============================================

  // Get all announcements (for admins)
  app.get("/api/announcements", requireAuth, async (req: any, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Get active announcements for current user
  app.get("/api/announcements/active", requireAuth, async (req: any, res) => {
    try {
      const userRoles = req.user?.roles || req.session?.userRoles || [];
      const announcements = await storage.getActiveAnnouncements(userRoles);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // Get single announcement
  app.get("/api/announcements/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const announcement = await storage.getAnnouncementById(id);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ error: "Failed to fetch announcement" });
    }
  });

  // Create announcement
  app.post("/api/announcements", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.userId;
      const userName = req.user?.displayName || req.session?.userName || "Unknown User";
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        createdById: userId,
        createdByName: userName
      });

      const announcement = await storage.createAnnouncement(validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Update announcement
  app.patch("/api/announcements/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const announcement = await storage.updateAnnouncement(id, req.body);
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Delete announcement (soft delete)
  app.delete("/api/announcements/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAnnouncement(id);
      if (!success) {
        return res.status(404).json({ error: "Announcement not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // ============================================
  // TASKS API
  // ============================================

  // Get all tasks
  app.get("/api/tasks", requireAuth, async (req: any, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get tasks created by current user
  app.get("/api/tasks/my", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const tasks = await storage.getTasksByUser(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get tasks assigned to current user
  app.get("/api/tasks/assigned", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const tasks = await storage.getTasksAssignedToUser(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching assigned tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get tasks for a specific client
  app.get("/api/tasks/client/:clientId", requireAuth, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const tasks = await storage.getTasksByClient(clientId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching client tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get single task
  app.get("/api/tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Create new task
  app.post("/api/tasks", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const userName = req.user?.displayName || req.session?.user?.displayName || "Unknown User";
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const validatedData = insertTaskSchema.parse({
        ...req.body,
        createdById: userId,
        createdByName: userName
      });

      const task = await storage.createTask(validatedData);

      // If assigned to someone else, create notification and broadcast
      if (task.assignedToId && task.assignedToId !== userId) {
        const notification = await storage.createNotification({
          userId: task.assignedToId,
          type: "task_assigned",
          title: "New Task Assigned",
          message: `${userName} assigned you a task: ${task.title}`,
          relatedType: "task",
          relatedId: task.id,
          linkUrl: `/tasks?task=${task.id}`
        });
        // Broadcast via WebSocket
        await broadcastNotification(task.assignedToId, notification);
      }

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      const userName = req.user?.displayName || req.session?.user?.displayName || "Unknown User";
      
      const existingTask = await storage.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = await storage.updateTask(id, req.body);

      // If status changed to completed, record who completed it
      if (req.body.status === "completed" && existingTask.status !== "completed") {
        await storage.updateTask(id, {
          completedAt: new Date(),
          completedById: userId,
          completedByName: userName
        } as any);
        
        // Notify task creator if different from completer
        if (existingTask.createdById !== userId) {
          const notification = await storage.createNotification({
            userId: existingTask.createdById,
            type: "task_completed",
            title: "Task Completed",
            message: `${userName} completed the task: ${existingTask.title}`,
            relatedType: "task",
            relatedId: id,
            linkUrl: `/tasks?task=${id}`
          });
          await broadcastNotification(existingTask.createdById, notification);
        }
      }

      // If task was reassigned, notify new assignee
      if (req.body.assignedToId && req.body.assignedToId !== existingTask.assignedToId && req.body.assignedToId !== userId) {
        const notification = await storage.createNotification({
          userId: req.body.assignedToId,
          type: "task_assigned",
          title: "Task Assigned to You",
          message: `${userName} assigned you a task: ${existingTask.title}`,
          relatedType: "task",
          relatedId: id,
          linkUrl: `/tasks?task=${id}`
        });
        await broadcastNotification(req.body.assignedToId, notification);
      }

      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Assign task
  app.post("/api/tasks/:id/assign", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { assignedToId, assignedToName } = req.body;
      const userId = req.user?.id || req.session?.user?.id;
      const userName = req.user?.displayName || req.session?.user?.displayName || "Unknown User";

      if (!assignedToId || !assignedToName) {
        return res.status(400).json({ error: "Missing assignee information" });
      }

      const task = await storage.assignTask(id, assignedToId, assignedToName);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Notify the assignee
      if (assignedToId !== userId) {
        await storage.createNotification({
          userId: assignedToId,
          type: "task_assigned",
          title: "Task Assigned to You",
          message: `${userName} assigned you a task: ${task.title}`,
          relatedType: "task",
          relatedId: id
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  });

  // Complete task
  app.post("/api/tasks/:id/complete", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user?.id || req.session?.user?.id;
      const userName = req.user?.displayName || req.session?.user?.displayName || "Unknown User";

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const existingTask = await storage.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = await storage.completeTask(id, userId, userName, notes);

      // Notify task creator if different from completer
      if (existingTask.createdById !== userId) {
        await storage.createNotification({
          userId: existingTask.createdById,
          type: "task_completed",
          title: "Task Completed",
          message: `${userName} completed the task: ${existingTask.title}`,
          relatedType: "task",
          relatedId: id
        });
      }

      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Get task comments
  app.get("/api/tasks/:taskId/comments", requireAuth, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Add task comment
  app.post("/api/tasks/:taskId/comments", requireAuth, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      const userName = req.user?.displayName || req.session?.user?.displayName || "Unknown User";

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const validatedData = insertTaskCommentSchema.parse({
        ...req.body,
        taskId,
        authorId: userId,
        authorName: userName
      });

      const comment = await storage.createTaskComment(validatedData);

      // Notify relevant users
      const usersToNotify = new Set<string>();
      
      if (task.createdById !== userId) {
        usersToNotify.add(task.createdById);
      }
      
      if (task.assignedToId && task.assignedToId !== userId) {
        usersToNotify.add(task.assignedToId);
      }

      for (const notifyUserId of usersToNotify) {
        const notification = await storage.createNotification({
          userId: notifyUserId,
          type: "task_comment",
          title: "New Comment on Task",
          message: `${userName} commented on task: ${task.title}`,
          relatedType: "task",
          relatedId: task.id,
          linkUrl: `/tasks?task=${task.id}`
        });
        await broadcastNotification(notifyUserId, notification);
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Get task checklists
  app.get("/api/tasks/:taskId/checklists", requireAuth, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const checklists = await storage.getTaskChecklists(taskId);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching task checklists:", error);
      res.status(500).json({ error: "Failed to fetch checklists" });
    }
  });

  // Add checklist item
  app.post("/api/tasks/:taskId/checklists", requireAuth, async (req: any, res) => {
    try {
      const { taskId } = req.params;

      const task = await storage.getTaskById(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const validatedData = insertTaskChecklistSchema.parse({
        ...req.body,
        taskId
      });

      const checklist = await storage.createTaskChecklist(validatedData);
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Error creating checklist item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Failed to create checklist item" });
    }
  });

  // Update checklist item
  app.patch("/api/tasks/:taskId/checklists/:checklistId", requireAuth, async (req: any, res) => {
    try {
      const { checklistId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;

      // Handle completion
      if (req.body.isCompleted === "yes") {
        req.body.completedAt = new Date();
        req.body.completedById = userId;
      } else if (req.body.isCompleted === "no") {
        req.body.completedAt = null;
        req.body.completedById = null;
      }

      const checklist = await storage.updateTaskChecklist(checklistId, req.body);
      if (!checklist) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      res.json(checklist);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });

  // Delete checklist item
  app.delete("/api/tasks/:taskId/checklists/:checklistId", requireAuth, async (req: any, res) => {
    try {
      const { checklistId } = req.params;
      const success = await storage.deleteTaskChecklist(checklistId);
      if (!success) {
        return res.status(404).json({ error: "Checklist item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      res.status(500).json({ error: "Failed to delete checklist item" });
    }
  });

  // ==================== CHAT ROUTES ====================

  // Get all chat rooms for current user
  app.get("/api/chat/rooms", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const rooms = await storage.getChatRooms(userId);
      
      // Get participants for each room
      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const participants = await storage.getChatRoomParticipants(room.id);
          return { ...room, participants };
        })
      );
      
      res.json(roomsWithParticipants);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  });

  // Get or create direct message room
  app.post("/api/chat/rooms/direct", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { targetUserId, targetUserName, targetUserEmail } = req.body;
      if (!targetUserId || !targetUserName) {
        return res.status(400).json({ error: "Target user information required" });
      }

      // Check if direct room already exists
      let room = await storage.getDirectChatRoom(userId, targetUserId);
      
      if (!room) {
        // Create new direct message room
        room = await storage.createChatRoom({
          type: "direct",
          createdById: userId,
          createdByName: userName,
          isArchived: "no"
        });

        // Add both participants
        await storage.addChatRoomParticipant({
          roomId: room.id,
          staffId: userId,
          staffName: userName,
          role: "admin"
        });

        await storage.addChatRoomParticipant({
          roomId: room.id,
          staffId: targetUserId,
          staffName: targetUserName,
          staffEmail: targetUserEmail,
          role: "admin"
        });
      }

      const participants = await storage.getChatRoomParticipants(room.id);
      res.json({ ...room, participants });
    } catch (error) {
      console.error("Error creating direct room:", error);
      res.status(500).json({ error: "Failed to create direct message room" });
    }
  });

  // Create group chat room
  app.post("/api/chat/rooms/group", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const validatedData = insertChatRoomSchema.parse({
        ...req.body,
        type: "group",
        createdById: userId,
        createdByName: userName,
        isArchived: "no"
      });

      const room = await storage.createChatRoom(validatedData);

      // Add creator as admin
      await storage.addChatRoomParticipant({
        roomId: room.id,
        staffId: userId,
        staffName: userName,
        role: "admin"
      });

      // Add other participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        for (const participant of req.body.participants) {
          if (participant.staffId !== userId) {
            await storage.addChatRoomParticipant({
              roomId: room.id,
              staffId: participant.staffId,
              staffName: participant.staffName,
              staffEmail: participant.staffEmail,
              role: "member"
            });
          }
        }
      }

      const participants = await storage.getChatRoomParticipants(room.id);
      res.status(201).json({ ...room, participants });
    } catch (error) {
      console.error("Error creating group room:", error);
      res.status(500).json({ error: "Failed to create group chat room" });
    }
  });

  // Get single chat room
  app.get("/api/chat/rooms/:roomId", requireAuth, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getChatRoomById(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Chat room not found" });
      }

      const participants = await storage.getChatRoomParticipants(roomId);
      res.json({ ...room, participants });
    } catch (error) {
      console.error("Error fetching chat room:", error);
      res.status(500).json({ error: "Failed to fetch chat room" });
    }
  });

  // Update chat room (name, description)
  app.patch("/api/chat/rooms/:roomId", requireAuth, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.updateChatRoom(roomId, req.body);
      
      if (!room) {
        return res.status(404).json({ error: "Chat room not found" });
      }

      res.json(room);
    } catch (error) {
      console.error("Error updating chat room:", error);
      res.status(500).json({ error: "Failed to update chat room" });
    }
  });

  // Add participant to room
  app.post("/api/chat/rooms/:roomId/participants", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email;
      const userRoles = req.session?.user?.roles || [];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      
      // SECURITY: Only app admins can add participants with admin role
      // Regular users/room admins can only add as member
      const isAppAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
      );
      
      // Force role to member if not app admin
      const roleToAssign = (isAppAdmin && req.body.role === "admin") ? "admin" : "member";
      
      const validatedData = insertChatRoomParticipantSchema.parse({
        ...req.body,
        roomId,
        role: roleToAssign, // SECURITY: Override any client-provided role
        addedById: userId,
        addedByName: userName,
      });

      const participant = await storage.addChatRoomParticipant(validatedData);
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error adding participant:", error);
      res.status(500).json({ error: "Failed to add participant" });
    }
  });

  // Remove participant from room
  app.delete("/api/chat/rooms/:roomId/participants/:staffId", requireAuth, async (req: any, res) => {
    try {
      const { roomId, staffId } = req.params;
      const success = await storage.removeChatRoomParticipant(roomId, staffId);
      
      if (!success) {
        return res.status(404).json({ error: "Participant not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ error: "Failed to remove participant" });
    }
  });

  // Get messages for a room
  app.get("/api/chat/rooms/:roomId/messages", requireAuth, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string | undefined;

      const messages = await storage.getChatMessages(roomId, limit, before);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message (fallback for non-WebSocket clients)
  app.post("/api/chat/rooms/:roomId/messages", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const validatedData = insertChatMessageSchema.parse({
        ...req.body,
        roomId,
        senderId: userId,
        senderName: userName
      });

      const message = await storage.createChatMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Edit message
  app.patch("/api/chat/messages/:messageId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const { messageId } = req.params;
      
      const existingMessage = await storage.getChatMessageById(messageId);
      if (!existingMessage) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (existingMessage.senderId !== userId) {
        return res.status(403).json({ error: "You can only edit your own messages" });
      }

      const message = await storage.updateChatMessage(messageId, req.body.content);
      res.json(message);
    } catch (error) {
      console.error("Error editing message:", error);
      res.status(500).json({ error: "Failed to edit message" });
    }
  });

  // Delete message
  app.delete("/api/chat/messages/:messageId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const { messageId } = req.params;
      
      const existingMessage = await storage.getChatMessageById(messageId);
      if (!existingMessage) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (existingMessage.senderId !== userId) {
        return res.status(403).json({ error: "You can only delete your own messages" });
      }

      const success = await storage.deleteChatMessage(messageId);
      res.json({ success });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Mark messages as read
  app.post("/api/chat/rooms/:roomId/read", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      await storage.updateLastRead(roomId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Get unread count
  app.get("/api/chat/unread", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const count = await storage.getUnreadCount(userId);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // ==================== CHAT ADMIN ROUTES ====================

  // Get all chat rooms (admin only)
  app.get("/api/chat/admin/rooms", requireAuth, async (req: any, res) => {
    try {
      const userRoles = req.session?.user?.roles || [];
      const isAppAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
      );
      
      if (!isAppAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const rooms = await storage.getAllChatRooms();
      
      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const participants = await storage.getChatRoomParticipants(room.id);
          return { ...room, participants };
        })
      );
      
      res.json(roomsWithParticipants);
    } catch (error) {
      console.error("Error fetching all chat rooms:", error);
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  });

  // Get rooms by type
  app.get("/api/chat/rooms/type/:type", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { type } = req.params;
      const rooms = await storage.getChatRoomsByType(userId, type);
      
      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const participants = await storage.getChatRoomParticipants(room.id);
          return { ...room, participants };
        })
      );
      
      res.json(roomsWithParticipants);
    } catch (error) {
      console.error("Error fetching rooms by type:", error);
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  });

  // Create client chat room (auto or manual) - restricted to app admins or assigned staff
  app.post("/api/chat/rooms/client", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email;
      const userRoles = req.session?.user?.roles || [];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { clientId, clientName, assignedStaff } = req.body;
      if (!clientId || !clientName) {
        return res.status(400).json({ error: "Client information required" });
      }

      // Check if user is app admin
      const isAppAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
      );
      
      // Verify client assignment server-side by fetching the actual client data
      let isAssignedToClient = false;
      if (!isAppAdmin) {
        const client = await storage.getClientById(clientId);
        if (client) {
          // Check if user is assigned to this client (preferredStaffIds, coordinatorId, or other assignments)
          const preferredStaff = client.preferredStaffIds || [];
          const restrictedStaff = client.restrictedStaffIds || [];
          isAssignedToClient = preferredStaff.includes(userId) || 
            client.coordinatorId === userId ||
            client.primaryCareCoordinatorId === userId;
          
          // Also check if user is explicitly restricted from this client
          if (restrictedStaff.includes(userId)) {
            return res.status(403).json({ error: "You are restricted from this client" });
          }
        }
      }
      
      if (!isAppAdmin && !isAssignedToClient) {
        return res.status(403).json({ error: "Only admins or assigned staff can create client chat rooms" });
      }

      // Create or get existing client chat room
      const room = await storage.createClientChatRoom(clientId, clientName, userId, userName);

      // Add creator as admin
      const existingParticipants = await storage.getChatRoomParticipants(room.id);
      if (!existingParticipants.find(p => p.staffId === userId)) {
        await storage.addChatRoomParticipant({
          roomId: room.id,
          staffId: userId,
          staffName: userName,
          role: "admin",
          addedById: userId,
          addedByName: userName,
        });
      }

      // SECURITY: Only app admins can sync staff from request body
      // Otherwise derive from authoritative client record
      if (isAppAdmin && assignedStaff && Array.isArray(assignedStaff)) {
        // App admin can explicitly set participants via request body
        await storage.syncClientChatParticipants(clientId, assignedStaff);
      } else {
        // For non-admins, derive staff list from client's actual assignments in database
        const client = await storage.getClientById(clientId);
        if (client) {
          const authoritativeStaff: { id: string; name: string; email?: string }[] = [];
          
          // Get staff from preferred staff assignments
          if (client.preferredStaffIds && client.preferredStaffIds.length > 0) {
            for (const staffId of client.preferredStaffIds) {
              const staffMember = await storage.getStaffById(staffId);
              if (staffMember && staffMember.isActive === "yes") {
                authoritativeStaff.push({
                  id: staffMember.id,
                  name: staffMember.name,
                  email: staffMember.email || undefined,
                });
              }
            }
          }
          
          // Add coordinator if exists
          if (client.coordinatorId) {
            const coordinator = await storage.getStaffById(client.coordinatorId);
            if (coordinator && coordinator.isActive === "yes" && 
                !authoritativeStaff.find(s => s.id === coordinator.id)) {
              authoritativeStaff.push({
                id: coordinator.id,
                name: coordinator.name,
                email: coordinator.email || undefined,
              });
            }
          }
          
          // Add primary care coordinator if exists
          if (client.primaryCareCoordinatorId) {
            const pcc = await storage.getStaffById(client.primaryCareCoordinatorId);
            if (pcc && pcc.isActive === "yes" && 
                !authoritativeStaff.find(s => s.id === pcc.id)) {
              authoritativeStaff.push({
                id: pcc.id,
                name: pcc.name,
                email: pcc.email || undefined,
              });
            }
          }
          
          if (authoritativeStaff.length > 0) {
            await storage.syncClientChatParticipants(clientId, authoritativeStaff);
          }
        }
      }

      const participants = await storage.getChatRoomParticipants(room.id);
      res.status(201).json({ ...room, participants });
    } catch (error) {
      console.error("Error creating client chat room:", error);
      res.status(500).json({ error: "Failed to create client chat room" });
    }
  });

  // Create custom group chat with staff filtering (admin only)
  app.post("/api/chat/rooms/custom", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email;
      const userRoles = req.session?.user?.roles || [];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const isAppAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
      );
      
      if (!isAppAdmin) {
        return res.status(403).json({ error: "Admin access required to create custom chats" });
      }

      const { name, description, participants, staffFilter, isAnnouncement } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Chat name is required" });
      }

      const room = await storage.createChatRoom({
        name,
        description,
        type: isAnnouncement === "yes" ? "announcement" : "group",
        createdById: userId,
        createdByName: userName,
        staffFilter: staffFilter || null,
        isAnnouncement: isAnnouncement || "no",
        isArchived: "no"
      });

      // Add creator as admin
      await storage.addChatRoomParticipant({
        roomId: room.id,
        staffId: userId,
        staffName: userName,
        role: "admin",
        addedById: userId,
        addedByName: userName,
      });

      // Add selected participants - all as members, only creator is admin
      // This prevents privilege escalation via request body manipulation
      if (participants && Array.isArray(participants)) {
        for (const participant of participants) {
          if (participant.staffId !== userId) {
            await storage.addChatRoomParticipant({
              roomId: room.id,
              staffId: participant.staffId,
              staffName: participant.staffName,
              staffEmail: participant.staffEmail,
              role: "member", // SECURITY: Always set to member, ignore request body
              addedById: userId,
              addedByName: userName,
            });
          }
        }
      }

      const allParticipants = await storage.getChatRoomParticipants(room.id);
      res.status(201).json({ ...room, participants: allParticipants });
    } catch (error) {
      console.error("Error creating custom chat room:", error);
      res.status(500).json({ error: "Failed to create custom chat room" });
    }
  });

  // Archive chat room - only creator or app admin can archive
  app.post("/api/chat/rooms/:roomId/archive", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.displayName || req.session?.user?.email || "Unknown User";
      const userRoles = req.session?.user?.roles || [];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      
      // Check if user is app admin
      const isAppAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
      );
      
      // Get room to check if user is the creator
      const room = await storage.getChatRoomById(roomId);
      if (!room) {
        return res.status(404).json({ error: "Chat room not found" });
      }
      
      const isCreator = room.createdById === userId;
      
      // Only app admins or the room creator can archive
      if (!isCreator && !isAppAdmin) {
        return res.status(403).json({ error: "Only room creator or app admins can archive this room" });
      }

      const archivedRoom = await storage.archiveChatRoom(roomId, userId, userName);
      if (!archivedRoom) {
        return res.status(500).json({ error: "Failed to archive chat room" });
      }

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId,
        action: "room_archived",
        actorId: userId,
        actorName: userName,
        details: { reason: req.body.reason }
      });

      res.json(archivedRoom);
    } catch (error) {
      console.error("Error archiving chat room:", error);
      res.status(500).json({ error: "Failed to archive chat room" });
    }
  });

  // Update participant role (promote/demote admin) - APP ADMIN ONLY for security
  app.patch("/api/chat/rooms/:roomId/participants/:staffId/role", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRoles = req.session?.user?.roles || [];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId, staffId } = req.params;
      const { role } = req.body;
      
      if (!["admin", "member"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // STRICT SECURITY: Only app admins can change participant roles
      // This prevents all privilege escalation attacks including:
      // - Users promoting themselves
      // - Room admins demoting each other
      // - Attackers seizing control via role manipulation
      const isAppAdmin = userRoles.some((r: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(r)
      );
      
      if (!isAppAdmin) {
        return res.status(403).json({ error: "Only app admins (Admin, Director, Operations Manager, Clinical Manager) can change participant roles" });
      }

      // Get room info to verify target exists and count admins
      const participants = await storage.getChatRoomParticipants(roomId);
      const targetParticipant = participants.find(p => p.staffId === staffId);
      
      if (!targetParticipant) {
        return res.status(404).json({ error: "Participant not found in this room" });
      }
      
      // If demoting (changing to member), prevent removing the last admin
      if (role === "member" && targetParticipant.role === "admin") {
        const adminCount = participants.filter(p => p.role === "admin").length;
        if (adminCount <= 1) {
          return res.status(403).json({ error: "Cannot remove the last admin from this room. Assign another admin first." });
        }
      }

      const participant = await storage.updateParticipantRole(roomId, staffId, role);
      if (!participant) {
        return res.status(500).json({ error: "Failed to update participant role" });
      }

      res.json(participant);
    } catch (error) {
      console.error("Error updating participant role:", error);
      res.status(500).json({ error: "Failed to update participant role" });
    }
  });

  // Get client chat room
  app.get("/api/chat/rooms/client/:clientId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRoles = req.session?.user?.roles || [];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { clientId } = req.params;
      const room = await storage.getClientChatRoom(clientId);
      
      if (!room) {
        return res.status(404).json({ error: "Client chat room not found" });
      }

      const participants = await storage.getChatRoomParticipants(room.id);
      
      // Check if user is a participant or app admin
      const isParticipant = participants.some(p => p.staffId === userId);
      const isAppAdmin = userRoles.some((role: string) => 
        ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
      );
      
      if (!isParticipant && !isAppAdmin) {
        return res.status(403).json({ error: "You don't have access to this chat" });
      }

      res.json({ ...room, participants });
    } catch (error) {
      console.error("Error fetching client chat room:", error);
      res.status(500).json({ error: "Failed to fetch client chat room" });
    }
  });

  // ==================== ENHANCED CHAT ROUTES ====================
  // These routes use the centralized chatAuthorizationService for permission checks

  // Helper function to get user context for chat authorization
  function getUserContext(req: any): UserContext | null {
    const userId = req.session?.user?.id;
    const userName = req.session?.user?.displayName || req.session?.user?.email;
    const userRoles = req.session?.user?.roles || [];
    const email = req.session?.user?.email;
    
    if (!userId) return null;
    
    return {
      userId,
      userName: userName || "Unknown User",
      roles: userRoles.length > 0 ? userRoles : ["staff"],
      email
    };
  }

  // Upload chat attachment with size validation
  app.post("/api/chat/rooms/:roomId/attachments", requireAuth, (req: any, res, next) => {
    uploadChatAttachment.single('file')(req, res, async (err: any) => {
      // Helper function to safely delete uploaded file
      const cleanupFile = (filePath?: string) => {
        if (filePath) {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (cleanupErr) {
            console.error("Failed to cleanup uploaded file:", cleanupErr);
          }
        }
      };

      try {
        const userContext = getUserContext(req);
        if (!userContext) {
          cleanupFile(req.file?.path);
          return res.status(401).json({ error: "Not authenticated" });
        }

        const { roomId } = req.params;
        
        // Check send_message permission BEFORE processing file
        const permission = await chatAuthorizationService.checkPermission("send_message", userContext, roomId);
        if (!permission.allowed) {
          cleanupFile(req.file?.path);
          return res.status(403).json({ error: permission.reason });
        }

        // Handle multer errors
        if (err) {
          cleanupFile(req.file?.path);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: "File is too large. Maximum size is 60MB for videos or 15MB for images." });
          }
          return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const file = req.file;
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

        // Validate size based on type - images have lower limit
        if (isImage && file.size > MAX_IMAGE_SIZE) {
          cleanupFile(file.path);
          return res.status(400).json({ error: "Image file is too large. Maximum size is 15MB." });
        }
        
        // Video size is already validated by multer limits, but double-check
        if (isVideo && file.size > MAX_VIDEO_SIZE) {
          cleanupFile(file.path);
          return res.status(400).json({ error: "Video file is too large. Maximum size is 60MB." });
        }

        // Determine attachment type
        let attachmentType: "photo" | "video" | "gif" = "photo";
        if (isVideo) {
          attachmentType = "video";
        } else if (file.mimetype === 'image/gif') {
          attachmentType = "gif";
        }

        // Create attachment record
        const attachment = await storage.createChatMessageAttachment({
          roomId,
          type: attachmentType,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageKey: file.path,
          uploadedById: userContext.userId,
          uploadedByName: userContext.userName,
          status: "processing",
        });

        // Mark as completed (in a real app, you'd do thumbnail generation here)
        const completedAttachment = await storage.updateChatMessageAttachmentStatus(
          attachment.id, 
          "completed"
        );

        // Create audit log entry
        await storage.createChatAuditLog({
          roomId,
          action: "attachment_uploaded",
          actorId: userContext.userId,
          actorName: userContext.userName,
          details: {
            attachmentId: attachment.id,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            type: attachmentType
          }
        });

        res.status(201).json(completedAttachment);
      } catch (error) {
        // Cleanup file on any unexpected error
        cleanupFile(req.file?.path);
        console.error("Error uploading chat attachment:", error);
        res.status(500).json({ error: "Failed to upload attachment" });
      }
    });
  });

  // Get attachment by ID
  app.get("/api/chat/attachments/:attachmentId", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { attachmentId } = req.params;
      const attachments = await storage.getChatMessageAttachments(attachmentId);
      
      if (!attachments || attachments.length === 0) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const attachment = attachments[0];
      
      // Check if user has access to the room
      const permission = await chatAuthorizationService.checkPermission("view_messages", userContext, attachment.roomId);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      res.json(attachment);
    } catch (error) {
      console.error("Error fetching chat attachment:", error);
      res.status(500).json({ error: "Failed to fetch attachment" });
    }
  });

  // Serve attachment file
  app.get("/api/chat/attachments/:attachmentId/file", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { attachmentId } = req.params;
      const attachments = await storage.getChatMessageAttachments(attachmentId);
      
      if (!attachments || attachments.length === 0) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const attachment = attachments[0];
      
      // Check if user has access to the room
      const permission = await chatAuthorizationService.checkPermission("view_messages", userContext, attachment.roomId);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      // Check if file exists
      if (!attachment.storageKey || !fs.existsSync(attachment.storageKey)) {
        return res.status(404).json({ error: "File not found" });
      }

      // Set content type and send file
      res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`);
      res.sendFile(attachment.storageKey);
    } catch (error) {
      console.error("Error serving chat attachment:", error);
      res.status(500).json({ error: "Failed to serve attachment" });
    }
  });

  // Delete attachment (admin or uploader only)
  app.delete("/api/chat/attachments/:attachmentId", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { attachmentId } = req.params;
      const attachments = await storage.getChatMessageAttachments(attachmentId);
      
      if (!attachments || attachments.length === 0) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const attachment = attachments[0];
      
      // Check if user is uploader or has admin delete permission
      const isUploader = attachment.uploadedById === userContext.userId;
      const isAdmin = chatAuthorizationService.isPrivilegedUser(userContext);
      
      if (!isUploader && !isAdmin) {
        return res.status(403).json({ error: "You can only delete your own attachments" });
      }

      // Delete file from disk
      if (attachment.storageKey && fs.existsSync(attachment.storageKey)) {
        fs.unlinkSync(attachment.storageKey);
      }

      // Delete from database
      await storage.deleteChatMessageAttachment(attachmentId);

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId: attachment.roomId,
        action: "attachment_deleted",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: {
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          deletedByUploader: isUploader
        }
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chat attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // ============= TENOR GIF API INTEGRATION =============
  
  // Simple in-memory cache for GIF search results (short-lived, public Tenor content)
  // Note: GIF search results are public content from Tenor - same for all users
  // Cache is query-based since results don't contain user-specific data
  const gifCache: Map<string, { data: any; timestamp: number }> = new Map();
  const GIF_CACHE_TTL = 2 * 60 * 1000; // 2 minutes - short TTL for safety
  const GIF_CACHE_MAX_SIZE = 100; // Maximum cache entries
  
  // Helper to clean old cache entries (called on-demand, not via interval)
  const cleanGifCache = () => {
    const now = Date.now();
    for (const [key, value] of gifCache.entries()) {
      if (now - value.timestamp > GIF_CACHE_TTL) {
        gifCache.delete(key);
      }
    }
    // If still over limit, remove oldest entries
    if (gifCache.size > GIF_CACHE_MAX_SIZE) {
      const entries = Array.from(gifCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, gifCache.size - GIF_CACHE_MAX_SIZE);
      toRemove.forEach(([key]) => gifCache.delete(key));
    }
  };
  
  // Search GIFs via Tenor API proxy
  app.get("/api/chat/gifs/search", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { q, limit = "20", pos } = req.query;
      
      if (!q || typeof q !== "string" || q.trim().length === 0) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const searchQuery = q.trim().toLowerCase();
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 50);
      
      // Clean cache periodically
      cleanGifCache();
      
      // Check cache first (public content, same for all authenticated users)
      const cacheKey = `search:${searchQuery}:${limitNum}:${pos || ""}`;
      const cached = gifCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < GIF_CACHE_TTL) {
        return res.json(cached.data);
      }
      
      // Get Tenor API key from environment
      const tenorApiKey = process.env.TENOR_API_KEY;
      if (!tenorApiKey) {
        return res.status(503).json({ 
          error: "GIF service not configured. Please contact administrator.",
          results: [],
          next: ""
        });
      }
      
      // Build Tenor API request
      const params = new URLSearchParams({
        key: tenorApiKey,
        q: searchQuery,
        limit: limitNum.toString(),
        contentfilter: "high", // Strict content filter for healthcare environment
        media_filter: "gif,tinygif,mp4", // Reduce response size
        client_key: "empowerlink_crm"
      });
      
      if (pos) {
        params.append("pos", pos as string);
      }
      
      const response = await fetch(`https://tenor.googleapis.com/v2/search?${params}`);
      
      if (!response.ok) {
        console.error("Tenor API error:", response.status, await response.text());
        return res.status(502).json({ error: "Failed to fetch GIFs from external service" });
      }
      
      const data = await response.json();
      
      // Transform response for frontend consumption
      const result = {
        results: (data.results || []).map((gif: any) => ({
          id: gif.id,
          title: gif.title || "",
          url: gif.media_formats?.gif?.url || "",
          previewUrl: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || "",
          mp4Url: gif.media_formats?.mp4?.url || "",
          width: gif.media_formats?.gif?.dims?.[0] || 0,
          height: gif.media_formats?.gif?.dims?.[1] || 0,
          size: gif.media_formats?.gif?.size || 0
        })),
        next: data.next || ""
      };
      
      // Cache the result
      gifCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      res.json(result);
    } catch (error) {
      console.error("Error searching GIFs:", error);
      res.status(500).json({ error: "Failed to search GIFs" });
    }
  });
  
  // Get trending GIFs
  app.get("/api/chat/gifs/trending", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { limit = "20", pos } = req.query;
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 50);
      
      // Clean cache periodically
      cleanGifCache();
      
      // Check cache first (public content, same for all authenticated users)
      const cacheKey = `trending:${limitNum}:${pos || ""}`;
      const cached = gifCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < GIF_CACHE_TTL) {
        return res.json(cached.data);
      }
      
      const tenorApiKey = process.env.TENOR_API_KEY;
      if (!tenorApiKey) {
        return res.status(503).json({ 
          error: "GIF service not configured. Please contact administrator.",
          results: [],
          next: ""
        });
      }
      
      const params = new URLSearchParams({
        key: tenorApiKey,
        limit: limitNum.toString(),
        contentfilter: "high",
        media_filter: "gif,tinygif,mp4",
        client_key: "empowerlink_crm"
      });
      
      if (pos) {
        params.append("pos", pos as string);
      }
      
      const response = await fetch(`https://tenor.googleapis.com/v2/featured?${params}`);
      
      if (!response.ok) {
        console.error("Tenor API error:", response.status, await response.text());
        return res.status(502).json({ error: "Failed to fetch trending GIFs" });
      }
      
      const data = await response.json();
      
      const result = {
        results: (data.results || []).map((gif: any) => ({
          id: gif.id,
          title: gif.title || "",
          url: gif.media_formats?.gif?.url || "",
          previewUrl: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || "",
          mp4Url: gif.media_formats?.mp4?.url || "",
          width: gif.media_formats?.gif?.dims?.[0] || 0,
          height: gif.media_formats?.gif?.dims?.[1] || 0,
          size: gif.media_formats?.gif?.size || 0
        })),
        next: data.next || ""
      };
      
      gifCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching trending GIFs:", error);
      res.status(500).json({ error: "Failed to fetch trending GIFs" });
    }
  });
  
  // Get GIF categories/suggestions
  app.get("/api/chat/gifs/categories", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Clean cache periodically
      cleanGifCache();
      
      // Check cache (public content, same for all authenticated users)
      const cacheKey = "categories";
      const cached = gifCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < GIF_CACHE_TTL) {
        return res.json(cached.data);
      }
      
      const tenorApiKey = process.env.TENOR_API_KEY;
      if (!tenorApiKey) {
        return res.status(503).json({ 
          error: "GIF service not configured",
          categories: []
        });
      }
      
      const params = new URLSearchParams({
        key: tenorApiKey,
        contentfilter: "high",
        client_key: "empowerlink_crm"
      });
      
      const response = await fetch(`https://tenor.googleapis.com/v2/categories?${params}`);
      
      if (!response.ok) {
        console.error("Tenor API error:", response.status, await response.text());
        return res.status(502).json({ error: "Failed to fetch GIF categories" });
      }
      
      const data = await response.json();
      
      const result = {
        categories: (data.tags || []).map((tag: any) => ({
          searchterm: tag.searchterm,
          path: tag.path,
          image: tag.image,
          name: tag.name || tag.searchterm
        }))
      };
      
      gifCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching GIF categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Lock chat room - Admin only
  app.post("/api/chat/rooms/:roomId/lock", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const permission = await chatAuthorizationService.checkPermission("lock_room", userContext, roomId);
      
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const room = await storage.lockChatRoom(roomId, userContext.userId, userContext.userName);
      if (!room) {
        return res.status(500).json({ error: "Failed to lock chat room" });
      }

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId,
        action: "room_locked",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: { reason: req.body.reason }
      });

      res.json(room);
    } catch (error) {
      console.error("Error locking chat room:", error);
      res.status(500).json({ error: "Failed to lock chat room" });
    }
  });

  // Unlock chat room - Admin only
  app.post("/api/chat/rooms/:roomId/unlock", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const permission = await chatAuthorizationService.checkPermission("unlock_room", userContext, roomId);
      
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const room = await storage.unlockChatRoom(roomId);
      if (!room) {
        return res.status(500).json({ error: "Failed to unlock chat room" });
      }

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId,
        action: "room_unlocked",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: { reason: req.body.reason }
      });

      res.json(room);
    } catch (error) {
      console.error("Error unlocking chat room:", error);
      res.status(500).json({ error: "Failed to unlock chat room" });
    }
  });

  // Unarchive chat room
  app.post("/api/chat/rooms/:roomId/unarchive", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const permission = await chatAuthorizationService.checkPermission("unarchive_room", userContext, roomId);
      
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const room = await storage.unarchiveChatRoom(roomId);
      if (!room) {
        return res.status(500).json({ error: "Failed to unarchive chat room" });
      }

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId,
        action: "room_unarchived",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: {}
      });

      res.json(room);
    } catch (error) {
      console.error("Error unarchiving chat room:", error);
      res.status(500).json({ error: "Failed to unarchive chat room" });
    }
  });

  // Soft delete chat room - Admin only
  app.delete("/api/chat/rooms/:roomId/soft-delete", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const permission = await chatAuthorizationService.checkPermission("delete_room", userContext, roomId);
      
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const room = await storage.softDeleteChatRoom(roomId, userContext.userId, userContext.userName);
      if (!room) {
        return res.status(500).json({ error: "Failed to delete chat room" });
      }

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId,
        action: "room_deleted",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: { reason: req.body.reason }
      });

      res.json({ success: true, room });
    } catch (error) {
      console.error("Error soft deleting chat room:", error);
      res.status(500).json({ error: "Failed to delete chat room" });
    }
  });

  // Forward message to another room
  app.post("/api/chat/messages/:messageId/forward", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { messageId } = req.params;
      const { targetRoomId, comment } = req.body;

      if (!targetRoomId) {
        return res.status(400).json({ error: "Target room ID is required" });
      }

      // Get the original message to find source room
      const originalMessage = await storage.getChatMessageById(messageId);
      if (!originalMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Check permission for forwarding (source and target)
      const permission = await chatAuthorizationService.checkPermission(
        "forward_message", 
        userContext, 
        originalMessage.roomId, 
        targetRoomId
      );
      
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      // Forward the message
      const forwardedMessage = await storage.forwardChatMessage(
        messageId,
        targetRoomId,
        userContext.userId,
        userContext.userName,
        comment
      );

      if (!forwardedMessage) {
        return res.status(500).json({ error: "Failed to forward message" });
      }

      // Create audit log entries for both source and target rooms
      await storage.createChatAuditLog({
        roomId: originalMessage.roomId,
        messageId: messageId,
        action: "message_forwarded_from",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: { 
          targetRoomId,
          newMessageId: forwardedMessage.id
        }
      });

      await storage.createChatAuditLog({
        roomId: targetRoomId,
        messageId: forwardedMessage.id,
        action: "message_forwarded_to",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: { 
          sourceRoomId: originalMessage.roomId,
          originalMessageId: messageId
        }
      });

      res.status(201).json(forwardedMessage);
    } catch (error) {
      console.error("Error forwarding message:", error);
      res.status(500).json({ error: "Failed to forward message" });
    }
  });

  // Reply to a message with quote
  app.post("/api/chat/rooms/:roomId/messages/reply", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const { replyToId, content, messageType = "text" } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const permission = await chatAuthorizationService.checkPermission("reply_to_message", userContext, roomId);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      // Get the message being replied to (if specified)
      let replyToMessage = null;
      if (replyToId) {
        replyToMessage = await storage.getChatMessageById(replyToId);
        if (!replyToMessage) {
          return res.status(404).json({ error: "Reply-to message not found" });
        }
        // Verify the message being replied to is in the same room
        if (replyToMessage.roomId !== roomId) {
          return res.status(400).json({ error: "Can only reply to messages in the same room" });
        }
      }

      const messageData: any = {
        roomId,
        senderId: userContext.userId,
        senderName: userContext.userName,
        content,
        messageType,
        isReply: replyToMessage ? "yes" : "no"
      };

      if (replyToMessage) {
        messageData.replyToId = replyToId;
        messageData.replyToSenderId = replyToMessage.senderId;
        messageData.replyToSenderName = replyToMessage.senderName;
        messageData.replyToPreview = replyToMessage.content.substring(0, 200);
      }

      const message = await storage.createChatMessage(messageData);

      // Update last message in room
      await storage.updateChatRoom(roomId, {
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 100)
      } as any);

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating reply message:", error);
      res.status(500).json({ error: "Failed to create reply message" });
    }
  });

  // Soft delete own message (within time window)
  app.delete("/api/chat/messages/:messageId/soft-delete", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { messageId } = req.params;
      const message = await storage.getChatMessageById(messageId);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Check if user can delete this message
      let permission;
      if (message.senderId === userContext.userId) {
        permission = await chatAuthorizationService.checkPermission(
          "delete_own_message", 
          userContext, 
          message.roomId, 
          messageId
        );
      } else {
        permission = await chatAuthorizationService.checkPermission(
          "delete_any_message", 
          userContext, 
          message.roomId
        );
      }
      
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const deletedMessage = await storage.softDeleteChatMessage(
        messageId, 
        userContext.userId, 
        userContext.userName
      );
      
      if (!deletedMessage) {
        return res.status(500).json({ error: "Failed to delete message" });
      }

      // Create audit log entry
      await storage.createChatAuditLog({
        roomId: message.roomId,
        messageId,
        action: "message_deleted",
        actorId: userContext.userId,
        actorName: userContext.userName,
        details: { 
          originalSenderId: message.senderId,
          originalSenderName: message.senderName,
          contentPreview: message.content.substring(0, 50)
        }
      });

      res.json({ success: true, message: deletedMessage });
    } catch (error) {
      console.error("Error soft deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Get chat audit logs for a room
  app.get("/api/chat/rooms/:roomId/audit-logs", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { roomId } = req.params;
      const { limit } = req.query;
      
      const permission = await chatAuthorizationService.checkPermission("view_audit_log", userContext, roomId);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const logs = await storage.getChatAuditLogs(roomId, limit ? parseInt(limit as string, 10) : 100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching chat audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Get all chat audit logs (admin only)
  app.get("/api/chat/audit-logs", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permission = await chatAuthorizationService.checkPermission("view_audit_log", userContext);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const { limit } = req.query;
      const logs = await storage.getChatAuditLogs(undefined, limit ? parseInt(limit as string, 10) : 100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching all chat audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Admin chat dashboard - get all rooms with filters
  app.get("/api/chat/admin/dashboard", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permission = await chatAuthorizationService.checkPermission("view_audit_log", userContext);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const { type, status, isArchived, isLocked, search, limit, offset } = req.query;
      
      const result = await storage.getAllChatRoomsWithFilters({
        type: type as string,
        status: status as string,
        isArchived: isArchived as string,
        isLocked: isLocked as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0
      });

      // Get participant counts and last message info for each room
      const roomsWithDetails = await Promise.all(
        result.rooms.map(async (room) => {
          const participants = await storage.getChatRoomParticipants(room.id);
          return {
            ...room,
            participantCount: participants.length,
            participants: participants.slice(0, 5) // Preview of first 5 participants
          };
        })
      );

      res.json({
        rooms: roomsWithDetails,
        total: result.total,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0
      });
    } catch (error) {
      console.error("Error fetching admin chat dashboard:", error);
      res.status(500).json({ error: "Failed to fetch chat dashboard" });
    }
  });

  // Get message attachments
  app.get("/api/chat/messages/:messageId/attachments", requireAuth, async (req: any, res) => {
    try {
      const userContext = getUserContext(req);
      if (!userContext) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { messageId } = req.params;
      const message = await storage.getChatMessageById(messageId);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Check if user has access to the room
      const permission = await chatAuthorizationService.checkPermission("view_room", userContext, message.roomId);
      if (!permission.allowed) {
        return res.status(403).json({ error: permission.reason });
      }

      const attachments = await storage.getChatMessageAttachments(messageId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching message attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // ============================================
  // SCHEDULING CONFLICTS ROUTES
  // ============================================

  // Get scheduling conflicts with filtering
  app.get("/api/scheduling-conflicts", requireAuth, async (req: any, res) => {
    try {
      const { status, severity, conflictType, clientId, staffId, appointmentId, limit, offset } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (severity) filters.severity = severity;
      if (conflictType) filters.conflictType = conflictType;
      if (clientId) filters.clientId = clientId;
      if (staffId) filters.staffId = staffId;
      if (appointmentId) filters.appointmentId = appointmentId;
      if (limit) filters.limit = parseInt(limit as string, 10);
      if (offset) filters.offset = parseInt(offset as string, 10);
      
      const result = await storage.getSchedulingConflicts(filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching scheduling conflicts:", error);
      res.status(500).json({ error: "Failed to fetch scheduling conflicts" });
    }
  });

  // Get open conflicts count (for dashboard badges)
  app.get("/api/scheduling-conflicts/count", requireAuth, async (req: any, res) => {
    try {
      const count = await storage.getOpenConflictsCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching conflicts count:", error);
      res.status(500).json({ error: "Failed to fetch conflicts count" });
    }
  });

  // Get scheduling conflicts summary for dashboard
  app.get("/api/scheduling-conflicts/dashboard", requireAuth, async (req: any, res) => {
    try {
      // Get open conflicts with critical and warning severity
      const result = await storage.getSchedulingConflicts({ 
        status: "open",
        limit: 10 
      });
      
      const conflicts = result.conflicts || [];
      const criticalCount = conflicts.filter(c => c.severity === "critical").length;
      const warningCount = conflicts.filter(c => c.severity === "warning").length;
      
      res.json({
        total: result.total || conflicts.length,
        critical: criticalCount,
        warning: warningCount,
        conflicts: conflicts.slice(0, 5), // Return top 5 for preview
      });
    } catch (error) {
      console.error("Error fetching dashboard scheduling conflicts:", error);
      res.status(500).json({ error: "Failed to fetch scheduling conflicts dashboard" });
    }
  });

  // Get single scheduling conflict by ID
  app.get("/api/scheduling-conflicts/:id", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const conflict = await storage.getSchedulingConflictById(id);
      
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      res.json(conflict);
    } catch (error) {
      console.error("Error fetching scheduling conflict:", error);
      res.status(500).json({ error: "Failed to fetch scheduling conflict" });
    }
  });

  // Get conflicts by appointment
  app.get("/api/appointments/:appointmentId/conflicts", requireAuth, async (req: any, res) => {
    try {
      const { appointmentId } = req.params;
      const conflicts = await storage.getConflictsByAppointment(appointmentId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching appointment conflicts:", error);
      res.status(500).json({ error: "Failed to fetch appointment conflicts" });
    }
  });

  // Get conflicts by staff member
  app.get("/api/staff/:staffId/conflicts", requireAuth, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      const conflicts = await storage.getConflictsByStaff(staffId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching staff conflicts:", error);
      res.status(500).json({ error: "Failed to fetch staff conflicts" });
    }
  });

  // Get conflicts by client
  app.get("/api/clients/:clientId/conflicts", requireAuth, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const conflicts = await storage.getConflictsByClient(clientId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching client conflicts:", error);
      res.status(500).json({ error: "Failed to fetch client conflicts" });
    }
  });

  // Resolve a scheduling conflict (requires manager roles for critical conflicts)
  app.post("/api/scheduling-conflicts/:id/resolve", requireAuth, requireRoles, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name || req.session?.user?.email || "Unknown";
      const userRoles = req.session?.user?.roles || [];
      const { resolutionNotes, resolutionAction } = req.body;
      
      if (!resolutionAction) {
        return res.status(400).json({ error: "Resolution action is required" });
      }
      
      const validActions = ["reassigned", "override_approved", "appointment_cancelled", "restriction_updated", "dismissed", "auto_resolved"];
      if (!validActions.includes(resolutionAction)) {
        return res.status(400).json({ error: "Invalid resolution action" });
      }
      
      // Get the conflict to check severity
      const existingConflict = await storage.getSchedulingConflictById(id);
      if (!existingConflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      // Critical conflicts require manager roles to resolve
      if (existingConflict.severity === "critical") {
        const hasManagerRole = userRoles.some((role: string) =>
          ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
        );
        if (!hasManagerRole) {
          return res.status(403).json({ 
            error: "Critical conflicts can only be resolved by managers or administrators" 
          });
        }
      }
      
      const conflict = await storage.resolveSchedulingConflict(id, {
        resolvedById: userId,
        resolvedByName: userName,
        resolutionNotes,
        resolutionAction,
      });
      
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      // Log the resolution in audit log
      await storage.createAuditLog({
        userId,
        userName,
        operation: "update",
        entityType: "scheduling_conflict",
        entityId: id,
        changes: {
          action: "resolved",
          resolutionAction,
          resolutionNotes,
          previousSeverity: existingConflict.severity,
        },
      });
      
      res.json(conflict);
    } catch (error) {
      console.error("Error resolving scheduling conflict:", error);
      res.status(500).json({ error: "Failed to resolve scheduling conflict" });
    }
  });

  // Dismiss a scheduling conflict (requires manager roles for critical conflicts)
  app.post("/api/scheduling-conflicts/:id/dismiss", requireAuth, requireRoles, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name || req.session?.user?.email || "Unknown";
      const userRoles = req.session?.user?.roles || [];
      const { notes } = req.body;
      
      // Get the conflict to check severity
      const existingConflict = await storage.getSchedulingConflictById(id);
      if (!existingConflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      // Critical conflicts require manager roles to dismiss
      if (existingConflict.severity === "critical") {
        const hasManagerRole = userRoles.some((role: string) =>
          ["admin", "director", "operations_manager", "clinical_manager"].includes(role)
        );
        if (!hasManagerRole) {
          return res.status(403).json({ 
            error: "Critical conflicts can only be dismissed by managers or administrators" 
          });
        }
      }
      
      const conflict = await storage.dismissSchedulingConflict(id, userId, userName, notes);
      
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      // Log the dismissal in audit log
      await storage.createAuditLog({
        userId,
        userName,
        operation: "update",
        entityType: "scheduling_conflict",
        entityId: id,
        changes: {
          action: "dismissed",
          previousSeverity: existingConflict.severity,
          notes,
        },
      });
      
      res.json(conflict);
    } catch (error) {
      console.error("Error dismissing scheduling conflict:", error);
      res.status(500).json({ error: "Failed to dismiss scheduling conflict" });
    }
  });

  // Validate staff assignment before saving (preview conflicts)
  app.post("/api/validate-staff-assignment", requireAuth, async (req: any, res) => {
    try {
      const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
      const userId = req.session?.user?.id;
      const userName = req.session?.user?.name || req.session?.user?.email || "Unknown";
      
      const { 
        appointmentId, 
        clientId, 
        clientName, 
        staffId, 
        staffName, 
        scheduledStart, 
        scheduledEnd 
      } = req.body;
      
      if (!appointmentId || !clientId || !staffId || !scheduledStart || !scheduledEnd) {
        return res.status(400).json({ 
          error: "Missing required fields: appointmentId, clientId, staffId, scheduledStart, scheduledEnd" 
        });
      }
      
      const result = await staffAssignmentValidator.validateAssignment({
        appointmentId,
        clientId,
        clientName: clientName || "Unknown Client",
        staffId,
        staffName: staffName || "Unknown Staff",
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        checkingUserId: userId,
        checkingUserName: userName,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error validating staff assignment:", error);
      res.status(500).json({ error: "Failed to validate staff assignment" });
    }
  });

  // Validate all staff for an appointment and record conflicts
  app.post("/api/appointments/:appointmentId/validate", requireAuth, async (req: any, res) => {
    try {
      const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
      const { appointmentId } = req.params;
      
      const results = await staffAssignmentValidator.validateAndRecordForAppointment(appointmentId);
      
      // Convert Map to object for JSON response
      const response: Record<string, any> = {};
      results.forEach((result, staffId) => {
        response[staffId] = result;
      });
      
      res.json(response);
    } catch (error: any) {
      console.error("Error validating appointment:", error);
      res.status(500).json({ error: error.message || "Failed to validate appointment" });
    }
  });

  // Revalidate all future appointments for a staff member (requires manager roles)
  app.post("/api/staff/:staffId/revalidate", requireAuth, requireRoles, async (req: any, res) => {
    try {
      const userRoles = req.session?.user?.roles || [];
      
      // Require manager roles for revalidation operations
      const hasManagerRole = userRoles.some((role: string) =>
        ["admin", "director", "operations_manager", "clinical_manager", "rostering_coordinator"].includes(role)
      );
      if (!hasManagerRole) {
        return res.status(403).json({ 
          error: "Revalidation requires manager or coordinator permissions" 
        });
      }
      
      const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
      const { staffId } = req.params;
      
      const result = await staffAssignmentValidator.revalidateStaffFutureAppointments(staffId);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error revalidating staff appointments:", error);
      res.status(500).json({ error: error.message || "Failed to revalidate staff appointments" });
    }
  });

  // Revalidate all future appointments for a client (requires manager roles)
  app.post("/api/clients/:clientId/revalidate", requireAuth, requireRoles, async (req: any, res) => {
    try {
      const userRoles = req.session?.user?.roles || [];
      
      // Require manager roles for revalidation operations
      const hasManagerRole = userRoles.some((role: string) =>
        ["admin", "director", "operations_manager", "clinical_manager", "rostering_coordinator"].includes(role)
      );
      if (!hasManagerRole) {
        return res.status(403).json({ 
          error: "Revalidation requires manager or coordinator permissions" 
        });
      }
      
      const { staffAssignmentValidator } = await import("./services/staffAssignmentValidator");
      const { clientId } = req.params;
      
      const result = await staffAssignmentValidator.revalidateClientFutureAppointments(clientId);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error revalidating client appointments:", error);
      res.status(500).json({ error: error.message || "Failed to revalidate client appointments" });
    }
  });

  // Acknowledge a conflict (mark as seen)
  app.post("/api/scheduling-conflicts/:id/acknowledge", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const conflict = await storage.updateSchedulingConflict(id, { status: "acknowledged" });
      
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      
      res.json(conflict);
    } catch (error) {
      console.error("Error acknowledging scheduling conflict:", error);
      res.status(500).json({ error: "Failed to acknowledge scheduling conflict" });
    }
  });

  // Auto-resolve conflicts for a cancelled/reassigned appointment
  app.post("/api/appointments/:appointmentId/conflicts/auto-resolve", requireAuth, async (req: any, res) => {
    try {
      const { appointmentId } = req.params;
      
      const count = await storage.autoResolveConflictsForAppointment(appointmentId);
      
      res.json({ resolvedCount: count });
    } catch (error) {
      console.error("Error auto-resolving conflicts:", error);
      res.status(500).json({ error: "Failed to auto-resolve conflicts" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time chat
  setupWebSocket(httpServer);
  
  return httpServer;
}
