import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, updateClientSchema, insertProgressNoteSchema, 
  insertInvoiceSchema, calculateAge, insertBudgetSchema,
  insertIncidentReportSchema, insertPrivacyConsentSchema, insertActivityLogSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Get progress notes for a client
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

  const httpServer = createServer(app);
  return httpServer;
}
