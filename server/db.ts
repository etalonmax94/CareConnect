// Database connection that works with both Neon (Replit) and Cloud SQL (Cloud Run)
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're running on Cloud Run (uses standard PostgreSQL)
// or on Replit (uses Neon serverless with WebSocket)
const isCloudRun = process.env.K_SERVICE !== undefined || process.env.CLOUD_RUN === 'true';

let db: any;

if (isCloudRun) {
  // Cloud Run: Use standard pg driver for Cloud SQL
  const { drizzle } = require("drizzle-orm/node-postgres");
  const pg = require("pg");
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=no-verify') 
      ? { rejectUnauthorized: false }
      : process.env.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  db = drizzle(pool, { schema });
  console.log('Database: Using Cloud SQL connection (pg driver)');
} else {
  // Replit: Use Neon serverless driver with WebSocket
  const { drizzle } = require("drizzle-orm/neon-serverless");
  const ws = require("ws");
  
  db = drizzle({
    connection: process.env.DATABASE_URL,
    schema,
    ws: ws,
  });
  console.log('Database: Using Neon serverless connection (WebSocket)');
}

export { db };
