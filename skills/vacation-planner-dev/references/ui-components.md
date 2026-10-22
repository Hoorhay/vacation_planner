# UI Patterns & Components

## Design Tokens & Theme

The UI follows a mobile-first, dark-mode design system with IBM Plex typography.

### Core Variables (`style.css`)
- **Backgrounds**:
  - `--bg-canvas`: `#09090b` (Main app surface)
  - `--bg-card`: `#18181b` (Card and dialog container)
  - `--bg-card-subtle`: `#27272a` (Secondary items, inactive buttons)
  - Desktop backdrop: `#040405`
- **Borders & Separators**:
  - `--border-card`: `#27272a`
  - `--border-subtle`: `rgba(255, 255, 255, 0.08)`
  - `--track-connector`: `#3f3f46`
- **Text**:
  - `--text-primary`: `#fafafa`
  - `--text-secondary`: `#a1a1aa`
  - `--text-muted`: `#71717a`
  - `--text-dim`: `#52525b`
- **Accents**:
  - `--accent-blue` / `--accent-teal`: `#5ed3c4` (Primary actions, active tab)
  - `--accent-amber`: `#f5b731` (Train, warnings, alerts)
  - `--accent-alert`: `#ff6b5e` (Alerts, deletion)
  - `--accent-green`: `#4cc77d` (Available slots, success)
- **Typography & Layout**:
  - `--font-sans`: `'IBM Plex Sans', system-ui, sans-serif`
  - `--font-mono`: `'IBM Plex Mono', monospace`
  - `--app-max-width`: `480px` (Enforced for both mobile and centered desktop display)

---

## Modal Dialog Lifecycle Pattern

Modals are generated dynamically as DOM overlays and cleaned up upon dismissal:

```javascript
function openCustomModal(...) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'myCustomModal';

  function renderModal() {
    modal.innerHTML = `
      <div class="modal-dialog">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="modal-heading">Modal Title</h3>
          <button type="button" class="icon-btn" id="closeModalBtn">&#10005;</button>
        </div>
        <form id="modalForm" style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Form fields go here -->
          <div class="dialog-actions">
            <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
            <button type="submit" class="btn-secondary" style="background: var(--accent-blue); color: #09090b; border: none; font-weight: 600;">Save</button>
          </div>
        </form>
      </div>
    `;
    attachModalHandlers();
  }

  function attachModalHandlers() {
    modal.querySelector('#closeModalBtn').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancelBtn').addEventListener('click', () => modal.remove());
    modal.querySelector('#modalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      // Handle save logic
      modal.remove();
      renderApp();
    });
  }

  document.body.appendChild(modal);
  renderModal();

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}
```

### Critical Form Layout Rules:
- Multi-column rows must use `display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px;`
- Child `.form-group` elements **MUST** have `style="min-width: 0;"`
- Child `<input>` elements **MUST** have `style="width: 100%; min-width: 0;"`
- This ensures text inputs do not blow out the dialog on small viewport widths (320px–375px).

---

## Time Input Masking

Always attach the input masks to time and duration inputs when binding modal handlers:

- **Single Time (`HH:MM`)**:
  ```javascript
  attachTimeMask(modal.querySelector('#eventTime'));
  ```
  - Automatically pads digits (`9` -> `09:00`, `930` -> `09:30`).
  - Formats on blur and keystroke.
- **Time Range (`HH:MM–HH:MM`)**:
  ```javascript
  attachTimeRangeMask(modal.querySelector('#timeRangeInp'));
  ```

---

## SVG Icon Catalog (`getSvgIcon`)

Use `getSvgIcon(name, size, color, strokeWidth)` instead of emojis or external fonts:

| Icon Name | Category / Context |
|-----------|--------------------|
| `chevron-left` / `chevron-right` | Day navigation arrows |
| `clock` | Time windows, alerts |
| `plane` | Flight transport mode |
| `car` | Drive transport mode |
| `ferry` | Ferry transport mode |
| `train` | Train transport mode |
| `pin` | Default venue location |
| `bed` | Hotel / Lodging |
| `pizza` | Food / Dining |
| `cocktail` | Bar / Nightlife |
| `castle` | Sights / Tourism |
| `user` | Meeting / Personal |
| `music` | Concert / Entertainment |
| `important` | Urgent milestone |
| `plus` | Add button |
| `pencil` | Edit button |
| `trash` | Delete confirmation |
| `sync` / `refresh` | Firebase sync status |
| `cloud` | Online status |
| `warning` | Error / Alert icon |
| `check` | Validated free slot |
| `walk` | Multi-leg walking leg |
| `metro` | Metro/Subway badge |
| `bus` | Bus transit badge |
