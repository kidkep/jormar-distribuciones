import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";

export function SkeletonRows({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-4">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-3.5 w-1/4" />
              <Skeleton className="h-3.5 w-1/5" />
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="ml-auto h-3.5 w-16" />
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export function EmptyTableRow({
  colSpan,
  icon: Icon,
  title,
  description,
}: {
  colSpan: number;
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <EmptyState icon={Icon} title={title} description={description} inline />
      </td>
    </tr>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  inline = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={
        inline
          ? "mx-auto flex w-full max-w-sm flex-col items-center gap-2"
          : "card-premium flex flex-col items-center gap-2 p-10 text-center"
      }
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/10 text-gold-500">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}