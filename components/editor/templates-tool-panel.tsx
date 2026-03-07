"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditor } from "@/hooks/use-editor";
import { createTextOverlay, bakeEffectToKeyframes } from "@/core/application/commands/overlay-commands";
import type { AnimationPresetType, Overlay, SavedTemplate, SavedTemplateLayer } from "@/core/domain/project";

const CUSTOM_TEMPLATES_STORAGE_KEY = "gifalchemy.custom-templates.v1";

type TemplateScope = "all" | "built-in" | "custom";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toTextAnchor(align?: "left" | "center" | "right"): "start" | "middle" | "end" {
  if (align === "left") return "start";
  if (align === "right") return "end";
  return "middle";
}

function templatePreviewDataUrl(name: string, layers: SavedTemplateLayer[]): string {
  const width = 240;
  const height = 132;
  const lines = layers.slice(0, 3).map((layer) => {
    const x = Math.round(layer.x * width);
    const y = Math.round(layer.y * height);
    const size = Math.max(10, Math.min(34, Math.round(layer.fontSize * 0.28)));
    const text = escapeXml(layer.content.slice(0, 20));
    const fill = layer.color ?? "#ffffff";
    const strokeColor = layer.strokeColor ?? "#000000";
    const strokeWidth = layer.strokeWidth ? Math.min(2, layer.strokeWidth * 0.4) : 0;
    const anchor = toTextAnchor(layer.textAlign);
    return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-family="${escapeXml(layer.fontFamily ?? "system-ui")}" text-anchor="${anchor}" dominant-baseline="middle" ${strokeWidth > 0 ? `stroke="${strokeColor}" stroke-width="${strokeWidth}"` : ""}>${text}</text>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" rx="12" />
  <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="#ffffff22" rx="8" />
  ${lines.join("\n")}
  <text x="12" y="${height - 10}" fill="#e5e7eb" opacity="0.75" font-size="10" font-family="system-ui">${escapeXml(name)}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function interpolateLayerPosition(overlay: Overlay, frameIndex: number): { x: number; y: number } {
  const sorted = [...overlay.keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
  if (sorted.length === 0) return { x: 0.5, y: 0.5 };
  if (frameIndex <= sorted[0].frameIndex) return { x: sorted[0].x, y: sorted[0].y };

  const last = sorted[sorted.length - 1];
  if (!last || frameIndex >= last.frameIndex) {
    return { x: last?.x ?? 0.5, y: last?.y ?? 0.5 };
  }

  const next = sorted.find((keyframe) => keyframe.frameIndex >= frameIndex) ?? last;
  const prev = [...sorted].reverse().find((keyframe) => keyframe.frameIndex <= frameIndex) ?? sorted[0];
  const span = Math.max(1, next.frameIndex - prev.frameIndex);
  const t = clamp01((frameIndex - prev.frameIndex) / span);
  return {
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
  };
}

const BUILTIN_TEMPLATES: SavedTemplate[] = [
  {
    id: "builtin-meme",
    name: "Meme Top/Bottom",
    description: "Classic top and bottom caption",
    createdAt: 0,
    updatedAt: 0,
    layers: [
      {
        content: "TOP TEXT",
        x: 0.5,
        y: 0.12,
        fontSize: 44,
        color: "#ffffff",
        strokeWidth: 4,
        strokeColor: "#000000",
      },
      {
        content: "BOTTOM TEXT",
        x: 0.5,
        y: 0.88,
        fontSize: 44,
        color: "#ffffff",
        strokeWidth: 4,
        strokeColor: "#000000",
      },
    ],
  },
  {
    id: "builtin-hype",
    name: "Hype Burst",
    description: "Punchy title with animated sticker",
    createdAt: 0,
    updatedAt: 0,
    layers: [
      {
        content: "LET'S GO",
        x: 0.5,
        y: 0.2,
        fontSize: 56,
        color: "#facc15",
        strokeWidth: 3,
        strokeColor: "#000000",
        effect: "bounce",
      },
      {
        content: "🔥",
        x: 0.5,
        y: 0.5,
        fontSize: 90,
        color: "#ffffff",
        strokeWidth: 0,
        strokeColor: "#000000",
        effect: "pulse",
      },
      {
        content: "NEW DROP",
        x: 0.5,
        y: 0.8,
        fontSize: 34,
        color: "#ffffff",
        strokeWidth: 2,
        strokeColor: "#000000",
        effect: "flicker",
      },
    ],
  },
  {
    id: "builtin-subtitle",
    name: "Title + Subtitle",
    description: "Clean two-line title card",
    createdAt: 0,
    updatedAt: 0,
    layers: [
      {
        content: "Main Title",
        x: 0.5,
        y: 0.42,
        fontSize: 52,
        color: "#ffffff",
        strokeWidth: 2,
        strokeColor: "#000000",
        effect: "scale-in",
      },
      {
        content: "subtitle goes here",
        x: 0.5,
        y: 0.58,
        fontSize: 28,
        color: "#d4d4d8",
        strokeWidth: 1,
        strokeColor: "#000000",
        effect: "fade-in",
      },
    ],
  },
].map((template) => ({
  ...template,
  previewDataUrl: templatePreviewDataUrl(template.name, template.layers),
}));

export function TemplatesToolPanel() {
  const {
    state,
    dispatch,
    projectSnapshots,
    createProjectSnapshot,
    restoreProjectSnapshot,
    deleteProjectSnapshot,
  } = useEditor();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TemplateScope>("all");
  const [templateName, setTemplateName] = useState("");
  const [snapshotName, setSnapshotName] = useState("");
  const [customTemplates, setCustomTemplates] = useState<SavedTemplate[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedTemplate[];
      if (Array.isArray(parsed)) {
        setCustomTemplates(parsed.filter((template) => Array.isArray(template.layers)));
      }
    } catch {
      setCustomTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  const templates = useMemo(() => {
    const merged = [
      ...BUILTIN_TEMPLATES.map((template) => ({ ...template, source: "built-in" as const })),
      ...customTemplates.map((template) => ({ ...template, source: "custom" as const })),
    ];
    const q = query.trim().toLowerCase();
    return merged.filter((template) => {
      if (scope !== "all" && template.source !== scope) return false;
      if (!q) return true;
      const haystack = `${template.name} ${template.description ?? ""} ${template.layers
        .map((layer) => layer.content)
        .join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, scope, customTemplates]);

  const applyTemplate = (template: SavedTemplate) => {
    const lastFrame = Math.max(0, state.frames.length - 1);
    template.layers.forEach((layer) => {
      const effect = layer.effect as AnimationPresetType | undefined;
      let overlay: Overlay = createTextOverlay(state.frames.length, {
        content: layer.content,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        color: layer.color ?? "#ffffff",
        textAlign: layer.textAlign,
        strokeWidth: layer.strokeWidth ?? 2,
        strokeColor: layer.strokeColor ?? "#000000",
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
      });
      overlay.keyframes = overlay.keyframes.map((keyframe) => ({
        ...keyframe,
        x: clamp01(layer.x),
        y: clamp01(layer.y),
      }));
      if (effect) {
        overlay = bakeEffectToKeyframes(overlay, effect, 0, lastFrame);
      }
      dispatch({ type: "ADD_OVERLAY", payload: overlay });
    });
  };

  const saveCurrentAsTemplate = () => {
    if (state.overlays.length === 0) return;
    const now = Date.now();
    const name = templateName.trim() || `Custom ${customTemplates.length + 1}`;
    const layers: SavedTemplateLayer[] = state.overlays.map((overlay) => {
      const pos = interpolateLayerPosition(overlay, state.currentFrameIndex);
      return {
        content: overlay.content,
        x: clamp01(pos.x),
        y: clamp01(pos.y),
        fontFamily: overlay.fontFamily,
        fontWeight: overlay.fontWeight,
        fontStyle: overlay.fontStyle,
        textAlign: overlay.textAlign,
        fontSize: overlay.fontSize,
        color: overlay.color,
        strokeWidth: overlay.strokeWidth,
        strokeColor: overlay.strokeColor,
        effect: overlay.effects[0]?.type,
      };
    });

    const savedTemplate: SavedTemplate = {
      id: `tpl_custom_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: `${layers.length} layer${layers.length === 1 ? "" : "s"}`,
      createdAt: now,
      updatedAt: now,
      previewDataUrl: templatePreviewDataUrl(name, layers),
      layers,
    };

    setCustomTemplates((prev) => [savedTemplate, ...prev].slice(0, 30));
    setTemplateName("");
  };

  const createRestorePoint = () => {
    createProjectSnapshot(snapshotName.trim());
    setSnapshotName("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">Template browser</Label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates"
          className="h-8 rounded-lg border-white/10 bg-black/20 text-[11px] focus-visible:ring-primary/40 transition-colors"
          aria-label="Search templates"
        />
        <Select value={scope} onValueChange={(value) => setScope(value as TemplateScope)}>
          <SelectTrigger className="h-8 rounded-lg border-white/10 bg-black/20 text-[11px] hover:bg-white/5 transition-colors">
            <SelectValue placeholder="Template source" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-black/60 backdrop-blur-xl">
            <SelectItem value="all" className="text-[11px]">All templates</SelectItem>
            <SelectItem value="built-in" className="text-[11px]">Built-in</SelectItem>
            <SelectItem value="custom" className="text-[11px]">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="w-full rounded-xl border border-white/8 bg-black/20 p-2.5 text-left transition-all hover:bg-white/10 hover:border-white/15 hover:-translate-y-0.5"
            >
              <div className="mb-2.5 overflow-hidden rounded-lg border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] bg-black/40">
                <Image
                  src={template.previewDataUrl ?? templatePreviewDataUrl(template.name, template.layers)}
                  alt={`${template.name} preview`}
                  className="h-20 w-full object-cover"
                  width={240}
                  height={80}
                  loading="lazy"
                />
              </div>
              <p className="text-[13px] font-medium text-white/90">{template.name}</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground/80 mt-0.5">{template.description ?? "No description"}</p>
              <p className="mt-1.5 inline-block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full">
                {template.source}
              </p>
            </button>
          ))}
          {templates.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-[11px] text-muted-foreground">
              No templates match your search.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">Save template from overlays</Label>
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name"
          className="h-8 rounded-lg border-white/10 bg-black/20 text-[11px] focus-visible:ring-primary/40 transition-colors"
          aria-label="Template name"
        />
        <Button
          type="button"
          size="sm"
          className="w-full h-8 rounded-lg text-[11px] bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-muted-foreground"
          onClick={saveCurrentAsTemplate}
          disabled={state.overlays.length === 0}
        >
          Save current overlays as template
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">Restore points</Label>
        <Input
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder="Restore point label"
          className="h-8 rounded-lg border-white/10 bg-black/20 text-[11px] focus-visible:ring-primary/40 transition-colors"
          aria-label="Restore point label"
        />
        <Button
          type="button"
          size="sm"
          className="w-full h-8 rounded-lg text-[11px] bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-muted-foreground"
          onClick={createRestorePoint}
          disabled={state.frames.length === 0}
        >
          Create restore point
        </Button>

        <div className="max-h-32 space-y-1 overflow-y-auto pr-1 mt-2">
          {projectSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 transition-colors hover:border-white/15"
            >
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-white/90">{snapshot.label}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  {new Date(snapshot.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="ml-2 flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 rounded-md px-2 text-[10px] border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white font-medium"
                  onClick={() => restoreProjectSnapshot(snapshot.id)}
                >
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 rounded-md px-2 text-[10px] text-muted-foreground hover:bg-red-500/20 hover:text-red-400 function-medium"
                  onClick={() => deleteProjectSnapshot(snapshot.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {projectSnapshots.length === 0 && (
            <p className="text-[11px] text-muted-foreground">No restore points yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
