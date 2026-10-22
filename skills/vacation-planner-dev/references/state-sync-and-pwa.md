# State, Sync & PWA Architecture

## Local Storage Persistence

All application data is stored in the browser's `localStorage` under:
- `vacation_planner_data_v1`: JSON string storing the `trips` array.
- `vacation_planner_credentials`: JSON string storing credentials `{ dbUrl, authSecret, isReadOnly }`.

### State Modification Pipeline
Whenever trip data is modified:
1. Mutate the relevant trip / day / item object in `state.trips`.
2. Call `touchTrip(trip)`:
   - Updates `trip.updatedAt = Date.now()`.
   - Flags `state.sync.dirty = true`.
3. Call `saveTripsToStorage(state.trips, true)`:
   - Synchronously serializes to `localStorage.setItem(...)`.
   - If `dbUrl` is configured and `syncRemote` is `true`, schedules asynchronous debounce sync to Firebase RTDB.
4. Call `renderApp()` to trigger immediate DOM re-render.

---

## Firebase Realtime Database (RTDB) Sync

The app uses Firebase RTDB's REST API directly via native `fetch()` without SDK dependencies:

- **Endpoint**: `${dbUrl}/vacation_planner.json?auth=${authSecret}`
- **Read**: `GET` request on app load or when user taps "Pull / Refresh".
- **Write**: `PUT` request with `{ trips: state.trips, updatedAt: Date.now() }`.
- **Read-Only Mode**: When `isReadOnly: true`, write operations are disabled and UI modification controls are hidden.

---

## Service Worker & Cache Management (`sw.js`)

The app is an offline-capable Progressive Web App (PWA).

### Service Worker Lifecycle
- `CACHE_NAME`: Defined at the top of `sw.js` (e.g., `vacation-planner-v8`).
- `CORE_ASSETS`: Array of relative paths to static assets required offline:
  ```javascript
  const CORE_ASSETS = [
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/favicon.svg',
    './assets/apple-touch-icon.png',
    './assets/web-app-manifest-192x192.png',
    './assets/web-app-manifest-512x512.png'
  ];
  ```

### **MANDATORY DEPLOYMENT RULE: Cache Version Bump**
Whenever **ANY** of the following files are modified:
- `app.js`
- `style.css`
- `index.html`
- `manifest.json`

You **MUST** increment the `CACHE_NAME` in `sw.js` (e.g. from `'vacation-planner-v8'` to `'vacation-planner-v9'`).
Failure to bump `CACHE_NAME` causes browsers and installed PWAs to serve the old cached version indefinitely.
