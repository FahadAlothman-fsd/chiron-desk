import type { CanonicalWorkflowContextFactDefinition } from "@chiron/contracts/methodology/fact";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../../errors";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import {
  normalizeWorkflowContextFactValue,
  type NormalizeWorkflowContextFactValueInput,
} from "../runtime-manual-fact-crud-service";

type AgentStepContextFactCrudServiceError =
  | RepositoryError
  | {
      readonly _tag: "RuntimeFactValidationError" | "RuntimeFactCrudError";
      readonly message: string;
    };

export class AgentStepContextFactCrudService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepContextFactCrudService",
)<
  AgentStepContextFactCrudService,
  {
    readonly normalizeWorkflowContextValue: (
      input: NormalizeWorkflowContextFactValueInput & {
        readonly definition: CanonicalWorkflowContextFactDefinition;
      },
    ) => Effect.Effect<unknown, AgentStepContextFactCrudServiceError>;
  }
>() {}

export const AgentStepContextFactCrudServiceLive = Layer.effect(
  AgentStepContextFactCrudService,
  Effect.gen(function* () {
    const methodologyRepo = yield* MethodologyRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;

    const normalizeValue: AgentStepContextFactCrudService["Type"]["normalizeWorkflowContextValue"] =
      (input) =>
        normalizeWorkflowContextFactValue(
          {
            methodologyRepo,
            lifecycleRepo,
            projectWorkUnitRepo,
            projectFactRepo,
            workUnitFactRepo,
          },
          input,
        );

    return AgentStepContextFactCrudService.of({
      normalizeWorkflowContextValue: normalizeValue,
    });
  }),
);
