import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CalendarDisplay from './components/calendar/CalendarDisplay';
import ListView from './components/list-view/ListView';

const App = () => {
  return (
    <div className="h-screen w-screen bg-white">
      <Routes>
        <Route path="/" element={<CalendarDisplay />} />
        <Route path="/list" element={<ListView />} />
      </Routes>
    </div>
  );
};

export default App;