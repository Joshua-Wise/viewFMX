import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Plus, Trash2 } from 'lucide-react';

const MultiResourceSettings = ({ onClose }) => {
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [resourcesByBuilding, setResourcesByBuilding] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load saved room configurations
        const savedRooms = JSON.parse(localStorage.getItem('selectedRooms') || '[]');
        setSelectedRooms(savedRooms);

        // Fetch buildings
        const buildingsResponse = await fetch(`${apiBaseUrl}/buildings`);
        if (!buildingsResponse.ok) throw new Error('Failed to fetch buildings');
        const buildingsData = await buildingsResponse.json();
        setBuildings(buildingsData.filter(b => !b.isDeleted));

        // Fetch resources for each building that has selected rooms
        const resourcePromises = savedRooms.map(room => 
          fetchResources(room.buildingId)
        );
        await Promise.all(resourcePromises);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [apiBaseUrl]);

  const fetchResources = async (buildingId) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/resources?buildingIDs=${buildingId}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      
      setResourcesByBuilding(prev => ({
        ...prev,
        [buildingId]: data.filter(r => !r.isDeleted)
      }));
    } catch (err) {
      console.error('Error fetching resources:', err);
      throw err;
    }
  };

  const handleAddRoom = () => {
    setSelectedRooms(prev => [
      ...prev,
      { buildingId: '', resourceId: '', name: '' }
    ]);
  };

  const handleRemoveRoom = (index) => {
    setSelectedRooms(prev => prev.filter((_, i) => i !== index));
  };

  const handleBuildingChange = async (index, buildingId) => {
    try {
      // Fetch resources for the selected building if we haven't already
      if (!resourcesByBuilding[buildingId]) {
        await fetchResources(buildingId);
      }

      // Update the selected room
      setSelectedRooms(prev => prev.map((room, i) => 
        i === index ? { ...room, buildingId, resourceId: '' } : room
      ));
    } catch (err) {
      setError('Failed to fetch resources for selected building');
    }
  };

  const handleResourceChange = (index, resourceId) => {
    setSelectedRooms(prev => prev.map((room, i) => 
      i === index ? { 
        ...room, 
        resourceId,
        name: resourcesByBuilding[room.buildingId]?.find(r => r.id === resourceId)?.name || ''
      } : room
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    // Validate selections
    if (selectedRooms.length === 0) {
      setError('Please select at least one room');
      return;
    }

    if (selectedRooms.some(room => !room.buildingId || !room.resourceId)) {
      setError('Please complete all room selections');
      return;
    }

    try {
      localStorage.setItem('selectedRooms', JSON.stringify(selectedRooms));
      setSaved(true);
      
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 bg-opacity-50 py-8 px-4 flex items-center justify-center">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 bg-opacity-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-semibold text-white">Room Settings</h1>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {selectedRooms.map((room, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-medium">Room {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => handleRemoveRoom(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white">Building</label>
                  <select
                    value={room.buildingId}
                    onChange={(e) => handleBuildingChange(index, e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white p-2"
                  >
                    <option value="">Select a building</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white">Room</label>
                  <select
                    value={room.resourceId}
                    onChange={(e) => handleResourceChange(index, e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white p-2"
                    disabled={!room.buildingId}
                  >
                    <option value="">Select a room</option>
                    {resourcesByBuilding[room.buildingId]?.map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddRoom}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Room
          </button>

          {error && (
            <div className="text-red-400 text-sm mt-4">{error}</div>
          )}

          {saved && (
            <div className="text-green-400 text-sm mt-4">Settings saved successfully!</div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiResourceSettings;