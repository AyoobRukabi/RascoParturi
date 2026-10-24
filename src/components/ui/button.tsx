import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-display font-semibold uppercase tracking-[0.12em] transition-[background-color,border-color,color,transform] duration-200 disabled:pointer-events-none disabled:opacity-40 cursor-pointer active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg hover:bg-brand-hover",
        light: "bg-fg text-bg hover:bg-white",
        outline: "border border-line-strong bg-transparent text-fg hover:border-fg",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        danger: "border border-danger/50 bg-transparent text-danger hover:bg-danger/10",
      },
      size: { sm: "h-9 px-4 text-[0.95rem]", md: "h-12 px-6 text-[1.05rem]", lg: "h-14 px-9 text-[1.2rem]" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
export { buttonVariants };
