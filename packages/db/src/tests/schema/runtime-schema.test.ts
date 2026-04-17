import { describe, expect, it } from "vitest";

import { projects } from "../../schema/project";
import {
  artifactSnapshotFiles,
  projectArtifactSnapshots,
  projectFactInstances,
  projectWorkUnits,
  transitionExecutions,
  workflowExecutions,
  workUnitFactInstances,
} from "../../schema/runtime";

describe("runtime schema lock", () => {
  it("extends projects with project_root_path runtime anchor", () => {
    expect(projects.projectRootPath).toBeDefined();
  });

  it("locks runtime table inventory for l1/l2 slice", () => {
    expect(projectWorkUnits).toBeDefined();
    expect(transitionExecutions).toBeDefined();
    expect(workflowExecutions).toBeDefined();
    expect(projectFactInstances).toBeDefined();
    expect(workUnitFactInstances).toBeDefined();
    expect(projectArtifactSnapshots).toBeDefined();
    expect(artifactSnapshotFiles).toBeDefined();

    expect(
      ({ stepExecutions: undefined } as unknown as Record<string, unknown>).stepExecutions,
    ).toBeUndefined();
  });

  it("locks project_work_units fields", () => {
    expect(projectWorkUnits.id).toBeDefined();
    expect(projectWorkUnits.projectId).toBeDefined();
    expect(projectWorkUnits.workUnitTypeId).toBeDefined();
    expect(projectWorkUnits.currentStateId).toBeDefined();
    expect(projectWorkUnits.activeTransitionExecutionId).toBeDefined();
    expect(projectWorkUnits.createdAt).toBeDefined();
    expect(projectWorkUnits.updatedAt).toBeDefined();
  });

  it("locks transition/workflow execution lineage fields", () => {
    expect(transitionExecutions.projectWorkUnitId).toBeDefined();
    expect(transitionExecutions.transitionId).toBeDefined();
    expect(transitionExecutions.status).toBeDefined();
    expect(transitionExecutions.primaryWorkflowExecutionId).toBeDefined();
    expect(transitionExecutions.supersededByTransitionExecutionId).toBeDefined();
    expect(transitionExecutions.startedAt).toBeDefined();
    expect(transitionExecutions.completedAt).toBeDefined();
    expect(transitionExecutions.supersededAt).toBeDefined();

    expect(workflowExecutions.transitionExecutionId).toBeDefined();
    expect(workflowExecutions.workflowId).toBeDefined();
    expect(workflowExecutions.workflowRole).toBeDefined();
    expect(workflowExecutions.status).toBeDefined();
    expect(workflowExecutions.supersededByWorkflowExecutionId).toBeDefined();
    expect(workflowExecutions.startedAt).toBeDefined();
    expect(workflowExecutions.completedAt).toBeDefined();
    expect(workflowExecutions.supersededAt).toBeDefined();
  });

  it("locks immutable fact lineage fields", () => {
    expect(projectFactInstances.projectId).toBeDefined();
    expect(projectFactInstances.factDefinitionId).toBeDefined();
    expect(projectFactInstances.valueJson).toBeDefined();
    expect(projectFactInstances.status).toBeDefined();
    expect(projectFactInstances.supersededByFactInstanceId).toBeDefined();
    expect(projectFactInstances.producedByTransitionExecutionId).toBeDefined();
    expect(projectFactInstances.producedByWorkflowExecutionId).toBeDefined();
    expect(projectFactInstances.authoredByUserId).toBeDefined();
    expect(projectFactInstances.createdAt).toBeDefined();

    expect(workUnitFactInstances.projectWorkUnitId).toBeDefined();
    expect(workUnitFactInstances.factDefinitionId).toBeDefined();
    expect(workUnitFactInstances.valueJson).toBeDefined();
    expect(workUnitFactInstances.referencedProjectWorkUnitId).toBeDefined();
    expect(workUnitFactInstances.status).toBeDefined();
    expect(workUnitFactInstances.supersededByFactInstanceId).toBeDefined();
    expect(workUnitFactInstances.producedByTransitionExecutionId).toBeDefined();
    expect(workUnitFactInstances.producedByWorkflowExecutionId).toBeDefined();
    expect(workUnitFactInstances.authoredByUserId).toBeDefined();
    expect(workUnitFactInstances.createdAt).toBeDefined();
  });

  it("locks artifact snapshot parent/member fields", () => {
    expect(projectArtifactSnapshots.projectWorkUnitId).toBeDefined();
    expect(projectArtifactSnapshots.slotDefinitionId).toBeDefined();
    expect(projectArtifactSnapshots.recordedByTransitionExecutionId).toBeDefined();
    expect(projectArtifactSnapshots.recordedByWorkflowExecutionId).toBeDefined();
    expect(projectArtifactSnapshots.recordedByUserId).toBeDefined();
    expect(projectArtifactSnapshots.supersededByProjectArtifactSnapshotId).toBeDefined();
    expect(projectArtifactSnapshots.createdAt).toBeDefined();

    expect(artifactSnapshotFiles.artifactSnapshotId).toBeDefined();
    expect(artifactSnapshotFiles.filePath).toBeDefined();
    expect(artifactSnapshotFiles.memberStatus).toBeDefined();
    expect(artifactSnapshotFiles.gitCommitHash).toBeDefined();
    expect(artifactSnapshotFiles.gitBlobHash).toBeDefined();
    expect(artifactSnapshotFiles.gitCommitTitle).toBeDefined();
    expect(artifactSnapshotFiles.gitCommitBody).toBeDefined();
  });
});
