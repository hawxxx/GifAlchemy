"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FontOption {
  id: string;
  label: string;
  category: "system" | "google" | "uploaded" | "custom";
}

export const FONTS: FontOption[] = [
  // System
  { id: "Inter, sans-serif", label: "Inter", category: "system" },
  { id: "Impact, sans-serif", label: "Impact", category: "system" },
  { id: "Arial, sans-serif", label: "Arial", category: "system" },
  { id: "'Courier New', monospace", label: "Courier New", category: "system" },
  // Textured / Unique (via Google Fonts)
  { id: "'Creepster', cursive", label: "Creepster", category: "google" },
  { id: "'Nosifer', cursive", label: "Nosifer", category: "google" },
  { id: "'Monoton', cursive", label: "Monoton", category: "google" },
  { id: "'Bungee Shade', cursive", label: "Bungee Shade", category: "google" },
  { id: "'Special Elite', cursive", label: "Special Elite", category: "google" },
  { id: "'VT323', monospace", label: "VT323", category: "google" },
  // Curated Google
  { id: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans", category: "google" },
  { id: "'Rock Salt', cursive", label: "Rock Salt", category: "google" },
  { id: "'Permanent Marker', cursive", label: "Permanent Marker", category: "google" },
  { id: "'Bebas Neue', sans-serif", label: "Bebas Neue", category: "google" },
  { id: "'Pacifico', cursive", label: "Pacifico", category: "google" },
  { id: "'Press Start 2P', system-ui", label: "Press Start 2P", category: "google" },
  { id: "'Cinzel', serif", label: "Cinzel", category: "google" },
  { id: "'Righteous', sans-serif", label: "Righteous", category: "google" },
];

interface Props {
  value: string;
  onChange: (font: string) => void;
  fonts?: FontOption[];

  disabled?: boolean;
  className?: string;
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

export function FontPicker({ value, onChange, fonts = FONTS, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploadedFonts, setUploadedFonts] = useState<FontOption[]>([]);
  const [uploading, setUploading] = useState(false);
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

  const allFonts = useMemo(() => [...fonts, ...uploadedFonts], [fonts, uploadedFonts]);

  const filtered = useMemo(
    () =>
      query.trim()
        ? allFonts.filter((f) => f.label.toLowerCase().includes(query.toLowerCase()))
        : allFonts,
    [allFonts, query]
  );

  const grouped = {
    system: filtered.filter((f) => f.category === "system"),
    custom: filtered.filter((f) => f.category === "custom"),
    google: filtered.filter((f) => f.category === "google"),
    uploaded: filtered.filter((f) => f.category === "uploaded"),
  };

  const currentFont = allFonts.find((f) => f.id === value);

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background transition-colors",
              "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              disabled && "cursor-not-allowed opacity-50",
              open && "border-ring ring-2 ring-ring/30",
              className
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="flex min-w-0 items-center gap-2">
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
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px] rounded-xl border-white/10 bg-[rgba(18,23,31,0.96)] p-0 shadow-[0_24px_50px_rgba(0,0,0,0.45)]"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="border-b border-white/8 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/48">
              <Search className="h-3.5 w-3.5" />
              Browse fonts
            </div>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts..."
              className="h-9 border-white/10 bg-black/20 text-white placeholder:text-white/30"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto py-2">
            {(["system", "custom", "google", "uploaded"] as const).map((cat) => {
              const items = grouped[cat];
              if (items.length === 0) return null;
              const catLabel =
                cat === "system"
                  ? "System fonts"
                  : cat === "custom"
                  ? "Premium custom"
                  : cat === "google"
                  ? "Curated fonts"
                  : "Uploaded fonts";
              return (
                <div key={cat}>
                  <DropdownMenuLabel className="px-3 py-1 text-[10px] tracking-[0.16em] text-white/42">
                    {catLabel}
                  </DropdownMenuLabel>
                  <div className="px-1">
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
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          "hover:bg-white/[0.06]",
                          value === f.id && "bg-primary/12 text-white"
                        )}
                      >
                        <span
                          className="flex h-8 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-white/[0.04] text-sm font-semibold"
                          style={{ fontFamily: f.id }}
                        >
                          Aa
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white/92" style={{ fontFamily: f.id }}>
                            {f.label}
                          </span>
                          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/38">
                            {f.category}
                          </span>
                        </span>
                        {value === f.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No fonts match</p>
            )}
          </div>

          <DropdownMenuSeparator className="mx-0 my-0 bg-white/8" />
          <div className="p-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              className="sr-only"
              onChange={handleFileUpload}
              aria-label="Upload font file"
            />
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-full justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.025] text-xs text-white/72 hover:bg-white/[0.06] hover:text-white"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Loading font..." : "Upload font (.ttf / .otf / .woff)"}
            </Button>
          </div>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
