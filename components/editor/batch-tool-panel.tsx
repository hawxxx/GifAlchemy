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
    <div className="space-y-4">
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-2">Batch actions</Label>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Selection</p>
          <p className="text-[11px] font-medium text-foreground">{selectionCount} layer(s)</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            onClick={groupSelected}
            disabled={selectionCount < 2}
          >
            Group selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            onClick={ungroupSelected}
            disabled={selectionCount < 1}
          >
            Ungroup selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            onClick={() => setGroupLocked(true)}
            disabled={selectionCount < 1}
          >
            Lock group
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            onClick={() => setGroupLocked(false)}
            disabled={selectionCount < 1}
          >
            Unlock group
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Align selected</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={() => alignSelection("left")} disabled={selectionCount < 2}>Left</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={() => alignSelection("center")} disabled={selectionCount < 2}>Center</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={() => alignSelection("right")} disabled={selectionCount < 2}>Right</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={() => alignSelection("top")} disabled={selectionCount < 2}>Top</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={() => alignSelection("middle")} disabled={selectionCount < 2}>Middle</Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={() => alignSelection("bottom")} disabled={selectionCount < 2}>Bottom</Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/5 bg-black/10 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Distribute selected</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg gap-1 border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            onClick={() => distributeSelection("horizontal")}
            disabled={selectionCount < 3}
          >
            <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
            Horizontal
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg gap-1 border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            onClick={() => distributeSelection("vertical")}
            disabled={selectionCount < 3}
          >
            <AlignVerticalDistributeCenter className="h-3.5 w-3.5" />
            Vertical
          </Button>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="button"
          variant={state.snapToGrid ? "default" : "outline"}
          size="sm"
          className={cn(
            "w-full h-9 rounded-lg text-[11px] font-medium transition-colors mb-2",
            state.snapToGrid 
              ? "" 
              : "border border-white/10 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
          )}
          onClick={() => dispatch({ type: "SET_SNAP_TO_GRID", payload: !state.snapToGrid })}
        >
          Nudge snap 8px grid: {state.snapToGrid ? "On" : "Off"}
        </Button>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={showAll}>
            Show all
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={hideAll}>
            Hide all
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={unlockAll}>
            Unlock all
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors" onClick={lockAll}>
            Lock all
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 mb-2 rounded-lg border border-white/10 bg-transparent text-[11px] text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          onClick={clearAllEffects}
        >
          Clear all effects
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-[11px] transition-colors"
          onClick={deleteHidden}
        >
          Delete hidden unlocked layers
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground opacity-80 mt-4 leading-relaxed">
        Multi-select in timeline with Ctrl/Cmd click. Locked layers are skipped.
      </p>
    </div>
  );
}
