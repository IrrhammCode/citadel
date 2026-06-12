import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[--radius-md] text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--border-emerald] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]",
  {
    variants: {
      variant: {
        // Emerald primary (trust/approval actions per design.md — default)
        default:
          "bg-[--brand-primary] text-[--canvas] hover:bg-[--brand-primary-soft] shadow-[--shadow-glow] hover:shadow-[0_0_28px_rgba(16,185,129,0.28)]",
        // Refined secondary (neutral elevated)
        secondary:
          "premium-glass text-[--text-primary] hover:border-[--border-emerald] hover:bg-white/[0.03]",
        // Outline (clean)
        outline:
          "border border-[--border-default] bg-transparent text-[--text-primary] hover:border-[--border-emerald] hover:bg-[--brand-glow]",
        ghost:
          "text-[--text-secondary] hover:bg-white/[0.04] hover:text-[--text-primary]",
        destructive:
          "bg-red-600/90 text-white hover:bg-red-500 border border-red-500/30",
        // Explicit emerald (strong for trust actions)
        emerald:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:shadow-[0_0_32px_rgba(16,185,129,0.3)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-[--radius-sm] px-3.5 text-xs",
        lg: "h-12 rounded-[--radius-md] px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
