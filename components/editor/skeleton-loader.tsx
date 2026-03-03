"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SkeletonLoaderProps {
  message?: string;
  className?: string;
}

export function SkeletonLoader({ message = "Preparing your GIF...", className }: SkeletonLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 border border-border/50 min-h-[280px]",
        className
      )}
    >
      <div className="flex flex-col gap-2 w-full max-w-[320px] px-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
