"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOverlays } from "@/hooks/use-overlays";

type StickerCategory = "all" | "reaction" | "mood" | "shape" | "symbol";

interface StickerDef {
  id: string;
  glyph: string;
  pack: string;
  category: Exclude<StickerCategory, "all">;
  keywords: string[];
  colorizable: boolean;
}

const STICKERS: StickerDef[] = [
  { id: "fire", glyph: "🔥", pack: "Reactions", category: "reaction", keywords: ["fire", "hot", "flame"], colorizable: false },
  { id: "sparkles", glyph: "✨", pack: "Reactions", category: "reaction", keywords: ["sparkle", "shine", "magic"], colorizable: false },
  { id: "boom", glyph: "💥", pack: "Reactions", category: "reaction", keywords: ["boom", "burst", "impact"], colorizable: false },
  { id: "party", glyph: "🎉", pack: "Reactions", category: "reaction", keywords: ["party", "celebrate", "confetti"], colorizable: false },
  { id: "rocket", glyph: "🚀", pack: "Reactions", category: "reaction", keywords: ["rocket", "launch", "hype"], colorizable: false },
  { id: "cool", glyph: "😎", pack: "Moods", category: "mood", keywords: ["cool", "sunglasses", "vibe"], colorizable: false },
  { id: "laugh", glyph: "😂", pack: "Moods", category: "mood", keywords: ["laugh", "funny", "lol"], colorizable: false },
  { id: "heart-emoji", glyph: "❤️", pack: "Moods", category: "mood", keywords: ["heart", "love", "like"], colorizable: false },
  { id: "star-solid", glyph: "★", pack: "Shapes", category: "shape", keywords: ["star", "badge", "rating"], colorizable: true },
  { id: "heart-solid", glyph: "♥", pack: "Shapes", category: "shape", keywords: ["heart", "love", "solid"], colorizable: true },
  { id: "diamond", glyph: "◆", pack: "Shapes", category: "shape", keywords: ["diamond", "shape", "geometric"], colorizable: true },
  { id: "circle", glyph: "●", pack: "Shapes", category: "shape", keywords: ["dot", "circle", "marker"], colorizable: true },
  { id: "check", glyph: "✓", pack: "Symbols", category: "symbol", keywords: ["check", "approved", "done"], colorizable: true },
  { id: "cross", glyph: "✕", pack: "Symbols", category: "symbol", keywords: ["cross", "cancel", "no"], colorizable: true },
  { id: "arrow-right", glyph: "➜", pack: "Symbols", category: "symbol", keywords: ["arrow", "point", "next"], colorizable: true },
  { id: "warning", glyph: "⚠", pack: "Symbols", category: "symbol", keywords: ["warning", "alert", "notice"], colorizable: true },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function StickersToolPanel() {
  const { addOverlay, overlays } = useOverlays();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StickerCategory>("all");
  const [tint, setTint] = useState("#ffffff");

  const nextPosition = useMemo(() => {
    const idx = overlays.length;
    return {
      x: 0.5 + ((idx % 4) - 1.5) * 0.08,
      y: 0.38 + (Math.floor(idx / 4) % 3) * 0.1,
    };
  }, [overlays.length]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return STICKERS.filter((sticker) => {
      if (category !== "all" && sticker.category !== category) return false;
      if (!term) return true;
      const haystack = `${sticker.glyph} ${sticker.pack} ${sticker.keywords.join(" ")}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [query, category]);

  const addSticker = (sticker: StickerDef) => {
    addOverlay(
      {
        content: sticker.glyph,
        fontFamily: "system-ui",
        fontSize: 60,
        color: sticker.colorizable ? tint : "#ffffff",
        strokeWidth: 0,
        strokeColor: "#000000",
        fontWeight: "normal",
        fontStyle: "normal",
      },
      {
        x: clamp(nextPosition.x, 0.08, 0.92),
        y: clamp(nextPosition.y, 0.12, 0.88),
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Sticker packs</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stickers"
          className="h-8"
          aria-label="Search stickers"
        />
        <Select value={category} onValueChange={(value) => setCategory(value as StickerCategory)}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="reaction">Reactions</SelectItem>
            <SelectItem value="mood">Moods</SelectItem>
            <SelectItem value="shape">Shapes</SelectItem>
            <SelectItem value="symbol">Symbols</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Color (for supported stickers)</Label>
          <input
            type="color"
            value={tint}
            onChange={(e) => setTint(e.target.value)}
            className="h-7 w-10 rounded border border-border bg-background p-0.5"
            aria-label="Sticker tint color"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{filtered.length} results</span>
          <span>★/✓/◆ are tintable</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {filtered.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className="h-11 rounded-lg border border-border bg-background text-xl transition-colors hover:bg-accent"
              onClick={() => addSticker(sticker)}
              title={`Add ${sticker.glyph} (${sticker.pack})`}
              aria-label={`Add ${sticker.glyph} sticker`}
            >
              {sticker.glyph}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              No stickers match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
