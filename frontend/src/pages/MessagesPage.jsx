import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { messagesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

import Avatar from '../components/ui/Avatar';
import ChatWindow from '../components/message/ChatWindow';
import { Spinner } from '../components/ui/Spinner';

import { timeAgo } from '../utils/helpers';

// ======================================================
// Conversation Item
// ======================================================

const ConvItem = ({ conv, active, onClick }) => {
  const other = conv.members?.[0];
  const last = conv.last_message;
  const unread = parseInt(conv.unread_count || 0);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: active ? 'var(--bg)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        borderLeft: active
          ? '3px solid var(--accent)'
          : '3px solid transparent',
      }}
    >
      <Avatar user={other || { username: conv.name }} size="md" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontWeight: unread > 0 ? 700 : 500,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conv.is_group
              ? conv.name || 'Group'
              : other?.username}
          </span>

          {last && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                marginLeft: 8,
              }}
            >
              {timeAgo(last.created_at)}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 13,
            color:
              unread > 0
                ? 'var(--text-1)'
                : 'var(--text-3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {last?.content || 'Start a conversation'}
        </div>
      </div>

      {unread > 0 && (
        <div
          style={{
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 10,
            padding: '2px 7px',
          }}
        >
          {unread}
        </div>
      )}
    </div>
  );
};

// ======================================================
// Messages Page
// ======================================================

const MessagesPage = () => {
  const { convId } = useParams();

  useAuth();

  const { onEvent } = useSocket();

  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState('');

  const isMobile = window.innerWidth <= 768;

  // ======================================================
  // Load Conversations
  // ======================================================

  const loadConvs = () => {
    setLoading(true);

    messagesAPI
      .getConversations()
      .then(({ data }) => {
        setConvs(data);

        if (convId) {
          const found = data.find((c) => c.id === convId);

          setActive(found || data[0] || null);
        } else if (!active && data.length > 0) {
          setActive(data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConvs();
  }, [convId]);

  // ======================================================
  // Real-time refresh
  // ======================================================

  useEffect(() => {
    const off = onEvent('new_message', () => {
      messagesAPI
        .getConversations()
        .then(({ data }) => setConvs(data))
        .catch(() => {});
    });

    return off;
  }, []);

  // ======================================================
  // Filter
  // ======================================================

  const filtered = convs.filter((c) => {
    const name = c.is_group
      ? c.name
      : c.members?.[0]?.username || '';

    return name
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  // ======================================================
  // UI
  // ======================================================

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >

      {/* SIDEBAR */}

      <div
        style={{
          width: isMobile
            ? active
              ? 0
              : '100%'
            : 320,

          display:
            isMobile && active
              ? 'none'
              : 'flex',

          flexDirection: 'column',

          borderRight: '1px solid var(--border)',

          background: 'var(--surface)',

          flexShrink: 0,
        }}
      >

        {/* HEADER */}

        <div style={{ padding: '20px 16px 12px' }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Messages
          </h2>

          <input
            className="input"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search conversations..."
            style={{ fontSize: 13 }}
          />
        </div>

        {/* CONVERSATIONS */}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 8px',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 40,
              }}
            >
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: 'var(--text-3)',
              }}
            >
              No conversations
            </div>
          ) : (
            filtered.map((conv) => (
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

      {/* CHAT */}

      <div
        style={{
          flex: 1,

          display:
            isMobile && !active
              ? 'none'
              : 'flex',

          flexDirection: 'column',

          overflow: 'hidden',

          background: 'var(--bg)',
        }}
      >

        {/* MOBILE BACK */}

        {isMobile && active && (
          <div
            style={{
              padding: '10px 14px',
              borderBottom:
                '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setActive(null)}
              style={{
                border: 'none',
                background: 'none',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        <ChatWindow
          conversation={active}
          onNewConversation={(conv) => {
            setConvs((prev) => [
              conv,
              ...prev.filter(
                (c) => c.id !== conv.id
              ),
            ]);

            setActive(conv);
          }}
        />
      </div>
    </div>
  );
};

export default MessagesPage;