import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';
import CreatePostModal from '../post/CreatePostModal';

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '11px 14px', borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--text-1)' : 'var(--text-2)',
    fontWeight: isActive ? '600' : '400', fontSize: 15,
    transition: 'all .18s',
    background: isActive ? 'var(--surface-2)' : 'transparent',
    textDecoration: 'none',
    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
  })}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.paddingLeft = '18px'; }}
    onMouseLeave={e => {
      const active = e.currentTarget.getAttribute('aria-current') === 'page';
      e.currentTarget.style.background = active ? 'var(--surface-2)' : 'transparent';
      e.currentTarget.style.paddingLeft = '14px';
    }}
  >
    <span style={{ fontSize: 19, minWidth: 22, textAlign: 'center' }}>{icon}</span>
    <span>{label}</span>
    {badge > 0 && (
      <span className="badge-pulse" style={{
        marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
        fontSize: 11, fontWeight: 700, borderRadius: 10,
        padding: '2px 7px', minWidth: 20, textAlign: 'center',
      }}>{badge > 99 ? '99+' : badge}</span>
    )}
  </NavLink>
);

const Sidebar = ({ unreadNotifs = 0, unreadMessages = 0 }) => {
  const { user, logout }           = useAuth();
  const { theme, toggleTheme }     = useTheme();
  const navigate                   = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [hoverCreate, setHoverCreate] = useState(false);

  return (
    <>
      <aside style={{
        width: 'var(--nav-w)', height: '100vh', position: 'sticky', top: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 10px 16px', flexShrink: 0,
        boxShadow: '2px 0 12px rgba(0,0,0,.04)',
        animation: 'fadeInLeft .4s cubic-bezier(.4,0,.2,1) both',
      }}>

        {/* Logo */}
        <div style={{ padding: '0 14px 28px' }}>
          <span className="sidebar-logo" style={{
            fontFamily: 'var(--font-serif)', fontSize: 28,
            display: 'block', cursor: 'default', letterSpacing: '-0.5px',
          }}>
            Photogram
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }} className="stagger">
          <NavItem to="/"              icon="⌂"  label="Home" />
          <NavItem to="/search"        icon="⌕"  label="Search" />
          <NavItem to="/explore"       icon="◎"  label="Explore" />
          <NavItem to="/reels"         icon="▷"  label="Reels" />
          <NavItem to="/messages"      icon="✉"  label="Messages"      badge={unreadMessages} />
          <NavItem to="/notifications" icon="♡"  label="Notifications" badge={unreadNotifs} />

          {/* Create button */}
          <button
            onClick={() => setShowCreate(true)}
            onMouseEnter={() => setHoverCreate(true)}
            onMouseLeave={() => setHoverCreate(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '11px 14px', paddingLeft: hoverCreate ? 18 : 14,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-2)', fontSize: 15,
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: hoverCreate ? 'var(--surface-2)' : 'none',
              border: '3px solid transparent',
              fontFamily: 'var(--font)', transition: 'all .18s',
            }}
          >
            <span style={{ fontSize: 19, minWidth: 22, textAlign: 'center' }}>＋</span>
            <span>Create</span>
          </button>

          {user && <NavItem to={`/profile/${user.username}`} icon="◉" label="Profile" />}
          <NavItem to="/settings" icon="⚙" label="Settings" />
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px 12px' }} />

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-2)', fontSize: 14, marginBottom: 4,
            width: '100%', textAlign: 'left', cursor: 'pointer',
            background: 'none', border: 'none', fontFamily: 'var(--font)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 17, minWidth: 22, textAlign: 'center' }}>
            {theme === 'dark' ? '☀' : '☾'}
          </span>
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          <div style={{
            marginLeft: 'auto', width: 36, height: 20, borderRadius: 10,
            background: theme === 'dark' ? 'var(--accent)' : 'var(--border-2)',
            position: 'relative', transition: 'background .3s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3,
              left: theme === 'dark' ? 18 : 3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff', transition: 'left .3s',
              boxShadow: '0 1px 3px rgba(0,0,0,.3)',
            }} />
          </div>
        </button>

        {/* User footer */}
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            transition: 'background .15s', cursor: 'pointer',
          }}
            onClick={() => navigate('/settings')}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Avatar user={user} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.email}</div>
            </div>
            <button
              onClick={async (e) => { e.stopPropagation(); await logout(); navigate('/login'); }}
              title="Logout"
              style={{ color: 'var(--text-3)', fontSize: 15, padding: '4px 6px', borderRadius: 6, transition: 'all .15s', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(230,57,70,.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
            >⏻</button>
          </div>
        )}
      </aside>

      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
};

export default Sidebar;
