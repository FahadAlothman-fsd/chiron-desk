import { Duration, Effect, Schedule } from "effect";
import { StepTimeoutError } from "./errors";

export const withRetry = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number },
): Effect.Effect<A, E, R> => {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = options ?? {};

  const schedule = Schedule.intersect(
    Schedule.recurs(maxRetries),
    Schedule.exponential(Duration.millis(baseDelayMs), 2).pipe(
      Schedule.jittered,
      Schedule.upTo(Duration.millis(maxDelayMs)),
    ),
  );

  return Effect.retry(effect, schedule);
};

export const withTimeout = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  timeoutMs: number,
  stepId: string,
): Effect.Effect<A, E | StepTimeoutError, R> =>
  Effect.timeoutFail(effect, {
    duration: Duration.millis(timeoutMs),
    onTimeout: () => new StepTimeoutError({ stepId, timeoutMs }),
  });
