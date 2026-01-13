# Performance checklist (DevTools)

## How to reproduce
1. Open the app in Chrome (DevTools open).
2. Navigate to pages that open overlays (Evening cards, Flow direction modal, Sidebar drawer).
3. Let the page idle for 2–3 minutes.
4. Record a **Performance** profile for ~30s.
5. Take a **Memory** snapshot, then repeat after another 2–3 minutes.

## Expected healthy behavior
- Listener count stabilizes after interactions; counts should not monotonically increase.
- DOM node count stabilizes after opening/closing overlays (no steady climb).
- Heap size may fluctuate but should return close to baseline after closing overlays.
- When the tab is hidden or `prefers-reduced-motion` is enabled, background animation should stop.

## Helpful debug logs (dev only)
Look for `[perf]` logs in the console. These show counts of:
- Active listener registrations from our hooks.
- Active animation loops (rAF).
- Active observers and observed node counts.

If counts only go up during normal navigation, investigate the most recent component that logged a register without a matching unregister.