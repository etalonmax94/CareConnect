import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, updateClientSchema, insertProgressNoteSchema, 
  insertInvoiceSchema, calculateAge, insertBudgetSchema,
  insertIncidentReportSchema, insertPrivacyConsentSchema, insertActivityLogSchema,
  insertStaffSchema, insertSupportCoordinatorSchema, insertPlanManagerSchema, insertNdisServiceSchema,
  USER_ROLES, type UserRole
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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
    authUrl.searchParams.set("scope", "profile,email");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    
    res.redirect(authUrl.toString());
  });

  // Zoho OAuth callback
  app.get("/api/auth/zoho/callback", async (req, res) => {
    const { code, error } = req.query;
    const baseUrl = getBaseUrl(req);
    
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
      
      if (tokens.error) {
        console.error("Zoho token error:", tokens);
        return res.redirect("/?error=token_error");
      }
      
      const { access_token, refresh_token, expires_in } = tokens;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));
      
      // Get user info from Zoho
      const userResponse = await fetch(ZOHO_USER_URL, {
        headers: { "Authorization": `Zoho-oauthtoken ${access_token}` }
      });
      
      const zohoUser = await userResponse.json();
      
      if (!zohoUser.Email) {
        console.error("Failed to get Zoho user info:", zohoUser);
        return res.redirect("/?error=user_info_error");
      }
      
      // Check if user exists in our database
      let user = await storage.getUserByEmail(zohoUser.Email);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          zohoUserId: zohoUser.ZUID,
          email: zohoUser.Email,
          displayName: zohoUser.Display_Name || zohoUser.First_Name || zohoUser.Email,
          firstName: zohoUser.First_Name,
          lastName: zohoUser.Last_Name,
          roles: [],
          isFirstLogin: "yes",
          isActive: "yes",
          zohoAccessToken: access_token,
          zohoRefreshToken: refresh_token,
          zohoTokenExpiresAt: expiresAt
        });
      } else {
        // Update existing user tokens
        await storage.updateUserTokens(user.id, access_token, refresh_token, expiresAt);
        user = await storage.getUserById(user.id);
      }
      
      if (!user) {
        return res.redirect("/?error=user_create_error");
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles as string[],
        isFirstLogin: user.isFirstLogin || "no"
      };
      
      // Redirect based on whether roles are set
      if (user.isFirstLogin === "yes" || !user.roles || user.roles.length === 0) {
        res.redirect("/select-role");
      } else {
        res.redirect("/");
      }
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
      isFirstLogin: "no",
      zohoId: "dev-zoho-id"
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
        performedBy: "System"
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
      
      const client = await storage.updateClient(req.params.id, validationResult.data);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Log activity
      await storage.logActivity({
        clientId: client.id,
        action: "client_updated",
        description: `Client ${client.participantName} was updated`,
        performedBy: "System"
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
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Get active clients (non-archived)
  app.get("/api/clients/active", async (req, res) => {
    try {
      const activeClients = await storage.getActiveClients();
      res.json(activeClients);
    } catch (error) {
      console.error("Error fetching active clients:", error);
      res.status(500).json({ error: "Failed to fetch active clients" });
    }
  });

  // Get archived clients
  app.get("/api/clients/archived", async (req, res) => {
    try {
      const archivedClients = await storage.getArchivedClients();
      res.json(archivedClients);
    } catch (error) {
      console.error("Error fetching archived clients:", error);
      res.status(500).json({ error: "Failed to fetch archived clients" });
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
        performedBy: userId,
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
        performedBy: userId,
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
        performedBy: incident.reportedBy
      });
      
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  app.patch("/api/incidents/:id", async (req, res) => {
    try {
      const incident = await storage.updateIncidentReport(req.params.id, req.body);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
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
        openIncidents: allIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
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

  const httpServer = createServer(app);
  return httpServer;
}
