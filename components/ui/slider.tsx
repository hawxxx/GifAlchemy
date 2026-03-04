"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full border border-[color:var(--border-subtle)] bg-[var(--surface-2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <SliderPrimitive.Range className="absolute h-full bg-[var(--accent-1)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-lg border border-[color:var(--border-strong)] bg-[var(--panel)] shadow-sm shadow-black/35 transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-px hover:border-[color:var(--accent-2)] hover:shadow-md hover:shadow-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
