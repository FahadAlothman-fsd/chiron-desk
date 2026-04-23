import type { ReactNode } from "react";
import { RefreshCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RouteErrorCardProps = {
  readonly title?: string;
  readonly description?: string;
  readonly detail: string;
  readonly actions?: ReactNode;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
};

export function RouteErrorCard(props: RouteErrorCardProps) {
  return (
    <Card frame="cut-heavy" tone="runtime" corner="white">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="border border-destructive/60 bg-destructive/10 p-2 text-destructive">
            <TriangleAlertIcon className="size-4" />
          </div>
          <div className="grid gap-1">
            <CardTitle>{props.title ?? "Something went wrong"}</CardTitle>
            <CardDescription>
              {props.description ??
                "This screen hit an error. Use one of the links below to recover without relying on browser history."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {props.detail}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t">
        {props.actions}
        {props.onRetry ? (
          <Button type="button" variant="outline" onClick={props.onRetry}>
            <RefreshCcwIcon className="size-3.5" />
            {props.retryLabel ?? "Try again"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
