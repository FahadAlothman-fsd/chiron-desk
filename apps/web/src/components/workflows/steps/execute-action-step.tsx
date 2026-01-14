import { CheckCircle2, ChevronRight, Database, FileText, GitBranch, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ExecuteActionStepProps {
  config: {
    type: "execute-action";
    actions: Array<{
      type: string;
      config: Record<string, unknown>;
    }>;
    executionMode: "sequential" | "parallel";
  };
  result?: unknown;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  onComplete?: (result: unknown) => void;
  onContinue?: () => void; // New: User confirmation callback
}

interface ActionPreview {
  index: number;
  type: string;
  config: Record<string, unknown>;
  description: string;
}

interface PreviewResult {
  preview: boolean;
  actions: ActionPreview[];
}

function getActionIcon(type: string) {
  switch (type) {
    case "file":
      return <FileText className="h-5 w-5" />;
    case "git":
      return <GitBranch className="h-5 w-5" />;
    case "database":
      return <Database className="h-5 w-5" />;
    default:
      return <ChevronRight className="h-5 w-5" />;
  }
}

function getActionColor(type: string) {
  switch (type) {
    case "file":
      return "text-blue-600 dark:text-blue-400";
    case "git":
      return "text-orange-600 dark:text-orange-400";
    case "database":
      return "text-purple-600 dark:text-purple-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export function ExecuteActionStep({
  config,
  result,
  loading,
  error,
  onRetry,
  onComplete,
  onContinue,
}: ExecuteActionStepProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success state when execution completes (but not for preview)
  useEffect(() => {
    const typedResult = result as PreviewResult | undefined;
    if (result && !error && !loading && !typedResult?.preview) {
      setShowSuccess(true);
    }
  }, [result, error, loading]);

  // Preview state - show actions before execution
  const typedResult = result as PreviewResult | undefined;
  if (typedResult?.preview && typedResult.actions) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold text-lg">Ready to Initialize Project</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            The following actions will be performed:
          </p>
          <div className="space-y-2">
            {typedResult.actions.map((action) => (
              <Card key={action.index} className="border-l-4 border-l-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getActionColor(action.type)}`}>
                      {getActionIcon(action.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 font-medium text-sm">
                        Step {action.index + 1}: {action.description}
                      </div>
                      {action.config && Object.keys(action.config).length > 0 && (
                        <div className="mt-2 rounded bg-muted/50 p-2">
                          <pre className="overflow-x-auto text-muted-foreground text-xs">
                            {JSON.stringify(action.config, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onContinue} size="lg" className="min-w-32">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <div className="text-muted-foreground text-sm">Executing...</div>
      </div>
    );
  }

  // Success state - wait for user confirmation
  if (showSuccess && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="text-green-700 text-sm dark:text-green-300">
            Action completed successfully
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onContinue} size="lg" className="min-w-32">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <div>{error}</div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Initial state (should start executing immediately)
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <div className="text-muted-foreground text-sm">Preparing to execute...</div>
    </div>
  );
}
