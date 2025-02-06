// src/components/calendar/CalendarDisplay.jsx
// src/components/calendar/CalendarDisplay.jsx
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import gofmxService from '../../services/gofmxService';
import { getRandomQuote } from '../../constants/quotes';
import Settings from '../../components/settings/settings';

const CalendarDisplay = () => {
  const [resourceName, setResourceName] = useState('Conference Room');
  const [quote, setQuote] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const filterNextWeekEvents = (events) => {
    if (!Array.isArray(events)) {
      console.warn('filterNextWeekEvents received non-array:', events);
      return [];
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setUTCHours(23, 59, 59, 999);
    
    console.log("Date Range:", {
      today: today.toISOString(),
      nextWeek: nextWeek.toISOString()
    });
  
    return events.filter(event => {
      if (!event?.startTime) {
        console.warn('Event missing startTime:', event);
        return false;
      }

      const eventDate = new Date(event.startTime);
      const inRange = eventDate >= today && eventDate <= nextWeek;
      
      console.log("Event Debug:", {
        title: event.title,
        startTime: event.startTime,
        parsedDate: eventDate.toISOString(),
        today: today.toISOString(),
        nextWeek: nextWeek.toISOString(),
        isAfterToday: eventDate >= today,
        isBeforeNextWeek: eventDate <= nextWeek,
        inRange: inRange
      });
      
      return inRange;
    });
  };

  const fetchEvents = async () => {
    try {
      console.log('Starting fetchEvents...');
      const [schedule, name] = await Promise.all([
        gofmxService.getSchedule().catch(err => {
          console.error('Error fetching schedule:', err);
          throw err;
        }),
        gofmxService.getResourceDetails().catch(err => {
          console.error('Error fetching resource details:', err);
          throw err;
        })
      ]);
      
      console.log("Raw schedule:", schedule);
      console.log("Resource name:", name);
      
      const filteredEvents = filterNextWeekEvents(schedule);
      console.log("Filtered events:", filteredEvents);
      
      setEvents(filteredEvents);
      setResourceName(name || 'Conference Room');
      setQuote(getRandomQuote());
      setError(null);
    } catch (err) {
      console.error('Error in fetchEvents:', err);
      setError('Failed to fetch calendar events. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatTime = (utcTime) => {
    if (!utcTime) return '';
  
    try {
      const timeStr = utcTime.endsWith('Z') ? utcTime : utcTime + 'Z';
      const date = new Date(timeStr);
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date created from:', utcTime);
        return '';
      }
  
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago'
      }).format(date);
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };
  
  const formatDate = (utcTime) => {
    if (!utcTime) return '';
  
    try {
      const timeStr = utcTime.endsWith('Z') ? utcTime : utcTime + 'Z';
      const date = new Date(timeStr);
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date created from:', utcTime);
        return 'Invalid Date';
      }
  
      return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'America/Chicago'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  const getCurrentEvent = () => {
    if (!events.length) return null;
    
    const now = new Date();
    return events.find(event => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      return now >= startTime && now < endTime;
    });
  };
  
  const getNextEvent = () => {
    if (!events.length) return null;
    
    const now = new Date();
    return events.find(event => {
      const startTime = new Date(event.startTime);
      return now < startTime;
    });
  };

  if (loading) return <div className="h-screen w-screen bg-white p-4">Loading events...</div>;
  
  if (error) {
    if (showSettings) {
      return <Settings onClose={() => {
        setShowSettings(false);
        fetchEvents(); // Refresh events after settings are updated
      }} />;
    }
    
    return (
      <div className="h-screen w-screen bg-white p-4 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <SettingsIcon className="h-5 w-5" />
          Configure Settings
        </button>
      </div>
    );
  }

  const currentEvent = getCurrentEvent();
  const nextEvent = getNextEvent();

  return (
    <>
      {showSettings ? (
        <Settings onClose={() => {
          setShowSettings(false);
          fetchEvents(); // Refresh events after settings are updated
        }} />
      ) : (
        <div className="h-screen bg-gray-300 flex flex-col overflow-hidden">
          <div className="bg-gray-300 p-6 h-[20vh] flex items-center">
            <div className="flex justify-between items-center w-full">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{resourceName}</h1>
                <p className="text-gray-600">{quote}</p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="w-64 bg-transparent"
                title="Settings"
              >
                <img 
                  src="/logo.png" 
                  alt="District Logo" 
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    console.log('Logo failed to load, hiding image');
                    e.target.style.display = 'none';
                  }}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 h-[50vh]">
            <div className="bg-gray-600 p-8 text-white overflow-y-auto">
              <div className="text-xl font-semibold mb-4">
                {currentEvent ? 'Current meeting' : 'Available'}
              </div>
              {currentEvent && (
                <>
                  <div className="text-2xl font-medium mb-2">
                    {currentEvent.title}
                  </div>
                  <div className="text-xl mt-1">
                    {formatTime(currentEvent.startTime)}-{formatTime(currentEvent.endTime)}
                  </div>
                </>
              )}
            </div>

            {nextEvent && (
              <div className="bg-gray-500 p-8 text-white overflow-y-auto">
                <div className="text-xl font-semibold mb-4">Next meeting</div>
                <div className="text-2xl font-medium mb-2">
                  {nextEvent.title}
                </div>
                <div className="text-gray-300">
                  {formatDate(nextEvent.startTime)}
                </div>
                <div className="text-xl mt-1">
                  {formatTime(nextEvent.startTime)}-{formatTime(nextEvent.endTime)}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-row h-[30vh] overflow-x-auto">
            {events.slice(currentEvent ? 1 : 0).map((event) => 
              event !== nextEvent && (
                <div
                  key={event.id}
                  className="flex-1 min-w-[200px] bg-gray-300 p-6 border-t border-gray-200"
                >
                  <div className="font-medium text-gray-900 mb-2">{event.title}</div>
                  <div className="text-sm text-gray-600">
                    {formatDate(event.startTime)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatTime(event.startTime)}-{formatTime(event.endTime)}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CalendarDisplay;
