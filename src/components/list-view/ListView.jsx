import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRandomQuote } from '../../constants/quotes';
import MultiResourceSettings from '../../components/settings/MultiResourceSettings';
import gofmxService from '../../services/gofmxService';

const ListView = () => {
  const [rooms, setRooms] = useState([]);
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchRoomEvents = async () => {
    try {
      setLoading(true);
      const savedRooms = JSON.parse(localStorage.getItem('selectedRooms') || '[]');
      
      if (savedRooms.length === 0) {
        throw new Error('No rooms configured. Please visit settings to configure rooms.');
      }

      // Store original localStorage values
      const originalBuildingId = localStorage.getItem('buildingId');
      const originalResourceId = localStorage.getItem('resourceId');

      const roomPromises = savedRooms.map(async (room) => {
        try {
          // Set temporary values for this room
          localStorage.setItem('buildingId', room.buildingId);
          localStorage.setItem('resourceId', room.resourceId);

          const [events, name] = await Promise.all([
            gofmxService.getSchedule(),
            gofmxService.getResourceDetails()
          ]);

          return {
            name,
            currentEvent: getCurrentEvent(events),
            nextEvent: getNextEvent(events)
          };
        } catch (error) {
          console.error(`Error fetching data for room ${room.resourceId}:`, error);
          return {
            name: 'Error loading room',
            currentEvent: null,
            nextEvent: null
          };
        }
      });

      const roomResults = await Promise.all(roomPromises);
      
      // Restore original localStorage values
      if (originalBuildingId) localStorage.setItem('buildingId', originalBuildingId);
      if (originalResourceId) localStorage.setItem('resourceId', originalResourceId);
      
      setRooms(roomResults);
      setQuote(getRandomQuote());
      setError(null);
    } catch (err) {
      console.error('Error fetching room events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomEvents();
    const interval = setInterval(fetchRoomEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentEvent = (events) => {
    const now = new Date();
    return events?.find(event => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      return now >= startTime && now < endTime;
    });
  };

  const getNextEvent = (events) => {
    const now = new Date();
    return events?.find(event => new Date(event.startTime) > now);
  };

  const formatDateTime = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Format date
    const dateStr = start.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });

    // Format times
    const startTimeStr = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const endTimeStr = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
  };

  if (loading) {
    return <div className="h-screen w-screen bg-white p-4">Loading room schedules...</div>;
  }

  if (error && !showSettings) {
    return (
      <div className="h-screen w-screen bg-white p-4 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <SettingsIcon className="h-5 w-5" />
          Configure Rooms
        </button>
      </div>
    );
  }

  return (
    <>
      {showSettings ? (
        <MultiResourceSettings 
          onClose={() => {
            setShowSettings(false);
            fetchRoomEvents();
          }} 
        />
      ) : (
        <div className="h-screen w-screen bg-white">
          <div className="p-6 bg-gray-100 shadow">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Conference Room Schedule</h1>
                <p className="text-gray-600">{quote}</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 bg-gray-100 text-gray-900 hover:text-gray-700"
                >
                  <SettingsIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {rooms.map((room, index) => {
              const event = room.currentEvent || room.nextEvent;
              return (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h2 className="text-xl font-semibold text-gray-900">{room.name}</h2>
                  {event ? (
                    <div className="mt-2">
                      <div className="font-medium text-gray-900">{event.title}</div>
                      <div className="text-gray-600 mt-1">
                        {formatDateTime(event.startTime, event.endTime)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-gray-600">No Upcoming Events</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default ListView;