import { Pool } from "pg";
import { config } from "./env";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT current_database(), now()");
    client.release();
    console.log(
      ` Successfully connected to PostgreSQL (Neon): ${result.rows[0].current_database}`
    );
  } catch (error) {
    console.error(" Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
};
