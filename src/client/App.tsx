import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { ErrorProvider } from './contexts/ErrorContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';
import MolecularViewerPage from './pages/MolecularViewerPage';
import UploadPage from './pages/UploadPage';

export const App: React.FC = () => {
  return (
    <ErrorProvider>
      <Router>
        <SessionProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="viewer" element={<MolecularViewerPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="structures" element={<Navigate to="/viewer" replace />} />
              <Route path="settings" element={<div><h1>View Settings</h1><p>Coming soon</p></div>} />
              <Route path="measurements" element={<div><h1>Measurements</h1><p>Coming soon</p></div>} />
              <Route path="manipulation" element={<div><h1>Structure Manipulation</h1><p>Coming soon</p></div>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionProvider>
      </Router>
    </ErrorProvider>
  );
};