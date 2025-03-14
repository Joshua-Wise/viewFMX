class GoFMXService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    this.status = import.meta.env.VITE_GOFMX_STATUS || 'FinalizedUpcoming';
  }

  getBuildingId() {
    // First check localStorage
    const storedBuildingId = localStorage.getItem('buildingId');
    if (storedBuildingId) {
      return storedBuildingId;
    }
    
    // If not in localStorage, check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlBuildingId = urlParams.get('buildingId');
    if (urlBuildingId) {
      return urlBuildingId;
    }
    
    // If not found in either place, throw error
    throw new Error('Building ID not configured. Please visit settings to configure or provide in URL.');
  }

  getResourceId() {
    // First check localStorage
    const storedResourceId = localStorage.getItem('resourceId');
    if (storedResourceId) {
      return storedResourceId;
    }
    
    // If not in localStorage, check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlResourceId = urlParams.get('resourceId');
    if (urlResourceId) {
      return urlResourceId;
    }
    
    // If not found in either place, throw error
    throw new Error('Resource ID not configured. Please visit settings to configure or provide in URL.');
  }

  async makeRequest(endpoint, options = {}) {
    // Remove any leading slash from the endpoint
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    // Ensure baseUrl doesn't end with a slash
    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/${cleanEndpoint}`;
    
    console.log('Making request to:', url);

    try {
      const response = await fetch(url, {
        ...options,
        method: options.method || 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  async getResourceDetails() {
    try {
      const resourceId = this.getResourceId();
      const endpoint = `/resources/${resourceId}`;
      const response = await this.makeRequest(endpoint);
      return response.name;
    } catch (error) {
      console.error('getResourceDetails error:', error);
      throw error;
    }
  }

  async getSchedule() {
    try {
      const buildingId = this.getBuildingId();
      const resourceId = this.getResourceId();

      const today = new Date();
      const thirtyDaysOut = new Date(today);
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

      today.setUTCHours(0, 0, 0, 0);
      thirtyDaysOut.setUTCHours(23, 59, 59, 999);

      const fromDate = today.toISOString().split('.')[0];
      const toDate = thirtyDaysOut.toISOString().split('.')[0];

      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        buildingIDs: buildingId,
        resourceIDs: resourceId,
        statuses: this.status  // Use the status from the class
      });

      const endpoint = `/scheduling/requests?${queryParams}`;
      const response = await this.makeRequest(endpoint);
      return this.transformScheduleData(response);
    } catch (error) {
      console.error('getSchedule error:', error);
      throw error;
    }
  }

  getNextWeeklyOccurrence(event, includeCurrentOccurrence = false) {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
  
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    thirtyDaysOut.setUTCHours(23, 59, 59, 999);
  
    // Ensure UTC time strings have 'Z' suffix
    const startUtc = event.firstOccurrenceEventTimeBlock.startTimeUtc.endsWith('Z') 
      ? event.firstOccurrenceEventTimeBlock.startTimeUtc 
      : event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z';
    const endUtc = event.firstOccurrenceEventTimeBlock.endTimeUtc.endsWith('Z')
      ? event.firstOccurrenceEventTimeBlock.endTimeUtc
      : event.firstOccurrenceEventTimeBlock.endTimeUtc + 'Z';
    
    const firstOccurrence = new Date(startUtc);
    const eventEndTime = new Date(endUtc);
    
    // Calculate event duration for later use
    const duration = eventEndTime - firstOccurrence;
    
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
  
    const targetDay = dayMap[event.schedule.weeklyDaysOfWeek[0]];
    const eventTime = new Date(startUtc);
    
    // Start from today
    let currentDate = new Date(today);
    
    // If it's the target day, check if the event is currently happening
    if (currentDate.getUTCDay() === targetDay) {
      const todayOccurrence = new Date(currentDate);
      // Set the date part only, keeping the original UTC time
      todayOccurrence.setUTCFullYear(currentDate.getUTCFullYear());
      todayOccurrence.setUTCMonth(currentDate.getUTCMonth());
      todayOccurrence.setUTCDate(currentDate.getUTCDate());
      // Set the time part from the original event
      todayOccurrence.setUTCHours(firstOccurrence.getUTCHours());
      todayOccurrence.setUTCMinutes(firstOccurrence.getUTCMinutes());
      
      // Calculate the end time of today's occurrence
      const todayOccurrenceEnd = new Date(todayOccurrence.getTime() + duration);
      
      // If the event is currently happening and we want to include current occurrences
      if (includeCurrentOccurrence && now >= todayOccurrence && now < todayOccurrenceEnd && todayOccurrence >= firstOccurrence) {
        return todayOccurrence.toISOString();
      }
      
      // If the event hasn't started yet today, we can use it
      if (todayOccurrence > now && todayOccurrence >= firstOccurrence) {
        return todayOccurrence.toISOString();
      }
      
      // If we're on the target day but the event has ended, skip to next week
      currentDate.setDate(currentDate.getDate() + 7);
    } else {
      // Find the next occurrence of the target day
      while (currentDate.getUTCDay() !== targetDay && currentDate <= thirtyDaysOut) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Find the next valid occurrence
    while (currentDate <= thirtyDaysOut) {
      // Check terminal end date if it exists
      if (event.schedule.terminal === 'On date') {
        const endDate = new Date(event.schedule.terminalEndDate + 'Z');
        if (currentDate > endDate) {
          return null;
        }
      }
      
      // Create the next occurrence preserving the original UTC time
      const nextOccurrence = new Date(currentDate);
      // Set the date part only, keeping the original UTC time
      nextOccurrence.setUTCFullYear(currentDate.getUTCFullYear());
      nextOccurrence.setUTCMonth(currentDate.getUTCMonth());
      nextOccurrence.setUTCDate(currentDate.getUTCDate());
      // Set the time part from the original event
      nextOccurrence.setUTCHours(firstOccurrence.getUTCHours());
      nextOccurrence.setUTCMinutes(firstOccurrence.getUTCMinutes());
      
      // Check if this occurrence is valid
      if (nextOccurrence >= firstOccurrence && nextOccurrence > now) {
        return nextOccurrence.toISOString();
      }
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
  
    return null;
  }
  
  getNextCustomOccurrence(event, includeCurrentOccurrence = false) {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
  
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    thirtyDaysOut.setUTCHours(23, 59, 59, 999);
  
    if (event.schedule.customOccurrenceDates) {
      const eventTime = new Date(event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z');
      const eventDuration = new Date(event.firstOccurrenceEventTimeBlock.endTimeUtc + 'Z') - eventTime;
      
      // Check if there's a current occurrence happening now
      if (includeCurrentOccurrence) {
        const currentDate = event.schedule.customOccurrenceDates.find(dateStr => {
          const occurrenceDate = new Date(dateStr + 'Z');
          occurrenceDate.setUTCHours(eventTime.getUTCHours());
          occurrenceDate.setUTCMinutes(eventTime.getUTCMinutes());
          
          const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);
          
          return now >= occurrenceDate && now < occurrenceEndTime;
        });
        
        if (currentDate) {
          const currentOccurrence = new Date(currentDate + 'Z');
          currentOccurrence.setUTCHours(eventTime.getUTCHours());
          currentOccurrence.setUTCMinutes(eventTime.getUTCMinutes());
          
          return currentOccurrence.toISOString();
        }
      }
      
      // Find the next valid date
      const nextDate = event.schedule.customOccurrenceDates.find(dateStr => {
        const occurrenceDate = new Date(dateStr + 'Z');
        occurrenceDate.setUTCHours(eventTime.getUTCHours());
        occurrenceDate.setUTCMinutes(eventTime.getUTCMinutes());
        
        return occurrenceDate > now && occurrenceDate <= thirtyDaysOut;
      });
  
      if (nextDate) {
        // Create the next occurrence with the adjusted time
        const nextOccurrence = new Date(nextDate + 'Z');
        nextOccurrence.setUTCHours(eventTime.getUTCHours());
        nextOccurrence.setUTCMinutes(eventTime.getUTCMinutes());
        
        return nextOccurrence.toISOString();
      }
    }
  
    return null;
  }
  
  transformScheduleData(data) {
    if (!Array.isArray(data)) {
      console.warn('Received invalid data format:', data);
      return [];
    }
  
    try {
      const transformedEvents = [];
      const now = new Date();
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
  
      data.forEach(event => {
        console.log(`Processing event: ${event.name}`);
        
        if (!event.firstOccurrenceEventTimeBlock?.startTimeUtc || 
            !event.firstOccurrenceEventTimeBlock?.endTimeUtc) {
          console.warn('Event missing required time blocks:', event.name);
          return;
        }
  
        // Ensure UTC time strings have 'Z' suffix
        const startUtc = event.firstOccurrenceEventTimeBlock.startTimeUtc.endsWith('Z') 
          ? event.firstOccurrenceEventTimeBlock.startTimeUtc 
          : event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z';
        const endUtc = event.firstOccurrenceEventTimeBlock.endTimeUtc.endsWith('Z')
          ? event.firstOccurrenceEventTimeBlock.endTimeUtc
          : event.firstOccurrenceEventTimeBlock.endTimeUtc + 'Z';
        
        const originalStart = new Date(startUtc);
        const originalEnd = new Date(endUtc);
        const duration = originalEnd - originalStart;

        // For one-time events
        if (event.schedule?.frequency === 'Never') {
          if (originalEnd >= today) {
            transformedEvents.push({
              id: `${event.id}`,
              title: event.name,
              startTime: startUtc,
              endTime: endUtc,
              date: startUtc.split('T')[0],
              isPrivate: Boolean(event.isPrivate),
              status: event.status || 'unknown',
              frequency: event.schedule.frequency
            });
          }
        }
        // Handle weekly events
        else if (event.schedule?.frequency === 'Weekly' && 
            event.schedule.weeklyDaysOfWeek?.length > 0) {
          
          // Create a deep copy of the event with the corrected UTC times
          const eventCopy = {
            ...event,
            name: event.name,
            schedule: {
              ...event.schedule,
              weeklyDaysOfWeek: [...event.schedule.weeklyDaysOfWeek]
            },
            firstOccurrenceEventTimeBlock: {
              ...event.firstOccurrenceEventTimeBlock,
              startTimeUtc: startUtc,
              endTimeUtc: endUtc
            }
          };

          // Check if the original occurrence is currently happening or upcoming
          if (originalEnd >= now) {
            transformedEvents.push({
              id: `${event.id}_original`,
              title: event.name,
              startTime: startUtc,
              endTime: endUtc,
              date: startUtc.split('T')[0],
              isPrivate: Boolean(event.isPrivate),
              status: event.status || 'unknown',
              frequency: event.schedule.frequency
            });
          }
          
          // Check if there's a current occurrence happening now
          const currentStartTime = this.getNextWeeklyOccurrence(eventCopy, true);
          if (currentStartTime && new Date(currentStartTime) <= now) {
            const currentEndTime = new Date(new Date(currentStartTime).getTime() + duration).toISOString();
            
            // Only add if this is not the original occurrence
            if (currentStartTime !== startUtc) {
              transformedEvents.push({
                id: `${event.id}_current`,
                title: event.name,
                startTime: currentStartTime,
                endTime: currentEndTime,
                date: currentStartTime.split('T')[0],
                isPrivate: Boolean(event.isPrivate),
                status: event.status || 'unknown',
                frequency: event.schedule.frequency
              });
            }
          }
          
          // Get the next occurrence
          const nextStartTime = this.getNextWeeklyOccurrence(eventCopy);
          if (nextStartTime && new Date(nextStartTime) > now) {
            const nextEndTime = new Date(new Date(nextStartTime).getTime() + duration).toISOString();
            transformedEvents.push({
              id: `${event.id}_next`,
              title: event.name,
              startTime: nextStartTime,
              endTime: nextEndTime,
              date: nextStartTime.split('T')[0],
              isPrivate: Boolean(event.isPrivate),
              status: event.status || 'unknown',
              frequency: event.schedule.frequency
            });
          }
        }
        // Handle custom frequency events
        else if (event.schedule?.frequency === 'Custom') {
          // Check if the original occurrence is currently happening or upcoming
          if (originalEnd >= now) {
            transformedEvents.push({
              id: `${event.id}_original`,
              title: event.name,
              startTime: startUtc,
              endTime: endUtc,
              date: startUtc.split('T')[0],
              isPrivate: Boolean(event.isPrivate),
              status: event.status || 'unknown',
              frequency: event.schedule.frequency
            });
          }
          
          // Check if there's a current occurrence happening now
          const currentStartTime = this.getNextCustomOccurrence(event, true);
          if (currentStartTime && new Date(currentStartTime) <= now) {
            const currentEndTime = new Date(new Date(currentStartTime).getTime() + duration).toISOString();
            
            // Only add if this is not the original occurrence
            if (currentStartTime !== startUtc) {
              transformedEvents.push({
                id: `${event.id}_current`,
                title: event.name,
                startTime: currentStartTime,
                endTime: currentEndTime,
                date: currentStartTime.split('T')[0],
                isPrivate: Boolean(event.isPrivate),
                status: event.status || 'unknown',
                frequency: event.schedule.frequency
              });
            }
          }
          
          // Get the next occurrence
          const nextStartTime = this.getNextCustomOccurrence(event);
          if (nextStartTime && new Date(nextStartTime) > now) {
            const nextEndTime = new Date(new Date(nextStartTime).getTime() + duration).toISOString();
            transformedEvents.push({
              id: `${event.id}_next`,
              title: event.name,
              startTime: nextStartTime,
              endTime: nextEndTime,
              date: nextStartTime.split('T')[0],
              isPrivate: Boolean(event.isPrivate),
              status: event.status || 'unknown',
              frequency: event.schedule.frequency
            });
          }
        }
      });
  
      // Sort events by start time
      return transformedEvents.sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateA - dateB;
      });
      
    } catch (error) {
      console.error('Error in transformScheduleData:', error);
      return [];
    }
  }
  async createImpromptuMeeting(duration) {
    try {
      const buildingId = this.getBuildingId();
      const resourceId = this.getResourceId();
      
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60000); // Convert minutes to milliseconds

      const requestData = {
        name: "Quick Meeting",
        requestTypeID: 295769,
        buildingIDs: [parseInt(buildingId)],
        resourceQuantities: [
          {
            resourceID: parseInt(resourceId)
          }
        ],
        schedule: {
          frequency: "Never",
          interval: 1,
          terminalEndDate: endTime.toISOString(),
          customOccurrenceDates: [startTime.toISOString()]
        },
        firstOccurrenceEventTimeBlock: {
          startTimeUtc: startTime.toISOString(),
          endTimeUtc: endTime.toISOString()
        },
        isPrivate: true,
        customFields: [
          {
            customFieldID: 585349,
            name: "00: Number of Attendees",
            value: 1
          },
          {
            customFieldID: 593873,
            name: "Additional Details",
            value: "No"
          },
          {
            customFieldID: 587658,
            name: "03. Technology Resources",
            value: "No"
          },
          {
            customFieldID: 593550,
            name: "002: Facility Resources",
            value: "No"
          },
          {
            customFieldID: 593873,
            name: "Additional Details",
            value: "No"
          }
        ]
      };

      const endpoint = 'scheduling/requests?conflictResolutionMode=ExcludeConflicts';
      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      return response;
    } catch (error) {
      console.error('createImpromptuMeeting error:', error);
      throw error;
    }
  }
}

export const gofmxService = new GoFMXService();
export default gofmxService;
