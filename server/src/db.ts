import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Create server/.env from server/.env.example.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T extends Record<string, any> = any>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params);
}