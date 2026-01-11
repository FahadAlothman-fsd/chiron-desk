import { db } from "@chiron/db";
import { Context, Effect, Layer } from "effect";

export type DrizzleDb = typeof db;

export class DatabaseService extends Context.Tag("DatabaseService")<
	DatabaseService,
	{
		readonly db: DrizzleDb;
		readonly transaction: <A, E>(
			fn: (tx: DrizzleDb) => Effect.Effect<A, E>,
		) => Effect.Effect<A, E>;
	}
>() {}

export const DatabaseServiceLive = Layer.succeed(DatabaseService, {
	db,
	transaction: <A, E>(fn: (tx: DrizzleDb) => Effect.Effect<A, E>) =>
		Effect.gen(function* () {
			return yield* fn(db);
		}),
});
