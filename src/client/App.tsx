import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import FavoritesPage from './pages/FavoritesPage';
import LocationDetailPage from './pages/LocationDetailPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="location/:locationId" element={<LocationDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="/admin/login" element={<LoginPage />} />
      </Routes>
    </div>
  );
}

export default App;