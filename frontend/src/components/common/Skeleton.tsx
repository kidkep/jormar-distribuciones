import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shrink-0 animate-pulse rounded-md bg-gray-200/70", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("h-3 rounded bg-gray-200/70", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, rows = 3 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("card-premium animate-pulse p-5", className)}>
      <div className="mb-4 h-8 w-full rounded-lg bg-gray-200/70" />
      <SkeletonText lines={rows} />
    </div>
  );
}

export function SkeletonCards({
  count = 3,
  className,
  cols = "md:grid-cols-3",
}: {
  count?: number;
  className?: string;
  cols?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", cols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}