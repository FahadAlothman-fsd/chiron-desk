import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { promises as fs } from "fs";
import { join } from "path";

// Test data with unique names
const timestamp = Date.now();
const testProjectData = {
  name: `Test Project ${timestamp}`,
  path: `/tmp/bun-test-project-${timestamp}`,
  level: "1" as const,
  type: "software" as const,
  fieldType: "greenfield" as const,
};

describe("Projects CRUD Operations", () => {
	let baseUrl: string;
	let serverProcess: any;

	beforeAll(async () => {
		// Start server in background for testing
		const { spawn } = await import("child_process");

		// Clean up any existing test directory
		try {
			await fs.rm(testProjectData.path, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, that's fine
		}

		// Start server
		serverProcess = spawn("bun", ["run", "dev:server"], {
			cwd: "/home/gondilf/Desktop/projects/masters/chiron",
			stdio: "pipe",
			detached: true,
		});

		// Wait for server to be ready
		await new Promise((resolve) => setTimeout(resolve, 3000));

		baseUrl = "http://localhost:3000/trpc";
	});

	afterAll(async () => {
		// Clean up test directory
		try {
			await fs.rm(testProjectData.path, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist
		}

		// Kill server
		if (serverProcess) {
			serverProcess.kill();
		}
	});

	test("projects.list should work", async () => {
		const response = await fetch(`${baseUrl}/projects.list`, {
			method: "GET",
		});

		expect(response.ok).toBe(true);
		const data = await response.json();
		expect(data).toHaveProperty("result");
		expect(data.result).toHaveProperty("data");
		expect(data.result.data).toHaveProperty("projects");
		expect(Array.isArray(data.result.data.projects)).toBe(true);
	});

	test("projects.create should create a project", async () => {
		const response = await fetch(`${baseUrl}/projects.create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(testProjectData),
		});

		expect(response.ok).toBe(true);
		const data = await response.json();
		expect(data).toHaveProperty("result");
		expect(data.result).toHaveProperty("data");
		expect(data.result.data).toHaveProperty("project");

		const project = data.result.data.project;
		expect(project.name).toBe(testProjectData.name);
		expect(project.path).toBe(testProjectData.path);
		expect(project.level).toBe(testProjectData.level);
		expect(project.type).toBe(testProjectData.type);
		expect(project.fieldType).toBe(testProjectData.fieldType);
		expect(project.id).toBeDefined();
		expect(project.createdAt).toBeDefined();
		expect(project.updatedAt).toBeDefined();

		// Verify directory was created
		const stats = await fs.stat(testProjectData.path);
		expect(stats.isDirectory()).toBe(true);
	});

test("projects.create should reject duplicate names", async () => {
    // Create first project
    const createResponse = await fetch(`${baseUrl}/projects.create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: "Unique Test Project",
        path: "/tmp/unique-test-project",
        level: "1",
        type: "software",
        fieldType: "greenfield",
      }),
    });
    expect(createResponse.ok).toBe(true);

    // Try to create duplicate
    const duplicateResponse = await fetch(`${baseUrl}/projects.create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: "Unique Test Project", // Same name
        path: "/tmp/duplicate-test-project",
        level: "1",
        type: "software",
        fieldType: "greenfield",
      }),
    });

    expect(duplicateResponse.ok).toBe(false);
    const errorData = await duplicateResponse.json();
    expect(errorData.error.data.code).toBe('BAD_REQUEST');
    expect(errorData.error.message).toContain('already exists');
  });
		expect(createResponse.ok).toBe(true);

		// Try to create duplicate
		const duplicateResponse = await fetch(`${baseUrl}/projects.create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...testProjectData,
				path: "/tmp/duplicate-test-project",
			}),
		});

		expect(duplicateResponse.ok).toBe(false);
		const errorData = await duplicateResponse.json();
		expect(errorData).toHaveProperty("error");
		expect(errorData.error).toHaveProperty("code");
		expect(errorData.error.data.code).toBe("BAD_REQUEST");
		expect(errorData.error.message).toContain("already exists");
	});

test("projects.create should reject invalid paths", async () => {
    const response = await fetch(`${baseUrl}/projects.create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: "Invalid Path Project",
        path: "relative/path",
        level: "1",
        type: "software",
        fieldType: "greenfield",
      }),
    });

    expect(response.ok).toBe(false);
    const errorData = await response.json();
    expect(errorData.error.data.code).toBe('BAD_REQUEST');
    expect(errorData.error.message).toContain('absolute');
  });

		expect(response.ok).toBe(false);
		const errorData = await response.json();
		expect(errorData.error.data.code).toBe("BAD_REQUEST");
		expect(errorData.error.message).toContain("absolute");
	});

	test("projects.get should retrieve created project", async () => {
		// First create a project
		const createResponse = await fetch(`${baseUrl}/projects.create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(testProjectData),
		});

		const createData = await createResponse.json();
		const projectId = createData.result.data.project.id;

		// Get the project
		const getResponse = await fetch(`${baseUrl}/projects.get`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id: projectId }),
		});

		expect(getResponse.ok).toBe(true);
		const getData = await getResponse.json();
		expect(getData.result.data.project.id).toBe(projectId);
		expect(getData.result.data.project.name).toBe(testProjectData.name);
	});

	test("projects.get should return NOT_FOUND for invalid ID", async () => {
		const response = await fetch(`${baseUrl}/projects.get`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: "00000000-0000-0000-0000-000000000000",
			}),
		});

		expect(response.ok).toBe(false);
		const errorData = await response.json();
		expect(errorData.error.data.code).toBe("NOT_FOUND");
		expect(errorData.error.message).toContain("not found");
	});

	test("projects.delete should remove project", async () => {
		// First create a project
		const createResponse = await fetch(`${baseUrl}/projects.create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(testProjectData),
		});

		const createData = await createResponse.json();
		const projectId = createData.result.data.project.id;

		// Delete the project
		const deleteResponse = await fetch(`${baseUrl}/projects.delete`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id: projectId }),
		});

		expect(deleteResponse.ok).toBe(true);
		const deleteData = await deleteResponse.json();
		expect(deleteData.result.data.success).toBe(true);
		expect(deleteData.result.data.deletedProject.id).toBe(projectId);

		// Verify project is gone
		const getResponse = await fetch(`${baseUrl}/projects.get`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id: projectId }),
		});

		expect(getResponse.ok).toBe(false);
		const getErrorData = await getResponse.json();
		expect(getErrorData.error.data.code).toBe("NOT_FOUND");

		// Verify directory still exists (safety measure)
		const stats = await fs.stat(testProjectData.path);
		expect(stats.isDirectory()).toBe(true);
	});
});
