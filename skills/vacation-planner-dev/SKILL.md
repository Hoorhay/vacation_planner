---
name: vacation-planner-dev
description: Expert engineering and feature development guide for the Vacation Planner PWA. Use when developing features, adding or modifying timeline events, updating modals and forms, altering styles or icons, handling sync and storage, or bumping service worker cache in the Vacation Planner codebase.
---

# Vacation Planner Engineering Guide

This skill guides rapid and reliable development in the Vacation Planner PWA codebase.

## Codebase Architecture

The project is a zero-build, dependency-free vanilla JavaScript Progressive Web App:
- `index.html`: Shell, CSS variables link, IBM Plex fonts, root `#app` mount.
- `app.js`: Complete application logic (state management, rendering, modal controllers, calculations, and sync).
- `style.css`: Design tokens, dark theme, mobile-first responsive layout (max-width `480px`).
- `sw.js`: Service worker handling offline caching with versioned `CACHE_NAME`.
- `manifest.json`: Web app manifest for mobile installation.

---

## Detailed References

Load these reference files into context as needed:
- **[Data Models & Schemas](references/data-models.md)**: Schemas for `Trip`, `Day`, `TimelineItem` (`venue`, `alert`, `transport`, `transit_chain`), `Idea`, and scheduling algorithms.
- **[UI Patterns & Components](references/ui-components.md)**: Design tokens, modal lifecycle, 2-column mobile grid rules, time masks, and full SVG icon catalog.
- **[State, Sync & PWA Architecture](references/state-sync-and-pwa.md)**: `localStorage` persistence, Firebase RTDB sync, dirty tracking, and PWA cache lifecycle.

---

## Core Development Workflows

### 1. Modifying Modals & Form Fields
When adding or altering fields in modal forms (e.g. `openEventModal`, `openIdeaModal`, `openDayModal`):
1. **In-Memory Form State (`formData`)**:
   - Initialize fields in the `formData` object from `existingItem` properties.
   - In `syncDomToFormData()`, query the input DOM element and mirror its value back to `formData`.
2. **Form Layout Standards**:
   - Multi-column rows must use:
     `<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px;">`
   - Every column container `.form-group` must specify `style="min-width: 0;"`.
   - Every `<input>` inside grids must specify `style="width: 100%; min-width: 0;"` to prevent grid blowout.
3. **Time Inputs**:
   - Attach `attachTimeMask(input)` in `attachModalHandlers()` for automatic `HH:MM` formatting.
4. **Saving**:
   - Extract sanitized values in the submit handler.
   - For timeline items, ensure `newItem.time` is set to the event's start/departure time so `sortDayItems()` sorts it properly.

### 2. Adding or Modifying Timeline Items
When updating timeline event types (`venue`, `alert`, `transport`, `transit_chain`):
1. **Modal Form Render**: Add or modify the form section in `openEventModal` under `currentType === '<type>'`.
2. **Item Construction**: Update the submit handler in `openEventModal` to build the new data structure.
3. **Timeline Card Rendering**: Update `renderTimelineItem(item, isFirst, isLast)` in `app.js`.
4. **Sorting & Scheduling**:
   - Set `item.time` to ensure proper chronological ordering via `sortDayItems()`.
   - If the item spans a duration (e.g., transit from/to or venue with duration/endTime), ensure `item.from?.time` / `item.to?.time` or `item.timeWindow` / `item.endTime` are set so `calculateFreeTimeWindow()` accounts for the busy slot.

### 3. Adding SVG Icons
1. Avoid external icon libraries or emoji icons when an SVG is preferred.
2. Check `references/ui-components.md` for existing icons.
3. If introducing a new icon, add a `case '<icon-name>':` branch to `getSvgIcon(name, size, color, strokeWidth)` in `app.js`.

---

## Verification & Deployment Checklist

Before completing any task:
1. **Validate Syntax & Assets**:
   Run the bundled verification script:
   ```bash
   node ./skills/vacation-planner-dev/scripts/verify_project.cjs .
   ```
   Or run the standalone node check:
   ```bash
   node -c app.js && node -c sw.js
   ```
2. **Bump Service Worker Cache**:
   If `app.js`, `style.css`, or `index.html` were modified, increment `CACHE_NAME` in `sw.js` (e.g., `'vacation-planner-v8'` -> `'vacation-planner-v9'`).
