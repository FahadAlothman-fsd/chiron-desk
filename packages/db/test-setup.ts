import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Get the directory of this file (packages/db/test-setup.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Navigate from packages/db to apps/server/.env
config({ path: resolve(__dirname, "../../apps/server/.env") });
