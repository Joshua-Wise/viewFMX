'use strict';

const express = require('express');
const { transformScheduleData, getCurrentEvent, getUpcomingEvents } = require('./scheduleService');

const app = express();
app.use(express.json());

const GOFMX_BASE = (process.env.GOFMX_API_BASE || '').replace(/\/+$/, '');
const GOFMX_TOKEN = process.env.GOFMX_TOKEN || '';
const GOFMX_STATUS = process.env.VITE_GOFMX_STATUS || 'FinalizedUpcoming';
const PORT = parseInt(process.env.PORT || '3001', 10);

if (!GOFMX_BASE || !GOFMX_TOKEN) {
  console.error('FATAL: GOFMX_API_BASE and GOFMX_TOKEN must be set');
  process.exit(1);
}

function gofmxHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${GOFMX_TOKEN}`,
  };
}

async function gofmxGet(path) {
  const url = `${GOFMX_BASE}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, { headers: gofmxHeaders() });
  if (!res.ok) throw Object.assign(new Error(`GoFMX ${res.status}`), { status: res.status });
  return res.json();
}

async function gofmxPost(path, body) {
  const url = `${GOFMX_BASE}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, { method: 'POST', headers: gofmxHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw Object.assign(new Error(`GoFMX ${res.status}`), { status: res.status });
  return res.json();
}

// GET /device/v1/rooms/:resourceId/status?buildingId=<id>[&count=<n>]
app.get('/device/v1/rooms/:resourceId/status', async (req, res) => {
  const { resourceId } = req.params;
  const buildingId = req.query.buildingId;
  const count = Math.min(parseInt(req.query.count || '5', 10), 20);

  if (!buildingId) {
    return res.status(400).json({ error: 'buildingId query parameter is required' });
  }

  try {
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setUTCHours(0, 0, 0, 0);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 30);
    toDate.setUTCHours(23, 59, 59, 999);

    const scheduleQs = new URLSearchParams({
      fromDate: fromDate.toISOString().split('.')[0],
      toDate: toDate.toISOString().split('.')[0],
      buildingIDs: buildingId,
      resourceIDs: resourceId,
      statuses: GOFMX_STATUS,
    });

    const [resourceData, rawSchedule] = await Promise.all([
      gofmxGet(`/resources/${resourceId}`),
      gofmxGet(`/scheduling/requests?${scheduleQs}`),
    ]);

    const events = transformScheduleData(rawSchedule);
    const current = getCurrentEvent(events);
    const upcoming = getUpcomingEvents(events, current, count);

    const minutesRemaining = current
      ? Math.max(0, Math.ceil((new Date(current.endTime) - now) / 60000))
      : null;

    res.json({
      room: {
        resource_id: resourceId,
        building_id: buildingId,
        name: resourceData.name || 'Unknown Room',
      },
      as_of: now.toISOString(),
      status: current ? 'busy' : 'free',
      current_meeting: current
        ? {
            id: current.id,
            title: current.title,
            is_private: current.isPrivate,
            start_time: current.startTime,
            end_time: current.endTime,
            minutes_remaining: minutesRemaining,
          }
        : null,
      upcoming_meetings: upcoming.map(e => ({
        id: e.id,
        title: e.title,
        is_private: e.isPrivate,
        start_time: e.startTime,
        end_time: e.endTime,
      })),
    });
  } catch (err) {
    console.error('GET status error:', err);
    const status = err.status === 401 || err.status === 403 ? 502 : 500;
    res.status(status).json({ error: err.message });
  }
});

// POST /device/v1/rooms/:resourceId/book
// Body: { "building_id": "123", "duration_minutes": 30 }
app.post('/device/v1/rooms/:resourceId/book', async (req, res) => {
  const { resourceId } = req.params;
  const { building_id: buildingId, duration_minutes: durationMinutes } = req.body;

  if (!buildingId || !durationMinutes) {
    return res.status(400).json({ error: 'building_id and duration_minutes are required' });
  }

  const dur = parseInt(durationMinutes, 10);
  if (isNaN(dur) || dur < 1 || dur > 480) {
    return res.status(400).json({ error: 'duration_minutes must be 1–480' });
  }

  try {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + dur * 60000);

    const body = {
      name: 'Quick Meeting',
      requestTypeID: 295769,
      buildingIDs: [parseInt(buildingId, 10)],
      resourceQuantities: [{ resourceID: parseInt(resourceId, 10) }],
      schedule: {
        frequency: 'Never',
        interval: 1,
        terminalEndDate: endTime.toISOString(),
        customOccurrenceDates: [startTime.toISOString()],
      },
      firstOccurrenceEventTimeBlock: {
        startTimeUtc: startTime.toISOString(),
        endTimeUtc: endTime.toISOString(),
      },
      isPrivate: true,
      customFields: [
        { customFieldID: 585349, name: '00: Number of Attendees', value: 1 },
        { customFieldID: 593873, name: 'Additional Details', value: 'No' },
        { customFieldID: 587658, name: '03. Technology Resources', value: 'No' },
        { customFieldID: 593550, name: '002: Facility Resources', value: 'No' },
      ],
    };

    const result = await gofmxPost(
      'scheduling/requests?conflictResolutionMode=ExcludeConflicts',
      body
    );

    res.json({
      success: true,
      meeting_id: String(result.id || ''),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });
  } catch (err) {
    console.error('POST book error:', err);
    if (err.status === 409) {
      return res.status(409).json({ success: false, error: 'Room is not available for the requested duration' });
    }
    const status = err.status === 401 || err.status === 403 ? 502 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`viewfmx api-server listening on :${PORT}`));
