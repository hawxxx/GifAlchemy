"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Command, 
  Search, 
  Trash2, 
  Lock, 
  Unlock, 
  Copy, 
  Layers, 
  Type, 
  Eye, 
  EyeOff,
  Zap,
  MousePointer2,
  Maximize,
  Sparkles
} from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/lib/utils";
import type { AnimationPresetType } from "@/core/domain/project";

export function HUDCommandPalette() {
  const { state, dispatch } = useEditor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "/" && document.activeElement === document.body) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const selectedOverlay = state.overlays.find(o => o.id === state.selectedOverlayId);

  const actions = [
    {
      id: "del",
      label: "Delete Layer",
      icon: Trash2,
      shortcut: "⌫",
      show: !!state.selectedOverlayId,
      perform: () => {
        if (state.selectedOverlayId) dispatch({ type: "REMOVE_OVERLAY", payload: state.selectedOverlayId });
        setOpen(false);
      },
    },
    {
      id: "lock",
      label: selectedOverlay?.locked ? "Unlock Layer" : "Lock Layer",
      icon: selectedOverlay?.locked ? Unlock : Lock,
      shortcut: "L",
      show: !!state.selectedOverlayId,
      perform: () => {
        if (state.selectedOverlayId) {
          dispatch({ 
            type: "UPDATE_OVERLAY", 
            payload: { id: state.selectedOverlayId, updates: { locked: !selectedOverlay?.locked } } 
          });
        }
        setOpen(false);
      },
    },
    {
      id: "toggle-visibility",
      label: selectedOverlay?.visible ? "Hide Layer" : "Show Layer",
      icon: selectedOverlay?.visible ? EyeOff : Eye,
      shortcut: "V",
      show: !!state.selectedOverlayId,
      perform: () => {
        if (state.selectedOverlayId) {
          dispatch({ 
            type: "UPDATE_OVERLAY", 
            payload: { id: state.selectedOverlayId, updates: { visible: !selectedOverlay?.visible } } 
          });
        }
        setOpen(false);
      },
    },
    {
      id: "snap",
      label: state.snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid",
      icon: Maximize,
      shortcut: "S",
      show: true,
      perform: () => {
        dispatch({ type: "SET_SNAP_TO_GRID", payload: !state.snapToGrid });
        setOpen(false);
      },
    },
    {
      id: "clear-all",
      label: "Clear All Layers",
      icon: Layers,
      show: state.overlays.length > 0,
      perform: () => {
        if (confirm("Clear all layers?")) {
          dispatch({ type: "SET_OVERLAYS", payload: [] });
        }
        setOpen(false);
      },
    },
  ].filter(a => a.show && a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 animate-fade-in pointer-events-none">
      <div 
        className="fixed inset-0 bg-background/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => setOpen(false)}
      />
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-[540px] pointer-events-auto overflow-hidden rounded-[28px] border border-white/10 bg-[#0d121a]/95 shadow-[0_48px_128px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-3xl animate-panel-in"
      >
        <div className="flex items-center border-b border-white/5 px-6 pt-5 pb-4">
          <Search className="h-5 w-5 text-white/30 mr-4" />
          <input
            autoFocus
            placeholder="Search commands or layers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-lg font-medium text-white/90 placeholder:text-white/20 outline-none"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/5 text-[10px] font-black text-white/30 tracking-tighter">
            ESC
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-none">
          <div className="py-2 px-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 px-3 mb-2">Actions</h3>
            {actions.map((action, idx) => (
              <button
                key={action.id}
                onClick={action.perform}
                className="group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-all hover:bg-white/[0.04] active:scale-[0.985]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-white/40 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/20 transition-all">
                  <action.icon className="h-4.5 w-4.5" />
                </div>
                <span className="flex-1 text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">{action.label}</span>
                {action.shortcut && (
                  <span className="text-[10px] font-black text-white/20 group-hover:text-white/40 transition-colors uppercase tracking-widest">{action.shortcut}</span>
                )}
              </button>
            ))}
            {actions.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-20">
                <Search className="h-10 w-10" />
                <span className="text-xs font-bold uppercase tracking-widest">No matching commands</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 grayscale opacity-40">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">Advanced Flow</span>
             </div>
          </div>
          <p className="text-[10px] font-medium text-white/20">Press <code className="text-white/40">↑↓</code> to navigate</p>
        </div>
      </div>
    </div>
  );
}
