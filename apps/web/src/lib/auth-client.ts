import { createAuthClient } from "better-auth/react";
import { resolveRuntimeBackendUrl } from "./runtime-backend";

export const authClient = createAuthClient({
  baseURL: resolveRuntimeBackendUrl(),
});
