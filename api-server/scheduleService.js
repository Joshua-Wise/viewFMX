'use strict';

// Port of gofmxService.js transformation logic — pure date math, no browser APIs.

function ensureZ(s) {
  return s && !s.endsWith('Z') ? s + 'Z' : s;
}

function getNextWeeklyOccurrence(event, includeCurrentOccurrence = false) {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  thirtyDaysOut.setUTCHours(23, 59, 59, 999);

  const startUtc = ensureZ(event.firstOccurrenceEventTimeBlock.startTimeUtc);
  const endUtc = ensureZ(event.firstOccurrenceEventTimeBlock.endTimeUtc);

  const firstOccurrence = new Date(startUtc);
  const eventEndTime = new Date(endUtc);
  const duration = eventEndTime - firstOccurrence;

  const dayMap = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };

  const targetDay = dayMap[event.schedule.weeklyDaysOfWeek[0]];
  let currentDate = new Date(today);

  if (currentDate.getUTCDay() === targetDay) {
    const todayOcc = new Date(currentDate);
    todayOcc.setUTCHours(firstOccurrence.getUTCHours(), firstOccurrence.getUTCMinutes(), 0, 0);
    const todayOccEnd = new Date(todayOcc.getTime() + duration);

    if (includeCurrentOccurrence && now >= todayOcc && now < todayOccEnd && todayOcc >= firstOccurrence) {
      return todayOcc.toISOString();
    }
    if (todayOcc > now && todayOcc >= firstOccurrence) {
      return todayOcc.toISOString();
    }
    currentDate.setDate(currentDate.getDate() + 7);
  } else {
    while (currentDate.getUTCDay() !== targetDay && currentDate <= thirtyDaysOut) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  while (currentDate <= thirtyDaysOut) {
    if (event.schedule.terminal === 'On date') {
      const endDate = new Date(event.schedule.terminalEndDate + 'Z');
      if (currentDate > endDate) return null;
    }

    const nextOcc = new Date(currentDate);
    nextOcc.setUTCHours(firstOccurrence.getUTCHours(), firstOccurrence.getUTCMinutes(), 0, 0);

    if (nextOcc >= firstOccurrence && nextOcc > now) {
      return nextOcc.toISOString();
    }

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return null;
}

function getNextCustomOccurrence(event, includeCurrentOccurrence = false) {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  thirtyDaysOut.setUTCHours(23, 59, 59, 999);

  if (!event.schedule.customOccurrenceDates) return null;

  const eventTime = new Date(ensureZ(event.firstOccurrenceEventTimeBlock.startTimeUtc));
  const eventDuration =
    new Date(ensureZ(event.firstOccurrenceEventTimeBlock.endTimeUtc)) - eventTime;

  if (includeCurrentOccurrence) {
    const current = event.schedule.customOccurrenceDates.find(dateStr => {
      const occ = new Date(dateStr + 'Z');
      occ.setUTCHours(eventTime.getUTCHours(), eventTime.getUTCMinutes(), 0, 0);
      return now >= occ && now < new Date(occ.getTime() + eventDuration);
    });

    if (current) {
      const occ = new Date(current + 'Z');
      occ.setUTCHours(eventTime.getUTCHours(), eventTime.getUTCMinutes(), 0, 0);
      return occ.toISOString();
    }
  }

  const next = event.schedule.customOccurrenceDates.find(dateStr => {
    const occ = new Date(dateStr + 'Z');
    occ.setUTCHours(eventTime.getUTCHours(), eventTime.getUTCMinutes(), 0, 0);
    return occ > now && occ <= thirtyDaysOut;
  });

  if (next) {
    const occ = new Date(next + 'Z');
    occ.setUTCHours(eventTime.getUTCHours(), eventTime.getUTCMinutes(), 0, 0);
    return occ.toISOString();
  }

  return null;
}

function transformScheduleData(data) {
  if (!Array.isArray(data)) return [];

  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const transformed = [];

  for (const event of data) {
    if (
      !event.firstOccurrenceEventTimeBlock?.startTimeUtc ||
      !event.firstOccurrenceEventTimeBlock?.endTimeUtc
    ) continue;

    const startUtc = ensureZ(event.firstOccurrenceEventTimeBlock.startTimeUtc);
    const endUtc = ensureZ(event.firstOccurrenceEventTimeBlock.endTimeUtc);
    const originalStart = new Date(startUtc);
    const originalEnd = new Date(endUtc);
    const duration = originalEnd - originalStart;

    const base = {
      title: event.name,
      isPrivate: Boolean(event.isPrivate),
      status: event.status || 'unknown',
      frequency: event.schedule?.frequency,
    };

    if (event.schedule?.frequency === 'Never') {
      if (originalEnd >= today) {
        transformed.push({ id: `${event.id}`, ...base, startTime: startUtc, endTime: endUtc });
      }
    } else if (
      event.schedule?.frequency === 'Weekly' &&
      event.schedule.weeklyDaysOfWeek?.length > 0
    ) {
      const eventCopy = {
        ...event,
        firstOccurrenceEventTimeBlock: { ...event.firstOccurrenceEventTimeBlock, startTimeUtc: startUtc, endTimeUtc: endUtc },
        schedule: { ...event.schedule, weeklyDaysOfWeek: [...event.schedule.weeklyDaysOfWeek] },
      };

      if (originalEnd >= now) {
        transformed.push({ id: `${event.id}_original`, ...base, startTime: startUtc, endTime: endUtc });
      }

      const curStart = getNextWeeklyOccurrence(eventCopy, true);
      if (curStart && new Date(curStart) <= now && curStart !== startUtc) {
        transformed.push({
          id: `${event.id}_current`, ...base,
          startTime: curStart,
          endTime: new Date(new Date(curStart).getTime() + duration).toISOString(),
        });
      }

      const nextStart = getNextWeeklyOccurrence(eventCopy);
      if (nextStart && new Date(nextStart) > now) {
        transformed.push({
          id: `${event.id}_next`, ...base,
          startTime: nextStart,
          endTime: new Date(new Date(nextStart).getTime() + duration).toISOString(),
        });
      }
    } else if (event.schedule?.frequency === 'Custom') {
      if (originalEnd >= now) {
        transformed.push({ id: `${event.id}_original`, ...base, startTime: startUtc, endTime: endUtc });
      }

      const curStart = getNextCustomOccurrence(event, true);
      if (curStart && new Date(curStart) <= now && curStart !== startUtc) {
        transformed.push({
          id: `${event.id}_current`, ...base,
          startTime: curStart,
          endTime: new Date(new Date(curStart).getTime() + duration).toISOString(),
        });
      }

      const nextStart = getNextCustomOccurrence(event);
      if (nextStart && new Date(nextStart) > now) {
        transformed.push({
          id: `${event.id}_next`, ...base,
          startTime: nextStart,
          endTime: new Date(new Date(nextStart).getTime() + duration).toISOString(),
        });
      }
    }
  }

  // A recurring event whose first occurrence is still in the future emits
  // both `_original` and `_next` with identical times; collapse any
  // duplicate (event, startTime) pairs. Key on the parsed timestamp:
  // `_original` keeps GoFMX's string ("...00Z") while computed occurrences
  // are toISOString() ("...00.000Z"), so string keys would not match.
  const seen = new Set();
  const deduped = transformed.filter(e => {
    const key = `${e.id.split('_')[0]}|${new Date(e.startTime).getTime()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

function getCurrentEvent(events) {
  const now = new Date();
  return events.find(e => now >= new Date(e.startTime) && now < new Date(e.endTime)) || null;
}

function getUpcomingEvents(events, currentEvent, count) {
  const now = new Date();
  // Match the web app: only show one week of upcoming events.
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return events
    .filter(e => {
      if (currentEvent && e.id === currentEvent.id) return false;
      if (new Date(e.startTime) > weekOut) return false;
      if (e.frequency && e.frequency !== 'Never') return new Date(e.startTime) > now;
      return now < new Date(e.endTime);
    })
    .slice(0, count);
}

module.exports = { transformScheduleData, getCurrentEvent, getUpcomingEvents };
