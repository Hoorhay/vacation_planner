// Vacation Planner - Standalone Zero-Build App (whisky_db_search architecture)

const STORAGE_KEY_TRIPS = 'vacation_trips_data';
const STORAGE_KEY_DELETED = 'vacation_deleted_trips';
const STORAGE_KEY_DB_URL = 'vacation_firebase_rtdb_url';
const STORAGE_KEY_TRACKER = 'vacation_firebase_tracker';
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

// Time Input Masking (Digits-only input with automatic colon insertion)
function formatTimeMask(raw) {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Handle 3-digit shorthand (e.g. "930" -> "0930")
  if (digits.length === 3 && Number(digits[0]) >= 3) {
    digits = `0${digits}`;
  }
  digits = digits.slice(0, 4);

  if (digits.length === 1) {
    const d0 = Number(digits[0]);
    if (d0 >= 3) return `0${d0}:`;
    return digits;
  }

  if (digits.length === 2) {
    let hh = Number(digits);
    if (hh > 23) hh = 23;
    return `${String(hh).padStart(2, '0')}:`;
  }

  if (digits.length === 3) {
    let hh = Number(digits.slice(0, 2));
    if (hh > 23) hh = 23;
    let m0 = Number(digits[2]);
    if (m0 > 5) m0 = 5;
    return `${String(hh).padStart(2, '0')}:${m0}`;
  }

  let hh = Number(digits.slice(0, 2));
  if (hh > 23) hh = 23;
  let mm = Number(digits.slice(2, 4));
  if (mm > 59) mm = 59;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function attachTimeMask(input) {
  if (!input) return;
  input.setAttribute('inputmode', 'numeric');

  input.addEventListener('input', () => {
    input.value = formatTimeMask(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value.endsWith(':')) {
      e.preventDefault();
      input.value = input.value.slice(0, -2);
    }
  });

  input.addEventListener('blur', () => {
    const val = input.value.trim();
    if (!val) return;
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      input.value = '';
    } else if (digits.length === 1) {
      input.value = `0${digits}:00`;
    } else if (digits.length === 2) {
      const hh = Math.min(23, Number(digits));
      input.value = `${String(hh).padStart(2, '0')}:00`;
    } else if (digits.length === 3) {
      const hh = Math.min(23, Number(digits.slice(0, 2)));
      const mm = Math.min(59, Number(digits[2] + '0'));
      input.value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    } else {
      const hh = Math.min(23, Number(digits.slice(0, 2)));
      const mm = Math.min(59, Number(digits.slice(2, 4)));
      input.value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  });
}

function formatTimeRangeMask(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';

  if (digits.length <= 4) {
    return formatTimeMask(digits);
  }

  const startDigits = digits.slice(0, 4);
  const endDigits = digits.slice(4);

  const startFormatted = formatTimeMask(startDigits);
  const endFormatted = formatTimeMask(endDigits);

  return `${startFormatted}–${endFormatted}`;
}

function attachTimeRangeMask(input) {
  if (!input) return;
  input.setAttribute('inputmode', 'numeric');

  input.addEventListener('input', () => {
    input.value = formatTimeRangeMask(input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && (input.value.endsWith('–') || input.value.endsWith(':'))) {
      e.preventDefault();
      input.value = input.value.slice(0, -2);
    }
  });

  input.addEventListener('blur', () => {
    const val = input.value.trim();
    if (!val) return;
    const parts = val.split(/[–-]/);
    if (parts.length === 1) {
      const d = parts[0].replace(/\D/g, '');
      if (d.length >= 2) {
        input.value = formatTimeMask(d);
      }
    } else if (parts.length === 2) {
      const d1 = parts[0].replace(/\D/g, '');
      const d2 = parts[1].replace(/\D/g, '');
      if (d1 && d2) {
        input.value = `${formatTimeMask(d1)}–${formatTimeMask(d2)}`;
      }
    }
  });
}

function getTripDateStatus(trip) {
  if (!trip || !trip.startDate) {
    return { status: 'none', daysUntil: 0, todayDayNumber: null, todayDate: null };
  }
  const todayIso = formatToIsoDate(new Date());
  const todayDate = parseLocalDate(todayIso);
  const startDate = parseLocalDate(trip.startDate);
  const diffTime = todayDate.getTime() - startDate.getTime();
  const dayDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (dayDiff < 0) {
    return {
      status: 'future',
      daysUntil: -dayDiff,
      todayDayNumber: null,
      todayDate
    };
  } else if (dayDiff < trip.totalDays) {
    return {
      status: 'current',
      daysUntil: 0,
      todayDayNumber: dayDiff + 1,
      todayDate
    };
  } else {
    return {
      status: 'past',
      daysUntil: null,
      todayDayNumber: null,
      todayDate
    };
  }
}

function sortDayItems(items) {
  if (!items || !Array.isArray(items)) return [];
  const toMinutes = (t) => {
    if (!t) return null;
    const match = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  };

  const timedIndices = [];
  const timedItems = [];
  items.forEach((item, index) => {
    if (item && item.time && toMinutes(item.time) !== null) {
      timedIndices.push(index);
      timedItems.push(item);
    }
  });

  timedItems.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  const result = items.slice();
  timedIndices.forEach((origIndex, i) => {
    result[origIndex] = timedItems[i];
  });

  return result;
}

// Reference Mockup Seed (Prague ➔ Islay / Whisky Show 2027)
const DEMO_TRIP = {
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
        { id: 'sat-1', type: 'alert', time: '05:00', label: 'departure from hotel' },
        {
          id: 'sat-2',
          type: 'transit_chain',
          time: '05:15',
          steps: [
            { stop: 'Křižíkova', lineBadge: { type: 'metro', label: 'B', sublabel: 'M', bgColor: '#F5B731', textColor: '#1B1300' } },
            { stop: 'Zličín', lineBadge: { type: 'bus', label: '#100', borderColor: '#6CB8FF', textColor: '#6CB8FF' } },
            { stop: 'PRG T2', note: 'arrival ~6:15' }
          ]
        },
        { id: 'sat-3', type: 'alert', time: '07:30', label: 'gate closes' },
        {
          id: 'sat-4',
          type: 'transport',
          mode: 'flight',
          time: '08:00',
          badgeLabel: 'Flight · FR1014',
          badgeColor: '#6CB8FF',
          from: { label: 'PRG', time: '08:00' },
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
        { id: 'sun-1', type: 'alert', time: '09:00', label: 'leave for Kilchoman' },
        { id: 'sun-2', type: 'venue', time: '09:30', title: 'Kilchoman', subtitle: 'visit and brunch', icon: 'pin' },
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
      return `<svg ${common}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.5-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 12h14"/></svg>`;
    case 'ferry':
      return `<svg ${common}><path d="M3 16l2 4h14l2-4z"/><path d="M12 4v12"/><path d="M12 5l6 8h-6"/></svg>`;
    case 'pin':
      return `<svg ${common}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.25"/></svg>`;
    case 'bed':
      return `<svg ${common}><path d="M3 18V6"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.75"/></svg>`;
    case 'cocktail':
      return `<svg ${common}><path d="M6 4h12l-1.4 14.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.8 10.5h10.4"/></svg>`;
    case 'pizza':
      return `<svg ${common}><path d="M12 21L3.5 6.5A13.8 13.8 0 0 1 20.5 6.5L12 21z"/><path d="M5.5 8a11 11 0 0 1 13 0"/><circle cx="10" cy="12" r="1.5" fill="${color}"/><circle cx="14" cy="14" r="1.5" fill="${color}"/></svg>`;
    case 'castle':
      return `<svg ${common}><path d="M4 21V9l2-2v3h2V7l2-2v5h4V5l2 2v3h2V7l2 2v12H4z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/></svg>`;
    case 'trash':
      return `<svg ${common}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    case 'coffee':
      return `<svg ${common}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
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
    case 'pencil':
      return `<svg ${common}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
    case 'share':
      return `<svg ${common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
    case 'download':
      return `<svg ${common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    case 'copy':
      return `<svg ${common}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    case 'image':
      return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    case '!':
    case 'important':
    case 'alert-circle':
    case 'exclamation':
      return `<svg ${common}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    case 'refresh':
      return `<svg ${common}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
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

  if (updated) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function getStoredCredentials() {
  const dbUrl = localStorage.getItem(STORAGE_KEY_DB_URL) || '';
  const tracker = localStorage.getItem(STORAGE_KEY_TRACKER) || '';
  const isReadOnly = localStorage.getItem(STORAGE_KEY_IS_RO) === 'true' || (tracker && tracker.endsWith('_ro'));
  return { dbUrl, tracker, isReadOnly };
}

// Data Persistence (localStorage with entity timestamps & tombstones)
function loadTripsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let changed = false;
        parsed.forEach((t) => {
          if (!t.updatedAt) {
            t.updatedAt = Date.now() - 3600000;
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored trips:', err);
  }
  return [];
}

function loadDeletedTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordTripDeletion(tripId) {
  const deleted = loadDeletedTrips();
  deleted[tripId] = Date.now();
  localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(deleted));
}

function touchTrip(tripOrId) {
  const trip = typeof tripOrId === 'string'
    ? state.trips.find((t) => t.id === tripOrId)
    : tripOrId;
  if (trip) {
    trip.updatedAt = Date.now();
  }
}

function saveTripsToStorage(trips, markDirty = true) {
  const now = Date.now();
  trips.forEach((t) => {
    if (!t.updatedAt) t.updatedAt = now;
  });
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

// Smart Two-Way Merge Sync (Last-Write-Wins per Entity + Conditional PUT via ETag)
async function smartSyncWithCloud(showSuccessAlert = true) {
  const { dbUrl, tracker, isReadOnly } = getStoredCredentials();
  if (!dbUrl) {
    alert('Please configure your Firebase Database URL first.');
    openConfigModal();
    return;
  }
  if (!tracker) {
    alert('Please configure your Tracker Code in Settings first.');
    openConfigModal();
    return;
  }

  state.isSyncing = true;
  renderApp();

  try {
    const url = getEndpointUrl(tracker);

    // 1. Single Read (GET) with ETag
    const getRes = await fetch(url, { cache: 'no-store' });
    if (!getRes.ok && getRes.status !== 404) {
      throw new Error(`Cloud read failed: HTTP ${getRes.status} (${getRes.statusText})`);
    }

    const etag = getRes.headers.get('ETag') || null;
    const remoteData = getRes.status === 404 ? null : await getRes.json();

    // 2. Parse Remote Trips and Tombstones
    const remoteTripsMap = {};
    let remoteTombstones = {};

    if (remoteData && typeof remoteData === 'object') {
      if (remoteData._tombstones && typeof remoteData._tombstones === 'object') {
        remoteTombstones = remoteData._tombstones;
      }
      if (Array.isArray(remoteData)) {
        remoteData.filter(Boolean).forEach((t) => {
          if (t && t.id) remoteTripsMap[t.id] = t;
        });
      } else {
        Object.entries(remoteData).forEach(([key, val]) => {
          if (key !== '_tombstones' && val && typeof val === 'object' && val.id) {
            remoteTripsMap[val.id] = val;
          }
        });
      }
    }

    // 3. Reconcile Tombstones (deleted trips)
    const localTombstones = loadDeletedTrips();
    const mergedTombstones = { ...localTombstones };
    let tombstonesUpdatedRemotely = false;

    Object.entries(remoteTombstones).forEach(([id, time]) => {
      const remoteT = Number(time) || 0;
      const localT = Number(mergedTombstones[id]) || 0;
      if (remoteT > localT) {
        mergedTombstones[id] = remoteT;
      }
    });

    Object.entries(localTombstones).forEach(([id, time]) => {
      const localT = Number(time) || 0;
      const remoteT = Number(remoteTombstones[id]) || 0;
      if (localT > remoteT) {
        tombstonesUpdatedRemotely = true;
      }
    });

    // 4. Two-Way Merge per Trip (Last-Write-Wins based on updatedAt)
    const localTripsMap = {};
    state.trips.forEach((t) => {
      localTripsMap[t.id] = t;
    });

    const allTripIds = new Set([
      ...Object.keys(localTripsMap),
      ...Object.keys(remoteTripsMap)
    ]);

    const mergedTripsMap = {};
    let localNeedsSave = false;
    let remoteNeedsWrite = tombstonesUpdatedRemotely;
    let pushedCount = 0;
    let pulledCount = 0;

    allTripIds.forEach((id) => {
      const localTrip = localTripsMap[id];
      const remoteTrip = remoteTripsMap[id];
      const deletedAt = Number(mergedTombstones[id]) || 0;

      const localTime = localTrip ? (Number(localTrip.updatedAt) || 0) : 0;
      const remoteTime = remoteTrip ? (Number(remoteTrip.updatedAt) || 0) : 0;

      // Drop if deleted
      if (deletedAt >= localTime && deletedAt >= remoteTime) {
        if (localTrip) localNeedsSave = true;
        if (remoteTrip) remoteNeedsWrite = true;
        return;
      }

      if (localTrip && remoteTrip) {
        if (localTime > remoteTime) {
          mergedTripsMap[id] = localTrip;
          remoteNeedsWrite = true;
          pushedCount++;
        } else if (remoteTime > localTime) {
          mergedTripsMap[id] = remoteTrip;
          localNeedsSave = true;
          pulledCount++;
        } else {
          mergedTripsMap[id] = localTrip;
        }
      } else if (localTrip) {
        mergedTripsMap[id] = localTrip;
        remoteNeedsWrite = true;
        pushedCount++;
      } else if (remoteTrip) {
        mergedTripsMap[id] = remoteTrip;
        localNeedsSave = true;
        pulledCount++;
      }
    });

    // 5. Update local state
    const finalTrips = Object.values(mergedTripsMap);
    saveTripsToStorage(finalTrips, false);
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(mergedTombstones));

    // 6. Conditional Write to Cloud (Only when local has newer changes!)
    if (remoteNeedsWrite && !isReadOnly) {
      const payload = {
        ...mergedTripsMap,
        _tombstones: mergedTombstones
      };

      const putHeaders = { 'Content-Type': 'application/json' };
      if (etag && etag !== '*') {
        putHeaders['If-Match'] = etag;
      }

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: putHeaders,
        body: JSON.stringify(payload)
      });

      if (putRes.status === 412) {
        // Concurrency conflict: someone else updated cloud right now, retry
        console.warn('Sync concurrency conflict (412). Retrying merge...');
        state.isSyncing = false;
        return smartSyncWithCloud(showSuccessAlert);
      }

      if (!putRes.ok) {
        throw new Error(`Cloud update failed: HTTP ${putRes.status} (${putRes.statusText})`);
      }
    }

    // 7. Finalize & report
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(Date.now()));
    localStorage.setItem(STORAGE_KEY_IS_DIRTY, 'false');

    if (showSuccessAlert) {
      if (pushedCount > 0 && pulledCount > 0) {
        alert(`Sync complete: Sent ${pushedCount} update(s), received ${pulledCount} update(s).`);
      } else if (pushedCount > 0) {
        alert(`Sync complete: Sent ${pushedCount} update(s) to cloud.`);
      } else if (pulledCount > 0) {
        alert(`Sync complete: Received ${pulledCount} update(s) from cloud.`);
      } else {
        alert('Sync complete: All vacations are up to date.');
      }
    }
  } catch (err) {
    console.error('Smart sync error:', err);
    alert(`Sync error: ${err.message}`);
  } finally {
    state.isSyncing = false;
    renderApp();
  }
}

// UI Rendering Logic
const root = document.getElementById('root');

function autoSelectDefaultTrip() {
  if (!state.trips || state.trips.length === 0) {
    state.activeTripId = null;
    return;
  }

  // 1. Current in-progress trip
  const currentTrip = state.trips.find((t) => getTripDateStatus(t).status === 'current');
  if (currentTrip) {
    state.activeTripId = currentTrip.id;
    const status = getTripDateStatus(currentTrip);
    state.activeDayNumber = status.todayDayNumber;
    return;
  }

  // 2. Upcoming future trip
  const futureTrip = state.trips.find((t) => getTripDateStatus(t).status === 'future');
  if (futureTrip) {
    state.activeTripId = futureTrip.id;
    state.activeDayNumber = 1;
    return;
  }

  // 3. Fallback to first trip
  state.activeTripId = state.trips[0].id;
  state.activeDayNumber = 1;
}

function renderApp() {
  if (!root) return;

  const isDesktop = window.innerWidth >= 860;
  if (isDesktop && !state.activeTripId && state.trips.length > 0) {
    autoSelectDefaultTrip();
  }

  const { isReadOnly, dbUrl } = getStoredCredentials();
  const dirty = isLocalDirty();
  const lastSync = getLastSyncTime();
  const formattedSync = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  const activeTrip = state.trips.find((t) => t.id === state.activeTripId) || null;

  root.innerHTML = `
    <div class="app-container ${activeTrip ? 'has-active-trip' : 'no-active-trip'}">
      <!-- Left Sidebar: Vacations Overview -->
      <aside class="sidebar-pane">
        <div class="sidebar-content">
          ${renderSidebarView()}
        </div>
        ${renderFooterBar({ isReadOnly, dbUrl, dirty, formattedSync })}
      </aside>

      <!-- Center / Main Column: Active Vacation Itinerary -->
      <main class="content-pane">
        ${renderItineraryView(activeTrip, { isReadOnly, dbUrl, dirty, formattedSync })}
      </main>
    </div>
  `;

  attachHomeListeners();
  if (activeTrip) {
    attachTripListeners(activeTrip);
    const activePill = document.querySelector('.day-tab-pill.active');
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    }
  }
}

// 1. Left Sidebar: Vacations List
function renderSidebarView() {
  let tripsHtml = '';
  if (state.trips.length === 0) {
    tripsHtml = `
      <div style="padding: 40px 16px; text-align: center; background: var(--bg-card); border: 1.5px dashed var(--border-dashed); border-radius: var(--radius-card); display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <span style="font-size: 15px; font-weight: 600; color: var(--text-secondary);">No vacations planned yet</span>
        <span style="font-size: 13px; color: var(--text-muted);">Click "Plan New Trip" above to start your first itinerary.</span>
      </div>
    `;
  } else {
    state.trips.forEach((trip) => {
      const range = formatDateRange(trip.startDate, trip.totalDays);
      const isSelected = trip.id === state.activeTripId;
      tripsHtml += `
        <div class="trip-card ${isSelected ? 'active' : ''}" data-trip-id="${trip.id}">
          <div class="trip-card-header">
            <h3 class="trip-card-title">${escapeHtml(trip.title)}</h3>
            <span class="badge-pill">${trip.totalDays} days</span>
          </div>
          <div class="trip-card-dates">
            ${getSvgIcon('calendar', 14, 'var(--text-secondary)')}
            <span>${range}</span>
          </div>
          <div class="trip-card-footer">
            <span class="card-action-link">${isSelected ? 'Viewing Itinerary' : 'View Itinerary &rsaquo;'}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button type="button" class="card-delete-btn" data-share-id="${trip.id}" title="Share itinerary">Share</button>
              <button type="button" class="card-delete-btn" data-delete-id="${trip.id}" title="Delete trip">Delete</button>
            </div>
          </div>
        </div>
      `;
    });
  }

  return `
    <div class="home-view" style="margin-top: 4px;">
      <h1 class="home-title">Vacation Planner</h1>

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
  `;
}

function attachHomeListeners() {
  document.getElementById('planTripBtn')?.addEventListener('click', openNewTripModal);

  document.querySelectorAll('.trip-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-delete-btn') || e.target.closest('[data-share-id]')) return;
      const tripId = card.getAttribute('data-trip-id');
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        state.activeTripId = tripId;
        const status = getTripDateStatus(trip);
        state.activeDayNumber = status.status === 'current' ? status.todayDayNumber : 1;
        renderApp();
      }
    });
  });

  document.querySelectorAll('[data-share-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tripId = btn.getAttribute('data-share-id');
      const trip = state.trips.find((t) => t.id === tripId);
      if (trip) {
        const status = getTripDateStatus(trip);
        const dayNum = status.status === 'current' ? status.todayDayNumber : 1;
        openShareModal(trip, dayNum);
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

// 2. Main Center Column: Trip Itinerary Screen
function renderItineraryView(trip, { isReadOnly, dbUrl, dirty, formattedSync }) {
  if (!trip) {
    return `
      <div class="empty-itinerary-pane">
        <div class="empty-itinerary-card">
          ${getSvgIcon('calendar', 34, 'var(--accent-blue)')}
          <h2 style="font-size: 18px; font-weight: 600; margin: 4px 0 2px; color: var(--text-primary);">No Vacation Selected</h2>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.4;">
            Select a vacation from the left or click <strong>Plan New Trip</strong> to view and customize its itinerary.
          </p>
        </div>
      </div>
    `;
  }

  const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
  recalculatePoolFreeTags(trip, activeDay);
  const currentDate = getDateForDay(trip.startDate, activeDay.dayNumber);
  const formattedFullDate = formatFullDate(currentDate);

  const dateStatus = getTripDateStatus(trip);
  const isCurrentTrip = dateStatus.status === 'current';
  const isTodayActive = isCurrentTrip && state.activeDayNumber === dateStatus.todayDayNumber;
  const showBackToToday = isCurrentTrip && !isTodayActive;
  const isFutureTrip = dateStatus.status === 'future';

  // Progress Bar segments
  let segmentsHtml = '';
  for (let i = 1; i <= trip.totalDays; i++) {
    segmentsHtml += `<span class="progress-segment ${i <= state.activeDayNumber ? 'active' : ''}"></span>`;
  }

  // Day Pill Tabs
  let dayTabsHtml = '';
  trip.days.forEach((d) => {
    const isAct = d.dayNumber === state.activeDayNumber;
    const date = getDateForDay(trip.startDate, d.dayNumber);
    const shortDate = formatShortDate(date);
    dayTabsHtml += `
      <button type="button" class="day-tab-pill ${isAct ? 'active' : ''}" data-nav-day="${d.dayNumber}">
        <span class="day-tab-num">Day ${d.dayNumber}</span>
        <span class="day-tab-date">${shortDate}</span>
      </button>
    `;
  });

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
            ? `
            <div style="display: flex; align-items: center; gap: 4px;">
              <button type="button" class="icon-btn edit-idea-btn" data-edit-idea-id="${idea.id}" title="Edit idea" style="padding: 4px 6px;">
                ${getSvgIcon('pencil', 12, 'currentColor')}
              </button>
              <button type="button" class="icon-btn delete-idea-btn" data-delete-idea-id="${idea.id}" title="Delete idea" style="padding: 4px 6px;">
                &#10005;
              </button>
              <button type="button" class="add-btn" data-add-idea-id="${idea.id}" title="Add to today">${getSvgIcon('plus', 18, 'var(--accent-blue)', 2.25)}</button>
            </div>
          `
            : ''
        }
      </li>
    `;
  });

  return `
    <div>
      <header class="trip-header">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <button type="button" class="back-to-trips-btn" id="backToTripsBtn">&lsaquo; All Trips</button>
          <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-left: auto;">
            <span>${escapeHtml(trip.title)}</span>
            <span style="font-weight: 600; color: var(--text-body);">${state.activeDayNumber}/${trip.totalDays}</span>
          </div>
        </div>

        <div class="progress-bar">${segmentsHtml}</div>

        <div class="day-tabs-nav">${dayTabsHtml}</div>

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
          showBackToToday
            ? `<button type="button" class="back-to-today-btn" id="backToTodayBtn">
                ${getSvgIcon('chevron-left', 15, 'var(--accent-blue)', 2.25)}
                Back to today · ${formatShortDate(dateStatus.todayDate)}
              </button>`
            : isFutureTrip
            ? `<div class="trip-countdown-banner">
                ${getSvgIcon('clock', 14, 'var(--accent-blue)')}
                <span>Trip starts in ${dateStatus.daysUntil} ${dateStatus.daysUntil === 1 ? 'day' : 'days'}</span>
              </div>`
            : ''
        }

        <div class="route-row">
          <div class="route-title-wrap" id="routeTitleWrap">
            <span class="route-title" id="routeTitleText" title="${!isReadOnly ? 'Click to edit day title' : ''}">${escapeHtml(activeDay.routeTitle || `Day ${activeDay.dayNumber}`)}</span>
            ${
              !isReadOnly
                ? `<button type="button" class="icon-btn edit-route-btn" id="editRouteTitleBtn" title="Edit day description" aria-label="Edit day description">
                    ${getSvgIcon('pencil', 12, 'currentColor')}
                  </button>`
                : ''
            }
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="icon-btn" id="shareItineraryBtn" title="Share itinerary">
              ${getSvgIcon('share', 13, 'var(--text-muted)')}
              Share
            </button>
            <button type="button" class="icon-btn" id="datesModalBtn">
              ${getSvgIcon('calendar', 13, 'var(--text-muted)')}
              Dates & Days
            </button>
          </div>
        </div>
      </header>

      ${
        activeDay.items.length === 0
          ? `
          <div class="empty-day-state">
            <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">No events scheduled yet for Day ${activeDay.dayNumber}</span>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Add an activity, travel leg, or deadline, or promote from the pool below.</p>
            ${
              !isReadOnly
                ? `
              <button type="button" class="primary-btn" id="addEventEmptyBtn" style="height: 38px; font-size: 13px; max-width: 220px; margin-top: 4px;">
                ${getSvgIcon('plus', 14, '#09090b', 2.5)}
                Add Event
              </button>
            `
                : ''
            }
          </div>
        `
          : `
          <ol class="timeline-list">${timelineHtml}</ol>
          ${
            !isReadOnly
              ? `
            <div style="margin: 14px 0 28px;">
              <button type="button" class="add-event-btn" id="addEventBtn">
                ${getSvgIcon('plus', 13, 'var(--accent-blue)', 2.5)}
                <span>Add Event to Day ${activeDay.dayNumber}</span>
              </button>
            </div>
          `
              : ''
          }
        `
      }

      <section class="pool-section">
        <div class="pool-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 class="pool-title">Pool for today</h2>
            <span class="pool-count">${activeIdeas.length}</span>
          </div>
          ${
            !isReadOnly
              ? `
            <button type="button" class="icon-btn" id="addPoolIdeaBtn" style="color: var(--accent-blue); padding: 4px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
              ${getSvgIcon('plus', 12, 'var(--accent-blue)', 2.5)}
              Add Idea
            </button>
          `
              : ''
          }
        </div>
        ${activeIdeas.length === 0 ? `<p style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">No candidate ideas for today.</p>` : `<ul class="pool-list">${poolHtml}</ul>`}
      </section>

      ${renderFooterBar({ isReadOnly, dbUrl, dirty, formattedSync })}
    </div>
  `;
}

function renderTimelineItem(item, isFirst, isLast) {
  let timeClass = 'simple';
  let dotClass = 'simple';
  let contentHtml = '';
  const { isReadOnly } = getStoredCredentials();

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
          <span>${escapeHtml(item.badgeLabel)}</span>
          ${item.note ? `<span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); font-weight: normal; margin-left: 8px;">${escapeHtml(item.note)}</span>` : ''}
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
    dotClass = isCard ? 'venue-card-dot' : 'simple';

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
                  ? `<span class="metro-badge" style="background: ${step.lineBadge.bgColor || 'var(--accent-amber)'}; color: ${step.lineBadge.textColor || 'var(--accent-amber-text)'}"><span class="metro-circle" style="background: ${step.lineBadge.textColor || 'var(--accent-amber-text)'}; color: ${step.lineBadge.bgColor || 'var(--accent-amber)'}">${step.lineBadge.sublabel || 'M'}</span>${escapeHtml(step.lineBadge.label)}</span>`
                  : step.lineBadge?.type === 'bus'
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor || 'var(--accent-blue)'}; color: ${step.lineBadge.textColor || 'var(--accent-blue)'}"><span style="font-size: 13px;">🚌</span> ${escapeHtml(step.lineBadge.label)}</span>`
                  : step.lineBadge?.type === 'tram'
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor || 'var(--accent-blue)'}; color: ${step.lineBadge.textColor || 'var(--accent-blue)'}"><span style="font-size: 13px;">🚊</span> ${escapeHtml(step.lineBadge.label)}</span>`
                  : step.lineBadge?.type === 'train'
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor || 'var(--accent-blue)'}; color: ${step.lineBadge.textColor || 'var(--accent-blue)'}"><span style="font-size: 13px;">🚆</span> ${escapeHtml(step.lineBadge.label)}</span>`
                  : step.lineBadge?.type === 'walk'
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor || 'var(--border-card)'}; color: ${step.lineBadge.textColor || 'var(--text-muted)'}"><span style="font-size: 13px;">🚶</span> ${escapeHtml(step.lineBadge.label || 'Walk')}</span>`
                  : step.lineBadge?.type === 'ferry'
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor || '#5ed3c4'}; color: ${step.lineBadge.textColor || '#5ed3c4'}"><span style="font-size: 13px;">⛴️</span> ${escapeHtml(step.lineBadge.label)}</span>`
                  : step.lineBadge?.label
                  ? `<span class="bus-badge" style="border-color: ${step.lineBadge.borderColor || 'var(--accent-blue)'}; color: ${step.lineBadge.textColor || 'var(--accent-blue)'}">${escapeHtml(step.lineBadge.label)}</span>`
                  : ''
              }
            </div>
          </div>
        `;
      }
    });
    contentHtml = `<div class="transit-chain">${chainSteps}</div>`;
  }

  const isMoveable = !isReadOnly && item.type === 'venue' && !item.time;

  return `
    <li class="timeline-row">
      <div class="time-col ${timeClass}">${item.time || ''}</div>
      <div class="track-col">
        <div class="track-line ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}"></div>
        <div class="node-dot ${dotClass}"></div>
      </div>
      <div class="content-col ${isLast ? 'last' : ''}">
        <div class="timeline-item-wrapper">
          <div class="timeline-item-body" data-edit-item-id="${item.id}" title="${!isReadOnly ? 'Click to edit event' : ''}">
            ${contentHtml}
          </div>
          ${
            !isReadOnly
              ? `
              <div class="timeline-item-actions">
                ${
                  isMoveable
                    ? `
                  <button type="button" class="icon-btn move-up-item-btn" data-move-up-id="${item.id}" title="Move up in schedule" style="padding: 2px 4px; font-size: 10px;">▲</button>
                  <button type="button" class="icon-btn move-down-item-btn" data-move-down-id="${item.id}" title="Move down in schedule" style="padding: 2px 4px; font-size: 10px;">▼</button>
                `
                    : ''
                }
                <button type="button" class="icon-btn edit-item-btn" data-edit-item-id="${item.id}" title="Edit event" style="padding: 3px 6px;">
                  ${getSvgIcon('pencil', 12, 'currentColor')}
                </button>
                <button type="button" class="icon-btn delete-item-btn" data-delete-item-id="${item.id}" title="Delete event" style="padding: 3px 6px;">
                  &#10005;
                </button>
              </div>
            `
              : ''
          }
        </div>
      </div>
    </li>
  `;
}

function attachTripListeners(trip) {
  document.getElementById('backToTripsBtn')?.addEventListener('click', () => {
    state.activeTripId = null;
    renderApp();
  });

  document.querySelectorAll('[data-move-up-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.getAttribute('data-move-up-id');
      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
      const idx = activeDay.items.findIndex((i) => i.id === itemId);
      if (idx > 0) {
        const temp = activeDay.items[idx];
        activeDay.items[idx] = activeDay.items[idx - 1];
        activeDay.items[idx - 1] = temp;
        touchTrip(trip);
        saveTripsToStorage(state.trips, true);
        renderApp();
      }
    });
  });

  document.querySelectorAll('[data-move-down-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.getAttribute('data-move-down-id');
      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
      const idx = activeDay.items.findIndex((i) => i.id === itemId);
      if (idx >= 0 && idx < activeDay.items.length - 1) {
        const temp = activeDay.items[idx];
        activeDay.items[idx] = activeDay.items[idx + 1];
        activeDay.items[idx + 1] = temp;
        touchTrip(trip);
        saveTripsToStorage(state.trips, true);
        renderApp();
      }
    });
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

  const dayTabsNav = document.querySelector('.day-tabs-nav');
  if (dayTabsNav) {
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;

    dayTabsNav.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX;
      scrollStart = dayTabsNav.scrollLeft;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) {
        hasDragged = true;
        dayTabsNav.classList.add('is-dragging');
      }
      if (hasDragged) {
        e.preventDefault();
        dayTabsNav.scrollLeft = scrollStart - dx;
      }
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      dayTabsNav.classList.remove('is-dragging');
      if (hasDragged) {
        dayTabsNav.setAttribute('data-dragged', 'true');
        setTimeout(() => dayTabsNav.removeAttribute('data-dragged'), 100);
      }
    });

    // Translate vertical mouse wheel scrolling into horizontal scroll
    dayTabsNav.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0 && Math.abs(e.deltaX) < 1) {
        e.preventDefault();
        dayTabsNav.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  document.querySelectorAll('[data-nav-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.closest('.day-tabs-nav');
      if (nav && nav.hasAttribute('data-dragged')) return;
      const dayNum = Number(btn.getAttribute('data-nav-day'));
      state.activeDayNumber = dayNum;
      renderApp();
    });
  });

  document.getElementById('backToTodayBtn')?.addEventListener('click', () => {
    const status = getTripDateStatus(trip);
    if (status.status === 'current') {
      state.activeDayNumber = status.todayDayNumber;
      renderApp();
    }
  });

  const routeWrap = document.getElementById('routeTitleWrap');
  const editBtn = document.getElementById('editRouteTitleBtn');
  const titleText = document.getElementById('routeTitleText');
  const { isReadOnly } = getStoredCredentials();

  function startEditingDayTitle() {
    if (isReadOnly || !routeWrap) return;
    const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
    const currentVal = activeDay.routeTitle || `Day ${activeDay.dayNumber}`;
    routeWrap.innerHTML = `
      <form id="editRouteTitleForm" class="route-title-edit-form">
        <input type="text" id="routeTitleInput" class="text-input" value="${escapeHtml(currentVal)}" placeholder="Day ${activeDay.dayNumber} description" />
        <button type="submit" class="icon-btn" style="color: var(--accent-blue); padding: 4px 8px;" title="Save">${getSvgIcon('check', 14, 'var(--accent-blue)', 2.5)}</button>
        <button type="button" id="cancelEditRouteBtn" class="icon-btn" style="padding: 4px 8px;" title="Cancel">&#10005;</button>
      </form>
    `;

    const form = document.getElementById('editRouteTitleForm');
    const input = document.getElementById('routeTitleInput');
    input?.focus();
    input?.select();

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim() || `Day ${activeDay.dayNumber}`;
      activeDay.routeTitle = val;
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      renderApp();
    });

    document.getElementById('cancelEditRouteBtn')?.addEventListener('click', () => {
      renderApp();
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        renderApp();
      }
    });
  }

  editBtn?.addEventListener('click', startEditingDayTitle);
  titleText?.addEventListener('click', startEditingDayTitle);

  document.getElementById('shareItineraryBtn')?.addEventListener('click', () => {
    openShareModal(trip, state.activeDayNumber);
  });

  document.getElementById('datesModalBtn')?.addEventListener('click', () => openDatesModal(trip));

  // Add Event to Day
  const onAddEvent = () => {
    const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
    openEventModal(trip, activeDay, null);
  };
  document.getElementById('addEventBtn')?.addEventListener('click', onAddEvent);
  document.getElementById('addEventEmptyBtn')?.addEventListener('click', onAddEvent);

  // Edit / Delete timeline items
  document.querySelectorAll('[data-edit-item-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-delete-item-id]')) return;
      const itemId = el.getAttribute('data-edit-item-id');
      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
      const item = activeDay.items.find((i) => i.id === itemId);
      if (item) openEventModal(trip, activeDay, item);
    });
  });

  document.querySelectorAll('[data-delete-item-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.getAttribute('data-delete-item-id');
      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
      const item = activeDay.items.find((i) => i.id === itemId);
      const title = item ? (item.title || item.label || item.badgeLabel || 'this event') : 'this event';
      if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

      activeDay.items = activeDay.items.filter((i) => i.id !== itemId);
      recalculatePoolFreeTags(trip, activeDay);
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      renderApp();
    });
  });

  // Pool idea management
  document.getElementById('addPoolIdeaBtn')?.addEventListener('click', () => {
    openIdeaModal(trip, null);
  });

  document.querySelectorAll('[data-edit-idea-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ideaId = btn.getAttribute('data-edit-idea-id');
      const idea = trip.pool.find((i) => i.id === ideaId);
      if (idea) openIdeaModal(trip, idea);
    });
  });

  document.querySelectorAll('[data-delete-idea-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ideaId = btn.getAttribute('data-delete-idea-id');
      const idea = trip.pool.find((i) => i.id === ideaId);
      const title = idea ? idea.title : 'this idea';
      if (!confirm(`Are you sure you want to delete "${title}" from the idea pool?`)) return;

      trip.pool = trip.pool.filter((i) => i.id !== ideaId);
      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
      recalculatePoolFreeTags(trip, activeDay);
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      renderApp();
    });
  });

  // Idea promotion to timeline
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

      activeDay.items = sortDayItems(activeDay.items);
      trip.pool = trip.pool.filter((i) => i.id !== idea.id);
      recalculatePoolFreeTags(trip, activeDay);
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      renderApp();
    });
  });

  attachFooterListeners();
}

// 3. Footer Status Bar (Unified Smart Sync)
function renderFooterBar({ isReadOnly, dbUrl, dirty, formattedSync }) {
  return `
    <footer class="footer-bar">
      ${
        dbUrl
          ? `
          <div class="sync-bar">
            <div class="sync-status-indicator">
              <span class="dot ${state.isSyncing ? 'syncing' : dirty ? 'dirty' : isReadOnly ? 'readonly' : 'online'}"></span>
              <span>${state.isSyncing ? 'Syncing...' : dirty ? '⚠️ Unsynced changes' : `Synced: ${formattedSync}`}</span>
            </div>
            <div class="sync-btns">
              <button type="button" class="icon-btn sync-now-btn ${dirty ? 'badge-pill' : ''}" ${state.isSyncing ? 'disabled' : ''} title="Two-way smart sync">
                ${state.isSyncing ? getSvgIcon('clock', 12, 'currentColor') : getSvgIcon('refresh', 12, 'currentColor')}
                ${state.isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
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
        <button type="button" style="text-decoration: underline; color: var(--text-muted); cursor: pointer;" class="footer-config-btn">Settings</button>
      </div>
    </footer>
  `;
}

function attachFooterListeners() {
  document.querySelectorAll('.sync-now-btn').forEach((btn) => {
    btn.addEventListener('click', () => smartSyncWithCloud(true));
  });
  document.querySelectorAll('.footer-config-btn').forEach((btn) => {
    btn.addEventListener('click', openConfigModal);
  });
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
      updatedAt: Date.now(),
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
    recordTripDeletion(trip.id);
    state.trips = state.trips.filter((t) => t.id !== trip.id);
    saveTripsToStorage(state.trips, true);
    if (state.activeTripId === trip.id) {
      state.activeTripId = null;
      if (window.innerWidth >= 860) {
        autoSelectDefaultTrip();
      }
    }
    modal.remove();
    renderApp();
  });

  modal.querySelector('#cancelDeleteBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 6. Dates & Days Modal (Shift Start Date, Adjust Duration, Add/Remove Days)
function openDatesModal(trip) {
  const { isReadOnly } = getStoredCredentials();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  let shiftStartDate = trip.startDate;
  let targetTotalDays = trip.totalDays;
  let newDayTitleDraft = '';

  function renderModalContent() {
    let daysListHtml = '';
    trip.days.forEach((day) => {
      const date = getDateForDay(trip.startDate, day.dayNumber);
      daysListHtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--bg-canvas); border: 1px solid var(--border-card); border-radius: 8px; gap: 8px;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Day ${day.dayNumber}: ${escapeHtml(day.routeTitle || `Day ${day.dayNumber}`)}</span>
              ${!isReadOnly ? `<button type="button" class="icon-btn" data-rename-day="${day.dayNumber}" style="padding: 1px 6px; font-size: 10px;" title="Rename day">Edit</button>` : ''}
            </div>
            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${formatFullDate(date)}</div>
          </div>
          ${
            !isReadOnly && trip.days.length > 1
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
            Trip Dates & Duration
          </span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label" for="shiftDateText">Start Date</label>
              <div class="date-input-group">
                <input type="text" class="text-input" id="shiftDateText" value="${isoToDDMMYYYY(shiftStartDate)}" placeholder="DD.MM.YYYY" maxLength="10" />
                <button type="button" class="calendar-trigger-btn" id="shiftCalBtn">${getSvgIcon('calendar', 16, 'currentColor')}</button>
                <input type="date" class="hidden-date-native" id="shiftNativePicker" value="${shiftStartDate}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="tripDaysCountInput">Total Days</label>
              <input type="number" class="text-input" id="tripDaysCountInput" min="1" max="90" value="${targetTotalDays}" />
            </div>
          </div>
          <div id="datesPreviewCalculated" style="font-family: var(--font-mono); font-size: 11.5px; color: var(--accent-blue);">
            ${formatDateRange(shiftStartDate, targetTotalDays)} (${targetTotalDays} days total)
          </div>
          ${!isReadOnly ? `<button type="button" class="btn-secondary" id="applyShiftBtn" style="background: var(--accent-blue); color: #09090b; border: none; align-self: flex-start; font-weight: 600;">Save Dates & Duration</button>` : ''}
        </div>

        <div style="padding-bottom: 12px; border-bottom: 1px solid var(--border-card); display: flex; flex-direction: column; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
            Add New Day
          </span>
          <div style="display: flex; gap: 8px;">
            <input type="text" class="text-input" id="newDayTitleInput" placeholder="Day ${trip.days.length + 1} route or title" value="${escapeHtml(newDayTitleDraft)}" style="flex: 1;" />
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
    const daysInput = modal.querySelector('#tripDaysCountInput');
    const previewEl = modal.querySelector('#datesPreviewCalculated');

    const updatePreview = () => {
      if (previewEl && shiftStartDate && targetTotalDays) {
        previewEl.textContent = `${formatDateRange(shiftStartDate, targetTotalDays)} (${targetTotalDays} days total)`;
      }
    };

    shiftText?.addEventListener('input', (e) => {
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
        updatePreview();
      }
    });

    shiftText?.addEventListener('blur', (e) => {
      const iso = ddmmyyyyToIso(e.target.value);
      if (iso) e.target.value = isoToDDMMYYYY(iso);
    });

    shiftCalBtn?.addEventListener('click', () => {
      try {
        shiftPicker.showPicker ? shiftPicker.showPicker() : shiftPicker.click();
      } catch {
        shiftPicker.click();
      }
    });

    shiftPicker?.addEventListener('change', (e) => {
      if (e.target.value) {
        shiftStartDate = e.target.value;
        shiftText.value = isoToDDMMYYYY(shiftStartDate);
        updatePreview();
      }
    });

    daysInput?.addEventListener('input', (e) => {
      const count = parseInt(e.target.value, 10);
      if (count && count >= 1 && count <= 90) {
        targetTotalDays = count;
        updatePreview();
      }
    });

    modal.querySelector('#applyShiftBtn')?.addEventListener('click', () => {
      const titleInput = modal.querySelector('#newDayTitleInput');
      if (titleInput) newDayTitleDraft = titleInput.value;
      trip.startDate = shiftStartDate;

      // Adjust total days count
      if (targetTotalDays > trip.days.length) {
        while (trip.days.length < targetTotalDays) {
          const nextNum = trip.days.length + 1;
          trip.days.push({
            id: `day-${nextNum}-${Date.now()}`,
            dayNumber: nextNum,
            routeTitle: `Day ${nextNum}`,
            items: []
          });
        }
      } else if (targetTotalDays < trip.days.length) {
        const removedDays = trip.days.slice(targetTotalDays);
        const hasEvents = removedDays.some((d) => d.items && d.items.length > 0);
        if (hasEvents) {
          if (!confirm(`Shortening to ${targetTotalDays} days will remove scheduled events on later days. Proceed?`)) {
            return;
          }
        }
        trip.days = trip.days.slice(0, targetTotalDays);
      }

      trip.totalDays = trip.days.length;
      if (state.activeDayNumber > trip.totalDays) {
        state.activeDayNumber = trip.totalDays;
      }

      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      renderModalContent();
    });

    modal.querySelector('#addNewDayBtn')?.addEventListener('click', () => {
      const titleInput = modal.querySelector('#newDayTitleInput');
      const title = titleInput.value.trim() || `Day ${trip.days.length + 1}`;
      newDayTitleDraft = '';
      const nextNum = trip.days.length + 1;
      trip.days.push({
        id: `day-${nextNum}-${Date.now()}`,
        dayNumber: nextNum,
        routeTitle: title,
        items: []
      });
      trip.totalDays = trip.days.length;
      targetTotalDays = trip.totalDays;
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      renderModalContent();
    });

    modal.querySelectorAll('[data-rename-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const titleInput = modal.querySelector('#newDayTitleInput');
        if (titleInput) newDayTitleDraft = titleInput.value;
        const dayNum = Number(btn.getAttribute('data-rename-day'));
        const day = trip.days.find((d) => d.dayNumber === dayNum);
        if (!day) return;
        const currentTitle = day.routeTitle || `Day ${dayNum}`;
        const newTitle = prompt(`Edit title / description for Day ${dayNum}:`, currentTitle);
        if (newTitle !== null) {
          day.routeTitle = newTitle.trim() || `Day ${dayNum}`;
          touchTrip(trip);
          saveTripsToStorage(state.trips, true);
          renderModalContent();
          renderApp();
        }
      });
    });

    modal.querySelectorAll('[data-remove-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const titleInput = modal.querySelector('#newDayTitleInput');
        if (titleInput) newDayTitleDraft = titleInput.value;
        const dayNum = Number(btn.getAttribute('data-remove-day'));
        const day = trip.days.find((d) => d.dayNumber === dayNum);
        if (day && day.items.length > 0) {
          if (!confirm(`Day ${dayNum} has ${day.items.length} scheduled events. Delete this day?`)) {
            return;
          }
        }
        trip.days = trip.days.filter((d) => d.dayNumber !== dayNum).map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
        trip.totalDays = trip.days.length;
        targetTotalDays = trip.totalDays;
        if (state.activeDayNumber > trip.totalDays) {
          state.activeDayNumber = trip.totalDays;
        }
        touchTrip(trip);
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
  const { dbUrl, tracker, isReadOnly } = getStoredCredentials();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';

  function getShareLink() {
    if (!dbUrl || !tracker) return window.location.href;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('db', dbUrl);
    url.searchParams.set('tracker', tracker);
    return url.toString();
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <h3 class="modal-heading">Firebase Sync & Settings</h3>
      <p style="margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.4;">
        Data is synchronized with Firebase RTDB under <code>trackers/trips/{tracker}</code> across your devices.
      </p>

      <form id="configForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="cfgDbUrl">Firebase RTDB URL</label>
          <input class="text-input" id="cfgDbUrl" placeholder="https://your-project.firebasedatabase.app" value="${escapeHtml(dbUrl)}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="cfgTracker">Tracker Code</label>
          <input class="text-input" id="cfgTracker" placeholder="Tracker code" value="${escapeHtml(tracker)}" />
        </div>

        <label style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); cursor: pointer;">
          <input type="checkbox" id="cfgIsRo" ${isReadOnly ? 'checked' : ''} />
          Force Read-Only mode on this device
        </label>

        ${
          dbUrl && tracker
            ? `
          <div style="background: var(--bg-canvas); padding: 12px; border-radius: 8px; border: 1px solid var(--border-card); display: flex; flex-direction: column; gap: 8px;">
            <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">
              Quick Sync Link
            </span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-secondary" id="copySyncLinkBtn">Copy Sync Link for Other Devices</button>
            </div>
            <span id="copyLinkFeedback" style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-blue); display: none;">✓ Sync link copied to clipboard!</span>
          </div>
        `
            : ''
        }

        <div class="dialog-actions">
          <button type="button" class="btn-secondary" id="loadDemoTripBtn" style="color: var(--accent-blue); border-color: rgba(56, 189, 248, 0.4); margin-right: 6px;">Load Demo Trip</button>
          <button type="button" class="btn-secondary" id="clearAllTripsBtn" style="color: var(--accent-alert); border-color: rgba(255, 107, 94, 0.4); margin-right: auto;">Clear All</button>
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
    const newTracker = modal.querySelector('#cfgTracker').value.trim();
    const newIsRo = modal.querySelector('#cfgIsRo').checked;

    if (newDb) {
      localStorage.setItem(STORAGE_KEY_DB_URL, newDb);
    } else {
      localStorage.removeItem(STORAGE_KEY_DB_URL);
    }

    if (newTracker) {
      localStorage.setItem(STORAGE_KEY_TRACKER, newTracker);
    } else {
      localStorage.removeItem(STORAGE_KEY_TRACKER);
    }

    localStorage.setItem(STORAGE_KEY_IS_RO, newIsRo ? 'true' : 'false');

    modal.remove();
    renderApp();
  });

  modal.querySelector('#loadDemoTripBtn')?.addEventListener('click', () => {
    const existingIndex = state.trips.findIndex((t) => t.id === DEMO_TRIP.id);
    const demoCopy = JSON.parse(JSON.stringify(DEMO_TRIP));
    demoCopy.updatedAt = Date.now();
    if (existingIndex >= 0) {
      state.trips[existingIndex] = demoCopy;
    } else {
      state.trips.push(demoCopy);
    }
    saveTripsToStorage(state.trips, true);
    state.activeTripId = demoCopy.id;
    state.activeDayNumber = 3;
    modal.remove();
    renderApp();
  });

  modal.querySelector('#copySyncLinkBtn')?.addEventListener('click', async () => {
    const link = getShareLink();
    await navigator.clipboard.writeText(link);
    const fb = modal.querySelector('#copyLinkFeedback');
    if (fb) {
      fb.style.display = 'block';
      setTimeout(() => (fb.style.display = 'none'), 2500);
    }
  });

  modal.querySelector('#clearAllTripsBtn').addEventListener('click', () => {
    if (confirm('Clear all local trips from this device?')) {
      state.trips.forEach((t) => recordTripDeletion(t.id));
      saveTripsToStorage([], true);
      modal.remove();
      renderApp();
    }
  });

  modal.querySelector('#cancelConfigBtn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 8. Share Itinerary Modal (Image & Formatted Text Export)
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function getFormattedItineraryText(trip, dayNumber) {
  if (dayNumber) {
    const day = trip.days.find((d) => d.dayNumber === dayNumber) || trip.days[0];
    if (!day) return '';
    const date = getDateForDay(trip.startDate, day.dayNumber);
    const dateStr = formatFullDate(date);
    const title = day.routeTitle ? `Day ${day.dayNumber}: ${day.routeTitle}` : `Day ${day.dayNumber}`;

    let lines = [
      `🌴 ${trip.title}`,
      `📅 ${title} · ${dateStr}`,
      ''
    ];

    if (!day.items || day.items.length === 0) {
      lines.push('  • (No scheduled events)');
    } else {
      day.items.forEach((item) => {
        const timePart = item.time ? `${item.time} — ` : '';
        lines.push(`• ${timePart}${item.title}`);
      });
    }
    return lines.join('\n');
  }

  // Full Trip
  let lines = [
    `🌴 ${trip.title}`,
    `🗓️ ${formatDateRange(trip.startDate, trip.totalDays)} (${trip.totalDays} days)`,
    ''
  ];

  trip.days.forEach((day) => {
    const date = getDateForDay(trip.startDate, day.dayNumber);
    const dateStr = formatFullDate(date);
    const title = day.routeTitle ? `Day ${day.dayNumber}: ${day.routeTitle}` : `Day ${day.dayNumber}`;
    lines.push(`───────────────`);
    lines.push(`📅 ${title} (${dateStr})`);
    if (!day.items || day.items.length === 0) {
      lines.push('  • (No scheduled events)');
    } else {
      day.items.forEach((item) => {
        const timePart = item.time ? `${item.time} — ` : '';
        lines.push(`  • ${timePart}${item.title}`);
      });
    }
    lines.push('');
  });

  return lines.join('\n');
}

function renderItineraryCanvas(trip, dayNumber) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const width = 640;
  const scale = 2;

  const isSingleDay = Boolean(dayNumber);
  const targetDays = isSingleDay
    ? [trip.days.find((d) => d.dayNumber === dayNumber) || trip.days[0]].filter(Boolean)
    : trip.days;

  let estimatedHeight = 150;
  targetDays.forEach((d) => {
    if (!isSingleDay) estimatedHeight += 44;
    const count = d.items && d.items.length > 0 ? d.items.length : 1;
    estimatedHeight += count * 42 + 16;
  });
  estimatedHeight += 60;
  const height = Math.max(isSingleDay ? 360 : 420, estimatedHeight);

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Outer background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, width, height);

  // Card background
  ctx.fillStyle = '#141519';
  drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#27272a';
  ctx.stroke();

  // Badge
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('VACATION PLANNER', 36, 48);

  // Trip Title
  ctx.font = '700 22px "IBM Plex Sans", -apple-system, sans-serif';
  ctx.fillStyle = '#f4f4f5';
  ctx.fillText(trip.title, 36, 78);

  // Subtitle
  ctx.font = '500 13px "IBM Plex Sans", -apple-system, sans-serif';
  ctx.fillStyle = '#a1a1aa';
  if (isSingleDay) {
    const day = targetDays[0];
    const date = getDateForDay(trip.startDate, day.dayNumber);
    const dayTitle = day.routeTitle ? `Day ${day.dayNumber}: ${day.routeTitle}` : `Day ${day.dayNumber}`;
    ctx.fillText(`${dayTitle}  ·  ${formatFullDate(date)}`, 36, 102);
  } else {
    ctx.fillText(`${formatDateRange(trip.startDate, trip.totalDays)} (${trip.totalDays} days)`, 36, 102);
  }

  // Header Divider
  ctx.beginPath();
  ctx.moveTo(36, 118);
  ctx.lineTo(width - 36, 118);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.stroke();

  let curY = 145;

  targetDays.forEach((day) => {
    if (!isSingleDay) {
      const date = getDateForDay(trip.startDate, day.dayNumber);
      ctx.font = '700 14px "IBM Plex Sans", -apple-system, sans-serif';
      ctx.fillStyle = '#38bdf8';
      const dayTitle = day.routeTitle ? `Day ${day.dayNumber}: ${day.routeTitle}` : `Day ${day.dayNumber}`;
      ctx.fillText(`${dayTitle} (${formatShortDate(date)})`, 36, curY);
      curY += 26;
    }

    if (!day.items || day.items.length === 0) {
      ctx.font = 'italic 13px "IBM Plex Sans", -apple-system, sans-serif';
      ctx.fillStyle = '#71717a';
      ctx.fillText('No scheduled activities', isSingleDay ? 40 : 50, curY);
      curY += 36;
    } else {
      const items = day.items;
      items.forEach((item, idx) => {
        const dotX = isSingleDay ? 96 : 80;
        const textX = dotX + 18;
        const timeX = 36;

        if (idx < items.length - 1) {
          ctx.beginPath();
          ctx.moveTo(dotX, curY);
          ctx.lineTo(dotX, curY + 38);
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Time
        if (item.time) {
          ctx.font = '600 12px "IBM Plex Mono", monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(item.time, timeX, curY + 4);
        } else {
          ctx.font = '500 12px "IBM Plex Mono", monospace';
          ctx.fillStyle = '#52525b';
          ctx.fillText('—', timeX + 8, curY + 4);
        }

        // Dot
        ctx.beginPath();
        ctx.arc(dotX, curY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        // Title
        ctx.font = '600 14px "IBM Plex Sans", -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        const maxW = width - 36 - textX;
        let t = item.title || '';
        while (ctx.measureText(t).width > maxW && t.length > 3) {
          t = t.slice(0, -4) + '...';
        }
        ctx.fillText(t, textX, curY + 4);

        curY += 38;
      });
      curY += 12;
    }
  });

  // Footer inside card
  const footerY = height - 36;
  ctx.beginPath();
  ctx.moveTo(36, footerY - 14);
  ctx.lineTo(width - 36, footerY - 14);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '500 11px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('Vacation Planner • Offline Itinerary', 36, footerY);

  return canvas;
}

function openShareModal(trip, initialDayNumber) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'shareModal';

  let selectedDay = initialDayNumber || 1;
  let isFullTrip = false;

  function renderShareContent() {
    const textFormatted = getFormattedItineraryText(trip, isFullTrip ? null : selectedDay);
    const dayObj = trip.days.find((d) => d.dayNumber === selectedDay) || trip.days[0];
    const dayLabel = dayObj ? `Day ${dayObj.dayNumber}` : 'Day 1';

    modal.innerHTML = `
      <div class="modal-dialog">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 class="modal-heading">Share Itinerary</h3>
          <button type="button" style="color: var(--text-muted); cursor: pointer;" id="closeShareModalBtn">&#10005; Done</button>
        </div>

        <div class="share-scope-tabs">
          <button type="button" class="share-tab-btn ${!isFullTrip ? 'active' : ''}" id="shareTabDayBtn">${escapeHtml(dayLabel)}</button>
          <button type="button" class="share-tab-btn ${isFullTrip ? 'active' : ''}" id="shareTabFullBtn">Entire Trip (${trip.totalDays} Days)</button>
        </div>

        <!-- Section 1: Image Export -->
        <div class="share-section">
          <span class="share-section-title">
            ${getSvgIcon('image', 14, 'var(--accent-blue)')}
            Itinerary Image Card (PNG)
          </span>
          <div class="share-image-preview-wrap">
            <img id="shareImagePreview" class="share-image-preview" alt="Itinerary Preview" />
          </div>
          <div class="share-actions-row">
            <button type="button" class="primary-btn" id="shareImageNativeBtn">
              ${getSvgIcon('share', 15, '#09090b', 2.25)}
              Share Image
            </button>
            <button type="button" class="btn-secondary" id="downloadImageBtn">
              ${getSvgIcon('download', 14, 'currentColor')}
              Download PNG
            </button>
          </div>
        </div>

        <!-- Section 2: Formatted Text -->
        <div class="share-section">
          <span class="share-section-title">
            ${getSvgIcon('copy', 14, 'var(--accent-blue)')}
            Formatted Text (WhatsApp, Signal, Mail)
          </span>
          <pre class="share-text-box" id="shareTextBox">${escapeHtml(textFormatted)}</pre>
          <div class="share-actions-row">
            <button type="button" class="primary-btn" id="copyTextBtn" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-card);">
              ${getSvgIcon('copy', 14, 'currentColor')}
              Copy Text
            </button>
            ${
              navigator.share
                ? `<button type="button" class="btn-secondary" id="shareTextNativeBtn">
                    ${getSvgIcon('share', 13, 'currentColor')}
                    Share Text...
                  </button>`
                : ''
            }
          </div>
        </div>
      </div>
    `;

    attachShareListeners();
    updateImagePreview();
  }

  function updateImagePreview() {
    const canvas = renderItineraryCanvas(trip, isFullTrip ? null : selectedDay);
    const dataUrl = canvas.toDataURL('image/png');
    const imgEl = modal.querySelector('#shareImagePreview');
    if (imgEl) imgEl.src = dataUrl;
  }

  function attachShareListeners() {
    modal.querySelector('#closeShareModalBtn').addEventListener('click', () => modal.remove());

    modal.querySelector('#shareTabDayBtn').addEventListener('click', () => {
      if (isFullTrip) {
        isFullTrip = false;
        renderShareContent();
      }
    });

    modal.querySelector('#shareTabFullBtn').addEventListener('click', () => {
      if (!isFullTrip) {
        isFullTrip = true;
        renderShareContent();
      }
    });

    const copyBtn = modal.querySelector('#copyTextBtn');
    copyBtn?.addEventListener('click', async () => {
      const text = getFormattedItineraryText(trip, isFullTrip ? null : selectedDay);
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = `${getSvgIcon('check', 14, '#38bdf8', 2.5)} Copied to Clipboard!`;
        setTimeout(() => {
          if (copyBtn) copyBtn.innerHTML = `${getSvgIcon('copy', 14, 'currentColor')} Copy Text`;
        }, 2000);
      } catch (err) {
        const box = modal.querySelector('#shareTextBox');
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(box);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });

    modal.querySelector('#shareTextNativeBtn')?.addEventListener('click', async () => {
      const text = getFormattedItineraryText(trip, isFullTrip ? null : selectedDay);
      if (navigator.share) {
        try {
          await navigator.share({
            title: trip.title,
            text
          });
        } catch (err) {
          if (err.name !== 'AbortError') console.warn(err);
        }
      }
    });

    const getCleanFileName = () => {
      const slug = trip.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return isFullTrip ? `${slug}-full-trip.png` : `${slug}-day-${selectedDay}.png`;
    };

    modal.querySelector('#downloadImageBtn')?.addEventListener('click', () => {
      const canvas = renderItineraryCanvas(trip, isFullTrip ? null : selectedDay);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = getCleanFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    modal.querySelector('#shareImageNativeBtn')?.addEventListener('click', () => {
      const canvas = renderItineraryCanvas(trip, isFullTrip ? null : selectedDay);
      const fileName = getCleanFileName();

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: trip.title,
              files: [file]
            });
            return;
          } catch (err) {
            if (err.name === 'AbortError') return;
          }
        }
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    });
  }

  document.body.appendChild(modal);
  renderShareContent();

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function timeToMinutes(t) {
  if (!t) return null;
  const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function minutesToTime(min) {
  if (min === null || min === undefined || isNaN(min)) return '';
  let total = Math.round(min) % (24 * 60);
  if (total < 0) total += 24 * 60;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function calculateDurationFromTimes(startStr, endStr) {
  const s = timeToMinutes(startStr);
  const e = timeToMinutes(endStr);
  if (s === null || e === null) return null;
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60;

  if (diff % 60 === 0) {
    return { val: String(diff / 60), unit: 'hours' };
  }
  if (diff % 30 === 0 && diff >= 60) {
    return { val: String(diff / 60), unit: 'hours' };
  }
  if (diff < 60) {
    return { val: String(diff), unit: 'minutes' };
  }
  if (diff % 15 === 0) {
    return { val: String(diff / 60), unit: 'hours' };
  }
  return { val: String(diff), unit: 'minutes' };
}

function calculateEndTimeFromDuration(startStr, val, unit) {
  const s = timeToMinutes(startStr);
  if (s === null || isNaN(val) || val <= 0) return '';
  const addMin = unit === 'hours' ? Math.round(val * 60) : Math.round(val);
  return minutesToTime(s + addMin);
}

function parseDurationToMinutes(text) {
  if (!text) return null;
  const str = String(text).toLowerCase().trim();
  const rangeMatch = str.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  if (rangeMatch) {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const s = toMin(rangeMatch[1]);
    const e = toMin(rangeMatch[2]);
    if (e > s) return e - s;
  }
  const hrMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (hrMatch) {
    return Math.round(parseFloat(hrMatch[1]) * 60);
  }
  const minMatch = str.match(/^(\d+)\s*(?:minutes?|mins?|m)\b/);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  const hmMatch = str.match(/^(\d+)\s*h(?:ours?)?\s*(\d+)\s*m/);
  if (hmMatch) {
    return parseInt(hmMatch[1], 10) * 60 + parseInt(hmMatch[2], 10);
  }
  const numOnly = str.match(/^(\d+(?:\.\d+)?)$/);
  if (numOnly) {
    const n = parseFloat(numOnly[1]);
    return n <= 12 ? Math.round(n * 60) : Math.round(n);
  }
  return null;
}

// Helper to calculate available/free gap on a day within a time range
function calculateFreeTimeWindow(activeDay, rangeStr) {
  if (!rangeStr || !activeDay) return null;
  const match = rangeStr.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const toTimeStr = (min) => {
    const h = String(Math.floor(min / 60)).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    return `${h}:${m}`;
  };

  const rangeStart = toMin(match[1]);
  const rangeEnd = toMin(match[2]);
  if (rangeEnd <= rangeStart) return null;

  const busy = [];
  (activeDay.items || []).forEach((item) => {
    if (item.timeWindow) {
      const tw = item.timeWindow.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
      if (tw) {
        busy.push([toMin(tw[1]), toMin(tw[2])]);
      } else {
        const dur = parseDurationToMinutes(item.timeWindow);
        if (dur && item.time) {
          const t = toMin(item.time);
          busy.push([t, t + dur]);
        } else if (item.time) {
          const t = toMin(item.time);
          busy.push([t, t + 60]);
        }
      }
    } else if (item.from?.time && item.to?.time) {
      busy.push([toMin(item.from.time), toMin(item.to.time)]);
    } else if (item.time) {
      const t = toMin(item.time);
      busy.push([t, t + 60]);
    }
  });

  const overlaps = busy.filter(([s, e]) => s < rangeEnd && e > rangeStart);
  if (overlaps.length === 0) {
    return `${match[1]}–${match[2]}`;
  }

  overlaps.sort((a, b) => a[0] - b[0]);
  let current = rangeStart;
  let maxGap = 0;
  let bestGap = null;

  overlaps.forEach(([bs, be]) => {
    if (bs > current) {
      const gap = bs - current;
      if (gap > maxGap) {
        maxGap = gap;
        bestGap = [current, bs];
      }
    }
    if (be > current) current = be;
  });

  if (rangeEnd > current) {
    const gap = rangeEnd - current;
    if (gap > maxGap) {
      maxGap = gap;
      bestGap = [current, rangeEnd];
    }
  }

  if (bestGap && maxGap >= 25) {
    return `${toTimeStr(bestGap[0])}–${toTimeStr(bestGap[1])}`;
  }
  return null;
}

// Recalculates pool ideas' "free" tag against the active day's schedule
function recalculatePoolFreeTags(trip, activeDay) {
  if (!trip || !trip.pool || !activeDay) return;

  trip.pool.forEach((idea) => {
    const applies = !idea.applicableDays || idea.applicableDays.length === 0 || idea.applicableDays.includes(activeDay.dayNumber);

    let rangeStr = idea.timeRange;
    if (!rangeStr && idea.tags) {
      const clockTag = idea.tags.find((t) => /(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/.test(t.text));
      if (clockTag) {
        const m = clockTag.text.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
        if (m) rangeStr = `${m[1]}–${m[2]}`;
      }
    }

    if (!idea.tags) idea.tags = [];

    // Strip previous free or no-free tags
    idea.tags = idea.tags.filter((t) => !/^free /i.test(t.text) && !/^no free/i.test(t.text));

    if (applies && rangeStr) {
      const freeWindow = calculateFreeTimeWindow(activeDay, rangeStr);
      if (freeWindow) {
        const clockIdx = idea.tags.findIndex((t) => t.icon === 'clock' || /(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/.test(t.text));
        const freeTag = { icon: 'check', text: `free ${freeWindow}`, variant: 'green' };
        if (clockIdx >= 0) {
          idea.tags.splice(clockIdx + 1, 0, freeTag);
        } else {
          idea.tags.push(freeTag);
        }
      }
    }
  });
}

// 9. Day Event Planning Modal (Activity, Alert, Direct Transit, Multi-leg Transit)
function openEventModal(trip, activeDay, existingItem) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'eventModal';

  let currentType = existingItem ? existingItem.type : 'venue';
  let selectedIcon = existingItem ? (existingItem.icon || 'pin') : 'pin';
  let transportMode = existingItem && existingItem.type === 'transport' ? (existingItem.mode || 'flight') : 'flight';
  const getModeDefaultBadge = (mode) => (mode === 'flight' ? 'Flight' : mode === 'ferry' ? 'Ferry' : 'Drive');

  let initialEndTime = existingItem?.endTime || '';
  let initialDurationVal = existingItem?.durationVal || '';
  let initialDurationUnit = existingItem?.durationUnit || 'hours';

  if (!initialEndTime && existingItem?.timeWindow) {
    const range = existingItem.timeWindow.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    if (range) {
      initialEndTime = range[2];
    } else {
      const untilMatch = existingItem.timeWindow.match(/^until\s*(\d{1,2}:\d{2})$/i);
      if (untilMatch) initialEndTime = untilMatch[1];
    }
  }

  if (!initialDurationVal && existingItem?.timeWindow) {
    const hrMatch = existingItem.timeWindow.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
    const minMatch = existingItem.timeWindow.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
    if (hrMatch) {
      initialDurationVal = hrMatch[1];
      initialDurationUnit = 'hours';
    } else if (minMatch) {
      initialDurationVal = minMatch[1];
      initialDurationUnit = 'minutes';
    }
  }

  const existingStartTime = existingItem ? (existingItem.time || '') : '';
  if (existingStartTime && initialEndTime && !initialDurationVal) {
    const dur = calculateDurationFromTimes(existingStartTime, initialEndTime);
    if (dur) {
      initialDurationVal = dur.val;
      initialDurationUnit = dur.unit;
    }
  } else if (existingStartTime && initialDurationVal && !initialEndTime) {
    const num = parseFloat(initialDurationVal);
    if (!isNaN(num) && num > 0) {
      initialEndTime = calculateEndTimeFromDuration(existingStartTime, num, initialDurationUnit);
    }
  }

  // Persistent in-memory form state so nothing is lost when toggling tabs or adding/removing stops
  const formData = {
    time: existingStartTime,
    venueTitle: existingItem?.title || '',
    venueSubtitle: existingItem?.subtitle || '',
    venueEndTime: initialEndTime,
    venueDurationVal: initialDurationVal,
    venueDurationUnit: initialDurationUnit,
    alertLabel: existingItem?.label || '',
    transportBadge: existingItem?.badgeLabel || getModeDefaultBadge(transportMode),
    isBadgeCustom: Boolean(existingItem?.badgeLabel && !['Flight', 'Drive', 'Ferry'].includes(existingItem.badgeLabel.trim())),
    transportNote: existingItem?.note || '',
    fromLabel: existingItem?.from?.label || '',
    fromTime: existingItem?.from?.time || '',
    toLabel: existingItem?.to?.label || '',
    toTime: existingItem?.to?.time || '',
    transitSteps: existingItem?.steps
      ? JSON.parse(JSON.stringify(existingItem.steps))
      : [
          { stop: '', lineBadge: { type: 'metro', label: 'B', bgColor: '#F5B731', textColor: '#1B1300' }, note: '' },
          { stop: '', lineBadge: { type: 'bus', label: '#100', borderColor: '#6CB8FF', textColor: '#6CB8FF' }, note: '' },
          { stop: '', note: '' }
        ]
  };

  const COLOR_PRESETS = [
    { label: 'Gold', hex: '#F5B731', text: '#1B1300' },
    { label: 'Blue', hex: '#6CB8FF', text: '#6CB8FF' },
    { label: 'Green', hex: '#4CC77D', text: '#4CC77D' },
    { label: 'Red', hex: '#FF6B5E', text: '#FF6B5E' },
    { label: 'Purple', hex: '#A855F7', text: '#A855F7' },
    { label: 'Gray', hex: '#D4D4D8', text: '#D4D4D8' }
  ];

  function syncDomToFormData() {
    const timeInp = modal.querySelector('#eventTime');
    if (timeInp) formData.time = timeInp.value;

    const titleInp = modal.querySelector('#venueTitle');
    if (titleInp) formData.venueTitle = titleInp.value;

    const subInp = modal.querySelector('#venueSubtitle');
    if (subInp) formData.venueSubtitle = subInp.value;

    const endTmInp = modal.querySelector('#venueEndTime');
    if (endTmInp) formData.venueEndTime = endTmInp.value;

    const durValInp = modal.querySelector('#venueDurationVal');
    if (durValInp) formData.venueDurationVal = durValInp.value;

    const durUnitSel = modal.querySelector('#venueDurationUnit');
    if (durUnitSel) formData.venueDurationUnit = durUnitSel.value;

    const alertInp = modal.querySelector('#alertLabel');
    if (alertInp) formData.alertLabel = alertInp.value;

    const badgeInp = modal.querySelector('#transportBadge');
    if (badgeInp) {
      const val = badgeInp.value.trim();
      formData.transportBadge = badgeInp.value;
      if (val && !['Flight', 'Drive', 'Ferry'].includes(val)) {
        formData.isBadgeCustom = true;
      }
    }

    const noteInp = modal.querySelector('#transportNote');
    if (noteInp) formData.transportNote = noteInp.value;

    const fromLbl = modal.querySelector('#fromLabel');
    if (fromLbl) formData.fromLabel = fromLbl.value;

    const fromTm = modal.querySelector('#fromTime');
    if (fromTm) formData.fromTime = fromTm.value;

    const toLbl = modal.querySelector('#toLabel');
    if (toLbl) formData.toLabel = toLbl.value;

    const toTm = modal.querySelector('#toTime');
    if (toTm) formData.toTime = toTm.value;

    // Multi-leg transit inputs
    modal.querySelectorAll('.step-stop-input').forEach((inp) => {
      const idx = Number(inp.getAttribute('data-step-idx'));
      if (formData.transitSteps[idx]) formData.transitSteps[idx].stop = inp.value;
    });

    modal.querySelectorAll('.step-note-input').forEach((inp) => {
      const idx = Number(inp.getAttribute('data-step-idx'));
      if (formData.transitSteps[idx]) formData.transitSteps[idx].note = inp.value;
    });

    modal.querySelectorAll('.step-line-type').forEach((sel) => {
      const idx = Number(sel.getAttribute('data-step-idx'));
      const lineType = sel.value;
      const labelInp = modal.querySelector(`.step-line-label[data-step-idx="${idx}"]`);
      const colorSel = modal.querySelector(`.step-line-color[data-step-idx="${idx}"]`);
      const colorHex = colorSel ? colorSel.value : '#F5B731';
      const labelText = labelInp ? labelInp.value : '';

      if (formData.transitSteps[idx]) {
        if (lineType === 'walk' && !labelText.trim()) {
          delete formData.transitSteps[idx].lineBadge;
        } else {
          formData.transitSteps[idx].lineBadge = {
            type: lineType,
            label: labelText,
            sublabel: lineType === 'metro' ? 'M' : undefined,
            bgColor: colorHex,
            textColor: colorHex === '#F5B731' ? '#1B1300' : '#FFFFFF',
            borderColor: colorHex
          };
        }
      }
    });
  }

  function renderModal() {
    modal.innerHTML = `
      <div class="modal-dialog">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h3 class="modal-heading">${existingItem ? 'Edit Event' : `Add Event to Day ${activeDay.dayNumber}`}</h3>
          <button type="button" style="color: var(--text-muted); cursor: pointer;" id="cancelEventModalBtn">&#10005;</button>
        </div>

        <div class="event-type-grid">
          <button type="button" class="event-type-btn ${currentType === 'venue' ? 'active' : ''}" data-type="venue">📍 Activity</button>
          <button type="button" class="event-type-btn ${currentType === 'alert' ? 'active' : ''}" data-type="alert">⏰ Alert</button>
          <button type="button" class="event-type-btn ${currentType === 'transport' ? 'active' : ''}" data-type="transport">🚀 Direct Transit</button>
          <button type="button" class="event-type-btn ${currentType === 'transit_chain' ? 'active' : ''}" data-type="transit_chain">🚇 Multi-leg Transit</button>
        </div>

        <form id="eventForm" style="display: flex; flex-direction: column; gap: 14px;">
          ${
            currentType === 'venue'
              ? `
            <!-- 1. Compact Time & Duration Row on top -->
            <div class="time-duration-row">
              <div class="form-group" style="width: auto;">
                <label class="form-label" for="eventTime" style="white-space: nowrap;">Start Time</label>
                <input class="text-input time-input-compact" id="eventTime" placeholder="09:30" value="${escapeHtml(formData.time)}" />
              </div>

              <div class="form-group" style="width: auto;">
                <label class="form-label" for="venueEndTime" style="white-space: nowrap;">End Time</label>
                <input class="text-input time-input-compact" id="venueEndTime" placeholder="11:30" value="${escapeHtml(formData.venueEndTime)}" />
              </div>

              <div class="form-group" style="width: auto;">
                <label class="form-label" for="venueDurationVal" style="white-space: nowrap;">Duration</label>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <input type="number" step="any" min="0" class="text-input duration-val-compact" id="venueDurationVal" placeholder="2" value="${escapeHtml(formData.venueDurationVal)}" />
                  <select class="text-input duration-unit-compact" id="venueDurationUnit">
                    <option value="hours" ${formData.venueDurationUnit === 'hours' ? 'selected' : ''}>hours</option>
                    <option value="minutes" ${formData.venueDurationUnit === 'minutes' ? 'selected' : ''}>minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 2. Title below time -->
            <div class="form-group">
              <label class="form-label" for="venueTitle">Title / Venue *</label>
              <input class="text-input" id="venueTitle" required placeholder="e.g. Kilchoman, Islay Hotel, Super Bar" value="${escapeHtml(formData.venueTitle)}" autofocus />
            </div>

            <!-- 3. Note / Subtitle -->
            <div class="form-group">
              <label class="form-label" for="venueSubtitle">Note / Subtitle (optional)</label>
              <input class="text-input" id="venueSubtitle" placeholder="e.g. visit and brunch, SIXT reservation 12345" value="${escapeHtml(formData.venueSubtitle)}" />
            </div>

            <!-- 5. Icon Picker -->
            <div class="form-group">
              <label class="form-label">Activity Icon</label>
              <div class="icon-picker-grid">
                ${[
                  { id: 'pin', name: 'Location' },
                  { id: 'bed', name: 'Hotel/Lodging' },
                  { id: 'pizza', name: 'Food/Dining' },
                  { id: 'cocktail', name: 'Bar/Drinks' },
                  { id: 'castle', name: 'Sights/Castles' },
                  { id: 'user', name: 'Meeting' },
                  { id: 'music', name: 'Music/Pub' },
                  { id: 'important', name: 'Important (!)' }
                ]
                  .map(
                    (ic) => `
                  <button type="button" class="icon-picker-btn ${selectedIcon === ic.id ? 'active' : ''}" data-icon="${ic.id}" title="${ic.name}">
                    ${getSvgIcon(ic.id, 18, selectedIcon === ic.id ? 'var(--accent-blue)' : 'currentColor')}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : currentType === 'alert'
              ? `
            <div class="form-group">
              <label class="form-label" for="eventTime">Time * (Mandatory)</label>
              <input class="text-input" id="eventTime" required placeholder="e.g. 05:00 or 15:30" value="${escapeHtml(formData.time)}" autofocus />
            </div>

            <div class="form-group">
              <label class="form-label" for="alertLabel">Alert / Deadline Message * (Mandatory)</label>
              <input class="text-input" id="alertLabel" required placeholder="e.g. departure from hotel, gate closes, ferry check-in" value="${escapeHtml(formData.alertLabel)}" />
            </div>
          `
              : currentType === 'transport'
              ? `
            <!-- Scheduled Time -->
            <div class="form-group">
              <label class="form-label" for="eventTime">Departure Time (optional)</label>
              <input class="text-input" id="eventTime" placeholder="e.g. 08:00 or 16:00" value="${escapeHtml(formData.time)}" />
            </div>

            <div class="form-group">
              <label class="form-label">Mode</label>
              <div class="event-type-tabs">
                <button type="button" class="event-type-btn ${transportMode === 'flight' ? 'active' : ''}" data-mode="flight">✈️ Flight</button>
                <button type="button" class="event-type-btn ${transportMode === 'drive' ? 'active' : ''}" data-mode="drive">🚗 Drive</button>
                <button type="button" class="event-type-btn ${transportMode === 'ferry' ? 'active' : ''}" data-mode="ferry">⛴️ Ferry</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label" for="transportBadge">Header Badge / Pill *</label>
                <input class="text-input" id="transportBadge" required placeholder="${transportMode === 'flight' ? 'e.g. Flight · FR1014' : transportMode === 'ferry' ? 'e.g. Ferry · Kennacraig' : 'e.g. Drive'}" value="${escapeHtml(formData.transportBadge || getModeDefaultBadge(transportMode))}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="transportNote">Note (optional)</label>
                <input class="text-input" id="transportNote" placeholder="e.g. estimated 2 hours, terminal 2" value="${escapeHtml(formData.transportNote)}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label" for="fromLabel">Origin (From) *</label>
                <input class="text-input" id="fromLabel" required placeholder="e.g. PRG or Edinburgh" value="${escapeHtml(formData.fromLabel)}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="fromTime">Origin Time</label>
                <input class="text-input" id="fromTime" placeholder="e.g. 08:00" value="${escapeHtml(formData.fromTime)}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label" for="toLabel">Destination (To) *</label>
                <input class="text-input" id="toLabel" required placeholder="e.g. EDI or Kennacraig" value="${escapeHtml(formData.toLabel)}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="toTime">Destination Time</label>
                <input class="text-input" id="toTime" placeholder="e.g. 10:00" value="${escapeHtml(formData.toTime)}" />
              </div>
            </div>
          `
              : `
            <!-- Multi-leg Transit -->
            <div class="form-group">
              <label class="form-label" for="eventTime">Departure Time (optional)</label>
              <input class="text-input" id="eventTime" placeholder="e.g. 05:15" value="${escapeHtml(formData.time)}" />
            </div>

            <div class="form-group">
              <label class="form-label">Transit Stops & Transfers</label>
              <div style="display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px;">
                ${formData.transitSteps
                  .map((step, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === formData.transitSteps.length - 1;
                    const badge = step.lineBadge || {};
                    const stepRole = isFirst ? 'Origin (Stop 1)' : isLast ? `Destination (Stop ${idx + 1})` : `Transfer (Stop ${idx + 1})`;
                    const roleColor = isFirst ? 'var(--accent-blue)' : isLast ? '#5ed3c4' : 'var(--text-secondary)';

                    let cardHtml = `
                    <div style="padding: 10px; background: var(--bg-canvas); border: 1px solid var(--border-card); border-radius: 8px; display: flex; flex-direction: column; gap: 8px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: ${roleColor};">
                          ${isFirst ? '📍' : isLast ? '🏁' : '🔄'} ${stepRole}
                        </span>
                        ${
                          formData.transitSteps.length > 2
                            ? `<button type="button" class="card-delete-btn" data-del-step="${idx}">Delete Stop</button>`
                            : ''
                        }
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                          <label class="form-label" style="font-size: 10.5px;">Station / Stop Name *</label>
                          <input type="text" class="text-input step-stop-input" data-step-idx="${idx}" placeholder="${isFirst ? 'e.g. Křižíkova' : isLast ? 'e.g. PRG T2' : 'e.g. Zličín'}" value="${escapeHtml(step.stop)}" required />
                        </div>
                        <div class="form-group">
                          <label class="form-label" style="font-size: 10.5px;">Stop Note / Time (optional)</label>
                          <input type="text" class="text-input step-note-input" data-step-idx="${idx}" placeholder="${isFirst ? 'e.g. dep 05:15' : isLast ? 'e.g. arrival ~06:15' : 'e.g. 5 min transfer'}" value="${escapeHtml(step.note || '')}" />
                        </div>
                      </div>
                    </div>
                    `;

                    if (!isLast) {
                      cardHtml += `
                      <div style="margin: 2px 0 2px 14px; padding: 6px 10px; border-left: 2px dashed var(--track-connector); display: flex; flex-direction: column; gap: 6px;">
                        <span style="font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">
                          Leg ${idx + 1} Transport (from Stop ${idx + 1} to Stop ${idx + 2}) ➔
                        </span>
                        <div style="display: grid; grid-template-columns: 100px 1fr 1fr; gap: 8px;">
                          <div>
                            <label class="form-label" style="font-size: 10px;">Line Type</label>
                            <select class="text-input step-line-type" data-step-idx="${idx}" style="padding: 4px 6px; font-size: 12px; height: 32px;">
                              <option value="metro" ${badge.type === 'metro' ? 'selected' : ''}>Metro</option>
                              <option value="bus" ${badge.type === 'bus' ? 'selected' : ''}>Bus</option>
                              <option value="tram" ${badge.type === 'tram' ? 'selected' : ''}>Tram</option>
                              <option value="train" ${badge.type === 'train' ? 'selected' : ''}>Train</option>
                              <option value="walk" ${badge.type === 'walk' ? 'selected' : ''}>Walk</option>
                              <option value="ferry" ${badge.type === 'ferry' ? 'selected' : ''}>Ferry</option>
                            </select>
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 10px;">Line Label</label>
                            <input type="text" class="text-input step-line-label" data-step-idx="${idx}" placeholder="e.g. B, #100, Tram 9" value="${escapeHtml(badge.label || '')}" style="height: 32px; padding: 4px 6px; font-size: 12px;" />
                          </div>
                          <div>
                            <label class="form-label" style="font-size: 10px;">Color</label>
                            <select class="text-input step-line-color" data-step-idx="${idx}" style="padding: 4px 6px; font-size: 12px; height: 32px;">
                              ${COLOR_PRESETS.map((c) => `<option value="${c.hex}" ${badge.bgColor === c.hex || badge.borderColor === c.hex ? 'selected' : ''}>${c.label}</option>`).join('')}
                            </select>
                          </div>
                        </div>
                      </div>
                      `;
                    }

                    return cardHtml;
                  })
                  .join('')}
              </div>
              <button type="button" class="btn-secondary" id="addTransitLegBtn" style="align-self: flex-start; margin-top: 4px; font-size: 11px;">+ Add Next Stop & Transfer</button>
            </div>
          `
          }

          <div class="dialog-actions">
            ${
              existingItem
                ? `<button type="button" class="btn-secondary" id="modalDeleteEventBtn" style="color: var(--accent-alert); border-color: rgba(255, 107, 94, 0.4); margin-right: auto;">Delete</button>`
                : ''
            }
            <button type="button" class="btn-secondary" id="cancelEventFormBtn">Cancel</button>
            <button type="submit" class="btn-secondary" style="background: var(--accent-blue); color: #09090b; border: none; font-weight: 600;">Save Event</button>
          </div>
        </form>
      </div>
    `;

    attachModalHandlers();
  }

  function attachModalHandlers() {
    attachTimeMask(modal.querySelector('#eventTime'));
    attachTimeMask(modal.querySelector('#venueEndTime'));
    attachTimeMask(modal.querySelector('#fromTime'));
    attachTimeMask(modal.querySelector('#toTime'));

    modal.querySelector('#cancelEventModalBtn').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancelEventFormBtn').addEventListener('click', () => modal.remove());

    const startTimeInp = modal.querySelector('#eventTime');
    const endTimeInp = modal.querySelector('#venueEndTime');
    const durValInp = modal.querySelector('#venueDurationVal');
    const durUnitSel = modal.querySelector('#venueDurationUnit');

    let isSyncing = false;

    const updateFromEndTime = () => {
      if (isSyncing) return;
      isSyncing = true;
      const start = startTimeInp ? startTimeInp.value.trim() : '';
      const end = endTimeInp ? endTimeInp.value.trim() : '';
      formData.venueEndTime = end;
      if (start && end) {
        const dur = calculateDurationFromTimes(start, end);
        if (dur) {
          if (durValInp) durValInp.value = dur.val;
          if (durUnitSel) durUnitSel.value = dur.unit;
          formData.venueDurationVal = dur.val;
          formData.venueDurationUnit = dur.unit;
        }
      }
      isSyncing = false;
    };

    const updateFromDuration = () => {
      if (isSyncing) return;
      isSyncing = true;
      const start = startTimeInp ? startTimeInp.value.trim() : '';
      const val = durValInp ? parseFloat(durValInp.value) : NaN;
      const unit = durUnitSel ? durUnitSel.value : 'hours';
      formData.venueDurationVal = durValInp ? durValInp.value : '';
      formData.venueDurationUnit = unit;
      if (start && !isNaN(val) && val > 0) {
        const end = calculateEndTimeFromDuration(start, val, unit);
        if (end) {
          if (endTimeInp) endTimeInp.value = end;
          formData.venueEndTime = end;
        }
      }
      isSyncing = false;
    };

    endTimeInp?.addEventListener('input', updateFromEndTime);
    endTimeInp?.addEventListener('change', updateFromEndTime);

    durValInp?.addEventListener('input', updateFromDuration);
    durValInp?.addEventListener('change', updateFromDuration);
    durUnitSel?.addEventListener('change', updateFromDuration);

    startTimeInp?.addEventListener('input', () => {
      formData.time = startTimeInp.value;
      if (currentType === 'venue') {
        const val = durValInp ? parseFloat(durValInp.value) : NaN;
        if (!isNaN(val) && val > 0) {
          updateFromDuration();
        } else if (endTimeInp && endTimeInp.value.trim()) {
          updateFromEndTime();
        }
      }
    });

    modal.querySelectorAll('.event-type-btn[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncDomToFormData();
        currentType = btn.getAttribute('data-type');
        if (currentType === 'transport' && (!formData.isBadgeCustom || !formData.transportBadge || ['Flight', 'Drive', 'Ferry'].includes(formData.transportBadge.trim()))) {
          formData.transportBadge = getModeDefaultBadge(transportMode);
        }
        renderModal();
      });
    });

    modal.querySelectorAll('.event-type-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncDomToFormData();
        const newMode = btn.getAttribute('data-mode');
        transportMode = newMode;
        if (!formData.isBadgeCustom || !formData.transportBadge || ['Flight', 'Drive', 'Ferry'].includes(formData.transportBadge.trim())) {
          formData.transportBadge = getModeDefaultBadge(newMode);
          formData.isBadgeCustom = false;
        }
        renderModal();
      });
    });

    modal.querySelectorAll('.icon-picker-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedIcon = btn.getAttribute('data-icon');
        modal.querySelectorAll('.icon-picker-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Multi-leg transit step interactions
    modal.querySelector('#addTransitLegBtn')?.addEventListener('click', () => {
      syncDomToFormData();
      formData.transitSteps.push({ stop: '', note: '' });
      renderModal();
    });

    modal.querySelectorAll('[data-del-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncDomToFormData();
        const idx = Number(btn.getAttribute('data-del-step'));
        formData.transitSteps.splice(idx, 1);
        renderModal();
      });
    });

    modal.querySelector('#modalDeleteEventBtn')?.addEventListener('click', () => {
      const title = existingItem ? (existingItem.title || existingItem.label || existingItem.badgeLabel || 'this event') : 'this event';
      if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

      activeDay.items = activeDay.items.filter((i) => i.id !== existingItem.id);
      recalculatePoolFreeTags(trip, activeDay);
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
      modal.remove();
      renderApp();
    });

    modal.querySelector('#eventForm').addEventListener('submit', (e) => {
      e.preventDefault();
      syncDomToFormData();
      const timeVal = formData.time.trim();

      let newItem = existingItem || { id: `event-${Date.now()}` };
      newItem.time = timeVal || undefined;

      if (currentType === 'venue') {
        newItem.type = 'venue';
        newItem.title = formData.venueTitle.trim();
        newItem.subtitle = formData.venueSubtitle.trim() || undefined;

        const start = formData.time.trim();
        const end = (formData.venueEndTime || '').trim();
        const durVal = (formData.venueDurationVal || '').trim();
        const durUnit = formData.venueDurationUnit || 'hours';

        newItem.endTime = end || undefined;
        newItem.durationVal = durVal || undefined;
        newItem.durationUnit = durUnit || undefined;

        if (start && end) {
          newItem.timeWindow = `${start}–${end}`;
        } else if (start && durVal) {
          const num = parseFloat(durVal);
          if (!isNaN(num) && num > 0) {
            const calcEnd = calculateEndTimeFromDuration(start, num, durUnit);
            newItem.timeWindow = `${start}–${calcEnd}`;
          } else {
            newItem.timeWindow = `${durVal} ${durUnit}`;
          }
        } else if (durVal) {
          newItem.timeWindow = `${durVal} ${durUnit}`;
        } else if (end) {
          newItem.timeWindow = `until ${end}`;
        } else {
          newItem.timeWindow = undefined;
        }

        newItem.icon = selectedIcon;
      } else if (currentType === 'alert') {
        const alertLabel = formData.alertLabel.trim();
        if (!timeVal || !alertLabel) {
          alert('Both time and alert message are required for alerts.');
          return;
        }
        newItem.type = 'alert';
        newItem.time = timeVal;
        newItem.label = alertLabel;
      } else if (currentType === 'transport') {
        newItem.type = 'transport';
        newItem.mode = transportMode;
        newItem.badgeLabel = formData.transportBadge.trim();
        newItem.note = formData.transportNote.trim() || undefined;
        newItem.badgeColor = transportMode === 'flight' ? '#6cb8ff' : transportMode === 'ferry' ? '#5ed3c4' : '#d4d4d8';
        newItem.from = {
          label: formData.fromLabel.trim(),
          time: formData.fromTime.trim() || undefined
        };
        newItem.to = {
          label: formData.toLabel.trim(),
          time: formData.toTime.trim() || undefined
        };
      } else if (currentType === 'transit_chain') {
        newItem.type = 'transit_chain';
        newItem.steps = formData.transitSteps.filter((s) => s.stop && s.stop.trim());
      }

      if (!existingItem) {
        if (!activeDay.items) activeDay.items = [];
        activeDay.items.push(newItem);
      }
      activeDay.items = sortDayItems(activeDay.items);
      recalculatePoolFreeTags(trip, activeDay);
      touchTrip(trip);
      saveTripsToStorage(state.trips, true);
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

// 10. Candidate Idea Modal (Add / Edit pool idea with smart tag generation)
function openIdeaModal(trip, existingIdea) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'ideaModal';

  let selectedIcon = existingIdea ? (existingIdea.icon || 'pin') : 'pin';
  let applicableDays = existingIdea ? (existingIdea.applicableDays || []) : [];

  const timeRangeExisting = existingIdea?.tags?.find((t) => /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/.test(t.text))?.text || '';

  modal.innerHTML = `
    <div class="modal-dialog">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <h3 class="modal-heading">${existingIdea ? 'Edit Idea' : 'Add Idea to Pool'}</h3>
        <button type="button" style="color: var(--text-muted); cursor: pointer;" id="cancelIdeaModalBtn">&#10005;</button>
      </div>

      <form id="ideaForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="ideaTitle">Idea / Candidate Title *</label>
          <input class="text-input" id="ideaTitle" required placeholder="e.g. Visit Bowmore, Meet Marion" value="${escapeHtml(existingIdea?.title || '')}" autofocus />
        </div>

        <div class="form-group">
          <label class="form-label" for="ideaTimeRange">Time Window / Range (optional)</label>
          <input class="text-input" id="ideaTimeRange" placeholder="e.g. 12:00–15:00 or 14:00–17:00" value="${escapeHtml(timeRangeExisting)}" />
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            A green "free XX:XX–YY:YY" pill will be automatically calculated against the day's schedule!
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">Icon</label>
          <div class="icon-picker-grid">
            ${[
              { id: 'pin', name: 'Location' },
              { id: 'bed', name: 'Hotel' },
              { id: 'pizza', name: 'Food' },
              { id: 'cocktail', name: 'Drinks' },
              { id: 'castle', name: 'Sights' },
              { id: 'user', name: 'Meeting' },
              { id: 'music', name: 'Music' },
              { id: 'important', name: 'Important (!)' }
            ]
              .map(
                (ic) => `
              <button type="button" class="icon-picker-btn ${selectedIcon === ic.id ? 'active' : ''}" data-idea-icon="${ic.id}" title="${ic.name}">
                ${getSvgIcon(ic.id, 18, selectedIcon === ic.id ? 'var(--accent-blue)' : 'currentColor')}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Applicable Days (Dates & Weekdays)</label>
          <div style="display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; padding: 4px 0;">
            ${trip.days
              .map((d) => {
                const date = getDateForDay(trip.startDate, d.dayNumber);
                const dayName = WEEKDAYS_SHORT[date.getDay()];
                const shortDate = formatShortDate(date);
                const checked = applicableDays.length === 0 || applicableDays.includes(d.dayNumber);
                return `
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 6px; background: var(--bg-canvas); border: 1px solid var(--border-card); font-family: var(--font-mono); font-size: 11.5px; cursor: pointer;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" class="day-checkbox" value="${d.dayNumber}" ${checked ? 'checked' : ''} />
                  <strong>Day ${d.dayNumber}</strong> · ${escapeHtml(d.routeTitle || '')}
                </span>
                <span style="color: var(--accent-blue);">${dayName} ${shortDate}</span>
              </label>
            `;
              })
              .join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="ideaCustomTags">Additional Tags (optional, comma-separated)</label>
          <input class="text-input" id="ideaCustomTags" placeholder="e.g. reservation required, outdoor" value="${
            existingIdea?.tags
              ? existingIdea.tags
                  .filter((t) => !/^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}/.test(t.text) && !/^free /i.test(t.text) && !/only$|any day$/i.test(t.text))
                  .map((t) => t.text)
                  .join(', ')
              : ''
          }" />
        </div>

        <div class="dialog-actions">
          ${
            existingIdea
              ? `<button type="button" class="btn-secondary" id="modalDeleteIdeaBtn" style="color: var(--accent-alert); border-color: rgba(255, 107, 94, 0.4); margin-right: auto;">Delete</button>`
              : ''
          }
          <button type="button" class="btn-secondary" id="cancelIdeaFormBtn">Cancel</button>
          <button type="submit" class="btn-secondary" style="background: var(--accent-blue); color: #09090b; border: none; font-weight: 600;">Save Idea</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  attachTimeRangeMask(modal.querySelector('#ideaTimeRange'));

  modal.querySelector('#cancelIdeaModalBtn').addEventListener('click', () => modal.remove());
  modal.querySelector('#cancelIdeaFormBtn').addEventListener('click', () => modal.remove());

  modal.querySelectorAll('[data-idea-icon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.getAttribute('data-idea-icon');
      modal.querySelectorAll('[data-idea-icon]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  modal.querySelector('#modalDeleteIdeaBtn')?.addEventListener('click', () => {
    const title = existingIdea ? existingIdea.title : 'this idea';
    if (!confirm(`Are you sure you want to delete "${title}" from the idea pool?`)) return;

    trip.pool = trip.pool.filter((i) => i.id !== existingIdea.id);
    const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
    recalculatePoolFreeTags(trip, activeDay);
    touchTrip(trip);
    saveTripsToStorage(state.trips, true);
    modal.remove();
    renderApp();
  });

  modal.querySelector('#ideaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = modal.querySelector('#ideaTitle').value.trim();
    if (!title) return;

    const checkedDays = Array.from(modal.querySelectorAll('.day-checkbox:checked')).map((cb) => Number(cb.value));
    const isAllDays = checkedDays.length === trip.days.length || checkedDays.length === 0;

    const tags = [];

    // 1. Automatic Day / Weekday Range Tag
    if (checkedDays.length === 1) {
      const singleDay = checkedDays[0];
      const singleDate = getDateForDay(trip.startDate, singleDay);
      if (singleDay === state.activeDayNumber) {
        tags.push({ icon: 'calendar', text: 'Today only', variant: 'amber' });
      } else {
        tags.push({ icon: 'calendar', text: `${WEEKDAYS_SHORT[singleDate.getDay()]} only`, variant: 'amber' });
      }
    } else if (checkedDays.length > 1 && checkedDays.length < trip.days.length) {
      const firstDate = getDateForDay(trip.startDate, checkedDays[0]);
      const lastDate = getDateForDay(trip.startDate, checkedDays[checkedDays.length - 1]);
      tags.push({ icon: 'calendar', text: `${WEEKDAYS_SHORT[firstDate.getDay()]}–${WEEKDAYS_SHORT[lastDate.getDay()]}`, variant: 'neutral' });
    } else {
      tags.push({ icon: 'calendar', text: 'Any day', variant: 'neutral' });
    }

    // 2. Time Range Tag & Automatic Free Gap calculation
    const timeRange = modal.querySelector('#ideaTimeRange').value.trim();
    if (timeRange) {
      tags.push({ icon: 'clock', text: timeRange, variant: 'blue' });

      // Calculate free gap against activeDay
      const activeDay = trip.days.find((d) => d.dayNumber === state.activeDayNumber) || trip.days[0];
      const freeWindow = calculateFreeTimeWindow(activeDay, timeRange);
      if (freeWindow) {
        tags.push({ icon: 'check', text: `free ${freeWindow}`, variant: 'green' });
      }
    }

    // 3. Additional custom tags
    const extraRaw = modal.querySelector('#ideaCustomTags').value.split(',').map((s) => s.trim()).filter(Boolean);
    extraRaw.forEach((txt) => {
      let icon = 'calendar';
      let variant = 'neutral';
      if (/free|ok|yes/i.test(txt)) {
        icon = 'check';
        variant = 'green';
      } else if (/today|alert/i.test(txt)) {
        variant = 'amber';
      }
      tags.push({ text: txt, icon, variant });
    });

    let item = existingIdea || { id: `pool-${Date.now()}` };
    item.title = title;
    item.icon = selectedIcon;
    item.applicableDays = isAllDays ? [] : checkedDays;
    item.timeRange = timeRange || undefined;
    item.tags = tags;

    if (!existingIdea) {
      if (!trip.pool) trip.pool = [];
      trip.pool.push(item);
    }

    recalculatePoolFreeTags(trip, activeDay);
    touchTrip(trip);
    saveTripsToStorage(state.trips, true);
    modal.remove();
    renderApp();
  });

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

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth >= 860 && !state.activeTripId && state.trips.length > 0) {
      autoSelectDefaultTrip();
      renderApp();
    }
  }, 150);
});
