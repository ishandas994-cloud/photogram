import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user }      = useAuth();
  const pusherRef     = useRef(null);
  const channelRef    = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      pusherRef.current?.disconnect();
      return;
    }

    const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER || 'ap2',
      authEndpoint: `${process.env.REACT_APP_API_URL}/pusher/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      },
    });

    pusherRef.current = pusher;

    pusher.connection.bind('connected',    () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));
    pusher.connection.bind('error',        (e) => console.warn('Pusher error:', e));

    // Subscribe to user's private channel
    const channel = pusher.subscribe(`private-user-${user.id}`);
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [user?.id]);

  const joinConversation = (convId) => {
    if (!pusherRef.current) return;
    pusherRef.current.subscribe(`private-conv-${convId}`);
  };

  const leaveConversation = (convId) => {
    pusherRef.current?.unsubscribe(`private-conv-${convId}`);
  };

  const sendTyping = (convId, typing) => {
    // Handled via API call in ChatWindow
  };

  const onEvent = (ev, fn) => {
    const channel = channelRef.current;
    if (!channel) return () => {};
    channel.bind(ev, fn);
    return () => channel.unbind(ev, fn);
  };

  const onConvEvent = (convId, ev, fn) => {
    const ch = pusherRef.current?.channel(`private-conv-${convId}`);
    if (!ch) return () => {};
    ch.bind(ev, fn);
    return () => ch.unbind(ev, fn);
  };

  return (
    <SocketContext.Provider value={{
      pusher: pusherRef,
      connected,
      joinConversation,
      leaveConversation,
      sendTyping,
      onEvent,
      onConvEvent,
      // Compatibility shim so existing code doesn't break
      socket: { current: { emit: () => {} } },
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);