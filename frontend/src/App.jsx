import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { useSocket } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import IncomingCall from './components/message/IncomingCall';

import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import HomePage          from './pages/HomePage';
import ExplorePage       from './pages/ExplorePage';
import ReelsPage         from './pages/ReelsPage';
import ProfilePage       from './pages/ProfilePage';
import PostDetailPage    from './pages/PostDetailPage';
import MessagesPage      from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchPage        from './pages/SearchPage';
import EditProfilePage   from './pages/EditProfilePage';

const CallHandler = ({ children }) => {
  const socketCtx = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const pcRef = useRef(null);

  useEffect(() => {
    if (!socketCtx) return;
    const off = socketCtx.onEvent('incoming_call', ({ from, callerName, signal }) => {
      setIncomingCall({ from, callerName, signal });
    });
    return off;
  }, [socketCtx]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate)
          socketCtx?.socket.current?.emit('ice_candidate', { to: incomingCall.from, candidate: e.candidate });
      };
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketCtx?.socket.current?.emit('call_accepted', { to: incomingCall.from, signal: answer });
    } catch (err) { console.error('Accept call error:', err); }
    setIncomingCall(null);
  };

  const handleReject = () => {
    socketCtx?.socket.current?.emit('call_rejected', { to: incomingCall?.from });
    setIncomingCall(null);
  };

  return (
    <>
      {children}
      {incomingCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <CallHandler>
            <BrowserRouter>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14, borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-1)',
                  },
                }}
              />
              <Routes>
                {/* Public */}
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route element={<ProtectedRoute />}>

                  {/* ── Full screen — NO sidebar ── */}
                  <Route path="/reels" element={<ReelsPage />} />

                  {/* ── Normal pages — WITH sidebar ── */}
                  <Route element={<Layout />}>
                    <Route path="/"                   element={<HomePage />} />
                    <Route path="/explore"            element={<ExplorePage />} />
                    <Route path="/search"             element={<SearchPage />} />
                    <Route path="/messages"           element={<MessagesPage />} />
                    <Route path="/messages/:convId"   element={<MessagesPage />} />
                    <Route path="/notifications"      element={<NotificationsPage />} />
                    <Route path="/profile/:username"  element={<ProfilePage />} />
                    <Route path="/posts/:id"          element={<PostDetailPage />} />
                    <Route path="/settings/profile"   element={<EditProfilePage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </CallHandler>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
