import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { notificationsAPI, messagesAPI } from '../../api';

const Layout = () => {
  const [unreadNotifs,   setUnreadNotifs]   = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    notificationsAPI.getAll({ limit: 1 })
      .then(({ data }) => setUnreadNotifs(data.unreadCount || 0))
      .catch(() => {});
    messagesAPI.getConversations()
      .then(({ data }) => {
        const total = data.reduce((s, c) => s + parseInt(c.unread_count || 0), 0);
        setUnreadMessages(total);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar unreadNotifs={unreadNotifs} unreadMessages={unreadMessages} />
      <main style={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;