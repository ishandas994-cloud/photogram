import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usersAPI } from '../api';
import api from '../api/client';
import Avatar from '../components/ui/Avatar';
import PostCard from '../components/post/PostCard';
import { Spinner } from '../components/ui/Spinner';
import { getMediaUrl, timeAgo, formatCount } from '../utils/helpers';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────
const SettingRow = ({ icon, label, sublabel, onClick, to, danger, toggle, toggleOn, border = true }) => {
  const content = (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '15px 20px',
        borderBottom: border ? '1px solid var(--border)' : 'none',
        cursor: onClick || to ? 'pointer' : 'default',
        transition: 'background .15s', color: 'inherit', textDecoration: 'none',
      }}
      onMouseEnter={e => { if (onClick || to) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon && (
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: danger ? 'var(--accent)' : 'var(--text-1)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      {toggle !== undefined ? (
        <div style={{ width: 46, height: 26, borderRadius: 13, background: toggleOn ? 'var(--accent)' : 'var(--border-2)', position: 'relative', transition: 'background .25s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: toggleOn ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
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
  <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-3)' }}>
    <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// POST GRID — click to open full post modal
// ─────────────────────────────────────────────────────────────
const PostGrid = ({ posts }) => {
  const [selected, setSelected] = useState(null);

  if (!posts.length) return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
        {posts.map(p => {
          const media  = p.media?.[0];
          const thumb  = getMediaUrl(media?.thumbnail_url || media?.media_url);
          const isVideo = media?.media_type === 'video';
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--border)', position: 'relative', cursor: 'pointer' }}
            >
              <img
                src={thumb || `https://picsum.photos/seed/${p.id}/300/300`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                onError={e => { e.target.onerror = null; e.target.src = `https://picsum.photos/seed/${p.id}/300/300`; }}
              />
              {/* Video badge */}
              {isVideo && (
                <div style={{ position: 'absolute', top: 6, right: 6, color: '#fff', fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>▶</div>
              )}
              {/* Like count */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 8px 6px',
                background: 'linear-gradient(transparent, rgba(0,0,0,.6))',
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
                  ♥ {formatCount(p.like_count)}
                </span>
                {+p.comment_count > 0 && (
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
                    💬 {formatCount(p.comment_count)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full post modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, animation: 'fadeIn .2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 500,
              maxHeight: '90vh', overflowY: 'auto',
              borderRadius: 'var(--radius)',
              animation: 'fadeIn .25s ease',
            }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,.2)', border: 'none',
                  color: '#fff', fontSize: 20, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
            <PostCard post={selected} />
          </div>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// SAVED POSTS PAGE
// ─────────────────────────────────────────────────────────────
const SavedPosts = () => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/saved')
      .then(({ data }) => setPosts(data))
      .catch(() => toast.error('Could not load saved posts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><Spinner size={28} /></div>;
  if (!posts.length) return <EmptyState icon="🔖" title="No saved posts yet" subtitle="Tap the ⊹ bookmark icon on any post to save it here" />;

  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-3)' }}>
        {posts.length} saved {posts.length === 1 ? 'post' : 'posts'} — tap any to watch
      </div>
      <PostGrid posts={posts} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LIKED POSTS PAGE
// ─────────────────────────────────────────────────────────────
const LikedPosts = () => {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/posts/liked')
      .then(({ data }) => setPosts(data))
      .catch(() => toast.error('Could not load liked posts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><Spinner size={28} /></div>;
  if (!posts.length) return <EmptyState icon="♡" title="No liked posts yet" subtitle="Double tap or press ♡ on any post to like it" />;

  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-3)' }}>
        {posts.length} liked {posts.length === 1 ? 'post' : 'posts'} — tap any to watch
      </div>
      <PostGrid posts={posts} />
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
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (username) => {
    try {
      await api.delete(`/users/${username}/block`);
      setUsers(u => u.filter(x => x.username !== username));
      toast.success(`Unblocked @${username}`);
    } catch { toast.error('Failed to unblock'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 56 }}><Spinner size={28} /></div>;
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
          <button onClick={() => unblock(u.username)}
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
  const [limitMin, setLimitMin] = useState(() => parseInt(localStorage.getItem('pg_daily_limit') || '0'));
  const [timeSpent, setTimeSpent] = useState(0);
  const [reminder, setReminder] = useState(() => localStorage.getItem('pg_reminder') === 'true');

  useEffect(() => {
    const stored = parseInt(sessionStorage.getItem('pg_time_start') || '0');
    const start  = stored || Date.now();
    if (!stored) sessionStorage.setItem('pg_time_start', start);
    const interval = setInterval(() => setTimeSpent(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const pct      = limitMin > 0 ? Math.min((timeSpent / (limitMin * 60)) * 100, 100) : 0;
  const barColor = pct >= 100 ? '#e63946' : pct > 70 ? '#f4a261' : '#2d6a4f';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: 'var(--surface-2)', borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Time on Photogram today</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-serif)', marginBottom: 4 }}>{fmt(timeSpent)}</div>
        {limitMin > 0 && <div style={{ fontSize: 13, color: pct >= 100 ? 'var(--accent)' : 'var(--text-3)' }}>{pct >= 100 ? '⚠️ Daily limit reached!' : `${Math.round(pct)}% of ${limitMin}min limit`}</div>}
      </div>
      {limitMin > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 5, width: `${pct}%`, background: barColor, transition: 'width .5s ease' }} />
          </div>
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Daily limit (minutes)</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="number" min="0" max="480" value={limitMin || ''} onChange={e => setLimitMin(parseInt(e.target.value) || 0)} placeholder="e.g. 30" className="input" style={{ flex: 1, fontSize: 15 }} />
          <button onClick={() => { localStorage.setItem('pg_daily_limit', limitMin); toast.success(limitMin > 0 ? `Limit: ${limitMin} min` : 'Limit removed'); }} className="btn btn-primary">Save</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[15, 30, 45, 60, 90].map(min => (
          <button key={min} onClick={() => { setLimitMin(min); localStorage.setItem('pg_daily_limit', min); toast.success(`Limit: ${min}min`); }}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: `2px solid ${limitMin === min ? 'var(--accent)' : 'var(--border)'}`, color: limitMin === min ? 'var(--accent)' : 'var(--text-2)', background: limitMin === min ? 'rgba(230,57,70,.07)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}
          >{min}m</button>
        ))}
      </div>
      <div onClick={() => { const n = !reminder; setReminder(n); localStorage.setItem('pg_reminder', n); toast.success(`Reminders ${n ? 'on' : 'off'}`); }}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Daily reminders</div>
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
// PRIVACY
// ─────────────────────────────────────────────────────────────
const PrivacySettings = ({ user, updateUser }) => {
  const [isPrivate, setIsPrivate]       = useState(user?.is_private || false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowTags,    setAllowTags]    = useState(true);
  const [saving, setSaving]             = useState(false);

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
      <div style={{ padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
        {isPrivate ? '🔒 Private — only approved followers can see your posts.' : '🌍 Public — anyone can see your posts.'}
      </div>
      <SettingRow icon="🔒" label="Private account" sublabel="Only approved followers can see your content" onClick={togglePrivate} toggle toggleOn={isPrivate} />
      <SettingRow icon="👁️" label="Activity status"  sublabel="Show when you were last active"            onClick={() => setShowActivity(s => !s)} toggle toggleOn={showActivity} />
      <SettingRow icon="🏷️" label="Allow tags"       sublabel="Let others tag you in posts"               onClick={() => setAllowTags(s => !s)} toggle toggleOn={allowTags} border={false} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
const NotifSettings = () => {
  const [prefs, setPrefs] = useState(() => JSON.parse(localStorage.getItem('pg_notif_prefs') || JSON.stringify({ likes: true, comments: true, follows: true, messages: true, stories: true, mentions: true })));
  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('pg_notif_prefs', JSON.stringify(next));
    toast.success(`${key} ${next[key] ? 'on' : 'off'}`);
  };
  const items = [
    { key: 'likes',    icon: '♥',  label: 'Likes',          sublabel: 'When someone likes your post' },
    { key: 'comments', icon: '💬', label: 'Comments',        sublabel: 'When someone comments on your post' },
    { key: 'follows',  icon: '👤', label: 'New followers',   sublabel: 'When someone follows you' },
    { key: 'mentions', icon: '@',  label: 'Mentions',        sublabel: 'When someone mentions you' },
    { key: 'messages', icon: '✉',  label: 'Messages',        sublabel: 'When you receive a DM' },
    { key: 'stories',  icon: '◎',  label: 'Story reactions', sublabel: 'When someone reacts to your story' },
  ];
  return (
    <div>
      {items.map((item, i) => (
        <SettingRow key={item.key} icon={item.icon} label={item.label} sublabel={item.sublabel}
          onClick={() => toggle(item.key)} toggle toggleOn={prefs[item.key]} border={i < items.length - 1} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────────────
const SecuritySettings = ({ onGo }) => (
  <div>
    <SettingRow icon="🔑" label="Change password"   sublabel="Update your account password"   onClick={() => onGo('password', 'Change Password')} />
    <SettingRow icon="📱" label="Two-factor auth"    sublabel="Add extra security"             onClick={() => toast('Coming soon')} />
    <SettingRow icon="💻" label="Active sessions"    sublabel="1 device — current session"    onClick={() => toast('You are logged in on this device')} border={false} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────
const ChangePassword = () => {
  const [form, setForm]       = useState({ current: '', newPass: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.newPass.length < 8)       { toast.error('Min 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.current, newPassword: form.newPass });
      toast.success('Password changed!');
      setForm({ current: '', newPass: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { key: 'current', label: 'Current password', ph: 'Enter current password' },
        { key: 'newPass', label: 'New password',      ph: 'At least 8 characters' },
        { key: 'confirm', label: 'Confirm password',  ph: 'Repeat new password' },
      ].map(({ key, label, ph }) => (
        <div key={key}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
          <input className="input" type="password" value={form[key]} onChange={set(key)} placeholder={ph} required />
        </div>
      ))}
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: 13 }}>
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
  const [page,  setPage]  = useState('main');
  const [title, setTitle] = useState('Settings');

  const go   = (p, t) => { setPage(p); setTitle(t); window.scrollTo(0, 0); };
  const back = ()    => { setPage('main'); setTitle('Settings'); };

  const handleLogout = async () => {
    if (!window.confirm('Log out of your account?')) return;
    await logout();
    navigate('/login');
  };

  const subPages = {
    saved:         <SavedPosts />,
    liked:         <LikedPosts />,
    blocked:       <BlockedUsers />,
    time:          <TimeManagement />,
    notifications: <NotifSettings />,
    privacy:       <PrivacySettings user={user} updateUser={updateUser} />,
    security:      <SecuritySettings onGo={go} />,
    password:      <ChangePassword />,
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {page !== 'main' && (
          <button onClick={back} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ←
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h1>
      </div>

      {/* Sub page content */}
      {page !== 'main' && (
        <Card>{subPages[page]}</Card>
      )}

      {/* Main menu */}
      {page === 'main' && (
        <div style={{ animation: 'fadeIn .3s ease' }}>

          {/* Profile card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, boxShadow: 'var(--shadow)' }}>
            <Avatar user={user} size="xl" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
              {user?.full_name && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.full_name}</div>}
            </div>
            <Link to="/settings/profile" className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}>Edit</Link>
          </div>

          {/* Activity */}
          <SectionTitle>Your activity</SectionTitle>
          <Card>
            <SettingRow icon="🔖" label="Saved posts"  sublabel="Tap any post to watch it" onClick={() => go('saved', 'Saved Posts')} />
            <SettingRow icon="♥"  label="Liked posts"  sublabel="Tap any post to watch it" onClick={() => go('liked', 'Liked Posts')} border={false} />
          </Card>

          {/* Account */}
          <SectionTitle>Account</SectionTitle>
          <Card>
            <SettingRow icon="🔒" label="Privacy"        sublabel="Private account, activity status"  onClick={() => go('privacy', 'Privacy')} />
            <SettingRow icon="🛡️" label="Security"       sublabel="Password, login activity"          onClick={() => go('security', 'Security')} />
            <SettingRow icon="🔔" label="Notifications"  sublabel="Likes, comments, follows, DMs"     onClick={() => go('notifications', 'Notifications')} />
            <SettingRow icon="🚫" label="Blocked users"  sublabel="Manage blocked accounts"           onClick={() => go('blocked', 'Blocked Users')} border={false} />
          </Card>

          {/* Time */}
          <SectionTitle>Time & Wellbeing</SectionTitle>
          <Card>
            <SettingRow icon="⏱" label="Time management" sublabel="Set daily limits & track usage" onClick={() => go('time', 'Time Management')} border={false} />
          </Card>

          {/* Appearance */}
          <SectionTitle>Appearance</SectionTitle>
          <Card>
            <SettingRow
              icon={theme === 'dark' ? '☀' : '☾'}
              label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              sublabel={`Currently: ${theme} mode`}
              onClick={toggleTheme} toggle toggleOn={theme === 'dark'} border={false}
            />
          </Card>

          {/* Support */}
          <SectionTitle>Support</SectionTitle>
          <Card>
            <SettingRow icon="❓" label="Help centre"      sublabel="Get help with Photogram"    onClick={() => toast('Opening help...')} />
            <SettingRow icon="📋" label="Report a problem" sublabel="Something not working?"     onClick={() => toast('Thanks for the report!')} border={false} />
          </Card>

          {/* Login */}
          <SectionTitle>Login</SectionTitle>
          <Card>
            <SettingRow icon="➕" label="Add account"
              sublabel="Open a new tab to log in with another account"
              onClick={() => toast('Open a new browser tab and go to /login')} />
            <SettingRow icon="⏻" label={`Log out @${user?.username}`}
              sublabel="You will be returned to the login screen"
              onClick={handleLogout} danger border={false} />
          </Card>

          <div style={{ textAlign: 'center', padding: '24px 0 8px', color: 'var(--text-3)', fontSize: 11, lineHeight: 2 }}>
            Photogram • v1.0.0 • Made with ❤️
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
