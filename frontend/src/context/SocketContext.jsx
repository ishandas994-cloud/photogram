import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Prevent duplicate connections (StrictMode safe)
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: false,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
    });

    socket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const copy = new Set(prev);
        copy.delete(userId);
        return copy;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.id]);

  const joinConversation = (id) =>
    socketRef.current?.emit('join_conversation', id);

  const leaveConversation = (id) =>
    socketRef.current?.emit('leave_conversation', id);

  const sendTyping = (convId, typing) =>
    socketRef.current?.emit(
      typing ? 'typing_start' : 'typing_stop',
      { convId }
    );

  const onEvent = (event, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, callback);
    return () => socket.off(event, callback);
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef,
        connected,
        onlineUsers,
        joinConversation,
        leaveConversation,
        sendTyping,
        onEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);