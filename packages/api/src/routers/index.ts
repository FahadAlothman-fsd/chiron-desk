import { protectedProcedure, publicProcedure, router } from "../index";
import { projectsRouter } from "./projects";
import { modelsRouter } from "./models";
import { settingsRouter } from "./settings";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	projects: projectsRouter,
	models: modelsRouter,
	settings: settingsRouter,
});
export type AppRouter = typeof appRouter;
