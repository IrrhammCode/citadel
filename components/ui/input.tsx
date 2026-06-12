import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[--radius-md] border border-[--border-default] bg-[--canvas-elevated] px-4 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus-visible:border-[--border-emerald] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--border-emerald]/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
