import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { messagesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/ui/Avatar';
import ChatWindow from '../components/message/ChatWindow';
import { Spinner } from '../components/ui/Spinner';
import { timeAgo } from '../utils/helpers';

const ConvItem = ({ conv, active, onClick }) => {
  const other  = conv.members?.[0];
  const last   = conv.last_message;
  const unread = parseInt(conv.unread_count || 0);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer',
        background: active ? 'var(--bg)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        transition: 'background .15s',
        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar user={other || { username: conv.name }} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: unread > 0 ? 700 : 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conv.is_group ? (conv.name || 'Group') : other?.username}
          </span>
          {last && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>
              {timeAgo(last.created_at)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: unread > 0 ? 'var(--text-1)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
          {last?.content || 'Start a conversation'}
        </div>
      </div>
      {unread > 0 && (
        <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 7px', minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
          {unread}
        </div>
      )}
    </div>
  );
};

const MessagesPage = () => {
  const { convId }              = useParams();
  const { user }                = useAuth();
  const { onEvent }             = useSocket();
  const [convs,   setConvs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [active,  setActive]    = useState(null);
  const [search,  setSearch]    = useState('');

  const loadConvs = () => {
    setLoading(true);
    messagesAPI.getConversations()
      .then(({ data }) => {
        setConvs(data);
        if (convId) {
          const found = data.find(c => c.id === convId);
          setActive(found || data[0] || null);
        } else if (!active && data.length > 0) {
          setActive(data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadConvs(); }, [convId]);

  // When a new message comes in, refresh conversation list to update last message
  useEffect(() => {
    const off = onEvent('new_message', () => {
      messagesAPI.getConversations()
        .then(({ data }) => setConvs(data))
        .catch(() => {});
    });
    return off;
  }, []);

  const filtered = convs.filter(c => {
    const name = c.is_group ? c.name : c.members?.[0]?.username || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Left: conversation list */}
      <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Messages</h2>
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            style={{ fontSize: 13 }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✉</div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>No conversations yet</div>
              <div style={{ fontSize: 12 }}>Go to a profile and click Message</div>
            </div>
          ) : (
            filtered.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={active?.id === conv.id}
                onClick={() => setActive(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        <ChatWindow
          conversation={active}
          onNewConversation={(conv) => {
            setConvs(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
            setActive(conv);
          }}
        />
      </div>

    </div>
  );
};

export default MessagesPage;
