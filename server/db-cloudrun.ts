// Cloud Run-compatible database connection using standard pg driver
// This is used instead of db.ts which uses Neon serverless (WebSocket-based)

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool for Cloud SQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Cloud SQL connection settings
  ssl: process.env.DATABASE_URL.includes('sslmode=no-verify') 
    ? { rejectUnauthorized: false }
    : process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false } // Accept Cloud SQL's self-signed cert
    : false,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
