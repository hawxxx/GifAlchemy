"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

function focusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
    )
  );
}

export function EditorModal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  footer,
}: EditorModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = focusableElements(panel);
    (focusable[0] ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusableElements(panel);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a0a]/90 p-6 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] outline-none backdrop-blur-2xl animate-in zoom-in-95 duration-200",
          className
        )}
      >
        {/* Subtle top gradient glow */}
        <div className="absolute inset-x-0 -top-24 h-48 bg-primary/10 blur-3xl rounded-[100%]" aria-hidden="true" />

        <div className="relative z-10">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-white/90">{title}</h2>
              {description ? <p className="mt-1.5 text-sm text-white/50">{description}</p> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1 
            scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
            {children}
          </div>

          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3 pt-4 border-t border-white/5">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
