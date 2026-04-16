import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../api';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { timeAgo, getMediaUrl } from '../utils/helpers';
import toast from 'react-hot-toast';

const notifText = (type, actor) => {
  const u = `@${actor}`;
  const map = {
    like_post:       `${u} liked your post`,
    like_comment:    `${u} liked your comment`,
    comment:         `${u} commented on your post`,
    reply:           `${u} replied to your comment`,
    follow:          `${u} started following you`,
    follow_request:  `${u} requested to follow you`,
    follow_accept:   `${u} accepted your follow request`,
    mention_post:    `${u} mentioned you in a post`,
    mention_comment: `${u} mentioned you in a comment`,
    tag_post:        `${u} tagged you in a post`,
    story_reaction:  `${u} reacted to your story`,
    message:         `${u} sent you a message`,
  };
  return map[type] || `${u} interacted with you`;
};

const NotifItem = ({ notif, onRead }) => {
  const linkTo = notif.post_id ? `/posts/${notif.post_id}`
    : notif.actor_username ? `/profile/${notif.actor_username}`
    : '#';

  return (
    <Link
      to={linkTo}
      onClick={() => !notif.is_read && onRead(notif.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 16px', borderRadius: 'var(--radius-sm)',
        background: notif.is_read ? 'transparent' : 'var(--bg)',
        transition: 'background .15s',
        textDecoration: 'none',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar
          user={{ username: notif.actor_username, avatar_url: notif.actor_avatar }}
          size="md"
        />
        {!notif.is_read && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, background: 'var(--accent)', borderRadius: '50%', border: '2px solid var(--surface)' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.4 }}>
          {notifText(notif.type, notif.actor_username)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          {timeAgo(notif.created_at)}
        </div>
      </div>

      {notif.post_thumbnail && (
        <img
          src={getMediaUrl(notif.post_thumbnail)}
          alt=""
          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
        />
      )}
    </Link>
  );
};

const NotificationsPage = () => {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [unread,   setUnread]   = useState(0);

  useEffect(() => {
    notificationsAPI.getAll({ limit: 50 })
      .then(({ data }) => {
        setNotifs(data.notifications);
        setUnread(data.unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(u => Math.max(u - 1, 0));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed'); }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>
          Notifications {unread > 0 && <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700, marginLeft: 6 }}>{unread} new</span>}
        </h2>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size={28} /></div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 15 }}>No notifications yet</div>
          </div>
        ) : (
          notifs.map(n => <NotifItem key={n.id} notif={n} onRead={markRead} />)
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;