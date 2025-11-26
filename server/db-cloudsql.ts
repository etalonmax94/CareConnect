// Cloud SQL database connection using standard pg driver (for Cloud Run)
// Supports both Unix socket (secure) and public IP (for testing)
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Check for required environment variables
const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME || 'postgres';
const databaseUrl = process.env.DATABASE_URL;

// Determine connection method: Unix socket (secure) or TCP (public IP)
let pool: pg.Pool;

if (instanceConnectionName && dbUser && dbPassword) {
  // SECURE METHOD: Use Unix socket via Cloud SQL Auth Proxy
  // This is the recommended method for production
  // Cloud Run automatically provides the socket at /cloudsql/PROJECT:REGION:INSTANCE
  const socketPath = `/cloudsql/${instanceConnectionName}`;
  
  pool = new pg.Pool({
    user: dbUser,
    password: dbPassword,
    database: dbName,
    host: socketPath,
    // No SSL needed - Unix socket is already secure
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  console.log(`Database: Using Cloud SQL Unix socket (secure) - ${instanceConnectionName}`);
} else if (databaseUrl) {
  // FALLBACK METHOD: Use TCP connection with SSL
  // Used when Unix socket is not available (testing, or direct connection)
  const connectionString = databaseUrl;
  const sslConfig = connectionString.includes('sslmode=no-verify') || connectionString.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;
  
  pool = new pg.Pool({
    connectionString: connectionString.replace(/[?&]sslmode=[^&]+/, ''),
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  console.log('Database: Using Cloud SQL TCP connection with SSL');
} else {
  throw new Error(
    "Database configuration required. Set either:\n" +
    "1. INSTANCE_CONNECTION_NAME, DB_USER, DB_PASSWORD, DB_NAME (recommended)\n" +
    "2. DATABASE_URL (fallback)"
  );
}

export const db = drizzle(pool, { schema });
