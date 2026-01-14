import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BorderAccent } from "@/components/ui/border-accent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkflowStepDefinition } from "../../types";

/**
 * WizardStepContainer - Animated step wrapper with navigation
 *
 * Features:
 * - Framer Motion slide animations (slide left/right based on direction)
 * - AnimatePresence for smooth transitions
 * - BorderAccent integration for step icon display
 * - Navigation buttons: "← Back" and "Continue →"
 * - Loading state: Spinner + "Executing..." text
 * - Error state: Red alert with message + "Retry" button
 */

export interface WizardStepContainerProps {
  step: WorkflowStepDefinition;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  onRetry?: () => void;
  isLoading?: boolean;
  error?: string;
  canContinue?: boolean;
  direction?: "forward" | "backward";
  className?: string;
}

const slideVariants = {
  enterForward: {
    x: 100,
    opacity: 0,
  },
  enterBackward: {
    x: -100,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exitForward: {
    x: -100,
    opacity: 0,
  },
  exitBackward: {
    x: 100,
    opacity: 0,
  },
};

export function WizardStepContainer({
  step,
  children,
  onNext,
  onBack,
  onRetry,
  isLoading = false,
  error,
  canContinue = true,
  direction = "forward",
  className,
}: WizardStepContainerProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step.id}
        custom={direction}
        variants={slideVariants}
        initial={direction === "forward" ? "enterForward" : "enterBackward"}
        animate="center"
        exit={direction === "forward" ? "exitForward" : "exitBackward"}
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className={cn("w-full space-y-6", className)}
      >
        {/* Step icon with BorderAccent */}
        {step.icon && (
          <BorderAccent
            className="inline-flex h-16 w-16 items-center justify-center border border-border bg-background"
            corners={["tl", "br"]}
          >
            {step.icon}
          </BorderAccent>
        )}

        {/* Step title */}
        <div>
          <h2 className="font-semibold text-2xl">{step.name}</h2>
          {step.goal && <p className="mt-1 text-muted-foreground">{step.goal}</p>}
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step content */}
        <div className="min-h-[200px]">{children}</div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Executing step...</span>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {onBack && (
              <Button variant="outline" onClick={onBack} disabled={isLoading}>
                ← Back
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {error && onRetry && (
              <Button variant="outline" onClick={onRetry} disabled={isLoading}>
                Retry
              </Button>
            )}

            {onNext && (
              <Button onClick={onNext} disabled={!canContinue || isLoading}>
                Continue →
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
