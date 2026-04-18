import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../api';
import api from '../api/client';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { timeAgo, getMediaUrl } from '../utils/helpers';
import toast from 'react-hot-toast';

const notifText = (type) => {
  const map = {
    like_post:       'liked your post',
    like_comment:    'liked your comment',
    comment:         'commented on your post',
    reply:           'replied to your comment',
    follow:          'started following you',
    follow_request:  'requested to follow you',
    follow_accept:   'accepted your follow request',
    mention_post:    'mentioned you in a post',
    mention_comment: 'mentioned you in a comment',
    tag_post:        'tagged you in a post',
    story_reaction:  'reacted to your story',
    message:         'sent you a message',
  };
  return map[type] || 'interacted with you';
};

const NotifItem = ({ notif, onRead, onAccept, onDecline }) => {
  const [status, setStatus] = useState('pending');

  const handleAccept = async (e) => {
    e.stopPropagation();
    setStatus('accepting');
    const ok = await onAccept(notif.actor_username, notif.id);
    setStatus(ok ? 'accepted' : 'pending');
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    await onDecline(notif.actor_username, notif.id);
    setStatus('declined');
  };

  return (
    <div
      onClick={() => !notif.is_read && onRead(notif.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: notif.is_read ? 'transparent' : 'rgba(230,57,70,.03)',
        borderBottom: '1px solid var(--border)',
        transition: 'background .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(230,57,70,.03)'}
    >
      <div style={{ width: 8, flexShrink: 0 }}>
        {!notif.is_read && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
        )}
      </div>

      <Link to={`/profile/${notif.actor_username}`} onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <Avatar user={{ username: notif.actor_username, avatar_url: notif.actor_avatar }} size="md" />
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          <Link to={`/profile/${notif.actor_username}`} onClick={e => e.stopPropagation()} style={{ fontWeight: 700, marginRight: 5 }}>
            {notif.actor_username}
          </Link>
          <span style={{ color: 'var(--text-2)' }}>{notifText(notif.type)}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          {timeAgo(notif.created_at)}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {notif.type === 'follow_request' && status === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAccept}
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, background: 'var(--text-1)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Accept
            </button>
            <button onClick={handleDecline}
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, background: 'var(--bg)', color: 'var(--text-1)', border: '1.5px solid var(--border-2)', borderRadius: 8, cursor: 'pointer' }}>
              Decline
            </button>
          </div>
        )}
        {notif.type === 'follow_request' && status === 'accepting' && <Spinner size={18} />}
        {notif.type === 'follow_request' && status === 'accepted' && (
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Accepted</span>
        )}
        {notif.type === 'follow_request' && status === 'declined' && (
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Declined</span>
        )}
        {notif.type !== 'follow_request' && notif.post_thumbnail && (
          <img src={getMediaUrl(notif.post_thumbnail)} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 8 }} />
        )}
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread,  setUnread]  = useState(0);

  useEffect(() => {
    notificationsAPI.getAll({ limit: 50 })
      .then(({ data }) => { setNotifs(data.notifications || []); setUnread(data.unreadCount || 0); })
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

  const handleAccept = async (username, notifId) => {
    try {
      await api.post(`/users/${username}/follow/accept`);
      toast.success('Follow request accepted');
      setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, type: 'follow', is_read: true } : n));
      setUnread(u => Math.max(u - 1, 0));
      return true;
    } catch {
      toast.error('Could not accept request');
      return false;
    }
  };

  const handleDecline = async (username, notifId) => {
    try {
      await api.delete(`/users/${username}/follow/decline`);
    } catch {}
    setNotifs(prev => prev.filter(n => n.id !== notifId));
    toast.success('Request declined');
    return true;
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {}
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>
          Notifications
          {unread > 0 && <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700, marginLeft: 8 }}>{unread} new</span>}
        </h2>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>Mark all read</button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><Spinner size={28} /></div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}>No notifications yet</div>
            <div style={{ fontSize: 13 }}>When someone likes or follows you, you will see it here</div>
          </div>
        ) : (
          notifs.map((n, i) => (
            <div key={n.id} style={{ animation: `fadeIn .3s ${i * 0.04}s both` }}>
              <NotifItem notif={n} onRead={markRead} onAccept={handleAccept} onDecline={handleDecline} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;