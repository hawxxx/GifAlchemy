"use client";

import { AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditor } from "@/hooks/use-editor";
import { useOverlays } from "@/hooks/use-overlays";

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
    <div className="space-y-3">
      <Label className="text-xs">Batch actions</Label>

      <div className="rounded-lg border border-border/60 p-2.5 space-y-2 bg-background/60">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Selection</p>
          <p className="text-xs font-medium">{selectionCount} layer(s)</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={groupSelected}
            disabled={selectionCount < 2}
          >
            Group selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={ungroupSelected}
            disabled={selectionCount < 1}
          >
            Ungroup selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setGroupLocked(true)}
            disabled={selectionCount < 1}
          >
            Lock group
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setGroupLocked(false)}
            disabled={selectionCount < 1}
          >
            Unlock group
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 p-2.5 space-y-2 bg-background/60">
        <p className="text-xs text-muted-foreground">Align selected</p>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => alignSelection("left")} disabled={selectionCount < 2}>Left</Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => alignSelection("center")} disabled={selectionCount < 2}>Center</Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => alignSelection("right")} disabled={selectionCount < 2}>Right</Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => alignSelection("top")} disabled={selectionCount < 2}>Top</Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => alignSelection("middle")} disabled={selectionCount < 2}>Middle</Button>
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => alignSelection("bottom")} disabled={selectionCount < 2}>Bottom</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 p-2.5 space-y-2 bg-background/60">
        <p className="text-xs text-muted-foreground">Distribute selected</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg gap-1"
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
            className="rounded-lg gap-1"
            onClick={() => distributeSelection("vertical")}
            disabled={selectionCount < 3}
          >
            <AlignVerticalDistributeCenter className="h-3.5 w-3.5" />
            Vertical
          </Button>
        </div>
      </div>

      <Button
        type="button"
        variant={state.snapToGrid ? "default" : "outline"}
        size="sm"
        className="w-full rounded-lg"
        onClick={() => dispatch({ type: "SET_SNAP_TO_GRID", payload: !state.snapToGrid })}
      >
        Nudge snap 8px grid: {state.snapToGrid ? "On" : "Off"}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={showAll}>
          Show all
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={hideAll}>
          Hide all
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={unlockAll}>
          Unlock all
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={lockAll}>
          Lock all
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-lg"
        onClick={clearAllEffects}
      >
        Clear all effects
      </Button>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full rounded-lg"
        onClick={deleteHidden}
      >
        Delete hidden unlocked layers
      </Button>

      <p className="text-[11px] text-muted-foreground">
        Multi-select in timeline with Ctrl/Cmd click. Locked layers are skipped.
      </p>
    </div>
  );
}
