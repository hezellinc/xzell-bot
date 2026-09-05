import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Connect from './pages/Connect';
import Chat from './pages/Chat';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/connect" element={<Connect />} />
      <Route path="/chat" element={<Chat />} />
    </Routes>
  );
}
