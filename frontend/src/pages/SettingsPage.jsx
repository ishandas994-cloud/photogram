import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { postsAPI, usersAPI, commentsAPI } from '../api';
import api from '../api/client';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { getMediaUrl, timeAgo, formatCount } from '../utils/helpers';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────

const SettingRow = ({ icon, label, sublabel, onClick, to, danger, toggle, toggleOn, border = true, badge }) => {
  const content = (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '15px 20px',
        borderBottom: border ? '1px solid var(--border)' : 'none',
        cursor: onClick || to ? 'pointer' : 'default',
        transition: 'background .15s',
        color: 'inherit', textDecoration: 'none',
      }}
      onMouseEnter={e => { if (onClick || to) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon && (
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: danger ? 'var(--accent)' : 'var(--text-1)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      {badge && (
        <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{badge}</span>
      )}
      {toggle !== undefined ? (
        <div
          style={{
            width: 46, height: 26, borderRadius: 13,
            background: toggleOn ? 'var(--accent)' : 'var(--border-2)',
            position: 'relative', transition: 'background .25s',
            flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 3,
            left: toggleOn ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: '#fff', transition: 'left .25s',
            boxShadow: '0 1px 4px rgba(0,0,0,.3)',
          }} />
        </div>
      ) : (onClick || to) ? (
        <span style={{ color: 'var(--text-3)', fontSize: 18 }}>›</span>
      ) : null}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link> : content;
};

const Card = ({ children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 12 }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ padding: '16px 20px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
    {children}
  </div>
);

const EmptyState = ({ icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '52px 24px', color: 'var(--text-3)' }}>
    <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// SAVED POSTS
// ─────────────────────────────────────────────────────────────
const SavedPosts = ({ user }) => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get explore posts and filter saved ones (fallback since /me/saved may not exist)
    postsAPI.getExplore({ limit: 50 })
      .then(({ data }) => setPosts(data.filter(p => p.is_saved)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>;
  if (!posts.length) return <EmptyState icon="🔖" title="No saved posts" subtitle="Tap the bookmark icon on any post to save it here" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
      {posts.map(p => (
        <Link key={p.id} to={`/posts/${p.id}`} style={{ aspectRatio: '1', display: 'block', overflow: 'hidden', background: 'var(--border)' }}>
          <img
            src={getMediaUrl(p.thumbnail || p.thumbnail_url || p.media_url)}
            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            onError={e => { e.target.src = `https://picsum.photos/seed/${p.id}/300/300`; }}
          />
        </Link>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LIKED POSTS
// ─────────────────────────────────────────────────────────────
const LikedPosts = ({ user }) => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postsAPI.getExplore({ limit: 50 })
      .then(({ data }) => setPosts(data.filter(p => p.is_liked)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>;
  if (!posts.length) return <EmptyState icon="♡" title="No liked posts" subtitle="Double tap or press ♡ on any post to like it" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
      {posts.map(p => (
        <Link key={p.id} to={`/posts/${p.id}`} style={{ aspectRatio: '1', display: 'block', overflow: 'hidden', background: 'var(--border)', position: 'relative' }}>
          <img
            src={getMediaUrl(p.thumbnail || p.thumbnail_url || p.media_url)}
            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            onError={e => { e.target.src = `https://picsum.photos/seed/${p.id}/300/300`; }}
          />
          <div style={{ position: 'absolute', top: 6, right: 6, color: '#e63946', fontSize: 16, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>♥</div>
        </Link>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMMENTED POSTS
// ─────────────────────────────────────────────────────────────
const CommentedPosts = ({ user }) => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show user's own posts that have comments as a proxy
    postsAPI.getExplore({ limit: 50 })
      .then(({ data }) => setPosts(data.filter(p => p.username === user?.username)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>;
  if (!posts.length) return <EmptyState icon="💬" title="No posts yet" subtitle="Your posts with comments will appear here" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
      {posts.map(p => (
        <Link key={p.id} to={`/posts/${p.id}`} style={{ aspectRatio: '1', display: 'block', overflow: 'hidden', background: 'var(--border)', position: 'relative' }}>
          <img
            src={getMediaUrl(p.thumbnail || p.thumbnail_url)}
            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.src = `https://picsum.photos/seed/${p.id}/300/300`; }}
          />
          <div style={{ position: 'absolute', bottom: 6, left: 6, color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
            💬 {formatCount(p.comment_count)}
          </div>
        </Link>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// BLOCKED USERS
// ─────────────────────────────────────────────────────────────
const BlockedUsers = () => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/blocked').catch(() => ({ data: [] }))
      .then(({ data }) => setUsers(data || []))
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (username) => {
    try {
      await api.delete(`/users/${username}/block`);
      setUsers(u => u.filter(x => x.username !== username));
      toast.success(`Unblocked @${username}`);
    } catch { toast.error('Failed to unblock'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>;
  if (!users.length) return <EmptyState icon="🚫" title="No blocked users" subtitle="Users you block will appear here" />;

  return (
    <div>
      {users.map((u, i) => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <Avatar user={u} size="md" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.full_name}</div>
          </div>
          <button
            onClick={() => unblock(u.username)}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--border-2)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-1)', background: 'transparent', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Unblock</button>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TIME MANAGEMENT
// ─────────────────────────────────────────────────────────────
const TimeManagement = () => {
  const [limitMin, setLimitMin]  = useState(() => parseInt(localStorage.getItem('pg_daily_limit') || '0'));
  const [timeSpent, setTimeSpent] = useState(0);
  const [reminder, setReminder]   = useState(() => localStorage.getItem('pg_reminder') === 'true');

  useEffect(() => {
    const stored = parseInt(sessionStorage.getItem('pg_time_start') || '0');
    const start  = stored || Date.now();
    if (!stored) sessionStorage.setItem('pg_time_start', start);
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const saveLimit = () => {
    localStorage.setItem('pg_daily_limit', limitMin);
    toast.success(limitMin > 0 ? `Daily limit set to ${limitMin} minutes` : 'Daily limit removed');
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const pct     = limitMin > 0 ? Math.min((timeSpent / (limitMin * 60)) * 100, 100) : 0;
  const barColor = pct >= 100 ? '#e63946' : pct > 70 ? '#f4a261' : '#2d6a4f';

  return (
    <div style={{ padding: 24 }}>
      {/* Today's usage */}
      <div style={{
        background: 'var(--surface-2)', borderRadius: 16, padding: '24px',
        textAlign: 'center', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
          Time on Photogram today
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
          {fmt(timeSpent)}
        </div>
        {limitMin > 0 && (
          <div style={{ fontSize: 13, color: pct >= 100 ? 'var(--accent)' : 'var(--text-3)' }}>
            {pct >= 100 ? '⚠️ Daily limit reached!' : `${Math.round(pct)}% of ${limitMin} min limit`}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {limitMin > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 5, width: `${pct}%`, background: barColor, transition: 'width .5s ease' }} />
          </div>
        </div>
      )}

      {/* Set limit */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Daily limit (minutes)
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="number" min="0" max="480"
            value={limitMin || ''}
            onChange={e => setLimitMin(parseInt(e.target.value) || 0)}
            placeholder="e.g. 30"
            className="input"
            style={{ flex: 1, fontSize: 15 }}
          />
          <button onClick={saveLimit} className="btn btn-primary" style={{ flexShrink: 0, padding: '10px 20px' }}>Save</button>
        </div>
      </div>

      {/* Quick presets */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Quick set</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[15, 30, 45, 60, 90].map(min => (
            <button key={min} onClick={() => { setLimitMin(min); localStorage.setItem('pg_daily_limit', min); toast.success(`Limit set: ${min} min`); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: `2px solid ${limitMin === min ? 'var(--accent)' : 'var(--border)'}`,
                color: limitMin === min ? 'var(--accent)' : 'var(--text-2)',
                background: limitMin === min ? 'rgba(230,57,70,.07)' : 'transparent',
                cursor: 'pointer', transition: 'all .15s',
              }}>{min}m</button>
          ))}
        </div>
      </div>

      {/* Reminder toggle */}
      <div
        onClick={() => { const n = !reminder; setReminder(n); localStorage.setItem('pg_reminder', n); toast.success(`Reminders ${n ? 'on' : 'off'}`); }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>Daily reminders</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Get notified when you reach your limit</div>
        </div>
        <div style={{ width: 46, height: 26, borderRadius: 13, background: reminder ? 'var(--accent)' : 'var(--border-2)', position: 'relative', transition: 'background .25s' }}>
          <div style={{ position: 'absolute', top: 3, left: reminder ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PRIVACY SETTINGS
// ─────────────────────────────────────────────────────────────
const PrivacySettings = ({ user, updateUser }) => {
  const [isPrivate, setIsPrivate]   = useState(user?.is_private || false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowTags,    setAllowTags]    = useState(true);
  const [saving, setSaving] = useState(false);

  const togglePrivate = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('is_private', !isPrivate);
      const { data } = await usersAPI.updateProfile(fd);
      setIsPrivate(!isPrivate);
      updateUser(data);
      toast.success(`Account is now ${!isPrivate ? 'private 🔒' : 'public 🌍'}`);
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ padding: '16px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
          {isPrivate
            ? '🔒 Your account is private. Only approved followers can see your posts and stories.'
            : '🌍 Your account is public. Anyone can see your posts and stories.'}
        </div>
      </div>
      <SettingRow icon="🔒" label="Private account" sublabel="Only approved followers can see your content"
        onClick={togglePrivate} toggle toggleOn={isPrivate}
        rightEl={saving ? <Spinner size={14} /> : null} />
      <SettingRow icon="👁️" label="Activity status" sublabel="Show when you were last active"
        onClick={() => setShowActivity(s => !s)} toggle toggleOn={showActivity} />
      <SettingRow icon="🏷️" label="Allow tags" sublabel="Let others tag you in posts"
        onClick={() => setAllowTags(s => !s)} toggle toggleOn={allowTags} />
      <SettingRow icon="📍" label="Location sharing" sublabel="Share location on posts"
        onClick={() => toast('Coming soon')} toggle toggleOn={false} border={false} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATION SETTINGS
// ─────────────────────────────────────────────────────────────
const NotifSettings = () => {
  const [prefs, setPrefs] = useState(() =>
    JSON.parse(localStorage.getItem('pg_notif_prefs') || JSON.stringify({
      likes: true, comments: true, follows: true,
      messages: true, stories: true, mentions: true,
    }))
  );
  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('pg_notif_prefs', JSON.stringify(next));
    toast.success(`${key} notifications ${next[key] ? 'enabled' : 'disabled'}`);
  };
  const items = [
    { key: 'likes',    icon: '♥',  label: 'Likes',           sublabel: 'When someone likes your post' },
    { key: 'comments', icon: '💬', label: 'Comments',         sublabel: 'When someone comments on your post' },
    { key: 'follows',  icon: '👤', label: 'New followers',    sublabel: 'When someone follows you' },
    { key: 'mentions', icon: '@',  label: 'Mentions',         sublabel: 'When someone mentions you' },
    { key: 'messages', icon: '✉',  label: 'Messages',         sublabel: 'When you receive a direct message' },
    { key: 'stories',  icon: '◎',  label: 'Story reactions',  sublabel: 'When someone reacts to your story' },
  ];
  return (
    <div>
      {items.map((item, i) => (
        <SettingRow key={item.key} icon={item.icon} label={item.label} sublabel={item.sublabel}
          onClick={() => toggle(item.key)} toggle toggleOn={prefs[item.key]}
          border={i < items.length - 1} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SECURITY SETTINGS
// ─────────────────────────────────────────────────────────────
const SecuritySettings = () => {
  const [showSessions, setShowSessions] = useState(false);
  const sessions = [
    { device: 'Chrome · Windows', location: 'Current device', time: 'Active now', current: true },
  ];
  return (
    <div>
      <SettingRow icon="🔑" label="Change password"      sublabel="Update your account password"   to="/settings/profile" />
      <SettingRow icon="📱" label="Two-factor auth"       sublabel="Extra layer of security"         onClick={() => toast('Coming soon')} />
      <SettingRow icon="🔗" label="Linked accounts"       sublabel="Connect Google, Facebook"        onClick={() => toast('Coming soon')} />
      <SettingRow icon="💻" label="Login activity"
        sublabel={`${sessions.length} active session`}
        onClick={() => setShowSessions(s => !s)} border={false} />
      {showSessions && (
        <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          {sessions.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.device}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.location}</div>
              </div>
              <span style={{ fontSize: 12, color: s.current ? 'var(--green)' : 'var(--text-3)', fontWeight: 600 }}>{s.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────
const ChangePassword = () => {
  const [form,    setForm]    = useState({ current: '', newPass: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.newPass.length < 8)       { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.newPass });
      toast.success('Password changed successfully');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { key: 'current', label: 'Current password', placeholder: 'Enter current password' },
        { key: 'newPass', label: 'New password',     placeholder: 'At least 8 characters' },
        { key: 'confirm', label: 'Confirm password', placeholder: 'Repeat new password' },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
          <input className="input" type="password" value={form[key]} onChange={set(key)} placeholder={placeholder} required />
        </div>
      ))}
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, padding: '12px' }}>
        {loading ? <Spinner size={16} color="#fff" /> : 'Change password'}
      </button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────
const SettingsPage = () => {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme }       = useTheme();
  const navigate                     = useNavigate();
  const [page, setPage]   = useState('main');
  const [title, setTitle] = useState('Settings');

  const go   = (p, t) => { setPage(p); setTitle(t); window.scrollTo(0, 0); };
  const back  = ()    => { setPage('main'); setTitle('Settings'); };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    await logout();
    navigate('/login');
  };

  const subPages = {
    saved:        { el: <SavedPosts user={user} /> },
    liked:        { el: <LikedPosts user={user} /> },
    commented:    { el: <CommentedPosts user={user} /> },
    blocked:      { el: <BlockedUsers /> },
    time:         { el: <TimeManagement /> },
    notifications:{ el: <NotifSettings /> },
    privacy:      { el: <PrivacySettings user={user} updateUser={updateUser} /> },
    security:     { el: <SecuritySettings /> },
    password:     { el: <ChangePassword /> },
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {page !== 'main' && (
          <button onClick={back} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--surface)', border: '1px solid var(--border)',
            cursor: 'pointer', fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .15s', flexShrink: 0,
          }}>←</button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h1>
      </div>

      {/* Sub page */}
      {page !== 'main' && (
        <Card>{subPages[page]?.el}</Card>
      )}

      {/* Main menu */}
      {page === 'main' && (
        <div style={{ animation: 'fadeIn .3s ease' }}>

          {/* Profile card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12,
            boxShadow: 'var(--shadow)',
          }}>
            <Avatar user={user} size="xl" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{user?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
              {user?.full_name && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 1 }}>{user.full_name}</div>}
            </div>
            <Link to="/settings/profile" className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}>
              Edit profile
            </Link>
          </div>

          {/* Your activity */}
          <SectionTitle>Your activity</SectionTitle>
          <Card>
            <SettingRow icon="🔖" label="Saved"           sublabel="Posts you've bookmarked"          onClick={() => go('saved', 'Saved Posts')} />
            <SettingRow icon="♥"  label="Liked posts"     sublabel="Posts you've liked"                onClick={() => go('liked', 'Liked Posts')} />
            <SettingRow icon="💬" label="Your posts"      sublabel="Posts you've commented on"         onClick={() => go('commented', 'Your Posts')} border={false} />
          </Card>

          {/* Account settings */}
          <SectionTitle>Account</SectionTitle>
          <Card>
            <SettingRow icon="🔒" label="Privacy"          sublabel="Private account, activity status"  onClick={() => go('privacy', 'Privacy')} />
            <SettingRow icon="🛡️" label="Security"         sublabel="Password, login activity"          onClick={() => go('security', 'Security')} />
            <SettingRow icon="🔑" label="Change password"  sublabel="Update your password"              onClick={() => go('password', 'Change Password')} />
            <SettingRow icon="🔔" label="Notifications"    sublabel="Likes, comments, follows"          onClick={() => go('notifications', 'Notifications')} />
            <SettingRow icon="🚫" label="Blocked users"    sublabel="Manage blocked accounts"           onClick={() => go('blocked', 'Blocked Users')} border={false} />
          </Card>

          {/* Time & wellbeing */}
          <SectionTitle>Time & Wellbeing</SectionTitle>
          <Card>
            <SettingRow icon="⏱" label="Time management"  sublabel="Set daily limits & track usage"    onClick={() => go('time', 'Time Management')} border={false} />
          </Card>

          {/* Appearance */}
          <SectionTitle>Appearance</SectionTitle>
          <Card>
            <SettingRow
              icon={theme === 'dark' ? '☀' : '☾'}
              label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              sublabel={`Currently using ${theme} mode`}
              onClick={toggleTheme}
              toggle toggleOn={theme === 'dark'}
              border={false}
            />
          </Card>

          {/* Support */}
          <SectionTitle>Support</SectionTitle>
          <Card>
            <SettingRow icon="❓" label="Help centre"        sublabel="Get help with Photogram"          onClick={() => toast('Opening help centre...')} />
            <SettingRow icon="📋" label="Report a problem"   sublabel="Something not working?"           onClick={() => toast('Thank you for the report!')} border={false} />
          </Card>

          {/* Account actions */}
          <SectionTitle>Login</SectionTitle>
          <Card>
            <SettingRow icon="➕" label="Add account"
              sublabel="Log into another account"
              onClick={() => {
                toast('Open a new browser tab and go to /register or /login to add another account');
              }} />
            <SettingRow icon="⏻" label={`Log out @${user?.username}`}
              sublabel="You will be returned to the login screen"
              onClick={handleLogout} danger border={false} />
          </Card>

          {/* App info */}
          <div style={{ textAlign: 'center', padding: '24px 0 8px', color: 'var(--text-3)', fontSize: 11, lineHeight: 2 }}>
            <div>Photogram • v1.0.0</div>
            <div>Made with ❤️ • Running locally</div>
          </div>

        </div>
      )}
    </div>
  );
};

export default SettingsPage;
