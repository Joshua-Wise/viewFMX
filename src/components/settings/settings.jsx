import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';

const Settings = ({ onClose }) => {
  const [buildingId, setBuildingId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [resources, setResources] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  
  console.log('Environment variables:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    apiBaseUrl
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedBuildingId = localStorage.getItem('buildingId');
        const savedResourceId = localStorage.getItem('resourceId');
        
        console.log('Fetching buildings from:', `${apiBaseUrl}/buildings`);
        const buildingsResponse = await fetch(`${apiBaseUrl}/buildings`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!buildingsResponse.ok) {
          const errorText = await buildingsResponse.text();
          console.error('Buildings response error:', errorText);
          throw new Error(`Failed to fetch buildings: ${buildingsResponse.status}`);
        }
        
        const buildingsData = await buildingsResponse.json();
        console.log('Buildings data:', buildingsData);
        
        setBuildings(buildingsData.filter(b => !b.isDeleted));
        
        if (savedBuildingId) {
          setBuildingId(savedBuildingId);
          await fetchResources(savedBuildingId);
        }
        
        if (savedResourceId) setResourceId(savedResourceId);
        
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiBaseUrl]);

  const fetchResources = async (selectedBuildingId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${apiBaseUrl}/resources?buildingIDs=${selectedBuildingId}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      setResources(data.filter(r => !r.isDeleted));
      setError('');
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to fetch resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingChange = async (e) => {
    const selectedBuildingId = e.target.value;
    setBuildingId(selectedBuildingId);
    setResourceId(''); // Reset resource selection when building changes
    
    if (selectedBuildingId) {
      await fetchResources(selectedBuildingId);
    } else {
      setResources([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    // Basic validation
    if (!buildingId || !resourceId) {
      setError('Both Building and Resource must be selected');
      return;
    }

    try {
      localStorage.setItem('buildingId', buildingId);
      localStorage.setItem('resourceId', resourceId);
      setSaved(true);
      
      // Close settings after a brief delay to show the success message
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const handleCancel = () => {
    // Restore previous values before closing
    const savedBuildingId = localStorage.getItem('buildingId');
    const savedResourceId = localStorage.getItem('resourceId');
    
    if (savedBuildingId) setBuildingId(savedBuildingId);
    if (savedResourceId) setResourceId(savedResourceId);
    
    onClose?.();
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
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-semibold text-white">Settings</h1>
          </div>
          <button
            onClick={handleCancel}
            className="text-white hover:text-gray-300"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="buildingId" className="block text-sm font-medium text-white">
              Building
            </label>
            <select
              id="buildingId"
              value={buildingId}
              onChange={handleBuildingChange}
              className="mt-1 block w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label htmlFor="resourceId" className="block text-sm font-medium text-white">
              Resource
            </label>
            <select
              id="resourceId"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={!buildingId}
            >
              <option value="">Select a resource</option>
              {resources.map(resource => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {saved && (
            <div className="text-green-400 text-sm">Settings saved successfully!</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Settings
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;