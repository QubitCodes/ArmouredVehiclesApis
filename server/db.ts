import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dns from "node:dns";
// Prefer IPv4 when resolving multi-address hosts to avoid IPv6 ENETUNREACH
dns.setDefaultResultOrder?.("ipv4first");
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Prefer a resilient connection configuration for managed Postgres providers (e.g., Neon)
// - ssl with relaxed cert validation (provider-managed certs)
// - keepAlive to reduce reconnect churn during seeding
// - longer connection timeout to avoid premature ETIMEDOUT on multi-address DNS
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  connectionTimeoutMillis: 15000,
  // Force IPv4 to avoid dual-stack timeout issues seen with some providers
  lookup: (hostname, options, callback) => {
    return dns.lookup(hostname, { ...options, family: 4 }, callback as any);
  },
});
export const db = drizzle(pool, { schema });
