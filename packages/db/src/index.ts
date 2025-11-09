import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL || "", { schema });

// Re-export commonly used drizzle-orm functions
export { and, eq, or, sql } from "drizzle-orm";
// Re-export all schemas for use in other packages
export * from "./schema";
