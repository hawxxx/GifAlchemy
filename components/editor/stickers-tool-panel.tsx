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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Stickers & Emojis</Label>
        </div>
        <div className="flex flex-col gap-2">
           <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stickers..."
            className="h-8 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
            aria-label="Search stickers"
          />
          <Select value={category} onValueChange={(value) => setCategory(value as StickerCategory)}>
            <SelectTrigger className="h-8 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 hover:bg-white/5 hover:border-white/20 transition-all focus:ring-1 focus:ring-primary/20">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-black/80 backdrop-blur-xl">
              <SelectItem value="all" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">All categories</SelectItem>
              <SelectItem value="reaction" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">Reactions</SelectItem>
              <SelectItem value="mood" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">Moods</SelectItem>
              <SelectItem value="shape" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">Shapes</SelectItem>
              <SelectItem value="symbol" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">Symbols</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
         <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tint Color</Label>
           <div className="flex gap-2 items-center">
             <input
              type="color"
              value={tint}
              onChange={(e) => setTint(e.target.value)}
              className="h-6 w-6 rounded border-0 cursor-pointer p-0 bg-transparent"
              aria-label="Sticker tint color"
            />
            <span className="text-[9px] font-mono text-white/40 tracking-wider bg-black/20 px-1 py-0.5 rounded border border-white/5">{tint.toUpperCase()}</span>
           </div>
         </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-1 text-[9px] font-bold tracking-widest text-white/30 uppercase">
          <span>{filtered.length} Results</span>
          <span>★/✓/◆ Tintable</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {filtered.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className="h-10 rounded-md border border-white/5 bg-black/20 text-lg transition-all hover:bg-white/10 hover:border-white/15 hover:scale-105 active:scale-95 shadow-sm"
              onClick={() => addSticker(sticker)}
              title={`Add ${sticker.glyph} (${sticker.pack})`}
              aria-label={`Add ${sticker.glyph} sticker`}
            >
              {sticker.glyph}
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="rounded border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-[11px] font-medium text-white/40">
            No stickers match search.
          </div>
        )}
      </div>
    </div>
  );
}
