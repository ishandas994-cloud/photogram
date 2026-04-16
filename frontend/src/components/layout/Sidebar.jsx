import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import CreatePostModal from '../post/CreatePostModal';

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--text-1)' : 'var(--text-2)',
    fontWeight: isActive ? '600' : '400',
    fontSize: 15,
    transition: 'all .15s',
    background: isActive ? 'var(--bg)' : 'transparent',
    textDecoration: 'none',
    position: 'relative',
  })}
  onMouseEnter={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'var(--bg)'; }}
  onMouseLeave={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'transparent'; }}
  >
    <span style={{ fontSize: 20 }}>{icon}</span>
    <span>{label}</span>
    {badge > 0 && (
      <span style={{
        marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
        fontSize: 11, fontWeight: 700, borderRadius: 10,
        padding: '1px 7px', minWidth: 20, textAlign: 'center',
      }}>{badge > 99 ? '99+' : badge}</span>
    )}
  </NavLink>
);

const Sidebar = ({ unreadNotifs = 0, unreadMessages = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside style={{
        width: 'var(--nav-w)', height: '100vh', position: 'sticky', top: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 12px 16px',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 12px 28px', fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--text-1)' }}>
          Photogram
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem to="/"              icon="⌂"  label="Home" />
<NavItem to="/search"        icon="⌕"  label="Search" />
<NavItem to="/explore"       icon="◎"  label="Explore" />
<NavItem to="/reels"         icon="▷"  label="Reels" />
<NavItem to="/messages"      icon="✉"  label="Messages" badge={unreadMessages} />
<NavItem to="/notifications" icon="♡"  label="Notifications" badge={unreadNotifs} />

          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-2)', fontSize: 15,
              transition: 'all .15s', width: '100%', textAlign: 'left',
              cursor: 'pointer', background: 'none', border: 'none',
              fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 20 }}>＋</span>
            <span>Create</span>
          </button>

          {user && <NavItem to={`/profile/${user.username}`} icon="◉" label="Profile" />}
        </nav>

        {/* User footer */}
        {user && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={user} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ color: 'var(--text-3)', fontSize: 16, padding: 4, borderRadius: 6, transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >⏻</button>
          </div>
        )}
      </aside>

      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
};

export default Sidebar;