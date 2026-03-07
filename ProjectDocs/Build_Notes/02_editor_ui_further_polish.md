# Editor UI Further Deep Polish

## Task Objective
Enhance the premium aesthetic feeling applied earlier across the rest of the Editor UI, specifically focusing on the inner working panels, modals, and auxiliary overlays. 

## Current State Assessment
- The main panels (Tools Rail, Top Bar, Properties base, Timeline base) have been successfully upgraded to the new premium dark glass theme.
- However, inner components like the `TrimToolPanel`, `ResizeToolPanel`, `TextToolPanel` properties inspector sections, the `ExportProgressOverlay` in `CanvasStage`, and various application modals still use more basic fallback styling (`bg-black/20`, standard borders, lacking deep shadows or blur depth).
- The transition between the high-end main structure and the simpler inner elements creates an aesthetic disconnect.

## Future State Goal
A fully cohesive, SaaS-like premium aesthetic where inner tool properties, export overlays, and modals use consistent micro-interactions, rich gradients, dynamic glowing active states, and refined typography.

## Implementation Plan
1. [ ] **Canvas Stage Overlays:** Upgrade `ExportProgressOverlay` and the `CanvasStage` loading/error states to utilize deep radial gradients, backdrops blurs, and premium typography matching `ImageAssetsSubmenu`.
2. [ ] **Properties Tool Panels refinement:** Upgrade `text-tool-panel.tsx`, `resize-tool-panel.tsx`, `trim-tool-panel.tsx`, and `image-overlay-panel.tsx`.
   - Replace basic flat `bg-black/20` input backgrounds with subtle deep glass (`bg-white/[0.035]` with inner shadows and border glow on focus).
   - Refine numeric text inputs and selectors.
   - Improve standard button states for a more tactile, premium feel (`active:scale-95`, better hover transitions).
3. [ ] **Editor Modals:** Refine the background aesthetics of `EditorModal`, `OnboardingModal`, and `KeyboardShortcutsModal` to match the ultra-premium Glassmorphism look.
4. [ ] **Action Menu Polish:** Apply the polished styling to `NextStepsMenu`.
