export const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});
