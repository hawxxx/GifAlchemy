"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Upload, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FontOption {
  id: string;
  label: string;
  category: "system" | "google" | "uploaded";
}

interface Props {
  value: string;
  onChange: (font: string) => void;
  fonts: FontOption[];
  disabled?: boolean;
}

const STORAGE_KEY = "gifalchemy:custom-fonts";

interface StoredFont {
  name: string;
  dataUrl: string;
}

function loadStoredFonts(): StoredFont[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredFont[]) : [];
  } catch {
    return [];
  }
}

async function registerFontFace(name: string, source: string | ArrayBuffer): Promise<void> {
  if (document.fonts.check(`12px "${name}"`)) return;
  const fontFace = new FontFace(name, typeof source === "string" ? `url(${source})` : source);
  await fontFace.load();
  document.fonts.add(fontFace);
}

export function FontPicker({ value, onChange, fonts, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploadedFonts, setUploadedFonts] = useState<FontOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore persisted custom fonts on mount
  useEffect(() => {
    const stored = loadStoredFonts();
    if (stored.length === 0) return;
    const restored: FontOption[] = [];
    stored.forEach(({ name, dataUrl }) => {
      registerFontFace(name, dataUrl).catch(() => null);
      restored.push({ id: `"${name}", sans-serif`, label: name, category: "uploaded" });
    });
    setUploadedFonts(restored);
  }, []);

  // Close on outside click — must check both the trigger container and the portal dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Recalculate dropdown position on window resize while open
  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  const allFonts = [...fonts, ...uploadedFonts];

  const filtered = query.trim()
    ? allFonts.filter((f) => f.label.toLowerCase().includes(query.toLowerCase()))
    : allFonts;

  const grouped = {
    system: filtered.filter((f) => f.category === "system"),
    google: filtered.filter((f) => f.category === "google"),
    uploaded: filtered.filter((f) => f.category === "uploaded"),
  };

  const currentFont = allFonts.find((f) => f.id === value);

  const handleTriggerClick = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((v) => !v);
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const name = file.name.replace(/\.[^.]+$/, "");
        const buffer = await file.arrayBuffer();
        const fontFace = new FontFace(name, buffer);
        await fontFace.load();
        document.fonts.add(fontFace);

        // Persist as data URL in localStorage
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const stored = loadStoredFonts();
        const updated = [...stored.filter((f) => f.name !== name), { name, dataUrl }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        const newOption: FontOption = {
          id: `"${name}", sans-serif`,
          label: name,
          category: "uploaded",
        };
        setUploadedFonts((prev) => [...prev.filter((f) => f.label !== name), newOption]);
        onChange(newOption.id);
      } catch (err) {
        console.error("Font upload failed:", err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onChange]
  );

  const dropdownContent = (
    <div
      ref={dropdownRef}
      role="listbox"
      className="fixed z-[500] flex max-h-[340px] flex-col rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
      style={dropdownStyle}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fonts…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Font list */}
      <div className="flex-1 overflow-y-auto py-1">
        {(["system", "google", "uploaded"] as const).map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          const catLabel =
            cat === "system" ? "System Fonts" : cat === "google" ? "Google Fonts" : "Uploaded Fonts";
          return (
            <div key={cat}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {catLabel}
              </p>
              {items.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="option"
                  aria-selected={value === f.id}
                  onClick={() => {
                    onChange(f.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === f.id && "bg-accent/60 text-accent-foreground"
                  )}
                >
                  <span
                    className="flex h-7 w-8 shrink-0 items-center justify-center rounded bg-muted text-sm font-semibold"
                    style={{ fontFamily: f.id }}
                  >
                    Aa
                  </span>
                  <span className="flex-1 truncate text-sm" style={{ fontFamily: f.id }}>
                    {f.label}
                  </span>
                  {value === f.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No fonts match</p>
        )}
      </div>

      {/* Upload section */}
      <div className="border-t border-border p-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="sr-only"
          onChange={handleFileUpload}
          aria-label="Upload font file"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground",
            "transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground",
            uploading && "cursor-wait opacity-60"
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Loading font…" : "Upload font (.ttf / .otf / .woff)"}
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background transition-colors",
          "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          disabled && "cursor-not-allowed opacity-50",
          open && "border-ring ring-2 ring-ring/30"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="flex h-6 w-7 shrink-0 items-center justify-center rounded bg-muted/60 text-xs font-semibold"
            style={{ fontFamily: value }}
          >
            Aa
          </span>
          <span className="truncate text-sm" style={{ fontFamily: value }}>
            {currentFont?.label ?? value}
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Dropdown rendered via portal into document.body to avoid overflow clipping */}
      {open && typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}
