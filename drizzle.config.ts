import { defineConfig } from "drizzle-kit";

// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL, ensure the database is provisioned");
// }

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_i6drDtCZa7YV@ep-weathered-violet-a45avwu1-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
});
