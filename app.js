// Vacation Planner - Standalone Zero-Build App (whisky_db_search architecture)

const STORAGE_KEY_TRIPS = 'vacation_trips_data';
const STORAGE_KEY_DB_URL = 'vacation_firebase_rtdb_url';
const STORAGE_KEY_TRACKER = 'vacation_firebase_tracker';
const STORAGE_KEY_RO_TRACKER = 'vacation_firebase_ro_tracker';
const STORAGE_KEY_IS_RO = 'vacation_firebase_is_ro';
const STORAGE_KEY_LAST_SYNC = 'vacation_last_sync_time';
const STORAGE_KEY_IS_DIRTY = 'vacation_is_dirty';

// Date Utilities
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatToIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDDMMYYYY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function isoToDDMMYYYY(isoStr) {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return isoStr || '';
  const [y, m, d] = isoStr.split('-');
  return `${d}.${m}.${y}`;
}

function ddmmyyyyToIso(dmyStr) {
  if (!dmyStr) return null;
  const match = dmyStr.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function getDateForDay(startDateStr, dayNumber) {
  const base = parseLocalDate(startDateStr);
  base.setDate(base.getDate() + (dayNumber - 1));
  return base;
}

function formatFullDate(date) {
  const dayName = WEEKDAYS_SHORT[date.getDay()];
  return `${dayName}., ${formatDateDDMMYYYY(date)}`;
}

function formatShortDate(date) {
  const dayName = WEEKDAYS_SHORT[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${dayName} ${d}.${m}.`;
}

function formatDateRange(startDateStr, totalDays) {
  if (!startDateStr || totalDays <= 0) return '';
  const start = parseLocalDate(startDateStr);
  const end = new Date(start);
  end.setDate(end.getDate() + (totalDays - 1));
  return `${formatDateDDMMYYYY(start)} – ${formatDateDDMMYYYY(end)}`;
}

function getEndDateIso(startDateStr, durationDays) {
  if (!startDateStr || durationDays <= 0) return startDateStr;
  const date = getDateForDay(startDateStr, durationDays);
  return formatToIsoDate(date);
}

function getDurationFromDates(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 1;
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

// Initial Mock Seed Data (Prague ➔ Islay & Islay Sunday)
const DEFAULT_TRIP = {
  id: 'whisky-show-2027',
  title: 'Whisky Show 2027',
  startDate: '2027-09-23',
  totalDays: 10,
  initialDayNumber: 3,
  days: [
    {
      id: 'day-1',
      dayNumber: 1,
      routeTitle: 'Pre-trip & Packing',
      items: [{ id: 'd1-1', type: 'alert', time: '18:00', label: 'check-in online & passports check' }]
    },
    {
      id: 'day-2',
      dayNumber: 2,
      routeTitle: 'Final preparations',
      items: [{ id: 'd2-1', type: 'venue', time: '19:00', title: 'Early rest before flight', icon: 'bed' }]
    },
    {
      id: 'day-3',
      dayNumber: 3,
      routeTitle: 'Prague ➔ Islay',
      items: [
        { id: 'sat-1', type: 'alert', time: '5:00', label: 'departure from hotel' },
        {
          id: 'sat-2',
          type: 'transit_chain',
          time: '5:15',
          steps: [
            { stop: 'Křižíkova', lineBadge: { type: 'metro', label: 'B', sublabel: 'M', bgColor: '#F5B731', textColor: '#1B1300' } },
            { stop: 'Zličín', lineBadge: { type: 'bus', label: '#100', borderColor: '#6CB8FF', textColor: '#6CB8FF' } },
            { stop: 'PRG T2', note: 'arrival ~6:15' }
          ]
        },
        { id: 'sat-3', type: 'alert', time: '7:30', label: 'gate closes' },
        {
          id: 'sat-4',
          type: 'transport',
          mode: 'flight',
          time: '8:00',
          badgeLabel: 'Flight · FR1014',
          badgeColor: '#6CB8FF',
          from: { label: 'PRG', time: '8:00' },
          to: { label: 'EDI', time: '10:00' }
        },
        { id: 'sat-5', type: 'venue', time: '11:00', title: 'Pick up car', subtitle: 'SIXT · reservation 12345', icon: 'car' },
        {
          id: 'sat-6',
          type: 'transport',
          mode: 'drive',
          badgeLabel: 'Drive · estimated 2 hours',
          badgeColor: '#D4D4D8',
          from: { label: 'Edinburgh' },
          to: { label: 'Kennacraig' }
        },
        { id: 'sat-7', type: 'alert', time: '15:30', label: 'ferry check-in' },
        {
          id: 'sat-8',
          type: 'transport',
          mode: 'ferry',
          time: '16:00',
          badgeLabel: 'Ferry',
          badgeColor: '#5ED3C4',
          from: { label: 'Kennacraig', time: '16:00' },
          to: { label: 'Islay', time: '18:00' }
        },
        { id: 'sat-9', type: 'venue', title: 'Islay Hotel', icon: 'bed' },
        { id: 'sat-10', type: 'venue', time: '20:00', title: 'Super Bar', icon: 'cocktail' }
      ]
    },
    {
      id: 'day-4',
      dayNumber: 4,
      routeTitle: 'Islay',
      items: [
        { id: 'sun-1', type: 'alert', time: '9:00', label: 'leave for Kilchoman' },
        { id: 'sun-2', type: 'venue', time: '9:30', title: 'Kilchoman', subtitle: 'visit and brunch', icon: 'pin' },
        { id: 'sun-3', type: 'alert', time: '10:30', label: 'leave for Bruichladdich' },
        { id: 'sun-4', type: 'alert', time: '11:00', label: 'check-in Bruichladdich' },
        {
          id: 'sun-5',
          type: 'venue',
          time: '11:15',
          title: 'Bruichladdich',
          subtitle: 'Warehouse # Experience',
          timeWindow: '11:15–13:30',
          icon: 'pin'
        }
      ]
    },
    { id: 'day-5', dayNumber: 5, routeTitle: 'Islay Distilleries South', items: [] },
    { id: 'day-6', dayNumber: 6, routeTitle: 'Bowmore & Central', items: [] },
    { id: 'day-7', dayNumber: 7, routeTitle: 'Jura Excursion', items: [] },
    { id: 'day-8', dayNumber: 8, routeTitle: 'Islay North & Port Askaig', items: [] },
    { id: 'day-9', dayNumber: 9, routeTitle: 'Return to Edinburgh', items: [] },
    { id: 'day-10', dayNumber: 10, routeTitle: 'Edinburgh ➔ Prague', items: [] }
  ],
  pool: [
    { id: 'p-1', title: 'Meet Marion', icon: 'user', tags: [{ icon: 'calendar', text: 'Sat–Tue', variant: 'neutral' }], applicableDays: [3, 4, 5, 6] },
    {
      id: 'p-2',
      title: 'Visit Bowmore',
      icon: 'pin',
      tags: [
        { icon: 'calendar', text: 'Any day', variant: 'neutral' },
        { icon: 'clock', text: '12:00–15:00', variant: 'blue' },
        { icon: 'check', text: 'free 13:30–15:00', variant: 'green' }
      ],
      applicableDays: [3, 4, 5, 6, 7]
    },
    { id: 'p-3', title: 'Watch fireworks', icon: 'sparkles', tags: [{ icon: 'calendar', text: 'Today only', variant: 'amber' }, { icon: 'clock', text: '22:00', variant: 'blue' }], applicableDays: [3] },
    { id: 'p-4', title: 'Disco at Oldies pub', icon: 'music', tags: [{ icon: 'calendar', text: 'Sunday only', variant: 'amber' }, { icon: 'clock', text: '23:00', variant: 'blue' }], applicableDays: [4] }
  ]
};

// SVG Icon Helper
function getSvgIcon(name, size = 18, color = 'currentColor', strokeWidth = 1.75) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

  switch (name) {
    case 'chevron-left':
      return `<svg ${common} stroke-width="2.25"><path d="M15 6l-6 6 6 6"/></svg>`;
    case 'chevron-right':
      return `<svg ${common} stroke-width="2.25"><path d="M9 6l6 6-6 6"/></svg>`;
    case 'clock':
      return `<svg ${common}><circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.5"/><path d="M5 4 2.5 6.5"/><path d="M19 4l2.5 2.5"/></svg>`;
    case 'plane':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform: rotate(90deg);" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
    case 'car':
      return `<svg ${common}><path d="M5 16V12l2-5h10l2 5v4"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r="0.8" fill="${color}"/><circle cx="16.5" cy="13" r="0.8" fill="${color}"/></svg>`;
    case 'ferry':
      return `<svg ${common}><path d="M3 16l2 4h14l2-4z"/><path d="M12 4v12"/><path d="M12 5l6 8h-6"/></svg>`;
    case 'pin':
      return `<svg ${common}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.25"/></svg>`;
    case 'bed':
      return `<svg ${common}><path d="M3 18V6"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.75"/></svg>`;
    case 'cocktail':
      return `<svg ${common}><path d="M6 4h12l-1.4 14.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.8 10.5h10.4"/></svg>`;
    case 'user':
      return `<svg ${common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg>`;
    case 'calendar':
      return `<svg ${common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M9 3v4"/><path d="M15 3v4"/></svg>`;
    case 'check':
      return `<svg ${common} stroke-width="2.25"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
    case 'plus':
      return `<svg ${common} stroke-width="2.25"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
    case 'music':
      return `<svg ${common}><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>`;
    case 'sparkles':
      return `<svg ${common}><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/><path d="M18.4 5.6l-2.8 2.8"/><path d="M8.4 15.6l-2.8 2.8"/></svg>`;
    default:
      return '';
  }
}

// App State
let state = {
  trips: [],
  activeTripId: null,
  activeDayNumber: 1,
  tripToDelete: null,
  isSyncing: false
};

// URL Parameters Auto-Configuration (?db=...&tracker=...&ro=true)
function checkUrlCredentials() {
  const params = new URLSearchParams(window.location.search);
  const dbParam = params.get('db');
  const trackerParam = params.get('tracker');
  const roTrackerParam = params.get('roTracker') || params.get('ro_tracker');
  const isRoParam = params.get('readonly') === 'true' || params.get('ro') === 'true';

  let updated = false;
  if (dbParam) {
    localStorage.setItem(STORAGE_KEY_DB_URL, dbParam);
    updated = true;
  }
  if (trackerParam) {
    localStorage.setItem(STORAGE_KEY_TRACKER, trackerParam);
    updated = true;
    if (trackerParam.endsWith('_ro') || isRoParam) {
      localStorage.setItem(STORAGE_KEY_IS_RO, 'true');
    }
  }
  if (roTrackerParam) {
    localStorage.setItem(STORAGE_KEY_RO_TRACKER, roTrackerParam);
    updated = true;
  }

  if (updated) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function getStoredCredentials() {
  const dbUrl = localStorage.getItem(STORAGE_KEY_DB_URL) || '';
  const tracker = localStorage.getItem(STORAGE_KEY_TRACKER) || 'secrettrackerforRWacess';
  const roTracker = localStorage.getItem(STORAGE_KEY_RO_TRACKER) || 'secrettrackerforROacess';
  const isReadOnly = localStorage.getItem(STORAGE_KEY_IS_RO) === 'true' || tracker.endsWith('_ro');
  return { dbUrl, tracker, roTracker, isReadOnly };
}

// Data Persistence (localStorage)
function loadTripsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored trips:', err);
  }
  saveTripsToStorage([DEFAULT_TRIP], false);
  return [DEFAULT_TRIP];
}

function saveTripsToStorage(trips, markDirty = true) {
  state.trips = trips;
  localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(trips));
  if (markDirty) {
    localStorage.setItem(STORAGE_KEY_IS_DIRTY, 'true');
  }
}

function isLocalDirty() {
  return localStorage.getItem(STORAGE_KEY_IS_DIRTY) === 'true';
}

function getLastSyncTime() {
  const t = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  return t ? Number(t) : null;
}

// REST Sync Helpers (whisky_db_search pattern)
function getEndpointUrl(trackerName) {
  const { dbUrl } = getStoredCredentials();
  if (!dbUrl) return null;
  const baseUrl = dbUrl.replace(/\/+$/, '');
  return `${baseUrl}/trackers/trips/${encodeURIComponent(trackerName)}.json`;
}

async function pullFromCloud() {
  const { dbUrl, tracker } = getStoredCredentials();
  if (!dbUrl) {
    alert('Please configure your Firebase Database URL first.');
    openConfigModal();
    return;
  }

  state.isSyncing = true;
  renderApp();

  try {
    const url = getEndpointUrl(tracker);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (data && typeof data === 'object') {
      let tripsList = [];
      if (Array.isArray(data)) {
        tripsList = data.filter(Boolean);
      } else if (data.days || data.totalDays) {
        tripsList = [data];
      } else {
        tripsList = Object.values(data).filter(Boolean);
      }

      if (tripsList.length > 0) {
        saveTripsToStorage(tripsList, false);
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(Date.now()));
        localStorage.setItem(STORAGE_KEY_IS_DIRTY, 'false');
        alert('All trips pulled successfully from Firebase.');
      } else {
        alert('No trips found at tracker location.');
      }
    } else {
      alert('No data found at tracker location.');
    }
  } catch (err) {
    alert(`Pull failed: ${err.message}`);
  } finally {
    state.isSyncing = false;
    renderApp();
  }
}

async function pushToCloud() {
  const { dbUrl, tracker, roTracker, isReadOnly } = getStoredCredentials();
  if (!dbUrl) {
    alert('Please configure your Firebase Database URL first.');
    openConfigModal();
    return;
  }
  if (isReadOnly) {
    alert('Cannot push changes in read-only mode.');
    return;
  }

  state.isSyncing = true;
  renderApp();

  try {
    const tripsMap = {};
    state.trips.forEach((t) => {
      tripsMap[t.id] = t;
    });

    const primaryUrl = getEndpointUrl(tracker);
    const res = await fetch(primaryUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripsMap)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    // Auto-mirror to read-only tracker
    if (roTracker && roTracker !== tracker) {
      try {
        const roUrl = getEndpointUrl(roTracker);
        await fetch(roUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tripsMap)
        });
      } catch (mirrorErr) {
        console.warn('Failed to mirror to read-only tracker:', mirrorErr);
      }
    }

    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(Date.now()));
    localStorage.setItem(STORAGE_KEY_IS_DIRTY, 'false');
    alert('All trips pushed and synced to cloud.');
  } catch (err) {
    alert(`Push failed: ${err.message}`);
  } finally {
    state.isSyncing = false;
    renderApp();
  }
}

// UI Rendering Logic
const root = document.getElementById('root');

function renderApp() {
  if (!root) return;

  const { isReadOnly, dbUrl } = getStoredCredentials();
  const dirty = isLocalDirty();
  const lastSync = getLastSyncTime();
  const formattedSync = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  if (!state.activeTripId) {
    renderHomeView({ isReadOnly, dbUrl, dirty, formattedSync });
  } else {
    renderTripView({ isReadOnly, dbUrl, dirty, formattedSync });
  }
}

// 1. Home Screen
function renderHomeView({ isReadOnly, dbUrl, dirty, formattedSync }) {
  let tripsHtml = '';
  state.trips.forEach((trip) => {
    const range = formatDateRange(trip.startDate, trip.totalDays);
    tripsHtml += `
      <div class="trip-card" data-trip-id="${trip.id}">
        <div class="trip-card-header">
          <h3 class="trip-card-title">${escapeHtml(trip.title)}</h3>
          <span class="badge-pill">${trip.totalDays} days</span>
        </div>
        <div class="trip-card-dates">
          ${getSvgIcon('calendar', 14, 'var(--text-secondary)')}
          <span>${range}</span>
        </div>
        <div class="trip-card-footer">
          <span class="card-action-link">View Itinerary &rsaquo;</span>
          ${
            state.trips.length > 1
              ? `<button type="button" class="card-delete-btn" data-delete-id="${trip.id}" title="Delete trip">Delete</button>`
              : ''
          }
        </div>
      </div>
    `;
  });

  root.innerHTML = `
    <div class="app-container">
      <div class="top-bar">
        <span class="brand-badge">Vacation Planner</span>
        <div class="top-actions">
          <button type="button" class="icon-btn" id="configBtn">Config</button>
        </div>
      </div>

      <div class="home-view">
        <h1 class="home-title">Your Vacations</h1>
        <p class="home-subtitle">Plan, track, and navigate travel itineraries offline.</p>

        <button type="button" class="primary-btn" id="planTripBtn">
          ${getSvgIcon('plus', 16, '#09090b', 2.5)}
          Plan New Trip
        </button>

        <div>
          <span style="font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.08em; font-weight: 600;">
            Upcoming & Planned Trips (${state.trips.length})
          </span>
          <div class="trips-list" style="margin-top: 10px;">
            ${tripsHtml}
          </div>
        </div>
      </div>

      ${renderFooterBar({ isReadOnly, dbUrl, dirty, formattedSync })}
    </div>
  `;

  attachHomeListeners();
}

function attachHomeListeners() {
  document.getElementById('planTripBtn')?.addEventListener('click', openNewTripModal);
  document.getElementById('configBtn')?.addEventListener('click', openConfigModal);

  document.querySelectorAll('.trip-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-delete-btn')) return;
      const tripId = card.getAttribute('data-trip-id');
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        state.activeTripId = tripId;
        state.activeDayNumber = trip.initialDayNumber || 1;
        renderApp();
      }
    });
  });

  document.querySelectorAll('.card-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tripId = btn.getAttribute('data-delete-id');
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        openDeleteModal(trip);
      }
    });
  });

  attachFooterListeners();
}

// 2. Trip Itinerary Screen
function renderTripView({ isReadOnly, dbUrl, dirty, formattedSync }) {
  const trip = state.trips.find((t) => t.id === state.activeTripId);
  if (!trip) {
    state.activeTripId = null;
    renderApp();
    return;
  }

  const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
  const currentDate = getDateForDay(trip.startDate, activeDay.dayNumber);
  const formattedFullDate = formatFullDate(currentDate);

  const initialDate = getDateForDay(trip.startDate, trip.initialDayNumber || 1);
  const formattedInitialShortDate = formatShortDate(initialDate);
  const isToday = state.activeDayNumber === (trip.initialDayNumber || 1);

  // Progress Bar segments
  let segmentsHtml = '';
  for (let i = 1; i <= trip.totalDays; i++) {
    segmentsHtml += `<span class="progress-segment ${i <= state.activeDayNumber ? 'active' : ''}"></span>`;
  }

  // Timeline events
  let timelineHtml = '';
  activeDay.items.forEach((item, index) => {
    const isFirst = index === 0;
    const isLast = index === activeDay.items.length - 1;
    timelineHtml += renderTimelineItem(item, isFirst, isLast);
  });

  // Idea pool
  const activeIdeas = trip.pool.filter((idea) => {
    if (!idea.applicableDays || idea.applicableDays.length === 0) return true;
    return idea.applicableDays.includes(state.activeDayNumber);
  });

  let poolHtml = '';
  activeIdeas.forEach((idea) => {
    let tagsHtml = '';
    idea.tags.forEach((tag) => {
      tagsHtml += `
        <span class="tag ${tag.variant || 'neutral'}">
          ${tag.icon ? getSvgIcon(tag.icon, 11, 'currentColor') : ''}
          ${escapeHtml(tag.text)}
        </span>
      `;
    });

    poolHtml += `
      <li class="pool-item">
        ${idea.icon ? getSvgIcon(idea.icon, 20, 'var(--text-secondary)') : ''}
        <div class="pool-item-content">
          <span class="pool-item-title">${escapeHtml(idea.title)}</span>
          <div class="tags-container">${tagsHtml}</div>
        </div>
        ${
          !isReadOnly
            ? `<button type="button" class="add-btn" data-add-idea-id="${idea.id}" title="Add to today">${getSvgIcon('plus', 18, 'var(--accent-blue)', 2.25)}</button>`
            : ''
        }
      </li>
    `;
  });

  root.innerHTML = `
    <div class="app-container">
      <header class="trip-header">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <button type="button" class="back-to-trips-btn" id="backToTripsBtn">&lsaquo; All Trips</button>
          <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
            <span>${escapeHtml(trip.title)}</span>
            <span style="font-weight: 600; color: var(--text-body);">${state.activeDayNumber}/${trip.totalDays}</span>
          </div>
        </div>

        <div class="progress-bar">${segmentsHtml}</div>

        <div class="date-title-row">
          <h1 class="date-title">${formattedFullDate}</h1>
          <div class="nav-arrows">
            <button type="button" class="arrow-btn" id="prevDayBtn" ${state.activeDayNumber <= 1 ? 'disabled' : ''} aria-label="Previous day">
              ${getSvgIcon('chevron-left', 20, '#d4d4d8', 2.25)}
            </button>
            <button type="button" class="arrow-btn" id="nextDayBtn" ${state.activeDayNumber >= trip.totalDays ? 'disabled' : ''} aria-label="Next day">
              ${getSvgIcon('chevron-right', 20, '#d4d4d8', 2.25)}
            </button>
          </div>
        </div>

        ${
          !isToday
            ? `<button type="button" class="back-to-today-btn" id="backToTodayBtn">
                ${getSvgIcon('chevron-left', 15, 'var(--accent-blue)', 2.25)}
                Back to today · ${formattedInitialShortDate}
              </button>`
            : ''
        }

        <div class="route-row">
          <span class="route-title">${escapeHtml(activeDay.routeTitle)}</span>
          <button type="button" class="icon-btn" id="datesModalBtn">
            ${getSvgIcon('calendar', 13, 'var(--text-muted)')}
            Dates & Days
          </button>
        </div>
      </header>

      <ol class="timeline-list">${timelineHtml}</ol>

      <section class="pool-section">
        <div class="pool-header">
          <h2 class="pool-title">Pool for today</h2>
          <span class="pool-count">${activeIdeas.length}</span>
        </div>
        ${activeIdeas.length === 0 ? `<p style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">No candidate ideas for today.</p>` : `<ul class="pool-list">${poolHtml}</ul>`}
      </section>

      ${renderFooterBar({ isReadOnly, dbUrl, dirty, formattedSync })}
    </div>
  `;

  attachTripListeners(trip);
}

function renderTimelineItem(item, isFirst, isLast) {
  let timeClass = 'simple';
  let dotClass = 'simple';
  let contentHtml = '';

  if (item.type === 'alert') {
    timeClass = 'alert';
    dotClass = 'alert';
    contentHtml = `
      <div class="alert-card">
        ${getSvgIcon('clock', 18, 'var(--accent-alert)')}
        <span class="alert-text">${escapeHtml(item.label)}</span>
      </div>
    `;
  } else if (item.type === 'transport') {
    timeClass = 'card';
    dotClass = item.mode === 'flight' ? 'flight' : item.mode === 'ferry' ? 'ferry' : 'drive';

    contentHtml = `
      <div class="transport-card">
        <div class="transport-header" style="color: ${item.badgeColor || 'var(--accent-blue)'}">
          ${escapeHtml(item.badgeLabel)}
        </div>
        <div class="transport-route">
          <div class="location-block">
            <span class="${item.from.label.length <= 4 ? 'location-code' : 'location-city'}">${escapeHtml(item.from.label)}</span>
            ${item.from.time ? `<span class="location-time">${escapeHtml(item.from.time)}</span>` : ''}
          </div>
          <div class="connector-line">
            <div class="dashed-track"></div>
            <div class="connector-icon">
              ${
                item.mode === 'flight'
                  ? getSvgIcon('plane', 17, item.badgeColor || '#6cb8ff')
                  : item.mode === 'ferry'
                  ? getSvgIcon('ferry', 18, item.badgeColor || '#5ed3c4')
                  : getSvgIcon('car', 18, item.badgeColor || '#d4d4d8')
              }
            </div>
          </div>
          <div class="location-block right">
            <span class="${item.to.label.length <= 4 ? 'location-code' : 'location-city'}">${escapeHtml(item.to.label)}</span>
            ${item.to.time ? `<span class="location-time">${escapeHtml(item.to.time)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  } else if (item.type === 'venue') {
    const isCard = Boolean(item.subtitle || item.timeWindow);
    timeClass = isCard ? 'card' : 'simple';
    dotClass = isCard ? 'venue-card' : 'simple';

    if (isCard) {
      contentHtml = `
        <div class="venue-card">
          ${getSvgIcon(item.icon || 'pin', 20, 'var(--text-secondary)')}
          <div class="venue-details">
            <span class="venue-title">${escapeHtml(item.title)}</span>
            ${item.subtitle ? `<span class="venue-subtitle">${escapeHtml(item.subtitle)}</span>` : ''}
            ${
              item.timeWindow
                ? `<span class="time-window-badge">${getSvgIcon('clock', 11, 'var(--accent-blue)')} ${escapeHtml(item.timeWindow)}</span>`
                : ''
            }
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="simple-venue-item">
          ${getSvgIcon(item.icon || 'pin', 17, 'var(--text-secondary)')}
          <span class="venue-title">${escapeHtml(item.title)}</span>
        </div>
      `;
    }
  } else if (item.type === 'transit_chain') {
    timeClass = 'simple';
    dotClass = 'simple';
    let chainSteps = '';
    item.steps.forEach((step, idx) => {
      chainSteps += `
        <div class="transit-stop">
          <span class="transit-stop-ring"></span>
          <span class="transit-stop-name">${escapeHtml(step.stop)}</span>
          ${step.note ? `<span class="transit-stop-note">${escapeHtml(step.note)}</span>` : ''}
        </div>
      `;
      if (idx < item.steps.length - 1) {
        chainSteps += `
          <div class="transit-connector">
            <div class="transit-connector-line"></div>
            <div>
              ${
                step.lineBadge?.type === 'metro'
                  ? `<span class="metro-badge" style="background: ${step.lineBadge.bgColor}; color: ${step.lineBadge.textColor}"><span class="metro-circle" style="background: ${step.lineBadge.textColor}; color: ${step.lineBadge.bgColor}">${step.lineBadge.sublabel || 'M'}</span>${step.lineBadge.label}</span>`
                  : step.lineBadge?.type === 'bus'
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor}; color: ${step.lineBadge.textColor}"><span style="font-size: 13px;">🚌</span> ${step.lineBadge.label}</span>`
                  : ''
              }
            </div>
          </div>
        `;
      }
    });
    contentHtml = `<div class="transit-chain">${chainSteps}</div>`;
  }

  return `
    <li class="timeline-row">
      <div class="time-col ${timeClass}">${item.time || ''}</div>
      <div class="track-col">
        <div class="track-line ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}"></div>
        <div class="node-dot ${dotClass}"></div>
      </div>
      <div class="content-col ${isLast ? 'last' : ''}">${contentHtml}</div>
    </li>
  `;
}

function attachTripListeners(trip) {
  document.getElementById('backToTripsBtn')?.addEventListener('click', () => {
    state.activeTripId = null;
    renderApp();
  });

  document.getElementById('prevDayBtn')?.addEventListener('click', () => {
    if (state.activeDayNumber > 1) {
      state.activeDayNumber--;
      renderApp();
    }
  });

  document.getElementById('nextDayBtn')?.addEventListener('click', () => {
    if (state.activeDayNumber < trip.totalDays) {
      state.activeDayNumber++;
      renderApp();
    }
  });

  document.getElementById('backToTodayBtn')?.addEventListener('click', () => {
    state.activeDayNumber = trip.initialDayNumber || 1;
    renderApp();
  });

  document.getElementById('datesModalBtn')?.addEventListener('click', () => openDatesModal(trip));

  // Idea promotion
  document.querySelectorAll('[data-add-idea-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ideaId = btn.getAttribute('data-add-idea-id');
      const idea = trip.pool.find((i) => i.id === ideaId);
      if (!idea) return;

      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber);
      if (!activeDay) return;

      const timeTag = idea.tags.find((t) => t.icon === 'clock' || /^\d{1,2}:\d{2}/.test(t.text));
      const suggestedTime = timeTag ? timeTag.text.split('–')[0].trim() : undefined;

      activeDay.items.push({
        id: `event-${Date.now()}`,
        type: 'venue',
        time: suggestedTime,
        title: idea.title,
        icon: idea.icon || 'pin'
      });

      trip.pool = trip.pool.filter((i) => i.id !== idea.id);
      saveTripsToStorage(state.trips, true);
      renderApp();
    });
  });

  attachFooterListeners();
}

// 3. Footer Status Bar
function renderFooterBar({ isReadOnly, dbUrl, dirty, formattedSync }) {
  return `
    <footer class="footer-bar">
      ${
        dbUrl
          ? `
          <div class="sync-bar">
            <div class="sync-status-indicator">
              <span class="dot ${dirty ? 'dirty' : isReadOnly ? 'readonly' : 'online'}"></span>
              <span>${dirty ? '⚠️ Unsaved local changes' : `Synced: ${formattedSync}`}</span>
            </div>
            <div class="sync-btns">
              <button type="button" class="icon-btn" id="pullBtn" ${state.isSyncing ? 'disabled' : ''}>⬇ Pull</button>
              ${!isReadOnly ? `<button type="button" class="icon-btn ${dirty ? 'badge-pill' : ''}" id="pushBtn" ${state.isSyncing ? 'disabled' : ''}>⬆ Push</button>` : ''}
            </div>
          </div>
        `
          : ''
      }
      <div class="footer-meta-row">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="dot ${dirty ? 'dirty' : dbUrl ? (isReadOnly ? 'readonly' : 'online') : ''}"></span>
          <span>${dbUrl ? (isReadOnly ? 'Firebase (Read Only)' : 'Firebase (Read/Write)') : 'Local Offline Mode'}</span>
        </div>
        <button type="button" style="text-decoration: underline; color: var(--text-muted); cursor: pointer;" id="footerConfigBtn">Settings</button>
      </div>
    </footer>
  `;
}

function attachFooterListeners() {
  document.getElementById('pullBtn')?.addEventListener('click', pullFromCloud);
  document.getElementById('pushBtn')?.addEventListener('click', pushToCloud);
  document.getElementById('footerConfigBtn')?.addEventListener('click', openConfigModal);
}

// 4. Plan New Trip Modal (supports Duration in Days OR Choose End Date)
function openNewTripModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'newTripModal';

  let dateMode = 'duration';
  let startDate = formatToIsoDate(new Date());
  let daysCount = 7;
  let endDate = getEndDateIso(startDate, daysCount);

  function updatePreview() {
    const previewEl = modal.querySelector('#previewDates');
    if (previewEl) {
      const parsed = parseLocalDate(startDate);
      previewEl.innerHTML = `Starts ${formatFullDate(parsed)}<br>Dates: ${formatDateRange(startDate, daysCount)} (${daysCount} days total)`;
    }
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <h3 class="modal-heading">Plan New Vacation</h3>
      <form id="newTripForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="newTripTitle">Vacation Title</label>
          <input class="text-input" id="newTripTitle" placeholder="e.g. Scottish Highlands & Islay" required autofocus />
        </div>

        <div class="form-group">
          <label class="form-label" for="newTripStartText">Start Date (DD.MM.YYYY)</label>
          <div class="date-input-group">
            <input type="text" class="text-input" id="newTripStartText" value="${isoToDDMMYYYY(startDate)}" placeholder="DD.MM.YYYY" required maxLength="10" />
            <button type="button" class="calendar-trigger-btn" id="startCalBtn">${getSvgIcon('calendar', 16, 'currentColor')}</button>
            <input type="date" class="hidden-date-native" id="startNativePicker" value="${startDate}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Planning Option</label>
          <div class="mode-switcher">
            <button type="button" class="mode-option active" id="modeDurationBtn">Duration in Days</button>
            <button type="button" class="mode-option" id="modeEndDateBtn">Choose End Date</button>
          </div>
        </div>

        <div class="form-group" id="durationGroup">
          <label class="form-label" for="newTripDays">Duration (Days)</label>
          <input type="number" class="text-input" id="newTripDays" min="1" max="60" value="${daysCount}" required />
        </div>

        <div class="form-group" id="endDateGroup" style="display: none;">
          <label class="form-label" for="newTripEndText">End Date (DD.MM.YYYY)</label>
          <div class="date-input-group">
            <input type="text" class="text-input" id="newTripEndText" value="${isoToDDMMYYYY(endDate)}" placeholder="DD.MM.YYYY" maxLength="10" />
            <button type="button" class="calendar-trigger-btn" id="endCalBtn">${getSvgIcon('calendar', 16, 'currentColor')}</button>
            <input type="date" class="hidden-date-native" id="endNativePicker" value="${endDate}" min="${startDate}" />
          </div>
        </div>

        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-green); line-height: 1.4;" id="previewDates"></div>

        <div class="dialog-actions">
          <button type="button" class="btn-secondary" id="cancelNewTripBtn">Cancel</button>
          <button type="submit" class="btn-secondary" style="background: var(--accent-blue); color: #09090b; border: none;">Create Trip</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  updatePreview();

  const startTextInput = modal.querySelector('#newTripStartText');
  const startNativePicker = modal.querySelector('#startNativePicker');
  const endTextInput = modal.querySelector('#newTripEndText');
  const endNativePicker = modal.querySelector('#endNativePicker');
  const durationInput = modal.querySelector('#newTripDays');

  // Start Date handlers
  startTextInput.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/[/\\-]/g, '.');
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8 && !raw.includes('.')) {
      raw = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
      e.target.value = raw;
    }
    const iso = ddmmyyyyToIso(raw);
    if (iso) {
      startDate = iso;
      startNativePicker.value = iso;
      if (dateMode === 'duration') {
        endDate = getEndDateIso(startDate, daysCount);
        endTextInput.value = isoToDDMMYYYY(endDate);
        endNativePicker.value = endDate;
      } else {
        daysCount = getDurationFromDates(startDate, endDate);
        durationInput.value = daysCount;
      }
      updatePreview();
    }
  });

  startTextInput.addEventListener('blur', (e) => {
    const iso = ddmmyyyyToIso(e.target.value);
    if (iso) {
      e.target.value = isoToDDMMYYYY(iso);
    }
  });

  modal.querySelector('#startCalBtn').addEventListener('click', () => {
    try {
      startNativePicker.showPicker ? startNativePicker.showPicker() : startNativePicker.click();
    } catch {
      startNativePicker.click();
    }
  });

  startNativePicker.addEventListener('change', (e) => {
    if (e.target.value) {
      startDate = e.target.value;
      startTextInput.value = isoToDDMMYYYY(startDate);
      if (dateMode === 'duration') {
        endDate = getEndDateIso(startDate, daysCount);
        endTextInput.value = isoToDDMMYYYY(endDate);
        endNativePicker.value = endDate;
      } else {
        daysCount = getDurationFromDates(startDate, endDate);
        durationInput.value = daysCount;
      }
      updatePreview();
    }
  });

  // Mode Toggles
  modal.querySelector('#modeDurationBtn').addEventListener('click', () => {
    dateMode = 'duration';
    modal.querySelector('#modeDurationBtn').classList.add('active');
    modal.querySelector('#modeEndDateBtn').classList.remove('active');
    modal.querySelector('#durationGroup').style.display = 'flex';
    modal.querySelector('#endDateGroup').style.display = 'none';
  });

  modal.querySelector('#modeEndDateBtn').addEventListener('click', () => {
    dateMode = 'endDate';
    modal.querySelector('#modeEndDateBtn').classList.add('active');
    modal.querySelector('#modeDurationBtn').classList.remove('active');
    modal.querySelector('#durationGroup').style.display = 'none';
    modal.querySelector('#endDateGroup').style.display = 'flex';
  });

  // Duration input
  durationInput.addEventListener('input', (e) => {
    daysCount = Math.max(1, parseInt(e.target.value, 10) || 1);
    endDate = getEndDateIso(startDate, daysCount);
    endTextInput.value = isoToDDMMYYYY(endDate);
    endNativePicker.value = endDate;
    updatePreview();
  });

  // End Date input
  endTextInput.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/[/\\-]/g, '.');
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8 && !raw.includes('.')) {
      raw = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
      e.target.value = raw;
    }
    const iso = ddmmyyyyToIso(raw);
    if (iso) {
      endDate = iso;
      endNativePicker.value = iso;
      daysCount = getDurationFromDates(startDate, endDate);
      durationInput.value = daysCount;
      updatePreview();
    }
  });

  modal.querySelector('#endCalBtn').addEventListener('click', () => {
    try {
      endNativePicker.showPicker ? endNativePicker.showPicker() : endNativePicker.click();
    } catch {
      endNativePicker.click();
    }
  });

  endNativePicker.addEventListener('change', (e) => {
    if (e.target.value) {
      endDate = e.target.value;
      endTextInput.value = isoToDDMMYYYY(endDate);
      daysCount = getDurationFromDates(startDate, endDate);
      durationInput.value = daysCount;
      updatePreview();
    }
  });

  // Form submit
  modal.querySelector('#newTripForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = modal.querySelector('#newTripTitle').value.trim();
    if (!title || !startDate || daysCount <= 0) return;

    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        id: `day-${i}`,
        dayNumber: i,
        routeTitle: `Day ${i}`,
        items: []
      });
    }

    const newTrip = {
      id: `trip-${Date.now()}`,
      title,
      startDate,
      totalDays: daysCount,
      initialDayNumber: 1,
      days,
      pool: []
    };

    state.trips.push(newTrip);
    saveTripsToStorage(state.trips, true);
    state.activeTripId = newTrip.id;
    state.activeDayNumber = 1;

    modal.remove();
    renderApp();
  });

  modal.querySelector('#cancelNewTripBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 5. GitHub-Style Retype-to-Delete Modal
function openDeleteModal(trip) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal-dialog">
      <h3 class="modal-heading">Delete Vacation Plan</h3>
      <div class="danger-box">
        This action <span class="danger-highlight">cannot be undone</span>. This will permanently delete the vacation <strong>"${escapeHtml(
          trip.title
        )}"</strong>, all of its scheduled timeline events, and candidate ideas.
      </div>

      <div class="form-group">
        <label class="form-label" for="confirmDeleteInput">
          To confirm deletion, please type <span style="font-family: var(--font-mono); color: var(--text-primary); background: var(--bg-canvas); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-card);">${escapeHtml(
            trip.title
          )}</span> below:
        </label>
        <input class="text-input" id="confirmDeleteInput" placeholder="${escapeHtml(trip.title)}" autofocus />
      </div>

      <div class="dialog-actions">
        <button type="button" class="btn-secondary" id="cancelDeleteBtn">Cancel</button>
        <button type="button" class="btn-danger" id="confirmDeleteBtn" disabled>Delete this vacation</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('#confirmDeleteInput');
  const deleteBtn = modal.querySelector('#confirmDeleteBtn');

  input.addEventListener('input', () => {
    deleteBtn.disabled = input.value.trim() !== trip.title.trim();
  });

  deleteBtn.addEventListener('click', () => {
    if (input.value.trim() !== trip.title.trim()) return;
    state.trips = state.trips.filter((t) => t.id !== trip.id);
    saveTripsToStorage(state.trips, true);
    modal.remove();
    renderApp();
  });

  modal.querySelector('#cancelDeleteBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 6. Dates & Days Modal (Shift Start Date, Add/Remove Days)
function openDatesModal(trip) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  let shiftStartDate = trip.startDate;

  function renderModalContent() {
    let daysListHtml = '';
    trip.days.forEach((day) => {
      const date = getDateForDay(trip.startDate, day.dayNumber);
      daysListHtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg-canvas); border: 1px solid var(--border-card); border-radius: 8px;">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Day ${day.dayNumber}: ${escapeHtml(day.routeTitle)}</div>
            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${formatFullDate(date)}</div>
          </div>
          ${
            trip.days.length > 1
              ? `<button type="button" class="card-delete-btn" data-remove-day="${day.dayNumber}">Delete</button>`
              : ''
          }
        </div>
      `;
    });

    modal.innerHTML = `
      <div class="modal-dialog">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 class="modal-heading">Manage Dates & Days</h3>
          <button type="button" style="color: var(--text-muted); cursor: pointer;" id="closeDatesModalBtn">&#10005; Done</button>
        </div>

        <div style="padding-bottom: 12px; border-bottom: 1px solid var(--border-card); display: flex; flex-direction: column; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
            Shift Start Date (DD.MM.YYYY)
          </span>
          <div class="date-input-group">
            <input type="text" class="text-input" id="shiftDateText" value="${isoToDDMMYYYY(shiftStartDate)}" placeholder="DD.MM.YYYY" maxLength="10" />
            <button type="button" class="calendar-trigger-btn" id="shiftCalBtn">${getSvgIcon('calendar', 16, 'currentColor')}</button>
            <input type="date" class="hidden-date-native" id="shiftNativePicker" value="${shiftStartDate}" />
          </div>
          <button type="button" class="btn-secondary" id="applyShiftBtn" style="background: var(--accent-blue); color: #09090b; border: none; align-self: flex-start;">Apply Shift</button>
        </div>

        <div style="padding-bottom: 12px; border-bottom: 1px solid var(--border-card); display: flex; flex-direction: column; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
            Add New Day
          </span>
          <div style="display: flex; gap: 8px;">
            <input type="text" class="text-input" id="newDayTitleInput" placeholder="Day ${trip.days.length + 1} route or title" style="flex: 1;" />
            <button type="button" class="btn-secondary" id="addNewDayBtn">+ Add Day</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
            Itinerary Days (${trip.days.length})
          </span>
          <div style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;">
            ${daysListHtml}
          </div>
        </div>
      </div>
    `;

    attachDatesModalListeners();
  }

  function attachDatesModalListeners() {
    modal.querySelector('#closeDatesModalBtn').addEventListener('click', () => {
      modal.remove();
      renderApp();
    });

    const shiftText = modal.querySelector('#shiftDateText');
    const shiftPicker = modal.querySelector('#shiftNativePicker');

    shiftText.addEventListener('input', (e) => {
      let raw = e.target.value.replace(/[/\\-]/g, '.');
      const digits = raw.replace(/\D/g, '');
      if (digits.length === 8 && !raw.includes('.')) {
        raw = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
        e.target.value = raw;
      }
      const iso = ddmmyyyyToIso(raw);
      if (iso) {
        shiftStartDate = iso;
        shiftPicker.value = iso;
      }
    });

    shiftText.addEventListener('blur', (e) => {
      const iso = ddmmyyyyToIso(e.target.value);
      if (iso) e.target.value = isoToDDMMYYYY(iso);
    });

    modal.querySelector('#shiftCalBtn').addEventListener('click', () => {
      try {
        shiftPicker.showPicker ? shiftPicker.showPicker() : shiftPicker.click();
      } catch {
        shiftPicker.click();
      }
    });

    shiftPicker.addEventListener('change', (e) => {
      if (e.target.value) {
        shiftStartDate = e.target.value;
        shiftText.value = isoToDDMMYYYY(shiftStartDate);
      }
    });

    modal.querySelector('#applyShiftBtn').addEventListener('click', () => {
      if (shiftStartDate && shiftStartDate !== trip.startDate) {
        trip.startDate = shiftStartDate;
        saveTripsToStorage(state.trips, true);
        renderModalContent();
      }
    });

    modal.querySelector('#addNewDayBtn').addEventListener('click', () => {
      const titleInput = modal.querySelector('#newDayTitleInput');
      const title = titleInput.value.trim() || `Day ${trip.days.length + 1}`;
      const nextNum = trip.days.length + 1;
      trip.days.push({
        id: `day-${nextNum}-${Date.now()}`,
        dayNumber: nextNum,
        routeTitle: title,
        items: []
      });
      trip.totalDays = trip.days.length;
      saveTripsToStorage(state.trips, true);
      renderModalContent();
    });

    modal.querySelectorAll('[data-remove-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dayNum = Number(btn.getAttribute('data-remove-day'));
        const day = trip.days.find((d) => d.dayNumber === dayNum);
        if (day && day.items.length > 0) {
          if (!confirm(`Day ${dayNum} has ${day.items.length} scheduled events. Delete this day?`)) {
            return;
          }
        }
        trip.days = trip.days.filter((d) => d.dayNumber !== dayNum).map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
        trip.totalDays = trip.days.length;
        if (state.activeDayNumber > trip.totalDays) {
          state.activeDayNumber = trip.totalDays;
        }
        saveTripsToStorage(state.trips, true);
        renderModalContent();
      });
    });
  }

  document.body.appendChild(modal);
  renderModalContent();

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      renderApp();
    }
  });
}

// 7. Config Modal (Credentials & Shareable Link)
function openConfigModal() {
  const { dbUrl, tracker, roTracker, isReadOnly } = getStoredCredentials();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  function getShareLink(readOnly) {
    if (!dbUrl) return window.location.href;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('db', dbUrl);
    url.searchParams.set('tracker', readOnly ? roTracker : tracker);
    if (readOnly) url.searchParams.set('ro', 'true');
    return url.toString();
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <h3 class="modal-heading">Firebase Access & Sync</h3>
      <p style="margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.4;">
        Data is synchronized with Firebase RTDB under <code>trackers/trips/{tracker}</code>. You can configure your Read/Write tracker and a Read-Only tracker for friends.
      </p>

      <form id="configForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cfgDbUrl">Firebase RTDB URL</label>
          <input class="text-input" id="cfgDbUrl" placeholder="https://your-project-default-rtdb.europe-west1.firebasedatabase.app" value="${escapeHtml(dbUrl)}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="cfgTracker">Active Tracker (Key)</label>
          <input class="text-input" id="cfgTracker" placeholder="secrettrackerforRWacess" value="${escapeHtml(tracker)}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="cfgRoTracker">Read-Only Tracker (Optional)</label>
          <input class="text-input" id="cfgRoTracker" placeholder="secrettrackerforROacess" value="${escapeHtml(roTracker)}" />
        </div>

        <label style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); cursor: pointer;">
          <input type="checkbox" id="cfgIsRo" ${isReadOnly ? 'checked' : ''} />
          Force Read-Only mode on this device
        </label>

        ${
          dbUrl
            ? `
          <div style="background: var(--bg-canvas); padding: 12px; border-radius: 8px; border: 1px solid var(--border-card); display: flex; flex-direction: column; gap: 8px;">
            <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
              Quick Share Links
            </span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-secondary" id="copyRoLinkBtn">Copy Read-Only Link (Friends)</button>
              <button type="button" class="btn-secondary" id="copyRwLinkBtn">Copy Full Link</button>
            </div>
            <span id="copyLinkFeedback" style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-green); display: none;">✓ Link copied to clipboard!</span>
          </div>
        `
            : ''
        }

        <div class="dialog-actions">
          <button type="button" class="btn-secondary" id="resetMockDataBtn" style="color: var(--accent-alert); border-color: rgba(255, 107, 94, 0.4); margin-right: auto;">Reset Sample Data</button>
          <button type="button" class="btn-secondary" id="cancelConfigBtn">Close</button>
          <button type="submit" class="btn-secondary" style="background: var(--accent-blue); color: #09090b; border: none;">Save</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#configForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newDb = modal.querySelector('#cfgDbUrl').value.trim();
    const newTracker = modal.querySelector('#cfgTracker').value.trim() || 'secrettrackerforRWacess';
    const newRoTracker = modal.querySelector('#cfgRoTracker').value.trim() || 'secrettrackerforROacess';
    const newIsRo = modal.querySelector('#cfgIsRo').checked;

    if (newDb) {
      localStorage.setItem(STORAGE_KEY_DB_URL, newDb);
    } else {
      localStorage.removeItem(STORAGE_KEY_DB_URL);
    }

    localStorage.setItem(STORAGE_KEY_TRACKER, newTracker);
    localStorage.setItem(STORAGE_KEY_RO_TRACKER, newRoTracker);
    localStorage.setItem(STORAGE_KEY_IS_RO, newIsRo ? 'true' : 'false');

    modal.remove();
    renderApp();
  });

  modal.querySelector('#copyRoLinkBtn')?.addEventListener('click', async () => {
    const link = getShareLink(true);
    await navigator.clipboard.writeText(link);
    const fb = modal.querySelector('#copyLinkFeedback');
    if (fb) {
      fb.style.display = 'block';
      setTimeout(() => (fb.style.display = 'none'), 2500);
    }
  });

  modal.querySelector('#copyRwLinkBtn')?.addEventListener('click', async () => {
    const link = getShareLink(false);
    await navigator.clipboard.writeText(link);
    const fb = modal.querySelector('#copyLinkFeedback');
    if (fb) {
      fb.style.display = 'block';
      setTimeout(() => (fb.style.display = 'none'), 2500);
    }
  });

  modal.querySelector('#resetMockDataBtn').addEventListener('click', () => {
    if (confirm('Reset trips and ideas back to reference mockups?')) {
      saveTripsToStorage([DEFAULT_TRIP], false);
      modal.remove();
      renderApp();
    }
  });

  modal.querySelector('#cancelConfigBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Security Escape Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// App Initialization
checkUrlCredentials();
state.trips = loadTripsFromStorage();
renderApp();
