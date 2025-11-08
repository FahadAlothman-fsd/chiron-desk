import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL || "", { schema });

// Re-export all schemas for use in other packages
export * from "./schema";

// Re-export commonly used drizzle-orm functions
export { eq, and, or, sql } from "drizzle-orm";
