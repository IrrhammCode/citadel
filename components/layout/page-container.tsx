import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
}) {
  // design.md: max 1280px (7xl), padding 24px/32px/48px responsive
  const maxWidth = {
    default: "max-w-[1280px]",
    wide: "max-w-[1280px]",
    narrow: "max-w-4xl",
  }[size];

  return (
    <div className={cn("mx-auto w-full px-6 py-8 lg:px-8 lg:py-10", maxWidth, className)}>
      {children}
    </div>
  );
}
