import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, updateClientSchema, insertProgressNoteSchema, insertInvoiceSchema, calculateAge } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
