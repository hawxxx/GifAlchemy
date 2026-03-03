# Editor Smoke Checklist

## Upload
- [ ] Upload a GIF successfully.
- [ ] Upload an MP4/WebM and verify frames decode.
- [ ] Reject unsupported file types with a visible error.

## Editing
- [ ] Add text layer and edit content/font/size/color.
- [ ] Apply effect and verify animation in timeline playback.
- [ ] Duplicate layer and verify offset position.
- [ ] Hide/lock layer and verify behavior is enforced.
- [ ] Use stickers/templates tools and verify overlays are inserted.
- [ ] Use batch tool actions and verify they affect expected layers.

## Timeline / Playback
- [ ] Scrub playhead and verify frame updates.
- [ ] Set trim start/end and verify playback loops inside range.
- [ ] Change playback speed and reload page; speed should persist.
- [ ] Use keyboard nudges for selected text layer (arrow + shift).

## Export
- [ ] Export with overlays and verify downloaded filename format `{project}-{width}x{height}.gif`.
- [ ] Cancel export and verify cancellation toast.
- [ ] Trigger export error scenario and verify actionable toast details.
