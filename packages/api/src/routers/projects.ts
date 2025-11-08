import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db, projects, projectState } from "@chiron/db";
import { publicProcedure, router } from "../index";
import { promises as fs } from "node:fs";
import { join } from "node:path";

// Zod schemas for input validation
const createProjectSchema = z.object({
	name: z.string().min(1, "Project name is required"),
	path: z.string().min(1, "Project path is required"),
	level: z.enum(["0", "1", "2", "3", "4"]),
	type: z.enum(["software", "game"]),
	fieldType: z.enum(["greenfield", "brownfield"]),
});

const getProjectSchema = z.object({
	id: z.string().uuid("Invalid project ID format"),
});

const deleteProjectSchema = z.object({
	id: z.string().uuid("Invalid project ID format"),
});

// Helper functions for validation
async function validateProjectPath(
	path: string,
): Promise<{ valid: boolean; error?: string }> {
	try {
		console.log(`[API] Validating path: ${path}`);

		// Check if path is absolute
		if (!path.startsWith("/")) {
			console.log(`[API] Path is not absolute: ${path}`);
			return { valid: false, error: "Path must be absolute" };
		}

		console.log(`[API] Path is absolute, checking directory existence...`);

		// Check if directory exists
		try {
			const stats = await fs.stat(path);
			console.log(`[API] Directory exists: ${stats.isDirectory()}`);

			if (!stats.isDirectory()) {
				return { valid: false, error: "Path exists but is not a directory" };
			}

			// Check if directory is empty or has .git
			const files = await fs.readdir(path);
			console.log(`[API] Directory contents: ${files}`);

			if (files.length === 0) {
				console.log(`[API] Directory is empty - valid`);
				return { valid: true }; // Empty directory is valid
			}

			if (files.includes(".git")) {
				console.log(`[API] Directory has .git - valid`);
				return { valid: true }; // Valid git repository
			}

			console.log(`[API] Directory not empty and no .git - invalid`);
			return {
				valid: false,
				error: "Directory must be empty or contain a valid git repository",
			};
		} catch (statError) {
			console.log(
				`[API] Directory does not exist, testing creation... Error: ${statError.code}`,
			);

			// Directory doesn't exist, check if we can create it
			try {
				// Test creation by actually creating and keeping it for project creation
				await fs.mkdir(path, { recursive: true });
				console.log(`[API] Successfully created directory: ${path}`);

				// Verify it was created
				const createdStats = await fs.stat(path);
				console.log(
					`[API] Created directory exists: ${createdStats.isDirectory()}`,
				);

				return { valid: true }; // Can create directory
			} catch (createError) {
				console.log(`[API] Failed to create directory: ${createError.code}`);
				return {
					valid: false,
					error: "Cannot create directory at specified path",
				};
			}
		}
	} catch (error) {
		console.log(`[API] Validation failed: ${error}`);
		return { valid: false, error: "Failed to validate project path" };
	}
}

async function checkProjectNameUniqueness(
	name: string,
): Promise<{ unique: boolean; existingId?: string }> {
	try {
		const existingProject = await db.query.projects.findFirst({
			where: (projects, { eq }) => eq(projects.name, name),
		});

		return {
			unique: !existingProject,
			existingId: existingProject?.id,
		};
	} catch (error) {
		console.error("Error checking project name uniqueness:", error);
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to check project name uniqueness",
		});
	}
}

export const projectsRouter = router({
	// Create a new project
	create: publicProcedure
		.input(createProjectSchema)
		.mutation(async ({ input }) => {
			try {
				// Validate project name uniqueness
				const nameCheck = await checkProjectNameUniqueness(input.name);
				if (!nameCheck.unique) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Project name already exists",
					});
				}

				// Validate project path
				const pathValidation = await validateProjectPath(input.path);
				if (!pathValidation.valid) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: pathValidation.error || "Invalid project path",
					});
				}

				// Create the project
				const [newProject] = await db
					.insert(projects)
					.values({
						name: input.name,
						path: input.path,
						level: input.level,
						type: input.type,
						fieldType: input.fieldType,
					})
					.returning();

				return {
					project: newProject,
				};
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}
				console.error("Error creating project:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create project",
				});
			}
		}),

	// List all projects
	list: publicProcedure.query(async () => {
		try {
			const allProjects = await db.query.projects.findMany({
				orderBy: (projects, { desc }) => [desc(projects.createdAt)],
			});

			return {
				projects: allProjects,
			};
		} catch (error) {
			console.error("Error listing projects:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to list projects",
			});
		}
	}),

	// Get a single project by ID
	get: publicProcedure.input(getProjectSchema).query(async ({ input }) => {
		try {
			const project = await db.query.projects.findFirst({
				where: (projects, { eq }) => eq(projects.id, input.id),
			});

			if (!project) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found",
				});
			}

			return {
				project,
			};
		} catch (error) {
			if (error instanceof TRPCError) {
				throw error;
			}
			console.error("Error getting project:", error);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to get project",
			});
		}
	}),

	// Delete a project
	delete: publicProcedure
		.input(deleteProjectSchema)
		.mutation(async ({ input }) => {
			try {
				// Check if project exists
				const existingProject = await db.query.projects.findFirst({
					where: (projects, { eq }) => eq(projects.id, input.id),
				});

				if (!existingProject) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Project not found",
					});
				}

				// Check for active agents (placeholder for future implementation)
				// For now, we'll just log a warning
				console.warn(
					`Deleting project ${existingProject.name}. Note: Active agent checking not yet implemented`,
				);

				// Delete the project (cascade delete will handle project_state)
				const [deletedProject] = await db
					.delete(projects)
					.where((projects, { eq }) => eq(projects.id, input.id))
					.returning();

				return {
					success: true,
					deletedProject,
				};
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}
				console.error("Error deleting project:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to delete project",
				});
			}
		}),
});
