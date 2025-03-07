/* eslint-disable */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Database connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Run migrations
async function runMigrations() {
  console.log("Running migrations...");

  try {
    // Dynamically import postgres
    const { default: postgres } = await import("postgres");

    // For migrations
    const migrationClient = postgres(connectionString, { max: 1 });

    // Initialize Drizzle
    const db = drizzle(migrationClient);

    await migrate(db, { migrationsFolder: "./db/migrations" });

    console.log("Migrations completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  }
}

runMigrations();
