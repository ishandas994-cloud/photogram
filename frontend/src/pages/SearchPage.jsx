import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchAPI, usersAPI } from '../api';
import Avatar from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { formatCount } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const UserRow = ({ user }) => {
  const { user: me }          = useAuth();
  const [following, setFollowing] = useState(false);
  const isMe = me?.username === user.username;

  const toggle = async (e) => {
    e.preventDefault();
    try {
      if (following) { await usersAPI.unfollow(user.username); setFollowing(false); }
      else           { await usersAPI.follow(user.username);   setFollowing(true);  }
    } catch { toast.error('Action failed'); }
  };

  return (
    <Link to={`/profile/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
      <Avatar user={user} size="md" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {user.username}
          {user.is_verified && <span style={{ color: 'var(--blue)', marginLeft: 4, fontSize: 12 }}>✓</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{formatCount(user.follower_count)} followers</div>
      </div>
      {!isMe && (
        <button onClick={toggle} className={`btn ${following ? 'btn-outline' : 'btn-primary'}`} style={{ fontSize: 12, padding: '6px 14px' }}>
          {following ? 'Following' : 'Follow'}
        </button>
      )}
    </Link>
  );
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query,    setQuery]    = useState(searchParams.get('q') || '');
  const [tab,      setTab]      = useState('users');
  const [results,  setResults]  = useState({ users: [], hashtags: [] });
  const [loading,  setLoading]  = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults({ users: [], hashtags: [] }); return; }
    setLoading(true);
    try {
      const { data } = await searchAPI.search(q);
      setResults(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setSearchParams({ q: query });
        doSearch(query);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 60px' }}>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 16 }}>⌕</span>
        <input
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users or #hashtags…"
          autoFocus
          style={{ paddingLeft: 38, fontSize: 15 }}
        />
        {loading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}><Spinner size={16} /></div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {['users', 'hashtags'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: tab === t ? '2px solid var(--text-1)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {t} {results[t]?.length > 0 && `(${results[t].length})`}
          </button>
        ))}
      </div>

      {/* Results */}
      {!query.trim() && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⌕</div>
          <div style={{ fontSize: 15 }}>Search for people or hashtags</div>
        </div>
      )}

      {tab === 'users' && results.users?.map(u => <UserRow key={u.id} user={u} />)}

      {tab === 'hashtags' && results.hashtags?.map(h => (
        <Link key={h.id} to={`/explore?tag=${h.name}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-2)' }}>#</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>#{h.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{formatCount(h.post_count)} posts</div>
          </div>
        </Link>
      ))}

      {query.trim() && !loading && tab === 'users' && results.users?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>No users found for "{query}"</div>
      )}
      {query.trim() && !loading && tab === 'hashtags' && results.hashtags?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>No hashtags found for "{query}"</div>
      )}
    </div>
  );
};

export default SearchPage;