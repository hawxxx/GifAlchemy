"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditor } from "@/hooks/use-editor";
import { createTextOverlay, bakeEffectToKeyframes } from "@/core/application/commands/overlay-commands";
import type { AnimationPresetType, Overlay } from "@/core/domain/project";

interface TemplateLayer {
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color?: string;
  strokeWidth?: number;
  effect?: AnimationPresetType;
}

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  layers: TemplateLayer[];
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "meme",
    name: "Meme Top/Bottom",
    description: "Classic top and bottom caption",
    layers: [
      { content: "TOP TEXT", x: 0.5, y: 0.12, fontSize: 44, color: "#ffffff", strokeWidth: 4 },
      { content: "BOTTOM TEXT", x: 0.5, y: 0.88, fontSize: 44, color: "#ffffff", strokeWidth: 4 },
    ],
  },
  {
    id: "hype",
    name: "Hype Burst",
    description: "Punchy title with animated sticker",
    layers: [
      { content: "LET'S GO", x: 0.5, y: 0.2, fontSize: 56, color: "#facc15", strokeWidth: 3, effect: "bounce" },
      { content: "🔥", x: 0.5, y: 0.5, fontSize: 90, color: "#ffffff", strokeWidth: 0, effect: "pulse" },
      { content: "NEW DROP", x: 0.5, y: 0.8, fontSize: 34, color: "#ffffff", strokeWidth: 2, effect: "flicker" },
    ],
  },
  {
    id: "subtitle",
    name: "Title + Subtitle",
    description: "Clean two-line title card",
    layers: [
      { content: "Main Title", x: 0.5, y: 0.42, fontSize: 52, color: "#ffffff", strokeWidth: 2, effect: "scale-in" },
      { content: "subtitle goes here", x: 0.5, y: 0.58, fontSize: 28, color: "#d4d4d8", strokeWidth: 1, effect: "fade-in" },
    ],
  },
];

export function TemplatesToolPanel() {
  const { state, dispatch } = useEditor();

  const applyTemplate = (template: TemplateDef) => {
    const last = Math.max(0, state.frames.length - 1);
    template.layers.forEach((layer) => {
      let overlay: Overlay = createTextOverlay(state.frames.length, {
        content: layer.content,
        fontSize: layer.fontSize,
        color: layer.color ?? "#ffffff",
        strokeWidth: layer.strokeWidth ?? 2,
      });
      overlay.keyframes = overlay.keyframes.map((k) => ({ ...k, x: layer.x, y: layer.y }));
      if (layer.effect) {
        overlay = bakeEffectToKeyframes(overlay, layer.effect, 0, last);
      }
      dispatch({ type: "ADD_OVERLAY", payload: overlay });
    });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs">Text templates</Label>
      <div className="space-y-2">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => applyTemplate(tpl)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
          >
            <p className="text-sm font-medium">{tpl.name}</p>
            <p className="text-xs text-muted-foreground">{tpl.description}</p>
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-lg"
        onClick={() => applyTemplate(TEMPLATES[2]!)}
      >
        Apply default template
      </Button>
    </div>
  );
}
