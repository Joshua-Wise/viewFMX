class GoFMXService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    this.token = import.meta.env.VITE_GOFMX_TOKEN;
    this.status = import.meta.env.VITE_GOFMX_STATUS || 'FinalizedUpcoming';
  }

  getBuildingId() {
    const storedBuildingId = localStorage.getItem('buildingId');
    if (!storedBuildingId) {
      throw new Error('Building ID not configured. Please visit settings to configure.');
    }
    return storedBuildingId;
  }

  getResourceId() {
    const storedResourceId = localStorage.getItem('resourceId');
    if (!storedResourceId) {
      throw new Error('Resource ID not configured. Please visit settings to configure.');
    }
    return storedResourceId;
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
        method: 'GET',
        headers: {
          'Accept': 'application/json'
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

  adjustEventTime(date) {
    // Add one hour to the time
    const adjustedDate = new Date(date);
    adjustedDate.setHours(adjustedDate.getHours() + 1);
    return adjustedDate;
  }

  getNextWeeklyOccurrence(event) {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
  
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    thirtyDaysOut.setUTCHours(23, 59, 59, 999);
  
    const firstOccurrence = new Date(event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z');
    const eventEndTime = new Date(event.firstOccurrenceEventTimeBlock.endTimeUtc + 'Z');
    
    // Calculate event duration for later use
    const duration = eventEndTime - firstOccurrence;
    
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
  
    const targetDay = dayMap[event.schedule.weeklyDaysOfWeek[0]];
    const eventTime = new Date(event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z');
    
    // Start from today
    let currentDate = new Date(today);
    
    // If it's the target day and the event hasn't started yet, we can use today
    if (currentDate.getUTCDay() === targetDay) {
      const todayOccurrence = new Date(currentDate);
      todayOccurrence.setUTCHours(eventTime.getUTCHours());
      todayOccurrence.setUTCMinutes(eventTime.getUTCMinutes());
      
      // Add one hour to adjust for the bug
      const adjustedTodayOccurrence = this.adjustEventTime(todayOccurrence);
      
      // If the event hasn't started yet today, we can use it
      if (adjustedTodayOccurrence > now && adjustedTodayOccurrence >= firstOccurrence) {
        return adjustedTodayOccurrence.toISOString();
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
      
      // Create the next occurrence with the original event time
      const nextOccurrence = new Date(currentDate);
      nextOccurrence.setUTCHours(eventTime.getUTCHours());
      nextOccurrence.setUTCMinutes(eventTime.getUTCMinutes());
      
      // Add one hour to adjust for the bug
      const adjustedOccurrence = this.adjustEventTime(nextOccurrence);
      
      // Check if this occurrence is valid
      if (adjustedOccurrence >= firstOccurrence && adjustedOccurrence > now) {
        return adjustedOccurrence.toISOString();
      }
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
  
    return null;
  }
  
  getNextCustomOccurrence(event) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
  
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    thirtyDaysOut.setUTCHours(23, 59, 59, 999);
  
    if (event.schedule.customOccurrenceDates) {
      const eventTime = new Date(event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z');
      
      // Find the next valid date
      const nextDate = event.schedule.customOccurrenceDates.find(dateStr => {
        const occurrenceDate = new Date(dateStr + 'Z');
        occurrenceDate.setUTCHours(eventTime.getUTCHours());
        occurrenceDate.setUTCMinutes(eventTime.getUTCMinutes());
        
        // Add one hour to adjust for the bug
        const adjustedDate = this.adjustEventTime(occurrenceDate);
        
        return adjustedDate >= today && adjustedDate <= thirtyDaysOut;
      });
  
      if (nextDate) {
        // Create the next occurrence with the adjusted time
        const nextOccurrence = new Date(nextDate + 'Z');
        nextOccurrence.setUTCHours(eventTime.getUTCHours());
        nextOccurrence.setUTCMinutes(eventTime.getUTCMinutes());
        
        // Add one hour to adjust for the bug
        const adjustedOccurrence = this.adjustEventTime(nextOccurrence);
        return adjustedOccurrence.toISOString();
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
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
  
      data.forEach(event => {
        console.log(`Processing event: ${event.name}`);
        
        if (!event.firstOccurrenceEventTimeBlock?.startTimeUtc || 
            !event.firstOccurrenceEventTimeBlock?.endTimeUtc) {
          console.warn('Event missing required time blocks:', event.name);
          return;
        }
  
        let startTime = event.firstOccurrenceEventTimeBlock.startTimeUtc;
        let endTime = event.firstOccurrenceEventTimeBlock.endTimeUtc;
  
        // For one-time events, ensure we append 'Z' and handle times directly
        if (event.schedule?.frequency === 'Never') {
          startTime = startTime + 'Z';
          endTime = endTime + 'Z';
          
          console.log(`Processing one-time event: ${event.name} at ${startTime}`);
        }
        // Handle weekly events
        else if (event.schedule?.frequency === 'Weekly' && 
            event.schedule.weeklyDaysOfWeek?.length > 0) {
          startTime = this.getNextWeeklyOccurrence(event);
          
          if (startTime) {
            const originalStart = new Date(event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z');
            const originalEnd = new Date(event.firstOccurrenceEventTimeBlock.endTimeUtc + 'Z');
            const duration = originalEnd - originalStart;
            const newEnd = new Date(new Date(startTime).getTime() + duration);
            endTime = newEnd.toISOString();
          } else {
            console.log(`No upcoming occurrences found for weekly event: ${event.name}`);
            return;
          }
        }
        // Handle custom frequency events
        else if (event.schedule?.frequency === 'Custom') {
          startTime = this.getNextCustomOccurrence(event);
          
          if (startTime) {
            const originalStart = new Date(event.firstOccurrenceEventTimeBlock.startTimeUtc + 'Z');
            const originalEnd = new Date(event.firstOccurrenceEventTimeBlock.endTimeUtc + 'Z');
            const duration = originalEnd - originalStart;
            const newEnd = new Date(new Date(startTime).getTime() + duration);
            endTime = newEnd.toISOString();
          } else {
            console.log(`No upcoming occurrences found for custom event: ${event.name}`);
            return;
          }
        }
  
        if (!startTime || !endTime) {
          console.warn('Unable to determine times for event:', event.name);
          return;
        }
  
        const eventStart = new Date(startTime);
        const eventEnd = new Date(endTime);
  
        // Skip events that are in the past
        if (eventEnd < today) {
          console.log(`Skipping past event: ${event.name}`);
          return;
        }
  
        const transformedEvent = {
          id: `${event.id}`,
          title: event.name,
          startTime: startTime,
          endTime: endTime,
          date: startTime.split('T')[0],
          isPrivate: Boolean(event.isPrivate),
          status: event.status || 'unknown',
          frequency: event.schedule.frequency
        };
        
        console.log(`Adding transformed event: ${transformedEvent.title}, Start: ${transformedEvent.startTime}`);
        transformedEvents.push(transformedEvent);
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
}

export const gofmxService = new GoFMXService();
export default gofmxService;
