import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[color:var(--control-border)] text-sm font-medium shadow-[var(--control-shadow-rest)] transition-[color,background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:border-[color:var(--control-border-active)] focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-[color:rgba(112,152,239,0.42)] bg-primary text-primary-foreground hover:-translate-y-px hover:border-[color:rgba(135,167,244,0.52)] hover:bg-[var(--accent-2)] hover:shadow-[var(--control-shadow-hover)] active:translate-y-0",
        destructive: "border-[color:rgba(216,104,104,0.46)] bg-destructive text-destructive-foreground hover:-translate-y-px hover:border-[color:rgba(216,104,104,0.62)] hover:bg-[#e17676] hover:shadow-[var(--control-shadow-hover)] active:translate-y-0",
        outline: "bg-[var(--control-bg)] text-foreground hover:-translate-y-px hover:border-[color:var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] hover:shadow-[var(--control-shadow-hover)] active:translate-y-0",
        secondary: "bg-secondary text-secondary-foreground hover:-translate-y-px hover:border-[color:var(--control-border-hover)] hover:bg-[var(--panel)] hover:shadow-[var(--control-shadow-hover)] active:translate-y-0",
        ghost: "border-transparent bg-transparent text-muted-foreground shadow-none hover:border-[color:var(--control-border)] hover:bg-[var(--control-bg)] hover:text-foreground",
        link: "border-transparent bg-transparent text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
