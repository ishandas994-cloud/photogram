import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { messagesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { timeAgo, getMediaUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Bubble = ({ msg, isMine }) => (
  <div style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
    {!isMine && <Avatar user={{ username: msg.username, avatar_url: msg.avatar_url }} size="xs" />}
    <div style={{ maxWidth: '70%' }}>
      {msg.media_url ? (
        <img src={getMediaUrl(msg.media_url)} alt="" style={{ maxWidth: 200, borderRadius: 12, display: 'block' }} />
      ) : (
        <div style={{
          padding: '9px 13px',
          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMine ? 'var(--text-1)' : 'var(--bg)',
          color: isMine ? '#fff' : 'var(--text-1)',
          fontSize: 14, lineHeight: 1.5,
          border: isMine ? 'none' : '1px solid var(--border)',
        }}>
          {msg.content}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, textAlign: isMine ? 'right' : 'left' }}>
        {timeAgo(msg.created_at)}
      </div>
    </div>
  </div>
);

const ChatWindow = ({ conversation }) => {
  const { user }                        = useAuth();
  const { joinConversation, leaveConversation, sendTyping, onEvent } = useSocket();
  const [messages,  setMessages]        = useState([]);
  const [loading,   setLoading]         = useState(true);
  const [text,      setText]            = useState('');
  const [sending,   setSending]         = useState(false);
  const [typing,    setTyping]          = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const convId = conversation?.id;
  const other  = conversation?.members?.[0];

  // Load messages
  useEffect(() => {
    if (!convId) return;
    setLoading(true);
    messagesAPI.getMessages(convId, { limit: 40 })
      .then(({ data }) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [convId]);

  // Join socket room
  useEffect(() => {
    if (!convId) return;
    joinConversation(convId);
    return () => leaveConversation(convId);
  }, [convId]);

  // Listen for new messages
  useEffect(() => {
    if (!convId) return;
    const off = onEvent('new_message', (msg) => {
      if (msg.conversation_id === convId) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return off;
  }, [convId]);

  // Listen for typing
  useEffect(() => {
    const off = onEvent('typing', ({ convId: cid, userId, typing: t }) => {
      if (cid === convId && userId !== user?.id) setTyping(t);
    });
    return off;
  }, [convId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    sendTyping(convId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(convId, false), 1500);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    sendTyping(convId, false);
    try {
      const { data } = await messagesAPI.sendMessage(convId, { content: text.trim(), type: 'text' });
      setMessages(prev => [...prev, { ...data, username: user.username, avatar_url: user.avatar_url }]);
      setText('');
    } catch { toast.error('Failed to send'); }
    finally  { setSending(false); }
  };

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40 }}>✉</div>
        <div style={{ fontSize: 15 }}>Select a conversation</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)' }}>
        {other && (
          <>
            <Avatar user={other} size="sm" />
            <Link to={`/profile/${other.username}`} style={{ fontWeight: 600, fontSize: 15 }}>
              {other.username}
            </Link>
          </>
        )}
        {conversation.is_group && (
          <span style={{ fontWeight: 600, fontSize: 15 }}>{conversation.name || 'Group chat'}</span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spinner /></div>
        ) : (
          <>
            {messages.map(msg => (
              <Bubble key={msg.id} msg={msg} isMine={msg.sender_id === user?.id} />
            ))}
            {typing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-3)', fontSize: 13, marginBottom: 8 }}>
                <Avatar user={other} size="xs" />
                <span style={{ animation: 'pulse 1.2s ease infinite' }}>typing…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface)' }}>
        <input
          className="input"
          value={text}
          onChange={handleTextChange}
          placeholder="Message…"
          style={{ flex: 1, fontSize: 14 }}
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="btn btn-primary"
          style={{ padding: '9px 18px', fontSize: 13 }}
        >
          {sending ? <Spinner size={14} color="#fff" /> : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;