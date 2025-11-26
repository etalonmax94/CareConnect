import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, updateClientSchema, insertProgressNoteSchema, 
  insertInvoiceSchema, calculateAge, insertBudgetSchema,
  insertIncidentReportSchema, insertPrivacyConsentSchema, insertActivityLogSchema,
  insertStaffSchema, insertSupportCoordinatorSchema, insertPlanManagerSchema, insertNdisServiceSchema,
  insertGPSchema, insertPharmacySchema, insertDocumentSchema, insertClientStaffAssignmentSchema,
  insertServiceDeliverySchema, insertClientGoalSchema,
  insertClientContactSchema, insertClientBehaviorSchema, insertLeadershipMeetingNoteSchema,
  USER_ROLES, type UserRole
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";

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
function getBaseUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

// Auth middleware - check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Auth middleware - check if user has completed role selection
function requireRoles(req: Request, res: Response, next: NextFunction) {
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
function getDistanceFromOffice(address: string | null | undefined): number | null {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  for (const [suburb, coords] of Object.entries(SUBURB_COORDS)) {
    if (addressLower.includes(suburb)) {
      const distance = calculateDistance(OFFICE_LOCATION.lat, OFFICE_LOCATION.lon, coords.lat, coords.lon);
      return Math.round(distance * 10) / 10;
    }
  }
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== AUTH ROUTES ====================
  
  // Get current user session
  app.get("/api/auth/me", (req, res) => {
    if (req.session?.user) {
      res.json({ 
        authenticated: true, 
        user: req.session.user,
        needsRoleSelection: req.session.user.isFirstLogin === "yes" || req.session.user.roles.length === 0
      });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  // Initiate Zoho OAuth login
  app.get("/api/auth/zoho", (req, res) => {
    // Validate Zoho credentials are configured
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
      console.error("Zoho OAuth credentials not configured");
      return res.redirect("/login?error=oauth_not_configured");
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
      return res.redirect("/login?error=oauth_not_configured");
    }
    
    if (error) {
      console.error("Zoho OAuth error:", error);
      return res.redirect("/login?error=oauth_error");
    }
    
    if (!code) {
      console.error("No code received");
      return res.redirect("/login?error=no_code");
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
        return res.redirect("/login?error=token_error");
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
        return res.redirect("/login?error=user_info_error");
      }
      
      console.log("Zoho user email:", userEmail);
      
      // Pre-approved admin emails - these users are auto-approved with their respective roles
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
        }
      } else {
        // Update existing user tokens
        await storage.updateUserTokens(user.id, access_token, refresh_token, expiresAt);
        user = await storage.getUserById(user.id);
      }
      
      if (!user) {
        return res.redirect("/?error=user_create_error");
      }
      
      // Check approval status - pending users go to waiting page
      if (user.approvalStatus === "pending") {
        console.log(`User ${userEmail} is pending approval - redirecting to pending page`);
        
        // Set minimal session for pending user
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
            return res.redirect("/login?error=session_error");
          }
          res.redirect("/pending-approval");
        });
      }
      
      // Check if user was rejected
      if (user.approvalStatus === "rejected") {
        console.log(`User ${userEmail} was rejected - redirecting to login with error`);
        return res.redirect("/login?error=access_denied");
      }
      
      // Set session for approved user
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
          return res.redirect("/login?error=session_error");
        }
        
        console.log("Session saved successfully for user:", user.email);
        
        // Approved users go directly to dashboard
        res.redirect("/");
      });
    } catch (error) {
      console.error("Zoho OAuth callback error:", error);
      res.redirect("/?error=callback_error");
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
      
      // Add address (homeAddress is a single field)
      if (client.homeAddress) {
        vcfContent.push(`ADR;TYPE=HOME:;;${client.homeAddress};;;;Australia`);
        vcfContent.push(`LABEL;TYPE=HOME:${client.homeAddress}`);
      }
      
      // Add birthday
      if (dobFormatted) {
        vcfContent.push(`BDAY:${dobFormatted}`);
      }
      
      // Add notes (NOK info)
      if (notesText) {
        vcfContent.push(`NOTE:${notesText}`);
      }
      
      // Add organization
      vcfContent.push('ORG:EmpowerLink Client');
      
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
      
      const clientWithAge = {
        ...client,
        age: calculateAge(client.dateOfBirth)
      };
      
      res.status(201).json(clientWithAge);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: "Failed to create client" });
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
      
      const distanceKm = getDistanceFromOffice(client.homeAddress);
      res.json({
        clientId: client.id,
        address: client.homeAddress,
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
      
      // Calculate compliance rates based on clinical documents
      let compliantCount = 0;
      let nonCompliantCount = 0;
      const dueThisMonth: any[] = [];
      const overdueItems: any[] = [];
      
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      allClients.forEach(client => {
        const docs = client.clinicalDocuments || {};
        const requiredDocs = ['serviceAgreementDate', 'consentFormDate', 'riskAssessmentDate', 'carePlanDate'];
        const filledDocs = requiredDocs.filter(doc => docs[doc as keyof typeof docs]);
        
        if (filledDocs.length >= requiredDocs.length * 0.75) {
          compliantCount++;
        } else {
          nonCompliantCount++;
        }
        
        // Check for due/overdue documents
        Object.entries(docs).forEach(([key, dateStr]) => {
          if (dateStr) {
            const date = new Date(dateStr);
            const reviewDate = new Date(date);
            reviewDate.setFullYear(reviewDate.getFullYear() + 1);
            
            if (reviewDate < today) {
              overdueItems.push({
                clientId: client.id,
                clientName: client.participantName,
                documentType: key.replace(/Date$/, '').replace(/([A-Z])/g, ' $1').trim(),
                dueDate: reviewDate.toISOString()
              });
            } else if (reviewDate <= endOfMonth) {
              dueThisMonth.push({
                clientId: client.id,
                clientName: client.participantName,
                documentType: key.replace(/Date$/, '').replace(/([A-Z])/g, ' $1').trim(),
                dueDate: reviewDate.toISOString()
              });
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
      
      // Get unassigned clients (clients without a care_manager assignment)
      const allAssignments = await Promise.all(
        allClients.map(c => storage.getAssignmentsByClient(c.id))
      );
      
      const unassignedClients = allClients
        .filter((client, index) => {
          if (client.isArchived === "yes") return false;
          const assignments = allAssignments[index];
          return !assignments.some(a => a.assignmentType === "care_manager" && (!a.endDate || new Date(a.endDate) > today));
        })
        .map(c => ({
          id: c.id,
          participantName: c.participantName,
          category: c.category,
          phoneNumber: c.phoneNumber,
          createdAt: c.createdAt
        }));
      
      res.json({
        totalClients: allClients.length,
        newClients: newClientsCount,
        complianceRate: {
          compliant: compliantCount,
          nonCompliant: nonCompliantCount,
          percentage: allClients.length > 0 ? Math.round((compliantCount / allClients.length) * 100) : 0
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
      
      // Simulated geocoding based on suburb names (for demo purposes)
      const suburbCoords: Record<string, { lat: number; lon: number }> = {
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
        "sunshine coast": { lat: -26.6500, lon: 153.0667 }
      };
      
      const distanceReport = allClients.map(client => {
        let distance = null;
        let estimatedCoords = null;
        
        if (client.homeAddress) {
          const addressLower = client.homeAddress.toLowerCase();
          for (const [suburb, coords] of Object.entries(suburbCoords)) {
            if (addressLower.includes(suburb)) {
              distance = calculateDistance(OFFICE_LOCATION.lat, OFFICE_LOCATION.lon, coords.lat, coords.lon);
              estimatedCoords = coords;
              break;
            }
          }
        }
        
        return {
          clientId: client.id,
          clientName: client.participantName,
          address: client.homeAddress || "No address",
          distanceKm: distance ? Math.round(distance * 10) / 10 : null,
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

  // Upload document file (PDF)
  app.post("/api/clients/:clientId/documents/upload", uploadPdf.single("file"), async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { documentType, fileName, expiryDate } = req.body;
      if (!documentType) {
        return res.status(400).json({ error: "Document type is required" });
      }
      
      // Validate document type
      const validDocumentTypes = [
        "Service Agreement", "NDIS Plan", "Care Plan", "Risk Assessment",
        "Medical Report", "Consent Form", "Progress Report", "Assessment",
        "Referral", "Certificate", "Policy Document", "Other"
      ];
      if (!validDocumentTypes.includes(documentType)) {
        return res.status(400).json({ error: "Invalid document type" });
      }

      // Create a URL to serve the uploaded file with client ID for authorization
      const safeClientId = sanitizeFilename(req.params.clientId);
      const fileUrl = `/uploads/${safeClientId}/${req.file.filename}`;
      
      const document = await storage.createDocument({
        clientId: req.params.clientId,
        documentType,
        fileName: fileName || req.file.originalname,
        fileUrl,
        expiryDate: expiryDate || null,
      });

      // Log activity
      await storage.logActivity({
        clientId: req.params.clientId,
        action: "document_uploaded",
        description: `Document ${document.fileName} was uploaded${expiryDate ? ` (expires: ${expiryDate})` : ''}`,
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
      const deleted = await storage.deleteAssignment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Assignment not found" });
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
      
      const client = await storage.updateClient(req.params.id, {
        isOnboarded: "yes"
      });
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Log activity
      await storage.logActivity({
        clientId: req.params.id,
        action: "client_onboarded",
        description: `Client was marked as onboarded`,
        performedBy: req.session.user.email || "System"
      });
      
      res.json(client);
    } catch (error) {
      console.error("Error onboarding client:", error);
      res.status(500).json({ error: "Failed to onboard client" });
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

  const httpServer = createServer(app);
  return httpServer;
}
