import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// Check if DATABASE_URL is properly configured
const isDatabaseConfigured = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('[YOUR-PASSWORD]') && 
  !process.env.DATABASE_URL.includes('[YOUR-PROJECT-REF]') &&
  !process.env.DATABASE_URL.includes('username:password') &&
  !process.env.DATABASE_URL.includes('mock:mock');

let db: any = null;

if (isDatabaseConfigured) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    db = drizzle(sql);
    console.log("✅ Connected to database");
  } catch (error) {
    console.warn("⚠️ Database connection failed, using mock storage:", error);
    db = null;
  }
} else {
  console.log("ℹ️ No database configured, using mock storage");
}

export { db };
