import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[color:var(--control-border)] bg-[var(--control-bg)] px-3 py-1 text-sm text-foreground shadow-[var(--control-shadow-rest)] transition-[background-color,border-color,box-shadow,color] duration-[var(--duration-fast)] ease-[var(--ease-out)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-[color:var(--control-border-hover)] hover:bg-[var(--control-bg-hover)] hover:shadow-[var(--control-shadow-hover)] focus-visible:border-[color:var(--control-border-active)] focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
