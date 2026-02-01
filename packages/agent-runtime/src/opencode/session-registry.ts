type SessionRecord = {
  executionId: string;
  stepId: string;
  directory?: string;
  createdAt: number;
};

const sessionMap = new Map<string, SessionRecord>();

export const registerSession = (sessionId: string, record: Omit<SessionRecord, "createdAt">) => {
  sessionMap.set(sessionId, { ...record, createdAt: Date.now() });
};

export const getSession = (sessionId: string) => sessionMap.get(sessionId);

export const clearSession = (sessionId: string) => {
  sessionMap.delete(sessionId);
};
