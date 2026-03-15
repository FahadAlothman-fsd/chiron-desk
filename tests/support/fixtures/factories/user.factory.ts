import { faker } from "@faker-js/faker";

export type UserFactoryModel = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: string;
};

export const createUser = (overrides: Partial<UserFactoryModel> = {}): UserFactoryModel => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  displayName: faker.person.fullName(),
  role: "user",
  createdAt: new Date().toISOString(),
  ...overrides,
});
