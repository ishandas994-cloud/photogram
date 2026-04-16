import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import HomePage           from './pages/HomePage';
import ExplorePage        from './pages/ExplorePage';
import ProfilePage        from './pages/ProfilePage';
import PostDetailPage     from './pages/PostDetailPage';
import MessagesPage       from './pages/MessagesPage';
import NotificationsPage  from './pages/NotificationsPage';
import SearchPage         from './pages/SearchPage';
import EditProfilePage    from './pages/EditProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                borderRadius: 10,
                border: '1px solid var(--border)',
              },
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes — all share the sidebar Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/"                       element={<HomePage />} />
                <Route path="/explore"                element={<ExplorePage />} />
                <Route path="/search"                 element={<SearchPage />} />
                <Route path="/messages"               element={<MessagesPage />} />
                <Route path="/messages/:convId"       element={<MessagesPage />} />
                <Route path="/notifications"          element={<NotificationsPage />} />
                <Route path="/profile/:username"      element={<ProfilePage />} />
                <Route path="/posts/:id"              element={<PostDetailPage />} />
                <Route path="/settings/profile"       element={<EditProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}