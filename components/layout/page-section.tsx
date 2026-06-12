import { cn } from "@/lib/utils";

export function PageSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-6", className)}>
      {(title || description || action) && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-[--text-primary]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-[--text-secondary]">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
