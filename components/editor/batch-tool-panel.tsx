"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOverlays } from "@/hooks/use-overlays";

export function BatchToolPanel() {
  const { overlays, updateOverlay, clearEffect, removeOverlay } = useOverlays();

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
        Locked layers are never removed by batch delete.
      </p>
    </div>
  );
}
