import { formatDistanceToNow, format } from 'date-fns';

// ── Base API URL (fix for localhost → production) ────────────
const API_BASE =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

// ── Time helpers ─────────────────────────────────────────────
export const timeAgo = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatDate = (date) =>
  format(new Date(date), 'MMMM d, yyyy');

// ── Number formatter ─────────────────────────────────────────
export const formatCount = (n) => {
  n = parseInt(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
};

// ── Avatar URL ───────────────────────────────────────────────
export const getAvatarUrl = (url, username) => {
  if (url) {
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
  }

  const seed = (username || 'user').charCodeAt(0) % 10;
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`;
};

// ── Media URL ────────────────────────────────────────────────
export const getMediaUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
};

// ── Class helper ─────────────────────────────────────────────
export const classNames = (...args) => args.filter(Boolean).join(' ');