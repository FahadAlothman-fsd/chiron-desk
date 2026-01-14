import type { ReactNode } from "react";

/**
 * Shared types for workflow stepper components
 */

export type WorkflowStepperType = "wizard" | "workbench" | "progress" | "kanban";

export type StepStatus = "pending" | "in-progress" | "completed" | "error";

/**
 * Step definition with metadata
 */
export interface WorkflowStepDefinition {
  id: string;
  number: number;
  name: string;
  goal?: string;
  status: StepStatus;
  icon?: ReactNode;
  requiresUserInput?: boolean;
}

/**
 * Base props for all stepper variants
 */
export interface WorkflowStepperBaseProps {
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStepDefinition[];
  onStepClick?: (stepNumber: number) => void;
}

/**
 * Props passed to step content components
 */
export interface StepContentProps {
  step: WorkflowStepDefinition;
  onNext?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  error?: string;
  canContinue?: boolean;
}

/**
 * Factory function to get stepper component by type
 * (Future implementation when we have multiple stepper types)
 */
export function getStepperComponent(type: WorkflowStepperType) {
  switch (type) {
    case "wizard":
      // Will import dynamically to avoid circular deps
      return null; // Placeholder for Story 1.4
    case "workbench":
    case "progress":
    case "kanban":
      throw new Error(`Stepper type ${type} not implemented yet (Epic 2+)`);
    default:
      throw new Error(`Unknown stepper type: ${type}`);
  }
}
