import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Get the directory of this file (packages/scripts/test-setup.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables BEFORE any other imports
// Navigate from packages/scripts to apps/server/.env
const envPath = resolve(__dirname, "../../apps/server/.env");
config({ path: envPath });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
	throw new Error(`DATABASE_URL not found. Checked: ${envPath}`);
}
