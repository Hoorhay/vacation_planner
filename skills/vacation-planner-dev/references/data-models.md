# Data Models & Schemas

## Application State (`state`)
```javascript
{
  trips: [ /* Array of Trip objects */ ],
  activeTripId: "trip-uuid",    // ID of current active trip, or null
  activeDayNumber: 1,           // Current active day index (1-based)
  credentials: {
    dbUrl: "https://...firebaseio.com",
    authSecret: "secret-or-empty",
    isReadOnly: false
  },
  sync: {
    dirty: false,               // True if unsaved changes exist locally
    isSyncing: false,
    lastSyncedAt: 1729600000000
  }
}
```

---

## Trip Object
```javascript
{
  id: "trip-1729600000000",
  name: "Japan 2026",
  startDate: "2026-10-15",     // ISO YYYY-MM-DD
  totalDays: 10,               // Number of days in the trip
  createdAt: 1729600000000,
  updatedAt: 1729600000000,
  days: [ /* Array of Day objects */ ],
  pool: [ /* Array of Idea objects */ ]
}
```

---

## Day Object
```javascript
{
  dayNumber: 1,                // 1-based day index
  title: "Arrival in Tokyo",  // Optional day subtitle/focus
  items: [ /* Array of TimelineItem objects, sorted chronologically */ ]
}
```

---

## Timeline Item (`TimelineItem`) Types

### 1. Activity / Venue (`type: 'venue'`)
```javascript
{
  id: "evt-1729600000000-abcde",
  type: "venue",
  title: "Senso-ji Temple",        // Required
  subtitle: "Explore Asakusa",     // Optional note
  time: "09:30",                  // Start time (HH:MM)
  endTime: "11:30",               // Optional end time (HH:MM)
  durationVal: "2",               // Optional numeric duration
  durationUnit: "hours",          // "hours" | "minutes"
  timeWindow: "09:30–11:30",      // Formatted range string or until/duration
  icon: "pin"                     // Icon ID: pin, bed, pizza, cocktail, castle, user, music, important
}
```

### 2. Alert / Milestone (`type: 'alert'`)
```javascript
{
  id: "evt-1729600000000-bcdef",
  type: "alert",
  time: "12:00",                  // Required time (HH:MM)
  label: "Hotel Check-out"        // Required alert message
}
```

### 3. Direct Transit (`type: 'transport'`)
```javascript
{
  id: "evt-1729600000000-cdefg",
  type: "transport",
  time: "08:00",                  // Scheduled departure time (for sorting and gutter)
  mode: "flight",                 // "flight" | "drive" | "train" | "ferry"
  badgeLabel: "Flight · JL005",   // Required header badge
  note: "Terminal 2",             // Optional subtitle note
  badgeColor: "#6cb8ff",          // Mode accent color
  from: {
    label: "HND",                 // Origin name / airport code
    time: "08:00"                 // Departure time
  },
  to: {
    label: "CTS",                 // Destination name / airport code
    time: "09:35"                 // Arrival time
  }
}
```

### 4. Multi-leg Transit (`type: 'transit_chain'`)
```javascript
{
  id: "evt-1729600000000-defgh",
  type: "transit_chain",
  time: "14:00",                  // Optional departure time
  steps: [
    {
      stop: "Shinjuku Station",
      note: "Platform 3",
      lineBadge: {
        type: "metro",            // "metro" | "bus" | "walk"
        label: "Yamanote",
        sublabel: "M",
        bgColor: "#F5B731",
        textColor: "#1B1300",
        borderColor: "#F5B731"
      }
    },
    {
      stop: "Shibuya Station",
      note: "Exit Hachiko"
    }
  ]
}
```

---

## Pool Idea Object (`Idea`)
```javascript
{
  id: "idea-1729600000000-efghi",
  title: "TeamLab Planets",
  notes: "Book tickets 2 weeks ahead",
  timeRange: "14:00–16:00",       // Target or expected window
  applicableDays: [1, 2, 3],      // Empty array or omitted = applies to all days
  tags: [
    { text: "14:00–16:00", icon: "clock", variant: "neutral" },
    { text: "free 14:00–17:00", icon: "check", variant: "green" } // Dynamically calculated
  ]
}
```

---

## Key Algorithmic Behaviors

1. **`sortDayItems(items)`**:
   - Performs stable in-place/indexed sort on timed items (`item.time` matching `HH:MM`).
   - Non-timed items preserve their relative slot order.
2. **`calculateFreeTimeWindow(day, targetRangeStr)`**:
   - Analyzes scheduled busy intervals across `item.time`, `item.endTime`, and `item.from.time` / `item.to.time`.
   - Identifies candidate non-overlapping gaps in the schedule (>25 min).
3. **`recalculatePoolFreeTags(trip, activeDay)`**:
   - Re-evaluates all candidate pool items against the day's timeline.
   - Cleans old `free ...` tags and injects green `free HH:MM–HH:MM` checkmark badges.
