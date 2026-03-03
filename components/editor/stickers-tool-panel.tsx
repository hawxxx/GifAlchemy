"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOverlays } from "@/hooks/use-overlays";

const STICKERS = ["🔥", "✨", "💥", "⭐", "🎉", "✅", "❌", "❤️", "😂", "😎", "🚀", "💡"];

export function StickersToolPanel() {
  const { addOverlay, overlays } = useOverlays();

  const nextPosition = useMemo(() => {
    const idx = overlays.length;
    return {
      x: 0.5 + ((idx % 4) - 1.5) * 0.08,
      y: 0.38 + (Math.floor(idx / 4) % 3) * 0.1,
    };
  }, [overlays.length]);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs mb-2 block">Quick stickers</Label>
        <div className="grid grid-cols-4 gap-2">
          {STICKERS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="h-11 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-xl"
              onClick={() =>
                addOverlay(
                  {
                    content: emoji,
                    fontFamily: "system-ui",
                    fontSize: 56,
                    color: "#ffffff",
                    strokeWidth: 0,
                    strokeColor: "#000000",
                    fontWeight: "normal",
                    fontStyle: "normal",
                  },
                  {
                    x: Math.max(0.08, Math.min(0.92, nextPosition.x)),
                    y: Math.max(0.12, Math.min(0.88, nextPosition.y)),
                  }
                )
              }
              title={`Add ${emoji} sticker`}
              aria-label={`Add ${emoji} sticker`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-lg"
        onClick={() =>
          addOverlay(
            {
              content: "🎯",
              fontSize: 72,
              strokeWidth: 0,
              color: "#ffffff",
            },
            { x: 0.5, y: 0.5 }
          )
        }
      >
        Add centered sticker
      </Button>
    </div>
  );
}
