import { Context, type Effect } from "effect";

export class MethodologyTx extends Context.Tag("@chiron/methodology-engine/ports/MethodologyTx")<
  MethodologyTx,
  {
    readonly withTransaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  }
>() {}
