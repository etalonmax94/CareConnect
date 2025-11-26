// Cloud Run-specific entry point for backend-only API deployment
// This version does NOT serve static files (frontend is hosted separately on Replit)

import { type Server } from "node:http";
import { type Express } from "express";
import runApp from "./app";

// For Cloud Run backend-only deployment, we skip static file serving
// The frontend is hosted separately (e.g., on Replit)
// Note: CORS is now handled in app.ts as the first middleware
export async function setupApiOnly(_app: Express, _server: Server) {
  // For any unmatched routes in a backend-only deployment, return 404
  // This includes both non-API routes and undefined API endpoints
  _app.use("*", (_req, res) => {
    res.status(404).json({ 
      error: "Not Found", 
      message: "This is an API-only server. Frontend is hosted separately."
    });
  });
}

(async () => {
  await runApp(setupApiOnly);
})();
