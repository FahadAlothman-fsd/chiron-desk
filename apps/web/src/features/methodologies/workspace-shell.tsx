import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type ShellSegment = {
  label: string;
  to?:
    | "/methodologies"
    | "/methodologies/$methodologyId"
    | "/methodologies/$methodologyId/versions"
    | "/methodologies/$methodologyId/versions/$versionId";
  params?: Record<string, string>;
};

type MethodologyWorkspaceShellProps = {
  title: string;
  stateLabel?: string;
  segments: readonly ShellSegment[];
  children: ReactNode;
};

export function MethodologyWorkspaceShell({
  title,
  stateLabel,
  segments,
  children,
}: MethodologyWorkspaceShellProps) {
  return (
    <main className="space-y-3">
      <header className="border border-border/80 bg-[#07090b] px-3 py-3 md:px-4">
        <div className="flex items-center gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;

                return (
                  <Fragment key={`${segment.label}-${index}`}>
                    <BreadcrumbItem>
                      {segment.to ? (
                        <BreadcrumbLink
                          render={
                            <Link to={segment.to} params={segment.params}>
                              {segment.label}
                            </Link>
                          }
                        />
                      ) : (
                        <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold uppercase tracking-[0.12em]" tabIndex={-1}>
            {title}
          </h1>
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            State: {stateLabel ?? "normal"}
          </p>
        </div>
      </header>

      <div className="space-y-3">{children}</div>
    </main>
  );
}
