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
        effect: "bounce" as AnimationPresetType,
      },
      {
        content: "🔥",
        x: 0.5,
        y: 0.5,
        fontSize: 90,
        color: "#ffffff",
        strokeWidth: 0,
        strokeColor: "#000000",
        effect: "pulse" as AnimationPresetType,
      },
      {
        content: "NEW DROP",
        x: 0.5,
        y: 0.8,
        fontSize: 34,
        color: "#ffffff",
        strokeWidth: 2,
        strokeColor: "#000000",
        effect: "flicker" as AnimationPresetType,
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
        effect: "scale-in" as AnimationPresetType,
      },
      {
        content: "subtitle goes here",
        x: 0.5,
        y: 0.58,
        fontSize: 28,
        color: "#d4d4d8",
        strokeWidth: 1,
        strokeColor: "#000000",
        effect: "fade-in" as AnimationPresetType,
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Template Library</Label>
        </div>
        <div className="flex flex-col gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-8 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
            aria-label="Search templates"
          />
          <Select value={scope} onValueChange={(value) => setScope(value as TemplateScope)}>
            <SelectTrigger className="h-8 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 hover:bg-white/5 hover:border-white/20 transition-all focus:ring-1 focus:ring-primary/20">
              <SelectValue placeholder="Template source" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-black/80 backdrop-blur-xl">
              <SelectItem value="all" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">All templates</SelectItem>
              <SelectItem value="built-in" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">Built-in</SelectItem>
              <SelectItem value="custom" className="text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer rounded-sm">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1 mt-1 custom-scrollbar">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="group w-full rounded-md border border-white/5 bg-black/20 p-2 text-left transition-all hover:bg-white/10 hover:border-white/15 hover:shadow-sm active:scale-[0.98]"
            >
              <div className="mb-2 overflow-hidden rounded bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-white/5 group-hover:border-white/10 transition-colors">
                <Image
                  src={template.previewDataUrl ?? templatePreviewDataUrl(template.name, template.layers)}
                  alt={`${template.name} preview`}
                  className="h-20 w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  width={240}
                  height={80}
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-0.5">
                 <p className="text-[11px] font-bold text-white/90 truncate">{template.name}</p>
                 <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-white/30 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  {template.source}
                </span>
              </div>
              <p className="text-[10px] font-medium text-white/40 mt-0.5 px-0.5 truncate">{template.description ?? "No description"}</p>
            </button>
          ))}
          {templates.length === 0 && (
            <div className="rounded border border-dashed border-white/10 bg-black/20 px-3 py-6 text-center text-[11px] font-medium text-white/40 mt-2">
              No templates match search.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Save Current Overlays</Label>
        </div>
        <div className="flex flex-col gap-2">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Name your template..."
            className="h-8 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
            aria-label="Template name"
          />
          <Button
            type="button"
            size="sm"
            className="w-full h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={saveCurrentAsTemplate}
            disabled={state.overlays.length === 0}
          >
            Save as Template
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Restore Points</Label>
        </div>
        <div className="flex flex-col gap-2">
          <Input
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Label (e.g., Before text)"
            className="h-8 rounded-md border-white/10 bg-black/20 text-xs font-medium text-white/90 placeholder:text-white/20 hover:border-white/20 focus-visible:border-primary/50 focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
            aria-label="Restore point label"
          />
          <Button
            type="button"
            size="sm"
            className="w-full h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95 text-primary hover:text-primary-foreground hover:bg-primary/80 hover:border-primary"
            onClick={createRestorePoint}
            disabled={state.frames.length === 0}
          >
            Create Snapshot
          </Button>
        </div>

        <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 mt-1 custom-scrollbar">
          {projectSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="group flex flex-col gap-2 rounded border border-white/5 bg-black/20 px-2 py-2 transition-all hover:bg-white/5 hover:border-white/10"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex flex-col">
                  <p className="truncate text-[11px] font-bold text-white/90">{snapshot.label}</p>
                  <p className="text-[9px] font-medium text-white/40 mt-0.5 tabular-nums">
                    {new Date(snapshot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {new Date(snapshot.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-6 rounded border border-white/5 bg-black/40 text-[9px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
                  onClick={() => restoreProjectSnapshot(snapshot.id)}
                >
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-6 px-2 rounded border border-transparent bg-transparent text-[9px] font-bold uppercase tracking-wider text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                  onClick={() => deleteProjectSnapshot(snapshot.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {projectSnapshots.length === 0 && (
            <div className="rounded border border-dashed border-white/10 bg-black/20 px-3 py-4 text-center text-[10px] font-medium text-white/40 mt-1">
              No snapshots yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
