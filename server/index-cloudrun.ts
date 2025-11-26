// Cloud Run-specific entry point for backend-only API deployment
// This version does NOT serve static files (frontend is hosted separately on Replit)

import { type Server } from "node:http";
import express, { type Express } from "express";
import runApp from "./app";

// For Cloud Run backend-only deployment, we skip static file serving
// The frontend is hosted separately (e.g., on Replit)
export async function setupApiOnly(app: Express, _server: Server) {
  // CORS configuration for cross-origin requests from frontend
  app.use((req, res, next) => {
    // Allow requests from Replit frontend domain
    const allowedOrigins = [
      'https://app.empowerlink.au',
      'https://empowerlink.au',
      'http://localhost:5000', // Local development
      'http://localhost:3000', // Alternative local dev port
      process.env.ALLOWED_ORIGIN // Allow custom origin via env var
    ].filter(Boolean);
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    next();
  });

  // For any unmatched routes in a backend-only deployment, return 404
  // This includes both non-API routes and undefined API endpoints
  app.use("*", (_req, res) => {
    res.status(404).json({ 
      error: "Not Found", 
      message: "This is an API-only server. Frontend is hosted separately."
    });
  });
}

(async () => {
  await runApp(setupApiOnly);
})();
