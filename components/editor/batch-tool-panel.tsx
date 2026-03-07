"use client";

import { AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditor } from "@/hooks/use-editor";
import { useOverlays } from "@/hooks/use-overlays";
import { cn } from "@/lib/utils";

export function BatchToolPanel() {
  const { state, dispatch } = useEditor();
  const {
    overlays,
    selectedOverlayIds,
    updateOverlay,
    clearEffect,
    removeOverlay,
    groupSelected,
    ungroupSelected,
    setGroupLocked,
    alignSelection,
    distributeSelection,
  } = useOverlays();

  const selectionCount = selectedOverlayIds.length;

  const unlockAll = () => overlays.forEach((o) => updateOverlay(o.id, { locked: false }));
  const lockAll = () => overlays.forEach((o) => updateOverlay(o.id, { locked: true }));
  const hideAll = () => overlays.forEach((o) => updateOverlay(o.id, { visible: false }));
  const showAll = () => overlays.forEach((o) => updateOverlay(o.id, { visible: true }));
  const clearAllEffects = () => overlays.forEach((o) => clearEffect(o.id));
  const deleteHidden = () =>
    overlays
      .filter((o) => o.visible === false && o.locked !== true)
      .forEach((o) => removeOverlay(o.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Selection</Label>
           <span className="text-[10px] font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded">{selectionCount}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={groupSelected}
            disabled={selectionCount < 2}
          >
            Group
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={ungroupSelected}
            disabled={selectionCount < 1}
          >
            Ungroup
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={() => setGroupLocked(true)}
            disabled={selectionCount < 1}
          >
            Lock
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={() => setGroupLocked(false)}
            disabled={selectionCount < 1}
          >
            Unlock
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Align</Label>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => alignSelection("left")} disabled={selectionCount < 2}>Left</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => alignSelection("center")} disabled={selectionCount < 2}>Center</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => alignSelection("right")} disabled={selectionCount < 2}>Right</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => alignSelection("top")} disabled={selectionCount < 2}>Top</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => alignSelection("middle")} disabled={selectionCount < 2}>Middle</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={() => alignSelection("bottom")} disabled={selectionCount < 2}>Bottom</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Distribute</Label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] gap-1.5 border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={() => distributeSelection("horizontal")}
            disabled={selectionCount < 3}
          >
            <AlignHorizontalDistributeCenter className="h-3.5 w-3.5 text-white/60" />
            Horiz.
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-[6px] gap-1.5 border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase disabled:opacity-20 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
            onClick={() => distributeSelection("vertical")}
            disabled={selectionCount < 3}
          >
            <AlignVerticalDistributeCenter className="h-3.5 w-3.5 text-white/60" />
            Vert.
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-t border-white/5 pt-1 mb-0.5">
           <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Global</Label>
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-8 rounded-[6px] text-[10px] font-bold tracking-wider uppercase transition-all shadow-sm active:scale-95",
            state.snapToGrid 
              ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent gap-2" 
              : "border border-white/5 bg-black/20 hover:bg-white/10 hover:border-white/10 hover:text-white"
          )}
          onClick={() => dispatch({ type: "SET_SNAP_TO_GRID", payload: !state.snapToGrid })}
        >
          {state.snapToGrid && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
          Snap to Grid (8px)
        </Button>

        <div className="grid grid-cols-2 gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={showAll}>
            Show All
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={hideAll}>
            Hide All
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={unlockAll}>
            Unlock All
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95" onClick={lockAll}>
            Lock All
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 rounded-[6px] border border-white/5 bg-black/20 text-[10px] font-bold tracking-wider uppercase hover:bg-white/10 hover:border-white/10 hover:text-white transition-all shadow-sm active:scale-95"
          onClick={clearAllEffects}
        >
          Clear Effects
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 rounded-[6px] border border-red-500/20 bg-red-500/10 text-[10px] font-bold tracking-wider uppercase text-red-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-all shadow-sm active:scale-95"
          onClick={deleteHidden}
        >
          Delete Hidden & Unlocked
        </Button>
      </div>

      <p className="text-[10px] text-white/30 px-1 font-medium leading-relaxed">
        Multi-select in timeline with Ctrl/Cmd click. Locked layers are skipped.
      </p>
    </div>
  );
}
