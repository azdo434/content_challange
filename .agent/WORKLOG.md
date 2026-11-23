# UI verification

- Viewport: 1920×1080 browser screenshot.
- Background: `img/tracker-background.png`, natural size 1920×1080.
- Screenshot: `C:\Users\azi\AppData\Local\hermes\cache\scratch\gta6-correct-1920-bg-local.png`.
- Layout: two 30-day boards at lower left/right; center car and VI remain unobstructed; no page overflow.
- Interaction: day toggle, clip count, totals, share/copy, and reset passed.
- Console: 0 errors in the fresh local context.

## Zero-count status and hidden reset

- Desktop: entering `0` stores `{ done: true, clips: 0 }`, increments completed days to `1/30`, and renders a two-stroke cross.
- Reset: `hidden=true`, computed `display:none`, zero-width hit area.
- Phone layout: no horizontal overflow; numeric input remains approximately `48×44` CSS px with `inputmode=numeric`, `min=0`, and `max=100`.
- Console: 0 errors after the fresh local navigation.
