import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus } from 'lucide-react';
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
  const [showQuickMeeting, setShowQuickMeeting] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  const filterNextWeekEvents = (events) => {
    if (!Array.isArray(events)) return [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setUTCHours(23, 59, 59, 999);
  
    return events.filter(event => {
      if (!event?.startTime) return false;
      const eventDate = new Date(event.startTime);
      return eventDate >= today && eventDate <= nextWeek;
    });
  };

  const fetchEvents = async () => {
    try {
      const [schedule, name] = await Promise.all([
        gofmxService.getSchedule(),
        gofmxService.getResourceDetails()
      ]);
      
      setEvents(filterNextWeekEvents(schedule));
      setResourceName(name || 'Conference Room');
      setQuote(getRandomQuote());
      setError(null);
    } catch (err) {
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
      // Ensure UTC time string has 'Z' suffix for proper UTC parsing
      const timeString = utcTime.endsWith('Z') ? utcTime : utcTime + 'Z';
      
      // Create a Date object from the UTC time string and format in Chicago timezone
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago'
      }).format(new Date(timeString));
    } catch {
      return '';
    }
  };
  
  const formatDate = (utcTime) => {
    if (!utcTime) return '';
  
    try {
      const date = new Date(utcTime);
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
  
      return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'America/Chicago'
      }).format(date);
    } catch {
      return 'Invalid Date';
    }
  };
  
  const getCurrentEvent = () => {
    if (!events.length) return null;
    
    const now = new Date();
    return events.find(event => {
      // Ensure UTC time strings have 'Z' suffix for proper UTC comparison
      const startUtc = event.startTime.endsWith('Z') ? event.startTime : event.startTime + 'Z';
      const endUtc = event.endTime.endsWith('Z') ? event.endTime : event.endTime + 'Z';
      
      const startTime = new Date(startUtc);
      const endTime = new Date(endUtc);
      
      // Convert current time to UTC for proper comparison
      const nowUtc = new Date(now.toISOString());
      return nowUtc >= startTime && nowUtc < endTime;
    });
  };
  
  const getNextEvent = () => {
    if (!events.length) return null;
    
    const now = new Date();
    const nowUtc = new Date(now.toISOString());
    const currentEvent = getCurrentEvent();
    
    // Sort events by start time and find the next occurrence
    return events
      .filter(event => {
        // Skip the current event
        if (currentEvent && event.id === currentEvent.id) {
          return false;
        }
        
        // Ensure UTC time strings have 'Z' suffix for proper UTC comparison
        const startUtc = event.startTime.endsWith('Z') ? event.startTime : event.startTime + 'Z';
        const endUtc = event.endTime.endsWith('Z') ? event.endTime : event.endTime + 'Z';
        
        const startTime = new Date(startUtc);
        const endTime = new Date(endUtc);
        
        // For recurring events, we only care about the start time being in the future
        // For non-recurring events, we also check that they haven't ended
        if (event.frequency && event.frequency !== 'Never') {
          return startTime > nowUtc;
        } else {
          return nowUtc < endTime;
        }
      })
      .sort((a, b) => {
        const aStart = new Date(a.startTime.endsWith('Z') ? a.startTime : a.startTime + 'Z');
        const bStart = new Date(b.startTime.endsWith('Z') ? b.startTime : b.startTime + 'Z');
        return aStart - bStart;
      })[0] || null;
  };

  const canCreateMeeting = (duration) => {
    const nextEvent = getNextEvent();
    if (!nextEvent) return true;

    const now = new Date();
    const meetingEnd = new Date(now.getTime() + duration * 60000);
    const nextEventStart = new Date(nextEvent.startTime);

    return meetingEnd < nextEventStart;
  };

  const handleCreateMeeting = async (duration) => {
    if (!canCreateMeeting(duration)) return;

    try {
      setIsCreatingMeeting(true);
      await gofmxService.createImpromptuMeeting(duration);
      setShowQuickMeeting(false);
      fetchEvents(); // Refresh the events list
    } catch (error) {
      setError('Failed to create meeting: ' + error.message);
    } finally {
      setIsCreatingMeeting(false);
    }
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
                  onError={(e) => e.target.style.display = 'none'}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 h-[50vh]">
            <div className="bg-gray-600 p-8 text-white overflow-y-auto relative">
              <div className="text-xl font-semibold mb-4">
                <span>{currentEvent ? 'Current meeting' : 'Available'}</span>
              </div>
              {!currentEvent && (
                <button
                  onClick={() => setShowQuickMeeting(true)}
                  className="bg-white text-gray-600 rounded-full p-4 hover:bg-gray-100 transition-colors absolute bottom-8 right-8"
                  title="Create quick meeting"
                >
                  <Plus className="h-6 w-6" />
                </button>
              )}
              {showQuickMeeting && !currentEvent && (
                <div className="bg-white rounded-lg p-4 mb-4 shadow-lg">
                  <div className="text-gray-700 font-medium mb-3">Schedule a Quick Meeting:</div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCreateMeeting(30)}
                      disabled={!canCreateMeeting(30) || isCreatingMeeting}
                      className={`flex-1 py-2 px-4 rounded ${
                        canCreateMeeting(30) && !isCreatingMeeting
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      30 Minutes
                    </button>
                    <button
                      onClick={() => handleCreateMeeting(60)}
                      disabled={!canCreateMeeting(60) || isCreatingMeeting}
                      className={`flex-1 py-2 px-4 rounded ${
                        canCreateMeeting(60) && !isCreatingMeeting
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      1 Hour
                    </button>
                  </div>
                  <button
                    onClick={() => setShowQuickMeeting(false)}
                    className="bg-gray-100 w-full mt-2 py-1 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
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

            <div className="bg-gray-500 p-8 text-white overflow-y-auto">
              <div className="text-xl font-semibold mb-4">Next meeting</div>
              {nextEvent ? (
                <>
                  <div className="text-2xl font-medium mb-2">
                    {nextEvent.title}
                  </div>
                  <div className="text-gray-300">
                    {formatDate(nextEvent.startTime)}
                  </div>
                  <div className="text-xl mt-1">
                    {formatTime(nextEvent.startTime)}-{formatTime(nextEvent.endTime)}
                  </div>
                </>
              ) : (
                <div className="text-xl">No upcoming meetings</div>
              )}
            </div>
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
