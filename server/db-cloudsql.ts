// Cloud SQL database connection using standard pg driver (for Cloud Run)
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse SSL mode from connection string
const connectionString = process.env.DATABASE_URL;
const sslConfig = connectionString.includes('sslmode=no-verify') || connectionString.includes('sslmode=require')
  ? { rejectUnauthorized: false }
  : false;

// Create a connection pool for Cloud SQL
const pool = new pg.Pool({
  connectionString: connectionString.replace(/[?&]sslmode=[^&]+/, ''), // Remove sslmode from URL, handle it via ssl config
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

console.log('Database: Using Cloud SQL connection (pg driver)');
