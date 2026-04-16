import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef  = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!user) { socketRef.current?.disconnect(); return; }

    const token = localStorage.getItem('accessToken');
    const socket = io(process.env.REACT_APP_SOCKET_URL || '', {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('user_online',  ({ userId }) => setOnlineUsers(p => new Set([...p, userId])));
    socket.on('user_offline', ({ userId }) => setOnlineUsers(p => { const n = new Set(p); n.delete(userId); return n; }));

    return () => { socket.disconnect(); };
  }, [user]);

  const joinConversation  = (id) => socketRef.current?.emit('join_conversation', id);
  const leaveConversation = (id) => socketRef.current?.emit('leave_conversation', id);
  const sendTyping        = (convId, typing) =>
    socketRef.current?.emit(typing ? 'typing_start' : 'typing_stop', { convId });
  const onEvent  = (ev, fn) => { socketRef.current?.on(ev, fn);  return () => socketRef.current?.off(ev, fn); };

  return (
    <SocketContext.Provider value={{ socket: socketRef, onlineUsers, joinConversation, leaveConversation, sendTyping, onEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);